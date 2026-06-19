/**
 * Update headlines and/or descriptions of an existing Responsive Search Ad.
 *
 * Body:
 *   ad_group_ad_resource_name: "customers/xxx/adGroupAds/yyy~zzz"
 *   ad_resource_name:          "customers/xxx/ads/zzz"
 *   headlines:   string[]   (all headlines, max 15, max 30 chars each)
 *   descriptions: string[]  (all descriptions, max 4, max 90 chars each)
 */

import { requireAdminProfile } from '~/server/utils/auth'

const GOOGLE_ADS_API_VERSION = 'v23'
const ADS_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`
  if (!isCron) await requireAdminProfile(event)

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId       = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret   = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken   = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId     = process.env.GOOGLE_ADS_CUSTOMER_ID

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    return { success: false, reason: 'missing_credentials' }
  }

  const body = await readBody(event)
  const { ad_group_ad_resource_name, ad_resource_name, headlines, descriptions } = body

  if (!ad_group_ad_resource_name || !ad_resource_name) {
    return { success: false, reason: 'ad_group_ad_resource_name and ad_resource_name are required' }
  }
  if (!headlines?.length && !descriptions?.length) {
    return { success: false, reason: 'provide headlines and/or descriptions to update' }
  }

  // OAuth token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  const tokenData = await tokenRes.json() as any
  if (!tokenData.access_token) return { success: false, reason: 'token_error', detail: tokenData }

  const headers = {
    'Authorization': `Bearer ${tokenData.access_token}`,
    'developer-token': developerToken,
    'login-customer-id': customerId,
    'Content-Type': 'application/json',
  }

  const updateMaskParts: string[] = []
  const adUpdate: any = { resourceName: ad_resource_name, responsiveSearchAd: {} }

  if (headlines?.length) {
    adUpdate.responsiveSearchAd.headlines = headlines.map((text: string) => ({ text }))
    updateMaskParts.push('ad.responsive_search_ad.headlines')
  }
  if (descriptions?.length) {
    adUpdate.responsiveSearchAd.descriptions = descriptions.map((text: string) => ({ text }))
    updateMaskParts.push('ad.responsive_search_ad.descriptions')
  }

  const res = await fetch(`${ADS_BASE}/customers/${customerId}/adGroupAds:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [{
        update: {
          resourceName: ad_group_ad_resource_name,
          ad: adUpdate,
        },
        updateMask: updateMaskParts.join(','),
      }],
    }),
  })

  const data = await res.json() as any
  if (!res.ok) return { success: false, reason: data }

  return {
    success: true,
    updated_resource: data.results?.[0]?.resourceName,
  }
})
