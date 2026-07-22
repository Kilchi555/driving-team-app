/**
 * TEMP DEBUG: Scan "Fahrschule Zürich Umgebung" ad groups for booking-intent
 * candidates for the direct-to-booking-page RSA experiment. Delete after use.
 */
import { defineEventHandler } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const FAHRSCHULE_ZUERICH_CAMPAIGN_ID = '23868553846'

async function runQuery(customerId: string, headers: Record<string, string>, query: string) {
  const url = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const data = await res.json() as Array<{ results?: unknown[] }>
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 500))
  const rows: unknown[] = []
  for (const batch of (Array.isArray(data) ? data : [])) rows.push(...(batch.results ?? []))
  return rows
}

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads
  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  const keywords = await runQuery(customerId, headers, `
    SELECT ad_group.id, ad_group.name, ad_group.status,
      ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status,
      metrics.clicks, metrics.impressions, metrics.conversions, metrics.cost_micros
    FROM keyword_view
    WHERE campaign.id = ${FAHRSCHULE_ZUERICH_CAMPAIGN_ID}
      AND ad_group_criterion.status = 'ENABLED'
      AND segments.date DURING LAST_30_DAYS
    ORDER BY metrics.clicks DESC
  `)

  const ads = await runQuery(customerId, headers, `
    SELECT ad_group.id, ad_group.name, ad_group_ad.ad.id,
      ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions,
      ad_group_ad.ad.final_urls, ad_group_ad.status
    FROM ad_group_ad
    WHERE campaign.id = ${FAHRSCHULE_ZUERICH_CAMPAIGN_ID}
      AND ad_group_ad.status = 'ENABLED'
  `)

  const rotation = await runQuery(customerId, headers, `
    SELECT campaign.id, campaign.name, ad_group.id, ad_group.name
    FROM ad_group
    WHERE campaign.id = ${FAHRSCHULE_ZUERICH_CAMPAIGN_ID}
      AND ad_group.status = 'ENABLED'
  `)

  return { ok: true, keywords, ads, ad_groups: rotation }
})
