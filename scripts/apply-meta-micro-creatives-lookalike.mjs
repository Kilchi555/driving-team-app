// Reuse Zürich-area micro-ad creatives for Core + Lookalike Dynamic Creative,
// create Lookalike 1% from Website 180D, point Warm adset at Lookalike.
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

const AD_CORE = '52612269014271'
const AD_WARM = '52612269035671'
const ADSET_WARM = '52612269019271'
const SEED_AUDIENCE_180D = '6300977783467'

// Zürich-area micro images only (no Lachen/Pfäffikon — those belong to lake campaign)
// Max 10 for Dynamic Creative
const IMAGE_HASHES = [
  'dde525bcdfdd82777423793b60f714eb', // Altstetten
  'c6afc4f2fe41c5dc4eb1b808a9bebad1', // Altstetten
  'c141ea250d1af1ead3bbd3537dc97969', // Altstetten
  'f0aa47cf2e4a90da90164d4eccfcf6dc', // Altstetten
  'b3c823aabff9fb7768216668b228498f', // Schlieren
  '0babf0db3f8c10a836e13827b4720d3b', // Dietikon
  '33341b696ff1bab4f1b627f033608aaf', // Uitikon
  'd1429971d86dff490bacacf3184131fe', // Spreitenbach
  '0a80e4bfaa8d17c353c4e8e8f24005b7', // Spreitenbach
  'b39e90a931d04af74f4836643e7dcaad', // Birmensdorf
]

const TITLES = [
  'Fahrschule Zürich — ab CHF 95/Lektion',
  'Führerschein direkt in Schlieren & Urdorf',
  'Fahrschule Dietikon — online buchen',
  'Deine Fahrschule in Altstetten — Driving Team',
  'Kat. B Zürich — online buchen, sofort bestätigt',
]

const BODIES = [
  'Driving Team ist deine Fahrschule in Zürich und Umgebung. Kat. B Automatik & Schaltung, flexible Termine, ab CHF 95 pro Lektion. Online buchen, sofort bestätigt.',
  'Schlieren, Dietikon, Uitikon oder Altstetten — Fahrstunden nah bei dir. Zertifizierte Fahrlehrer, faire Preise, flexible Termine auch abends & samstags.',
  'Der Führerschein ist Freiheit. Bei Driving Team lernst du sicher und selbstbewusst zu fahren — Kat. B, in deiner Nähe, online buchbar.',
  'Keine lange Anreise: Driving Team kommt in deine Gemeinde. Kat. B, ab CHF 95 pro Lektion — jetzt Platz sichern.',
  'Über 15 Jahre Erfahrung. 4.9 Sterne. Online buchen, sofort bestätigt — Fahrschule Zürich-Altstetten & Umgebung.',
]

const DESCRIPTIONS = [
  'Online buchen — sofort bestätigt',
  'Kat. B Automatik & Schaltung',
  'Fahrschule Zürich & Umgebung',
]

const LANDING_CORE =
  'https://drivingteam.ch/auto-fahrschule-zuerich/?utm_source=facebook&utm_medium=paid_social&utm_campaign=auto_zuerich_core'
const LANDING_LAL =
  'https://drivingteam.ch/auto-fahrschule-zuerich/?utm_source=facebook&utm_medium=paid_social&utm_campaign=auto_zuerich_lal'

const PLACEMENTS = {
  publisher_platforms: ['facebook', 'instagram'],
  facebook_positions: ['feed', 'story'],
  instagram_positions: ['stream', 'story', 'reels'],
}

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

function buildAssetFeed(websiteUrl) {
  return {
    images: IMAGE_HASHES.map((hash) => ({ hash })),
    bodies: BODIES.map((text) => ({ text })),
    titles: TITLES.map((text) => ({ text })),
    descriptions: DESCRIPTIONS.map((text) => ({ text })),
    call_to_action_types: ['LEARN_MORE'],
    link_urls: [{ website_url: websiteUrl, display_url: 'drivingteam.ch' }],
    ad_formats: ['AUTOMATIC_FORMAT'],
    optimization_type: 'REGULAR',
  }
}

async function createCreative(name, websiteUrl) {
  return metaPost(`${AD_ACCOUNT}/adcreatives`, {
    name,
    object_story_spec: { page_id: PAGE_ID },
    asset_feed_spec: JSON.stringify(buildAssetFeed(websiteUrl)),
  })
}

async function main() {
  if (!TOKEN || !AD_ACCOUNT) throw new Error('Missing META credentials')
  const results = []

  // 1) Lookalike 1% CH from Website 180D
  let lookalikeId = null
  const existing = await metaGet(`${AD_ACCOUNT}/customaudiences`, {
    fields: 'id,name,subtype',
    limit: '100',
  })
  const found = (existing.data || []).find((a) =>
    /lookalike.*1%.*website|website.*180.*lookalike|lal 1%.*180/i.test(a.name),
  )
  if (found) {
    lookalikeId = found.id
    console.log(`OK   Reuse existing Lookalike → ${lookalikeId} (${found.name})`)
    results.push({ ok: true, label: `Reuse Lookalike ${found.name}`, result: found })
  } else {
    const created = await run('Create Lookalike 1% Website 180D CH', () =>
      metaPost(`${AD_ACCOUNT}/customaudiences`, {
        name: 'Lookalike 1% — Website 180D CH',
        subtype: 'LOOKALIKE',
        origin_audience_id: SEED_AUDIENCE_180D,
        lookalike_spec: JSON.stringify({
          type: 'similarity',
          country: 'CH',
          ratio: 0.01,
        }),
      }),
    )
    results.push(created)
    if (!created.ok) throw new Error(created.error)
    lookalikeId = created.result.id
  }

  await sleep(400)

  // 2) Point former Warm adset at Lookalike (prospecting, not retargeting)
  const lalTargeting = {
    geo_locations: {
      custom_locations: [
        { latitude: 47.3905, longitude: 8.4878, radius: 20, distance_unit: 'kilometer' },
      ],
      location_types: ['home', 'recent'],
    },
    age_min: 18,
    age_max: 30,
    custom_audiences: [{ id: lookalikeId }],
    targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
    targeting_automation: { advantage_audience: 0 },
    ...PLACEMENTS,
  }
  results.push(
    await run('Warm adset → Lookalike 1% + rename', () =>
      metaPost(ADSET_WARM, {
        name: 'Auto — Lookalike 1% Zürich 18-30',
        targeting: JSON.stringify(lalTargeting),
        status: 'ACTIVE',
      }),
    ),
  )
  await sleep(400)

  // 3) New Dynamic Creatives from micro images/texts
  const coreCreative = await run('Create Core creative from micro assets', () =>
    createCreative('DT Creative — Auto Core Zürich (micro assets)', LANDING_CORE),
  )
  results.push(coreCreative)
  if (coreCreative.ok) {
    results.push(
      await run('Assign Core creative to ad', () =>
        metaPost(AD_CORE, {
          name: 'DT Ad — Auto Core Zürich (micro creatives)',
          creative: { creative_id: coreCreative.result.id },
        }),
      ),
    )
  }
  await sleep(500)

  const lalCreative = await run('Create Lookalike creative from micro assets', () =>
    createCreative('DT Creative — Auto Lookalike Zürich (micro assets)', LANDING_LAL),
  )
  results.push(lalCreative)
  if (lalCreative.ok) {
    results.push(
      await run('Assign Lookalike creative to ad', () =>
        metaPost(AD_WARM, {
          name: 'DT Ad — Auto Lookalike Zürich (micro creatives)',
          creative: { creative_id: lalCreative.result.id },
        }),
      ),
    )
  }

  console.log('\n=== Summary ===')
  for (const r of results) {
    console.log(
      `${r.ok ? '✅' : '❌'} ${r.label}${r.ok && r.result?.id ? ` → ${r.result.id}` : r.ok ? '' : ` — ${r.error}`}`,
    )
  }

  console.log('\nCreatives:')
  console.log(`- ${IMAGE_HASHES.length} Bilder aus Micro-Ads (ZH-Region)`)
  console.log(`- ${TITLES.length} Headlines (inkl. lokale Ortsnamen)`)
  console.log(`- Landing: /auto-fahrschule-zuerich/`)
  console.log(`- Lookalike seed: Website 180D → 1% CH`)
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
