/**
 * Reusable promo campaign generator — "Erste Fahrstunde vergünstigt"
 *
 * Creates a time-limited Search campaign for a discounted first driving lesson.
 * Designed to be called repeatedly whenever a promotion is needed.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-create-promo-campaign \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "location": "zuerich",
 *       "offer_price_chf": 47.50,
 *       "original_price_chf": 95,
 *       "offer_end_date": "2026-07-31",
 *       "daily_budget_chf": 20
 *     }'
 *
 * Locations: "zuerich" | "lachen"
 *
 * The campaign is created PAUSED — enable manually after reviewing ad copy.
 * Campaign name includes location + offer + end date for easy identification:
 *   "Promo: Halber Preis Zürich (bis 31.07.26)"
 */

import { defineEventHandler, readBody } from 'h3'

// ── Location configs ──────────────────────────────────────────────────────────
// Each location has: geo coordinates, radius, keywords, city variants, landing page
const LOCATION_CONFIGS: Record<string, {
  label: string
  landingPage: string
  geo: { lat: number; lng: number; radiusKm: number }
  cities: string[]  // for location-specific ad groups
  keywords: {
    generic: string[]  // "fahrschule + city" style
    specific: string[] // "fahrstunden + local areas"
  }
}> = {
  zuerich: {
    label: 'Zürich',
    landingPage: 'https://drivingteam.ch/fahrschule-zuerich/',
    geo: { lat: 47.3897, lng: 8.4883, radiusKm: 25 }, // Altstetten
    cities: ['zürich', 'altstetten', 'schlieren', 'dietikon', 'urdorf', 'spreitenbach'],
    keywords: {
      generic: [
        'fahrschule zürich',
        'fahrstunden zürich',
        'fahrlehrer zürich',
        'günstige fahrschule zürich',
        'fahrschule anmelden zürich',
        'fahrschule zürich günstig',
        'erste fahrstunde zürich',
      ],
      specific: [
        'fahrschule altstetten',
        'fahrschule schlieren',
        'fahrschule dietikon',
        'fahrschule urdorf',
        'fahrschule limmattal',
        'fahrstunden altstetten',
        'fahrstunden schlieren',
        'fahrlehrer altstetten',
      ],
    },
  },
  lachen: {
    label: 'Lachen',
    landingPage: 'https://drivingteam.ch/fahrschule-lachen/',
    geo: { lat: 47.1929, lng: 8.8554, radiusKm: 20 }, // Lachen, SZ
    cities: ['lachen', 'pfäffikon', 'altendorf', 'siebnen', 'tuggen', 'schübelbach'],
    keywords: {
      generic: [
        'fahrschule lachen',
        'fahrstunden lachen',
        'fahrlehrer lachen',
        'günstige fahrschule lachen',
        'fahrschule pfäffikon sz',
        'fahrstunden pfäffikon',
        'erste fahrstunde lachen',
      ],
      specific: [
        'fahrschule altendorf',
        'fahrschule siebnen',
        'fahrschule march',
        'fahrschule schübelbach',
        'fahrstunden pfäffikon sz',
        'fahrlehrer pfäffikon',
        'fahrschule obersee',
      ],
    },
  },
}

// ── Negative keywords — same across all promo campaigns ───────────────────────
// Block searches with no intent to book a first lesson
const PROMO_NEGATIVES = [
  { text: 'fahrprüfung anmelden', matchType: 'PHRASE' },
  { text: 'fahrprüfung termin', matchType: 'PHRASE' },
  { text: 'theorieprüfung', matchType: 'BROAD' },
  { text: 'vku kurs', matchType: 'PHRASE' },
  { text: 'verkehrskunde', matchType: 'PHRASE' },
  { text: 'anhänger', matchType: 'BROAD' },
  { text: 'motorrad', matchType: 'BROAD' },
  { text: 'lastwagen', matchType: 'BROAD' },
  { text: 'führerausweis verloren', matchType: 'PHRASE' },
  { text: 'führerausweis umtauschen', matchType: 'PHRASE' },
  { text: 'fahrausweis umschreiben', matchType: 'PHRASE' },
  { text: 'strassenverkehrsamt', matchType: 'BROAD' },
  { text: 'nothelferkurs', matchType: 'BROAD' },
  { text: 'czv', matchType: 'BROAD' },
  { text: 'fahrschule jobs', matchType: 'PHRASE' },
  { text: 'fahrlehrer werden', matchType: 'PHRASE' },
  { text: 'kontrollfahrt', matchType: 'BROAD' },
]

export default defineEventHandler(async (event) => {
  // ── Auth + Credentials (tenant-aware) ────────────────────────────────────────
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  // ── Body ──────────────────────────────────────────────────────────────────────
  const body = await readBody(event) as {
    location: string
    offer_price_chf: number
    original_price_chf: number
    offer_end_date: string      // "YYYY-MM-DD"
    daily_budget_chf?: number
    landing_page?: string       // optional override
    dry_run?: boolean
  }

  const locationKey = body?.location?.toLowerCase()
  const locationConfig = LOCATION_CONFIGS[locationKey]

  if (!locationConfig) {
    return { ok: false, reason: `Unknown location. Use: ${Object.keys(LOCATION_CONFIGS).join(', ')}` }
  }

  if (!body?.offer_price_chf || !body?.original_price_chf || !body?.offer_end_date) {
    return { ok: false, reason: 'Required: offer_price_chf, original_price_chf, offer_end_date (YYYY-MM-DD)' }
  }

  const offerPrice = body.offer_price_chf
  const originalPrice = body.original_price_chf
  const endDate = new Date(body.offer_end_date)
  const endDateFormatted = endDate.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const dailyBudget = body.daily_budget_chf ?? 20
  const landingPage = body.landing_page ?? locationConfig.landingPage
  const dryRun = body.dry_run === true

  // ── Compute ad copy values ────────────────────────────────────────────────────
  const discountPct = Math.round(((originalPrice - offerPrice) / originalPrice) * 100)
  const isHalfPrice = discountPct === 50
  const offerLabel = isHalfPrice
    ? 'Halber Preis'
    : `${discountPct}% Rabatt`

  const campaignName = `Promo: ${offerLabel} ${locationConfig.label} (bis ${endDateFormatted})`

  // Format as CHF string: 47.50 → "47.50", 45.00 → "45.–"
  const formatChf = (n: number) => n % 1 === 0 ? `${n}.–` : `${n.toFixed(2)}`
  const offerPriceStr = formatChf(offerPrice)
  const originalPriceStr = formatChf(originalPrice)

  if (dryRun) {
    return {
      dry_run: true,
      campaign_name: campaignName,
      location: locationConfig.label,
      landing_page: landingPage,
      offer: `${offerLabel}: CHF ${offerPriceStr} statt CHF ${originalPriceStr}`,
      geo: `${locationConfig.geo.radiusKm}km Radius um ${locationConfig.label}`,
      budget: `CHF ${dailyBudget}/Tag`,
      ad_groups: ['1. Fahrstunde Aktion', 'Fahrschule Standort Promo'],
      keywords_count: locationConfig.keywords.generic.length + locationConfig.keywords.specific.length,
      sample_headline_1: `1. Fahrstunde — ${offerLabel}`,
      sample_headline_2: `CHF ${offerPriceStr} statt CHF ${originalPriceStr}`,
      sample_headline_3: `Noch {=COUNTDOWN("${body.offer_end_date}")} Tage`,
    }
  }

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

  // ── Step 1: Budget ────────────────────────────────────────────────────────────
  const budgetResult = await mutate('campaignBudgets', [{
    create: {
      name: `Budget: ${campaignName}`,
      amountMicros: Math.round(dailyBudget * 1_000_000),
      deliveryMethod: 'STANDARD',
      explicitlyShared: false,
    },
  }])
  if (!budgetResult.ok) return { ok: false, step: 'campaignBudgets', detail: budgetResult.data }
  const budgetResourceName: string = budgetResult.data.results?.[0]?.resourceName

  // ── Step 2: Campaign ──────────────────────────────────────────────────────────
  const campaignResult = await mutate('campaigns', [{
    create: {
      name: campaignName,
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
  if (!campaignResult.ok) return { ok: false, step: 'campaigns', detail: campaignResult.data }
  const campaignResourceName: string = campaignResult.data.results?.[0]?.resourceName
  const campaignId = campaignResourceName.split('/').pop() as string

  // ── Step 2b: Geo radius ───────────────────────────────────────────────────────
  await mutate('campaignCriteria', [{
    create: {
      campaign: campaignResourceName,
      proximity: {
        geoPoint: {
          longitudeInMicroDegrees: Math.round(locationConfig.geo.lng * 1_000_000),
          latitudeInMicroDegrees: Math.round(locationConfig.geo.lat * 1_000_000),
        },
        radius: locationConfig.geo.radiusKm,
        radiusUnits: 'KILOMETERS',
      },
    },
  }])

  // ── Step 2c: Campaign-level negative keywords ─────────────────────────────────
  await mutate('campaignCriteria', PROMO_NEGATIVES.map(kw => ({
    create: {
      campaign: campaignResourceName,
      negative: true,
      keyword: { text: kw.text, matchType: kw.matchType },
    },
  })))

  // ── Step 3: Ad Groups ─────────────────────────────────────────────────────────
  // Google Ads headline/description limits enforced below
  // Headlines: max 30 chars | Descriptions: max 90 chars | Paths: max 15 chars

  const adGroupConfigs = [
    {
      name: `1. Fahrstunde Aktion ${locationConfig.label}`,
      cpcMicros: 3_000_000, // CHF 3.00
      keywords: locationConfig.keywords.generic.map(text => ({
        text,
        matchType: 'PHRASE' as const,
      })).concat(locationConfig.keywords.generic.map(text => ({
        text,
        matchType: 'EXACT' as const,
      }))),
      headlines: [
        { text: `1. Fahrstunde — ${offerLabel}`, pinnedField: 'HEADLINE_1' },       // max 30
        { text: `CHF ${offerPriceStr} statt CHF ${originalPriceStr}`, pinnedField: 'HEADLINE_2' }, // max 30
        { text: `Jetzt Platz sichern` },                                             // 19
        { text: `Kein Vertrag, sofort buchbar` },                                    // 28
        { text: `Driving Team Fahrschule` },                                         // 22
        { text: `Online buchen in 2 Min.` },                                         // 22
        { text: `Top bewertet & regional` },                                          // 22
      ],
      descriptions: [
        {
          text: `${offerLabel} auf Ihre 1. Fahrstunde — CHF ${offerPriceStr} statt CHF ${originalPriceStr}. Kein Vertrag.`,
          pinnedField: 'DESCRIPTION_1',
        },
        {
          text: `Driving Team ${locationConfig.label} | Professionell & flexibel | Jetzt online buchen!`,
        },
      ],
      path1: 'Fahrstunde',   // 10 ✓
      path2: 'Aktion',       // 6 ✓
    },
    {
      name: `Fahrschule ${locationConfig.label} Standort`,
      cpcMicros: 2_500_000, // CHF 2.50 — location-specific, less competition
      keywords: locationConfig.keywords.specific.map(text => ({
        text,
        matchType: 'EXACT' as const,
      })).concat(locationConfig.keywords.specific.slice(0, 4).map(text => ({
        text,
        matchType: 'PHRASE' as const,
      }))),
      headlines: [
        { text: `Fahrschule ${locationConfig.label}`, pinnedField: 'HEADLINE_1' },
        { text: `${offerLabel}: CHF ${offerPriceStr}`, pinnedField: 'HEADLINE_2' },
        { text: `1. Fahrstunde vergünstigt` },  // 25
        { text: `Kein Vertrag, flexibel` },      // 21
        { text: `Driving Team Fahrschule` },     // 22
        { text: `Jetzt online buchen` },         // 19
      ],
      descriptions: [
        {
          text: `Fahrschule ${locationConfig.label} — 1. Fahrstunde für CHF ${offerPriceStr} statt CHF ${originalPriceStr}.`,
          pinnedField: 'DESCRIPTION_1',
        },
        {
          text: `Kein Vertrag | Professionell | Top bewertet | Jetzt Platz sichern!`,
        },
      ],
      path1: locationConfig.label.slice(0, 15), // max 15
      path2: 'Aktion',                           // 6 ✓
    },
  ]

  const adGroupResults: any[] = []
  const kwResults: any[] = []
  const adResults: any[] = []

  for (const agConfig of adGroupConfigs) {
    // Validate + clamp headlines/descriptions to API limits
    const safeHeadlines = agConfig.headlines
      .map(h => ({ ...h, text: h.text.slice(0, 30) }))
      .filter(h => h.text.length >= 1)

    const safeDescriptions = agConfig.descriptions
      .map(d => ({ ...d, text: d.text.slice(0, 90) }))

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
    adGroupResults.push({ name: agConfig.name, ok: true })

    // Keywords (deduplicated)
    const uniqueKws = agConfig.keywords.filter(
      (kw, i, arr) => arr.findIndex(k => k.text === kw.text && k.matchType === kw.matchType) === i,
    )
    const kwResult = await mutate('adGroupCriteria', uniqueKws.map(kw => ({
      create: {
        adGroup: agResourceName,
        status: 'ENABLED',
        keyword: { text: kw.text, matchType: kw.matchType },
        cpcBidMicros: agConfig.cpcMicros,
      },
    })))
    kwResults.push({ ad_group: agConfig.name, ok: kwResult.ok, added: kwResult.data.results?.length ?? 0 })

    // RSA Ad
    const adResult = await mutate('adGroupAds', [{
      create: {
        adGroup: agResourceName,
        status: 'ENABLED',
        ad: {
          responsiveSearchAd: {
            headlines: safeHeadlines,
            descriptions: safeDescriptions,
            path1: agConfig.path1,
            path2: agConfig.path2,
          },
          finalUrls: [landingPage],
        },
      },
    }])
    adResults.push({ ad_group: agConfig.name, ok: adResult.ok, detail: adResult.ok ? 'created' : adResult.data })
  }

  return {
    ok: true,
    campaign_id: campaignId,
    campaign_name: campaignName,
    location: locationConfig.label,
    offer: `${offerLabel}: CHF ${offerPriceStr} statt CHF ${originalPriceStr}`,
    landing_page: landingPage,
    budget_chf_day: dailyBudget,
    ad_groups: adGroupResults,
    keywords: kwResults,
    ads: adResults,
    google_ads_url: `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
    next_steps: [
      `Kampagne prüfen: https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
      'Landing Page mit Countdown-Banner ergänzen (bis ' + endDateFormatted + ')',
      'Kampagne aktivieren wenn LP bereit ist (PAUSED → ENABLED)',
      'Promotion Extension in Google Ads UI manuell hinzufügen',
    ],
  }
})
