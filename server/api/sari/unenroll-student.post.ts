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

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { SARIClient, isSariUnenrollIdempotent, isSariUnenrollBlocked, getSariUnenrollBlockedMessage } from '~/utils/sariClient'
import { checkSARIRateLimit, formatRateLimitError, validateSARIInput, sanitizeSARIInput } from '~/server/utils/sari-rate-limit'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { logger } from '~/utils/logger'
import { mapSupabaseError } from '~/server/utils/supabase-error'
import { getAuthenticatedUser } from '~/server/utils/auth'
import {
  deleteConfirmedSariMembership,
  listRegistrationSariMemberships,
  listStudentMembershipsForCourseSession,
  type RegistrationSariMembership,
} from '~/server/utils/registration-sari-membership'

type RegistrationCourse = {
  id?: string
  tenant_id?: string
  sari_managed?: boolean
  sari_course_id?: string | null
}

export default defineEventHandler(async (event) => {
  try {
    // Layer 1: Authentication
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw createError({ statusCode: 500, statusMessage: 'Configuration error' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

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

    // sanitizeSARIInput does not return registrationId. Keep the validated raw value.
    const { courseSessionId, studentId } = sanitizeSARIInput(raw)
    const registrationId = typeof raw.registrationId === 'string' ? raw.registrationId.trim() : raw.registrationId

    // Layer 2: Rate Limiting
    const rateLimitCheck = await checkSARIRateLimit(user.id, 'unenroll_student')
    if (!rateLimitCheck.allowed) {
      throw createError(formatRateLimitError(rateLimitCheck.retryAfter || 60000))
    }

    // Get user profile for tenant_id and role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, role, auth_user_id')
      .eq('auth_user_id', user.id)
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

    // SARI ids come only from registration_sari_memberships. course_sessions(sari_session_id)
    // and GROUP_ course ids are not an unenroll source.
    let courseId: string | undefined
    let memberships: RegistrationSariMembership[] = []

    if (registrationId) {
      // Service role bypasses RLS. Hint the course FK: unhinted courses(...) is
      // ambiguous where a second course relationship exists, and course_sessions
      // is not a foreign key of course_registrations.
      const { data: registration, error: regError } = await supabase
        .from('course_registrations')
        .select('course_id, courses!course_registrations_course_id_fkey(id, tenant_id, sari_managed, sari_course_id)')
        .eq('id', registrationId)
        .eq('tenant_id', userProfile.tenant_id)
        .single()

      const registrationCourse = (Array.isArray(registration?.courses) ? registration.courses[0] : registration?.courses) as RegistrationCourse | null
      if (regError || !registration || !registrationCourse?.id || registrationCourse.tenant_id !== userProfile.tenant_id) {
        throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
      }

      memberships = await listRegistrationSariMemberships(supabase, userProfile.tenant_id, registrationId)
      if (memberships.length === 0) {
        throw createError({
          statusCode: 409,
          statusMessage: 'No confirmed SARI membership for this registration',
        })
      }

      courseId = registrationCourse.id
    } else {
      // Service role bypasses RLS, so the joined course tenant is the boundary.
      const { data: session, error: sessionError } = await supabase
        .from('course_sessions')
        .select('course_id, course:courses!course_sessions_course_id_fkey(id, tenant_id)')
        .eq('id', courseSessionId)
        .single()

      const sessionCourse = (Array.isArray(session?.course) ? session.course[0] : session?.course) as { tenant_id?: string } | null

      // Missing and foreign-tenant sessions share one response.
      if (sessionError || !session || !sessionCourse || sessionCourse.tenant_id !== userProfile.tenant_id) {
        throw createError({ statusCode: 404, statusMessage: 'Course session not found' })
      }

      memberships = await listStudentMembershipsForCourseSession(
        supabase,
        userProfile.tenant_id,
        courseSessionId,
        studentId,
      )
      if (memberships.length === 0) {
        throw createError({
          statusCode: 409,
          statusMessage: 'No confirmed SARI membership for this session',
        })
      }

      courseId = session.course_id
    }

    if (!courseId) {
      throw createError({
        statusCode: 404,
        statusMessage: registrationId ? 'Registration not found' : 'Course session not found',
      })
    }

    // Get tenant SARI settings
    const { data: tenantSettings, error: tenantError } = await supabase
      .from('tenants')
      .select('sari_enabled, sari_environment')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError || !tenantSettings) {
      throw createError({ statusCode: 500, statusMessage: 'Tenant configuration not found' })
    }

    if (!tenantSettings.sari_enabled) {
      throw createError({ statusCode: 400, statusMessage: 'SARI integration is not enabled for this tenant' })
    }

    // ✅ Load SARI credentials securely
    let sariSecrets
    try {
      sariSecrets = await getTenantSecretsSecure(
        userProfile.tenant_id,
        ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
        'SARI_UNENROLL'
      )
    } catch (secretsErr: any) {
      logger.error('❌ Failed to load SARI credentials:', secretsErr.message)
      throw createError({ statusCode: 500, statusMessage: 'SARI credentials not properly configured' })
    }

    // Create SARI client
    const sariClient = new SARIClient({
      environment: tenantSettings.sari_environment || 'test',
      clientId: sariSecrets.SARI_CLIENT_ID,
      clientSecret: sariSecrets.SARI_CLIENT_SECRET,
      username: sariSecrets.SARI_USERNAME,
      password: sariSecrets.SARI_PASSWORD
    })

    // One SARI call per stored membership. The row is deleted only after SARI
    // confirms the seat is gone. A failure leaves that row in place.
    const sariCourseIds = memberships.map((membership) => membership.sari_session_id)
    console.log(`📝 [${userProfile.auth_user_id}] Unenrolling student ${student.id} from SARI sessions ${sariCourseIds.join(',')}`)

    let alreadyUnenrolled = memberships.length > 0
    for (const membership of memberships) {
      try {
        await sariClient.unenrollStudent(membership.sari_session_id, student.faberid)
        alreadyUnenrolled = false
        console.log(`✅ [${userProfile.auth_user_id}] Successfully unenrolled student from SARI session ${membership.sari_session_id}`)
      } catch (unenrollErr: any) {
        if (!isSariUnenrollIdempotent(unenrollErr.message)) {
          throw unenrollErr
        }
        console.log(`ℹ️ [${userProfile.auth_user_id}] Student already unenrolled from SARI session ${membership.sari_session_id}`)
      }

      await deleteConfirmedSariMembership({
        supabase,
        tenantId: userProfile.tenant_id,
        registrationId: membership.registration_id,
        sariSessionId: membership.sari_session_id,
      })
    }

    // Update only the registrations whose membership rows were removed.
    const registrationIds = [...new Set(memberships.map((membership) => membership.registration_id))]
    for (const registrationId of registrationIds) {
      const remaining = await listRegistrationSariMemberships(supabase, userProfile.tenant_id, registrationId)
      if (remaining.length > 0) continue
      const { error: updateError } = await supabase
        .from('course_registrations')
        .update({
          status: 'cancelled',
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          sari_synced: true,
          sari_synced_at: new Date().toISOString()
        })
        .eq('id', registrationId)
        .eq('tenant_id', userProfile.tenant_id)
        .is('deleted_at', null)

      if (updateError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'SARI membership was removed, but the local registration could not be updated',
        })
      }
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
        sari_course_id: sariCourseIds.length === 1 ? sariCourseIds[0] : sariCourseIds,
      },
      ip_address: getClientIP(event),
    })

    return {
      success: true,
      alreadyUnenrolled,
      message: alreadyUnenrolled
        ? `Student ${student.first_name} ${student.last_name} was already unenrolled from SARI course`
        : `Student ${student.first_name} ${student.last_name} unenrolled from SARI course`,
      sariCourseId: sariCourseIds.length === 1 ? sariCourseIds[0] : sariCourseIds
    }

  } catch (error: any) {
    console.error('SARI unenroll-student error:', error)

    // Real blocker: SARI refuses the removal via API — no amount of retrying will help.
    if (isSariUnenrollBlocked(error.message)) {
      throw createError({
        statusCode: 409,
        statusMessage: getSariUnenrollBlockedMessage(),
        data: { code: 'COURSEMEMBER_ALREADY_CONFIRMED' }
      })
    }

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

    if (error.message?.includes('NO_PERMISSION')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'No permission for this driving school in SARI'
      })
    }

    if (error.message?.includes('COURSE_NOT_ALLOWED_OR_ENABLED')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Course is not enabled in SARI'
      })
    }

    if (error.statusCode && error.statusMessage) {
      throw mapSupabaseError(error)
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Failed to unenroll student from SARI course: ${error.message || 'Unknown error'}`
    })
  }
})
