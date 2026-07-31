/**
 * Shared marketing campaign send/queue logic.
 * Used by manual send API and the scheduled-campaigns cron.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { renderTemplate, buildUnsubscribeLink, buildConsentLink, wrapMarketingEmail } from '~/server/utils/email-template'
import { computeNextRunAt, type ScheduleFrequency } from '~/server/utils/campaign-schedule'

export interface QueueCampaignSendOptions {
  supabase: SupabaseClient
  campaignId: string
  tenantId: string
  /** Cap per calendar day when spreading the queue (default 500) */
  dailyLimit?: number
  /** If set, only queue up to this many remaining leads (pilot / scheduled batch) */
  batchLimit?: number
  /** When true, keep campaign in recurring state and advance next_run_at */
  fromSchedule?: boolean
}

export interface QueueCampaignSendResult {
  success: boolean
  recipientCount: number
  queuedCount: number
  remainingCount: number
  status: string
  message?: string
  variants: { label: string; count: number }[]
}

type VariantDef = { label: string; template: any; splitPct: number; subjectOverride: string | null }

export async function queueCampaignSend(opts: QueueCampaignSendOptions): Promise<QueueCampaignSendResult> {
  const {
    supabase,
    campaignId,
    tenantId,
    fromSchedule = false,
  } = opts

  const MAX_DAILY = 500
  const batchSize500 = Math.min(
    MAX_DAILY,
    typeof opts.dailyLimit === 'number' && opts.dailyLimit > 0 ? opts.dailyLimit : MAX_DAILY,
  )
  const batchLimit = typeof opts.batchLimit === 'number' && opts.batchLimit > 0 ? opts.batchLimit : null

  const { data: campaign, error: campaignErr } = await supabase
    .from('email_campaigns')
    .select('*, email_templates:email_templates!template_id(*)')
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .single()

  if (campaignErr || !campaign) {
    throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
  }

  const allowedStatuses = ['draft', 'pilot', 'recurring', 'sending']
  if (!allowedStatuses.includes(campaign.status) && !(fromSchedule && campaign.schedule_enabled)) {
    throw createError({ statusCode: 409, statusMessage: 'Campaign already sent or sending' })
  }

  const { data: variantRows } = await supabase
    .from('email_campaign_variants')
    .select('*, email_templates(*)')
    .eq('campaign_id', campaignId)
    .order('label')

  let variantDefs: VariantDef[]
  if (variantRows && variantRows.length > 0) {
    variantDefs = variantRows.map((v: any) => ({
      label: v.label,
      template: v.email_templates,
      splitPct: v.split_pct,
      subjectOverride: v.subject_override || null,
    }))
  } else {
    const templateA = campaign.email_templates as any
    if (!templateA) throw createError({ statusCode: 400, statusMessage: 'Campaign has no template' })
    variantDefs = [{ label: 'a', template: templateA, splitPct: 100, subjectOverride: null }]
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('id', tenantId)
    .single()

  const tenantName = tenant?.name ?? 'Fahrschule'
  const tenantSlug = tenant?.slug ?? ''
  const primaryColor = tenant?.primary_color || '#1e293b'
  const logoWideUrl = tenant?.logo_wide_url || tenant?.logo_url || null
  const logoSquareUrl = tenant?.logo_square_url || null
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'https://app.simy.ch'

  const filter = campaign.segment_filter || {}
  const discountCode: string = filter.discount_code || ''

  let leadsQuery = supabase
    .from('leads')
    .select('id, email, first_name, last_name, unsubscribe_token')
    .eq('tenant_id', tenantId)
    .neq('status', 'unsubscribed')

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
    if (totalDistinctCats > 0 && filter.categories.length < totalDistinctCats) {
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
    await markScheduleAdvanced(supabase, campaign, fromSchedule, /*hadSends*/ false)
    return { success: true, recipientCount: 0, queuedCount: 0, remainingCount: 0, message: 'No leads match this segment', status: campaign.status, variants: [] }
  }

  const { data: alreadySent } = await supabase
    .from('email_campaign_leads')
    .select('lead_id')
    .eq('campaign_id', campaignId)

  const alreadySentIds = new Set((alreadySent ?? []).map((r: any) => r.lead_id))
  const remainingLeads = allLeads.filter(l => !alreadySentIds.has(l.id))
  const leads = batchLimit ? remainingLeads.slice(0, batchLimit) : remainingLeads

  if (leads.length === 0) {
    await markScheduleAdvanced(supabase, campaign, fromSchedule, /*hadSends*/ false)
    return { success: true, recipientCount: 0, queuedCount: 0, remainingCount: 0, message: 'No remaining leads to send to', status: campaign.status, variants: [] }
  }

  const totalRemaining = remainingLeads.length

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
        (_: string, url: string) => `href="${baseUrl}/api/marketing/track/click?cid=${campaignId}&lid=${lead.id}&v=${variantDef.label}&url=${encodeURIComponent(url)}"`,
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
    const { error: leadsInsertErr } = await supabase
      .from('email_campaign_leads')
      .insert(campaignLeadRows.slice(i, i + dbBatch))
    if (leadsInsertErr) console.error('[CampaignSend] email_campaign_leads insert error:', leadsInsertErr)
  }

  for (const bucket of buckets) {
    if (bucket.leads.length === 0) continue
    const variantRow = (variantRows || []).find((v: any) => v.label === bucket.variantDef.label)
    const prev = variantRow?.sent_count ?? 0
    await supabase
      .from('email_campaign_variants')
      .update({ sent_count: prev + bucket.leads.length })
      .eq('campaign_id', campaignId)
      .eq('label', bucket.variantDef.label)
  }

  const leadIds = leads.map(l => l.id)
  await supabase.from('leads').update({ last_emailed_at: new Date().toISOString() }).in('id', leadIds)

  const stillRemaining = totalRemaining - leads.length
  const keepRecurring = !!(campaign.schedule_enabled || fromSchedule)
  let newStatus: string
  if (keepRecurring) {
    newStatus = 'recurring'
  } else if (batchLimit && stillRemaining > 0) {
    newStatus = 'pilot'
  } else {
    newStatus = 'sent'
  }

  const prevSentCount = campaign.sent_count || 0
  const schedulePatch: Record<string, any> = {
    status: newStatus,
    sent_at: new Date().toISOString(),
    sent_count: prevSentCount + totalInserted,
  }

  if (keepRecurring) {
    const nowDate = new Date()
    schedulePatch.last_run_at = nowDate.toISOString()
    schedulePatch.next_run_at = computeNextRunAt({
      frequency: (campaign.schedule_frequency as ScheduleFrequency) || 'weekly',
      dayOfWeek: campaign.schedule_day_of_week,
      hour: campaign.schedule_hour ?? 9,
    }, nowDate).toISOString()
    schedulePatch.schedule_enabled = true
  }

  await supabase.from('email_campaigns').update(schedulePatch).eq('id', campaignId)

  return {
    success: true,
    recipientCount: leads.length,
    queuedCount: totalInserted,
    remainingCount: stillRemaining,
    status: newStatus,
    variants: buckets.map(b => ({ label: b.variantDef.label, count: b.leads.length })),
  }
}

async function markScheduleAdvanced(
  supabase: SupabaseClient,
  campaign: any,
  fromSchedule: boolean,
  _hadSends: boolean,
) {
  if (!(campaign.schedule_enabled || fromSchedule)) return
  const nowDate = new Date()
  await supabase.from('email_campaigns').update({
    status: 'recurring',
    last_run_at: nowDate.toISOString(),
    next_run_at: computeNextRunAt({
      frequency: (campaign.schedule_frequency as ScheduleFrequency) || 'weekly',
      dayOfWeek: campaign.schedule_day_of_week,
      hour: campaign.schedule_hour ?? 9,
    }, nowDate).toISOString(),
    schedule_enabled: true,
  }).eq('id', campaign.id)
}
