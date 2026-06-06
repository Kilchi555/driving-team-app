import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { renderTemplate, buildUnsubscribeLink, buildConsentLink, wrapMarketingEmail } from '~/server/utils/email-template'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { tenantId, dailyLimit, pilotLimit } = body
  const MAX_DAILY = 500
  const batchSize500 = Math.min(MAX_DAILY, typeof dailyLimit === 'number' && dailyLimit > 0 ? dailyLimit : MAX_DAILY)
  const isPilot = typeof pilotLimit === 'number' && pilotLimit > 0

  if (!tenantId || !campaignId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and campaignId are required' })
  }

  const supabase = getSupabaseAdmin()

  // Load campaign
  const { data: campaign, error: campaignErr } = await supabase
    .from('email_campaigns')
    .select('*, email_templates:email_templates!template_id(*)')
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .single()

  if (campaignErr || !campaign) throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
  if (!['draft', 'pilot'].includes(campaign.status)) throw createError({ statusCode: 409, statusMessage: 'Campaign already sent or sending' })

  // Load variants (new system)
  const { data: variantRows } = await supabase
    .from('email_campaign_variants')
    .select('*, email_templates(*)')
    .eq('campaign_id', campaignId)
    .order('label')

  // Build variant list — fall back to legacy A/B columns if no variants table entries
  type VariantDef = { label: string; template: any; splitPct: number; subjectOverride: string | null }
  let variantDefs: VariantDef[]

  if (variantRows && variantRows.length > 0) {
    variantDefs = variantRows.map(v => ({
      label: v.label,
      template: v.email_templates,
      splitPct: v.split_pct,
      subjectOverride: v.subject_override || null,
    }))
  } else {
    // Legacy A/B fallback
    const templateA = campaign.email_templates as any
    if (!templateA) throw createError({ statusCode: 400, statusMessage: 'Campaign has no template' })
    variantDefs = [{ label: 'a', template: templateA, splitPct: 100, subjectOverride: null }]
  }

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

  const filter = campaign.segment_filter || {}
  const discountCode: string = filter.discount_code || ''

  let leadsQuery = supabase
    .from('leads')
    .select('id, email, first_name, last_name, unsubscribe_token')
    .eq('tenant_id', tenantId)
    .neq('status', 'unsubscribed')

  // Check total available categories across all three sources using distinct codes
  // Only apply filter if it's a real subset — not "select all"
  let effectiveCategories: string[] = []
  if (filter.categories?.length) {
    const [res1, res2, res3] = await Promise.all([
      supabase.from('categories').select('code').eq('tenant_id', tenantId).eq('is_active', true),
      supabase.from('course_categories').select('code').eq('tenant_id', tenantId).eq('is_active', true),
      supabase.from('lead_categories').select('code').eq('tenant_id', tenantId).eq('is_active', true),
    ])
    const allDistinctCodes = new Set([
      ...(res1.data || []).map((r: any) => r.code),
      ...(res2.data || []).map((r: any) => r.code),
      ...(res3.data || []).map((r: any) => r.code),
    ])
    const totalDistinctCats = allDistinctCodes.size
    // Apply filter only if it's a genuine subset (not selecting all available categories)
    if (totalDistinctCats > 0 && filter.categories.length < totalDistinctCats) {
      // Include both original and lowercase variants to handle case mismatches in stored data
      effectiveCategories = [...new Set([
        ...filter.categories,
        ...filter.categories.map((c: string) => c.toLowerCase()),
      ])]
    }
  }

  if (effectiveCategories.length) leadsQuery = leadsQuery.overlaps('categories', effectiveCategories)
  if (filter.tags?.length) leadsQuery = leadsQuery.overlaps('tags', filter.tags)

  const { data: allLeads, error: leadsErr } = await leadsQuery
  if (leadsErr) throw createError({ statusCode: 500, statusMessage: leadsErr.message })
  if (!allLeads || allLeads.length === 0) {
    return { success: true, recipientCount: 0, message: 'No leads match this segment' }
  }

  // Exclude already-sent leads
  const { data: alreadySent } = await supabase
    .from('email_campaign_leads')
    .select('lead_id')
    .eq('campaign_id', campaignId)

  const alreadySentIds = new Set((alreadySent ?? []).map((r: any) => r.lead_id))
  const remainingLeads = allLeads.filter(l => !alreadySentIds.has(l.id))

  const leads = isPilot ? remainingLeads.slice(0, pilotLimit) : remainingLeads

  if (leads.length === 0) {
    return { success: true, recipientCount: 0, message: 'No remaining leads to send to' }
  }

  const totalRemaining = remainingLeads.length

  // Distribute leads across variants by split percentage
  const buckets: { variantDef: VariantDef; leads: any[] }[] = []
  let offset = 0
  for (let i = 0; i < variantDefs.length; i++) {
    const vd = variantDefs[i]
    const isLast = i === variantDefs.length - 1
    const count = isLast ? leads.length - offset : Math.round(leads.length * (vd.splitPct / 100))
    buckets.push({ variantDef: vd, leads: leads.slice(offset, offset + count) })
    offset += count
  }

  await supabase
    .from('email_campaigns')
    .update({ status: 'sending', total_recipients: allLeads.length })
    .eq('id', campaignId)

  const queueRows: any[] = []
  const campaignLeadRows: any[] = []
  const now = Date.now()
  let globalIndex = 0

  for (const bucket of buckets) {
    const { variantDef, leads: bucketLeads } = bucket
    const template = variantDef.template
    if (!template || !bucketLeads.length) continue

    for (const lead of bucketLeads) {
      const dayOffset = batchSize500 > 0 ? Math.floor(globalIndex / batchSize500) : 0
      const sendAt = new Date(now + dayOffset * 24 * 60 * 60 * 1000).toISOString()
      globalIndex++

      const unsubscribeLink = buildUnsubscribeLink(baseUrl, lead.id, lead.unsubscribe_token)
      const consentLink = buildConsentLink(baseUrl, lead.id, lead.unsubscribe_token)
      const trackingPixelUrl = `${baseUrl}/api/marketing/track/open?cid=${campaignId}&lid=${lead.id}&v=${variantDef.label}`

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

      const subject = variantDef.subjectOverride || campaign.subject_override || template.subject
      const renderedSubject = renderTemplate(subject, {
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        tenant_name: tenantName,
      })

      const trackedHtml = renderedHtml.replace(
        /href="(https?:\/\/[^"]+)"/g,
        (_, url) => `href="${baseUrl}/api/marketing/track/click?cid=${campaignId}&lid=${lead.id}&v=${variantDef.label}&url=${encodeURIComponent(url)}"`,
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
        context_data: { tenant_name: tenantName, campaign_id: campaignId, lead_id: lead.id, type: 'marketing', variant: variantDef.label },
      })

      campaignLeadRows.push({
        campaign_id: campaignId,
        lead_id: lead.id,
        status: 'queued',
        variant: variantDef.label,
      })
    }
  }

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

  // Update per-variant sent counts
  for (const bucket of buckets) {
    if (bucket.leads.length > 0) {
      await supabase
        .from('email_campaign_variants')
        .update({ sent_count: bucket.leads.length })
        .eq('campaign_id', campaignId)
        .eq('label', bucket.variantDef.label)
    }
  }

  const leadIds = leads.map(l => l.id)
  await supabase.from('leads').update({ last_emailed_at: new Date().toISOString() }).in('id', leadIds)

  const newStatus = isPilot && totalRemaining > leads.length ? 'pilot' : 'sent'
  const prevSentCount = campaign.sent_count || 0
  await supabase
    .from('email_campaigns')
    .update({ status: newStatus, sent_at: new Date().toISOString(), sent_count: prevSentCount + totalInserted })
    .eq('id', campaignId)

  const variantSummary = buckets.map(b => ({ label: b.variantDef.label, count: b.leads.length }))

  return {
    success: true,
    recipientCount: leads.length,
    queuedCount: totalInserted,
    remainingCount: totalRemaining - leads.length,
    status: newStatus,
    variants: variantSummary,
  }
})
