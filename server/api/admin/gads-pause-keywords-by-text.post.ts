/**
 * Pause specific keywords by text (+ optional campaign filter).
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-pause-keywords-by-text \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "dry_run": false,
 *       "keywords": ["fahrschule preise"],
 *       "campaign_ids": ["23868553846", "23865472770"]
 *     }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as {
    dry_run?: boolean
    keywords?: string[]
    campaign_ids?: string[]
  }

  const dryRun = body.dry_run !== false
  const keywords = (body.keywords ?? []).map(k => k.trim().toLowerCase()).filter(Boolean)
  const campaignIds = (body.campaign_ids ?? []).map(String)

  if (keywords.length === 0) {
    return { ok: false, reason: 'Provide keywords: string[]' }
  }

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  let where = `
    ad_group_criterion.type = 'KEYWORD'
    AND ad_group_criterion.status = 'ENABLED'
    AND campaign.status != 'REMOVED'
    AND ad_group.status != 'REMOVED'
  `
  if (campaignIds.length > 0) {
    where += ` AND campaign.id IN (${campaignIds.join(',')})`
  }

  const query = `
    SELECT
      ad_group_criterion.resource_name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      campaign.id,
      campaign.name,
      ad_group.name
    FROM ad_group_criterion
    WHERE ${where}
  `

  const searchRes = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:search`,
    { method: 'POST', headers, body: JSON.stringify({ query: query.trim() }) },
  )
  const searchData = await searchRes.json() as any
  if (!searchRes.ok) {
    return { ok: false, reason: 'search_failed', detail: searchData }
  }

  const keywordSet = new Set(keywords)
  const matches = (searchData.results ?? []).filter((row: any) => {
    const text = String(row.adGroupCriterion?.keyword?.text ?? '').toLowerCase()
    return keywordSet.has(text)
  })

  const plan = matches.map((row: any) => ({
    keyword: row.adGroupCriterion?.keyword?.text,
    match_type: row.adGroupCriterion?.keyword?.matchType,
    campaign_id: String(row.campaign?.id ?? ''),
    campaign: row.campaign?.name,
    ad_group: row.adGroup?.name,
    resource_name: row.adGroupCriterion?.resourceName,
  }))

  if (dryRun) {
    return { ok: true, dry_run: true, to_pause: plan.length, keywords: plan }
  }

  if (plan.length === 0) {
    return { ok: true, dry_run: false, paused: 0, message: 'No matching enabled keywords found.' }
  }

  const operations = plan.map((p: any) => ({
    updateMask: 'status',
    update: {
      resourceName: p.resource_name,
      status: 'PAUSED',
    },
  }))

  const mutateRes = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupCriteria:mutate`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ operations, partialFailure: true }),
    },
  )
  const mutateData = await mutateRes.json() as any
  if (!mutateRes.ok) {
    logger.warn('[gads-pause-kw] mutate failed', JSON.stringify(mutateData).slice(0, 400))
    return { ok: false, reason: 'mutate_failed', detail: mutateData }
  }

  return {
    ok: !mutateData.partialFailureError,
    dry_run: false,
    paused: (mutateData.results ?? []).length,
    keywords: plan.map((p: any) => `${p.keyword} (${p.campaign})`),
    partial_failure: mutateData.partialFailureError ?? undefined,
  }
})
