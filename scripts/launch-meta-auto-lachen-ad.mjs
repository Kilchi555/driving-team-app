// Uploads Lachen Auto campaign visuals, builds a Dynamic Creative ad,
// and activates campaign + adset + ad.
import fs from 'fs'
import path from 'path'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const raw = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '').replace(/\\n/g, '').trim()
  }
  return env
}

function loadEnv() {
  const root = process.cwd()
  return {
    ...loadEnvFile(path.join(root, '.env.vercel.production')),
    ...loadEnvFile(path.join(root, '.env.meta-actions')),
  }
}

const env = loadEnv()
const TOKEN = env.META_SYSTEM_USER_TOKEN || env.META_ACCESS_TOKEN
const AD_ACCOUNT = env.META_AD_ACCOUNT_ID
const PAGE_ID = env.META_PAGE_ID
const GRAPH = 'https://graph.facebook.com/v19.0'

const CAMPAIGN_ID = '52609910935671'
const ADSET_ID = '52609910939071'

const ASSET_DIR = '/Users/pascalkilchenmann/.cursor/projects/Users-pascalkilchenmann-driving-team-app/assets'
const IMAGES = [
  'Auto_Google_Max_Ad_Portrait_blau_Ateca_2_1._Fahrpru_fung-8d22811a-2045-4bf5-a7ff-ba1dc4a88305.png',
  'Auto_Google_Max_Ad_Portrait_blau_Ateca_Automat___Schaltung-658bc9c2-07e9-4a90-a694-ccf1ff558f29.png',
  'Auto_Google_Max_Ad_Portrait_blau_Ateca_2_Automat___Schaltung-be4957e6-898b-43d7-8007-d45d0de0732e.png',
]

const LACHEN_TARGETING = {
  geo_locations: {
    custom_locations: [
      { latitude: 47.1975, longitude: 8.8533, radius: 25, distance_unit: 'kilometer' },
    ],
    location_types: ['home', 'recent'],
  },
  age_min: 18,
  age_max: 30,
  targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
  targeting_automation: { advantage_audience: 0 },
  publisher_platforms: ['facebook', 'instagram'],
  facebook_positions: ['feed', 'story'],
  instagram_positions: ['stream', 'story', 'reels'],
}

async function metaGet(path, params = {}) {
  const url = new URL(`${GRAPH}/${path}`)
  url.searchParams.set('access_token', TOKEN)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[GET ${path}] ${data.error?.message ?? JSON.stringify(data)}`)
  return data
}

async function metaPostForm(path, formFields, fileFieldName) {
  const form = new FormData()
  for (const [k, v] of Object.entries(formFields)) {
    if (k === fileFieldName) form.append(k, v, formFields.filename)
    else form.append(k, v)
  }
  form.append('access_token', TOKEN)
  const res = await fetch(`${GRAPH}/${path}`, { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[${path}] ${JSON.stringify(data.error ?? data)}`)
  return data
}

async function metaPost(path, body) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[${path}] ${data.error?.message ?? JSON.stringify(data)}`)
  return data
}

async function uploadImage(filename) {
  const filePath = path.join(ASSET_DIR, filename)
  if (!fs.existsSync(filePath)) throw new Error(`Missing image: ${filePath}`)
  const bytes = fs.readFileSync(filePath)
  const blob = new Blob([bytes], { type: 'image/png' })
  const data = await metaPostForm(`${AD_ACCOUNT}/adimages`, { filename, source: blob }, 'source')
  const entry = Object.values(data.images)[0]
  return entry.hash
}

async function main() {
  if (!TOKEN || !AD_ACCOUNT || !PAGE_ID) {
    throw new Error('Missing META credentials. Set META_SYSTEM_USER_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID.')
  }

  for (const filename of IMAGES) {
    if (!fs.existsSync(path.join(ASSET_DIR, filename))) {
      throw new Error(`Image not found: ${filename}`)
    }
  }

  console.log('Checking campaign + ad set...')
  const campaign = await metaGet(CAMPAIGN_ID, { fields: 'id,name,status,objective' })
  const adset = await metaGet(ADSET_ID, { fields: 'id,name,status,daily_budget,campaign_id' })
  console.log(`  campaign: ${campaign.name} (${campaign.status})`)
  console.log(`  adset:    ${adset.name} (${adset.status}, budget ${adset.daily_budget})`)

  if (adset.campaign_id !== campaign.id) {
    throw new Error(`Ad set ${ADSET_ID} does not belong to campaign ${CAMPAIGN_ID}`)
  }

  console.log('\nUploading images...')
  const hashes = []
  for (const filename of IMAGES) {
    const hash = await uploadImage(filename)
    hashes.push(hash)
    console.log(`  ${filename} -> ${hash}`)
  }

  const link = 'https://drivingteam.ch/fahrstunden-lachen/?utm_source=facebook&utm_medium=paid_social&utm_campaign=auto_lachen&utm_content={{ad.name}}'

  console.log('\nCreating dynamic creative...')
  const creative = await metaPost(`${AD_ACCOUNT}/adcreatives`, {
    name: 'DT Dynamic Creative — Auto Lachen Mar 2026',
    asset_feed_spec: {
      images: hashes.map((hash) => ({ hash })),
      bodies: [
        { text: 'Deine Fahrschule in Lachen/SZ und der March. Automat & Schaltung, flexible Treffpunkte, ab CHF 95.-/Lektion.' },
        { text: 'Prüfung am StVA Pfäffikon SZ. Erfahrene Fahrlehrer mit eidg. Fachausweis. Jetzt Termin sichern.' },
        { text: 'Kategorie B — Automat oder Schaltung, du entscheidest. Online buchen in wenigen Minuten.' },
      ],
      titles: [
        { text: 'Fahrschule March/Höfe — Automat & Schaltung' },
        { text: 'Auto Fahrstunden Lachen/SZ' },
        { text: 'Bestehe deine Fahrprüfung beim 1. Versuch' },
        { text: 'Kategorie B — Jetzt anmelden' },
      ],
      link_urls: [{ website_url: link, display_url: 'drivingteam.ch' }],
      call_to_action_types: ['BOOK_TRAVEL', 'LEARN_MORE'],
      ad_formats: ['AUTOMATIC_FORMAT'],
    },
    object_story_spec: {
      page_id: PAGE_ID,
    },
  })
  console.log(`  creative id: ${creative.id}`)

  console.log('\nUpdating ad set targeting (FB + IG only)...')
  try {
    await metaPost(ADSET_ID, {
      targeting: JSON.stringify(LACHEN_TARGETING),
    })
  } catch (err) {
    console.warn(`  targeting update skipped: ${err.message}`)
  }

  console.log('\nReplacing dynamic creative on existing ad...')
  const existingAds = await metaGet(`${ADSET_ID}/ads`, {
    fields: 'id,name,status',
    limit: '20',
  })
  const existingAd = (existingAds.data ?? [])[0]
  if (!existingAd) {
    throw new Error(`No existing ad found in ad set ${ADSET_ID}`)
  }

  await metaPost(existingAd.id, {
    creative: { creative_id: creative.id },
    status: 'ACTIVE',
  })
  console.log(`  updated ad: ${existingAd.name} (${existingAd.id})`)

  console.log('\nActivating ad set and campaign...')
  await metaPost(ADSET_ID, { status: 'ACTIVE' })
  await metaPost(CAMPAIGN_ID, { status: 'ACTIVE' })

  console.log('\n=== LIVE ===')
  console.log(`Campaign: ${CAMPAIGN_ID}`)
  console.log(`Ad set:   ${ADSET_ID}`)
  console.log(`Creative: ${creative.id}`)
  console.log(`Ad:       ${existingAd.id}`)
  console.log(`Landing:  ${link.replace('{{ad.name}}', existingAd.name)}`)
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
