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

  // RSA headlines/descriptions are immutable – must remove old ad and create new one.
  // Step 1: extract adGroup resource name from the adGroupAd resource name
  // Format: customers/xxx/adGroupAds/adGroupId~adId
  const adGroupId = ad_group_ad_resource_name.split('/adGroupAds/')[1]?.split('~')[0]
  const adGroupResourceName = `customers/${customerId}/adGroups/${adGroupId}`

  // Step 2: Remove old ad
  const removeRes = await fetch(`${ADS_BASE}/customers/${customerId}/adGroupAds:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [{ remove: ad_group_ad_resource_name }],
    }),
  })
  const removeData = await removeRes.json() as any
  if (!removeRes.ok) return { success: false, step: 'remove_old_ad', reason: removeData }

  // Step 3: Create new ad with updated content
  const createRes = await fetch(`${ADS_BASE}/customers/${customerId}/adGroupAds:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [{
        create: {
          adGroup: adGroupResourceName,
          status: 'ENABLED',
          ad: {
            responsiveSearchAd: {
              headlines: headlines.map((text: string) => ({ text })),
              descriptions: descriptions.map((text: string) => ({ text })),
            },
            finalUrls: body.final_url ? [body.final_url] : undefined,
          },
        },
      }],
    }),
  })

  const createData = await createRes.json() as any
  if (!createRes.ok) return { success: false, step: 'create_new_ad', reason: createData }

  return {
    success: true,
    removed: ad_group_ad_resource_name,
    created: createData.results?.[0]?.resourceName,
  }
})
