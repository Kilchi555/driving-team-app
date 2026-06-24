/**
 * TEMPORARY admin endpoint — sets all active keywords to BROAD match type.
 * Protected by CRON_SECRET. Delete after use.
 *
 * POST /api/admin/gads-set-broad-match
 * Headers: Authorization: Bearer <CRON_SECRET>
 * Body: { dry_run: true }   ← set to false to actually apply
 */

import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { logger } from '~/utils/logger'

const GADS_VERSION = 'v23'

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? '',
      refresh_token: (process.env.GOOGLE_ADS_REFRESH_TOKEN ?? '').trim(),
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as any
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

export default defineEventHandler(async (event) => {
  // Auth check
  const cronSecret = process.env.CRON_SECRET
  const auth = getHeader(event, 'authorization') ?? ''
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun = body?.dry_run !== false // default: dry run

  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').trim()
  const managerCustomerId = (process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID ?? '').trim()
  const developerToken = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '').trim()

  if (!customerId || !developerToken) {
    return { ok: false, reason: 'missing_credentials', customerId: !!customerId, developerToken: !!developerToken }
  }

  const accessToken = await getAccessToken()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  }
  if (managerCustomerId) headers['login-customer-id'] = managerCustomerId

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
      code_version: 'v4-partial-failure',
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
    }
  }

  if (errors.length > 0) {
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
    summary,
  }
})
