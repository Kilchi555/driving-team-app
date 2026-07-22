// Correct gaps after Meta Auto restructure review:
// 1) Pause micro geo adsets (CHF 3 kept, but ACTIVE fragments learning + wrong LPs)
// 2) Recreate Core/Warm creatives → /auto-fahrschule-zuerich/ (no WhatsApp click-to-message)
// 3) Fix Retargeting: FB+IG only, CHF 12/day, booking LP
// 4) Pause Motorrad Fahrstunden + Anhänger (Auto focus after LKW off)
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
const PAGE_ID = env.META_PAGE_ID || '1499718320302620'
const GRAPH = 'https://graph.facebook.com/v19.0'

const LANDING_ZUERICH =
  'https://drivingteam.ch/auto-fahrschule-zuerich/?utm_source=facebook&utm_medium=paid_social&utm_campaign=auto_zuerich'
const LANDING_RETARGET =
  'https://drivingteam.ch/auto-fahrschule-zuerich/?utm_source=facebook&utm_medium=paid_social&utm_campaign=retargeting_auto'

const MICRO_ADSETS = [
  ['Auto — Fahrschule Pfäffikon SZ / Freienbach / Wollerau', '52579879422071'],
  ['Auto — Fahrschule Lachen / Pfäffikon / Altendorf', '52579875016671'],
  ['Auto — Fahrschule Schlieren / Urdorf / Geroldswil', '52579873181271'],
  ['Auto — Fahrschule Uitikon / Schlieren / Oberengstringen', '52579871693071'],
  ['Auto — Fahrschule Dietikon / Killwangen / Weiningen', '52579869760671'],
  ['Auto — Fahrschule Spreitenbach / Dietikon / Urdorf', '52579867632471'],
  ['Auto — Fahrschule Birmensdorf / Uitikon / Wettswil', '52579866384271'],
]

const AD_CORE = '52612269014271'
const AD_WARM = '52612269035671'
const CREATIVE_CORE_SRC = '1366632122026181'
const CREATIVE_WARM_SRC = '1719573309355442'

const ADSET_RETARGET = '52577810081671'
const AD_RETARGET = '52577822602071'
const CREATIVE_RETARGET_SRC = '886587097827261'
const AUDIENCE_60D = '6323773846067'

const CAMPAIGN_MOTORRAD_FS = '52605295285471'
const CAMPAIGN_ANHAENGER = '52577814450071'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function metaGet(apiPath, params = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const q = new URLSearchParams({ access_token: TOKEN, ...params })
    const res = await fetch(`${GRAPH}/${apiPath}?${q}`)
    const data = await res.json()
    if (data.error?.code === 17 || /request limit/i.test(data.error?.message || '')) {
      console.log('  rate limit — waiting 45s...')
      await sleep(45000)
      continue
    }
    if (data.error) throw new Error(`[GET ${apiPath}] ${data.error.message}`)
    return data
  }
  throw new Error(`[GET ${apiPath}] rate limited out`)
}

async function metaPost(apiPath, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${GRAPH}/${apiPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: TOKEN }),
    })
    const data = await res.json()
    if (data.error?.code === 17 || /request limit/i.test(data.error?.message || '')) {
      console.log('  rate limit — waiting 45s...')
      await sleep(45000)
      continue
    }
    if (!res.ok || data.error) throw new Error(`[POST ${apiPath}] ${data.error?.message ?? JSON.stringify(data)}`)
    return data
  }
  throw new Error(`[POST ${apiPath}] rate limited out`)
}

async function run(label, fn) {
  try {
    const result = await fn()
    console.log(`OK   ${label}${result?.id ? ` → ${result.id}` : ''}`)
    return { ok: true, result, label }
  } catch (err) {
    console.log(`FAIL ${label}: ${err.message}`)
    return { ok: false, error: err.message, label }
  }
}

function slimAssetFeed(feed, websiteUrl, { dropWhatsapp = true, ctaTypes } = {}) {
  const next = {
    images: (feed.images || []).map((i) => ({ hash: i.hash })),
    bodies: feed.bodies || [],
    titles: feed.titles || [],
    descriptions: feed.descriptions || [{ text: '' }],
    call_to_action_types: ctaTypes || feed.call_to_action_types || ['LEARN_MORE'],
    link_urls: [{ website_url: websiteUrl, display_url: 'drivingteam.ch' }],
    ad_formats: feed.ad_formats || ['AUTOMATIC_FORMAT'],
    optimization_type: feed.optimization_type || 'REGULAR',
  }
  if (!dropWhatsapp && feed.message_extensions) {
    next.message_extensions = feed.message_extensions
  }
  return next
}

async function cloneCreativeWithUrl(sourceCreativeId, name, websiteUrl, opts) {
  const src = await metaGet(sourceCreativeId, {
    fields: 'id,name,object_story_spec,asset_feed_spec,degrees_of_freedom_spec',
  })
  const pageId = src.object_story_spec?.page_id || PAGE_ID
  const assetFeed = slimAssetFeed(src.asset_feed_spec, websiteUrl, opts)

  // Keep Advantage+ creative features opt-out if present
  const dof = src.degrees_of_freedom_spec
    ? { creative_features_spec: src.degrees_of_freedom_spec.creative_features_spec }
    : undefined

  return metaPost(`${AD_ACCOUNT}/adcreatives`, {
    name,
    object_story_spec: { page_id: pageId },
    asset_feed_spec: JSON.stringify(assetFeed),
    ...(dof ? { degrees_of_freedom_spec: JSON.stringify(dof) } : {}),
  })
}

async function main() {
  if (!TOKEN || !AD_ACCOUNT) throw new Error('Missing META credentials')

  const results = []

  // ── 1) Pause micro geo adsets (budget stays CHF 3 for easy resume) ──
  for (const [name, id] of MICRO_ADSETS) {
    results.push(
      await run(`Pause micro: ${name}`, () => metaPost(id, { status: 'PAUSED', daily_budget: 300 })),
    )
    await sleep(250)
  }

  // ── 2) Core + Warm landing → booking page, remove WhatsApp extension ──
  const coreCreative = await run('Clone Core creative → /auto-fahrschule-zuerich/', () =>
    cloneCreativeWithUrl(
      CREATIVE_CORE_SRC,
      'DT Creative — Auto Core Zürich booking LP',
      LANDING_ZUERICH.replace('utm_campaign=auto_zuerich', 'utm_campaign=auto_zuerich_core'),
      { dropWhatsapp: true, ctaTypes: ['LEARN_MORE'] },
    ),
  )
  results.push(coreCreative)
  if (coreCreative.ok) {
    results.push(
      await run('Update Core ad creative', () =>
        metaPost(AD_CORE, { creative: { creative_id: coreCreative.result.id } }),
      ),
    )
  }
  await sleep(500)

  const warmCreative = await run('Clone Warm creative → /auto-fahrschule-zuerich/', () =>
    cloneCreativeWithUrl(
      CREATIVE_WARM_SRC,
      'DT Creative — Auto Warm Zürich booking LP',
      LANDING_ZUERICH.replace('utm_campaign=auto_zuerich', 'utm_campaign=auto_zuerich_warm'),
      { dropWhatsapp: true, ctaTypes: ['LEARN_MORE'] },
    ),
  )
  results.push(warmCreative)
  if (warmCreative.ok) {
    results.push(
      await run('Update Warm ad creative', () =>
        metaPost(AD_WARM, { creative: { creative_id: warmCreative.result.id } }),
      ),
    )
  }
  await sleep(500)

  // ── 3) Retargeting: audience + placements + budget + landing LP ──
  const retargetingTargeting = {
    age_min: 18,
    age_max: 55,
    geo_locations: {
      custom_locations: [
        { distance_unit: 'kilometer', latitude: 47.1975, longitude: 8.8533, radius: 25 },
        { distance_unit: 'kilometer', latitude: 47.3688, longitude: 8.4876, radius: 15 },
      ],
      location_types: ['home', 'recent'],
    },
    custom_audiences: [{ id: AUDIENCE_60D }],
    targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
    targeting_automation: { advantage_audience: 0 },
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed', 'story'],
    instagram_positions: ['stream', 'story', 'reels'],
  }
  results.push(
    await run('Retargeting: audience + FB/IG only + CHF 12', () =>
      metaPost(ADSET_RETARGET, {
        daily_budget: 1200,
        status: 'ACTIVE',
        targeting: JSON.stringify(retargetingTargeting),
      }),
    ),
  )
  await sleep(400)

  const retCreative = await run('Clone Retargeting creative → booking LP', () =>
    cloneCreativeWithUrl(
      CREATIVE_RETARGET_SRC,
      'DT Creative — Retargeting Auto booking LP',
      LANDING_RETARGET,
      { dropWhatsapp: true, ctaTypes: ['LEARN_MORE'] },
    ),
  )
  results.push(retCreative)
  if (retCreative.ok) {
    results.push(
      await run('Update Retargeting ad creative', () =>
        metaPost(AD_RETARGET, { creative: { creative_id: retCreative.result.id } }),
      ),
    )
  }
  await sleep(400)

  // ── 4) Pause non-Auto campaigns (budget focus) ──
  results.push(
    await run('Pause Motorrad Fahrstunden campaign', () =>
      metaPost(CAMPAIGN_MOTORRAD_FS, { status: 'PAUSED' }),
    ),
  )
  results.push(
    await run('Pause Anhänger BE campaign', () =>
      metaPost(CAMPAIGN_ANHAENGER, { status: 'PAUSED' }),
    ),
  )

  console.log('\n=== Summary ===')
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.label}${r.ok && r.result?.id ? ` → ${r.result.id}` : r.ok ? '' : ` — ${r.error}`}`)
  }

  console.log('\n=== Ziel-Setup (nach Korrektur) ===')
  console.log('Zürich Core:     CHF 30/Tag → /auto-fahrschule-zuerich/')
  console.log('Zürich Warm:     CHF 30/Tag → /auto-fahrschule-zuerich/')
  console.log('Auto Lachen:     CHF 30/Tag → /fahrstunden-lachen/ (unverändert)')
  console.log('Retargeting:     CHF 12/Tag → Audience 60D, FB+IG, booking LP')
  console.log('Micro-Adsets:    PAUSED @ CHF 3 (wieder aktivierbar)')
  console.log('LKW / Motorrad FS / Anhänger: PAUSED')
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
