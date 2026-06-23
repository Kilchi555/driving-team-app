import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantIdByGoogleAdsCustomer } from '~/server/utils/marketing-tenant'
import { logger } from '~/utils/logger'

// Fetches the last 7 days of Google Ads search terms (actual queries that triggered ads)
// and upserts into marketing_google_ads_search_terms_daily.
// Runs daily at 04:50 via Vercel Cron.
// Key use case: identify wasted spend from irrelevant search terms → negative keywords.
export default defineEventHandler(async (event) => {
  // ============ LAYER 1: CRON AUTH ============
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // ============ LAYER 2: ENV CHECK ============
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    logger.warn('sync-google-ads-search-terms: missing credentials, skipping')
    return { success: false, reason: 'missing_credentials' }
  }

  logger.info('sync-google-ads-search-terms: starting sync')

  try {
    // ── Get access token ──────────────────────────────────────────────────────
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const tokenData = await tokenRes.json() as any
    if (!tokenData.access_token) {
      return { success: false, reason: 'token_error', detail: tokenData }
    }
    const accessToken = tokenData.access_token

    // ── Query search term view ────────────────────────────────────────────────
    // search_term_view shows the actual queries users typed, not just the keyword.
    // ADDED_AUTOMATICALLY terms are auto-added broad match targets — include them.
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        search_term_view.search_term,
        search_term_view.status,
        segments.keyword.info.text,
        segments.keyword.info.match_type,
        segments.date,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.conversions,
        metrics.conversions_value
      FROM search_term_view
      WHERE segments.date DURING LAST_7_DAYS
        AND campaign.status != 'REMOVED'
        AND ad_group.status != 'REMOVED'
        AND metrics.impressions > 0
      ORDER BY segments.date DESC, metrics.cost_micros DESC
    `

    const adsRes = await fetch(
      `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': customerId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      }
    )

    const rawText = await adsRes.text()
    let adsData: any
    try { adsData = JSON.parse(rawText) } catch {
      return { success: false, reason: 'non_json', status: adsRes.status, body: rawText.substring(0, 500) }
    }

    if (!adsRes.ok) {
      logger.error('sync-google-ads-search-terms: API error', adsData)
      return { success: false, reason: 'ads_api_error', status: adsRes.status, detail: adsData }
    }

    const apiRows: any[] = adsData.results ?? []
    logger.info(`sync-google-ads-search-terms: fetched ${apiRows.length} search term rows`)

    // ── Upsert ────────────────────────────────────────────────────────────────
    const supabase = getSupabaseAdmin()
    const tenantId = await getTenantIdByGoogleAdsCustomer(customerId)

    const records = apiRows
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
      .filter(r => r.date && r.search_term)

    if (records.length > 0) {
      const { error } = await supabase
        .from('marketing_google_ads_search_terms_daily')
        .upsert(records, { onConflict: 'tenant_id,date,campaign_id,ad_group_id,search_term' })

      if (error) {
        logger.error('sync-google-ads-search-terms: upsert error', error)
        return { success: false, reason: 'db_upsert_error', detail: error.message }
      }
    }

    logger.info(`sync-google-ads-search-terms: upserted ${records.length} rows`)
    return { success: true, rows: records.length }

  } catch (err: any) {
    logger.error('sync-google-ads-search-terms: unexpected error', err?.message ?? err)
    return { success: false, reason: 'unexpected_error', detail: err?.message ?? String(err) }
  }
})
