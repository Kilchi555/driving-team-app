/**
 * SARI Unenroll Student API
 * Removes a student from a SARI course (VKU/PGS)
 * Note: Only works if student is not yet confirmed in SARI
 */

import { createClient } from '@supabase/supabase-js'
import { SARIClient } from '~/utils/sariClient'

export default defineEventHandler(async (event) => {
  try {
    // Get authorization header
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({ statusCode: 401, message: 'Authentication required' })
    }

    // Create Supabase client with user's token
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw createError({ statusCode: 500, message: 'Supabase configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw createError({ statusCode: 401, message: 'Invalid token' })
    }

    // Get request body
    const body = await readBody(event)
    const { registrationId, courseSessionId, studentId } = body

    if (!studentId || (!registrationId && !courseSessionId)) {
      throw createError({ 
        statusCode: 400, 
        message: 'Missing required fields: studentId and either registrationId or courseSessionId' 
      })
    }

    // Get user profile for tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({ statusCode: 403, message: 'User profile not found' })
    }

    // Check if user has permission (admin or staff)
    if (!['admin', 'staff', 'superadmin'].includes(userProfile.role)) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    }

    // Get student data (faberid)
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, faberid, first_name, last_name, tenant_id')
      .eq('id', studentId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (studentError || !student) {
      throw createError({ statusCode: 404, message: 'Student not found' })
    }

    if (!student.faberid) {
      throw createError({ 
        statusCode: 400, 
        message: 'Student has no Ausweisnummer (faberid)' 
      })
    }

    // Get course session and SARI ID
    let sariCourseId: number
    let courseId: string

    if (registrationId) {
      // Get from registration
      const { data: registration, error: regError } = await supabase
        .from('course_registrations')
        .select(`
          id,
          course_id,
          course:courses(
            id,
            sari_managed,
            sessions:course_sessions(id, sari_session_id)
          )
        `)
        .eq('id', registrationId)
        .single()

      if (regError || !registration) {
        throw createError({ statusCode: 404, message: 'Registration not found' })
      }

      const course = registration.course as any
      if (!course?.sari_managed) {
        throw createError({ statusCode: 400, message: 'This course is not managed by SARI' })
      }

      // Get the first session's SARI ID (for unenrollment)
      const firstSession = course.sessions?.[0]
      if (!firstSession?.sari_session_id) {
        throw createError({ statusCode: 400, message: 'No SARI session ID found' })
      }

      sariCourseId = parseInt(firstSession.sari_session_id)
      courseId = registration.course_id
    } else {
      // Get from courseSessionId
      const { data: session, error: sessionError } = await supabase
        .from('course_sessions')
        .select(`
          id,
          sari_session_id,
          course_id,
          course:courses(id, sari_managed)
        `)
        .eq('id', courseSessionId)
        .single()

      if (sessionError || !session) {
        throw createError({ statusCode: 404, message: 'Course session not found' })
      }

      const course = session.course as any
      if (!course?.sari_managed) {
        throw createError({ statusCode: 400, message: 'This course is not managed by SARI' })
      }

      if (!session.sari_session_id) {
        throw createError({ statusCode: 400, message: 'No SARI session ID found' })
      }

      sariCourseId = parseInt(session.sari_session_id)
      courseId = session.course_id
    }

    // Get tenant SARI credentials
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('sari_enabled, sari_environment, sari_client_id, sari_client_secret, sari_username, sari_password')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError || !tenant) {
      throw createError({ statusCode: 500, message: 'Tenant configuration not found' })
    }

    if (!tenant.sari_enabled) {
      throw createError({ statusCode: 400, message: 'SARI integration is not enabled for this tenant' })
    }

    // Create SARI client
    const sariClient = new SARIClient({
      environment: tenant.sari_environment || 'test',
      clientId: tenant.sari_client_id,
      clientSecret: tenant.sari_client_secret,
      username: tenant.sari_username,
      password: tenant.sari_password
    })

    // Unenroll student from SARI
    console.log(`📝 Unenrolling student ${student.first_name} ${student.last_name} (${student.faberid}) from SARI course ${sariCourseId}`)
    
    await sariClient.unenrollStudent(sariCourseId, student.faberid)

    console.log(`✅ Successfully unenrolled student from SARI course ${sariCourseId}`)

    // Update local registration (soft delete)
    const { error: updateError } = await supabase
      .from('course_registrations')
      .update({
        status: 'cancelled',
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        sari_synced: true,
        sari_synced_at: new Date().toISOString()
      })
      .eq('course_id', courseId)
      .eq('user_id', studentId)
      .is('deleted_at', null)

    if (updateError) {
      console.error('Failed to update local registration:', updateError)
    }

    return {
      success: true,
      message: `Student ${student.first_name} ${student.last_name} unenrolled from SARI course`,
      sariCourseId
    }

  } catch (error: any) {
    console.error('SARI unenroll-student error:', error)
    
    // Handle specific SARI errors
    if (error.message?.includes('COURSEMEMBER_ALREADY_CONFIRMED')) {
      throw createError({ 
        statusCode: 400, 
        message: 'Student is already confirmed in SARI and cannot be unenrolled. Contact SARI administrator.' 
      })
    }
    
    if (error.message?.includes('COURSEMEMBER_NOT_FOUND')) {
      throw createError({ 
        statusCode: 404, 
        message: 'Student is not enrolled in this course in SARI' 
      })
    }
    
    if (error.message?.includes('COURSE_NOT_FOUND')) {
      throw createError({ 
        statusCode: 404, 
        message: 'Course not found in SARI system' 
      })
    }

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to unenroll student'
    })
  }
})


