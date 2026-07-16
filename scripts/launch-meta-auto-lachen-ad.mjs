// Uploads the Lachen "Auto" campaign visuals, builds a Dynamic Creative ad,
// and activates campaign + adset + ad.
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
const PAGE_ID = env.META_PAGE_ID
const GRAPH = 'https://graph.facebook.com/v19.0'

const CAMPAIGN_ID = '52609910935671'
const ADSET_ID = '52609910939071'

const ASSET_DIR = '/Users/pascalkilchenmann/.cursor/projects/Users-pascalkilchenmann-driving-team-app/assets'
const IMAGES = [
  'Auto_Google_Max_Ad_Portrait_blau_Ateca_Automat_und_Schaltung-074554ac-d2fa-4638-ae53-9c7af34563ca.png',
  'Auto_Google_Max_Ad_Portrait_weiss_1._Versuch-ce5680eb-bf66-4373-af91-c500ebe3bf36.png',
  'Auto_Google_Max_Ad_Portrait_gru_n_Ateca_1._Versuch-8a221ea5-8349-40a6-860f-e8d7ea4b0f6d.png',
  'Auto_Google_Max_Ad_Portrait_blau_Ateca_1._Versuch-7c9ae886-528e-4486-97c6-7b5727b3e372.png',
  'Auto_Google_Max_Ad_Portrait_weiss_Ateca-7c194e8b-1f58-4f8b-b188-392660b10509.png',
  'Auto_Google_Max_Ad_Portrait_weiss_Ateca_Automat___Schaltung-3a8bcc41-9c42-432b-bceb-6061bce12e8f.png',
  'Auto_Google_Max_Ad_Portrait_blau_Ateca-4901582e-3f69-4124-ba29-8b4ab608d704.png',
  'Auto_Google_Max_Ad_Portrait_gru_n_Ateca-25d20556-2aa0-4a87-bf91-f7298f3f9b71.png',
  'Auto_Google_Max_Ad_Portrait_gru_n_Ateca_Automat___Schaltung-25f77beb-a33e-4101-ac48-cef99165e3b6.png',
]

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
  const bytes = fs.readFileSync(`${ASSET_DIR}/${filename}`)
  const blob = new Blob([bytes], { type: 'image/png' })
  const data = await metaPostForm(`${AD_ACCOUNT}/adimages`, { filename, source: blob }, 'source')
  // Response shape: { images: { <filename-key>: { hash, url, ... } } }
  const entry = Object.values(data.images)[0]
  return entry.hash
}

async function main() {
  console.log('Uploading images...')
  const hashes = []
  for (const filename of IMAGES) {
    const hash = await uploadImage(filename)
    hashes.push(hash)
    console.log(`  ${filename} -> ${hash}`)
  }

  const link = 'https://drivingteam.ch/fahrstunden-lachen/?utm_source=facebook&utm_medium=paid_social&utm_campaign=auto_lachen'

  console.log('\nCreating dynamic creative ad creative...')
  const creative = await metaPost(`${AD_ACCOUNT}/adcreatives`, {
    name: 'DT Dynamic Creative — Auto Lachen',
    asset_feed_spec: {
      images: hashes.map((hash) => ({ hash })),
      bodies: [
        { text: 'Deine Fahrschule in Lachen/SZ. Automat & Schaltung, flexible Treffpunkte, ab CHF 95.-/Lektion.' },
        { text: 'Prüfung am StVA Pfäffikon SZ. Erfahrene Fahrlehrer mit eidg. Fachausweis. Jetzt Termin sichern.' },
        { text: 'Kategorie B — Automat oder Schaltung, du entscheidest. Online buchen in wenigen Minuten.' },
      ],
      titles: [
        { text: 'Auto Fahrstunden Lachen/SZ' },
        { text: 'Fahrschule Lachen — Automat & Schaltung' },
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

  console.log('\nCreating ad...')
  const ad = await metaPost(`${AD_ACCOUNT}/ads`, {
    name: 'DT Ad — Auto Lachen',
    adset_id: ADSET_ID,
    creative: { creative_id: creative.id },
    status: 'ACTIVE',
  })
  console.log(`  ad id: ${ad.id}`)

  console.log('\nActivating ad set and campaign...')
  await metaPost(ADSET_ID, { status: 'ACTIVE' })
  await metaPost(CAMPAIGN_ID, { status: 'ACTIVE' })

  console.log('\n=== LIVE ===')
  console.log(`Campaign: ${CAMPAIGN_ID}`)
  console.log(`Ad set:   ${ADSET_ID}`)
  console.log(`Creative: ${creative.id}`)
  console.log(`Ad:       ${ad.id}`)
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
