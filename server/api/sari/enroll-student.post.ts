/**
 * SARI Enroll Student API
 * Registers a student for a SARI course (VKU/PGS)
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
    const { courseSessionId, studentId } = body

    if (!courseSessionId || !studentId) {
      throw createError({ 
        statusCode: 400, 
        message: 'Missing required fields: courseSessionId, studentId' 
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

    // Get student data (faberid and birthdate)
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, faberid, birthdate, first_name, last_name, tenant_id')
      .eq('id', studentId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (studentError || !student) {
      throw createError({ statusCode: 404, message: 'Student not found' })
    }

    if (!student.faberid) {
      throw createError({ 
        statusCode: 400, 
        message: 'Student has no Ausweisnummer (faberid). Please add it in the student profile.' 
      })
    }

    if (!student.birthdate) {
      throw createError({ 
        statusCode: 400, 
        message: 'Student has no birthdate. Please add it in the student profile.' 
      })
    }

    // Get course session with SARI course ID
    const { data: session, error: sessionError } = await supabase
      .from('course_sessions')
      .select(`
        id,
        course_id,
        course:courses(
          id,
          sari_course_id,
          sari_managed,
          tenant_id
        )
      `)
      .eq('id', courseSessionId)
      .single()

    if (sessionError || !session) {
      throw createError({ statusCode: 404, message: 'Course session not found' })
    }

    const course = session.course as any
    
    if (!course?.sari_managed) {
      throw createError({ 
        statusCode: 400, 
        message: 'This course is not managed by SARI' 
      })
    }

    // For SARI, we need the individual session's SARI ID
    // Get the SARI session ID from course_sessions table
    const { data: sariSession, error: sariSessionError } = await supabase
      .from('course_sessions')
      .select('sari_session_id')
      .eq('id', courseSessionId)
      .single()

    if (sariSessionError || !sariSession?.sari_session_id) {
      throw createError({ 
        statusCode: 400, 
        message: 'Course session has no SARI ID. Cannot enroll via SARI.' 
      })
    }

    const sariCourseId = parseInt(sariSession.sari_session_id)

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

    if (!tenant.sari_client_id || !tenant.sari_client_secret || !tenant.sari_username || !tenant.sari_password) {
      throw createError({ statusCode: 400, message: 'SARI credentials not configured' })
    }

    // Create SARI client
    const sariClient = new SARIClient({
      environment: tenant.sari_environment || 'test',
      clientId: tenant.sari_client_id,
      clientSecret: tenant.sari_client_secret,
      username: tenant.sari_username,
      password: tenant.sari_password
    })

    // Format birthdate as YYYY-MM-DD
    const birthdate = new Date(student.birthdate).toISOString().split('T')[0]

    // Enroll student in SARI
    console.log(`📝 Enrolling student ${student.first_name} ${student.last_name} (${student.faberid}) in SARI course ${sariCourseId}`)
    
    await sariClient.enrollStudent(sariCourseId, student.faberid, birthdate)

    console.log(`✅ Successfully enrolled student in SARI course ${sariCourseId}`)

    // Create local course registration
    const { data: registration, error: regError } = await supabase
      .from('course_registrations')
      .insert({
        course_id: course.id,
        user_id: studentId,
        tenant_id: userProfile.tenant_id,
        status: 'confirmed',
        sari_synced: true,
        sari_synced_at: new Date().toISOString(),
        registered_by: user.id
      })
      .select()
      .single()

    if (regError) {
      console.error('Failed to create local registration:', regError)
      // Note: SARI enrollment succeeded, but local registration failed
      // Consider implementing rollback logic here
    }

    return {
      success: true,
      message: `Student ${student.first_name} ${student.last_name} enrolled in SARI course`,
      sariCourseId,
      registrationId: registration?.id
    }

  } catch (error: any) {
    console.error('SARI enroll-student error:', error)
    
    // Handle specific SARI errors
    if (error.message?.includes('PERSON_ALREADY_ADDED')) {
      throw createError({ 
        statusCode: 409, 
        message: 'Student is already enrolled in this course' 
      })
    }
    
    if (error.message?.includes('PERSON_NOT_FOUND')) {
      throw createError({ 
        statusCode: 404, 
        message: 'Student not found in SARI system. Please verify the Ausweisnummer.' 
      })
    }
    
    if (error.message?.includes('COURSE_NOT_FOUND')) {
      throw createError({ 
        statusCode: 404, 
        message: 'Course not found in SARI system' 
      })
    }
    
    if (error.message?.includes('LICENSE_EXPIRED')) {
      throw createError({ 
        statusCode: 400, 
        message: 'Student license has expired for this course category' 
      })
    }

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to enroll student'
    })
  }
})


