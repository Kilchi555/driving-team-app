// server/api/cron/send-proposal-followup-reminders.get.ts
// =============================================================
// Follow-up reminders for booking proposals whose outcome still
// asks for one. Queue status is independent: status = 'accepted'
// with outcome potential_customer or no_show is still due.
//
// Claim is a single conditional UPDATE before send, so two cron
// runs cannot both send the same reminder.
//
// potential_customer: one send, then follow_up_sent_at stays set.
// no_show: claim, send, then move follow_up_at forward by 24h and
// clear the claim so the next day can send again.
//
// Schedule: daily at 07:00 UTC (09:00 CH time)
// =============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { sendTenantEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { assertCronRequest } from '~/server/utils/cron-auth'
import {
  NO_SHOW_FOLLOW_UP_MS,
  createSupabaseFollowUpDb,
  deliverClaimedFollowUp,
  followUpReminderCopy,
  type FollowUpSupabase,
} from '~/server/utils/proposal-followup'

export default defineEventHandler(async (event) => {
  assertCronRequest(event)
  const startTime = Date.now()
  const now = new Date()

  const supabase = getSupabaseAdmin()
  const followUps = createSupabaseFollowUpDb(supabase as unknown as FollowUpSupabase)

  try {
    const repaired = await followUps.repairNoShowOrphans(
      now.toISOString(),
      new Date(now.getTime() + NO_SHOW_FOLLOW_UP_MS).toISOString(),
    )
    if (repaired > 0) {
      logger.debug(`🔁 Rescheduled ${repaired} stuck no_show follow-up claim(s) without sending again`)
    }
  } catch (repairError) {
    logger.error('❌ Failed to repair stuck no_show follow-up claims:', repairError)
  }

  // Due rows only. Do not filter on status — accepted + planned follow-up is valid.
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
    .lte('follow_up_at', now.toISOString())
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

  for (const p of proposals) {
    if (!p.follow_up_at || (p.outcome_type !== 'potential_customer' && p.outcome_type !== 'no_show')) {
      skipped++
      continue
    }

    const tenant = p.tenant as any
    const primaryColor = tenant?.primary_color || '#111827'
    const customerName = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unbekannt'
    const createdDate = new Date(p.created_at).toLocaleDateString('de-CH', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })

    const staff = p.staff_id ? staffEmailMap.get(p.staff_id) : null
    const recipientEmail = staff?.email || tenant?.contact_email
    const recipientName = staff ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim() : 'Admin'

    if (!recipientEmail) {
      logger.warn(`⚠️ No recipient email for proposal ${p.id} (tenant ${p.tenant_id}) — skipping`)
      skipped++
      continue
    }

    const returnPath = `/dashboard?openProposal=${p.id}`
    const appUrl = `https://app.simy.ch/login?returnTo=${encodeURIComponent(returnPath)}`
    const copy = followUpReminderCopy({
      outcomeType: p.outcome_type,
      recipientName,
      customerName,
    })
    const isNoShow = p.outcome_type === 'no_show'
    const badgeBg = isNoShow ? '#f3f4f6' : '#fffbeb'
    const badgeBorder = isNoShow ? '#d1d5db' : '#fcd34d'

    const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: ${primaryColor}; padding: 24px 32px;">
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">${tenant?.name}</h1>
      <p style="margin: 4px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">${copy.headerText}</p>
    </div>
    <div style="padding: 28px 32px;">
      <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #111827;">${copy.introTitle}</p>
      <p style="margin: 0 0 20px; font-size: 14px; color: #6b7280; line-height: 1.6;">${copy.introText}</p>
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
      <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">${copy.footerText}</p>
    </div>
  </div>
</body>
</html>`

    try {
      const result = await deliverClaimedFollowUp({
        proposal: {
          id: p.id,
          tenant_id: p.tenant_id,
          outcome_type: p.outcome_type,
          follow_up_at: p.follow_up_at,
        },
        now,
        db: followUps,
        send: async () => {
          await sendTenantEmail(p.tenant_id, { to: recipientEmail, subject: copy.subject, html })
        },
      })

      if (result === 'skipped') {
        skipped++
        continue
      }

      sent++
      if (result === 'sent_pending_reschedule') {
        logger.error(`❌ Follow-up sent for no_show proposal ${p.id} but the next day was not scheduled`)
      } else {
        logger.debug(`✅ Follow-up reminder sent to ${recipientEmail} for proposal ${p.id} (${customerName}, type: ${p.outcome_type})`)
      }
    } catch (err) {
      logger.error(`❌ Failed to send follow-up reminder for proposal ${p.id}:`, err)
      skipped++
    }
  }

  const elapsed = Date.now() - startTime
  logger.debug(`📊 send-proposal-followup-reminders done in ${elapsed}ms — sent: ${sent}, skipped: ${skipped}`)
  return { sent, skipped, elapsed }
})
