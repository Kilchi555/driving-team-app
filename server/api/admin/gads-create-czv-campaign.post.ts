/**
 * Creates the "CZV Grundkurs Lachen" Search campaign in PAUSED status.
 *
 * Target: Professional truck/bus drivers (Kat. C1/C/CE, D1/D) within 20km of Lachen, SZ.
 * Landing page: https://drivingteam.ch/czv-grundkurs/
 *
 * Why a dedicated campaign?
 *  - CZV is a B2B niche course (CHF 2200 per student) — high conversion value
 *  - CZV keywords were previously blocked as negatives in all other campaigns
 *  - The audience (Berufschauffeure) is fundamentally different from regular Fahrschule searchers
 *  - Lachen is our primary CZV location
 *
 * Structure:
 *  - Budget: CHF 20/day (CZV leads are high-value → justify higher spend)
 *  - Bidding: Manual CPC with enhanced CPC (switch to tCPA once data exists)
 *  - Geo: Proximity 20km radius around Lachen (47.1929, 8.8554) + exclude irrelevant terms
 *  - Ad Groups:
 *      1. "CZV Grundkurs" — core CZV intent
 *      2. "Berufschauffeur Ausbildung" — job-specific intent
 *      3. "Lastwagen C Führerschein" — licence category intent
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-create-czv-campaign \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * After creation:
 *  1. Review campaign + ads in Google Ads UI
 *  2. Enable the campaign (currently PAUSED)
 *  3. Monitor for 2–3 weeks; switch to tCPA once 5+ conversions collected
 */

import { defineEventHandler, getHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  const auth = getHeader(event, 'authorization') ?? ''
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // ── Credentials ───────────────────────────────────────────────────────────────
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId       = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret   = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken   = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId     = process.env.GOOGLE_ADS_CUSTOMER_ID
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    return { success: false, reason: 'missing_credentials' }
  }

  // ── OAuth ─────────────────────────────────────────────────────────────────────
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken.trim(),
      grant_type: 'refresh_token',
    }),
  })
  const tokenData = await tokenRes.json() as any
  if (!tokenData.access_token) return { success: false, reason: 'token_error', detail: tokenData }

  const accessToken = tokenData.access_token
  const GADS_VERSION = 'v23'
  const adsHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'login-customer-id': loginCustomerId || customerId,
    'Content-Type': 'application/json',
  }

  const customerPrefix = `customers/${customerId}`

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

  const LANDING_PAGE = 'https://drivingteam.ch/czv-grundkurs/'

  // ── Step 1: Budget (CHF 20/day — CZV leads are high value at CHF 2200/student) ─
  const budgetResult = await mutate('campaignBudgets', [{
    create: {
      name: 'Budget: CZV Grundkurs Lachen',
      amountMicros: 20_000_000, // CHF 20 / day
      deliveryMethod: 'STANDARD',
      explicitlyShared: false,
    },
  }])

  if (!budgetResult.ok) {
    return { success: false, step: 'campaignBudgets', reason: budgetResult.data }
  }

  const budgetResourceName: string = budgetResult.data.results?.[0]?.resourceName
  if (!budgetResourceName) {
    return { success: false, step: 'campaignBudgets', reason: 'no resourceName', detail: budgetResult.data }
  }

  // ── Step 2: Campaign ──────────────────────────────────────────────────────────
  const campaignResult = await mutate('campaigns', [{
    create: {
      name: 'CZV Grundkurs Lachen',
      status: 'PAUSED', // Enable manually after review
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
      // Manual CPC with eCPC — optimal for niche B2B with limited historical data
      manualCpc: { enhancedCpcEnabled: true },
      containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
    },
  }])

  if (!campaignResult.ok) {
    return { success: false, step: 'campaigns', reason: campaignResult.data }
  }

  const campaignResourceName: string = campaignResult.data.results?.[0]?.resourceName
  if (!campaignResourceName) {
    return { success: false, step: 'campaigns', reason: 'no resourceName', detail: campaignResult.data }
  }
  const campaignId = campaignResourceName.split('/').pop() as string

  // ── Step 2b: Geo target — 20km radius around Lachen, SZ ─────────────────────
  // Lachen coordinates: 47.1929° N, 8.8554° E (in micro-degrees)
  const geoResult = await mutate('campaignCriteria', [{
    create: {
      campaign: campaignResourceName,
      proximity: {
        geoPoint: {
          longitudeInMicroDegrees: 8_855_400,   // 8.8554° E
          latitudeInMicroDegrees: 47_192_900,   // 47.1929° N
        },
        radius: 20,
        radiusUnits: 'KILOMETERS',
      },
    },
  }])

  if (!geoResult.ok) {
    return { success: false, step: 'campaignCriteria (geo)', reason: geoResult.data, campaign_id: campaignId }
  }

  // ── Step 2c: Campaign-level negative keywords (protect relevance) ─────────────
  // These are irrelevant to CZV — WAB/VKU/regular driving school searchers
  const campaignNegatives = [
    { text: 'fahrschule', matchType: 'BROAD' },
    { text: 'fahrstunden', matchType: 'BROAD' },
    { text: 'vku kurs', matchType: 'PHRASE' },
    { text: 'verkehrskunde', matchType: 'PHRASE' },
    { text: 'nothelferkurs', matchType: 'BROAD' },
    { text: 'wab kurs', matchType: 'PHRASE' },
    { text: 'motorrad', matchType: 'BROAD' },
    { text: 'anhänger', matchType: 'BROAD' },
    { text: 'theorie lernen', matchType: 'PHRASE' },
    { text: 'theorieprüfung', matchType: 'BROAD' },
    { text: 'führerausweis kategorie b', matchType: 'PHRASE' },
    { text: 'kat b', matchType: 'PHRASE' },
    { text: 'weiterbildung', matchType: 'BROAD' }, // CZV Weiterbildung is a different campaign
  ]

  await mutate('campaignCriteria', campaignNegatives.map(kw => ({
    create: {
      campaign: campaignResourceName,
      negative: true,
      keyword: { text: kw.text, matchType: kw.matchType },
    },
  })))

  // ── Step 3: Ad Groups ─────────────────────────────────────────────────────────
  const adGroupConfigs = [
    {
      name: 'CZV Grundkurs',
      cpcBidMicros: 4_000_000, // CHF 4.00 — core term, high intent
      keywords: [
        { text: 'czv grundkurs', matchType: 'EXACT' },
        { text: 'czv grundkurs lachen', matchType: 'EXACT' },
        { text: 'czv grundkurs zürich', matchType: 'EXACT' },
        { text: 'czv grundkurs schwyz', matchType: 'EXACT' },
        { text: 'czv grundkurs pfäffikon', matchType: 'EXACT' },
        { text: 'czv grundkurs', matchType: 'PHRASE' },
        { text: 'czv kurs', matchType: 'PHRASE' },
        { text: 'czv ausbildung', matchType: 'PHRASE' },
        { text: 'czv grundausbildung', matchType: 'PHRASE' },
        { text: 'chauffeurzulassungsverordnung kurs', matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Berufschauffeur Ausbildung',
      cpcBidMicros: 3_500_000, // CHF 3.50
      keywords: [
        { text: 'berufschauffeur ausbildung', matchType: 'PHRASE' },
        { text: 'berufschauffeur kurs', matchType: 'PHRASE' },
        { text: 'berufschauffeur lachen', matchType: 'EXACT' },
        { text: 'berufschauffeur zürich', matchType: 'EXACT' },
        { text: 'berufschauffeur werden', matchType: 'PHRASE' },
        { text: 'fahrausweis berufsmässig', matchType: 'PHRASE' },
        { text: 'professioneller chauffeur ausbildung', matchType: 'PHRASE' },
        { text: 'fähigkeitsausweis berufschauffeur', matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Lastwagen C Führerschein',
      cpcBidMicros: 3_000_000, // CHF 3.00
      keywords: [
        { text: 'führerschein c lkw kurs', matchType: 'PHRASE' },
        { text: 'führerschein c ausbildung schweiz', matchType: 'PHRASE' },
        { text: 'führerausweis kategorie c ausbildung', matchType: 'PHRASE' },
        { text: 'kat c führerschein kurs', matchType: 'PHRASE' },
        { text: 'lastwagen führerschein kurs lachen', matchType: 'EXACT' },
        { text: 'lastwagen führerschein kurs zürich', matchType: 'EXACT' },
        { text: 'lkw führerschein c kurs', matchType: 'PHRASE' },
        { text: 'c1 ausbildung schweiz', matchType: 'PHRASE' },
        { text: 'ce führerschein kurs schweiz', matchType: 'PHRASE' },
      ],
    },
  ]

  const adGroupResults: any[] = []
  const adResults: any[] = []
  const kwResults: any[] = []

  for (const agConfig of adGroupConfigs) {
    // Create ad group
    const agResult = await mutate('adGroups', [{
      create: {
        name: agConfig.name,
        campaign: campaignResourceName,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD',
        cpcBidMicros: agConfig.cpcBidMicros,
      },
    }])

    if (!agResult.ok) {
      adGroupResults.push({ name: agConfig.name, error: agResult.data })
      continue
    }

    const agResourceName: string = agResult.data.results?.[0]?.resourceName
    adGroupResults.push({ name: agConfig.name, resource_name: agResourceName, ok: true })

    // Create keywords
    const kwOps = agConfig.keywords.map(kw => ({
      create: {
        adGroup: agResourceName,
        status: 'ENABLED',
        keyword: { text: kw.text, matchType: kw.matchType },
        cpcBidMicros: agConfig.cpcBidMicros,
      },
    }))
    const kwResult = await mutate('adGroupCriteria', kwOps)
    kwResults.push({ ad_group: agConfig.name, added: kwResult.data.results?.length ?? 0, ok: kwResult.ok })

    // Create RSA
    const adResult = await mutate('adGroupAds', [{
      create: {
        adGroup: agResourceName,
        status: 'ENABLED',
        ad: {
          responsiveSearchAd: agConfig.name === 'CZV Grundkurs'
            ? {
                headlines: [
                  { text: 'CZV Grundkurs Lachen', pinnedField: 'HEADLINE_1' },
                  { text: 'Berufschauffeur Ausbildung', pinnedField: 'HEADLINE_2' },
                  { text: '5 Tage | Flexibel planbar' },
                  { text: 'Fähigkeitsausweis sichern' },
                  { text: 'Kategorien C/CE und D/D1' },
                  { text: 'Inkl. Prüfungsvorbereitung' },
                  { text: 'Jetzt Platz reservieren' },
                  { text: 'CHF 2200 | Nächster Kurs bald' },
                ],
                descriptions: [
                  { text: 'Obligatorischer CZV Grundkurs für Berufsfahrer Kat. C/CE & D. 5 Tage intensiv, flexibel planbar. Nächster Kurs ab September 2026.', pinnedField: 'DESCRIPTION_1' },
                  { text: 'Professionelle Ausbildung mit Driving Team. Prüfungsvorbereitung inkl. | Region Lachen, Pfäffikon, Zürich.' },
                ],
                path1: 'CZV-Kurs',
                path2: 'Lachen',
              }
            : agConfig.name === 'Berufschauffeur Ausbildung'
              ? {
                  headlines: [
                    { text: 'Berufschauffeur werden', pinnedField: 'HEADLINE_1' },
                    { text: 'CZV Grundkurs Lachen', pinnedField: 'HEADLINE_2' },
                    { text: 'Fähigkeitsausweis in 5 Tagen' },
                    { text: 'Kategorien C/CE und D/D1' },
                    { text: 'Inkl. Prüfungsvorbereitung' },
                    { text: 'Jetzt Platz sichern' },
                  ],
                  descriptions: [
                    { text: 'Starte deine Karriere als Berufsfahrer mit dem CZV Grundkurs. 5 Tage Ausbildung, Fähigkeitsausweis inklusive.', pinnedField: 'DESCRIPTION_1' },
                    { text: 'Driving Team Lachen | Regionale Ausbildung für Kat. C/CE & D | Flexible Kursplanung | Jetzt anmelden' },
                  ],
                  path1: 'Berufschauffeur',
                  path2: 'Ausbildung',
                }
              : {
                  headlines: [
                    { text: 'Lastwagen Führerschein C/CE', pinnedField: 'HEADLINE_1' },
                    { text: 'CZV Grundkurs Lachen', pinnedField: 'HEADLINE_2' },
                    { text: 'Berufsmässig LKW fahren' },
                    { text: '5 Tage Ausbildung CH' },
                    { text: 'Fähigkeitsausweis sichern' },
                    { text: 'Jetzt Platz reservieren' },
                  ],
                  descriptions: [
                    { text: 'CZV Grundkurs für Kat. C1/C/CE (Lastwagen). 5 Tage Ausbildung, individuell planbar. Prüfungsvorbereitung inklusive.', pinnedField: 'DESCRIPTION_1' },
                    { text: 'Driving Team — Fahrschule Lachen | Region Lachen, Pfäffikon, Zürich | Inkl. C & CE Kategorien | Jetzt anmelden' },
                  ],
                  path1: 'LKW-Führerschein',
                  path2: 'CZV-Kurs',
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
    campaign_resource_name: campaignResourceName,
    campaign_name: 'CZV Grundkurs Lachen',
    landing_page: LANDING_PAGE,
    budget_chf_day: 20,
    geo_target: '20km radius around Lachen, SZ (47.1929, 8.8554)',
    ad_groups: adGroupResults,
    keywords: kwResults,
    ads: adResults,
    google_ads_url: `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
    next_steps: [
      '1. Kampagne in Google Ads UI überprüfen: ' + `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
      '2. Ad Copy prüfen — insbesondere Preis (CHF 2200) und Kursdaten (September 2026)',
      '3. Kampagne aktivieren (PAUSED → ENABLED)',
      '4. Ggf. CZV-Weiterbildung als separate Kampagne ergänzen (czv-weiterbildung.post.ts)',
      '5. Nach 2-3 Wochen: tCPA aktivieren wenn >= 5 Conversions vorhanden',
      '6. Callout Extensions hinzufügen: "5 Tage", "Flexibel", "Firmengruppen", "CHF 2200"',
    ],
  }
})
