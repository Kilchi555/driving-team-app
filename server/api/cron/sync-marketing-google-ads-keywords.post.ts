import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantIdByGoogleAdsCustomer } from '~/server/utils/marketing-tenant'
import { logger } from '~/utils/logger'

// Fetches keyword-level Google Ads performance (last 7 days) and upserts into
// marketing_google_ads_keywords_daily. Runs daily at 04:30 via Vercel Cron.
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    logger.warn('sync-google-ads-keywords: missing credentials, skipping')
    return { success: false, reason: 'missing_credentials' }
  }

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

    // ── Query keyword-level performance ──────────────────────────────────────
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        segments.date,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.conversions,
        metrics.average_cpc
      FROM keyword_view
      WHERE segments.date DURING LAST_7_DAYS
        AND campaign.status != 'REMOVED'
        AND ad_group.status != 'REMOVED'
        AND ad_group_criterion.status != 'REMOVED'
        AND metrics.impressions > 0
      ORDER BY segments.date DESC, metrics.clicks DESC
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
      logger.error('sync-google-ads-keywords: API error', adsData)
      return { success: false, reason: 'ads_api_error', status: adsRes.status, detail: adsData }
    }

    const apiRows: any[] = adsData.results ?? []
    logger.info(`sync-google-ads-keywords: fetched ${apiRows.length} keyword rows`)

    // ── Upsert ────────────────────────────────────────────────────────────────
    const supabase = getSupabaseAdmin()
    const tenantId = await getTenantIdByGoogleAdsCustomer(customerId)

    const records = apiRows
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
        cpc_micros: Math.round(Number(row.metrics?.averageCpc ?? 0)),
      }))
      .filter(r => r.date && r.keyword)

    if (records.length > 0) {
      const { error } = await supabase
        .from('marketing_google_ads_keywords_daily')
        .upsert(records, { onConflict: 'tenant_id,date,campaign_id,ad_group_id,keyword,match_type' })

      if (error) {
        logger.error('sync-google-ads-keywords: upsert error', error)
        return { success: false, reason: 'db_upsert_error', detail: error.message }
      }
    }

    logger.info(`sync-google-ads-keywords: upserted ${records.length} keyword rows`)
    return { success: true, rows: records.length }

  } catch (err: any) {
    logger.error('sync-google-ads-keywords: unexpected error', err?.message ?? err)
    return { success: false, reason: 'unexpected_error', detail: err?.message ?? String(err) }
  }
})
