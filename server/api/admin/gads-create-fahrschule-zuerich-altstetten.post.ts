/**
 * Creates Search campaign "Fahrschule Zürich / Altstetten" for Auto (Kat. B).
 *
 * Goal: replace the broad "Fahrschule Zürich Umgebung" catch-all for Zürich-city
 * demand with a tight Presence geo + Phrase/Exact keywords only.
 *
 * Landing: https://drivingteam.ch/auto-fahrschule-zuerich/
 *   (Note: /fahrschule-altstetten currently redirects to homepage — do not use.)
 *
 * Geo: 12km radius around Altstetten, PRESENCE only.
 * Budget: CHF 50/day (default). Bidding: Manual CPC.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-create-fahrschule-zuerich-altstetten \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "enable": true, "daily_budget_chf": 50 }'
 */

import { defineEventHandler, readBody } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const LANDING_PAGE = 'https://drivingteam.ch/auto-fahrschule-zuerich/'
const CAMPAIGN_NAME = 'Fahrschule Zürich / Altstetten'

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dailyBudgetChf = Math.min(150, Math.max(10, Number(body?.daily_budget_chf) || 50))
  const enable = body?.enable === true
  const status = enable ? 'ENABLED' : 'PAUSED'

  const accessToken = await getGadsAccessToken(gads)
  const GADS_VERSION = 'v23'
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

  // Idempotency: refuse if campaign name already exists (any status except REMOVED)
  const searchRes = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/${customerPrefix}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: adsHeaders,
      body: JSON.stringify({
        query: `
          SELECT campaign.id, campaign.name, campaign.status
          FROM campaign
          WHERE campaign.name = '${CAMPAIGN_NAME.replace(/'/g, "\\'")}'
            AND campaign.status != 'REMOVED'
        `,
      }),
    },
  )
  const searchData = await searchRes.json() as any[]
  for (const batch of (Array.isArray(searchData) ? searchData : [])) {
    for (const row of (batch.results ?? [])) {
      return {
        success: false,
        reason: 'already_exists',
        campaign_id: String(row.campaign?.id ?? ''),
        campaign_name: row.campaign?.name,
        status: row.campaign?.status,
      }
    }
  }

  // ── Budget ──────────────────────────────────────────────────────────────────
  const budgetResult = await mutate('campaignBudgets', [{
    create: {
      name: `Budget: ${CAMPAIGN_NAME}`,
      amountMicros: Math.round(dailyBudgetChf * 1_000_000),
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

  // ── Campaign ────────────────────────────────────────────────────────────────
  const campaignResult = await mutate('campaigns', [{
    create: {
      name: CAMPAIGN_NAME,
      status,
      advertisingChannelType: 'SEARCH',
      campaignBudget: budgetResourceName,
      networkSettings: {
        targetGoogleSearch: true,
        targetSearchNetwork: true,
        targetContentNetwork: false,
        targetPartnerSearchNetwork: false,
      },
      // Presence only — no "interested in" leakage from outside Zürich
      geoTargetTypeSetting: {
        positiveGeoTargetType: 'PRESENCE',
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

  // ── Geo: 12km around Altstetten ─────────────────────────────────────────────
  const geoResult = await mutate('campaignCriteria', [{
    create: {
      campaign: campaignResourceName,
      proximity: {
        geoPoint: {
          longitudeInMicroDegrees: 8_488_300,
          latitudeInMicroDegrees: 47_389_700,
        },
        radius: 12,
        radiusUnits: 'KILOMETERS',
      },
    },
  }])
  if (!geoResult.ok) {
    return { success: false, step: 'geo', reason: geoResult.data, campaign_id: campaignId }
  }

  // ── Campaign negatives ──────────────────────────────────────────────────────
  const campaignNegatives = [
    // Price research / no booking intent
    { text: 'fahrschule preise', matchType: 'PHRASE' },
    { text: 'fahrschule kosten', matchType: 'PHRASE' },
    { text: 'fahrstunde preis', matchType: 'PHRASE' },
    { text: 'günstig', matchType: 'BROAD' },
    { text: 'gratis', matchType: 'BROAD' },
    { text: 'kostenlos', matchType: 'BROAD' },
    // Wrong products
    { text: 'motorrad', matchType: 'BROAD' },
    { text: 'anhänger', matchType: 'BROAD' },
    { text: 'lastwagen', matchType: 'BROAD' },
    { text: 'lkw', matchType: 'BROAD' },
    { text: 'czv', matchType: 'BROAD' },
    { text: 'nothelfer', matchType: 'BROAD' },
    { text: 'nothelferkurs', matchType: 'BROAD' },
    { text: 'vku', matchType: 'BROAD' },
    { text: 'wab', matchType: 'BROAD' },
    // Authorities / theory apps
    { text: 'verkehrsamt', matchType: 'BROAD' },
    { text: 'theorie24', matchType: 'BROAD' },
    // Competitors
    { text: 'gabi senn', matchType: 'PHRASE' },
    { text: 'minet', matchType: 'PHRASE' },
    { text: 'kalberer', matchType: 'PHRASE' },
    { text: 'max drive', matchType: 'PHRASE' },
    { text: 'team humm', matchType: 'PHRASE' },
    { text: 'drivelab', matchType: 'PHRASE' },
    { text: 'letzhgo', matchType: 'PHRASE' },
    // Wrong geo covered by other campaigns
    { text: 'fahrschule lachen', matchType: 'PHRASE' },
    { text: 'fahrschule pfäffikon', matchType: 'PHRASE' },
    { text: 'fahrschule schwyz', matchType: 'PHRASE' },
  ]

  await mutate('campaignCriteria', campaignNegatives.map(kw => ({
    create: {
      campaign: campaignResourceName,
      negative: true,
      keyword: { text: kw.text, matchType: kw.matchType },
    },
  })))

  // ── Ad groups ───────────────────────────────────────────────────────────────
  const adGroupConfigs = [
    {
      name: 'Fahrschule Zürich',
      cpcMicros: 4_000_000, // CHF 4.00 — competitive city queries
      keywords: [
        { text: 'fahrschule zürich', matchType: 'EXACT' },
        { text: 'autofahrschule zürich', matchType: 'EXACT' },
        { text: 'auto fahrschule zürich', matchType: 'EXACT' },
        { text: 'fahrlehrer zürich', matchType: 'EXACT' },
        { text: 'fahrstunden zürich', matchType: 'EXACT' },
        { text: 'fahrschule zürich', matchType: 'PHRASE' },
        { text: 'autofahrschule zürich', matchType: 'PHRASE' },
        { text: 'fahrlehrer zürich', matchType: 'PHRASE' },
        { text: 'fahrstunden zürich', matchType: 'PHRASE' },
        { text: 'führerschein zürich auto', matchType: 'PHRASE' },
      ],
      ad: {
        headlines: [
          { text: 'Fahrschule Zürich', pinnedField: 'HEADLINE_1' },
          { text: 'Driving Team Altstetten', pinnedField: 'HEADLINE_2' },
          { text: 'Online Termin buchen' },
          { text: 'Fahrstunde ab CHF 95' },
          { text: 'Flexibel & professionell' },
          { text: 'Jetzt Probestunde sichern' },
          { text: 'Kat. B Automatik & Schaltung' },
        ],
        descriptions: [
          { text: 'Fahrschule in Zürich Altstetten — online buchbar, klare Preise, erfahrene Fahrlehrer.', pinnedField: 'DESCRIPTION_1' },
          { text: 'Driving Team: Termin in 2 Minuten online. Standort Altstetten, gut erreichbar.' },
        ],
        path1: 'Fahrschule',
        path2: 'Zuerich',
      },
    },
    {
      name: 'Fahrschule Altstetten',
      cpcMicros: 3_500_000,
      keywords: [
        { text: 'fahrschule altstetten', matchType: 'EXACT' },
        { text: 'fahrlehrer altstetten', matchType: 'EXACT' },
        { text: 'fahrstunden altstetten', matchType: 'EXACT' },
        { text: 'fahrschule zürich altstetten', matchType: 'EXACT' },
        { text: 'fahrschule altstetten', matchType: 'PHRASE' },
        { text: 'fahrlehrer altstetten', matchType: 'PHRASE' },
        { text: 'fahrschule zürich altstetten', matchType: 'PHRASE' },
        { text: 'autofahrschule altstetten', matchType: 'PHRASE' },
      ],
      ad: {
        headlines: [
          { text: 'Fahrschule Altstetten', pinnedField: 'HEADLINE_1' },
          { text: 'Driving Team Zürich', pinnedField: 'HEADLINE_2' },
          { text: 'Online Termin buchen' },
          { text: 'Fahrstunde ab CHF 95' },
          { text: 'Direkt in Altstetten' },
          { text: 'Jetzt buchen' },
          { text: 'Kat. B — Auto' },
        ],
        descriptions: [
          { text: 'Fahrschule Altstetten: flexible Fahrstunden, online buchbar, fairer Preis.', pinnedField: 'DESCRIPTION_1' },
          { text: 'Driving Team Zürich — Standort Altstetten. Termin in wenigen Klicks sichern.' },
        ],
        path1: 'Altstetten',
        path2: 'Buchen',
      },
    },
  ]

  const adGroupResults: any[] = []
  const kwResults: any[] = []
  const adResults: any[] = []

  for (const agConfig of adGroupConfigs) {
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

    const kwOps = agConfig.keywords.map(kw => ({
      create: {
        adGroup: agResourceName,
        status: 'ENABLED',
        keyword: { text: kw.text, matchType: kw.matchType },
        cpcBidMicros: agConfig.cpcMicros,
      },
    }))
    const kwResult = await mutate('adGroupCriteria', kwOps)
    kwResults.push({ ad_group: agConfig.name, ok: kwResult.ok, added: kwResult.data.results?.length ?? 0, error: kwResult.ok ? undefined : kwResult.data })

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
    campaign_name: CAMPAIGN_NAME,
    status,
    landing_page: LANDING_PAGE,
    budget_chf_day: dailyBudgetChf,
    geo: '12km Radius um Altstetten, PRESENCE only',
    bidding: 'Manual CPC — Phrase/Exact only (no Broad)',
    ad_groups: adGroupResults,
    keywords: kwResults,
    ads: adResults,
    note: 'Old campaign "Fahrschule Zürich Umgebung" should stay low-budget for suburbs only.',
  }
})
