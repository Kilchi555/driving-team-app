import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getTenantIdByMetaAdAccount } from '~/server/utils/marketing-tenant'

/**
 * Daily Meta Ads sync — runs at 04:20 via Vercel Cron.
 *
 * Fetches the last 30 days of performance data from Meta Marketing API at three levels:
 *   1. Campaign level  → marketing_meta_ads_daily
 *   2. Ad set level    → marketing_meta_adsets_daily
 *   3. Ad level        → marketing_meta_ads_ad_daily  (with creative content for A/B analysis)
 *
 * Both tables include tenant_id resolved via marketing_meta_accounts.
 * Register ad accounts: INSERT INTO marketing_meta_accounts (tenant_id, ad_account_id, pixel_id, label)
 */
export default defineEventHandler(async (event) => {
  // ============ LAYER 1: CRON AUTH ============
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // ============ LAYER 2: ENV CHECK ============
  const accessToken = process.env.META_SYSTEM_USER_TOKEN ?? process.env.META_ACCESS_TOKEN
  const adAccountId = process.env.META_AD_ACCOUNT_ID

  if (!accessToken || !adAccountId) {
    logger.warn('sync-marketing-meta-ads: missing credentials, skipping')
    return { success: false, reason: 'missing_credentials' }
  }

  if (!process.env.META_SYSTEM_USER_TOKEN && process.env.META_ACCESS_TOKEN) {
    logger.warn(
      'sync-marketing-meta-ads: META_SYSTEM_USER_TOKEN not set — falling back to ' +
      'META_ACCESS_TOKEN which may be a short-lived User Access Token (60-day TTL). ' +
      'Migrate: Meta Business Manager → Business Settings → System Users → ' +
      'Create System User (Admin) → Generate Token (never expires).'
    )
  }

  // ============ LAYER 3: TENANT RESOLUTION ============
  const tenantId = await getTenantIdByMetaAdAccount(adAccountId)
  if (!tenantId) {
    logger.warn(
      `sync-marketing-meta-ads: no tenant_id found for ad account ${adAccountId}. ` +
      'Register via: INSERT INTO marketing_meta_accounts (tenant_id, ad_account_id, label) VALUES ...'
    )
  }

  // ============ LAYER 4: DATE RANGE (30 days) ============
  const endDate = new Date()
  endDate.setDate(endDate.getDate() - 1)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const timeRange = JSON.stringify({ since: fmt(startDate), until: fmt(endDate) })

  logger.info(`sync-marketing-meta-ads: syncing ${fmt(startDate)} → ${fmt(endDate)} (tenant: ${tenantId ?? 'unknown'})`)

  const supabase = getSupabaseAdmin()

  // ============ LAYER 5: CAMPAIGN LEVEL SYNC ============
  // Note: `clicks` = all interactions (video plays, reactions, profile taps, link clicks)
  //       `outbound_clicks` = real link clicks to destination URL only (correct for CTR/CPC)
  const campaignFields = [
    'campaign_id', 'campaign_name', 'spend', 'impressions',
    'clicks', 'outbound_clicks', 'reach', 'actions', 'date_start',
  ].join(',')

  const campaignUrl = new URL(`https://graph.facebook.com/v19.0/${adAccountId}/insights`)
  campaignUrl.searchParams.set('access_token', accessToken)
  campaignUrl.searchParams.set('fields', campaignFields)
  campaignUrl.searchParams.set('level', 'campaign')
  campaignUrl.searchParams.set('time_range', timeRange)
  campaignUrl.searchParams.set('time_increment', '1')
  campaignUrl.searchParams.set('limit', '500')

  // ============ LAYER 6: AD SET LEVEL SYNC ============
  const adsetFields = [
    'campaign_id', 'campaign_name', 'adset_id', 'adset_name',
    'spend', 'impressions', 'clicks', 'outbound_clicks', 'reach', 'actions', 'date_start',
  ].join(',')

  const adsetUrl = new URL(`https://graph.facebook.com/v19.0/${adAccountId}/insights`)
  adsetUrl.searchParams.set('access_token', accessToken)
  adsetUrl.searchParams.set('fields', adsetFields)
  adsetUrl.searchParams.set('level', 'adset')
  adsetUrl.searchParams.set('time_range', timeRange)
  adsetUrl.searchParams.set('time_increment', '1')
  adsetUrl.searchParams.set('limit', '500')

  // Fetch both levels in parallel
  const [campaignRes, adsetRes] = await Promise.all([
    fetch(campaignUrl.toString()),
    fetch(adsetUrl.toString()),
  ])

  // ============ LAYER 7: HANDLE CAMPAIGN RESPONSE ============
  if (!campaignRes.ok) {
    const errorText = await campaignRes.text()
    logger.error('sync-marketing-meta-ads: campaign API error', errorText)
    throw createError({ statusCode: 502, statusMessage: `Meta campaign API error: ${campaignRes.status}` })
  }

  const campaignJson = await campaignRes.json() as { data?: any[] }
  const campaignData = campaignJson.data ?? []
  logger.info(`sync-marketing-meta-ads: fetched ${campaignData.length} campaign rows`)

  // ============ LAYER 8: HANDLE ADSET RESPONSE ============
  let adsetData: any[] = []
  if (adsetRes.ok) {
    const adsetJson = await adsetRes.json() as { data?: any[] }
    adsetData = adsetJson.data ?? []
    logger.info(`sync-marketing-meta-ads: fetched ${adsetData.length} adset rows`)
  } else {
    const errorText = await adsetRes.text()
    logger.warn('sync-marketing-meta-ads: adset API error (non-fatal)', errorText.slice(0, 200))
  }

  // ============ LAYER 9: UPSERT CAMPAIGN DATA ============
  const sumOutboundClicks = (outbound: any[]): number =>
    (outbound ?? []).reduce((s: number, v: any) => s + parseInt(v?.value ?? '0'), 0)

  let campaignUpserted = 0
  if (campaignData.length > 0) {
    const records = campaignData.map((row: any) => ({
      tenant_id: tenantId ?? null,
      date: row.date_start,
      campaign_id: String(row.campaign_id),
      campaign_name: row.campaign_name ?? '',
      spend: parseFloat(row.spend ?? '0'),
      impressions: parseInt(row.impressions ?? '0'),
      clicks: parseInt(row.clicks ?? '0'),
      link_clicks: sumOutboundClicks(row.outbound_clicks),
      reach: parseInt(row.reach ?? '0'),
      actions: row.actions ?? [],
    }))

    const { error } = await supabase
      .from('marketing_meta_ads_daily')
      .upsert(records, { onConflict: 'date,campaign_id' })

    if (error) {
      logger.error('sync-marketing-meta-ads: campaign upsert error', error)
      throw createError({ statusCode: 500, statusMessage: `Campaign upsert failed: ${error.message}` })
    }
    campaignUpserted = records.length
  }

  // ============ LAYER 10: UPSERT ADSET DATA ============
  let adsetUpserted = 0
  if (adsetData.length > 0) {
    const records = adsetData.map((row: any) => ({
      tenant_id: tenantId ?? null,
      date: row.date_start,
      campaign_id: String(row.campaign_id),
      campaign_name: row.campaign_name ?? '',
      adset_id: String(row.adset_id),
      adset_name: row.adset_name ?? '',
      spend: parseFloat(row.spend ?? '0'),
      impressions: parseInt(row.impressions ?? '0'),
      clicks: parseInt(row.clicks ?? '0'),
      link_clicks: sumOutboundClicks(row.outbound_clicks),
      reach: parseInt(row.reach ?? '0'),
      actions: row.actions ?? [],
    }))

    const { error } = await supabase
      .from('marketing_meta_adsets_daily')
      .upsert(records, { onConflict: 'date,adset_id' })

    if (error) {
      // Non-fatal: campaign data already saved, adset is bonus signal
      logger.warn('sync-marketing-meta-ads: adset upsert error (non-fatal)', error.message)
    } else {
      adsetUpserted = records.length
    }
  }

  // ============ LAYER 11: AD LEVEL SYNC (creative performance) ============
  const adFields = [
    'campaign_id', 'campaign_name', 'adset_id', 'adset_name',
    'ad_id', 'ad_name', 'spend', 'impressions', 'clicks', 'outbound_clicks', 'reach',
    'actions', 'date_start',
  ].join(',')

  const adUrl = new URL(`https://graph.facebook.com/v19.0/${adAccountId}/insights`)
  adUrl.searchParams.set('access_token', accessToken)
  adUrl.searchParams.set('fields', adFields)
  adUrl.searchParams.set('level', 'ad')
  adUrl.searchParams.set('time_range', timeRange)
  adUrl.searchParams.set('time_increment', '1')
  adUrl.searchParams.set('limit', '500')

  let adUpserted = 0
  let adData: any[] = []

  try {
    const adRes = await fetch(adUrl.toString())
    if (adRes.ok) {
      const adJson = await adRes.json() as { data?: any[] }
      adData = adJson.data ?? []
      logger.info(`sync-marketing-meta-ads: fetched ${adData.length} ad rows`)
    } else {
      logger.warn('sync-marketing-meta-ads: ad-level API error (non-fatal)', await adRes.text().then(t => t.slice(0, 200)))
    }
  } catch (err: any) {
    logger.warn('sync-marketing-meta-ads: ad-level fetch failed (non-fatal)', err?.message)
  }

  // ============ LAYER 12: FETCH CREATIVE CONTENT PER UNIQUE AD ============
  // Get unique ad_ids from insights, then batch-fetch their creative content
  const creativeByAdId = new Map<string, {
    creative_id?: string
    headline?: string
    body?: string
    description?: string
    image_hash?: string
    video_id?: string
    call_to_action?: string
  }>()

  const uniqueAdIds = [...new Set(adData.map((r: any) => String(r.ad_id)))]

  if (uniqueAdIds.length > 0) {
    // Fetch ad creatives in batches of 50 (Meta batch limit)
    for (let i = 0; i < uniqueAdIds.length; i += 50) {
      const batch = uniqueAdIds.slice(i, i + 50)
      try {
        const ids = batch.join(',')
        const creativeRes = await fetch(
          `https://graph.facebook.com/v19.0/?ids=${ids}&fields=creative{id,title,body,description,image_hash,video_id,call_to_action_type,object_story_spec}&access_token=${accessToken}`
        )
        if (!creativeRes.ok) continue
        const creativeJson = await creativeRes.json() as Record<string, any>

        for (const [adId, adObj] of Object.entries(creativeJson)) {
          if (!adObj || typeof adObj !== 'object') continue
          const cr = adObj.creative ?? {}
          const spec = cr.object_story_spec?.link_data ?? cr.object_story_spec?.video_data ?? {}

          // Prefer spec fields (most complete), fall back to top-level creative fields
          creativeByAdId.set(adId, {
            creative_id: cr.id ?? null,
            headline: spec.name ?? cr.title ?? null,
            body: spec.message ?? cr.body ?? null,
            description: spec.description ?? cr.description ?? null,
            image_hash: spec.image_hash ?? cr.image_hash ?? null,
            video_id: spec.video_id ?? cr.video_id ?? null,
            call_to_action: spec.call_to_action?.type ?? cr.call_to_action_type ?? null,
          })
        }
      } catch (err: any) {
        logger.warn('sync-marketing-meta-ads: creative batch fetch failed', err?.message)
      }
    }
    logger.info(`sync-marketing-meta-ads: enriched ${creativeByAdId.size} ads with creative content`)
  }

  // ============ LAYER 13: UPSERT AD DATA ============
  if (adData.length > 0) {
    const records = adData.map((row: any) => {
      const cr = creativeByAdId.get(String(row.ad_id)) ?? {}
      return {
        tenant_id: tenantId ?? null,
        date: row.date_start,
        campaign_id: String(row.campaign_id),
        campaign_name: row.campaign_name ?? '',
        adset_id: String(row.adset_id),
        adset_name: row.adset_name ?? '',
        ad_id: String(row.ad_id),
        ad_name: row.ad_name ?? '',
        spend: parseFloat(row.spend ?? '0'),
        impressions: parseInt(row.impressions ?? '0'),
        clicks: parseInt(row.clicks ?? '0'),
        link_clicks: sumOutboundClicks(row.outbound_clicks),
        reach: parseInt(row.reach ?? '0'),
        actions: row.actions ?? [],
        creative_id: cr.creative_id ?? null,
        headline: cr.headline ?? null,
        body: cr.body ?? null,
        description: cr.description ?? null,
        image_hash: cr.image_hash ?? null,
        video_id: cr.video_id ?? null,
        call_to_action: cr.call_to_action ?? null,
      }
    })

    const { error } = await supabase
      .from('marketing_meta_ads_ad_daily')
      .upsert(records, { onConflict: 'date,ad_id' })

    if (error) {
      logger.warn('sync-marketing-meta-ads: ad upsert error (non-fatal)', error.message)
    } else {
      adUpserted = records.length
    }
  }

  logger.info(`sync-marketing-meta-ads: done — ${campaignUpserted} campaign rows, ${adsetUpserted} adset rows, ${adUpserted} ad rows`)
  return { success: true, campaign_rows: campaignUpserted, adset_rows: adsetUpserted, ad_rows: adUpserted, tenant_id: tenantId }
})
