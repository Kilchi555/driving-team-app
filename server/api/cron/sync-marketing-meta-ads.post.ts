import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getTenantIdByMetaAdAccount } from '~/server/utils/marketing-tenant'

/**
 * Daily Meta Ads sync — runs at 04:20 via Vercel Cron.
 *
 * Fetches the last 30 days of performance data from Meta Marketing API at two levels:
 *   1. Campaign level  → marketing_meta_ads_daily
 *   2. Ad set level    → marketing_meta_adsets_daily
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
  const campaignFields = [
    'campaign_id', 'campaign_name', 'spend', 'impressions',
    'clicks', 'reach', 'actions', 'date_start',
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
    'spend', 'impressions', 'clicks', 'reach', 'actions', 'date_start',
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

  logger.info(`sync-marketing-meta-ads: done — ${campaignUpserted} campaign rows, ${adsetUpserted} adset rows`)
  return { success: true, campaign_rows: campaignUpserted, adset_rows: adsetUpserted, tenant_id: tenantId }
})
