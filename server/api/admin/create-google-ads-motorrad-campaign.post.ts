/**
 * POST /api/admin/create-google-ads-motorrad-campaign
 * Erstellt Motorrad Grundkurs Kampagnen für Lachen und Zürich
 */
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/-/g, '')
  const managerCustomerId = '9509957201'

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    return {
      success: false,
      reason: 'missing_credentials',
      present: { developerToken: !!developerToken, clientId: !!clientId, clientSecret: !!clientSecret, refreshToken: !!refreshToken, customerId: !!customerId, customerIdValue: customerId?.slice(0, 4) + '...' },
    }
  }

  // ── Access Token ─────────────────────────────────────────────────────────────
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  const tokenData = await tokenRes.json() as any
  if (!tokenData.access_token) return { success: false, reason: 'token_error', detail: tokenData }
  const at = tokenData.access_token

  const BASE = `https://googleads.googleapis.com/v23/customers/${customerId}`
  const h = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${at}`,
    'developer-token': developerToken,
    'login-customer-id': managerCustomerId,
  }

  async function post(path: string, body: any) {
    const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) })
    return res.json() as Promise<any>
  }

  const results: any = {}

  // ── Lachen: Budget → Kampagne → Ad Group → Keywords + Ad ──────────────────

  // 1. Budget Lachen
  const budgetLachen = await post('/campaignBudgets:mutate', {
    operations: [{ create: { name: `Motorrad Lachen Budget ${Date.now()}`, amountMicros: '1500000', deliveryMethod: 'STANDARD', explicitlyShared: false } }],
  })
  results.budgetLachen = budgetLachen
  const budgetLachenResource = budgetLachen.results?.[0]?.resourceName
  if (!budgetLachenResource) return { success: false, step: 'budgetLachen', results }

  // 2. Kampagne Lachen
  const campLachen = await post('/campaigns:mutate', {
    operations: [{
      create: {
        name: 'DT — Motorrad Grundkurs Lachen',
        status: 'PAUSED',
        advertisingChannelType: 'SEARCH',
        campaignBudget: budgetLachenResource,
        biddingStrategyType: 'MAXIMIZE_CONVERSIONS',
        networkSettings: { targetGoogleSearch: true, targetSearchNetwork: true, targetContentNetwork: false },
        geoTargetTypeSetting: { positiveGeoTargetType: 'PRESENCE_OR_INTEREST' },
      },
    }],
  })
  results.campLachen = campLachen
  const campLachenResource = campLachen.results?.[0]?.resourceName
  if (!campLachenResource) return { success: false, step: 'campLachen', results }

  // 3. Ad Group Lachen
  const agLachen = await post('/adGroups:mutate', {
    operations: [{
      create: {
        name: 'Motorrad Grundkurs — Allgemein',
        campaign: campLachenResource,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD',
        cpcBidMicros: '3000000',
      },
    }],
  })
  results.agLachen = agLachen
  const agLachenResource = agLachen.results?.[0]?.resourceName
  if (!agLachenResource) return { success: false, step: 'agLachen', results }

  // 4. Keywords Lachen
  results.keywordsLachen = await post('/adGroupCriteria:mutate', {
    operations: [
      'motorrad grundkurs lachen', 'motorrad führerschein lachen', 'kat a kurs lachen',
      'motorrad a1 lachen', 'motorrad fahrschule lachen', 'kat a1 lachen',
    ].map(kw => ({
      create: {
        adGroup: agLachenResource,
        status: 'ENABLED',
        keyword: { text: kw, matchType: 'BROAD' },
      },
    })),
  })

  // 5. Ad Lachen (Responsive Search Ad)
  results.adLachen = await post('/ads:mutate', {
    operations: [{
      create: {
        adGroupAd: {
          adGroup: agLachenResource,
          status: 'PAUSED',
          ad: {
            responsiveSearchAd: {
              headlines: [
                { text: 'Motorrad Grundkurs Lachen' },
                { text: 'Kat. A1 & A35kW – Jetzt buchen' },
                { text: 'Motorrad Führerschein Lachen' },
                { text: 'Kurs in kleinen Gruppen' },
                { text: 'Online buchbar – sofort bestätigt' },
              ],
              descriptions: [
                { text: 'Grundkurs Kat. A1 & A35kW in Lachen SZ. Flexible Termine, zertifizierte Fahrlehrer.' },
                { text: 'Motorrad-Führerschein in Lachen. Einfach online buchen und Kursplatz sichern.' },
              ],
            },
            finalUrls: ['https://drivingteam.ch/motorrad-grundkurs-lachen?utm_source=google&utm_medium=cpc&utm_campaign=motorrad_grundkurs_lachen'],
          },
        },
      },
    }],
  })

  // ── Zürich: Budget → Kampagne → Ad Group → Keywords + Ad ──────────────────

  // 1. Budget Zürich
  const budgetZuerich = await post('/campaignBudgets:mutate', {
    operations: [{ create: { name: `Motorrad Zürich Budget ${Date.now()}`, amountMicros: '1500000', deliveryMethod: 'STANDARD', explicitlyShared: false } }],
  })
  results.budgetZuerich = budgetZuerich
  const budgetZuerichResource = budgetZuerich.results?.[0]?.resourceName
  if (!budgetZuerichResource) return { success: false, step: 'budgetZuerich', results }

  // 2. Kampagne Zürich
  const campZuerich = await post('/campaigns:mutate', {
    operations: [{
      create: {
        name: 'DT — Motorrad Grundkurs Zürich',
        status: 'PAUSED',
        advertisingChannelType: 'SEARCH',
        campaignBudget: budgetZuerichResource,
        biddingStrategyType: 'MAXIMIZE_CONVERSIONS',
        networkSettings: { targetGoogleSearch: true, targetSearchNetwork: true, targetContentNetwork: false },
        geoTargetTypeSetting: { positiveGeoTargetType: 'PRESENCE_OR_INTEREST' },
      },
    }],
  })
  results.campZuerich = campZuerich
  const campZuerichResource = campZuerich.results?.[0]?.resourceName
  if (!campZuerichResource) return { success: false, step: 'campZuerich', results }

  // 3. Ad Group Zürich
  const agZuerich = await post('/adGroups:mutate', {
    operations: [{
      create: {
        name: 'Motorrad Grundkurs — Allgemein',
        campaign: campZuerichResource,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD',
        cpcBidMicros: '3000000',
      },
    }],
  })
  results.agZuerich = agZuerich
  const agZuerichResource = agZuerich.results?.[0]?.resourceName
  if (!agZuerichResource) return { success: false, step: 'agZuerich', results }

  // 4. Keywords Zürich
  results.keywordsZuerich = await post('/adGroupCriteria:mutate', {
    operations: [
      'motorrad grundkurs zürich', 'motorrad führerschein zürich', 'kat a kurs zürich',
      'motorrad a1 zürich', 'motorrad fahrschule zürich', 'motorrad grundkurs altstetten',
    ].map(kw => ({
      create: {
        adGroup: agZuerichResource,
        status: 'ENABLED',
        keyword: { text: kw, matchType: 'BROAD' },
      },
    })),
  })

  // 5. Ad Zürich
  results.adZuerich = await post('/ads:mutate', {
    operations: [{
      create: {
        adGroupAd: {
          adGroup: agZuerichResource,
          status: 'PAUSED',
          ad: {
            responsiveSearchAd: {
              headlines: [
                { text: 'Motorrad Grundkurs Zürich' },
                { text: 'Kat. A1 & A35kW – Jetzt buchen' },
                { text: 'Motorrad Führerschein Zürich' },
                { text: 'Kurs in Zürich Altstetten' },
                { text: 'Online buchbar – sofort bestätigt' },
              ],
              descriptions: [
                { text: 'Grundkurs Kat. A1 & A35kW in Zürich Altstetten. Flexible Termine, zertifizierte Fahrlehrer.' },
                { text: 'Motorrad-Führerschein in Zürich. Einfach online buchen und Kursplatz sichern.' },
              ],
            },
            finalUrls: ['https://drivingteam.ch/motorrad-grundkurs-zuerich?utm_source=google&utm_medium=cpc&utm_campaign=motorrad_grundkurs_zuerich'],
          },
        },
      },
    }],
  })

  return { success: true, customerId, results }
