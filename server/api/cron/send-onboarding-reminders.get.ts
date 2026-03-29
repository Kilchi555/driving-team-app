// server/api/cron/send-onboarding-reminders.get.ts
// ============================================================
// Queues onboarding reminder EMAILS for pending students.
//
// Schedule: daily at 08:00 UTC
// Reminders sent at day 3, 7, and 14 after creation.
//
// Strategy:
//  - Primary channel: EMAIL (free, branded)
//  - Fallback: SMS if no email on record
//
// Only applies to students created on or after CUTOFF_DATE.
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader, getQuery } from 'h3'

const REMINDER_DAYS = [3, 7, 14]

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-onboarding-reminders')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()

  const query = getQuery(event)
  const testStudentId = typeof query.test_student_id === 'string' ? query.test_student_id : null
  const testReminderDay = testStudentId ? Number(query.reminder_day ?? 3) : null

  if (testStudentId) {
    logger.debug(`🧪 TEST MODE: student=${testStudentId}, reminder_day=${testReminderDay}`)
  }

  logger.debug('📅 send-onboarding-reminders: starting run at', now.toISOString())

  // ── 1. Load all pending students ────────────────────────────
  let studentsQuery = supabase
    .from('users')
    .select('id, first_name, email, phone, created_at, onboarding_token, onboarding_token_expires, tenant_id')
    .eq('role', 'client')
    .is('auth_user_id', null)
    .not('onboarding_token', 'is', null)
    .eq('is_active', true)

  if (testStudentId) {
    studentsQuery = studentsQuery.eq('id', testStudentId)
  }

  const { data: students, error: studentsError } = await studentsQuery

  if (studentsError) {
    logger.error('❌ Failed to fetch pending students:', studentsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch pending students' })
  }

  if (!students || students.length === 0) {
    logger.debug('ℹ️ No pending students found after cutoff date')
    return { success: true, queued: 0, skipped: 0, message: 'No eligible students' }
  }

  logger.debug(`📋 Found ${students.length} eligible pending student(s)`)

  // ── 2. Load tenant data ──────────────────────────────────────
  const tenantIds = [...new Set(students.map((s: any) => s.tenant_id))]
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, primary_color, logo_wide_url, logo_url, logo_square_url, twilio_from_sender')
    .in('id', tenantIds)

  const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]))

  // ── 3. Check which reminders are already queued ─────────────
  const studentIds = students.map((s: any) => s.id)
  let alreadyQueued = new Set<string>()

  if (!testStudentId) {
    const { data: existingQueue } = await supabase
      .from('outbound_messages_queue')
      .select('context_data')
      .eq('context_data->>stage' as any, 'onboarding_reminder')
      .in('context_data->>student_id' as any, studentIds)
      .in('status', ['pending', 'sending', 'sent'])

    ;(existingQueue || []).forEach((row: any) => {
      const ctx = row.context_data
      if (ctx?.student_id && ctx?.reminder_day) {
        alreadyQueued.add(`${ctx.student_id}:${ctx.reminder_day}`)
      }
    })
  }

  // ── 4. Build queue entries ───────────────────────────────────
  const toInsert: any[] = []

  for (const student of students as any[]) {
    if (student.onboarding_token_expires) {
      const expires = new Date(student.onboarding_token_expires)
      if (expires < now) continue
    }

    const createdAt = new Date(student.created_at)
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

    const tenant = tenantMap.get(student.tenant_id)
    const tenantName = tenant?.name || 'Ihre Fahrschule'
    const tenantSlug = tenant?.slug || ''
    const loginLink = tenantSlug ? `https://simy.ch/${tenantSlug}` : 'https://simy.ch'
    const onboardingUrl = `https://simy.ch/onboarding/${student.onboarding_token}`
    const primaryColor = tenant?.primary_color || '#2563eb'
    const logoUrl = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null

    for (const reminderDay of REMINDER_DAYS) {
      // In test mode: use the specified reminder_day (default 3); skip window check
      const effectiveDay = testStudentId ? testReminderDay! : reminderDay
      if (!testStudentId && (daysSinceCreation < reminderDay || daysSinceCreation >= reminderDay + 1)) continue
      if (testStudentId && reminderDay !== effectiveDay) continue

      const key = `${student.id}:${reminderDay}`
      if (alreadyQueued.has(key)) {
        logger.debug(`⏭️ Reminder day ${reminderDay} already queued for student ${student.id}`)
        continue
      }

      const reminderNumber = REMINDER_DAYS.indexOf(reminderDay) + 1
      const contextData = {
        stage: 'onboarding_reminder',
        student_id: student.id,
        reminder_day: reminderDay,
        reminder_number: reminderNumber,
        tenant_name: tenant?.twilio_from_sender || tenantName,
      }

      if (student.email) {
        // ── EMAIL (primary) ──────────────────────────────────
        const subject = reminderNumber === 1
          ? `Deine Registrierung bei ${tenantName} wartet auf dich`
          : reminderNumber === 2
            ? `Noch nicht registriert? Dein Link ist noch aktiv`
            : `Letzte Erinnerung: Dein Registrierungslink läuft bald ab`

        const bodyText = reminderNumber === 1
          ? `Hallo ${student.first_name},<br><br>du hast dich für die <strong>${tenantName}</strong> interessiert — aber deine Registrierung ist noch nicht abgeschlossen.<br><br>Klicke auf den Button um fortzufahren:`
          : reminderNumber === 2
            ? `Hallo ${student.first_name},<br><br>dein Registrierungslink ist noch aktiv. Schliesse deine Anmeldung jetzt ab — es dauert nur 2 Minuten:`
            : `Hallo ${student.first_name},<br><br>das ist deine letzte Erinnerung. Dein persönlicher Registrierungslink läuft bald ab:`

        const logoHtml = logoUrl
          ? `<div style="margin-bottom:20px;text-align:center"><img src="${logoUrl}" alt="${tenantName}" style="height:40px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
          : `<div style="margin-bottom:20px;text-align:center"><div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:${primaryColor};color:white;font-size:20px;font-weight:700;line-height:40px;text-align:center;margin:0 auto">${tenantName.charAt(0).toUpperCase()}</div></div>`

        const emailBody = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">
        <tr><td>${logoHtml}</td></tr>
        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)">
          <div style="background:${primaryColor};padding:28px 32px;text-align:center">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff">Registrierung abschliessen</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${tenantName}</p>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">${bodyText}</p>
            <div style="text-align:center;margin:24px 0">
              <a href="${onboardingUrl}" style="display:inline-block;padding:14px 32px;background:${primaryColor};color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                Jetzt registrieren →
              </a>
            </div>
            <p style="margin:24px 0 0;font-size:13px;color:#9ca3af">
              Nach der Registrierung kannst du dich unter <a href="${loginLink}" style="color:${primaryColor}">${loginLink}</a> anmelden.<br>
              Der Link ist noch ${30 - (reminderDay - 1)} Tage gültig.
            </p>
          </div>
          <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af">${tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

        toInsert.push({
          tenant_id:       student.tenant_id,
          channel:         'email',
          recipient_email: student.email,
          subject,
          body:            emailBody,
          status:          'pending',
          send_at:         now.toISOString(),
          context_data:    contextData,
        })
      } else if (student.phone) {
        // ── SMS fallback (no email) ──────────────────────────
        const smsBody = reminderNumber === 1
          ? `Hallo ${student.first_name}, bitte vervollständige deine Registrierung bei ${tenantName}:\n\n${onboardingUrl}\n\nNach der Registrierung: ${loginLink}`
          : reminderNumber === 2
            ? `Hallo ${student.first_name}, du hast deine Registrierung bei ${tenantName} noch nicht abgeschlossen:\n\n${onboardingUrl}`
            : `Hallo ${student.first_name}, letzte Erinnerung – dein Link läuft bald ab:\n\n${onboardingUrl}`

        toInsert.push({
          tenant_id:       student.tenant_id,
          channel:         'sms',
          recipient_phone: student.phone,
          body:            smsBody,
          status:          'pending',
          send_at:         now.toISOString(),
          context_data:    contextData,
        })
      }
    }
  }

  if (toInsert.length === 0) {
    logger.debug('ℹ️ No new reminders to queue today')
    return { success: true, queued: 0, skipped: students.length, duration_ms: Date.now() - startTime, message: 'No reminders due today' }
  }

  // ── 5. Insert into queue ─────────────────────────────────────
  const { error: insertError } = await supabase
    .from('outbound_messages_queue')
    .insert(toInsert)

  if (insertError) {
    logger.error('❌ Failed to insert reminder messages into queue:', insertError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to queue reminder messages' })
  }

  const emailCount = toInsert.filter((m: any) => m.channel === 'email').length
  const smsCount   = toInsert.filter((m: any) => m.channel === 'sms').length

  logger.debug(`✅ send-onboarding-reminders: queued ${emailCount} emails + ${smsCount} SMS in ${Date.now() - startTime}ms`)

  return {
    success:      true,
    queued:       toInsert.length,
    email_count:  emailCount,
    sms_count:    smsCount,
    skipped:      students.length - toInsert.length,
    duration_ms:  Date.now() - startTime,
  }
})
