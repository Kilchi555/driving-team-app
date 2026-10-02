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
import { assignSessionDayPositions, registrationAttendsTeil } from '~/utils/course-session-attendance'

type RegistrationCourse = {
  id?: string
  tenant_id?: string
  sari_managed?: boolean
  sari_course_id?: string | null
}

type RegistrationSessionRow = {
  id?: string
  sari_session_id?: string | number | null
  session_number?: number | null
  tenant_id?: string | null
  start_time?: string | null
}

function numericSariSessionId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return null
  const parsed = parseInt(value, 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function relevantRegistrationSessionIds(
  registration: {
    is_partial_enrollment?: boolean | null
    partial_start_session?: number | null
    individual_session_number?: number | null
    custom_sessions?: Record<string, unknown> | null
  },
  rows: RegistrationSessionRow[],
  tenantId: string,
): number[] | null {
  const owned = rows.filter((row) => row?.tenant_id === tenantId)
  if (owned.some((row) => !row.start_time)) return null

  const positioned = assignSessionDayPositions(
    owned.map((row) => ({
      id: row.id,
      session_number: row.session_number,
      start_time: String(row.start_time),
      sari_session_id: row.sari_session_id,
    })),
  )
  const relevant = positioned.filter((row) =>
    registrationAttendsTeil(registration, row.teil, row.session_number),
  )
  const ids: number[] = []
  for (const row of relevant) {
    const id = numericSariSessionId(row.sari_session_id)
    if (id == null) return null
    ids.push(id)
  }
  return ids
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

    // Determine course ID and the numeric SARI session ids to unenroll.
    let courseId: string | undefined
    let sariCourseIds: number[] = []

    if (registrationId) {
      // Service role bypasses RLS. Hint the course FK: unhinted courses(...) is
      // ambiguous where a second course relationship exists, and course_sessions
      // is not a foreign key of course_registrations.
      const { data: registration, error: regError } = await supabase
        .from('course_registrations')
        .select('course_id, is_partial_enrollment, individual_session_number, partial_start_session, custom_sessions, courses!course_registrations_course_id_fkey(id, tenant_id, sari_managed, sari_course_id)')
        .eq('id', registrationId)
        .eq('tenant_id', userProfile.tenant_id)
        .single()

      const registrationCourse = (Array.isArray(registration?.courses) ? registration.courses[0] : registration?.courses) as RegistrationCourse | null
      if (regError || !registration || !registrationCourse?.id || registrationCourse.tenant_id !== userProfile.tenant_id) {
        throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
      }

      // Direct embed course_sessions(sari_session_id) is not a relationship of
      // course_registrations. Sessions are loaded by course_id and tenant_id.
      const { data: sessionRows, error: sessionRowsError } = await supabase
        .from('course_sessions')
        .select('id, sari_session_id, session_number, tenant_id, start_time')
        .eq('course_id', registrationCourse.id)
        .eq('tenant_id', userProfile.tenant_id)

      if (sessionRowsError) {
        throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
      }

      const sessions = (Array.isArray(sessionRows) ? sessionRows : []) as RegistrationSessionRow[]
      const relevantIds = relevantRegistrationSessionIds(registration, sessions, userProfile.tenant_id)
      if (!relevantIds || relevantIds.length === 0) {
        throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
      }

      courseId = registrationCourse.id
      sariCourseIds = relevantIds
    } else {
      // Service role bypasses RLS, so the joined course tenant is the boundary.
      const { data: session, error: sessionError } = await supabase
        .from('course_sessions')
        .select('course_id, sari_session_id, course:courses!course_sessions_course_id_fkey(id, tenant_id)')
        .eq('id', courseSessionId)
        .single()

      const sessionCourse = (Array.isArray(session?.course) ? session.course[0] : session?.course) as { tenant_id?: string } | null

      // Missing and foreign-tenant sessions share one response.
      if (sessionError || !session || !sessionCourse || sessionCourse.tenant_id !== userProfile.tenant_id) {
        throw createError({ statusCode: 404, statusMessage: 'Course session not found' })
      }

      courseId = session.course_id
      sariCourseIds = [parseInt(session.sari_session_id || '0')]
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

    // Unenroll student from SARI. One call per authorized session id.
    // A non-idempotent failure stops before the local update.
    console.log(`📝 [${userProfile.auth_user_id}] Unenrolling student ${student.id} from SARI sessions ${sariCourseIds.join(',')}`)

    let alreadyUnenrolled = sariCourseIds.length > 0
    for (const sariCourseId of sariCourseIds) {
      try {
        await sariClient.unenrollStudent(sariCourseId, student.faberid)
        alreadyUnenrolled = false
        console.log(`✅ [${userProfile.auth_user_id}] Successfully unenrolled student from SARI session ${sariCourseId}`)
      } catch (unenrollErr: any) {
        if (isSariUnenrollIdempotent(unenrollErr.message)) {
          console.log(`ℹ️ [${userProfile.auth_user_id}] Student already unenrolled from SARI session ${sariCourseId}`)
        } else {
          throw unenrollErr
        }
      }
    }

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
      .eq('tenant_id', userProfile.tenant_id)
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
