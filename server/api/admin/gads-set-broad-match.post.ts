/**
 * TEMPORARY admin endpoint — sets all active keywords to BROAD match type.
 * Protected by CRON_SECRET. Delete after use.
 *
 * POST /api/admin/gads-set-broad-match
 * Headers: Authorization: Bearer <CRON_SECRET>
 * Body: { dry_run: true }   ← set to false to actually apply
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'

export default defineEventHandler(async (event) => {
  // ── Auth + Credentials (tenant-aware) ────────────────────────────────────────
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun = body?.dry_run !== false

  const customerId = gads.customerId
  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)

  // 1. Fetch all active non-broad keywords
  const searchUrl = `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:searchStream`
  // Only touch the known Driving Team campaigns — never OMGroup or test campaigns.
  const ALLOWED_CAMPAIGN_PREFIXES = [
    'Anhänger Fahrschule',
    'Lastwagen Fahrschule',
    'Fahrschule Zürich',
    'Fahrschule Lachen',
    'Motorrad Grundkurs',
    'VKU Kurs Lachen',
  ]

  const query = `
    SELECT campaign.name, ad_group.name, ad_group.resource_name, ad_group.status,
           ad_group_criterion.keyword.text,
           ad_group_criterion.keyword.match_type, ad_group_criterion.resource_name,
           ad_group_criterion.status
    FROM ad_group_criterion
    WHERE ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status != 'REMOVED'
      AND ad_group_criterion.keyword.match_type != 'BROAD'
      AND campaign.status = 'ENABLED'
  `

  const searchRes = await fetch(searchUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  })
  const searchData = await searchRes.json() as any[]

  const rows: any[] = []
  for (const batch of (Array.isArray(searchData) ? searchData : [])) {
    rows.push(...(batch.results ?? []))
  }

  // Filter to allowed campaigns only
  const filteredRows = rows.filter(r => {
    const campName: string = r.campaign?.name ?? ''
    return ALLOWED_CAMPAIGN_PREFIXES.some(prefix => campName.startsWith(prefix))
  })

  logger.info(`[gads-broad-match] Found ${rows.length} non-broad keywords total, ${filteredRows.length} in allowed campaigns`)
  const rows2 = filteredRows

  if (rows2.length === 0) {
    return { ok: true, message: 'All keywords are already BROAD', changed: 0, dry_run: dryRun }
  }

  // Summary for dry run
  const summary = rows2.map(r => ({
    campaign: r.campaign?.name,
    ad_group: r.adGroup?.name,
    keyword: r.adGroupCriterion?.keyword?.text,
    current_match: r.adGroupCriterion?.keyword?.matchType,
    resource_name: r.adGroupCriterion?.resourceName,
  }))

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      code_version: 'v5-debug-state',
      would_change: rows2.length,
      skipped_omgroup: rows.length - rows2.length,
      sample_resource_names: rows2.slice(0, 5).map(r => ({
        criterion: r.adGroupCriterion?.resourceName,
        adGroup: r.adGroup?.resourceName,
        adGroupStatus: r.adGroup?.status,
        criterionStatus: r.adGroupCriterion?.status,
        keyword: r.adGroupCriterion?.keyword?.text,
      })),
      keywords: summary,
    }
  }

  // Debug: log first row structure to verify field names
  if (rows2.length > 0) {
    logger.info('[gads-broad-match] Sample row keys:', JSON.stringify(Object.keys(rows2[0])))
    logger.info('[gads-broad-match] Sample criterion resourceName:', rows2[0].adGroupCriterion?.resourceName)
    logger.info('[gads-broad-match] Sample adGroup resourceName:', rows2[0].adGroup?.resourceName)
  }

  // 2. Mutate — match_type is immutable: REMOVE old keywords first, then CREATE new BROAD ones.
  // Split into two separate batches to avoid OPERATION_NOT_PERMITTED_FOR_REMOVED_RESOURCE errors.
  const removeOps = rows2.map(r => ({ remove: r.adGroupCriterion?.resourceName }))
  logger.info('[gads-broad-match] First remove op:', JSON.stringify(removeOps[0]))
  const createOps = rows2.map(r => ({
    create: {
      adGroup: r.adGroup.resourceName,
      type: 'KEYWORD',
      status: r.adGroupCriterion.status ?? 'ENABLED',
      keyword: {
        text: r.adGroupCriterion.keyword.text,
        matchType: 'BROAD',
      },
    },
  }))

  const BATCH_SIZE = 500
  let totalUpdated = 0
  const errors: any[] = []
  const mutateUrl = `https://googleads.googleapis.com/v23/customers/${customerId}/adGroupCriteria:mutate`

  // Pass 1: remove all old keywords
  for (let i = 0; i < removeOps.length; i += BATCH_SIZE) {
    const batch = removeOps.slice(i, i + BATCH_SIZE)
    const res = await fetch(mutateUrl, {
      method: 'POST', headers,
      body: JSON.stringify({ operations: batch, partialFailure: true }),
    })
    const data = await res.json() as any
    if (!res.ok) {
      errors.push({ phase: 'remove', ...data })
      logger.warn('[gads-broad-match] Remove error:', JSON.stringify(data).slice(0, 500))
    } else if (data.partialFailureError) {
      errors.push({ phase: 'remove_partial', partialFailureError: data.partialFailureError })
      logger.warn('[gads-broad-match] Remove partial failure:', JSON.stringify(data.partialFailureError).slice(0, 500))
    }
  }

  if (errors.some(e => e.phase === 'remove')) {
    return { ok: false, dry_run: false, changed: 0, errors, phase: 'remove_failed' }
  }

  // Pass 2: create new BROAD keywords
  for (let i = 0; i < createOps.length; i += BATCH_SIZE) {
    const batch = createOps.slice(i, i + BATCH_SIZE)
    const res = await fetch(mutateUrl, {
      method: 'POST', headers,
      body: JSON.stringify({ operations: batch, partialFailure: true }),
    })
    const data = await res.json() as any
    if (!res.ok) {
      errors.push({ phase: 'create', ...data })
      logger.warn('[gads-broad-match] Create error:', JSON.stringify(data).slice(0, 500))
    } else {
      totalUpdated += (data.results ?? []).length
    }
  }

  return {
    ok: errors.length === 0,
    dry_run: false,
    changed: totalUpdated,
    errors: errors.length > 0 ? errors : undefined,
    summary: summary.slice(0, 10),
  }
})
