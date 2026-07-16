/**
 * Enable or pause one or more Google Ads ad groups (e.g. to remove a
 * mismatched ad group whose keywords overlap with another campaign / point
 * to the wrong landing page, without touching the rest of the campaign).
 *
 * USAGE (dry run):
 *   curl -X POST https://app.simy.ch/api/admin/gads-set-ad-group-status \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true, "updates": [{ "ad_group_id": "198979507900", "status": "PAUSED" }] }'
 *
 * USAGE (apply):
 *   curl -X POST https://app.simy.ch/api/admin/gads-set-ad-group-status \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false, "updates": [{ "ad_group_id": "198979507900", "status": "PAUSED" }] }'
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
  const updates: Array<{ ad_group_id: string; status: string }> = Array.isArray(body?.updates) ? body.updates : []

  if (updates.length === 0) {
    return { ok: false, reason: 'Provide updates: [{ ad_group_id, status: "ENABLED" | "PAUSED" }]' }
  }
  const invalid = updates.filter(u => !VALID_STATUSES.includes(u.status))
  if (invalid.length > 0) {
    return { ok: false, reason: `Invalid status in updates (must be ENABLED or PAUSED): ${JSON.stringify(invalid)}` }
  }

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const ids = updates.map(u => u.ad_group_id).join(',')
  const query = `SELECT ad_group.id, ad_group.name, ad_group.status, campaign.name FROM ad_group WHERE ad_group.id IN (${ids})`
  const searchRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const searchData = await searchRes.json() as any[]

  const current: Record<string, { name: string; status: string; campaign_name: string }> = {}
  for (const batch of (Array.isArray(searchData) ? searchData : [])) {
    for (const row of (batch.results ?? [])) {
      current[String(row.adGroup?.id ?? '')] = {
        name: row.adGroup?.name ?? '',
        status: row.adGroup?.status ?? '',
        campaign_name: row.campaign?.name ?? '',
      }
    }
  }

  const plan = updates.map(u => ({
    ad_group_id: u.ad_group_id,
    ad_group_name: current[u.ad_group_id]?.name ?? u.ad_group_id,
    campaign_name: current[u.ad_group_id]?.campaign_name ?? 'unknown',
    current_status: current[u.ad_group_id]?.status ?? 'UNKNOWN',
    new_status: u.status,
  }))

  if (dryRun) {
    return { ok: true, dry_run: true, plan }
  }

  const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroups:mutate`
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
            resourceName: `customers/${customerId}/adGroups/${p.ad_group_id}`,
            status: p.new_status,
          },
        }],
      }),
    })
    const data = await res.json() as any

    if (!res.ok) {
      errors.push({ ad_group: p.ad_group_name, error: data })
      logger.warn(`[gads-ad-group-status] Failed to update ${p.ad_group_name}:`, JSON.stringify(data).slice(0, 400))
    } else {
      logger.info(`[gads-ad-group-status] ${p.campaign_name} / ${p.ad_group_name}: ${p.current_status} → ${p.new_status}`)
      results.push({ ad_group: p.ad_group_name, ad_group_id: p.ad_group_id, campaign: p.campaign_name, from: p.current_status, to: p.new_status, updated: true })
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
