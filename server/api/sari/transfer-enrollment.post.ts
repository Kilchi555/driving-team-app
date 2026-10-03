/**
 * POST /api/sari/transfer-enrollment
 * Transfer (reschedule) a participant from one course to another.
 *
 * Admins can transfer any registration within their tenant.
 * Customers can only transfer their own registration, and only if the course
 * starts more than 7 days in the future.
 *
 * SARI:
 * - No confirmed membership → local DB transfer only
 * - Confirmed membership → SARI must succeed before the source registration is cancelled
 * - A failed SARI call leaves the membership row in place
 *
 * Existing payment_id is carried over to the new registration.
 */

import { getSupabaseServerWithSession } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient, isSariUnenrollIdempotent, isSariUnenrollBlocked, getSariUnenrollBlockedMessage } from '~/utils/sariClient'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import {
  deleteConfirmedSariMembership,
  isConfirmedSariEnrollDuplicate,
  isUnresolvedSariRegistration,
  listRegistrationSariMemberships,
  parsePositiveSariSessionId,
  recordConfirmedSariMembership,
  SARI_MEMBERSHIP_SOURCE,
  setRegistrationSariSynced,
  strictSariIdsFromGroup,
} from '~/server/utils/registration-sari-membership'
import { logger } from '~/utils/logger'
import { throwIfCourseCapacityExceeded } from '~/server/utils/course-capacity'
import {
  restoreTransferredSource,
  snapshotTransferSource,
  TRANSFER_SOURCE_RESTORE_FATAL,
} from '~/server/utils/sari-transfer-source'
import { sendTenantEmail, generateCourseTransferEmail } from '~/server/utils/email'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { allowsCustomerAccountActivation } from '~/server/utils/customer-account-activation'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServerWithSession(event)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const supabaseAdmin = getSupabaseAdmin()

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

  const body = await readBody(event)
  const { registrationId, targetCourseId, notifyCustomer } = body ?? {}

  if (!registrationId || !targetCourseId) {
    throw createError({ statusCode: 400, statusMessage: 'registrationId und targetCourseId erforderlich' })
  }

  const shouldNotify = isAdmin ? (notifyCustomer === true) : true

  const { data: oldReg } = await supabaseAdmin
    .from('course_registrations')
    .select('id, course_id, tenant_id, user_id, sari_faberid, is_partial_enrollment, first_name, last_name, payment_id, payment_method, payment_status, amount_paid_rappen, sari_data, sari_licenses, email, phone, street, street_nr, zip, city, birthdate, status, deleted_at, notes')
    .eq('id', registrationId)
    .eq('tenant_id', callerProfile.tenant_id)
    .in('status', ['confirmed', 'enrolled', 'pending'])
    .is('deleted_at', null)
    .single()

  if (!oldReg) {
    throw createError({ statusCode: 404, statusMessage: 'Anmeldung nicht gefunden' })
  }

  if (!isAdmin && oldReg.user_id !== callerProfile.id) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung für diese Anmeldung' })
  }

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

  if (!oldCourse) {
    throw createError({ statusCode: 404, statusMessage: 'Ausgangs-Kurs nicht gefunden' })
  }

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

  if (targetCourse.id === oldCourse.id) {
    throw createError({ statusCode: 400, statusMessage: 'Ziel-Kurs ist identisch mit dem aktuellen Kurs' })
  }

  if (targetCourse.category !== oldCourse.category) {
    throw createError({ statusCode: 400, statusMessage: 'Umplanung nur innerhalb derselben Kurs-Kategorie möglich' })
  }

  const freeSlots = (targetCourse.max_participants ?? 0) - (targetCourse.current_participants ?? 0)
  if (freeSlots <= 0) {
    throw createError({ statusCode: 409, statusMessage: 'Ziel-Kurs ist ausgebucht' })
  }

  if (!isAdmin) {
    const startDate = oldCourse.course_start_date ? new Date(oldCourse.course_start_date) : null
    if (!startDate || startDate.getTime() - Date.now() < SEVEN_DAYS_MS) {
      const terms = await getTenantTerminology(supabaseAdmin, callerProfile.tenant_id)
      throw createError({
        statusCode: 403,
        statusMessage: `Selbstständige Umplanung ist nur bis 7 Tage vor Kursbeginn möglich. Bitte kontaktiere den ${terms.staff}.`,
      })
    }
  }

  // Resolve faberid / birthdate (registration → user profile → sari_data)
  let faberid = (oldReg.sari_faberid || '').replace(/\./g, '') || null
  let birthdate: string | null =
    oldReg.birthdate ||
    (oldReg.sari_data as any)?.birthdate ||
    null

  if ((!faberid || !birthdate) && oldReg.user_id) {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('faberid, birthdate')
      .eq('id', oldReg.user_id)
      .maybeSingle()
    if (!faberid && userRow?.faberid) faberid = String(userRow.faberid).replace(/\./g, '')
    if (!birthdate && userRow?.birthdate) birthdate = userRow.birthdate
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, sari_enabled, sari_environment, booking_policy')
    .eq('id', callerProfile.tenant_id)
    .single()

  // ── SARI sync (best-effort) ──────────────────────────────────────────────
  let sariSynced = false
  let targetSeatsConfirmed = false
  const enrolledTargetIds: number[] = []
  let sariWarning: string | undefined
  let transferSari: SARIClient | null = null
  let transferOldMemberships: Awaited<ReturnType<typeof listRegistrationSariMemberships>> = []
  const bothSari =
    !!(oldCourse.sari_managed && oldCourse.sari_course_id) &&
    !!(targetCourse.sari_managed && targetCourse.sari_course_id)

  if (bothSari && faberid && tenant?.sari_enabled) {
    let sariSecrets: any = null
    try {
      sariSecrets = await getTenantSecretsSecure(
        callerProfile.tenant_id,
        ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
        'TRANSFER_ENROLLMENT'
      )
    } catch {
      sariWarning = 'Keine SARI-Zugangsdaten — nur lokal umgebucht'
    }

    if (sariSecrets) {
      const sari = new SARIClient({
        environment: (tenant.sari_environment || 'test') as 'test' | 'production',
        clientId: sariSecrets.SARI_CLIENT_ID,
        clientSecret: sariSecrets.SARI_CLIENT_SECRET,
        username: sariSecrets.SARI_USERNAME,
        password: sariSecrets.SARI_PASSWORD,
      })

      const extractAllSariIds = (sariCourseId: string): string[] => {
        return strictSariIdsFromGroup(sariCourseId).map(String)
      }

      const partialStartPos: number = (oldCourse.course_categories as any)?.partial_start_position ?? 3
      const isPartial = !!oldReg.is_partial_enrollment
      const filterSessions = (ids: string[]): string[] => {
        if (!isPartial) return ids
        return ids.slice(partialStartPos - 1)
      }

      const oldMemberships = await listRegistrationSariMemberships(
        supabaseAdmin,
        callerProfile.tenant_id,
        oldReg.id,
      )
      transferSari = sari
      transferOldMemberships = oldMemberships
      const targetSariIds = filterSessions(extractAllSariIds(targetCourse.sari_course_id!))
        .map((id) => parsePositiveSariSessionId(id))
        .filter((id): id is number => id != null)

      if (oldMemberships.length === 0) {
        if (isUnresolvedSariRegistration({
          sariManaged: !!oldCourse.sari_managed,
          faberid,
          status: oldReg.status,
          paymentMethod: oldReg.payment_method,
          membershipCount: 0,
        })) {
          throw createError({
            statusCode: 409,
            statusMessage: 'SARI membership status unknown',
            data: { sariSynced: false },
          })
        }
        sariWarning = 'Keine bestätigte SARI-Membership — nur lokal umgebucht'
      } else if (targetSariIds.length === 0) {
        throw createError({
          statusCode: 409,
          statusMessage: 'SARI-Umplanung nicht möglich: keine gültige Ziel-Session bei bestehender Membership',
        })
      } else {
        try {
          logger.info(`🔍 Validating ${targetSariIds.length} target sessions for ${faberid}`)
          const validation = await sari.validateAllSessions(targetSariIds.map(String), faberid, birthdate ?? '')
          if (!validation.canEnroll) {
            throw createError({ statusCode: 409, statusMessage: validation.reason || 'Anmeldung im Ziel-Kurs nicht möglich' })
          }

          logger.info(`🔄 Transfer ${faberid}: unenroll [${oldMemberships.map((row) => row.sari_session_id)}] → enroll [${targetSariIds}]`)

          for (const membership of oldMemberships) {
            try {
              await sari.unenrollStudent(membership.sari_session_id, faberid)
            } catch (err: any) {
              if (isSariUnenrollIdempotent(err.message)) {
                // SARI already has no seat. The local row is removed below.
              } else if (isSariUnenrollBlocked(err.message)) {
                throw createError({ statusCode: 409, statusMessage: getSariUnenrollBlockedMessage() })
              } else {
                throw createError({ statusCode: 502, statusMessage: `SARI-Abmeldung (Session ${membership.sari_session_id}) fehlgeschlagen: ${err.message}` })
              }
            }
            await deleteConfirmedSariMembership({
              supabase: supabaseAdmin,
              tenantId: callerProfile.tenant_id,
              registrationId: oldReg.id,
              sariSessionId: membership.sari_session_id,
            })
          }

          for (const sessionId of targetSariIds) {
            try {
              await sari.enrollStudent(sessionId, faberid, birthdate ?? '')
              enrolledTargetIds.push(sessionId)
            } catch (err: any) {
              for (const sid of enrolledTargetIds) {
                try {
                  await sari.unenrollStudent(sid, faberid)
                } catch (rollbackErr: any) {
                  logger.error(`SARI rollback unenroll failed for ${sid}: ${rollbackErr?.message}`)
                }
              }
              for (const membership of oldMemberships) {
                try {
                  try {
                    await sari.enrollStudent(membership.sari_session_id, faberid, birthdate ?? '')
                  } catch (restoreEnrollErr: any) {
                    if (!isConfirmedSariEnrollDuplicate(restoreEnrollErr?.message)) throw restoreEnrollErr
                  }
                  await recordConfirmedSariMembership({
                    supabase: supabaseAdmin,
                    tenantId: callerProfile.tenant_id,
                    registrationId: oldReg.id,
                    sariSessionId: membership.sari_session_id,
                    courseSessionId: membership.course_session_id,
                    source: membership.source,
                  })
                } catch (restoreErr: any) {
                  logger.error(`SARI membership restore failed for ${membership.sari_session_id}: ${restoreErr?.message}`)
                  throw createError({
                    statusCode: 502,
                    statusMessage: `SARI-Anmeldung fehlgeschlagen und die bisherige Membership konnte nicht wiederhergestellt werden: ${restoreErr?.message || err.message}`,
                  })
                }
              }
              if (err.message?.includes('PERSON_ALREADY_ADDED')) {
                throw createError({ statusCode: 409, statusMessage: 'Teilnehmer ist bereits im Ziel-Kurs angemeldet' })
              }
              throw createError({ statusCode: 502, statusMessage: `SARI-Anmeldung (Session ${sessionId}) fehlgeschlagen: ${err.message}` })
            }
          }
          targetSeatsConfirmed = true
        } catch (err: any) {
          if (err?.statusCode) throw err
          throw createError({
            statusCode: 502,
            statusMessage: err?.message || 'SARI-Umplanung fehlgeschlagen',
          })
        }
      }
    }
  } else if (bothSari && !faberid) {
    sariWarning = 'Keine Faber-ID — nur lokal umgebucht (nicht in SARI)'
  }

  // A leftover membership means SARI was not confirmed clear. Do not cancel locally.
  if (!targetSeatsConfirmed) {
    const remainingMemberships = await listRegistrationSariMemberships(
      supabaseAdmin,
      callerProfile.tenant_id,
      oldReg.id,
    )
    if (remainingMemberships.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: sariWarning || 'Umplanung abgebrochen: die SARI-Membership wurde nicht entfernt',
      })
    }
  }

  // ── DB changes ───────────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const sourceSnapshot = snapshotTransferSource(oldReg)

  // payment_id is UNIQUE on course_registrations — release it from the old row first
  if (oldReg.payment_id) {
    await supabaseAdmin
      .from('course_registrations')
      .update({ payment_id: null, updated_at: now })
      .eq('id', oldReg.id)
  }

  // payment_method CHECK allows: online, cash_on_site, invoice, wallee, credit, admin, reserved, company
  const allowedMethods = new Set(['online', 'cash_on_site', 'invoice', 'wallee', 'credit', 'admin', 'reserved', 'company'])
  let paymentMethod = oldReg.payment_method || null
  if (paymentMethod && !allowedMethods.has(paymentMethod)) {
    paymentMethod = 'invoice'
  }

  // payment_status CHECK: pending, paid, failed, refunded
  const allowedStatuses = new Set(['pending', 'paid', 'failed', 'refunded'])
  let paymentStatus = oldReg.payment_status || 'pending'
  if (!allowedStatuses.has(paymentStatus)) {
    paymentStatus = paymentStatus === 'invoiced' || paymentStatus === 'completed' ? 'pending' : 'pending'
  }

  await supabaseAdmin
    .from('course_registrations')
    .update({
      status: 'cancelled',
      deleted_at: now,
      notes: `Umgebucht zu Kurs "${targetCourse.name}" am ${new Date().toLocaleDateString('de-CH')}`,
      updated_at: now,
    })
    .eq('id', oldReg.id)

  const { data: newReg, error: newRegError } = await supabaseAdmin
    .from('course_registrations')
    .insert({
      course_id: targetCourse.id,
      tenant_id: callerProfile.tenant_id,
      user_id: oldReg.user_id,
      participant_id: null,
      status: oldReg.status === 'pending' ? 'pending' : 'confirmed',
      payment_status: paymentStatus,
      payment_id: oldReg.payment_id || null,
      payment_method: paymentMethod,
      amount_paid_rappen: oldReg.amount_paid_rappen ?? 0,
      discount_applied_rappen: 0,
      first_name: oldReg.first_name,
      last_name: oldReg.last_name,
      email: oldReg.email,
      phone: oldReg.phone,
      street: oldReg.street,
      street_nr: oldReg.street_nr,
      zip: oldReg.zip,
      city: oldReg.city,
      birthdate,
      sari_faberid: faberid,
      sari_data: oldReg.sari_data,
      sari_licenses: oldReg.sari_licenses,
      sari_synced: false,
      sari_synced_at: null,
      transferred_from_registration_id: oldReg.id,
      notes: `Umgebucht von Kurs "${oldCourse.name}" am ${new Date().toLocaleDateString('de-CH')}`,
      registered_by: callerProfile.id,
      created_at: now,
    })
    .select('id')
    .single()

  if (!newRegError && newReg?.id && targetSeatsConfirmed) {
    try {
      for (const sariSessionId of enrolledTargetIds) {
        await recordConfirmedSariMembership({
          supabase: supabaseAdmin,
          tenantId: callerProfile.tenant_id,
          registrationId: newReg.id,
          sariSessionId,
          courseSessionId: null,
          source: SARI_MEMBERSHIP_SOURCE.transferEnrollment,
        })
      }
      await setRegistrationSariSynced(supabaseAdmin, callerProfile.tenant_id, newReg.id, true)
      sariSynced = true
    } catch (writeErr: any) {
      let membershipRestoreError: string | null = null
      if (transferSari && faberid) {
        try {
          for (const sid of enrolledTargetIds) {
            try {
              await transferSari.unenrollStudent(sid, faberid)
            } catch (rollbackErr: any) {
              if (!isSariUnenrollIdempotent(rollbackErr?.message)) throw rollbackErr
            }
          }
          for (const membership of transferOldMemberships) {
            try {
              await transferSari.enrollStudent(membership.sari_session_id, faberid, birthdate ?? '')
            } catch (restoreEnrollErr: any) {
              if (!isConfirmedSariEnrollDuplicate(restoreEnrollErr?.message)) throw restoreEnrollErr
            }
            await recordConfirmedSariMembership({
              supabase: supabaseAdmin,
              tenantId: callerProfile.tenant_id,
              registrationId: oldReg.id,
              sariSessionId: membership.sari_session_id,
              courseSessionId: membership.course_session_id,
              source: membership.source,
            })
          }
        } catch (restoreErr: any) {
          membershipRestoreError = restoreErr?.message || 'SARI-Membership konnte nicht wiederhergestellt werden'
        }
      }
      await supabaseAdmin
        .from('course_registrations')
        .update({ status: 'cancelled', deleted_at: now, sari_synced: false })
        .eq('id', newReg.id)
      const restored = await restoreTransferredSource({
        supabase: supabaseAdmin,
        snapshot: sourceSnapshot,
        updatedAt: now,
      })
      if (!restored.ok || membershipRestoreError) {
        const reason = membershipRestoreError || (!restored.ok ? restored.reason : 'unknown')
        throw createError({
          statusCode: 502,
          statusMessage: `SARI-Membership konnte nicht gespeichert werden und die bisherige Membership konnte nicht wiederhergestellt werden: ${reason}`,
        })
      }
      throw createError({
        statusCode: 502,
        statusMessage: `SARI-Membership konnte nicht gespeichert werden: ${writeErr?.message || 'unbekannt'}`,
      })
    }
  }

  if (newRegError) {
    let membershipRestoreError: string | null = null
    if (targetSeatsConfirmed && transferSari && faberid) {
      try {
        for (const sid of enrolledTargetIds) {
          try {
            await transferSari.unenrollStudent(sid, faberid)
          } catch (rollbackErr: any) {
            if (!isSariUnenrollIdempotent(rollbackErr?.message)) throw rollbackErr
          }
        }
        for (const membership of transferOldMemberships) {
          try {
            await transferSari.enrollStudent(membership.sari_session_id, faberid, birthdate ?? '')
          } catch (restoreEnrollErr: any) {
            if (!isConfirmedSariEnrollDuplicate(restoreEnrollErr?.message)) throw restoreEnrollErr
          }
          await recordConfirmedSariMembership({
            supabase: supabaseAdmin,
            tenantId: callerProfile.tenant_id,
            registrationId: oldReg.id,
            sariSessionId: membership.sari_session_id,
            courseSessionId: membership.course_session_id,
            source: membership.source,
          })
        }
      } catch (restoreErr: any) {
        membershipRestoreError = restoreErr?.message || 'SARI-Membership konnte nicht wiederhergestellt werden'
        logger.error(`SARI membership restore after failed transfer insert: ${membershipRestoreError}`)
      }
    }

    const restored = await restoreTransferredSource({
      supabase: supabaseAdmin,
      snapshot: sourceSnapshot,
      updatedAt: now,
    })
    if (!restored.ok) {
      logger.error(`Failed to restore source registration ${oldReg.id} after transfer insert error (${restored.reason}): ${newRegError.message}`)
      throw createError({
        statusCode: 500,
        statusMessage: membershipRestoreError
          ? `${TRANSFER_SOURCE_RESTORE_FATAL} ${membershipRestoreError}`
          : TRANSFER_SOURCE_RESTORE_FATAL,
      })
    }
    if (membershipRestoreError) {
      throw createError({
        statusCode: 502,
        statusMessage: `Neue Anmeldung konnte nicht erstellt werden und die bisherige SARI-Membership konnte nicht wiederhergestellt werden: ${membershipRestoreError}`,
      })
    }
    throwIfCourseCapacityExceeded(newRegError)
    logger.error(`Failed to create new registration: ${newRegError.message}`)
    throw createError({
      statusCode: 500,
      statusMessage: `Neue Anmeldung konnte nicht erstellt werden: ${newRegError.message}`,
    })
  }

  // Recount both courses accurately
  for (const courseId of [oldCourse.id, targetCourse.id]) {
    const { count } = await supabaseAdmin
      .from('course_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .neq('status', 'cancelled')
      .is('deleted_at', null)
    await supabaseAdmin
      .from('courses')
      .update({ current_participants: count || 0, updated_at: now })
      .eq('id', courseId)
  }

  // Move payment link to new registration if present
  if (oldReg.payment_id) {
    await supabaseAdmin
      .from('payments')
      .update({ course_registration_id: newReg.id, updated_at: now })
      .eq('id', oldReg.payment_id)
  }

  logger.info(`✅ Transfer complete: ${faberid || oldReg.email} → "${targetCourse.name}" (new reg ${newReg.id})${sariSynced ? ' + SARI' : ' local-only'}`)

  if (shouldNotify && oldReg.email) {
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
      tenantName: tenant?.name || 'Unternehmen',
      tenantEmail: tenantContact?.contact_email ?? undefined,
      tenantPhone: tenantContact?.contact_phone ?? undefined,
      includeAppStore: allowsCustomerAccountActivation((tenant as any)?.booking_policy),
    })

    sendTenantEmail(callerProfile.tenant_id, {
      to: oldReg.email,
      subject: `Kursumplanung bestätigt – ${targetCourse.name}`,
      html,
    }).catch((err: any) => logger.warn(`Transfer email failed for ${oldReg.email}: ${err.message}`))
  }

  return {
    success: true,
    newRegistrationId: newReg.id,
    fromCourse: { id: oldCourse.id, name: oldCourse.name },
    toCourse: { id: targetCourse.id, name: targetCourse.name },
    sariSynced,
    warning: sariWarning,
  }
})
