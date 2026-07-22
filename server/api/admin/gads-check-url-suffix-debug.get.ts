/**
 * TEMP DEBUG: Check campaign/account final_url_suffix and auto-tagging-related
 * settings before adding a new RSA with a manually-built tracking URL.
 * Delete after use.
 */
import { defineEventHandler } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const FAHRSCHULE_ZUERICH_CAMPAIGN_ID = '23868553846'

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads
  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  const url = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const query = `
    SELECT campaign.id, campaign.name, campaign.final_url_suffix, campaign.tracking_url_template
    FROM campaign
    WHERE campaign.id = ${FAHRSCHULE_ZUERICH_CAMPAIGN_ID}
  `
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const data = await res.json() as Array<{ results?: unknown[] }>
  const rows: unknown[] = []
  for (const batch of (Array.isArray(data) ? data : [])) rows.push(...(batch.results ?? []))

  return { ok: true, rows }
})
