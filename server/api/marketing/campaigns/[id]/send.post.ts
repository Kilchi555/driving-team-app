import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { renderTemplate, buildUnsubscribeLink, buildConsentLink, wrapMarketingEmail } from '~/server/utils/email-template'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { tenantId } = body

  if (!tenantId || !campaignId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and campaignId are required' })
  }

  const supabase = getSupabaseAdmin()

  // Load campaign + template
  const { data: campaign, error: campaignErr } = await supabase
    .from('email_campaigns')
    .select('*, email_templates(*)')
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .single()

  if (campaignErr || !campaign) throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
  if (campaign.status !== 'draft') throw createError({ statusCode: 409, statusMessage: 'Campaign already sent or sending' })

  const template = campaign.email_templates as any
  if (!template) throw createError({ statusCode: 400, statusMessage: 'Campaign has no template' })

  // Load tenant info for from-name, branding + base URL
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, from_email, resend_domain_verified, primary_color')
    .eq('id', tenantId)
    .single()

  const tenantName = tenant?.name ?? 'Fahrschule'
  const primaryColor = tenant?.primary_color || '#1e293b'
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'https://app.simy.ch'

  // Build lead query from segment_filter
  const filter = campaign.segment_filter || {}
  let leadsQuery = supabase
    .from('leads')
    .select('id, email, first_name, last_name, unsubscribe_token')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (filter.categories?.length) leadsQuery = leadsQuery.overlaps('categories', filter.categories)
  if (filter.tags?.length) leadsQuery = leadsQuery.overlaps('tags', filter.tags)

  const { data: leads, error: leadsErr } = await leadsQuery
  if (leadsErr) throw createError({ statusCode: 500, statusMessage: leadsErr.message })
  if (!leads || leads.length === 0) {
    return { success: true, recipientCount: 0, message: 'No active leads match this segment' }
  }

  // Mark campaign as sending immediately
  await supabase
    .from('email_campaigns')
    .update({ status: 'sending', total_recipients: leads.length })
    .eq('id', campaignId)

  const subject = campaign.subject_override || template.subject

  // Build outbound_messages_queue rows + email_campaign_leads rows
  const queueRows: any[] = []
  const campaignLeadRows: any[] = []

  for (const lead of leads) {
    const unsubscribeLink = buildUnsubscribeLink(baseUrl, lead.id, lead.unsubscribe_token)
    const consentLink = buildConsentLink(baseUrl, lead.id, lead.unsubscribe_token)

    const renderedHtml = renderTemplate(template.html_body, {
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      unsubscribe_link: unsubscribeLink,
      consent_link: consentLink,
      tenant_name: tenantName,
      primary_color: primaryColor,
    })

    const renderedSubject = renderTemplate(subject, {
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      tenant_name: tenantName,
    })

    const wrappedHtml = wrapMarketingEmail(renderedHtml, tenantName, unsubscribeLink, primaryColor)

    queueRows.push({
      channel: 'email',
      recipient_email: lead.email,
      subject: renderedSubject,
      body: wrappedHtml,
      status: 'pending',
      send_at: new Date().toISOString(),
      context_data: {
        tenant_name: tenantName,
        campaign_id: campaignId,
        lead_id: lead.id,
        type: 'marketing',
      },
    })

    campaignLeadRows.push({
      campaign_id: campaignId,
      lead_id: lead.id,
      status: 'queued',
    })
  }

  // Insert into outbound_messages_queue in batches
  const batchSize = 500
  let totalInserted = 0
  for (let i = 0; i < queueRows.length; i += batchSize) {
    const { data: inserted, error: queueErr } = await supabase
      .from('outbound_messages_queue')
      .insert(queueRows.slice(i, i + batchSize))
      .select('id')
    if (queueErr) console.error('[CampaignSend] Queue insert error:', queueErr)
    totalInserted += inserted?.length ?? 0
  }

  // Insert campaign_leads tracking rows
  for (let i = 0; i < campaignLeadRows.length; i += batchSize) {
    await supabase
      .from('email_campaign_leads')
      .insert(campaignLeadRows.slice(i, i + batchSize))
      .select('id')
  }

  // Update lead last_emailed_at
  const leadIds = leads.map(l => l.id)
  await supabase
    .from('leads')
    .update({ last_emailed_at: new Date().toISOString() })
    .in('id', leadIds)

  // Mark campaign as sent
  await supabase
    .from('email_campaigns')
    .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: totalInserted })
    .eq('id', campaignId)

  return { success: true, recipientCount: leads.length, queuedCount: totalInserted }
})
