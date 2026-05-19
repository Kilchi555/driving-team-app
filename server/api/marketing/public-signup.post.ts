/**
 * POST /api/marketing/public-signup
 * Public endpoint for newsletter/marketing signup forms.
 * Creates a lead with pending_consent and sends a confirmation email.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { buildConsentLink, buildUnsubscribeLink, wrapMarketingEmail } from '~/server/utils/email-template'

export default defineEventHandler(async (event) => {
  const { tenantSlug, email, first_name, last_name, categories = [], source_label } = await readBody(event)

  if (!tenantSlug || !email) {
    throw createError({ statusCode: 400, statusMessage: 'tenantSlug and email required' })
  }

  const supabase = getSupabaseAdmin()

  // Resolve tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, primary_color')
    .eq('slug', tenantSlug)
    .eq('is_active', true)
    .maybeSingle()

  if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })

  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'https://app.simy.ch'

  const normalizedEmail = email.toLowerCase().trim()

  // Try to insert; if duplicate, fetch the existing lead
  const { error: insertError } = await supabase
    .from('leads')
    .upsert(
      {
        tenant_id: tenant.id,
        email: normalizedEmail,
        first_name: first_name?.trim() || null,
        last_name: last_name?.trim() || null,
        categories,
        status: 'pending_consent',
        source: 'public_signup_form',
        source_label: source_label || null,
      },
      { onConflict: 'tenant_id,email', ignoreDuplicates: true }
    )

  if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })

  const { data: lead, error: selectError } = await supabase
    .from('leads')
    .select('id, unsubscribe_token, status')
    .eq('tenant_id', tenant.id)
    .eq('email', normalizedEmail)
    .single()

  if (selectError || !lead) throw createError({ statusCode: 500, statusMessage: 'Lead nicht gefunden' })

  // Send double opt-in confirmation email
  const consentLink = buildConsentLink(baseUrl, lead.id, lead.unsubscribe_token)
  const unsubscribeLink = buildUnsubscribeLink(baseUrl, lead.id, lead.unsubscribe_token)
  const firstName = first_name?.trim() || 'dort'
  const primaryColor = tenant.primary_color || '#1e293b'

  const content = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700">Bitte bestätige deine Anmeldung</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7">Hallo ${firstName}</p>
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7">
      Du hast dich für den Newsletter von ${tenant.name} angemeldet. Klicke auf den Button um deine Anmeldung zu bestätigen.
    </p>
    <a href="${consentLink}" style="display:block;background:${primaryColor};color:#fff;text-decoration:none;text-align:center;padding:16px 28px;border-radius:12px;font-weight:700;font-size:16px;margin:28px 0">
      ✅ Ja, ich bestätige meine Anmeldung
    </a>
    <p style="margin:0;font-size:13px;color:#9ca3af">Nicht angemeldet? Ignoriere diese Email einfach.</p>
  `

  try {
    await sendEmail({
      to: email,
      subject: `Bitte bestätige deine Anmeldung – ${tenant.name}`,
      html: wrapMarketingEmail(content, tenant.name, unsubscribeLink, primaryColor),
      fromName: tenant.name,
    })
  } catch (e) {
    console.error('Failed to send signup confirmation:', e)
  }

  return { success: true, message: 'Bitte überprüfe dein Postfach und bestätige deine Anmeldung.' }
})
