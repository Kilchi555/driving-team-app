/**
 * One-shot admin endpoint: sets max CPC bid for all (or filtered) keywords.
 *
 * USAGE:
 *   # Set ALL keywords to CHF 3.00
 *   curl -X POST https://app.simy.ch/api/admin/set-keyword-max-cpc \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"max_cpc_chf": 3.0}'
 *
 *   # Dry-run: shows what would change without applying
 *   -d '{"max_cpc_chf": 3.0, "dry_run": true}'
 *
 *   # Only update keywords above a CPC threshold (e.g. only those > CHF 3)
 *   -d '{"max_cpc_chf": 3.0, "only_above_chf": 3.0}'
 *
 *   # Only specific campaigns
 *   -d '{"max_cpc_chf": 3.0, "campaign_ids": ["23868553846", "23865472770"]}'
 */

import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // ── Auth: accept either admin session (UI) or cron secret (curl) ──────────
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`
  if (!isCron) {
    await requireAdminProfile(event)
  }

  // ── Env ───────────────────────────────────────────────────────────────────
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId      = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret  = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken  = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId    = process.env.GOOGLE_ADS_CUSTOMER_ID

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    return { success: false, reason: 'missing_credentials' }
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  const body = await readBody(event) as {
    max_cpc_chf: number
    dry_run?: boolean
    only_above_chf?: number     // only touch keywords whose current CPC > this
    campaign_ids?: string[]     // limit to specific campaigns
  }

  if (!body?.max_cpc_chf || body.max_cpc_chf <= 0) {
    return { success: false, reason: 'max_cpc_chf must be a positive number' }
  }

  const maxCpcMicros = Math.round(body.max_cpc_chf * 1_000_000)
  const dryRun = body.dry_run ?? false

  // ── Access token ──────────────────────────────────────────────────────────
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const tokenData = await tokenRes.json() as any
  if (!tokenData.access_token) {
    return { success: false, reason: 'token_error', detail: tokenData }
  }
  const accessToken = tokenData.access_token

  const adsHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'login-customer-id': customerId,
    'Content-Type': 'application/json',
  }

  // ── Fetch all enabled keywords with their current bids ────────────────────
  let whereClause = `
    campaign.status != 'REMOVED'
    AND ad_group.status != 'REMOVED'
    AND ad_group_criterion.status != 'REMOVED'
    AND ad_group_criterion.type = 'KEYWORD'
  `
  if (body.campaign_ids?.length) {
    const ids = body.campaign_ids.map(id => `'${id}'`).join(', ')
    whereClause += ` AND campaign.id IN (${ids})`
  }

  const query = `
    SELECT
      ad_group_criterion.resource_name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.cpc_bid_micros,
      campaign.name,
      ad_group.name
    FROM ad_group_criterion
    WHERE ${whereClause}
    ORDER BY campaign.name, ad_group.name
  `

  const searchRes = await fetch(
    `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`,
    {
      method: 'POST',
      headers: adsHeaders,
      body: JSON.stringify({ query: query.trim() }),
    }
  )
  const searchText = await searchRes.text()
  let searchData: any
  try { searchData = JSON.parse(searchText) } catch {
    return { success: false, reason: 'search_api_non_json', body: searchText.slice(0, 300) }
  }
  if (!searchRes.ok) {
    return { success: false, reason: 'search_api_error', detail: searchData }
  }

  const rows: any[] = searchData.results ?? []

  // ── Filter: only update keywords that are actually above the threshold ─────
  const toUpdate = rows.filter(row => {
    const currentMicros = Number(row.adGroupCriterion?.cpcBidMicros ?? 0)
    if (body.only_above_chf && currentMicros <= body.only_above_chf * 1_000_000) return false
    // Skip if already at or below the target
    if (currentMicros > 0 && currentMicros <= maxCpcMicros) return false
    return true
  })

  const preview = toUpdate.map(row => ({
    keyword: row.adGroupCriterion?.keyword?.text,
    match_type: row.adGroupCriterion?.keyword?.matchType,
    campaign: row.campaign?.name,
    ad_group: row.adGroup?.name,
    current_cpc_chf: (Number(row.adGroupCriterion?.cpcBidMicros ?? 0) / 1_000_000).toFixed(2),
    new_cpc_chf: body.max_cpc_chf.toFixed(2),
    resource_name: row.adGroupCriterion?.resourceName,
  }))

  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      total_keywords: rows.length,
      to_update: preview.length,
      keywords: preview,
    }
  }

  if (toUpdate.length === 0) {
    return { success: true, message: 'All keywords are already at or below the target CPC.', total_keywords: rows.length }
  }

  // ── Mutate: set cpc_bid_micros for each keyword in batches of 1000 ────────
  const BATCH_SIZE = 1000
  let totalUpdated = 0
  const errors: any[] = []

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE)
    const operations = batch.map(row => ({
      updateMask: 'cpc_bid_micros',
      update: {
        resourceName: row.adGroupCriterion.resourceName,
        cpcBidMicros: maxCpcMicros,
      },
    }))

    const mutateRes = await fetch(
      `https://googleads.googleapis.com/v23/customers/${customerId}/adGroupCriteria:mutate`,
      {
        method: 'POST',
        headers: adsHeaders,
        body: JSON.stringify({ operations, partialFailure: true }),
      }
    )
    const mutateText = await mutateRes.text()
    let mutateData: any
    try { mutateData = JSON.parse(mutateText) } catch { mutateData = { raw: mutateText.slice(0, 300) } }

    if (!mutateRes.ok) {
      errors.push({ batch_start: i, error: mutateData })
      continue
    }
    if (mutateData?.partialFailureError) {
      errors.push({ batch_start: i, partial_failure: mutateData.partialFailureError })
    }

    totalUpdated += (mutateData?.results?.length ?? batch.length)
  }

  return {
    success: errors.length === 0,
    total_keywords_found: rows.length,
    updated: totalUpdated,
    skipped: rows.length - toUpdate.length,
    max_cpc_chf: body.max_cpc_chf,
    errors: errors.length > 0 ? errors : undefined,
    keywords_updated: preview.map(p => `${p.keyword} (${p.campaign}) CHF ${p.current_cpc_chf} → ${p.new_cpc_chf}`),
  }
})
