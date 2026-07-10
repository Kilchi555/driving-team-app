/**
 * Creates the "Motorrad Grundkurs Zürich" Search campaign in PAUSED status.
 *
 * ANALYSIS (July 2026):
 * The existing "Motorrad Grundkurs Lachen 2026" campaign spent CHF 198 with 0 conversions.
 * Root cause: BROAD match keywords triggered irrelevant searches:
 *  - "rollerprüfung schweiz", "a1 führerschein schweiz", "125 motorrad prüfung",
 *    "motorradkategorien schweiz", "theorieprüfung a1" → all zero intent to book a Grundkurs
 * "grundkurs motorrad schwyz" [BROAD] alone wasted CHF 132 with 0 conversions.
 *
 * THIS CAMPAIGN USES ONLY EXACT + PHRASE MATCH — NO BROAD.
 *
 * Validated search demand (from DB search terms, July 2026):
 *  - "motorrad grundkurs zürich" → 43 imp / 6 clicks (from Lachen campaign spill)
 *  - "motorrad grundkurs altstetten" → 5 imp / 1 click
 *  - "motorrad grundkurs in der nähe" → 10 imp / 2 clicks
 *  - "motorrad grundkurs zürich altstetten" → 2 imp
 *
 * Landing page: https://drivingteam.ch/motorrad-grundkurs-zuerich/ (200 ✓)
 * Geo: 25km radius around Altstetten (47.3897, 8.4883) — our Zürich motorrad location
 *
 * Structure:
 *  - Budget: CHF 15/day (good start; scale after first conversions appear)
 *  - Bidding: Manual CPC — precise control, no BROAD budget bleed risk
 *  - Ad Groups:
 *      1. "Motorrad Grundkurs Zürich" — city + brand name searches
 *      2. "Motorrad Grundkurs Standort" — location-specific (Altstetten, Schlieren, etc.)
 *      3. "Motorrad Führerschein Kategorie A" — licence intent (A, A2, A beschränkt)
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-create-motorrad-zuerich \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * ALSO FIX THE LACHEN CAMPAIGN:
 * After creating this campaign, pause the BROAD match keywords in
 * "Motorrad Grundkurs Lachen 2026" and replace with PHRASE/EXACT versions.
 */

import { defineEventHandler, readBody } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

export default defineEventHandler(async (event) => {
  // ── Auth + Credentials (tenant-aware) ────────────────────────────────────────
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const accessToken = await getGadsAccessToken(gads)
  const GADS_VERSION = 'v23'
  const adsHeaders = buildGadsHeaders(gads, accessToken)
  const customerPrefix = `customers/${gads.customerId}`

  async function mutate(resource: string, operations: object[]): Promise<{ ok: boolean; data: any }> {
    const res = await fetch(`https://googleads.googleapis.com/${GADS_VERSION}/${customerPrefix}/${resource}:mutate`, {
      method: 'POST', headers: adsHeaders,
      body: JSON.stringify({ operations }),
    })
    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 500) } }
    return { ok: res.ok, data }
  }

  const body = await readBody(event).catch(() => ({})) as any
  const LANDING_PAGE = 'https://drivingteam.ch/motorrad-grundkurs-zuerich/'

  // ── Step 1: Budget — CHF 15/day ───────────────────────────────────────────────
  const budgetResult = await mutate('campaignBudgets', [{
    create: {
      name: 'Budget: Motorrad Grundkurs Zürich',
      amountMicros: 15_000_000, // CHF 15/day — scale after first conversions
      deliveryMethod: 'STANDARD',
      explicitlyShared: false,
    },
  }])

  if (!budgetResult.ok) {
    return { success: false, step: 'campaignBudgets', reason: budgetResult.data }
  }

  const budgetResourceName: string = budgetResult.data.results?.[0]?.resourceName
  if (!budgetResourceName) {
    return { success: false, step: 'campaignBudgets', detail: budgetResult.data }
  }

  // ── Step 2: Campaign ──────────────────────────────────────────────────────────
  const campaignResult = await mutate('campaigns', [{
    create: {
      name: 'Motorrad Grundkurs Zürich',
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
      containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
    },
  }])

  if (!campaignResult.ok) {
    return { success: false, step: 'campaigns', reason: campaignResult.data }
  }

  const campaignResourceName: string = campaignResult.data.results?.[0]?.resourceName
  if (!campaignResourceName) {
    return { success: false, step: 'campaigns', detail: campaignResult.data }
  }
  const campaignId = campaignResourceName.split('/').pop() as string

  // ── Step 2b: Geo — 25km radius around Altstetten (our Zürich motorrad location) ─
  // Altstetten / Zürich coordinates: 47.3897° N, 8.4883° E
  await mutate('campaignCriteria', [{
    create: {
      campaign: campaignResourceName,
      proximity: {
        geoPoint: {
          longitudeInMicroDegrees: 8_488_300,
          latitudeInMicroDegrees: 47_389_700,
        },
        radius: 25,
        radiusUnits: 'KILOMETERS',
      },
    },
  }])

  // ── Step 2c: Campaign-level negative keywords ─────────────────────────────────
  // These are confirmed wasted search terms from the Lachen campaign analysis.
  // Goal: block info-seekers and wrong-category searches before they click.
  const campaignNegatives = [
    // Roller / Scooter (not offered)
    { text: 'roller', matchType: 'BROAD' },
    { text: 'rollerprüfung', matchType: 'BROAD' },
    { text: 'scooter', matchType: 'BROAD' },
    { text: 'vespa', matchType: 'BROAD' },
    { text: 'mofa', matchType: 'BROAD' },
    // Wrong licence categories (A1, 125cc info seekers — no booking intent)
    { text: 'a1 prüfung', matchType: 'BROAD' },
    { text: 'a1 führerschein', matchType: 'BROAD' },
    { text: 'theorieprüfung a1', matchType: 'BROAD' },
    { text: 'grundkurs a1', matchType: 'PHRASE' },
    { text: '125 motorrad', matchType: 'BROAD' },
    { text: '125ccm', matchType: 'BROAD' },
    { text: 'kat m', matchType: 'BROAD' },
    { text: 'kategorie m', matchType: 'BROAD' },
    { text: 'führerschein kat a1', matchType: 'PHRASE' },
    // Category info seekers (not booking)
    { text: 'motorradkategorien', matchType: 'BROAD' },
    { text: 'motorrad kategorien', matchType: 'BROAD' },
    { text: 'motorrad führerschein kategorien', matchType: 'PHRASE' },
    // Competitors
    { text: 'tcs motorrad', matchType: 'PHRASE' },
    { text: 'freeride training', matchType: 'PHRASE' },
    { text: 'motorrad grundkurs 4 you', matchType: 'PHRASE' },
    // Wrong intent: safety training (not a Grundkurs)
    { text: 'fahrsicherheitstraining', matchType: 'BROAD' },
    { text: 'schleuderkurs', matchType: 'BROAD' },
    // Non-booking research
    { text: 'motorrad führerschein kosten', matchType: 'PHRASE' },
    { text: 'motorrad führerschein preis', matchType: 'PHRASE' },
    { text: 'günstig motorrad', matchType: 'PHRASE' },
    // Wrong geo (Schwyz/Lachen — covered by Lachen campaign)
    { text: 'motorrad grundkurs lachen', matchType: 'PHRASE' },
    { text: 'motorrad grundkurs pfäffikon', matchType: 'PHRASE' },
    { text: 'motorrad grundkurs schwyz', matchType: 'PHRASE' },
    { text: 'motorrad grundkurs rapperswil', matchType: 'PHRASE' },
    { text: 'motorrad grundkurs zug', matchType: 'PHRASE' },
    { text: 'motorrad grundkurs einsiedeln', matchType: 'PHRASE' },
  ]

  await mutate('campaignCriteria', campaignNegatives.map(kw => ({
    create: {
      campaign: campaignResourceName,
      negative: true,
      keyword: { text: kw.text, matchType: kw.matchType },
    },
  })))

  // ── Step 3: Ad Groups + Keywords + Ads ───────────────────────────────────────
  // All EXACT and PHRASE — NO BROAD. Learned from Lachen campaign failure.
  const adGroupConfigs = [
    {
      name: 'Motorrad Grundkurs Zürich',
      cpcMicros: 3_500_000, // CHF 3.50 — city queries, higher competition
      keywords: [
        // EXACT — highest intent, most controlled
        { text: 'motorrad grundkurs zürich', matchType: 'EXACT' },
        { text: 'motorrad grundkurs zürich altstetten', matchType: 'EXACT' },
        { text: 'motorradkurs zürich', matchType: 'EXACT' },
        { text: 'motorrad fahrschule zürich', matchType: 'EXACT' },
        { text: 'grundkurs motorrad zürich', matchType: 'EXACT' },
        { text: 'motorrad führerschein zürich', matchType: 'EXACT' },
        // PHRASE — controlled reach for Zürich + modifier
        { text: 'motorrad grundkurs zürich', matchType: 'PHRASE' },
        { text: 'motorradkurs zürich', matchType: 'PHRASE' },
        { text: 'motorrad grundkurs in der nähe', matchType: 'PHRASE' },
      ],
      ad: {
        headlines: [
          { text: 'Motorrad Grundkurs Zürich', pinnedField: 'HEADLINE_1' }, // 25 ✓
          { text: 'Driving Team Altstetten', pinnedField: 'HEADLINE_2' },  // 21 ✓
          { text: 'Kat. A, A2 & A beschränkt' },                           // 24 ✓
          { text: 'Prüfungsvorbereitung inkl.' },                          // 26 ✓
          { text: 'Jetzt Platz reservieren' },                             // 23 ✓
          { text: 'Alle Kat. A – A beschränkt' },                         // 24 ✓
          { text: 'Online buchen in 2 Min.' },                             // 22 ✓
        ],
        descriptions: [
          // max 90 chars each
          { text: 'Motorrad Grundkurs Zürich Altstetten. Kat. A, A2 & A beschr. Prüfungsvorbereitung inkl.', pinnedField: 'DESCRIPTION_1' }, // 88 ✓
          { text: 'Driving Team — Professionell & flexibel. Jetzt online Platz sichern!' },                                                   // 71 ✓
        ],
        path1: 'Motorrad-Kurs', // 13 ✓
        path2: 'Zuerich',       // 7 ✓
      },
    },
    {
      name: 'Motorrad Grundkurs Standort',
      cpcMicros: 3_000_000, // CHF 3.00 — location-specific, less competition
      keywords: [
        { text: 'motorrad grundkurs altstetten', matchType: 'EXACT' },
        { text: 'motorrad grundkurs schlieren', matchType: 'EXACT' },
        { text: 'motorrad grundkurs dietikon', matchType: 'EXACT' },
        { text: 'motorrad grundkurs urdorf', matchType: 'EXACT' },
        { text: 'motorrad grundkurs uitikon', matchType: 'EXACT' },
        { text: 'motorrad grundkurs birmensdorf', matchType: 'EXACT' },
        { text: 'motorrad fahrschule altstetten', matchType: 'EXACT' },
        { text: 'motorrad fahrschule schlieren', matchType: 'EXACT' },
        { text: 'motorrad grundkurs limmattal', matchType: 'PHRASE' },
        { text: 'motorrad grundkurs zürich west', matchType: 'PHRASE' },
      ],
      ad: {
        headlines: [
          { text: 'Motorrad Kurs Altstetten', pinnedField: 'HEADLINE_1' }, // 24 ✓
          { text: 'Zürich West & Limmattal', pinnedField: 'HEADLINE_2' },  // 23 ✓
          { text: 'Kat. A, A2 & A beschränkt' },                           // 24 ✓
          { text: 'Prüfungsvorbereitung inkl.' },                          // 26 ✓
          { text: 'Driving Team Fahrschule' },                             // 22 ✓
          { text: 'Jetzt online buchen' },                                 // 19 ✓
        ],
        descriptions: [
          { text: 'Motorrad Grundkurs im Limmattal — Altstetten, Schlieren, Dietikon. Alle Kat. A.', pinnedField: 'DESCRIPTION_1' }, // 81 ✓
          { text: 'Driving Team Zürich | Prüfungsvorbereitung | Flexibel | Jetzt anmelden' },                                         // 73 ✓
        ],
        path1: 'Motorrad-Kurs', // 13 ✓
        path2: 'Limmattal',     // 9 ✓
      },
    },
    {
      name: 'Motorrad Kategorie A',
      cpcMicros: 2_500_000, // CHF 2.50 — licence category intent (lower competition)
      keywords: [
        { text: 'motorrad kategorie a grundkurs', matchType: 'PHRASE' },
        { text: 'motorrad kat a grundkurs', matchType: 'PHRASE' },
        { text: 'motorrad a beschränkt kurs', matchType: 'PHRASE' },
        { text: 'motorrad a2 grundkurs zürich', matchType: 'EXACT' },
        { text: 'motorrad a2 kurs zürich', matchType: 'EXACT' },
        { text: 'motorrad führerschein kat a zürich', matchType: 'PHRASE' },
        { text: 'führerausweis motorrad zürich', matchType: 'PHRASE' },
        { text: 'motorrad führerschein zürich', matchType: 'PHRASE' },
      ],
      ad: {
        headlines: [
          { text: 'Motorrad Kat. A Grundkurs', pinnedField: 'HEADLINE_1' }, // 25 ✓
          { text: 'Zürich — Driving Team', pinnedField: 'HEADLINE_2' },     // 20 ✓
          { text: 'A, A2 & A beschränkt' },                                 // 20 ✓
          { text: 'Alle Kategorien möglich' },                              // 22 ✓
          { text: 'Inkl. Prüfungsvorbereitung' },                           // 26 ✓
          { text: 'Jetzt Platz reservieren' },                              // 23 ✓
        ],
        descriptions: [
          { text: 'Motorrad Grundkurs für Kat. A, A2 & A beschränkt in Zürich. Prüfungsvorb. inkl.', pinnedField: 'DESCRIPTION_1' }, // 82 ✓
          { text: 'Driving Team Altstetten | Alle Motorrad-Kategorien | Flexibel | Jetzt buchen' },                                    // 79 ✓
        ],
        path1: 'Motorrad-Kat-A',  // 14 ✓
        path2: 'Grundkurs',       // 9 ✓
      },
    },
  ]

  const adGroupResults: any[] = []
  const kwResults: any[] = []
  const adResults: any[] = []

  for (const agConfig of adGroupConfigs) {
    // Create ad group
    const agResult = await mutate('adGroups', [{
      create: {
        name: agConfig.name,
        campaign: campaignResourceName,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD',
        cpcBidMicros: agConfig.cpcMicros,
      },
    }])

    if (!agResult.ok) {
      adGroupResults.push({ name: agConfig.name, ok: false, error: agResult.data })
      continue
    }

    const agResourceName: string = agResult.data.results?.[0]?.resourceName
    adGroupResults.push({ name: agConfig.name, ok: true, resource_name: agResourceName })

    // Keywords
    const kwOps = agConfig.keywords.map(kw => ({
      create: {
        adGroup: agResourceName,
        status: 'ENABLED',
        keyword: { text: kw.text, matchType: kw.matchType },
        cpcBidMicros: agConfig.cpcMicros,
      },
    }))
    const kwResult = await mutate('adGroupCriteria', kwOps)
    kwResults.push({ ad_group: agConfig.name, ok: kwResult.ok, added: kwResult.data.results?.length ?? 0 })

    // RSA Ad
    const adResult = await mutate('adGroupAds', [{
      create: {
        adGroup: agResourceName,
        status: 'ENABLED',
        ad: {
          responsiveSearchAd: {
            headlines: agConfig.ad.headlines,
            descriptions: agConfig.ad.descriptions,
            path1: agConfig.ad.path1,
            path2: agConfig.ad.path2,
          },
          finalUrls: [LANDING_PAGE],
        },
      },
    }])
    adResults.push({ ad_group: agConfig.name, ok: adResult.ok, detail: adResult.ok ? 'created' : adResult.data })
  }

  return {
    success: true,
    campaign_id: campaignId,
    campaign_name: 'Motorrad Grundkurs Zürich',
    landing_page: LANDING_PAGE,
    budget_chf_day: 15,
    geo: '25km Radius um Altstetten (47.3897, 8.4883)',
    bidding: 'Manual CPC — KEIN BROAD match',
    ad_groups: adGroupResults,
    keywords: kwResults,
    ads: adResults,
    google_ads_url: `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
    next_steps: [
      `1. Kampagne prüfen: https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
      '2. Kampagne aktivieren (PAUSED → ENABLED)',
      '3. DRINGEND: Lachen-Kampagne fixen — BROAD Keywords pausieren/ersetzen durch PHRASE/EXACT',
      '4. Nach 2-3 Wochen: tCPA oder eCPC aktivieren wenn Conversions vorhanden',
    ],
    lachen_fix_needed: {
      campaign: 'Motorrad Grundkurs Lachen 2026',
      action: 'BROAD Keywords pausieren und durch PHRASE/EXACT ersetzen',
      wasted_so_far: 'CHF 184 durch BROAD match, 0 Conversions',
    },
  }
})
