// Adds 1-day VIEW_THROUGH attribution to every Purchase-optimized ad set that
// currently only has 7-day CLICK_THROUGH. View-through credits users who saw
// (but didn't click) an ad and later converted — currently only 2/31 ad sets
// have this configured, so almost all view-assisted purchases go unattributed.
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

const env = loadEnv('.env.meta-fix')
const TOKEN = env.META_SYSTEM_USER_TOKEN || env.META_ACCESS_TOKEN
const AD_ACCOUNT = env.META_AD_ACCOUNT_ID
const GRAPH = 'https://graph.facebook.com/v19.0'

async function metaGet(path) {
  const res = await fetch(`${GRAPH}/${path}${path.includes('?') ? '&' : '?'}access_token=${TOKEN}`)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[GET ${path}] ${JSON.stringify(data.error ?? data)}`)
  return data
}

async function metaPost(id, body) {
  const res = await fetch(`${GRAPH}/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[POST ${id}] ${JSON.stringify(data.error ?? data)}`)
  return data
}

const DESIRED_SPEC = [
  { event_type: 'CLICK_THROUGH', window_days: 7 },
  { event_type: 'VIEW_THROUGH', window_days: 1 },
]

async function main() {
  const page = await metaGet(`${AD_ACCOUNT}/adsets?fields=name,status,attribution_spec,promoted_object&limit=200`)
  const all = page.data

  const targets = all.filter((a) => {
    const isPurchase = a.promoted_object?.custom_event_type === 'PURCHASE'
    const spec = a.attribution_spec ?? []
    const hasView = spec.some((s) => s.event_type === 'VIEW_THROUGH')
    return isPurchase && !hasView
  })

  console.log(`Found ${all.length} ad sets total, ${targets.length} Purchase-optimized without view-through.\n`)

  for (const adset of targets) {
    try {
      await metaPost(adset.id, { attribution_spec: JSON.stringify(DESIRED_SPEC) })
      console.log(`  OK   ${adset.name} (${adset.id}) [${adset.status}]`)
    } catch (err) {
      console.log(`  FAIL ${adset.name} (${adset.id}) — ${err.message}`)
    }
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
