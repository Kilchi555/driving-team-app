// Restructure Auto Meta campaigns:
// - Micro adsets → CHF 3/Tag (runterskalieren)
// - 2 neue Zürich-Adsets à CHF 30/Tag
// - Auto Lachen → CHF 30/Tag
// - LKW Kampagne pausieren
import fs from 'fs'
import path from 'path'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const env = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '').replace(/\\n/g, '').trim()
  }
  return env
}

const env = {
  ...loadEnvFile(path.join(process.cwd(), '.env.vercel.production')),
  ...loadEnvFile(path.join(process.cwd(), '.env.meta-actions')),
}
const TOKEN = env.META_SYSTEM_USER_TOKEN
const AD_ACCOUNT = env.META_AD_ACCOUNT_ID
const PIXEL_ID = '1523803071276836'
const GRAPH = 'https://graph.facebook.com/v19.0'

const CAMPAIGN_ZUERICH = '52577807288671'
const CAMPAIGN_LACHEN = '52609910935671'
const CAMPAIGN_LKW = '52577814487671'
const ADSET_LACHEN = '52609910939071'

const BUDGET_MICRO = 300 // CHF 3.00
const BUDGET_MAIN = 3000 // CHF 30.00

const CREATIVE_BROAD = '1366632122026181'
const CREATIVE_WARM = '1719573309355442'
const AUDIENCE_WEBSITE_30D = '6284649063867'

const MICRO_ADSETS = [
  ['Auto — Fahrschule Pfäffikon SZ / Freienbach / Wollerau', '52579879422071'],
  ['Auto — Fahrschule Lachen / Pfäffikon / Altendorf', '52579875016671', true], // pause: duplicate Lachen campaign
  ['Auto — Fahrschule Schlieren / Urdorf / Geroldswil', '52579873181271'],
  ['Auto — Fahrschule Uitikon / Schlieren / Oberengstringen', '52579871693071'],
  ['Auto — Fahrschule Dietikon / Killwangen / Weiningen', '52579869760671'],
  ['Auto — Fahrschule Spreitenbach / Dietikon / Urdorf', '52579867632471'],
  ['Auto — Fahrschule Birmensdorf / Uitikon / Wettswil', '52579866384271'],
]

const LEGACY_CORE_ADSETS = [
  ['Auto — Fahrschule Altstetten / Zürich', '52579865974871'],
  ['Auto — Lookalike 1% Altstetten', '52577810040071'],
  ['Auto — Broad 18-30 Altstetten', '52577810066671'],
]

const PLACEMENTS = {
  publisher_platforms: ['facebook', 'instagram'],
  facebook_positions: ['feed', 'story'],
  instagram_positions: ['stream', 'story', 'reels'],
}

const ZUERICH_GEO_20KM = {
  geo_locations: {
    custom_locations: [
      { latitude: 47.3905, longitude: 8.4878, radius: 20, distance_unit: 'kilometer' },
    ],
    location_types: ['home', 'recent'],
  },
  age_min: 18,
  age_max: 30,
  targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
  targeting_automation: { advantage_audience: 0 },
  ...PLACEMENTS,
}

const WARM_TARGETING = {
  ...ZUERICH_GEO_20KM,
  custom_audiences: [{ id: AUDIENCE_WEBSITE_30D }],
}

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

async function run(label, fn) {
  try {
    const result = await fn()
    console.log(`OK   ${label}`)
    return { ok: true, result, label }
  } catch (err) {
    console.log(`FAIL ${label}: ${err.message}`)
    return { ok: false, error: err.message, label }
  }
}

async function createDynamicAd(adsetId, name, creativeId) {
  return metaPost(`${AD_ACCOUNT}/ads`, {
    name,
    adset_id: adsetId,
    creative: { creative_id: creativeId },
    status: 'ACTIVE',
  })
}

async function main() {
  if (!TOKEN || !AD_ACCOUNT) throw new Error('Missing META credentials')

  const results = []

  // LKW pausieren
  results.push(await run('Pause LKW campaign', () =>
    metaPost(CAMPAIGN_LKW, { status: 'PAUSED' }),
  ))

  // Micro runterskalieren
  for (const [name, id, shouldPause] of MICRO_ADSETS) {
    results.push(await run(`Micro budget CHF 3: ${name}`, () =>
      metaPost(id, {
        daily_budget: BUDGET_MICRO,
        ...(shouldPause ? { status: 'PAUSED' } : { status: 'ACTIVE' }),
      }),
    ))
  }

  // Legacy core runterskalieren + pausieren (ersetzt durch neue Adsets)
  for (const [name, id] of LEGACY_CORE_ADSETS) {
    results.push(await run(`Legacy pause + CHF 3: ${name}`, () =>
      metaPost(id, { daily_budget: BUDGET_MICRO, status: 'PAUSED' }),
    ))
  }

  // Auto Lachen → CHF 30/Tag
  results.push(await run('Auto Lachen adset → CHF 30/Tag', () =>
    metaPost(ADSET_LACHEN, { daily_budget: BUDGET_MAIN, status: 'ACTIVE' }),
  ))
  results.push(await run('Auto Lachen campaign ACTIVE', () =>
    metaPost(CAMPAIGN_LACHEN, { status: 'ACTIVE' }),
  ))

  // Neues Adset 1: Core Zürich Broad 20km
  const coreAdset = await run('Create adset: Core Zürich 18-30 Radius 20km', () =>
    metaPost(`${AD_ACCOUNT}/adsets`, {
      name: 'Auto — Core Zürich 18-30 Radius 20km',
      campaign_id: CAMPAIGN_ZUERICH,
      daily_budget: BUDGET_MAIN,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting: ZUERICH_GEO_20KM,
      is_dynamic_creative: true,
      promoted_object: {
        pixel_id: PIXEL_ID,
        custom_event_type: 'PURCHASE',
      },
      status: 'ACTIVE',
    }),
  )
  if (coreAdset.ok) {
    results.push(await run('Create ad: Core Zürich', () =>
      createDynamicAd(coreAdset.result.id, 'DT Ad — Auto Core Zürich Mar 2026', CREATIVE_BROAD),
    ))
  }

  // Neues Adset 2: Website Besucher 30d (Warm)
  const warmAdset = await run('Create adset: Warm Audience 30d Zürich', () =>
    metaPost(`${AD_ACCOUNT}/adsets`, {
      name: 'Auto — Warm Audience 30d Zürich',
      campaign_id: CAMPAIGN_ZUERICH,
      daily_budget: BUDGET_MAIN,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting: WARM_TARGETING,
      is_dynamic_creative: true,
      promoted_object: {
        pixel_id: PIXEL_ID,
        custom_event_type: 'PURCHASE',
      },
      status: 'ACTIVE',
    }),
  )
  if (warmAdset.ok) {
    results.push(await run('Create ad: Warm Audience Zürich', () =>
      createDynamicAd(warmAdset.result.id, 'DT Ad — Auto Warm Zürich Mar 2026', CREATIVE_WARM),
    ))
  }

  results.push(await run('Zürich campaign ACTIVE', () =>
    metaPost(CAMPAIGN_ZUERICH, { status: 'ACTIVE' }),
  ))

  console.log('\n=== Summary ===')
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.label}${r.ok && r.result?.id ? ` → ${r.result.id}` : r.ok ? '' : ` — ${r.error}`}`)
  }

  console.log('\n=== Budget-Übersicht (neu) ===')
  console.log('Zürich Core:     CHF 30/Tag')
  console.log('Zürich Warm:     CHF 30/Tag')
  console.log('Micro-Adsets:    CHF 3/Tag (Schlieren aktiv, Rest pausiert)')
  console.log('Auto Lachen:     CHF 30/Tag (1 Adset, Dynamic Creative)')
  console.log('LKW:             PAUSIERT')
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
