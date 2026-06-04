/**
 * POST /api/sari/transfer-enrollment
 * Transfer (reschedule) a participant from one SARI course to another.
 *
 * Admins can transfer any registration within their tenant.
 * Customers can only transfer their own registration, and only if the course
 * starts more than 7 days in the future.
 *
 * The transfer is free: existing payment_id is carried over to the new registration.
 * SARI is unenrolled + re-enrolled atomically before any DB changes are made.
 */

import { getSupabaseServerWithSession } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient } from '~/utils/sariClient'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { logger } from '~/utils/logger'
import { sendTenantEmail, generateCourseTransferEmail } from '~/server/utils/email'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServerWithSession(event)

  // Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Load caller's profile
  const { data: callerProfile } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!callerProfile) {
    throw createError({ statusCode: 403, statusMessage: 'Benutzerprofil nicht gefunden' })
  }

  const isAdmin = ['admin', 'superadmin', 'staff'].includes(callerProfile.role)

  // Parse input
  const body = await readBody(event)
  const { registrationId, targetCourseId, notifyCustomer } = body ?? {}

  if (!registrationId || !targetCourseId) {
    throw createError({ statusCode: 400, statusMessage: 'registrationId und targetCourseId erforderlich' })
  }

  // Customers always get a notification; admins can opt in via notifyCustomer flag
  const shouldNotify = isAdmin ? (notifyCustomer === true) : true

  // Load old registration
  const { data: oldReg } = await supabaseAdmin
    .from('course_registrations')
    .select('id, course_id, tenant_id, user_id, sari_faberid, is_partial_enrollment, first_name, last_name, payment_id, payment_method, amount_paid_rappen, sari_data, sari_licenses, email, phone, street, zip, city')
    .eq('id', registrationId)
    .eq('tenant_id', callerProfile.tenant_id)
    .in('status', ['confirmed', 'enrolled', 'pending'])
    .is('deleted_at', null)
    .single()

  if (!oldReg) {
    throw createError({ statusCode: 404, statusMessage: 'Anmeldung nicht gefunden' })
  }

  // For customer role: only allow transferring their own registration
  if (!isAdmin) {
    if (oldReg.user_id !== callerProfile.id) {
      throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung für diese Anmeldung' })
    }
  }

  // Load old course (with category config for partial enrollment)
  const { data: oldCourse } = await supabaseAdmin
    .from('courses')
    .select(`
      id, name, sari_managed, sari_course_id, category,
      current_participants, max_participants, course_start_date, tenant_id,
      course_categories(partial_start_position)
    `)
    .eq('id', oldReg.course_id)
    .eq('tenant_id', callerProfile.tenant_id)
    .single()

  if (!oldCourse?.sari_managed || !oldCourse.sari_course_id) {
    throw createError({ statusCode: 400, statusMessage: 'Ausgangs-Kurs ist kein SARI-verwalteter Kurs' })
  }

  // Load target course
  const { data: targetCourse } = await supabaseAdmin
    .from('courses')
    .select('id, name, sari_managed, sari_course_id, category, current_participants, max_participants, course_start_date, tenant_id')
    .eq('id', targetCourseId)
    .eq('tenant_id', callerProfile.tenant_id)
    .eq('is_active', true)
    .single()

  if (!targetCourse) {
    throw createError({ statusCode: 404, statusMessage: 'Ziel-Kurs nicht gefunden' })
  }

  if (!targetCourse.sari_managed || !targetCourse.sari_course_id) {
    throw createError({ statusCode: 400, statusMessage: 'Ziel-Kurs ist kein SARI-verwalteter Kurs' })
  }

  if (targetCourse.id === oldCourse.id) {
    throw createError({ statusCode: 400, statusMessage: 'Ziel-Kurs ist identisch mit dem aktuellen Kurs' })
  }

  if (targetCourse.category !== oldCourse.category) {
    throw createError({ statusCode: 400, statusMessage: 'Umplanung nur innerhalb derselben Kurs-Kategorie möglich' })
  }

  // Check free slots
  const freeSlots = (targetCourse.max_participants ?? 0) - (targetCourse.current_participants ?? 0)
  if (freeSlots <= 0) {
    throw createError({ statusCode: 409, statusMessage: 'Ziel-Kurs ist ausgebucht' })
  }

  // For customers: enforce 7-day deadline
  if (!isAdmin) {
    const startDate = oldCourse.course_start_date ? new Date(oldCourse.course_start_date) : null
    if (!startDate || startDate.getTime() - Date.now() < SEVEN_DAYS_MS) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Selbstständige Umplanung ist nur bis 7 Tage vor Kursbeginn möglich. Bitte kontaktiere den Fahrlehrer.'
      })
    }
  }

  // Resolve faberid and birthdate
  const faberid = oldReg.sari_faberid
  if (!faberid) {
    throw createError({ statusCode: 400, statusMessage: 'Keine SARI-Ausweisnummer für diese Anmeldung hinterlegt' })
  }

  const birthdate: string | null = (oldReg.sari_data as any)?.birthdate ?? null

  // Load SARI credentials for this tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, sari_enabled, sari_environment')
    .eq('id', callerProfile.tenant_id)
    .single()

  if (!tenant?.sari_enabled) {
    throw createError({ statusCode: 400, statusMessage: 'SARI ist für diesen Tenant nicht aktiviert' })
  }

  let sariSecrets: any
  try {
    sariSecrets = await getTenantSecretsSecure(
      callerProfile.tenant_id,
      ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
      'TRANSFER_ENROLLMENT'
    )
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'SARI-Zugangsdaten nicht konfiguriert' })
  }

  const sari = new SARIClient({
    environment: (tenant.sari_environment || 'test') as 'test' | 'production',
    clientId: sariSecrets.SARI_CLIENT_ID,
    clientSecret: sariSecrets.SARI_CLIENT_SECRET,
    username: sariSecrets.SARI_USERNAME,
    password: sariSecrets.SARI_PASSWORD,
  })

  // Helper: extract all numeric session IDs from a GROUP_X_Y_Z string (preserves order)
  const extractAllSariIds = (sariCourseId: string): string[] => {
    const parts = String(sariCourseId).split('_')
    return parts.filter(p => p && !isNaN(parseInt(p)))
  }

  // Determine which session IDs to transfer (full course or partial)
  const partialStartPos: number = (oldCourse.course_categories as any)?.partial_start_position ?? 3
  const isPartial = !!oldReg.is_partial_enrollment

  const filterSessions = (ids: string[]): string[] => {
    if (!isPartial) return ids
    // Partial enrollment: only sessions from partialStartPos onwards (1-indexed)
    return ids.slice(partialStartPos - 1)
  }

  const oldSariIds = filterSessions(extractAllSariIds(oldCourse.sari_course_id))
  const targetSariIds = filterSessions(extractAllSariIds(targetCourse.sari_course_id))

  if (oldSariIds.length === 0 || targetSariIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Keine gültigen SARI-Session-IDs gefunden' })
  }

  // Validate all target sessions before making any changes (checks deadline, capacity, order)
  logger.info(`🔍 Validating ${targetSariIds.length} target sessions for ${faberid}`)
  const validation = await sari.validateAllSessions(targetSariIds, faberid, birthdate ?? '')
  if (!validation.canEnroll) {
    throw createError({ statusCode: 409, statusMessage: validation.reason || 'Anmeldung im Ziel-Kurs nicht möglich' })
  }

  // === SARI operations — unenroll from all old sessions, enroll in all new sessions ===
  logger.info(`🔄 Transfer ${faberid}: unenroll [${oldSariIds}] → enroll [${targetSariIds}]`)

  // 1. Unenroll from all old sessions
  for (const sessionId of oldSariIds) {
    try {
      await sari.unenrollStudent(parseInt(sessionId), faberid)
      logger.debug(`✅ Unenrolled session ${sessionId}`)
    } catch (err: any) {
      // Already not enrolled is fine (idempotent)
      if (!err.message?.includes('PERSON_NOT_FOUND') && !err.message?.includes('PERSON_NOT_REGISTERED')) {
        logger.error(`SARI unenroll failed for session ${sessionId}: ${err.message}`)
        throw createError({ statusCode: 502, statusMessage: `SARI-Abmeldung (Session ${sessionId}) fehlgeschlagen: ${err.message}` })
      }
    }
  }

  // 2. Enroll in all new sessions (with rollback if any fail)
  const enrolledSessions: string[] = []
  for (const sessionId of targetSariIds) {
    try {
      await sari.enrollStudent(parseInt(sessionId), faberid, birthdate ?? '')
      enrolledSessions.push(sessionId)
      logger.debug(`✅ Enrolled session ${sessionId}`)
    } catch (err: any) {
      logger.error(`SARI enroll failed for session ${sessionId}: ${err.message}`)
      // Rollback: unenroll newly enrolled sessions + re-enroll in old course
      for (const sid of enrolledSessions) {
        try { await sari.unenrollStudent(parseInt(sid), faberid) } catch {}
      }
      for (const sid of oldSariIds) {
        try { await sari.enrollStudent(parseInt(sid), faberid, birthdate ?? '') } catch {}
      }
      if (err.message?.includes('PERSON_ALREADY_ADDED')) {
        throw createError({ statusCode: 409, statusMessage: 'Teilnehmer ist bereits im Ziel-Kurs angemeldet' })
      }
      throw createError({ statusCode: 502, statusMessage: `SARI-Anmeldung (Session ${sessionId}) fehlgeschlagen: ${err.message}` })
    }
  }

  // === DB changes — SARI operations succeeded ===
  const now = new Date().toISOString()

  // Cancel old registration (soft delete)
  const { error: cancelError } = await supabaseAdmin
    .from('course_registrations')
    .update({
      status: 'cancelled',
      deleted_at: now,
      notes: `Umgebucht zu Kurs "${targetCourse.name}" am ${new Date().toLocaleDateString('de-CH')}`,
      updated_at: now,
    })
    .eq('id', oldReg.id)

  if (cancelError) {
    logger.error(`Failed to cancel old registration ${oldReg.id}: ${cancelError.message}`)
    // SARI already transferred — log but continue so new registration is still created
  }

  // Create new registration
  const { data: newReg, error: newRegError } = await supabaseAdmin
    .from('course_registrations')
    .insert({
      course_id: targetCourse.id,
      tenant_id: callerProfile.tenant_id,
      user_id: oldReg.user_id,
      participant_id: null,
      status: 'confirmed',
      payment_status: 'paid',
      payment_id: oldReg.payment_id,
      payment_method: oldReg.payment_method,
      amount_paid_rappen: oldReg.amount_paid_rappen ?? 0,
      discount_applied_rappen: 0,
      first_name: oldReg.first_name,
      last_name: oldReg.last_name,
      email: oldReg.email,
      phone: oldReg.phone,
      street: oldReg.street,
      zip: oldReg.zip,
      city: oldReg.city,
      sari_faberid: faberid,
      sari_data: oldReg.sari_data,
      sari_licenses: oldReg.sari_licenses,
      sari_synced: true,
      sari_synced_at: now,
      transferred_from_registration_id: oldReg.id,
      notes: `Umgebucht von Kurs "${oldCourse.name}" am ${new Date().toLocaleDateString('de-CH')}`,
      registered_by: user.id,
      created_at: now,
    })
    .select('id')
    .single()

  if (newRegError) {
    logger.error(`Failed to create new registration: ${newRegError.message}`)
    throw createError({ statusCode: 500, statusMessage: 'Neue Anmeldung konnte nicht erstellt werden' })
  }

  // Update participant counts on both courses
  await supabaseAdmin
    .from('courses')
    .update({
      current_participants: Math.max(0, (oldCourse.current_participants ?? 1) - 1),
      updated_at: now,
    })
    .eq('id', oldCourse.id)

  await supabaseAdmin
    .from('courses')
    .update({
      current_participants: (targetCourse.current_participants ?? 0) + 1,
      updated_at: now,
    })
    .eq('id', targetCourse.id)

  logger.info(`✅ Transfer complete: ${faberid} → "${targetCourse.name}" (new reg ${newReg.id})`)

  // Send transfer confirmation email to the participant (fire-and-forget)
  const emailAddress = oldReg.email as string | null
  if (shouldNotify && emailAddress) {
    const formatDate = (iso: string | null | undefined) => {
      if (!iso) return undefined
      try {
        return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
      } catch { return undefined }
    }

    const { data: tenantContact } = await supabaseAdmin
      .from('tenants')
      .select('contact_email, contact_phone')
      .eq('id', callerProfile.tenant_id)
      .single()

    const html = generateCourseTransferEmail({
      customerName: `${oldReg.first_name ?? ''} ${oldReg.last_name ?? ''}`.trim() || 'Kursteilnehmer',
      fromCourseName: oldCourse.name,
      fromCourseDate: formatDate(oldCourse.course_start_date),
      toCourseName: targetCourse.name,
      toCourseDate: formatDate(targetCourse.course_start_date),
      tenantName: tenant.name,
      tenantEmail: tenantContact?.contact_email ?? undefined,
      tenantPhone: tenantContact?.contact_phone ?? undefined,
    })

    sendTenantEmail(callerProfile.tenant_id, {
      to: emailAddress,
      subject: `Kursumplanung bestätigt – ${targetCourse.name}`,
      html,
    }).catch((err: any) => logger.warn(`Transfer email failed for ${emailAddress}: ${err.message}`))
  }

  return {
    success: true,
    newRegistrationId: newReg.id,
    fromCourse: { id: oldCourse.id, name: oldCourse.name },
    toCourse: { id: targetCourse.id, name: targetCourse.name },
  }
})
