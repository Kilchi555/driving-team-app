/**
 * TEMP DEBUG: Get exact disapproval reason for the two direct-booking test
 * ads. Delete after use.
 */
import { defineEventHandler } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const AD_IDS = ['818002748603', '818002748600']

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads
  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  const url = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const query = `
    SELECT ad_group.name, ad_group_ad.ad.id,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.policy_summary.policy_topic_entries
    FROM ad_group_ad
    WHERE ad_group_ad.ad.id IN (${AD_IDS.join(',')})
  `
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const data = await res.json() as Array<{ results?: unknown[] }>
  const rows: unknown[] = []
  for (const batch of (Array.isArray(data) ? data : [])) rows.push(...(batch.results ?? []))

  return { ok: true, rows }
})
