/**
 * TEMP DEBUG: Morning-after status check for the direct-booking A/B test ads
 * created 2026-07-22 (approval status + any early impressions/clicks) and the
 * three Wettswil/negatives fixes applied the same day. Delete after use.
 */
import { defineEventHandler } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const AD_IDS = ['809675038018', '818002748603', '810402944569', '818002748600']

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
      ad_group_ad.policy_summary.approval_status,
      metrics.impressions, metrics.clicks, metrics.conversions
    FROM ad_group_ad
    WHERE ad_group_ad.ad.id IN (${AD_IDS.join(',')})
      AND segments.date DURING LAST_7_DAYS
  `
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const data = await res.json() as Array<{ results?: unknown[] }>
  const rows: unknown[] = []
  for (const batch of (Array.isArray(data) ? data : [])) rows.push(...(batch.results ?? []))

  return { ok: true, rows }
})
