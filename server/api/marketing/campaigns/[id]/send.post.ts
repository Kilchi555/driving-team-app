import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { renderTemplate, buildUnsubscribeLink, buildConsentLink, wrapMarketingEmail } from '~/server/utils/email-template'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { tenantId, dailyLimit, pilotLimit } = body
  const batchSize500 = typeof dailyLimit === 'number' && dailyLimit > 0 ? dailyLimit : 0
  const isPilot = typeof pilotLimit === 'number' && pilotLimit > 0

  if (!tenantId || !campaignId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and campaignId are required' })
  }

  const supabase = getSupabaseAdmin()

  // Load campaign + both templates (A and optional B)
  const { data: campaign, error: campaignErr } = await supabase
    .from('email_campaigns')
    .select('*, email_templates(*), template_b:template_b_id(id,subject,html_body), ab_split_pct')
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .single()

  if (campaignErr || !campaign) throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
  if (!['draft', 'pilot'].includes(campaign.status)) throw createError({ statusCode: 409, statusMessage: 'Campaign already sent or sending' })

  const templateA = campaign.email_templates as any
  if (!templateA) throw createError({ statusCode: 400, statusMessage: 'Campaign has no template' })

  const templateB = (campaign as any).template_b as any | null
  const hasAB = !!templateB
  const splitPct = Math.min(100, Math.max(0, (campaign as any).ab_split_pct ?? 50))

  // Load tenant branding
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_square_url')
    .eq('id', tenantId)
    .single()

  const tenantName = tenant?.name ?? 'Fahrschule'
  const tenantSlug = tenant?.slug ?? ''
  const primaryColor = tenant?.primary_color || '#1e293b'
  const logoWideUrl = tenant?.logo_wide_url || null
  const logoSquareUrl = tenant?.logo_square_url || null
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'https://app.simy.ch'

  // Extract discount code from segment_filter (non-filtering metadata)
  const filter = campaign.segment_filter || {}
  const discountCode: string = filter.discount_code || ''

  let leadsQuery = supabase
    .from('leads')
    .select('id, email, first_name, last_name, unsubscribe_token')
    .eq('tenant_id', tenantId)
    .neq('status', 'unsubscribed')

  if (filter.categories?.length) leadsQuery = leadsQuery.overlaps('categories', filter.categories)
  if (filter.tags?.length) leadsQuery = leadsQuery.overlaps('tags', filter.tags)

  const { data: allLeads, error: leadsErr } = await leadsQuery
  if (leadsErr) throw createError({ statusCode: 500, statusMessage: leadsErr.message })
  if (!allLeads || allLeads.length === 0) {
    return { success: true, recipientCount: 0, message: 'No leads match this segment' }
  }

  // Exclude leads already sent to in this campaign
  const { data: alreadySent } = await supabase
    .from('email_campaign_leads')
    .select('lead_id')
    .eq('campaign_id', campaignId)

  const alreadySentIds = new Set((alreadySent ?? []).map((r: any) => r.lead_id))
  const remainingLeads = allLeads.filter(l => !alreadySentIds.has(l.id))

  // In pilot mode: take only the first N remaining leads
  const leads = isPilot ? remainingLeads.slice(0, pilotLimit) : remainingLeads

  if (leads.length === 0) {
    return { success: true, recipientCount: 0, message: 'No remaining leads to send to' }
  }

  const totalRemaining = remainingLeads.length

  // A/B split: first splitPct% → variant A, rest → variant B (only if templateB exists)
  const splitIndex = hasAB ? Math.round(leads.length * (splitPct / 100)) : leads.length
  const leadsA = leads.slice(0, splitIndex)
  const leadsB = hasAB ? leads.slice(splitIndex) : []

  await supabase
    .from('email_campaigns')
    .update({ status: 'sending', total_recipients: allLeads.length })
    .eq('id', campaignId)

  const queueRows: any[] = []
  const campaignLeadRows: any[] = []
  const now = Date.now()

  const buildRows = (batchLeads: any[], template: any, variant: 'a' | 'b') => {
    for (let i = 0; i < batchLeads.length; i++) {
      const lead = batchLeads[i]
      const globalIndex = variant === 'a' ? i : leadsA.length + i
      const dayOffset = batchSize500 > 0 ? Math.floor(globalIndex / batchSize500) : 0
      const sendAt = new Date(now + dayOffset * 24 * 60 * 60 * 1000).toISOString()

      const unsubscribeLink = buildUnsubscribeLink(baseUrl, lead.id, lead.unsubscribe_token)
      const consentLink = buildConsentLink(baseUrl, lead.id, lead.unsubscribe_token)
      // Embed variant in tracking URLs so open/click handlers can route to correct counter
      const trackingPixelUrl = `${baseUrl}/api/marketing/track/open?cid=${campaignId}&lid=${lead.id}&v=${variant}`

      const renderedHtml = renderTemplate(template.html_body, {
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        unsubscribe_link: unsubscribeLink,
        consent_link: consentLink,
        tenant_name: tenantName,
        tenant_slug: tenantSlug,
        primary_color: primaryColor,
        discount_code: discountCode,
      })

      const subject = campaign.subject_override || template.subject
      const renderedSubject = renderTemplate(subject, {
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        tenant_name: tenantName,
      })

      const trackedHtml = renderedHtml.replace(
        /href="(https?:\/\/[^"]+)"/g,
        (_, url) => `href="${baseUrl}/api/marketing/track/click?cid=${campaignId}&lid=${lead.id}&v=${variant}&url=${encodeURIComponent(url)}"`,
      )

      const wrappedHtml = wrapMarketingEmail(
        trackedHtml, tenantName, unsubscribeLink, primaryColor,
        logoWideUrl, logoSquareUrl, trackingPixelUrl, tenantId,
      )

      queueRows.push({
        channel: 'email',
        recipient_email: lead.email,
        subject: renderedSubject,
        body: wrappedHtml,
        status: 'pending',
        send_at: sendAt,
        context_data: { tenant_name: tenantName, campaign_id: campaignId, lead_id: lead.id, type: 'marketing', variant },
      })

      campaignLeadRows.push({
        campaign_id: campaignId,
        lead_id: lead.id,
        status: 'queued',
        variant,
      })
    }
  }

  buildRows(leadsA, templateA, 'a')
  if (leadsB.length > 0) buildRows(leadsB, templateB, 'b')

  // Insert queue in batches of 500
  const dbBatch = 500
  let totalInserted = 0
  for (let i = 0; i < queueRows.length; i += dbBatch) {
    const { data: inserted, error: queueErr } = await supabase
      .from('outbound_messages_queue')
      .insert(queueRows.slice(i, i + dbBatch))
      .select('id')
    if (queueErr) console.error('[CampaignSend] Queue insert error:', queueErr)
    totalInserted += inserted?.length ?? 0
  }

  for (let i = 0; i < campaignLeadRows.length; i += dbBatch) {
    await supabase
      .from('email_campaign_leads')
      .insert(campaignLeadRows.slice(i, i + dbBatch))
      .select('id')
  }

  const leadIds = leads.map(l => l.id)
  await supabase.from('leads').update({ last_emailed_at: new Date().toISOString() }).in('id', leadIds)

  const newStatus = isPilot && totalRemaining > leads.length ? 'pilot' : 'sent'
  const prevSentCount = campaign.sent_count || 0
  await supabase
    .from('email_campaigns')
    .update({ status: newStatus, sent_at: new Date().toISOString(), sent_count: prevSentCount + totalInserted })
    .eq('id', campaignId)

  return {
    success: true,
    recipientCount: leads.length,
    queuedCount: totalInserted,
    remainingCount: totalRemaining - leads.length,
    status: newStatus,
    ab: hasAB ? { variantA: leadsA.length, variantB: leadsB.length, splitPct } : null,
  }
})
