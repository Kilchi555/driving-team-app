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
  const query = `
    SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text,
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

  logger.info(`[gads-broad-match] Found ${rows.length} non-broad keywords`)

  if (rows.length === 0) {
    return { ok: true, message: 'All keywords are already BROAD', changed: 0, dry_run: dryRun }
  }

  // Summary for dry run
  const summary = rows.map(r => ({
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
      would_change: rows.length,
      keywords: summary,
    }
  }

  // 2. Mutate — update all to BROAD in batches of 1000
  const operations = rows.map(r => ({
    updateMask: 'keyword.matchType',
    update: {
      resourceName: r.adGroupCriterion.resourceName,
      keyword: {
        text: r.adGroupCriterion.keyword.text,
        matchType: 'BROAD',
      },
    },
  }))

  const BATCH_SIZE = 1000
  let totalUpdated = 0
  const errors: any[] = []

  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = operations.slice(i, i + BATCH_SIZE)
    const mutateUrl = `https://googleads.googleapis.com/v23/customers/${customerId}/adGroupCriteria:mutate`
    const mutateRes = await fetch(mutateUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ operations: batch }),
    })
    const mutateData = await mutateRes.json() as any
    if (!mutateRes.ok) {
      errors.push(mutateData)
      logger.warn('[gads-broad-match] Mutate error:', JSON.stringify(mutateData).slice(0, 500))
    } else {
      totalUpdated += (mutateData.results ?? []).length
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
