/**
 * Google Ads Backfill Script
 * Usage: npx tsx server/scripts/backfill-google-ads.ts
 * Backfills all historical Google Ads data: campaigns, keywords, search terms.
 * Reads credentials from .env file.
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET!
const REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN!
const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID!
const MARKETING_TENANT_ID = process.env.MARKETING_TENANT_ID!

// Backfill range — Google Ads keeps data for ~3 years
const START_DATE = '2025-01-01'
const END_DATE = new Date().toISOString().split('T')[0]

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as any
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

async function runGaqlQuery(accessToken: string, gaql: string): Promise<any[]> {
  const res = await fetch(
    `https://googleads.googleapis.com/v23/customers/${CUSTOMER_ID}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
        'login-customer-id': CUSTOMER_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: gaql.trim() }),
    }
  )
  const text = await res.text()
  const data = JSON.parse(text)
  if (!res.ok) throw new Error(`Ads API error: ${JSON.stringify(data).substring(0, 400)}`)
  return data.results ?? []
}

async function getTenantId(): Promise<string> {
  if (MARKETING_TENANT_ID) return MARKETING_TENANT_ID

  const cidClean = CUSTOMER_ID.replace(/-/g, '')
  const cidDashes = cidClean.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .in('google_ads_customer_id', [cidClean, cidDashes])
    .maybeSingle()
  if (!data?.id) throw new Error('Could not resolve tenant_id. Set MARKETING_TENANT_ID in .env')
  return data.id
}

const parseIS = (v: any): number | null => {
  if (v === null || v === undefined || v === '--') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
const parseQS = (v: any): number | null => {
  if (!v || v === 0) return null
  const n = Number(v)
  return isNaN(n) || n === 0 ? null : n
}
const parseQuality = (v: any): string | null => {
  if (!v || v === 'UNSPECIFIED' || v === 'UNKNOWN') return null
  return String(v)
}

async function backfillCampaigns(accessToken: string, tenantId: string) {
  console.log('📊 Fetching campaign data...')
  const rows = await runGaqlQuery(accessToken, `
    SELECT
      campaign.id, campaign.name, segments.date,
      metrics.cost_micros, metrics.clicks, metrics.impressions,
      metrics.conversions, metrics.conversions_value, metrics.average_cpc,
      metrics.search_impression_share,
      metrics.search_budget_lost_impression_share,
      metrics.search_rank_lost_impression_share
    FROM campaign
    WHERE segments.date BETWEEN '${START_DATE}' AND '${END_DATE}'
      AND campaign.status != 'REMOVED'
      AND campaign.advertising_channel_type = 'SEARCH'
    ORDER BY segments.date DESC
  `)
  console.log(`   → ${rows.length} rows fetched`)

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

  // Upsert in batches of 500
  for (let i = 0; i < records.length; i += 500) {
    const batch = records.slice(i, i + 500)
    const { error } = await supabase
      .from('marketing_google_ads_daily')
      .upsert(batch, { onConflict: 'tenant_id,date,campaign_id' })
    if (error) throw new Error(`Campaign upsert error: ${error.message}`)
    process.stdout.write(`   → upserted ${Math.min(i + 500, records.length)}/${records.length}\r`)
  }
  console.log(`\n   ✅ Campaigns done: ${records.length} rows`)
}

async function backfillKeywords(accessToken: string, tenantId: string) {
  console.log('🔑 Fetching keyword data...')
  const rows = await runGaqlQuery(accessToken, `
    SELECT
      campaign.id, campaign.name,
      ad_group.id, ad_group.name,
      ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
      ad_group_criterion.quality_info.quality_score,
      ad_group_criterion.quality_info.post_click_quality_score,
      ad_group_criterion.quality_info.creative_quality_score,
      segments.date,
      metrics.cost_micros, metrics.clicks, metrics.impressions,
      metrics.conversions, metrics.conversions_value, metrics.average_cpc
    FROM keyword_view
    WHERE segments.date BETWEEN '${START_DATE}' AND '${END_DATE}'
      AND campaign.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'
      AND ad_group_criterion.status != 'REMOVED'
      AND metrics.impressions > 0
    ORDER BY segments.date DESC, metrics.cost_micros DESC
  `)
  console.log(`   → ${rows.length} rows fetched`)

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
    const batch = records.slice(i, i + 500)
    const { error } = await supabase
      .from('marketing_google_ads_keywords_daily')
      .upsert(batch, { onConflict: 'tenant_id,date,campaign_id,ad_group_id,keyword,match_type' })
    if (error) throw new Error(`Keywords upsert error: ${error.message}`)
    process.stdout.write(`   → upserted ${Math.min(i + 500, records.length)}/${records.length}\r`)
  }
  console.log(`\n   ✅ Keywords done: ${records.length} rows`)
}

async function backfillSearchTerms(accessToken: string, tenantId: string) {
  console.log('🔍 Fetching search terms data...')
  const rows = await runGaqlQuery(accessToken, `
    SELECT
      campaign.id, campaign.name,
      ad_group.id, ad_group.name,
      search_term_view.search_term,
      segments.keyword.info.text, segments.keyword.info.match_type,
      segments.date,
      metrics.cost_micros, metrics.clicks, metrics.impressions,
      metrics.conversions, metrics.conversions_value
    FROM search_term_view
    WHERE segments.date BETWEEN '${START_DATE}' AND '${END_DATE}'
      AND campaign.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'
      AND metrics.impressions > 0
    ORDER BY segments.date DESC, metrics.cost_micros DESC
  `)
  console.log(`   → ${rows.length} rows fetched`)

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
    const batch = records.slice(i, i + 500)
    const { error } = await supabase
      .from('marketing_google_ads_search_terms_daily')
      .upsert(batch, { onConflict: 'tenant_id,date,campaign_id,ad_group_id,search_term' })
    if (error) throw new Error(`Search terms upsert error: ${error.message}`)
    process.stdout.write(`   → upserted ${Math.min(i + 500, records.length)}/${records.length}\r`)
  }
  console.log(`\n   ✅ Search terms done: ${records.length} rows`)
}

async function main() {
  console.log(`\n🚀 Google Ads Backfill: ${START_DATE} → ${END_DATE}`)
  console.log(`   Customer: ${CUSTOMER_ID}\n`)

  if (!DEVELOPER_TOKEN || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !CUSTOMER_ID) {
    console.error('❌ Missing credentials in .env')
    process.exit(1)
  }

  const accessToken = await getAccessToken()
  console.log('✅ Access token acquired\n')

  const tenantId = await getTenantId()
  console.log(`✅ Tenant ID: ${tenantId}\n`)

  await backfillCampaigns(accessToken, tenantId)
  await backfillKeywords(accessToken, tenantId)
  await backfillSearchTerms(accessToken, tenantId)

  console.log('\n🎉 Backfill complete!')
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
