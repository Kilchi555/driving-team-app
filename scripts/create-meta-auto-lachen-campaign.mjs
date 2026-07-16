// Creates the "B Automatik/Schaltung Lachen" campaign shell (campaign + 1 ad set).
// Deliberately lean (1 ad set, not 6+ micro-geo adsets like the Zürich campaign) —
// lesson learned from the Zürich analysis (over-segmentation wasted ~34% of budget).
// No ad/creative yet — waiting on new images from the customer before going live.
import fs from 'fs'

function loadEnv(path) {
  const raw = fs.readFileSync(path, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '').replace(/\\n/g, '').trim()
  }
  return env
}

const env = loadEnv('.env.meta-actions')
const TOKEN = env.META_SYSTEM_USER_TOKEN || env.META_ACCESS_TOKEN
const AD_ACCOUNT = env.META_AD_ACCOUNT_ID
const PIXEL_ID = env.META_PIXEL_ID
const GRAPH = 'https://graph.facebook.com/v19.0'

async function metaPost(path, body) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(`[${path}] ${data.error?.message ?? JSON.stringify(data)}`)
  }
  return data
}

// Lachen SZ + 25km — same geo already used for Anhänger/LKW Lachen campaigns
const LACHEN_GEO = {
  geo_locations: {
    custom_locations: [
      { latitude: 47.1975, longitude: 8.8533, radius: 25, distance_unit: 'kilometer' },
    ],
  },
}

async function main() {
  console.log('Creating campaign: DT — B Automatik Lachen (PAUSED)')
  const campaign = await metaPost(`${AD_ACCOUNT}/campaigns`, {
    name: 'DT — B Automatik Lachen',
    objective: 'OUTCOME_SALES',
    status: 'PAUSED',
    special_ad_categories: [],
    is_adset_budget_sharing_enabled: false,
  })
  console.log(`  campaign id: ${campaign.id}`)

  console.log('Creating ad set: Auto — Broad 18-30 Lachen (PAUSED, CHF 10/Tag)')
  const adset = await metaPost(`${AD_ACCOUNT}/adsets`, {
    name: 'Auto — Broad 18-30 Lachen',
    campaign_id: campaign.id,
    daily_budget: 1000, // CHF 10.00
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'OFFSITE_CONVERSIONS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting: {
      ...LACHEN_GEO,
      age_min: 18,
      age_max: 30,
      targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
      targeting_automation: { advantage_audience: 0 },
      publisher_platforms: ['facebook', 'instagram', 'audience_network', 'messenger'],
    },
    is_dynamic_creative: true,
    promoted_object: {
      pixel_id: PIXEL_ID,
      custom_event_type: 'PURCHASE',
    },
    status: 'PAUSED',
  })
  console.log(`  adset id: ${adset.id}`)

  console.log('\n=== Done ===')
  console.log(`Campaign: ${campaign.id} (PAUSED)`)
  console.log(`Ad set:   ${adset.id} (PAUSED, CHF 10/Tag, Lachen +25km, Alter 17-35)`)
  console.log('\nNoch offen: Creative/Ad — wartet auf neue Bilder. Danach: adcreative + ad erstellen, dann Status auf ACTIVE.')
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
