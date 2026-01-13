/**
 * SARI Unenroll Student API
 * Removes a student from a SARI course (VKU/PGS)
 * 
 * Security:
 * ✅ Layer 1: Authentication (JWT token)
 * ✅ Layer 2: Rate Limiting (60 req/min per user)
 * ✅ Layer 3: Input Validation (UUID format, required fields)
 * ✅ Layer 3: Input Sanitization (trim)
 * ✅ Layer 4: Authorization (admin/staff, tenant ownership)
 * ✅ Layer 5: Audit Logging (all unenrollments logged)
 * ✅ Layer 7: Error Handling (no credential leakage)
 */

import { createClient } from '@supabase/supabase-js'
import { SARIClient } from '~/utils/sariClient'
import { checkSARIRateLimit, formatRateLimitError, validateSARIInput, sanitizeSARIInput } from '~/server/utils/sari-rate-limit'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'

export default defineEventHandler(async (event) => {
  try {
    // Layer 1: Authentication - Verify JWT token
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw createError({ statusCode: 500, statusMessage: 'Configuration error' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }

    // Get request body
    const body = await readBody(event)
    const raw = { registrationId: body.registrationId, courseSessionId: body.courseSessionId, studentId: body.studentId }

    // Layer 3: Input Validation
    if (!raw.studentId || (!raw.registrationId && !raw.courseSessionId)) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Missing required fields: studentId and either registrationId or courseSessionId' 
      })
    }

    const validation = validateSARIInput(raw)
    if (!validation.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: `Validation error: ${validation.errors.join(', ')}`
      })
    }

    // Layer 3: Input Sanitization
    const { registrationId, courseSessionId, studentId } = sanitizeSARIInput(raw)

    // Layer 2: Rate Limiting
    const rateLimitCheck = await checkSARIRateLimit(user.id, 'unenroll_student')
    if (!rateLimitCheck.allowed) {
      throw createError(formatRateLimitError(rateLimitCheck.retryAfter || 60000))
    }

    // Get user profile for tenant_id and role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, role, auth_user_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    // Layer 4: Authorization
    if (!['admin', 'staff', 'super_admin'].includes(userProfile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
    }

    // Layer 4: Ownership check - Get student
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, faberid, first_name, last_name, tenant_id')
      .eq('id', studentId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (studentError || !student) {
      throw createError({ statusCode: 404, statusMessage: 'Student not found' })
    }

    if (!student.faberid) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Student has no Ausweisnummer (faberid)' 
      })
    }

    // Determine course ID and session ID
    let courseId, sariCourseId

    if (registrationId) {
      // Get course from registration
      const { data: registration, error: regError } = await supabase
        .from('course_registrations')
        .select('course_id, courses(sari_managed, sari_course_id), course_sessions(sari_session_id)')
        .eq('id', registrationId)
        .eq('tenant_id', userProfile.tenant_id)
        .single()

      if (regError || !registration) {
        throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
      }

      courseId = registration.course_id
      sariCourseId = parseInt((registration.courses as any)?.sari_course_id || '0')
    } else {
      // Get course from course session
      const { data: session, error: sessionError } = await supabase
        .from('course_sessions')
        .select('course_id, sari_session_id')
        .eq('id', courseSessionId)
        .single()

      if (sessionError || !session) {
        throw createError({ statusCode: 404, statusMessage: 'Course session not found' })
      }

      courseId = session.course_id
      sariCourseId = parseInt(session.sari_session_id || '0')
    }

    // Get tenant SARI credentials
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('sari_enabled, sari_environment, sari_client_id, sari_client_secret, sari_username, sari_password')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError || !tenant) {
      throw createError({ statusCode: 500, statusMessage: 'Tenant configuration not found' })
    }

    if (!tenant.sari_enabled) {
      throw createError({ statusCode: 400, statusMessage: 'SARI integration is not enabled for this tenant' })
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
    console.log(`📝 [${userProfile.auth_user_id}] Unenrolling student ${student.id} from SARI course ${sariCourseId}`)
    
    await sariClient.unenrollStudent(sariCourseId, student.faberid)

    console.log(`✅ [${userProfile.auth_user_id}] Successfully unenrolled student from SARI course ${sariCourseId}`)

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

    // Layer 5: Audit Logging
    await logAudit({
      user_id: user.id,
      action: 'sari_unenroll_student',
      resource_type: 'course_registration',
      status: 'success',
      details: {
        student_id: studentId,
        course_id: courseId,
        sari_course_id: sariCourseId,
      },
      ip_address: getClientIP(event),
    })

    return {
      success: true,
      message: `Student ${student.first_name} ${student.last_name} unenrolled from SARI course`,
      sariCourseId
    }

  } catch (error: any) {
    console.error('SARI unenroll-student error:', error)
    
    if (error.message?.includes('PERSON_NOT_FOUND')) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Student not found in SARI system' 
      })
    }
    
    if (error.message?.includes('COURSE_NOT_FOUND')) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Course not found in SARI system' 
      })
    }

    if (error.statusCode && error.statusMessage) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to unenroll student from SARI course'
    })
  }
})
