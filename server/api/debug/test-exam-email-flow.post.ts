/**
 * DEBUG: Simulate the full exam-passed email flow for a given user.
 * Queues all 3 emails with send_at = now() and immediately triggers the queue processor.
 *
 * POST /api/debug/test-exam-email-flow
 * Body: { recipient_email: string, tenant_id?: string }
 *
 * Requires: Authorization: Bearer <CRON_SECRET>
 */

import { defineEventHandler, createError, readBody, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  // ── Auth ────────────────────────────────────────────────────
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const recipientEmail: string = body?.recipient_email
  const tenantId: string       = body?.tenant_id || '64259d68-195a-4c68-8875-f1b44d962830'

  if (!recipientEmail) {
    throw createError({ statusCode: 400, statusMessage: 'recipient_email is required' })
  }

  const supabase = getSupabaseAdmin()

  // ── Load tenant data ────────────────────────────────────────
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('name, slug, primary_color, logo_wide_url, logo_url, google_review_places')
    .eq('id', tenantId)
    .single()

  if (tenantErr || !tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const reviewPlaces: Array<{ name: string; place_id: string }> =
    Array.isArray((tenant as any).google_review_places) ? (tenant as any).google_review_places : []

  const primaryColor = (tenant as any).primary_color || '#2563eb'
  const tenantName   = (tenant as any).name || 'Driving Team'
  const tenantSlug   = (tenant as any).slug || ''
  const affiliateUrl = tenantSlug
    ? `https://simy.ch/affiliate-dashboard?tenant=${tenantSlug}`
    : 'https://simy.ch/affiliate-dashboard'
  const customerUrl  = tenantSlug ? `https://www.simy.ch/${tenantSlug}` : 'https://www.simy.ch/login'
  const firstName    = 'Test-User'
  const logoHtml     = (tenant as any).logo_wide_url || (tenant as any).logo_url
    ? `<img src="${(tenant as any).logo_wide_url || (tenant as any).logo_url}" alt="${tenantName}" style="height:40px;max-width:180px;object-fit:contain;display:block;margin:0 auto 24px">`
    : `<div style="display:inline-block;width:44px;height:44px;border-radius:10px;background:${primaryColor};color:white;font-size:22px;font-weight:700;line-height:44px;text-align:center;margin:0 auto 24px">${tenantName.charAt(0).toUpperCase()}</div>`

  // ── Mail 1: Immediate congratulations ───────────────────────
  const reviewSection = reviewPlaces.length > 0 ? `
    <div style="margin:28px 0">
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;text-align:center">
        Wir würden uns sehr freuen, wenn du dir kurz Zeit nimmst und uns eine Google-Bewertung hinterlässt –<br>das hilft anderen Fahrschüler:innen, uns zu finden. 🙏
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${reviewPlaces.map(p => `<tr><td style="padding:5px 0;text-align:center">
          <a href="https://search.google.com/local/writereview?placeid=${p.place_id}"
             style="display:inline-block;background:${primaryColor};color:#ffffff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;min-width:200px;text-align:center">
            ⭐ Bewertung schreiben – ${p.name}
          </a>
        </td></tr>`).join('\n')}
      </table>
      <p style="margin:14px 0 0;font-size:12px;color:#9ca3af;text-align:center">Dauert nur 1 Minute – wir sind dankbar für jedes Feedback!</p>
    </div>` : `<p style="margin:0 0 16px;font-size:15px;color:#374151">Herzlichen Glückwunsch – wir freuen uns mit dir!</p>`

  const mail1Html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td style="text-align:center;padding-bottom:8px">${logoHtml}</td></tr>
      <tr><td style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
        <div style="background:${primaryColor};padding:32px 32px 24px;text-align:center">
          <div style="font-size:48px;margin-bottom:8px">🏆</div>
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff">Herzlichen Glückwunsch!</h1>
          <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${tenantName}</p>
        </div>
        <div style="padding:28px 32px">
          <p style="margin:0 0 20px;font-size:16px;color:#374151">Hallo ${firstName},</p>
          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
            du hast deine Führerprüfung <strong style="color:${primaryColor}">bestanden</strong>! 🎉<br>
            Wir von ${tenantName} gratulieren dir ganz herzlich – du hast es verdient!
          </p>
          ${reviewSection}
        </div>
        <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af">${tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af">Simy.ch</a></p>
        </div>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`

  await sendEmail({
    to: recipientEmail,
    subject: `🏆 [TEST] Herzlichen Glückwunsch – Prüfung bestanden!`,
    html: mail1Html,
    senderName: tenantName,
  })
  logger.debug('✅ Test Mail 1 sent to:', recipientEmail)

  // ── Mail 2 + 3: Queue with send_at = now() ──────────────────
  const followUpReviewSection = reviewPlaces.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${reviewPlaces.map(p => `<tr><td style="padding:5px 0;text-align:center">
        <a href="https://search.google.com/local/writereview?placeid=${p.place_id}"
           style="display:inline-block;background:${primaryColor};color:#ffffff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;min-width:200px;text-align:center">
          ⭐ Jetzt Bewertung schreiben – ${p.name}
        </a>
      </td></tr>`).join('\n')}
    </table>` : ''

  const mail2Html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td style="text-align:center;padding-bottom:8px">${logoHtml}</td></tr>
      <tr><td style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
        <div style="background:${primaryColor};padding:28px 32px 20px;text-align:center">
          <div style="font-size:40px;margin-bottom:8px">⭐</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff">Wie war deine Erfahrung?</h1>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85)">${tenantName}</p>
        </div>
        <div style="padding:28px 32px">
          <p style="margin:0 0 16px;font-size:15px;color:#374151">Hallo ${firstName},</p>
          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
            vor einer Woche hast du deine Prüfung bestanden – herzlichen Glückwunsch nochmal! 🎉
          </p>
          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
            Wenn du zufrieden warst und uns weiterempfehlen möchtest, würden wir uns über eine kurze Google-Bewertung sehr freuen. Das hilft anderen, uns zu finden und gibt uns wichtiges Feedback.
          </p>
          ${followUpReviewSection}
          <div style="margin:28px 0;background:#f9fafb;border-radius:10px;padding:20px 24px">
            <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#374151">💸 Freunde empfehlen &amp; Geld verdienen</p>
            <p style="margin:0 0 14px;font-size:14px;color:#6b7280;line-height:1.6">
              Wusstest du, dass du mit unserem Empfehlungsprogramm Geld verdienen kannst? Für jede Person, die du zu uns schickst, erhältst du eine Gutschrift auf dein Konto.
            </p>
            <a href="${affiliateUrl}" style="display:inline-block;background:${primaryColor};color:#ffffff;padding:11px 24px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">
              Zum Empfehlungs-Dashboard →
            </a>
          </div>
          <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;text-align:center">Alles Gute auf deinen weiteren Fahrten! 🚗</p>
        </div>
        <div style="padding:16px 32px 24px;text-align:center;border-top:1px solid #f3f4f6">
          <p style="margin:0;font-size:12px;color:#9ca3af">${tenantName}</p>
        </div>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`

  const mail3Html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td style="text-align:center;padding-bottom:8px">${logoHtml}</td></tr>
      <tr><td style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
        <div style="background:${primaryColor};padding:28px 32px 20px;text-align:center">
          <div style="font-size:40px;margin-bottom:8px">💸</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff">Geld verdienen mit Empfehlungen</h1>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85)">${tenantName}</p>
        </div>
        <div style="padding:28px 32px">
          <p style="margin:0 0 16px;font-size:15px;color:#374151">Hallo ${firstName},</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
            du hast deinen Führerausweis jetzt seit einem Monat – herzlichen Glückwunsch nochmal! 🎉
          </p>
          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
            Hast du Freunde oder Bekannte, die noch die Fahrschule vor sich haben? Mit unserem Empfehlungsprogramm verdienst du ganz einfach Geld:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
            <tr><td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
              <p style="margin:0;font-size:14px;color:#374151;font-weight:600">① Link teilen</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Teile deinen persönlichen Link mit Freunden.</p>
            </td></tr>
            <tr><td style="height:8px"></td></tr>
            <tr><td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
              <p style="margin:0;font-size:14px;color:#374151;font-weight:600">② Freund bucht</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Sobald dein Freund eine Fahrstunde bucht, wird dein Konto gutgeschrieben.</p>
            </td></tr>
            <tr><td style="height:8px"></td></tr>
            <tr><td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
              <p style="margin:0;font-size:14px;color:#374151;font-weight:600">③ Geld auszahlen</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Du kannst dein Guthaben jederzeit per Banküberweisung auszahlen lassen.</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:5px 0;text-align:center">
              <a href="${affiliateUrl}" style="display:inline-block;background:${primaryColor};color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;min-width:220px;text-align:center">
                💸 Jetzt Geld verdienen
              </a>
            </td></tr>
            <tr><td style="padding:8px 0;text-align:center">
              <a href="${customerUrl}" style="display:inline-block;color:${primaryColor};padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
                Zum Kundenkonto →
              </a>
            </td></tr>
          </table>
        </div>
        <div style="padding:16px 32px 24px;text-align:center;border-top:1px solid #f3f4f6">
          <p style="margin:0;font-size:12px;color:#9ca3af">${tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af">Simy.ch</a></p>
        </div>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`

  const now = new Date().toISOString()

  const { error: queueError } = await supabase.from('outbound_messages_queue').insert([
    {
      tenant_id:       tenantId,
      channel:         'email',
      recipient_email: recipientEmail,
      subject:         `⭐ [TEST] Wie war deine Erfahrung? (Mail 2)`,
      body:            mail2Html,
      status:          'pending',
      send_at:         now,
      context_data:    { stage: 'exam_passed_review_followup_TEST', tenant_name: tenantName },
    },
    {
      tenant_id:       tenantId,
      channel:         'email',
      recipient_email: recipientEmail,
      subject:         `💸 [TEST] Freunde empfehlen & Geld verdienen (Mail 3)`,
      body:            mail3Html,
      status:          'pending',
      send_at:         now,
      context_data:    { stage: 'exam_passed_affiliate_promo_TEST', tenant_name: tenantName },
    },
  ])

  if (queueError) {
    logger.error('❌ Failed to queue test emails:', queueError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to queue test emails' })
  }

  // ── Trigger queue processor immediately ─────────────────────
  const baseUrl = process.env.NUXT_PUBLIC_APP_URL
    ? `https://${process.env.NUXT_PUBLIC_APP_URL}`
    : 'http://localhost:3000'

  const processorRes = await fetch(`${baseUrl}/api/cron/process-outbound-messages`, {
    method: 'GET',
    headers: { authorization: `Bearer ${cronSecret}` },
  }).catch(() => null)

  const processorResult = processorRes ? await processorRes.json().catch(() => null) : null

  logger.debug('✅ Test exam email flow complete for:', recipientEmail)

  return {
    success: true,
    mail1: 'sent directly',
    mail2_mail3: 'queued and processor triggered',
    processor: processorResult,
  }
})
