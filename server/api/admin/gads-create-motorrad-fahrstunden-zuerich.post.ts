/**
 * Creates the "Motorrad Fahrstunden Zürich" Search campaign in PAUSED status.
 *
 * INTENT: Motorrad Einzelstunden / Fahrunterricht — nicht der Grundkurs.
 * Zielgruppe: Personen mit Kat. A/A2-Führerschein, die Fahrstunden buchen wollen.
 *
 * Landing page: https://drivingteam.ch/motorrad-fahrschule-zuerich/ (200 ✓)
 * Geo: 25km Radius um Altstetten (47.3897, 8.4883) — Zürich Motorrad-Standort
 *
 * Structure:
 *  - Budget: CHF 15/day
 *  - Bidding: Manual CPC, EXACT + PHRASE only (kein BROAD — Lachen-Lerneffekt)
 *  - Ad Groups:
 *      1. "Motorrad Fahrstunden" — direkte Buchungsintention
 *      2. "Motorrad Fahren Lernen" — Lernen-Intention
 *      3. "Motorrad Fahrschule Zürich" — Fahrschul-Suche mit Standort
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-create-motorrad-fahrstunden-zuerich \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { defineEventHandler } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const LANDING_PAGE = 'https://drivingteam.ch/motorrad-fahrschule-zuerich/'
const GADS_VERSION = 'v23'
const DAILY_BUDGET_CHF = 15

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const accessToken = await getGadsAccessToken(gads)
  const adsHeaders = buildGadsHeaders(gads, accessToken)
  const customerPrefix = `customers/${gads.customerId}`

  async function mutate(resource: string, operations: object[]): Promise<{ ok: boolean; data: any }> {
    const res = await fetch(`https://googleads.googleapis.com/${GADS_VERSION}/${customerPrefix}/${resource}:mutate`, {
      method: 'POST',
      headers: adsHeaders,
      body: JSON.stringify({ operations }),
    })
    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 500) } }
    return { ok: res.ok, data }
  }

  // ── Step 1: Budget ──────────────────────────────────────────────────────────
  const budgetRes = await mutate('campaignBudgets', [{
    create: {
      name: `Motorrad Fahrstunden Zürich Budget ${Date.now()}`,
      amountMicros: String(DAILY_BUDGET_CHF * 1_000_000),
      deliveryMethod: 'STANDARD',
    },
  }])
  if (!budgetRes.ok) return { success: false, step: 'budget', reason: budgetRes.data }
  const budgetResourceName = budgetRes.data.results[0].resourceName

  // ── Step 2: Campaign ────────────────────────────────────────────────────────
  const campaignRes = await mutate('campaigns', [{
    create: {
      name: 'Motorrad Fahrstunden Zürich',
      status: 'PAUSED',
      advertisingChannelType: 'SEARCH',
      campaignBudget: budgetResourceName,
      manualCpc: { enhancedCpcEnabled: false },
      networkSettings: {
        targetGoogleSearch: true,
        targetSearchNetwork: true,
        targetContentNetwork: false,
      },
      containsEuPoliticalAdvertising: 'NOT_EU_POLITICAL_ADVERTISING',
    },
  }])
  if (!campaignRes.ok) return { success: false, step: 'campaigns', reason: campaignRes.data }
  const campaignResourceName = campaignRes.data.results[0].resourceName

  // ── Step 3: Geo-targeting — 25km around Altstetten ─────────────────────────
  await mutate('campaignCriteria', [{
    create: {
      campaign: campaignResourceName,
      proximity: {
        geoPoint: { longitudeInMicroDegrees: 8488300, latitudeInMicroDegrees: 47389700 },
        radius: 25,
        radiusUnits: 'KILOMETERS',
      },
    },
  }])

  // ── Step 4: Campaign-level negative keywords ────────────────────────────────
  const campaignNegatives = [
    'czv', 'czv kurs', 'lkw', 'lastwagen', 'anhänger', 'motorrad grundkurs', 'vku',
    'roller prüfung', 'a1 führerschein', 'theorieprüfung', 'autoprüfung', 'autofahren',
    'motorrad kaufen', 'motorrad mieten', 'motorrad gebraucht', 'motorrad verkaufen',
    'motorrad versicherung', 'motorrad helm', 'motorrad zubehör', 'motorrad teile',
    'motorrad occasionen', 'roller kaufen', 'scooter kaufen',
  ]
  if (campaignNegatives.length > 0) {
    await mutate('campaignCriteria', campaignNegatives.map(text => ({
      create: {
        campaign: campaignResourceName,
        negative: true,
        keyword: { text, matchType: 'BROAD' },
      },
    })))
  }

  // ── Step 5: Ad Groups + Keywords + Ads ─────────────────────────────────────
  const adGroupDefs = [
    {
      name: 'Motorrad Fahrstunden',
      defaultCpcMicros: '3500000',
      keywords: [
        { text: 'motorrad fahrstunden zürich', matchType: 'EXACT' },
        { text: 'motorrad fahrstunden', matchType: 'PHRASE' },
        { text: 'fahrstunden motorrad zürich', matchType: 'EXACT' },
        { text: 'motorrad fahrunterricht zürich', matchType: 'EXACT' },
        { text: 'motorrad fahrunterricht', matchType: 'PHRASE' },
        { text: 'motorrad übungsstunden zürich', matchType: 'PHRASE' },
      ],
      headlines: [
        { text: 'Motorrad Fahrstunden Zürich', pinned_field: 'HEADLINE_1' },
        { text: 'Jetzt Stunde buchen' },
        { text: 'Motorrad Fahren mit Profi' },
        { text: 'Erfahrene Motorrad-Fahrlehrer' },
        { text: 'Flexibel buchbar – Zürich' },
        { text: 'Motorrad Fahrschule Zürich' },
        { text: 'Einzelstunden ab CHF 95' },
        { text: 'Fahrstunden nach Mass' },
        { text: 'Motorrad Fahren lernen' },
        { text: 'Driving Team Zürich' },
        { text: 'Fahrstunden Motorrad buchen' },
        { text: 'Professioneller Motorrad-Kurs' },
        { text: 'Individuelle Fahrstunden' },
        { text: 'Motorrad Fahrlehrer Zürich' },
        { text: 'Online Buchung möglich' },
      ],
      descriptions: [
        { text: 'Motorrad-Fahrstunden mit erfahrenen Fahrlehrern in Zürich. Jetzt Termin buchen!' },
        { text: 'Individuelle Motorrad-Fahrstunden in Zürich & Umgebung. Kat. A, A2, A beschränkt.' },
        { text: 'Professionelle Motorrad-Fahrlehrer in Zürich Altstetten. Online buchbar, flexibel.' },
        { text: 'Fahrstunden Motorrad buchen – Driving Team Zürich. Erfahren, modern, flexibel.' },
      ],
    },
    {
      name: 'Motorrad Fahren Lernen',
      defaultCpcMicros: '3000000',
      keywords: [
        { text: 'motorrad fahren lernen zürich', matchType: 'PHRASE' },
        { text: 'motorrad fahren lernen', matchType: 'PHRASE' },
        { text: 'motorrad fahren üben zürich', matchType: 'PHRASE' },
        { text: 'motorrad fahrkurs zürich', matchType: 'EXACT' },
        { text: 'motorrad fahrkurs', matchType: 'PHRASE' },
        { text: 'motorrad kurs zürich', matchType: 'PHRASE' },
      ],
      headlines: [
        { text: 'Motorrad Fahren Lernen Zürich', pinned_field: 'HEADLINE_1' },
        { text: 'Schritt für Schritt zum Profi' },
        { text: 'Fahrstunden mit Erfahrung' },
        { text: 'Driving Team Zürich' },
        { text: 'Motorrad Fahrschule Zürich' },
        { text: 'Jetzt Kurs buchen' },
        { text: 'Motorrad Fahren mit Profi' },
        { text: 'Kat. A & A2 Fahrstunden' },
        { text: 'Fahrstunden nach Mass' },
        { text: 'Professionelle Fahrlehrer' },
        { text: 'Individuelle Motorrad-Kurse' },
        { text: 'Motorrad sicher beherrschen' },
        { text: 'Online buchbar & flexibel' },
        { text: 'Erfahrene Motorrad-Lehrer' },
        { text: 'Zürich & Umgebung' },
      ],
      descriptions: [
        { text: 'Motorrad fahren lernen mit professionellen Fahrlehrern in Zürich. Sicher und effizient.' },
        { text: 'Motorrad-Fahrkurse & Einzelstunden in Zürich. Kat. A, A2, A beschränkt. Jetzt buchen!' },
        { text: 'Schritt für Schritt zum sicheren Motorradfahrer. Driving Team Zürich – online buchbar.' },
        { text: 'Motorrad fahren lernen in Zürich Altstetten. Individuelle Fahrstunden nach Mass.' },
      ],
    },
    {
      name: 'Motorrad Fahrschule Zürich',
      defaultCpcMicros: '3000000',
      keywords: [
        { text: 'motorrad fahrschule zürich', matchType: 'EXACT' },
        { text: 'motorrad fahrschule zürich altstetten', matchType: 'EXACT' },
        { text: 'motorrad fahrschule zürich schlieren', matchType: 'EXACT' },
        { text: 'motorrad fahrlehrer zürich', matchType: 'EXACT' },
        { text: 'motorrad fahrlehrer', matchType: 'PHRASE' },
        { text: 'fahrschule motorrad zürich', matchType: 'PHRASE' },
      ],
      headlines: [
        { text: 'Motorrad Fahrschule Zürich', pinned_field: 'HEADLINE_1' },
        { text: 'Erfahrene Motorrad-Fahrlehrer' },
        { text: 'Jetzt Termin buchen' },
        { text: 'Fahrstunden nach Vereinbarung' },
        { text: 'Kat. A, A2, A beschränkt' },
        { text: 'Driving Team Zürich' },
        { text: 'Motorrad Fahrstunden buchen' },
        { text: 'Zürich Altstetten & Schlieren' },
        { text: 'Professionelle Fahrlehrerinnen' },
        { text: 'Motorrad Fahren sicher lernen' },
        { text: 'Online Buchung in 2 Minuten' },
        { text: 'Flexible Terminwahl' },
        { text: 'Fahrschule mit Top-Bewertungen' },
        { text: 'Motorrad Fahrlehrer Zürich' },
        { text: 'Motorrad Fahren mit Profis' },
      ],
      descriptions: [
        { text: 'Motorrad Fahrschule Zürich – professionelle Fahrstunden mit erfahrenen Fahrlehrern.' },
        { text: 'Motorrad-Fahrstunden in Zürich Altstetten & Schlieren. Kat. A & A2. Online buchbar.' },
        { text: 'Erfahrene Motorrad-Fahrlehrer in Zürich. Flexible Termine, individuelle Betreuung.' },
        { text: 'Driving Team Zürich – Motorrad Fahrschule mit Top-Bewertungen. Jetzt Termin sichern!' },
      ],
    },
  ]

  const results: any[] = []

  for (const agDef of adGroupDefs) {
    // Create Ad Group
    const agRes = await mutate('adGroups', [{
      create: {
        name: agDef.name,
        campaign: campaignResourceName,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD',
        cpcBidMicros: agDef.defaultCpcMicros,
      },
    }])
    if (!agRes.ok) { results.push({ group: agDef.name, error: agRes.data }); continue }
    const agResourceName = agRes.data.results[0].resourceName

    // Create Keywords
    const kwOps = agDef.keywords.map(kw => ({
      create: {
        adGroup: agResourceName,
        status: 'ENABLED',
        keyword: { text: kw.text, matchType: kw.matchType },
      },
    }))
    const kwRes = await mutate('adGroupCriteria', kwOps)

    // Create RSA Ad
    const adRes = await mutate('adGroupAds', [{
      create: {
        adGroup: agResourceName,
        status: 'PAUSED',
        ad: {
          finalUrls: [LANDING_PAGE],
          responsiveSearchAd: {
            headlines: agDef.headlines.map(h => ({
              text: h.text,
              ...(h.pinned_field ? { pinnedField: h.pinned_field } : {}),
            })),
            descriptions: agDef.descriptions.map(d => ({ text: d.text })),
            path1: 'Motorrad',
            path2: 'Zuerich',
          },
        },
      },
    }])

    results.push({
      group: agDef.name,
      keywords_added: kwRes.ok ? agDef.keywords.length : 0,
      ad_created: adRes.ok,
      errors: [
        ...(kwRes.ok ? [] : [kwRes.data]),
        ...(adRes.ok ? [] : [adRes.data]),
      ].filter(Boolean),
    })
  }

  const campaignId = campaignResourceName.split('/').pop()

  return {
    success: true,
    campaign: 'Motorrad Fahrstunden Zürich',
    campaign_id: campaignId,
    status: 'PAUSED',
    budget_chf_per_day: DAILY_BUDGET_CHF,
    landing_page: LANDING_PAGE,
    ad_groups: results,
    next_steps: [
      'Kampagne in Google Ads UI überprüfen und aktivieren',
      'Anzeigen freigeben (aktuell PAUSED)',
      `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
    ],
    google_ads_url: `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
  }
})
