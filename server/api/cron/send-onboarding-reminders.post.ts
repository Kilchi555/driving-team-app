// server/api/cron/send-onboarding-reminders.post.ts
// ============================================================
// Queues onboarding reminder SMS for pending students.
//
// Schedule: daily (e.g. 09:00 Zurich time)
// Reminders sent at day 3, 7, and 14 after student creation.
//
// Only applies to students created on or after CUTOFF_DATE —
// existing pending students before this date are excluded.
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

// Only send reminders to students onboarded on or after this date
const CUTOFF_DATE = '2026-03-27T00:00:00.000Z'

// Reminder schedule: days after creation
const REMINDER_DAYS = [3, 7, 14]

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  // ── Security: verify CRON_SECRET ────────────────────────────
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-onboarding-reminders')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()

  logger.debug('📅 send-onboarding-reminders: starting run at', now.toISOString())

  // ── 1. Load all pending students created after CUTOFF_DATE ──
  const { data: students, error: studentsError } = await supabase
    .from('users')
    .select('id, first_name, phone, created_at, onboarding_token, onboarding_token_expires, tenant_id')
    .eq('role', 'client')
    .is('auth_user_id', null)          // pending only
    .not('onboarding_token', 'is', null) // must have a token
    .gte('created_at', CUTOFF_DATE)
    .eq('is_active', true)

  if (studentsError) {
    logger.error('❌ Failed to fetch pending students:', studentsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch pending students' })
  }

  if (!students || students.length === 0) {
    logger.debug('ℹ️ No pending students found after cutoff date')
    return { success: true, queued: 0, skipped: 0, message: 'No eligible students' }
  }

  logger.debug(`📋 Found ${students.length} eligible pending student(s)`)

  // ── 2. Load tenant data in one query ────────────────────────
  const tenantIds = [...new Set(students.map(s => s.tenant_id))]
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, twilio_from_sender')
    .in('id', tenantIds)

  const tenantMap = new Map((tenants || []).map(t => [t.id, t]))

  // ── 3. Check which reminders are already queued ──────────────
  // Fetch all existing onboarding_reminder entries for these students
  const studentIds = students.map(s => s.id)
  const { data: existingQueue } = await supabase
    .from('outbound_messages_queue')
    .select('context_data')
    .eq('context_data->>stage' as any, 'onboarding_reminder')
    .in('context_data->>student_id' as any, studentIds)
    .in('status', ['pending', 'sending', 'sent'])

  // Build a set of "studentId:reminderDay" already queued
  const alreadyQueued = new Set<string>()
  ;(existingQueue || []).forEach((row: any) => {
    const ctx = row.context_data
    if (ctx?.student_id && ctx?.reminder_day) {
      alreadyQueued.add(`${ctx.student_id}:${ctx.reminder_day}`)
    }
  })

  // ── 4. Determine which reminders to queue today ──────────────
  const toInsert: any[] = []

  for (const student of students) {
    // Skip students without a phone number
    if (!student.phone) continue

    // Skip students whose token has already expired
    if (student.onboarding_token_expires) {
      const expires = new Date(student.onboarding_token_expires)
      if (expires < now) continue
    }

    const createdAt = new Date(student.created_at)
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

    const tenant = tenantMap.get(student.tenant_id)
    const tenantName = tenant?.name || 'Ihre Fahrschule'
    const tenantSlug = tenant?.slug || ''
    const loginLink = tenantSlug ? `https://simy.ch/${tenantSlug}` : 'https://simy.ch/login'
    const baseUrl = process.env.NUXT_PUBLIC_APP_URL || process.env.NUXT_PUBLIC_BASE_URL || 'https://simy.ch'
    const onboardingUrl = `${baseUrl}/onboarding/${student.onboarding_token}`

    for (const reminderDay of REMINDER_DAYS) {
      // Window: [reminderDay, reminderDay + 1) — exactly one day window per reminder
      if (daysSinceCreation < reminderDay || daysSinceCreation >= reminderDay + 1) continue

      const key = `${student.id}:${reminderDay}`
      if (alreadyQueued.has(key)) {
        logger.debug(`⏭️ Reminder day ${reminderDay} already queued for student ${student.id}`)
        continue
      }

      const reminderNumber = REMINDER_DAYS.indexOf(reminderDay) + 1
      const smsBody = reminderNumber === 1
        ? `Hallo ${student.first_name}, bitte vervollständige deine Registrierung bei ${tenantName}:\n\n${onboardingUrl}\n\nNach der Registrierung: ${loginLink}`
        : reminderNumber === 2
          ? `Hallo ${student.first_name}, du hast deine Registrierung bei ${tenantName} noch nicht abgeschlossen. Bitte registriere dich noch heute:\n\n${onboardingUrl}`
          : `Hallo ${student.first_name}, letzte Erinnerung: dein Registrierungslink für ${tenantName} läuft bald ab:\n\n${onboardingUrl}`

      toInsert.push({
        tenant_id: student.tenant_id,
        channel: 'sms',
        recipient_phone: student.phone,
        body: smsBody,
        status: 'pending',
        send_at: now.toISOString(),
        context_data: {
          stage: 'onboarding_reminder',
          student_id: student.id,
          reminder_day: reminderDay,
          reminder_number: reminderNumber,
          tenant_name: tenant?.twilio_from_sender || tenantName
        }
      })
    }
  }

  if (toInsert.length === 0) {
    logger.debug('ℹ️ No new reminders to queue today')
    return {
      success: true,
      queued: 0,
      skipped: students.length,
      duration_ms: Date.now() - startTime,
      message: 'No reminders due today'
    }
  }

  // ── 5. Insert into queue ─────────────────────────────────────
  const { error: insertError } = await supabase
    .from('outbound_messages_queue')
    .insert(toInsert)

  if (insertError) {
    logger.error('❌ Failed to insert reminder messages into queue:', insertError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to queue reminder messages' })
  }

  logger.debug(`✅ send-onboarding-reminders: queued ${toInsert.length} SMS in ${Date.now() - startTime}ms`)

  return {
    success: true,
    queued: toInsert.length,
    skipped: students.length - toInsert.length,
    duration_ms: Date.now() - startTime,
    message: `Queued ${toInsert.length} onboarding reminder SMS`
  }
})
