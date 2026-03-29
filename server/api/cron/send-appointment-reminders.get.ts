// server/api/cron/send-appointment-reminders.post.ts
// ============================================================
// Queues appointment reminder emails for next-day appointments.
//
// Schedule: daily at 03:00 UTC (05:00 Zürich summer / 04:00 winter)
// Window:   appointments starting between NOW()+24h and NOW()+48h
//
// Email includes:
//  - Date, time, duration
//  - Instructor name
//  - Driving category + event type
//  - Meeting point (location or custom)
//  - Payment section (only if payment is pending)
//  - Tenant branding (logo, primary color)
//
// Dedup: checks outbound_messages_queue for existing entry
//        with same appointment_id + stage 'appointment_reminder'
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

const EVENT_TYPE_LABELS: Record<string, string> = {
  lesson:  'Fahrstunde',
  exam:    'Prüfung',
  theory:  'Theorie',
  other:   'Termin',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wallee:  'Online-Zahlung',
  cash:    'Barzahlung',
  invoice: 'Rechnung',
  twint:   'TWINT',
  free:    'Kostenlos',
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  // ── Auth ────────────────────────────────────────────────────
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-appointment-reminders')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()

  // Optional: test mode — pass ?test_appointment_id=<uuid> to force-queue a specific appointment
  const query = getQuery(event)
  const testAppointmentId = typeof query.test_appointment_id === 'string' ? query.test_appointment_id : null

  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000) // +24h
  const windowEnd   = new Date(now.getTime() + 48 * 60 * 60 * 1000) // +48h

  if (testAppointmentId) {
    logger.debug(`🧪 TEST MODE: forcing appointment ${testAppointmentId}`)
  } else {
    logger.debug('📅 send-appointment-reminders: window', windowStart.toISOString(), '→', windowEnd.toISOString())
  }

  // ── 1. Load appointments in window (or specific test appointment) ─
  let aptQuery = supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      duration_minutes,
      type,
      event_type_code,
      title,
      location_id,
      custom_location_name,
      custom_location_address,
      tenant_id,
      user:users!appointments_user_id_fkey (
        id,
        email,
        first_name
      ),
      staff:users!appointments_staff_id_fkey (
        first_name,
        last_name
      )
    `)
    .not('user_id', 'is', null)

  if (testAppointmentId) {
    aptQuery = aptQuery.eq('id', testAppointmentId)
  } else {
    aptQuery = aptQuery
      .gte('start_time', windowStart.toISOString())
      .lt('start_time', windowEnd.toISOString())
      .neq('status', 'cancelled')
  }

  const { data: appointments, error: aptsError } = await aptQuery

  if (aptsError) {
    logger.error('❌ Failed to fetch appointments:', aptsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch appointments' })
  }

  if (!appointments || appointments.length === 0) {
    logger.debug('ℹ️ No appointments in window')
    return { success: true, queued: 0, skipped: 0, duration_ms: Date.now() - startTime }
  }

  logger.debug(`📋 Found ${appointments.length} appointment(s) in window`)
  const tenantIds = [...new Set(appointments.map((a: any) => a.tenant_id))]

  // ── 2a. Load locations separately (no direct FK join available) ──
  const locationIds = [...new Set((appointments as any[]).map((a: any) => a.location_id).filter(Boolean))]
  let locationMap = new Map<string, { name: string; address: string; city: string }>()
  if (locationIds.length > 0) {
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name, address, city')
      .in('id', locationIds)
    locationMap = new Map((locations || []).map((l: any) => [l.id, l]))
  }

  // ── 2b. Load payments separately (FK: payments.appointment_id → appointments.id) ──
  const { data: payments } = await supabase
    .from('payments')
    .select('id, appointment_id, payment_status, payment_method, total_amount_rappen')
    .in('appointment_id', (appointments as any[]).map((a: any) => a.id))

  // Map: appointment_id → first payment (any status)
  const paymentMap = new Map<string, any>()
  for (const p of (payments || []) as any[]) {
    if (!paymentMap.has(p.appointment_id)) {
      paymentMap.set(p.appointment_id, p)
    }
  }
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, primary_color, logo_wide_url, logo_url, logo_square_url')
    .in('id', tenantIds)

  const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]))

  // ── 3. Check which appointments already have a queued reminder
  // Use a broader time window (past 48h) to catch any already-queued entries
  const { data: existingQueue } = await supabase
    .from('outbound_messages_queue')
    .select('context_data')
    .eq('context_data->>stage' as any, 'appointment_reminder')
    .in('status', ['pending', 'sending', 'sent'])
    .gte('created_at', new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString())

  // In test mode we always queue regardless of dedup
  const alreadyQueued = testAppointmentId
    ? new Set<string>()
    : new Set(
        (existingQueue || []).map((r: any) => r.context_data?.appointment_id).filter(Boolean)
      )

  // ── 4. Build queue entries ─────────────────────────────────
  const toInsert: any[] = []
  let skipped = 0

  for (const apt of appointments as any[]) {
    const user = apt.user
    if (!user?.email) { skipped++; continue }

    if (alreadyQueued.has(apt.id)) {
      logger.debug(`⏭️ Reminder already queued for appointment ${apt.id}`)
      skipped++
      continue
    }

    const tenant = tenantMap.get(apt.tenant_id)
    const tenantName  = tenant?.name || 'Ihre Fahrschule'
    const primaryColor = tenant?.primary_color || '#2563eb'
    // Use only HTTPS logo URLs — never base64 data URIs (blocked by most email clients)
    const rawLogoUrl = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
    const logoUrl = rawLogoUrl && rawLogoUrl.startsWith('https://') ? rawLogoUrl : null

    // Date/time formatting
    const aptDate = new Date(apt.start_time)
    const dateStr = aptDate.toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich' })
    const timeStr = aptDate.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
    const durationStr = apt.duration_minutes ? `${apt.duration_minutes} Min.` : ''
    const eventLabel  = EVENT_TYPE_LABELS[apt.event_type_code || 'lesson']
    const categoryStr = apt.type || ''
    const staffName   = apt.staff ? `${apt.staff.first_name} ${apt.staff.last_name}` : null

    // Meeting point
    let meetingPoint = ''
    const loc = apt.location_id ? locationMap.get(apt.location_id) : null
    if (loc?.name) {
      meetingPoint = loc.name
      if (loc.address) meetingPoint += `, ${loc.address}`
      if (loc.city)    meetingPoint += ` ${loc.city}`
    } else if (apt.custom_location_name) {
      meetingPoint = apt.custom_location_name
      if (apt.custom_location_address) meetingPoint += `, ${apt.custom_location_address}`
    }

    // Payment section — always shown if a payment exists
    const payment = paymentMap.get(apt.id) || null
    const paymentHtml = payment ? buildPaymentSection(payment, primaryColor) : ''

    const html = buildEmailHtml({
      firstName:    user.first_name || 'Hallo',
      dateStr,
      timeStr,
      durationStr,
      eventLabel,
      categoryStr,
      staffName,
      meetingPoint,
      tenantName,
      primaryColor,
      logoUrl,
      paymentHtml,
    })

    toInsert.push({
      tenant_id:       apt.tenant_id,
      channel:         'email',
      recipient_email: user.email,
      subject:         `Erinnerung: ${eventLabel} am ${dateStr} um ${timeStr} Uhr`,
      body:            html,
      status:          'pending',
      send_at:         now.toISOString(),
      context_data: {
        stage:          'appointment_reminder',
        appointment_id: apt.id,
        user_id:        user.id,
        tenant_name:    tenantName,
      }
    })
  }

  if (toInsert.length === 0) {
    logger.debug('ℹ️ No new reminders to queue')
    return { success: true, queued: 0, skipped, duration_ms: Date.now() - startTime }
  }

  // ── 5. Insert into queue ───────────────────────────────────
  const { error: insertError } = await supabase
    .from('outbound_messages_queue')
    .insert(toInsert)

  if (insertError) {
    logger.error('❌ Failed to insert reminders:', insertError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to queue reminders' })
  }

  logger.debug(`✅ send-appointment-reminders: queued ${toInsert.length} in ${Date.now() - startTime}ms`)

  return {
    success: true,
    queued: toInsert.length,
    skipped,
    duration_ms: Date.now() - startTime,
  }
})

// ── Email builders ─────────────────────────────────────────────

function buildPaymentSection(payment: any, primaryColor: string): string {
  const amountCHF = (payment.total_amount_rappen / 100).toFixed(2)
  const methodLabel = PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method
  const loginLink = process.env.NUXT_PUBLIC_APP_URL || 'https://simy.ch'

  const isPending = ['pending', 'failed'].includes(payment.payment_status)
  const isPaid    = ['completed', 'paid'].includes(payment.payment_status)

  const statusConfig = isPaid
    ? { bg: '#f0fdf4', border: '#86efac', labelColor: '#166534', dot: '#22c55e', text: 'Bezahlt ✓' }
    : isPending
      ? { bg: '#fffbeb', border: '#fde68a', labelColor: '#92400e', dot: '#f59e0b', text: 'Ausstehend' }
      : { bg: '#fef2f2', border: '#fca5a5', labelColor: '#991b1b', dot: '#ef4444', text: 'Fehlgeschlagen' }

  const actionHtml = isPending && payment.payment_method === 'wallee'
    ? `<div style="margin-top:12px"><a href="${loginLink}/dashboard" style="display:inline-block;padding:10px 24px;background:${primaryColor};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Jetzt online zahlen →</a></div>`
    : isPending && payment.payment_method === 'cash'
      ? `<p style="margin:8px 0 0;font-size:13px;color:#92400e">Bitte bringen Sie den Betrag in bar mit.</p>`
      : isPending && payment.payment_method === 'invoice'
        ? `<p style="margin:8px 0 0;font-size:13px;color:#1e40af">Die Rechnung wird Ihnen zugestellt.</p>`
        : ''

  return `
    <div style="margin:24px 0;padding:16px 20px;background:${statusConfig.bg};border:1px solid ${statusConfig.border};border-radius:10px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusConfig.dot}"></span>
        <span style="font-size:12px;font-weight:600;color:${statusConfig.labelColor};text-transform:uppercase;letter-spacing:.05em">Zahlung · ${statusConfig.text}</span>
      </div>
      <p style="margin:0;font-size:22px;font-weight:700;color:#111827">CHF ${amountCHF}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Zahlungsart: ${methodLabel}</p>
      ${actionHtml}
    </div>`
}

interface EmailData {
  firstName: string
  dateStr: string
  timeStr: string
  durationStr: string
  eventLabel: string
  categoryStr: string
  staffName: string | null
  meetingPoint: string
  tenantName: string
  primaryColor: string
  logoUrl: string | null
  paymentHtml: string
}

function buildEmailHtml(d: EmailData): string {
  const logoHtml = d.logoUrl
    ? `<div style="text-align:center;margin-bottom:20px"><img src="${d.logoUrl}" alt="${d.tenantName}" style="height:40px;max-width:200px;object-fit:contain;display:inline-block"></div>`
    : `<div style="text-align:center;margin-bottom:20px"><div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:${d.primaryColor};color:#fff;font-size:20px;font-weight:700;line-height:40px;text-align:center">${d.tenantName.charAt(0).toUpperCase()}</div></div>`

  const rows = [
    ['Datum',      d.dateStr],
    ['Zeit',       `${d.timeStr} Uhr${d.durationStr ? ` (${d.durationStr})` : ''}`],
    ['Art',        [d.eventLabel, d.categoryStr].filter(Boolean).join(' · ')],
    d.staffName   ? ['Fahrlehrer',  d.staffName]   : null,
    d.meetingPoint ? ['Treffpunkt', d.meetingPoint] : null,
  ].filter(Boolean) as [string, string][]

  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px 8px 0;font-size:13px;color:#6b7280;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:500">${value}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">

        <!-- Logo above card -->
        <tr><td>${logoHtml}</td></tr>

        <!-- Card -->
        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)">

          <!-- Colored header -->
          <div style="background:${d.primaryColor};padding:28px 32px;text-align:center">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff">Erinnerung an Ihren Termin</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${d.tenantName}</p>
          </div>

          <!-- Body -->
          <div style="padding:28px 32px">
            <p style="margin:0 0 20px;font-size:15px;color:#374151">Hallo ${d.firstName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151">
              wir möchten Sie an Ihren bevorstehenden Termin erinnern:
            </p>

            <!-- Details table -->
            <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin-bottom:8px">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>

            ${d.paymentHtml}

            <p style="margin:24px 0 0;font-size:13px;color:#9ca3af">
              Bei Fragen wenden Sie sich bitte an ${d.tenantName}. Bitte antworten Sie nicht auf diese automatische E-Mail.
            </p>
          </div>

          <!-- Footer -->
          <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af">${d.tenantName} · Powered by Simy</p>
          </div>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
