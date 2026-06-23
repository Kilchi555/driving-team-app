import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantIdByGoogleAdsCustomer } from '~/server/utils/marketing-tenant'
import { logger } from '~/utils/logger'

// One-time backfill endpoint for Google Ads historical data.
// Secured via CRON_SECRET (same as all other cron jobs).
// Usage: POST /api/cron/backfill-google-ads
// Body: { "start_date": "2025-01-01", "end_date": "2026-06-23" }
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const startDate: string = body?.start_date ?? '2025-01-01'
  const endDate: string = body?.end_date ?? new Date().toISOString().split('T')[0]
  const tables: string[] = body?.tables ?? ['campaigns', 'keywords', 'search_terms']

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    return { success: false, reason: 'missing_credentials' }
  }

  // ── Access token ──────────────────────────────────────────────────────────
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  const tokenData = await tokenRes.json() as any
  if (!tokenData.access_token) return { success: false, reason: 'token_error', detail: tokenData }
  const accessToken = tokenData.access_token

  const supabase = getSupabaseAdmin()
  const tenantId = await getTenantIdByGoogleAdsCustomer(customerId)
  const adsUrl = `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`
  const adsHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'login-customer-id': customerId,
    'Content-Type': 'application/json',
  }

  const runQuery = async (gaql: string): Promise<any[]> => {
    const res = await fetch(adsUrl, { method: 'POST', headers: adsHeaders, body: JSON.stringify({ query: gaql.trim() }) })
    const text = await res.text()
    const data = JSON.parse(text)
    if (!res.ok) throw new Error(JSON.stringify(data).substring(0, 300))
    return data.results ?? []
  }

  const parseIS = (v: any) => (v === null || v === undefined || v === '--') ? null : (isNaN(Number(v)) ? null : Number(v))
  const parseQS = (v: any) => (!v || v === 0 || isNaN(Number(v))) ? null : (Number(v) === 0 ? null : Number(v))
  const parseQuality = (v: any) => (!v || v === 'UNSPECIFIED' || v === 'UNKNOWN') ? null : String(v)

  const results: Record<string, { rows: number; error?: string }> = {}

  // ── 1. CAMPAIGNS ─────────────────────────────────────────────────────────
  if (tables.includes('campaigns')) {
    try {
      logger.info(`backfill-google-ads: fetching campaigns ${startDate} → ${endDate}`)
      const rows = await runQuery(`
        SELECT campaign.id, campaign.name, segments.date,
          metrics.cost_micros, metrics.clicks, metrics.impressions,
          metrics.conversions, metrics.conversions_value, metrics.average_cpc,
          metrics.search_impression_share,
          metrics.search_budget_lost_impression_share,
          metrics.search_rank_lost_impression_share
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND campaign.status != 'REMOVED'
          AND campaign.advertising_channel_type = 'SEARCH'
        ORDER BY segments.date DESC
      `)
      const records = rows.map((row: any) => ({
        tenant_id: tenantId,
        date: row.segments?.date ?? '',
        campaign_id: String(row.campaign?.id ?? ''),
        campaign_name: row.campaign?.name ?? '',
        cost_micros: Math.round(Number(row.metrics?.costMicros ?? 0)),
        clicks: Math.round(Number(row.metrics?.clicks ?? 0)),
        impressions: Math.round(Number(row.metrics?.impressions ?? 0)),
        conversions: Number(row.metrics?.conversions ?? 0),
        conversions_value: Number(row.metrics?.conversionsValue ?? 0),
        cpc_micros: Math.round(Number(row.metrics?.averageCpc ?? 0)),
        impression_share: parseIS(row.metrics?.searchImpressionShare),
        budget_lost_is: parseIS(row.metrics?.searchBudgetLostImpressionShare),
        rank_lost_is: parseIS(row.metrics?.searchRankLostImpressionShare),
      })).filter((r: any) => r.date && r.campaign_id)

      // Batch upsert in chunks of 500
      for (let i = 0; i < records.length; i += 500) {
        const { error } = await supabase.from('marketing_google_ads_daily')
          .upsert(records.slice(i, i + 500), { onConflict: 'tenant_id,date,campaign_id' })
        if (error) throw new Error(error.message)
      }
      results.campaigns = { rows: records.length }
      logger.info(`backfill-google-ads: campaigns done (${records.length} rows)`)
    } catch (err: any) {
      results.campaigns = { rows: 0, error: err.message }
      logger.error('backfill-google-ads campaigns error', err.message)
    }
  }

  // ── 2. KEYWORDS ───────────────────────────────────────────────────────────
  if (tables.includes('keywords')) {
    try {
      logger.info(`backfill-google-ads: fetching keywords ${startDate} → ${endDate}`)
      const rows = await runQuery(`
        SELECT campaign.id, campaign.name, ad_group.id, ad_group.name,
          ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
          ad_group_criterion.quality_info.quality_score,
          ad_group_criterion.quality_info.post_click_quality_score,
          ad_group_criterion.quality_info.creative_quality_score,
          segments.date,
          metrics.cost_micros, metrics.clicks, metrics.impressions,
          metrics.conversions, metrics.conversions_value, metrics.average_cpc
        FROM keyword_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND campaign.status != 'REMOVED'
          AND ad_group.status != 'REMOVED'
          AND ad_group_criterion.status != 'REMOVED'
          AND metrics.impressions > 0
        ORDER BY segments.date DESC, metrics.cost_micros DESC
      `)
      const records = rows
        .filter((row: any) => row.adGroupCriterion?.keyword?.text)
        .map((row: any) => ({
          tenant_id: tenantId,
          date: row.segments?.date ?? '',
          campaign_id: String(row.campaign?.id ?? ''),
          campaign_name: row.campaign?.name ?? '',
          ad_group_id: String(row.adGroup?.id ?? ''),
          ad_group_name: row.adGroup?.name ?? '',
          keyword: row.adGroupCriterion?.keyword?.text ?? '',
          match_type: row.adGroupCriterion?.keyword?.matchType ?? '',
          cost_micros: Math.round(Number(row.metrics?.costMicros ?? 0)),
          clicks: Math.round(Number(row.metrics?.clicks ?? 0)),
          impressions: Math.round(Number(row.metrics?.impressions ?? 0)),
          conversions: Number(row.metrics?.conversions ?? 0),
          conversions_value: Number(row.metrics?.conversionsValue ?? 0),
          cpc_micros: Math.round(Number(row.metrics?.averageCpc ?? 0)),
          quality_score: parseQS(row.adGroupCriterion?.qualityInfo?.qualityScore),
          post_click_quality: parseQuality(row.adGroupCriterion?.qualityInfo?.postClickQualityScore),
          creative_quality: parseQuality(row.adGroupCriterion?.qualityInfo?.creativeQualityScore),
        }))
        .filter((r: any) => r.date && r.keyword)

      for (let i = 0; i < records.length; i += 500) {
        const { error } = await supabase.from('marketing_google_ads_keywords_daily')
          .upsert(records.slice(i, i + 500), { onConflict: 'tenant_id,date,campaign_id,ad_group_id,keyword,match_type' })
        if (error) throw new Error(error.message)
      }
      results.keywords = { rows: records.length }
      logger.info(`backfill-google-ads: keywords done (${records.length} rows)`)
    } catch (err: any) {
      results.keywords = { rows: 0, error: err.message }
      logger.error('backfill-google-ads keywords error', err.message)
    }
  }

  // ── 3. SEARCH TERMS ───────────────────────────────────────────────────────
  if (tables.includes('search_terms')) {
    try {
      logger.info(`backfill-google-ads: fetching search terms ${startDate} → ${endDate}`)
      const rows = await runQuery(`
        SELECT campaign.id, campaign.name, ad_group.id, ad_group.name,
          search_term_view.search_term,
          segments.keyword.info.text, segments.keyword.info.match_type,
          segments.date,
          metrics.cost_micros, metrics.clicks, metrics.impressions,
          metrics.conversions, metrics.conversions_value
        FROM search_term_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND campaign.status != 'REMOVED'
          AND ad_group.status != 'REMOVED'
          AND metrics.impressions > 0
        ORDER BY segments.date DESC, metrics.cost_micros DESC
      `)
      const records = rows
        .filter((row: any) => row.searchTermView?.searchTerm)
        .map((row: any) => ({
          tenant_id: tenantId,
          date: row.segments?.date ?? '',
          campaign_id: String(row.campaign?.id ?? ''),
          campaign_name: row.campaign?.name ?? '',
          ad_group_id: String(row.adGroup?.id ?? ''),
          ad_group_name: row.adGroup?.name ?? '',
          search_term: row.searchTermView?.searchTerm ?? '',
          match_type: row.segments?.keyword?.info?.matchType ?? '',
          keyword_text: row.segments?.keyword?.info?.text ?? '',
          cost_micros: Math.round(Number(row.metrics?.costMicros ?? 0)),
          clicks: Math.round(Number(row.metrics?.clicks ?? 0)),
          impressions: Math.round(Number(row.metrics?.impressions ?? 0)),
          conversions: Number(row.metrics?.conversions ?? 0),
          conversions_value: Number(row.metrics?.conversionsValue ?? 0),
        }))
        .filter((r: any) => r.date && r.search_term)

      for (let i = 0; i < records.length; i += 500) {
        const { error } = await supabase.from('marketing_google_ads_search_terms_daily')
          .upsert(records.slice(i, i + 500), { onConflict: 'tenant_id,date,campaign_id,ad_group_id,search_term' })
        if (error) throw new Error(error.message)
      }
      results.search_terms = { rows: records.length }
      logger.info(`backfill-google-ads: search_terms done (${records.length} rows)`)
    } catch (err: any) {
      results.search_terms = { rows: 0, error: err.message }
      logger.error('backfill-google-ads search_terms error', err.message)
    }
  }

  return { success: true, start_date: startDate, end_date: endDate, results }
})
