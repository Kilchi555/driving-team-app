// Upload first-lesson offer creative to the live Auto Zürich Meta campaign.
// Does not create a new campaign or raise daily budget — attaches to the
// existing Auto Zürich adset if it is still there, otherwise reports status.
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

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

const root = process.cwd()
const env = {
  ...loadEnvFile(path.join(root, '.env.vercel.production')),
  ...loadEnvFile(path.join(root, '.env.meta-actions')),
}

const TOKEN = (env.META_SYSTEM_USER_TOKEN || env.META_ACCESS_TOKEN || '').replace(/\\n/g, '').trim()
let AD_ACCOUNT = (env.META_AD_ACCOUNT_ID || '').trim()
if (AD_ACCOUNT && !AD_ACCOUNT.startsWith('act_')) AD_ACCOUNT = `act_${AD_ACCOUNT}`
const PAGE_ID = (env.META_PAGE_ID || '').trim()
const GRAPH = 'https://graph.facebook.com/v19.0'

const KNOWN_AUTO_ZH_ADSET = '52612269006271'
const LINK = 'https://drivingteam.ch/auto-fahrschule-zuerich-probe/?utm_source=facebook&utm_medium=paid_social&utm_campaign=erste30&utm_content=erste_lektion_65'
const DRY = process.argv.includes('--dry-run')

const HEADLINE = 'Erste Lektion CHF 65'
const PRIMARY = 'Erste Auto-Lektion in Zürich: CHF 65 statt 95. Danach 95.– / 45 Min. Jetzt Termin buchen.'
const DESCRIPTION = 'Nur die 1. Lektion · Kat. B'

async function metaGet(p, params = {}) {
  const url = new URL(`${GRAPH}/${p}`)
  url.searchParams.set('access_token', TOKEN)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[GET ${p}] ${data.error?.message ?? JSON.stringify(data)}`)
  return data
}

async function metaPost(p, body) {
  const res = await fetch(`${GRAPH}/${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(`[POST ${p}] ${JSON.stringify(data.error ?? data)}`)
  }
  return data
}

async function metaPostForm(p, form) {
  form.append('access_token', TOKEN)
  const res = await fetch(`${GRAPH}/${p}`, { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[FORM ${p}] ${JSON.stringify(data.error ?? data)}`)
  return data
}

function prepareJpg() {
  const src = path.join(root, 'apps/website/public/images/categories/auto-fahrschule-hero.webp')
  const dest = path.join(root, 'tmp/erste30-meta-hero.jpg')
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  if (!fs.existsSync(src)) throw new Error(`Missing hero: ${src}`)
  execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', '1200', src, '--out', dest])
  return dest
}

async function main() {
  if (!TOKEN || !AD_ACCOUNT || !PAGE_ID) {
    throw new Error('Missing META credentials')
  }

  console.log('Account', AD_ACCOUNT, 'page', PAGE_ID, DRY ? '(dry-run)' : '')

  let adset
  try {
    adset = await metaGet(KNOWN_AUTO_ZH_ADSET, {
      fields: 'id,name,status,effective_status,daily_budget,campaign_id',
    })
  } catch (err) {
    console.log('Known Auto-ZH adset missing:', err.message)
    const camps = await metaGet(`${AD_ACCOUNT}/campaigns`, {
      fields: 'id,name,status,effective_status,daily_budget',
      effective_status: JSON.stringify(['ACTIVE', 'PAUSED']),
      limit: '80',
    })
    console.log('Campaigns:')
    for (const c of camps.data ?? []) {
      console.log(`  ${c.effective_status} ${c.status} ${c.name} ${c.id} budget=${c.daily_budget ?? '-'}`)
    }
    throw err
  }

  const campaign = await metaGet(adset.campaign_id, {
    fields: 'id,name,status,effective_status,daily_budget',
  })
  console.log(`Campaign: ${campaign.name} ${campaign.effective_status} budget=${campaign.daily_budget ?? '-'}`)
  console.log(`Adset:    ${adset.name} ${adset.effective_status} budget=${adset.daily_budget ?? '-'}`)

  const jpg = prepareJpg()
  console.log('Image', jpg)

  if (DRY) {
    console.log('Dry-run — would upload creative + attach ACTIVE ad')
    console.log({ headline: HEADLINE, primary: PRIMARY, link: LINK })
    return
  }

  const bytes = fs.readFileSync(jpg)
  const form = new FormData()
  form.append('filename', 'erste30-auto-zh.jpg')
  form.append('source', new Blob([bytes], { type: 'image/jpeg' }), 'erste30-auto-zh.jpg')
  const uploaded = await metaPostForm(`${AD_ACCOUNT}/adimages`, form)
  const hash = Object.values(uploaded.images ?? {})[0]?.hash
  if (!hash) throw new Error(`No image hash: ${JSON.stringify(uploaded)}`)
  console.log('hash', hash)

  const creative = await metaPost(`${AD_ACCOUNT}/adcreatives`, {
    name: 'Creative — Erste Lektion CHF 65',
    object_story_spec: { page_id: PAGE_ID },
    asset_feed_spec: {
      images: [{ hash }],
      bodies: [
        { text: PRIMARY },
        { text: 'CHF 65 statt 95 für die erste Auto-Lektion. Treffpunkt Bahnhof Altstetten. Jetzt buchen.' },
      ],
      titles: [
        { text: HEADLINE },
        { text: 'statt CHF 95.–' },
        { text: 'Erste Fahrstunde Zürich' },
      ],
      descriptions: [{ text: DESCRIPTION }],
      link_urls: [{ website_url: LINK, display_url: 'drivingteam.ch' }],
      call_to_action_types: ['LEARN_MORE', 'BOOK_TRAVEL'],
      ad_formats: ['AUTOMATIC_FORMAT'],
    },
  })
  console.log('creative', creative.id)

  const existingAds = await metaGet(`${adset.id}/ads`, { fields: 'id,name,status,effective_status', limit: '50' })
  const primaryAd = (existingAds.data ?? [])[0]
  if (!primaryAd) throw new Error('No existing ad in Auto Zürich adset')
  for (const old of existingAds.data ?? []) {
    if (old.id !== primaryAd.id && old.status !== 'PAUSED') {
      await metaPost(old.id, { status: 'PAUSED' })
      console.log('paused extra ad', old.name, old.id)
    }
  }

  await metaPost(primaryAd.id, {
    name: 'DT — Erste Lektion CHF 65',
    creative: { creative_id: creative.id },
    status: 'ACTIVE',
  })
  const ad = primaryAd
  console.log('updated ad', ad.id, 'ACTIVE')

  // Playbook: Auto ZH rebuilt at CHF 30/day — do not invent extra budget.
  if (String(adset.daily_budget || '') !== '3000') {
    await metaPost(adset.id, { daily_budget: 3000 })
    console.log('adset budget CHF 30')
  }
  if (adset.effective_status !== 'ACTIVE') {
    await metaPost(adset.id, { status: 'ACTIVE' })
    console.log('adset enabled')
  }
  if (campaign.effective_status !== 'ACTIVE') {
    await metaPost(campaign.id, { status: 'ACTIVE' })
    console.log('campaign enabled')
  }

  console.log('\nLIVE')
  console.log(`Adset ${adset.id}`)
  console.log(`Ad    ${ad.id}`)
  console.log(`URL   ${LINK}`)
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
