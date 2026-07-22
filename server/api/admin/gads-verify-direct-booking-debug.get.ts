/**
 * TEMP DEBUG: Verify the two direct-to-booking RSAs created by
 * gads-test-direct-booking-ads are live and enabled. Delete after use.
 */
import { defineEventHandler } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const AD_GROUP_IDS = ['197486214232', '197337023472']

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads
  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  const url = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const query = `
    SELECT ad_group.name, ad_group_ad.ad.id, ad_group_ad.status,
      ad_group_ad.ad.final_urls, ad_group_ad.ad_strength,
      ad_group_ad.policy_summary.approval_status
    FROM ad_group_ad
    WHERE ad_group.id IN (${AD_GROUP_IDS.join(',')})
      AND ad_group_ad.status != 'REMOVED'
  `
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const data = await res.json() as Array<{ results?: unknown[] }>
  const rows: unknown[] = []
  for (const batch of (Array.isArray(data) ? data : [])) rows.push(...(batch.results ?? []))

  return { ok: true, rows }
})
