/**
 * One-shot script: create Google Ads Search campaign for Motorrad Grundkurs Lachen.
 * Run with: node server/scripts/create-campaign-motorrad-lachen.mjs
 * Reads credentials from .env.local.tmp
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local.tmp
const envFile = resolve(__dirname, '../../.env.local.tmp')
const envLines = readFileSync(envFile, 'utf-8').split('\n')
const env = {}
for (const line of envLines) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
}

const developerToken = env.GOOGLE_ADS_DEVELOPER_TOKEN
const clientId       = env.GOOGLE_ADS_CLIENT_ID
const clientSecret   = env.GOOGLE_ADS_CLIENT_SECRET
const refreshToken   = env.GOOGLE_ADS_REFRESH_TOKEN
const customerId     = env.GOOGLE_ADS_CUSTOMER_ID

console.log('Credentials loaded:', {
  developerToken: developerToken ? '✓' : '✗',
  clientId: clientId ? '✓' : '✗',
  clientSecret: clientSecret ? '✓' : '✗',
  refreshToken: refreshToken ? '✓' : '✗',
  customerId: customerId ? '✓' : '✗',
})

if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
  console.error('Missing credentials – aborting.')
  process.exit(1)
}

const ADS_BASE = 'https://googleads.googleapis.com/v23'
const customerPrefix = `customers/${customerId}`

// ── Campaign data ─────────────────────────────────────────────────────────────

const CAMPAIGN_NAME   = 'Motorrad Grundkurs Lachen'
const DAILY_BUDGET    = 20.0 // CHF
const FINAL_URL       = 'https://drivingteam.ch/motorrad-grundkurs-lachen/'

// 20km proximity around Lachen SZ (lat: 47.19211, lng: 8.85303)
const GEO_LAT_MICRO = 47192110
const GEO_LNG_MICRO = 8853030
const GEO_RADIUS_KM = 20

const KEYWORDS = [
  // High-intent exact matches
  { text: 'motorrad grundkurs lachen',         match_type: 'EXACT',  cpc_chf: 2.50 },
  { text: 'motorrad fahrschule lachen',        match_type: 'EXACT',  cpc_chf: 2.50 },
  { text: 'motorrad grundkurs march sz',       match_type: 'EXACT',  cpc_chf: 2.00 },
  // Phrase matches – broader reach
  { text: 'motorrad grundkurs lachen',         match_type: 'PHRASE', cpc_chf: 2.00 },
  { text: 'motorrad fahrschule lachen',        match_type: 'PHRASE', cpc_chf: 2.00 },
  { text: 'motorrad führerschein lachen',      match_type: 'PHRASE', cpc_chf: 1.80 },
  { text: 'grundkurs motorrad schwyz',         match_type: 'PHRASE', cpc_chf: 1.80 },
  { text: 'motorrad grundkurs zürichsee',      match_type: 'PHRASE', cpc_chf: 1.80 },
  { text: 'motorrad kurs lachen',              match_type: 'PHRASE', cpc_chf: 2.00 },
  { text: 'a1 führerschein lachen',            match_type: 'PHRASE', cpc_chf: 1.80 },
  { text: 'motorrad fahrschule march',         match_type: 'PHRASE', cpc_chf: 1.80 },
  { text: 'motorrad grundkurs pfäffikon sz',   match_type: 'PHRASE', cpc_chf: 1.80 },
  { text: 'motorrad grundkurs siebnen',        match_type: 'PHRASE', cpc_chf: 1.50 },
  { text: 'motorrad grundkurs schübelbach',    match_type: 'PHRASE', cpc_chf: 1.50 },
]

const HEADLINES = [
  'Motorrad Grundkurs Lachen',      // 25 chars
  'Nur CHF 570.- Komplettpreis',    // 27 chars
  'Max. 5 Teilnehmer pro Kurs',     // 26 chars
  '3 Kursteile à 4 Stunden',        // 23 chars
  'Jetzt Platz sichern!',           // 21 chars
  'Fahrschule Driving Team',         // 23 chars
  '85% Erfolgsquote',               // 17 chars
  'Motorrad Kat. A & A1',           // 21 chars
  'Online buchen – sofort fix',     // 26 chars
  'Kleine Gruppe – max. 5 Pers.',   // 29 chars
  'Kursbestätigung inklusive',      // 25 chars
  'Herrengasse 17, Lachen SZ',      // 25 chars
]

const DESCRIPTIONS = [
  // 87 chars
  'Motorrad Grundkurs in Lachen: 12h Ausbildung, max. 5 Personen. CHF 570.- Komplettpreis.',
  // 86 chars
  'Professionelle Motorrad-Ausbildung. Kat. A & A1. Max. 5 Personen. Jetzt online buchen!',
  // 88 chars
  'Top-bewertet: 4.9 ★ bei Google. Motorrad Fahrschule Driving Team Lachen. Jetzt anmelden!',
  // 85 chars
  'Kleine Gruppe, persönliche Betreuung. 3 Kursteile à 4h in Lachen. CHF 190.- pro Teil.',
]

// Validate char lengths
for (const h of HEADLINES) {
  if (h.length > 30) console.warn(`⚠️  Headline too long (${h.length}): "${h}"`)
}
for (const d of DESCRIPTIONS) {
  if (d.length > 90) console.warn(`⚠️  Description too long (${d.length}): "${d}"`)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

function makeHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'developer-token': developerToken,
    'login-customer-id': customerId,
    'Content-Type': 'application/json',
  }
}

async function mutate(token, resource, operations) {
  const res = await fetch(`${ADS_BASE}/${customerPrefix}/${resource}:mutate`, {
    method: 'POST',
    headers: makeHeaders(token),
    body: JSON.stringify({ operations }),
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 500) } }
  if (!res.ok) throw new Error(`${resource}:mutate failed: ${JSON.stringify(data, null, 2)}`)
  return data
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n🚀 Creating campaign: ' + CAMPAIGN_NAME)
const token = await getAccessToken()
console.log('✓ OAuth token obtained')

// 1. Campaign Budget
console.log('\n1/5 Creating campaign budget (CHF ' + DAILY_BUDGET + '/day)...')
const budgetData = await mutate(token, 'campaignBudgets', [{
  create: {
    name: `Budget: ${CAMPAIGN_NAME}`,
    amountMicros: Math.round(DAILY_BUDGET * 1_000_000),
    deliveryMethod: 'STANDARD',
    explicitlyShared: false,
  },
}])
const budgetResourceName = budgetData.results[0].resourceName
console.log('✓ Budget:', budgetResourceName)

// 2. Campaign
console.log('\n2/5 Creating campaign (PAUSED)...')
const campaignData = await mutate(token, 'campaigns', [{
  create: {
    name: CAMPAIGN_NAME,
    status: 'PAUSED',
    advertisingChannelType: 'SEARCH',
    campaignBudget: budgetResourceName,
    networkSettings: {
      targetGoogleSearch: true,
      targetSearchNetwork: true,
      targetContentNetwork: false,
      targetPartnerSearchNetwork: false,
    },
    geoTargetTypeSetting: {
      positiveGeoTargetType: 'PRESENCE_OR_INTEREST',
      negativeGeoTargetType: 'PRESENCE',
    },
    manualCpc: { enhancedCpcEnabled: false },
  },
}])
const campaignResourceName = campaignData.results[0].resourceName
const campaignId = campaignResourceName.split('/').pop()
console.log('✓ Campaign:', campaignResourceName)

// 2b. Geo targeting: 20km radius around Lachen SZ
console.log('\n2b/5 Adding 20km proximity geo target (Lachen SZ)...')
try {
  const geoData = await mutate(token, 'campaignCriteria', [{
    create: {
      campaign: campaignResourceName,
      proximity: {
        geoPoint: {
          latitudeInMicroDegrees: GEO_LAT_MICRO,
          longitudeInMicroDegrees: GEO_LNG_MICRO,
        },
        radius: GEO_RADIUS_KM,
        radiusUnits: 'KILOMETERS',
      },
    },
  }])
  console.log('✓ Geo target (20km radius):', geoData.results[0].resourceName)
} catch (e) {
  console.warn('⚠️  Geo target failed (non-fatal):', e.message.slice(0, 200))
}

// 3. Ad Group
console.log('\n3/5 Creating ad group...')
const adGroupData = await mutate(token, 'adGroups', [{
  create: {
    name: `Motorrad Grundkurs Lachen – Hauptgruppe`,
    campaign: campaignResourceName,
    status: 'ENABLED',
    type: 'STANDARD',
  },
}])
const adGroupResourceName = adGroupData.results[0].resourceName
const adGroupId = adGroupResourceName.split('/').pop()
console.log('✓ Ad Group:', adGroupResourceName)

// 4. Keywords
console.log(`\n4/5 Adding ${KEYWORDS.length} keywords...`)
const keywordOps = KEYWORDS.map(kw => ({
  create: {
    adGroup: adGroupResourceName,
    status: 'ENABLED',
    keyword: { text: kw.text, matchType: kw.match_type },
    cpcBidMicros: Math.round(kw.cpc_chf * 1_000_000),
  },
}))
const keywordData = await mutate(token, 'adGroupCriteria', keywordOps)
const keywordsCreated = keywordData.results?.length ?? 0
console.log(`✓ Keywords created: ${keywordsCreated}`)

// 5. Responsive Search Ad
console.log('\n5/5 Creating RSA...')
const adData = await mutate(token, 'adGroupAds', [{
  create: {
    adGroup: adGroupResourceName,
    status: 'ENABLED',
    ad: {
      responsiveSearchAd: {
        headlines: HEADLINES.map((text, i) => ({
          text,
          ...(i < 3 ? { pinnedField: `HEADLINE_${i + 1}` } : {}),
        })),
        descriptions: DESCRIPTIONS.map((text, i) => ({
          text,
          ...(i < 2 ? { pinnedField: `DESCRIPTION_${i + 1}` } : {}),
        })),
      },
      finalUrls: [FINAL_URL],
    },
  },
}])
const adResourceName = adData.results[0].resourceName
console.log('✓ RSA:', adResourceName)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60))
console.log('✅ KAMPAGNE ERSTELLT (PAUSED)')
console.log('='.repeat(60))
console.log(`Campaign ID:    ${campaignId}`)
console.log(`Ad Group ID:    ${adGroupId}`)
console.log(`Keywords:       ${keywordsCreated}`)
console.log(`Headlines:      ${HEADLINES.length}`)
console.log(`Descriptions:   ${DESCRIPTIONS.length}`)
console.log(`Google Ads URL: https://ads.google.com/aw/campaigns?campaignId=${campaignId}`)
console.log('='.repeat(60))
console.log('⚠️  Kampagne ist PAUSED – bitte in Google Ads manuell aktivieren.')
