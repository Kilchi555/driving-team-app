// One-off backfill for the Meta Ads sync gap caused by the corrupted
// META_SYSTEM_USER_TOKEN / META_AD_ACCOUNT_ID env vars (trailing "\n").
// Re-fetches campaign / adset / ad level insights for the missing window
// and upserts using the exact same shape as server/api/cron/sync-marketing-meta-ads.post.ts.
//
// Usage: node scripts/backfill-meta-ads.mjs <since> <until>   (YYYY-MM-DD, inclusive)

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

function loadEnvFile(path) {
  const out = {}
  const text = fs.readFileSync(path, 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let val = m[2]
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    val = val.replace(/\\n$/, '').replace(/\n$/, '')
    out[m[1]] = val
  }
  return out
}

const env = { ...loadEnvFile('.env.vercel.verify') }
const SUPABASE_URL = env.SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const ACCESS_TOKEN = env.META_SYSTEM_USER_TOKEN
const AD_ACCOUNT_ID = env.META_AD_ACCOUNT_ID
const TENANT_ID = '64259d68-195a-4c68-8875-f1b44d962830'

if (!SUPABASE_URL || !SERVICE_KEY || !ACCESS_TOKEN || !AD_ACCOUNT_ID) {
  console.error('Missing required env vars in .env.vercel.verify')
  process.exit(1)
}

const since = process.argv[2]
const until = process.argv[3]
if (!since || !until) {
  console.error('Usage: node scripts/backfill-meta-ads.mjs <since YYYY-MM-DD> <until YYYY-MM-DD>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const timeRange = JSON.stringify({ since, until })
const GRAPH = 'https://graph.facebook.com/v19.0'

const sumOutboundClicks = (outbound) =>
  (outbound ?? []).reduce((s, v) => s + parseInt(v?.value ?? '0'), 0)

async function fetchInsights(level, fields) {
  const url = new URL(`${GRAPH}/${AD_ACCOUNT_ID}/insights`)
  url.searchParams.set('access_token', ACCESS_TOKEN)
  url.searchParams.set('fields', fields.join(','))
  url.searchParams.set('level', level)
  url.searchParams.set('time_range', timeRange)
  url.searchParams.set('time_increment', '1')
  url.searchParams.set('limit', '500')
  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${level} insights API error ${res.status}: ${text.slice(0, 500)}`)
  }
  const json = await res.json()
  return json.data ?? []
}

async function main() {
  console.log(`Backfilling Meta Ads data ${since} -> ${until} (tenant ${TENANT_ID})`)

  // ---- Campaign level ----
  const campaignData = await fetchInsights('campaign', [
    'campaign_id', 'campaign_name', 'spend', 'impressions', 'clicks', 'outbound_clicks', 'reach', 'actions', 'date_start',
  ])
  console.log(`Fetched ${campaignData.length} campaign-day rows`)

  const campaignRecords = campaignData.map((row) => ({
    tenant_id: TENANT_ID,
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

  if (campaignRecords.length > 0) {
    const { error } = await supabase.from('marketing_meta_ads_daily').upsert(campaignRecords, { onConflict: 'date,campaign_id' })
    if (error) throw new Error(`campaign upsert failed: ${error.message}`)
    console.log(`Upserted ${campaignRecords.length} campaign rows`)
  }

  // ---- Ad set level ----
  const adsetData = await fetchInsights('adset', [
    'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'spend', 'impressions', 'clicks', 'outbound_clicks', 'reach', 'actions', 'date_start',
  ])
  console.log(`Fetched ${adsetData.length} adset-day rows`)

  const adsetRecords = adsetData.map((row) => ({
    tenant_id: TENANT_ID,
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

  if (adsetRecords.length > 0) {
    const { error } = await supabase.from('marketing_meta_adsets_daily').upsert(adsetRecords, { onConflict: 'date,adset_id' })
    if (error) throw new Error(`adset upsert failed: ${error.message}`)
    console.log(`Upserted ${adsetRecords.length} adset rows`)
  }

  // ---- Ad level + creatives ----
  const adData = await fetchInsights('ad', [
    'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name', 'spend', 'impressions', 'clicks', 'outbound_clicks', 'reach', 'actions', 'date_start',
  ])
  console.log(`Fetched ${adData.length} ad-day rows`)

  const uniqueAdIds = [...new Set(adData.map((r) => String(r.ad_id)))]
  const creativeByAdId = new Map()

  for (let i = 0; i < uniqueAdIds.length; i += 50) {
    const batch = uniqueAdIds.slice(i, i + 50)
    const ids = batch.join(',')
    const res = await fetch(
      `${GRAPH}/?ids=${ids}&fields=creative{id,title,body,description,image_hash,video_id,call_to_action_type,object_story_spec}&access_token=${ACCESS_TOKEN}`
    )
    if (!res.ok) continue
    const json = await res.json()
    for (const [adId, adObj] of Object.entries(json)) {
      if (!adObj || typeof adObj !== 'object') continue
      const cr = adObj.creative ?? {}
      const spec = cr.object_story_spec?.link_data ?? cr.object_story_spec?.video_data ?? {}
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
  }
  console.log(`Enriched ${creativeByAdId.size} ads with creative content`)

  const adRecords = adData.map((row) => {
    const cr = creativeByAdId.get(String(row.ad_id)) ?? {}
    return {
      tenant_id: TENANT_ID,
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

  if (adRecords.length > 0) {
    const { error } = await supabase.from('marketing_meta_ads_ad_daily').upsert(adRecords, { onConflict: 'date,ad_id' })
    if (error) throw new Error(`ad upsert failed: ${error.message}`)
    console.log(`Upserted ${adRecords.length} ad rows`)
  }

  console.log('Backfill complete.')
}

main().catch((err) => {
  console.error('Backfill failed:', err.message)
  process.exit(1)
})
