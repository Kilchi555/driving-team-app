// server/api/cron/send-proposal-followup-reminders.get.ts
// =============================================================
// Sends a follow-up reminder email to the responsible staff member
// (or tenant admin if no staff assigned) for any booking proposal
// marked as 'potential_customer' whose follow_up_at date has passed
// and whose reminder has not yet been sent (follow_up_sent_at IS NULL).
//
// Schedule: daily at 07:00 UTC (09:00 CH time)
// =============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { sendTenantEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-proposal-followup-reminders')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()

  // Fetch all proposals due for follow-up
  // - potential_customer: one-time reminder after 30 days
  // - no_show: daily reminder until a different outcome is chosen
  const { data: proposals, error } = await supabase
    .from('booking_proposals')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      category_code,
      notes,
      created_at,
      follow_up_at,
      outcome_type,
      tenant_id,
      staff_id,
      tenant:tenants!inner(id, name, slug, contact_email, primary_color)
    `)
    .in('outcome_type', ['potential_customer', 'no_show'])
    .lte('follow_up_at', new Date().toISOString())
    .is('follow_up_sent_at', null)
    .order('follow_up_at', { ascending: true })

  if (error) {
    logger.error('❌ Failed to fetch follow-up proposals:', error)
    throw createError({ statusCode: 500, statusMessage: 'DB error' })
  }

  if (!proposals || proposals.length === 0) {
    logger.debug('✅ No follow-up reminders due today')
    return { sent: 0, skipped: true }
  }

  // Load staff emails for all proposals with staff_id
  const staffIds = [...new Set(proposals.map((p: any) => p.staff_id).filter(Boolean))]
  const staffEmailMap = new Map<string, { email: string; first_name: string; last_name: string }>()
  if (staffIds.length > 0) {
    const { data: staffUsers } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .in('id', staffIds)
    for (const s of staffUsers ?? []) {
      if (s.email) staffEmailMap.set(s.id, s)
    }
  }

  let sent = 0
  let skipped = 0
  const sentPotentialIds: string[] = []   // one-time: set follow_up_sent_at
  const sentNoShowIds: string[] = []      // recurring: reschedule to tomorrow

  for (const p of proposals) {
    const tenant = p.tenant as any
    const primaryColor = tenant?.primary_color || '#111827'
    const customerName = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unbekannt'
    const createdDate = new Date(p.created_at).toLocaleDateString('de-CH', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
    const isNoShow = p.outcome_type === 'no_show'

    // Determine recipient: assigned staff first, fallback to tenant admin
    const staff = p.staff_id ? staffEmailMap.get(p.staff_id) : null
    const recipientEmail = staff?.email || tenant?.contact_email
    const recipientName = staff ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim() : 'Admin'

    if (!recipientEmail) {
      logger.warn(`⚠️ No recipient email for proposal ${p.id} (tenant ${p.tenant_id}) — skipping`)
      skipped++
      continue
    }

    // Deep link: go straight to login, then land on this exact request
    // (instead of dropping the user on the generic homepage).
    const returnPath = `/dashboard?openProposal=${p.id}`
    const appUrl = `https://app.simy.ch/login?returnTo=${encodeURIComponent(returnPath)}`

    const badgeColor = isNoShow ? '#6b7280' : '#d97706'
    const badgeBg = isNoShow ? '#f3f4f6' : '#fffbeb'
    const badgeBorder = isNoShow ? '#d1d5db' : '#fcd34d'
    const headerText = isNoShow
      ? 'Tägliche Erinnerung – Nicht erreichbar'
      : '30-Tage Follow-up Erinnerung'
    const introTitle = isNoShow
      ? `Hallo${recipientName ? ' ' + recipientName : ''}! Bitte nochmal versuchen. 📵`
      : `Hallo${recipientName ? ' ' + recipientName : ''}! Zeit für ein Follow-up. 🌱`
    const introText = isNoShow
      ? `Dieser Interessent war bisher <strong>nicht erreichbar</strong>. Simy erinnert dich täglich, bis du einen anderen Status gesetzt hast. Vielleicht klappt es heute!`
      : `Vor ca. 30 Tagen hast du eine Anfrage als <strong>«Potenzieller Kunde»</strong> markiert. Jetzt wäre ein guter Zeitpunkt, sich wieder zu melden!`
    const footerText = isNoShow
      ? `Diese tägliche Erinnerung stoppt automatisch, sobald du in Simy einen anderen Status für diese Anfrage setzt.`
      : `Diese einmalige Erinnerung wurde verschickt, weil der Interessent als «Potenzieller Kunde» markiert wurde.`
    const subject = isNoShow
      ? `Nochmal versuchen: ${customerName} war bisher nicht erreichbar`
      : `Follow-up: ${customerName} – vor 30 Tagen als potenzieller Kunde markiert`

    const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: ${primaryColor}; padding: 24px 32px;">
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">${tenant?.name}</h1>
      <p style="margin: 4px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">${headerText}</p>
    </div>
    <div style="padding: 28px 32px;">
      <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #111827;">${introTitle}</p>
      <p style="margin: 0 0 20px; font-size: 14px; color: #6b7280; line-height: 1.6;">${introText}</p>
      <div style="background: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #111827;">👤 ${customerName}</p>
        ${p.phone ? `<p style="margin: 4px 0; font-size: 13px; color: #374151;">📞 <a href="tel:${p.phone}" style="color: ${primaryColor};">${p.phone}</a></p>` : ''}
        ${p.email ? `<p style="margin: 4px 0; font-size: 13px; color: #374151;">✉️ <a href="mailto:${p.email}" style="color: ${primaryColor};">${p.email}</a></p>` : ''}
        ${p.category_code ? `<p style="margin: 8px 0 4px; font-size: 13px; color: #6b7280;">Kategorie: ${p.category_code}</p>` : ''}
        ${p.notes ? `<p style="margin: 4px 0; font-size: 13px; color: #6b7280; font-style: italic;">"${p.notes.substring(0, 200)}${p.notes.length > 200 ? '…' : ''}"</p>` : ''}
        <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">Anfrage eingegangen: ${createdDate}</p>
      </div>
      <div style="text-align: center;">
        <a href="${appUrl}" style="display: inline-block; background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
          Anfrage öffnen →
        </a>
      </div>
    </div>
    <div style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #f3f4f6;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">${footerText}</p>
    </div>
  </div>
</body>
</html>`

    try {
      await sendTenantEmail(p.tenant_id, { to: recipientEmail, subject, html })
      if (isNoShow) {
        sentNoShowIds.push(p.id)
      } else {
        sentPotentialIds.push(p.id)
      }
      sent++
      logger.debug(`✅ Follow-up reminder sent to ${recipientEmail} for proposal ${p.id} (${customerName}, type: ${p.outcome_type})`)
    } catch (err) {
      logger.error(`❌ Failed to send follow-up reminder for proposal ${p.id}:`, err)
      skipped++
    }
  }

  const now = new Date().toISOString()
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  // potential_customer: mark as sent (one-time, won't fire again)
  if (sentPotentialIds.length > 0) {
    const { error: updateError } = await supabase
      .from('booking_proposals')
      .update({ follow_up_sent_at: now })
      .in('id', sentPotentialIds)
    if (updateError) logger.error('❌ Failed to mark follow_up_sent_at on potential_customer proposals:', updateError)
  }

  // no_show: reschedule to tomorrow so the daily loop continues
  if (sentNoShowIds.length > 0) {
    const { error: updateError } = await supabase
      .from('booking_proposals')
      .update({ follow_up_at: tomorrow, follow_up_sent_at: null })
      .in('id', sentNoShowIds)
    if (updateError) logger.error('❌ Failed to reschedule no_show proposals:', updateError)
  }

  const elapsed = Date.now() - startTime
  logger.debug(`📊 send-proposal-followup-reminders done in ${elapsed}ms — sent: ${sent}, skipped: ${skipped}`)
  return { sent, skipped, elapsed }
})
