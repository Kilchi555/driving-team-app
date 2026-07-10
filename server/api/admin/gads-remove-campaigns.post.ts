/**
 * Remove (permanently delete) one or more Google Ads campaigns by ID.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-remove-campaigns \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "campaign_ids": ["23956145255"], "dry_run": true }'
 */

import { defineEventHandler, readBody } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event) as { campaign_ids: string[]; dry_run?: boolean }
  const dryRun = body?.dry_run !== false
  const campaignIds: string[] = body?.campaign_ids ?? []

  if (!campaignIds.length) {
    return { ok: false, reason: 'Provide campaign_ids array.' }
  }

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      would_remove: campaignIds.map(id => `customers/${gads.customerId}/campaigns/${id}`),
      note: 'Set dry_run: false to permanently remove these campaigns.',
    }
  }

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)

  const operations = campaignIds.map(id => ({
    remove: `customers/${gads.customerId}/campaigns/${id}`,
  }))

  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${gads.customerId}/campaigns:mutate`,
    { method: 'POST', headers, body: JSON.stringify({ operations }) },
  )
  const data = await res.json() as any

  if (!res.ok) {
    return { ok: false, reason: data }
  }

  return {
    ok: true,
    removed: campaignIds.length,
    campaign_ids: campaignIds,
    results: data.results ?? [],
  }
})
