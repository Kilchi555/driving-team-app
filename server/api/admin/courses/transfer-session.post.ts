/**
 * POST /api/admin/courses/transfer-session
 *
 * Stage is client-side. This endpoint APPLIES one or more session (Teil) moves at once:
 * 1. Order-rule check:
 *    - Hard block when tenant.sari_enabled (SARI Sync aktiv) — no override
 *    - Soft warning (acknowledgeOrderWarning) only when SARI Sync is off
 * 2. SARI enrollment TEST (validateAllSessions) on all new session IDs
 *    — only when course.sari_managed AND tenant.sari_enabled
 * 3. SARI unenroll old / enroll new
 * 4. Persist custom_sessions
 * 5. Optional customer email
 *
 * Body:
 *   registrationId: string
 *   changes: Array<{
 *     sessionPosition, targetCourseId, targetSariSessionIds,
 *     targetDate, targetStartTime?, targetEndTime?, targetCourseName?
 *   }>
 *   acknowledgeOrderWarning?: boolean  (ignored when SARI Sync is active)
 *   notifyCustomer?: boolean
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getSARICredentialsSecure } from '~/server/utils/sari-credentials-secure'
import { SARIClient } from '~/utils/sariClient'
import { logger } from '~/utils/logger'
import { sendTenantEmail } from '~/server/utils/email'
import {
  buildEffectiveSessionDates,
  evaluateSessionOrder,
} from '~/server/utils/session-order-rules'

function groupSessionsByPosition(sessions: any[]): Map<number, any[]> {
  const sorted = [...sessions].sort((a, b) =>
    String(a.start_time).localeCompare(String(b.start_time))
  )
  const byDate = new Map<string, any[]>()
  for (const s of sorted) {
    const d = String(s.start_time).slice(0, 10)
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(s)
  }
  const map = new Map<number, any[]>()
  let pos = 0
  for (const [, daySessions] of byDate) {
    pos++
    map.set(pos, daySessions)
  }
  return map
}

function formatChDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`)
    return d.toLocaleDateString('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return String(iso)
  }
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)

  const registrationId = body?.registrationId as string
  const acknowledgeOrderWarning = body?.acknowledgeOrderWarning === true
  const notifyCustomer = body?.notifyCustomer === true

  // Support legacy single-change body as well as batch
  let changes: any[] = Array.isArray(body?.changes) ? body.changes : []
  if (changes.length === 0 && body?.sessionPosition) {
    changes = [{
      sessionPosition: body.sessionPosition,
      targetCourseId: body.targetCourseId,
      targetSariSessionIds: body.targetSariSessionIds,
      targetDate: body.targetDate,
      targetStartTime: body.targetStartTime,
      targetEndTime: body.targetEndTime,
      targetCourseName: body.targetCourseName,
    }]
  }

  if (!registrationId || changes.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'registrationId und mindestens eine Änderung (changes) erforderlich',
    })
  }

  const supabase = getSupabaseAdmin()

  const { data: reg } = await supabase
    .from('course_registrations')
    .select('id, course_id, tenant_id, user_id, sari_faberid, birthdate, sari_data, custom_sessions, status, email, first_name, last_name, notes')
    .eq('id', registrationId)
    .eq('tenant_id', profile.tenant_id)
    .in('status', ['confirmed', 'enrolled', 'pending'])
    .is('deleted_at', null)
    .single()

  if (!reg) throw createError({ statusCode: 404, statusMessage: 'Anmeldung nicht gefunden' })

  const { data: course } = await supabase
    .from('courses')
    .select('id, name, category, sari_managed, sari_course_id, tenant_id, course_sessions(id, sari_session_id, start_time, end_time, session_number)')
    .eq('id', reg.course_id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden' })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, contact_email, contact_phone, sari_enabled')
    .eq('id', profile.tenant_id)
    .maybeSingle()

  // SARI Sync = tenant toggle — sari_managed alone is not enough
  const sariSyncActive = !!tenant?.sari_enabled
  const enforceSariOrderHard = sariSyncActive && !!course.sari_managed

  const positionMap = groupSessionsByPosition(course.course_sessions || [])
  const currentCustom =
    reg.custom_sessions && typeof reg.custom_sessions === 'object'
      ? { ...(reg.custom_sessions as Record<string, any>) }
      : {}

  type PreparedChange = {
    sessionPosition: number
    targetCourseId: string
    targetSariSessionIds: string[]
    targetDate: string
    targetStartTime?: string | null
    targetEndTime?: string | null
    targetCourseName?: string | null
    oldSariIds: string[]
    originalSariIds: string[]
    fromLabel: string
    toLabel: string
  }

  const prepared: PreparedChange[] = []

  for (const raw of changes) {
    const sessionPosition = Number(raw.sessionPosition)
    const targetCourseId = raw.targetCourseId as string
    const targetSariSessionIds = (raw.targetSariSessionIds || []).map(String).filter(Boolean)
    const targetDate = raw.targetDate as string

    if (!sessionPosition || !targetCourseId || !targetDate || targetSariSessionIds.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Jede Änderung braucht sessionPosition, targetCourseId, targetDate, targetSariSessionIds',
      })
    }

    const { data: targetCourse } = await supabase
      .from('courses')
      .select('id, name, category, description')
      .eq('id', targetCourseId)
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .single()

    if (!targetCourse) {
      throw createError({ statusCode: 404, statusMessage: `Ziel-Kurs nicht gefunden (Teil ${sessionPosition})` })
    }
    if (targetCourse.category !== course.category) {
      throw createError({
        statusCode: 400,
        statusMessage: `Teil ${sessionPosition}: Verschiebung nur innerhalb derselben Kategorie`,
      })
    }

    const originalAtPos = positionMap.get(sessionPosition) || []
    const existingCustom = currentCustom[String(sessionPosition)]
    const oldSariIds: string[] = existingCustom?.sariSessionIds?.length
      ? existingCustom.sariSessionIds.map(String)
      : existingCustom?.sariSessionId
        ? [String(existingCustom.sariSessionId)]
        : originalAtPos.map((s: any) => String(s.sari_session_id)).filter(Boolean)

    const originalSariIds: string[] = existingCustom?.originalSariIds?.length
      ? existingCustom.originalSariIds.map(String)
      : originalAtPos.map((s: any) => String(s.sari_session_id)).filter(Boolean)

    const fromDate = existingCustom?.date || (originalAtPos[0]?.start_time ? String(originalAtPos[0].start_time).slice(0, 10) : '')
    const fromCourseName = existingCustom?.courseName || course.name

    prepared.push({
      sessionPosition,
      targetCourseId,
      targetSariSessionIds,
      targetDate,
      targetStartTime: raw.targetStartTime || null,
      targetEndTime: raw.targetEndTime || null,
      targetCourseName: raw.targetCourseName || targetCourse.name,
      oldSariIds,
      originalSariIds,
      fromLabel: `Teil ${sessionPosition}: ${formatChDate(fromDate)} (${fromCourseName})`,
      toLabel: `Teil ${sessionPosition}: ${formatChDate(targetDate)} (${raw.targetCourseName || targetCourse.name})`,
    })
  }

  // Proposed custom_sessions after all changes
  const proposedCustom = { ...currentCustom }
  for (const ch of prepared) {
    proposedCustom[String(ch.sessionPosition)] = {
      ...(currentCustom[String(ch.sessionPosition)] || {}),
      date: ch.targetDate,
    }
  }

  const effectiveDates = buildEffectiveSessionDates(course.course_sessions || [], proposedCustom)
  const orderCheck = evaluateSessionOrder(course.category, effectiveDates)

  if (!orderCheck.ok) {
    // SARI-managed + Sync on: hard block (no admin override)
    if (enforceSariOrderHard) {
      throw createError({
        statusCode: 409,
        statusMessage: orderCheck.warnings[0] || 'Session-Reihenfolge verletzt',
        data: {
          code: 'SESSION_ORDER_BLOCKED',
          warnings: orderCheck.warnings,
          mode: orderCheck.mode,
          canOverride: false,
          sariSyncActive: true,
        },
      })
    }
    // Soft warning — continue only if acknowledged
    if (!acknowledgeOrderWarning) {
      throw createError({
        statusCode: 409,
        statusMessage: orderCheck.warnings[0] || 'Session-Reihenfolge verletzt',
        data: {
          code: 'SESSION_ORDER_WARNING',
          warnings: orderCheck.warnings,
          mode: orderCheck.mode,
          canOverride: true,
          sariSyncActive,
        },
      })
    }
  }

  // Resolve faberid / birthdate
  let faberid = (reg.sari_faberid || '').replace(/\./g, '') || null
  let birthdate = reg.birthdate || (reg.sari_data as any)?.birthdate || null
  if ((!faberid || !birthdate) && reg.user_id) {
    const { data: userRow } = await supabase
      .from('users')
      .select('faberid, birthdate')
      .eq('id', reg.user_id)
      .maybeSingle()
    if (!faberid && userRow?.faberid) faberid = String(userRow.faberid).replace(/\./g, '')
    if (!birthdate && userRow?.birthdate) birthdate = userRow.birthdate
  }

  let sariSynced = false
  let sariWarning: string | undefined
  let sariTestPassed = false

  if (course.sari_managed && sariSyncActive && faberid) {
    const credentials = await getSARICredentialsSecure(profile.tenant_id, 'ADMIN_TRANSFER_SESSION')
    if (!credentials) {
      sariWarning = 'Keine SARI-Zugangsdaten — nur lokal gespeichert'
    } else {
      const sari = new SARIClient(credentials)
      const allNewIds = [...new Set(prepared.flatMap((c) => c.targetSariSessionIds))]

      // ── SARI enrollment TEST before mutating ────────────────────────────
      try {
        logger.info(`🔍 SARI validateAllSessions for session transfer (${allNewIds.length} ids)`)
        const validation = await sari.validateAllSessions(allNewIds, faberid, birthdate || '')
        if (!validation.canEnroll) {
          throw createError({
            statusCode: 409,
            statusMessage: validation.reason || 'SARI-Test fehlgeschlagen — Verschiebung nicht möglich',
            data: { code: 'SARI_VALIDATION_FAILED', reason: validation.reason },
          })
        }
        sariTestPassed = true
      } catch (err: any) {
        if (err?.statusCode) throw err
        throw createError({
          statusCode: 502,
          statusMessage: `SARI-Test fehlgeschlagen: ${err?.message || 'unbekannt'}`,
        })
      }

      // ── Apply SARI changes ──────────────────────────────────────────────
      try {
        for (const ch of prepared) {
          for (const sid of ch.oldSariIds) {
            if (ch.targetSariSessionIds.includes(sid)) continue // unchanged id
            try {
              await sari.unenrollStudent(parseInt(sid, 10), faberid)
            } catch (err: any) {
              const msg = err?.message || ''
              if (msg.includes('NOT_FOUND') || msg.includes('NOT_ENROLLED') || msg.includes('PERSON_NOT_FOUND')) continue
              logger.warn(`⚠️ SARI unenroll ${sid}:`, msg)
            }
          }
          for (const sid of ch.targetSariSessionIds) {
            if (ch.oldSariIds.includes(sid)) continue
            await sari.enrollStudent(parseInt(sid, 10), faberid, birthdate || '')
          }
        }
        sariSynced = true
      } catch (err: any) {
        logger.error('❌ SARI apply after successful test failed:', err?.message)
        throw createError({
          statusCode: 502,
          statusMessage: `SARI-Anmeldung fehlgeschlagen (Test war ok): ${err?.message || 'unbekannt'}`,
        })
      }
    }
  } else if (course.sari_managed && sariSyncActive && !faberid) {
    sariWarning = 'Keine Faber-ID — nur lokal gespeichert (kein SARI-Test)'
  } else if (course.sari_managed && !sariSyncActive) {
    sariWarning = 'SARI Sync deaktiviert — nur lokal gespeichert'
  }

  const now = new Date().toISOString()
  for (const ch of prepared) {
    currentCustom[String(ch.sessionPosition)] = {
      ...(currentCustom[String(ch.sessionPosition)] || {}),
      date: ch.targetDate,
      startTime: ch.targetStartTime || `${ch.targetDate}T08:00:00`,
      endTime: ch.targetEndTime || null,
      courseId: ch.targetCourseId,
      courseName: ch.targetCourseName,
      sariSessionIds: ch.targetSariSessionIds,
      originalSariIds: ch.originalSariIds,
      swappedAt: now,
      swappedBy: profile.id,
      orderWarningAcknowledged: acknowledgeOrderWarning || undefined,
      orderWarnings: orderCheck.warnings.length ? orderCheck.warnings : undefined,
    }
  }

  const noteLines = prepared.map((c) => `${c.fromLabel} → ${c.toLabel}`)
  const { error: updateErr } = await supabase
    .from('course_registrations')
    .update({
      custom_sessions: currentCustom,
      updated_at: now,
      notes: [reg.notes, ...noteLines].filter(Boolean).join(' | '),
    })
    .eq('id', reg.id)

  if (updateErr) {
    throw createError({
      statusCode: 500,
      statusMessage: `Speichern fehlgeschlagen: ${updateErr.message}`,
    })
  }

  let emailSent = false
  if (notifyCustomer && reg.email) {
    try {
      const customerName = `${reg.first_name || ''} ${reg.last_name || ''}`.trim() || 'Kursteilnehmer'
      const rows = prepared
        .map(
          (c) =>
            `<tr>
              <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">Teil ${c.sessionPosition}</td>
              <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#9ca3af;text-decoration:line-through">${c.fromLabel.replace(`Teil ${c.sessionPosition}: `, '')}</td>
              <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#059669;font-weight:600">${c.toLabel.replace(`Teil ${c.sessionPosition}: `, '')}</td>
            </tr>`
        )
        .join('')

      const html = `<!DOCTYPE html><html lang="de"><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">
          <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 32px">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Terminänderung Kurs</h1>
          </div>
          <div style="padding:32px">
            <p style="color:#374151;font-size:15px;margin:0 0 20px">Hallo ${customerName},<br><br>
            bei deiner Anmeldung für <strong>${course.name}</strong> wurden folgende Kursteile verschoben:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0 24px">
              <tr>
                <th style="text-align:left;font-size:11px;color:#9ca3af;padding-bottom:8px">Teil</th>
                <th style="text-align:left;font-size:11px;color:#9ca3af;padding-bottom:8px">Bisher</th>
                <th style="text-align:left;font-size:11px;color:#9ca3af;padding-bottom:8px">Neu</th>
              </tr>
              ${rows}
            </table>
            <p style="color:#6b7280;font-size:13px;margin:0">Die Zahlung bleibt unverändert. Bei Fragen melde dich gerne bei uns.</p>
            ${tenant?.contact_email || tenant?.contact_phone ? `<p style="color:#6b7280;font-size:13px;margin:16px 0 0">${tenant.contact_email || ''}${tenant.contact_email && tenant.contact_phone ? ' · ' : ''}${tenant.contact_phone || ''}</p>` : ''}
          </div>
          <div style="border-top:1px solid #f3f4f6;padding:16px 32px;font-size:12px;color:#9ca3af;text-align:center">${tenant?.name || 'Fahrschule'}</div>
        </div>
      </body></html>`

      await sendTenantEmail(profile.tenant_id, {
        to: reg.email,
        subject: `Terminänderung – ${course.name}`,
        html,
      })
      emailSent = true
    } catch (mailErr: any) {
      logger.warn('⚠️ Session transfer email failed:', mailErr?.message)
      sariWarning = [sariWarning, 'E-Mail an Kunden fehlgeschlagen'].filter(Boolean).join(' · ')
    }
  }

  return {
    success: true,
    registrationId: reg.id,
    changedPositions: prepared.map((c) => c.sessionPosition),
    sariTestPassed,
    sariSynced,
    emailSent,
    warning: sariWarning,
    orderWarnings: orderCheck.warnings,
    orderOverride: !enforceSariOrderHard && acknowledgeOrderWarning && !orderCheck.ok,
    sariSyncActive,
    customSessions: currentCustom,
  }
})
