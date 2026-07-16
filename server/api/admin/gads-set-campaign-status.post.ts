/**
 * Enable or pause one or more Google Ads campaigns.
 *
 * USAGE (dry run — shows current + target status):
 *   curl -X POST https://app.simy.ch/api/admin/gads-set-campaign-status \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true, "updates": [{ "campaign_id": "24041663938", "status": "ENABLED" }] }'
 *
 * USAGE (apply):
 *   curl -X POST https://app.simy.ch/api/admin/gads-set-campaign-status \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false, "updates": [{ "campaign_id": "24041663938", "status": "ENABLED" }] }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const VALID_STATUSES = ['ENABLED', 'PAUSED']

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun: boolean = body?.dry_run !== false
  const updates: Array<{ campaign_id: string; status: string }> = Array.isArray(body?.updates) ? body.updates : []

  if (updates.length === 0) {
    return { ok: false, reason: 'Provide updates: [{ campaign_id, status: "ENABLED" | "PAUSED" }]' }
  }
  const invalid = updates.filter(u => !VALID_STATUSES.includes(u.status))
  if (invalid.length > 0) {
    return { ok: false, reason: `Invalid status in updates (must be ENABLED or PAUSED): ${JSON.stringify(invalid)}` }
  }

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  // Fetch current names + status for a clean before/after summary
  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const ids = updates.map(u => u.campaign_id).join(',')
  const query = `SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.id IN (${ids})`
  const searchRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const searchData = await searchRes.json() as any[]

  const current: Record<string, { name: string; status: string }> = {}
  for (const batch of (Array.isArray(searchData) ? searchData : [])) {
    for (const row of (batch.results ?? [])) {
      current[String(row.campaign?.id ?? '')] = { name: row.campaign?.name ?? '', status: row.campaign?.status ?? '' }
    }
  }

  const plan = updates.map(u => ({
    campaign_id: u.campaign_id,
    campaign_name: current[u.campaign_id]?.name ?? u.campaign_id,
    current_status: current[u.campaign_id]?.status ?? 'UNKNOWN',
    new_status: u.status,
  }))

  if (dryRun) {
    return { ok: true, dry_run: true, plan }
  }

  const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/campaigns:mutate`
  const results: any[] = []
  const errors: any[] = []

  for (const p of plan) {
    const res = await fetch(mutateUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operations: [{
          updateMask: 'status',
          update: {
            resourceName: `customers/${customerId}/campaigns/${p.campaign_id}`,
            status: p.new_status,
          },
        }],
      }),
    })
    const data = await res.json() as any

    if (!res.ok) {
      errors.push({ campaign: p.campaign_name, error: data })
      logger.warn(`[gads-campaign-status] Failed to update ${p.campaign_name}:`, JSON.stringify(data).slice(0, 400))
    } else {
      logger.info(`[gads-campaign-status] ${p.campaign_name}: ${p.current_status} → ${p.new_status}`)
      results.push({ campaign: p.campaign_name, campaign_id: p.campaign_id, from: p.current_status, to: p.new_status, updated: true })
    }
  }

  return {
    ok: errors.length === 0,
    dry_run: false,
    updated: results.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  }
})
