/**
 * Create a new Google Ads Search campaign (PAUSED) with ad group, keywords and RSA.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/create-google-ads-campaign \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "campaign_name": "Fahrschule Zürich – Auto Kat. B",
 *       "daily_budget_chf": 20,
 *       "geo_target_id": "20563",
 *       "final_url": "https://drivingteam.ch/fahrschule-zuerich/",
 *       "keywords": [
 *         { "text": "fahrschule zürich", "match_type": "PHRASE", "max_cpc_chf": 3.0 }
 *       ],
 *       "headlines": ["Fahrschule Zürich", "Jetzt Termin buchen", "85% Erfolgsquote"],
 *       "descriptions": ["Professionelle Fahrausbildung in Zürich.", "Ab CHF 95.- pro Lektion. Jetzt buchen!"]
 *     }'
 *
 * The campaign is created in PAUSED status and must be manually enabled in Google Ads.
 * API sequence: campaignBudgets → campaigns → adGroups → adGroupCriteria → adGroupAds
 */

import { requireAdminProfile } from '~/server/utils/auth'

const GOOGLE_ADS_API_VERSION = 'v23'
const ADS_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`

interface KeywordInput {
  text: string
  match_type: 'EXACT' | 'PHRASE' | 'BROAD'
  max_cpc_chf: number
}

interface CreateCampaignBody {
  campaign_name: string
  daily_budget_chf: number
  geo_target_id: string
  final_url: string
  keywords: KeywordInput[]
  headlines: string[]
  descriptions: string[]
}

export default defineEventHandler(async (event) => {
  // ── Auth: admin session OR CRON_SECRET ─────────────────────────────────────
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`
  if (!isCron) {
    await requireAdminProfile(event)
  }

  // ── Env ────────────────────────────────────────────────────────────────────
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId       = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret   = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken   = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId     = process.env.GOOGLE_ADS_CUSTOMER_ID

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    return { success: false, reason: 'missing_credentials' }
  }

  // ── Body validation ────────────────────────────────────────────────────────
  const body = await readBody(event) as CreateCampaignBody

  if (!body?.campaign_name?.trim()) {
    return { success: false, reason: 'campaign_name is required' }
  }
  if (!body.daily_budget_chf || body.daily_budget_chf <= 0) {
    return { success: false, reason: 'daily_budget_chf must be a positive number' }
  }
  if (!body.geo_target_id) {
    return { success: false, reason: 'geo_target_id is required' }
  }
  if (!body.final_url?.startsWith('http')) {
    return { success: false, reason: 'final_url must be a valid URL' }
  }
  if (!body.keywords?.length) {
    return { success: false, reason: 'at least one keyword is required' }
  }
  if (!body.headlines || body.headlines.length < 3 || body.headlines.length > 15) {
    return { success: false, reason: 'headlines must have 3–15 items' }
  }
  if (!body.descriptions || body.descriptions.length < 2 || body.descriptions.length > 4) {
    return { success: false, reason: 'descriptions must have 2–4 items' }
  }
  for (const h of body.headlines) {
    if (h.length > 30) return { success: false, reason: `Headline too long (max 30 chars): "${h}"` }
  }
  for (const d of body.descriptions) {
    if (d.length > 90) return { success: false, reason: `Description too long (max 90 chars): "${d}"` }
  }

  // ── OAuth access token ─────────────────────────────────────────────────────
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const tokenData = await tokenRes.json() as any
  if (!tokenData.access_token) {
    return { success: false, reason: 'token_error', detail: tokenData }
  }
  const accessToken = tokenData.access_token

  const adsHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'login-customer-id': customerId,
    'Content-Type': 'application/json',
  }

  const customerPrefix = `customers/${customerId}`

  // Helper: execute a mutate call and return parsed response
  async function mutate(resource: string, operations: object[]): Promise<{ ok: boolean; data: any }> {
    const res = await fetch(`${ADS_BASE}/${customerPrefix}/${resource}:mutate`, {
      method: 'POST',
      headers: adsHeaders,
      body: JSON.stringify({ operations }),
    })
    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 500) } }
    return { ok: res.ok, data }
  }

  // ── Step 1: Create campaign budget ─────────────────────────────────────────
  const budgetMicros = Math.round(body.daily_budget_chf * 1_000_000)

  const budgetResult = await mutate('campaignBudgets', [{
    create: {
      name: `Budget: ${body.campaign_name}`,
      amountMicros: budgetMicros,
      deliveryMethod: 'STANDARD',
      explicitlyShared: false,
    },
  }])

  if (!budgetResult.ok) {
    return { success: false, step: 'campaignBudgets', reason: budgetResult.data }
  }

  const budgetResourceName: string = budgetResult.data.results?.[0]?.resourceName
  if (!budgetResourceName) {
    return { success: false, step: 'campaignBudgets', reason: 'no resourceName returned', detail: budgetResult.data }
  }

  // ── Step 2: Create campaign ─────────────────────────────────────────────────
  const campaignResult = await mutate('campaigns', [{
    create: {
      name: body.campaign_name,
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
      manualCpc: {
        enhancedCpcEnabled: false,
      },
      containsEuPoliticalAdvertising: false,
      // Geo targeting is set via campaign criteria after campaign creation
    },
  }])

  if (!campaignResult.ok) {
    return { success: false, step: 'campaigns', reason: campaignResult.data }
  }

  const campaignResourceName: string = campaignResult.data.results?.[0]?.resourceName
  if (!campaignResourceName) {
    return { success: false, step: 'campaigns', reason: 'no resourceName returned', detail: campaignResult.data }
  }
  const campaignId = campaignResourceName.split('/').pop() as string

  // ── Step 2b: Add geo target criterion to campaign ──────────────────────────
  const geoResult = await mutate('campaignCriteria', [{
    create: {
      campaign: campaignResourceName,
      location: {
        geoTargetConstant: `geoTargetConstants/${body.geo_target_id}`,
      },
    },
  }])

  // Geo targeting failure is non-fatal — campaign still works, just without geo
  const geoWarning = geoResult.ok ? null : geoResult.data

  // ── Step 3: Create ad group ─────────────────────────────────────────────────
  const adGroupResult = await mutate('adGroups', [{
    create: {
      name: `Ad Group – ${body.campaign_name}`,
      campaign: campaignResourceName,
      status: 'ENABLED',
      type: 'STANDARD',
    },
  }])

  if (!adGroupResult.ok) {
    return { success: false, step: 'adGroups', reason: adGroupResult.data, campaign_id: campaignId, campaign_resource_name: campaignResourceName }
  }

  const adGroupResourceName: string = adGroupResult.data.results?.[0]?.resourceName
  if (!adGroupResourceName) {
    return { success: false, step: 'adGroups', reason: 'no resourceName returned', detail: adGroupResult.data }
  }
  const adGroupId = adGroupResourceName.split('/').pop() as string

  // ── Step 4: Add keywords ────────────────────────────────────────────────────
  const keywordOperations = body.keywords.map(kw => ({
    create: {
      adGroup: adGroupResourceName,
      status: 'ENABLED',
      keyword: {
        text: kw.text,
        matchType: kw.match_type,
      },
      cpcBidMicros: Math.round(kw.max_cpc_chf * 1_000_000),
    },
  }))

  const keywordResult = await mutate('adGroupCriteria', keywordOperations)

  if (!keywordResult.ok) {
    return {
      success: false,
      step: 'adGroupCriteria',
      reason: keywordResult.data,
      campaign_id: campaignId,
      campaign_resource_name: campaignResourceName,
      ad_group_id: adGroupId,
    }
  }

  const keywordsCreated: number = keywordResult.data.results?.length ?? 0

  // ── Step 5: Create Responsive Search Ad ────────────────────────────────────
  const adResult = await mutate('adGroupAds', [{
    create: {
      adGroup: adGroupResourceName,
      status: 'ENABLED',
      ad: {
        responsiveSearchAd: {
          headlines: body.headlines.map((text, index) => ({
            text,
            // Pin first 3 headlines to positions 1–3 for predictable display
            ...(index < 3 ? { pinnedField: `HEADLINE_${index + 1}` } : {}),
          })),
          descriptions: body.descriptions.map((text, index) => ({
            text,
            ...(index < 2 ? { pinnedField: `DESCRIPTION_${index + 1}` } : {}),
          })),
          path1: '',
          path2: '',
        },
        finalUrls: [body.final_url],
      },
    },
  }])

  if (!adResult.ok) {
    return {
      success: false,
      step: 'adGroupAds',
      reason: adResult.data,
      campaign_id: campaignId,
      campaign_resource_name: campaignResourceName,
      ad_group_id: adGroupId,
      keywords_created: keywordsCreated,
    }
  }

  const adResourceName: string = adResult.data.results?.[0]?.resourceName ?? ''

  // ── Done ───────────────────────────────────────────────────────────────────
  return {
    success: true,
    campaign_id: campaignId,
    campaign_resource_name: campaignResourceName,
    ad_group_id: adGroupId,
    ad_group_resource_name: adGroupResourceName,
    ad_resource_name: adResourceName,
    keywords_created: keywordsCreated,
    budget_resource_name: budgetResourceName,
    geo_target_id: body.geo_target_id,
    geo_warning: geoWarning,
    google_ads_url: `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
  }
})
