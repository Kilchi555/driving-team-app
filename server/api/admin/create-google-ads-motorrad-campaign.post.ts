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
      present: {
        developerToken: !!developerToken,
        clientId: !!clientId,
        clientSecret: !!clientSecret,
        refreshToken: !!refreshToken,
        customerId: !!customerId,
      },
    }
  }

  // ── Get access token ─────────────────────────────────────────────────────────
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  const tokenData = await tokenRes.json() as any
  if (!tokenData.access_token) return { success: false, reason: 'token_error', detail: tokenData }
  const at = tokenData.access_token

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${at}`,
    'developer-token': developerToken,
    'login-customer-id': managerCustomerId,
  }

  const API = `https://googleads.googleapis.com/v20/customers/${customerId}`

  async function mutate(operations: any[]) {
    const res = await fetch(`${API}:mutate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ mutateOperations: operations }),
    })
    return res.json()
  }

  const results: any = {}

  // ── Kampagne Lachen ─────────────────────────────────────────────────────────
  const campaignLachenRes = await fetch(`${API}/campaigns:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [{
        create: {
          name: 'DT — Motorrad Grundkurs Lachen',
          status: 'PAUSED',
          advertisingChannelType: 'SEARCH',
          biddingStrategyType: 'TARGET_CPA',
          targetCpa: { targetCpaMicros: '5000000' }, // CHF 5 target CPA
          networkSettings: { targetGoogleSearch: true, targetSearchNetwork: true, targetContentNetwork: false },
          geoTargetTypeSetting: { positiveGeoTargetType: 'PRESENCE_OR_INTEREST' },
          campaignBudget: {
            name: `Motorrad Lachen Budget ${Date.now()}`,
            amountMicros: '1500000', // CHF 15/Tag
            deliveryMethod: 'STANDARD',
          },
        },
      }],
    }),
  })
  results.campaignLachen = await campaignLachenRes.json()

  // ── Kampagne Zürich ─────────────────────────────────────────────────────────
  const campaignZuerichRes = await fetch(`${API}/campaigns:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [{
        create: {
          name: 'DT — Motorrad Grundkurs Zürich',
          status: 'PAUSED',
          advertisingChannelType: 'SEARCH',
          biddingStrategyType: 'TARGET_CPA',
          targetCpa: { targetCpaMicros: '5000000' },
          networkSettings: { targetGoogleSearch: true, targetSearchNetwork: true, targetContentNetwork: false },
          geoTargetTypeSetting: { positiveGeoTargetType: 'PRESENCE_OR_INTEREST' },
          campaignBudget: {
            name: `Motorrad Zürich Budget ${Date.now()}`,
            amountMicros: '1500000',
            deliveryMethod: 'STANDARD',
          },
        },
      }],
    }),
  })
  results.campaignZuerich = await campaignZuerichRes.json()

  return { success: true, customerId, results }
})
