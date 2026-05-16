/**
 * Sends a real consent/unsubscribe test email to a given address.
 * Creates (or reuses) a test lead for the tenant, then emails the actual
 * opt-in and opt-out links so the full flow can be verified end-to-end.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { buildUnsubscribeLink, buildConsentLink, wrapMarketingEmail } from '~/server/utils/email-template'

export default defineEventHandler(async (event) => {
  const { tenantId, email } = await readBody(event)

  if (!tenantId || !email) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and email required' })
  }

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, primary_color')
    .eq('id', tenantId)
    .single()

  const tenantName = tenant?.name ?? 'Fahrschule'
  const primaryColor = tenant?.primary_color ?? '#1e293b'
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'

  // Upsert a test lead so we always have a valid id + token
  const { data: existing } = await supabase
    .from('leads')
    .select('id, unsubscribe_token, status')
    .eq('tenant_id', tenantId)
    .eq('email', email.toLowerCase())
    .maybeSingle()

  let leadId: string
  let token: string

  if (existing) {
    leadId = existing.id
    token = existing.unsubscribe_token
    // Reset to pending_consent so the opt-in link works again
    await supabase
      .from('leads')
      .update({ status: 'pending_consent', consent_given_at: null })
      .eq('id', leadId)
  } else {
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase(),
        categories: [],
        status: 'pending_consent',
        source: 'test',
        tags: ['test'],
      })
      .select('id, unsubscribe_token')
      .single()

    if (error || !newLead) {
      throw createError({ statusCode: 500, statusMessage: error?.message ?? 'Failed to create test lead' })
    }

    leadId = newLead.id
    token = newLead.unsubscribe_token
  }

  const consentLink = buildConsentLink(baseUrl, leadId, token)
  const unsubscribeLink = buildUnsubscribeLink(baseUrl, leadId, token)

  const content = `
    <h2>Test: Opt-in & Opt-out Flow</h2>
    <p>Dies ist eine Test-Email um den Einwilligungs- und Abmelde-Flow zu prüfen.</p>

    <p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin:20px 0">
      <strong style="color:#15803d">✅ Opt-in testen:</strong><br/>
      Klicke den Link unten – dein Status wechselt von <code>pending_consent</code> zu <code>active</code>.<br/><br/>
      <a href="${consentLink}" style="display:inline-block;background:#15803d;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">
        Ja, ich stimme zu →
      </a>
    </p>

    <p style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:20px 0">
      <strong style="color:#dc2626">🚫 Opt-out testen:</strong><br/>
      Klicke den Link unten – dein Status wechselt zu <code>unsubscribed</code>.<br/><br/>
      <a href="${unsubscribeLink}" style="color:#dc2626;font-size:13px">
        Abmelden / Opt-out testen →
      </a>
    </p>

    <p style="font-size:12px;color:#9ca3af;margin-top:24px">
      Lead-ID: <code>${leadId}</code><br/>
      Consent-URL: <code style="word-break:break-all">${consentLink}</code><br/>
      Unsubscribe-URL: <code style="word-break:break-all">${unsubscribeLink}</code>
    </p>
  `

  const html = wrapMarketingEmail(content, tenantName, unsubscribeLink, primaryColor)

  await sendEmail({
    to: email,
    subject: `[TEST] Opt-in & Opt-out Flow – ${tenantName}`,
    html,
    fromName: tenantName,
  })

  return { success: true, leadId, consentLink, unsubscribeLink }
})
