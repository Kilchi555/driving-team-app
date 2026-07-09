/**
 * Creates the "Driving Team Brand" campaign in PAUSED status.
 *
 * This is a one-shot endpoint. After creation, enable the campaign manually
 * in the Google Ads UI or via the campaigns:mutate API.
 *
 * Why: There is currently no brand protection campaign for "Driving Team".
 * Competitors can bid on "driving team fahrschule" and intercept brand traffic.
 * Brand keywords convert 3–5x better than generic keywords at CPCs < CHF 0.50.
 *
 * The campaign targets Switzerland (geo_target_id 2756 = Switzerland).
 * Keywords use EXACT match — brand queries are precise and should not trigger
 * broad/irrelevant searches.
 *
 * USAGE:
 *   curl -X POST http://localhost:3000/api/admin/gads-create-brand-campaign \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * After creation, the response contains the Google Ads campaign URL.
 * Enable the campaign in the UI and verify the ad copy before going live.
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
    'login-customer-id': customerId,
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

  // ── Step 1: Budget (CHF 5/day — brand clicks are cheap, low volume) ──────────
  const budgetResult = await mutate('campaignBudgets', [{
    create: {
      name: 'Budget: Driving Team Brand',
      amountMicros: 5_000_000, // CHF 5 / day
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
      name: 'Driving Team Brand',
      status: 'PAUSED', // Enable manually after review
      advertisingChannelType: 'SEARCH',
      campaignBudget: budgetResourceName,
      networkSettings: {
        targetGoogleSearch: true,
        targetSearchNetwork: true,
        targetContentNetwork: false,
        targetPartnerSearchNetwork: false,
      },
      // Target Switzerland only
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
    return { success: false, step: 'campaigns', reason: 'no resourceName', detail: campaignResult.data }
  }
  const campaignId = campaignResourceName.split('/').pop() as string

  // ── Step 2b: Geo target = Switzerland (2756) ─────────────────────────────────
  await mutate('campaignCriteria', [{
    create: {
      campaign: campaignResourceName,
      location: { geoTargetConstant: 'geoTargetConstants/2756' }, // Switzerland
    },
  }])

  // ── Step 3: Ad group ──────────────────────────────────────────────────────────
  const adGroupResult = await mutate('adGroups', [{
    create: {
      name: 'Driving Team — Brand',
      campaign: campaignResourceName,
      status: 'ENABLED',
      type: 'SEARCH_STANDARD',
      cpcBidMicros: 500_000, // CHF 0.50 max CPC — brand queries are cheap
    },
  }])

  if (!adGroupResult.ok) {
    return { success: false, step: 'adGroups', reason: adGroupResult.data, campaign_id: campaignId }
  }

  const adGroupResourceName: string = adGroupResult.data.results?.[0]?.resourceName
  if (!adGroupResourceName) {
    return { success: false, step: 'adGroups', reason: 'no resourceName', detail: adGroupResult.data }
  }
  const adGroupId = adGroupResourceName.split('/').pop() as string

  // ── Step 4: Keywords (EXACT — brand queries are precise) ─────────────────────
  const brandKeywords = [
    'driving team',
    'driving team fahrschule',
    'driving team lachen',
    'driving team fahrstunden',
    'driving team vku',
    'driving-team.ch',
    'drivingteam',
  ]

  const keywordOps = brandKeywords.map(text => ({
    create: {
      adGroup: adGroupResourceName,
      status: 'ENABLED',
      keyword: { text, matchType: 'EXACT' },
      cpcBidMicros: 500_000,
    },
  }))

  const keywordResult = await mutate('adGroupCriteria', keywordOps)
  if (!keywordResult.ok) {
    return { success: false, step: 'adGroupCriteria', reason: keywordResult.data, campaign_id: campaignId, ad_group_id: adGroupId }
  }

  // ── Step 5: Responsive Search Ad ─────────────────────────────────────────────
  const adResult = await mutate('adGroupAds', [{
    create: {
      adGroup: adGroupResourceName,
      status: 'ENABLED',
      ad: {
        responsiveSearchAd: {
          headlines: [
            { text: 'Driving Team Fahrschule', pinnedField: 'HEADLINE_1' },
            { text: 'Fahrschule Lachen & Zürich', pinnedField: 'HEADLINE_2' },
            { text: 'Jetzt Termin online buchen' },
            { text: 'VKU Kurs & Fahrstunden' },
            { text: '85% Erstversuch-Erfolgsquote' },
          ],
          descriptions: [
            { text: 'Die führende Fahrschule in der Region Lachen & Zürich. Jetzt einfach online buchen!', pinnedField: 'DESCRIPTION_1' },
            { text: 'Fahrstunden, VKU Kurs & Anhänger-Ausbildung. Professionell, flexibel & regional.' },
          ],
          path1: 'Fahrschule',
          path2: 'Lachen',
        },
        finalUrls: ['https://www.driving-team.ch'],
      },
    },
  }])

  if (!adResult.ok) {
    return {
      success: false, step: 'adGroupAds', reason: adResult.data,
      campaign_id: campaignId, ad_group_id: adGroupId,
      keywords_created: keywordResult.data.results?.length ?? 0,
    }
  }

  return {
    success: true,
    campaign_id: campaignId,
    campaign_resource_name: campaignResourceName,
    ad_group_id: adGroupId,
    keywords_created: keywordResult.data.results?.length ?? 0,
    keywords: brandKeywords,
    google_ads_url: `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
    next_steps: [
      '1. Öffne den Link im google_ads_url und prüfe die Kampagne',
      '2. Passe Ad Copy falls nötig an (URL: driving-team.ch oder drivingteam.ch)',
      '3. Aktiviere die Kampagne (Status PAUSED → ENABLED)',
      '4. Füge bestehende Kampagnen als Cross-Negative hinzu (brand keywords als Negative dort)',
    ],
  }
})
