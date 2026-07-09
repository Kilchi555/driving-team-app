/**
 * Inspect final URLs of all active RSA ads across all campaigns.
 * Used to verify whether each ad group points to the correct landing page.
 *
 * USAGE:
 *   curl https://app.simy.ch/api/admin/gads-inspect-final-urls \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { GoogleAdsApi } from 'google-ads-api'

export default defineEventHandler(async (event) => {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = getHeader(event, 'authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID

  if (!customerId || !developerToken || !clientId || !clientSecret || !refreshToken) {
    throw createError({ statusCode: 500, statusMessage: 'Missing Google Ads environment variables' })
  }

  const client = new GoogleAdsApi({
    client_id: clientId,
    client_secret: clientSecret,
    developer_token: developerToken,
  })

  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: refreshToken,
    login_customer_id: loginCustomerId || undefined,
  })

  const response = await customer.query(`
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_ad.ad.final_urls,
      ad_group_ad.ad.type,
      ad_group_ad.status
    FROM ad_group_ad
    WHERE
      ad_group_ad.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
    ORDER BY campaign.name, ad_group.name
  `)

  const ads = response as any[]

  const result = ads.map(ad => ({
    campaign: ad.campaign?.name ?? '',
    ad_group: ad.ad_group?.name ?? '',
    final_urls: ad.ad_group_ad?.ad?.final_urls ?? [],
  }))

  // Group by campaign for readability
  const grouped: Record<string, Array<{ ad_group: string; final_urls: string[] }>> = {}
  for (const ad of result) {
    if (!grouped[ad.campaign]) grouped[ad.campaign] = []
    grouped[ad.campaign].push({ ad_group: ad.ad_group, final_urls: ad.final_urls })
  }

  return { ads: grouped, total: result.length }
})
