// One-off script to apply the Top-10 low-hanging-fruit actions to the live Meta ad account.
// Reads credentials from .env.meta-actions (pulled via `vercel env pull`).
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

const results = []
async function run(label, path, body) {
  try {
    const data = await metaPost(path, body)
    results.push({ label, id: path, ok: true, data })
    console.log(`OK   ${label}`)
  } catch (err) {
    results.push({ label, id: path, ok: false, error: err.message })
    console.log(`FAIL ${label}: ${err.message}`)
  }
}

async function main() {
  // ── A) Pause 6 zero-lead adsets in "B Automatik Zürich" (21d: 0 Leads / CHF 338.84) ──
  const ZERO_LEAD_ADSETS = [
    ['Auto — Broad 18-30 Altstetten', '52577810066671'],
    ['Auto — Fahrschule Pfäffikon SZ / Freienbach / Wollerau', '52579879422071'],
    ['Auto — Fahrschule Spreitenbach / Dietikon / Urdorf', '52579867632471'],
    ['Auto — Fahrschule Dietikon / Killwangen / Weiningen', '52579869760671'],
    ['Auto — Fahrschule Uitikon / Schlieren / Oberengstringen', '52579871693071'],
    ['Auto — Fahrschule Birmensdorf / Uitikon / Wettswil', '52579866384271'],
  ]
  for (const [name, id] of ZERO_LEAD_ADSETS) {
    await run(`Pause: ${name}`, id, { status: 'PAUSED' })
  }

  // ── B) Budget shifts ──
  await run('Reduce Lookalike 1% Altstetten (CHF15→10)', '52577810040071', { daily_budget: 1000 })
  await run('Increase Motorrad Grundkurs Zürich (CHF10→15)', '52581133995871', { daily_budget: 1500 })
  await run('Increase LKW Dynamic Creative (CHF15→18)', '52581118882871', { daily_budget: 1800 })

  // ── C) Fix Retargeting adset: attach the "Alle Websitebesucher 60D" custom audience ──
  // It currently has NO custom_audiences at all in targeting — runs as a broad campaign.
  const retargetingTargeting = {
    age_max: 55,
    age_min: 18,
    geo_locations: {
      custom_locations: [
        { distance_unit: 'kilometer', latitude: 47.1975, longitude: 8.8533, radius: 25 },
        { distance_unit: 'kilometer', latitude: 47.3688, longitude: 8.4876, radius: 15 },
      ],
      location_types: ['home', 'recent'],
    },
    custom_audiences: [{ id: '6323773846067' }], // "Alle Websitebesucher 60D"
    targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
    targeting_automation: { advantage_audience: 0 },
    publisher_platforms: ['facebook', 'instagram', 'audience_network', 'messenger'],
  }
  await run('Fix Retargeting: attach "Alle Websitebesucher 60D" audience', '52577810081671', {
    targeting: JSON.stringify(retargetingTargeting),
  })

  console.log('\n=== Summary ===')
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.label}${r.ok ? '' : ' — ' + r.error}`)
  }
}

main()
