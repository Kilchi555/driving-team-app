/**
 * Send a preview / test email.
 * Mode A (raw): pass { to, subject, html }
 * Mode B (campaign): pass { to, campaignId, tenantId } — renders the full template with branding
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { renderTemplate, buildUnsubscribeLink, buildConsentLink, wrapMarketingEmail } from '~/server/utils/email-template'
import { sendEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { to, subject, html, campaignId, tenantId } = body

  if (!to) throw createError({ statusCode: 400, statusMessage: 'to is required' })

  // Mode B: render from campaign
  if (campaignId && tenantId) {
    const supabase = getSupabaseAdmin()

    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('*, email_templates:email_templates!template_id(*)')
      .eq('id', campaignId)
      .eq('tenant_id', tenantId)
      .single()

    if (!campaign) throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })

    // Load variants (new system) or fall back to single template
    const { data: variantRows } = await supabase
      .from('email_campaign_variants')
      .select('*, email_templates(*)')
      .eq('campaign_id', campaignId)
      .order('label')

    const templates: { label: string; template: any; subjectOverride?: string }[] = variantRows && variantRows.length > 0
      ? variantRows.map(v => ({ label: v.label, template: v.email_templates, subjectOverride: v.subject_override }))
      : [{ label: 'a', template: campaign.email_templates }]

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_square_url')
      .eq('id', tenantId)
      .single()

    const tenantName = tenant?.name ?? 'Fahrschule'
    const tenantSlug = tenant?.slug ?? ''
    const primaryColor = tenant?.primary_color || '#1e293b'
    const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'

    const fakeLeadId = '00000000-0000-0000-0000-000000000000'
    const fakeToken = 'preview'
    const unsubscribeLink = buildUnsubscribeLink(baseUrl, fakeLeadId, fakeToken)
    const consentLink = buildConsentLink(baseUrl, fakeLeadId, fakeToken)

    const buildPreview = (template: any, label: string, subjectOverride?: string) => {
      const rendered = renderTemplate(template.html_body, {
        first_name: 'Vorname',
        last_name: 'Nachname',
        email: to,
        unsubscribe_link: unsubscribeLink,
        consent_link: consentLink,
        tenant_name: tenantName,
        tenant_slug: tenantSlug,
        primary_color: primaryColor,
        discount_code: (campaign as any).segment_filter?.discount_code || '',
      })
      const baseSubject = subjectOverride || (campaign as any).subject_override || template.subject
      const labelSuffix = templates.length > 1 ? ` - Variante ${label.toUpperCase()}` : ''
      const previewSubject = `[TEST${labelSuffix}] ${baseSubject}`
      const html = wrapMarketingEmail(
        rendered, tenantName, unsubscribeLink, primaryColor,
        tenant?.logo_wide_url || null, tenant?.logo_square_url || null,
        null, tenantId,
      )
      return { subject: previewSubject, html }
    }

    const previews = templates.map(t => buildPreview(t.template, t.label, t.subjectOverride))

    const results = await Promise.all(previews.map(p =>
      sendEmail({
        to,
        subject: p.subject,
        html: p.html,
        fromName: tenantName,
        fromEmail: tenant?.from_email || null,
        domainVerified: tenant?.resend_domain_verified ?? false,
      })
    ))

    return { success: true, sent: previews.length, variants: previews.map((p, i) => ({ subject: p.subject, messageId: results[i].messageId })) }
  }

  // Mode A: raw HTML
  if (!subject || !html) throw createError({ statusCode: 400, statusMessage: 'subject and html are required for raw mode' })

  const result = await sendEmail({ to, subject, html, fromName: 'Ihre Fahrschule' })
  return { success: true, messageId: result.messageId }
})
