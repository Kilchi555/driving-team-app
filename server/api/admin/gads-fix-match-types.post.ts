/**
 * Convert specific BROAD match keywords to EXACT or PHRASE match.
 *
 * Background: All DrivingTeam keywords were set to BROAD, causing massive
 * budget waste on irrelevant search terms. This endpoint converts the
 * highest-value keywords (those with quality scores and known intent)
 * to EXACT or PHRASE match, while leaving broader discovery keywords as BROAD.
 *
 * Strategy applied (per keyword-level data from July 2026):
 *  - EXACT: high-intent, location-specific terms (e.g. "fahrschule lachen")
 *  - PHRASE: service-specific terms (e.g. "fahrschule in der nähe")
 *  - Leave BROAD: generic terms used for discovery (handled via BROAD + negatives)
 *
 * USAGE (dry run — shows what would change):
 *   curl -X POST http://localhost:3000/api/admin/gads-fix-match-types \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true, "preset": "top_keywords" }'
 *
 * USAGE (apply):
 *   curl -X POST http://localhost:3000/api/admin/gads-fix-match-types \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false, "preset": "top_keywords" }'
 *
 * USAGE (custom list):
 *   curl -X POST http://localhost:3000/api/admin/gads-fix-match-types \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "dry_run": false,
 *       "overrides": [
 *         { "keyword_text": "fahrschule lachen", "new_match_type": "EXACT" }
 *       ]
 *     }'
 *
 * NOTE: Google Ads does not allow changing match_type in-place.
 * This endpoint removes the old keyword and creates a new one with
 * the desired match type, preserving the bid (cpcBidMicros).
 */

import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { logger } from '~/utils/logger'

const GADS_VERSION = 'v23'

// ── Top-keyword preset: converts these specific keywords across all campaigns ─
// Basis: July 2026 keyword data — keywords with QS ≥ 7 or known high conversion intent.
// Only keywords that currently exist as BROAD in the account are affected.
const TOP_KEYWORD_OVERRIDES: Array<{ keyword_text: string; new_match_type: 'EXACT' | 'PHRASE' }> = [
  // VKU Lachen — star performers (QS 10 and 7)
  { keyword_text: 'vku lachen', new_match_type: 'EXACT' },
  { keyword_text: 'vku kurs lachen', new_match_type: 'EXACT' },
  { keyword_text: 'vku kurs schwyz', new_match_type: 'PHRASE' },

  // Fahrschule Lachen — location-specific (QS 8–10)
  { keyword_text: 'fahrschule lachen', new_match_type: 'EXACT' },
  { keyword_text: 'fahrstunden lachen', new_match_type: 'EXACT' },
  { keyword_text: 'fahrschule pfäffikon sz', new_match_type: 'EXACT' },
  { keyword_text: 'fahrschule march', new_match_type: 'PHRASE' },
  { keyword_text: 'fahrschule in der nähe', new_match_type: 'PHRASE' },

  // Anhänger Zürich — QS 10 on "Anhänger Fahrschule" in Altstetten ad group
  { keyword_text: 'Anhänger Fahrschule Zürich', new_match_type: 'EXACT' },
  { keyword_text: 'Anhänger Fahrschule', new_match_type: 'PHRASE' },
  { keyword_text: 'Anhänger Fahrstunden', new_match_type: 'PHRASE' },
  { keyword_text: 'Anhängerprüfung Zürich', new_match_type: 'PHRASE' },

  // Anhänger Aargau — QS 8 on "Anhänger Prüfung"
  { keyword_text: 'Anhänger Fahrschule Aargau', new_match_type: 'EXACT' },
  { keyword_text: 'Anhängerprüfung Aargau', new_match_type: 'PHRASE' },
  { keyword_text: 'Anhänger Prüfung', new_match_type: 'PHRASE' },

  // Lastwagen — QS 8 on "Lastwagen Prüfung"
  { keyword_text: 'Lastwagen Fahrschule Lachen', new_match_type: 'EXACT' },
  { keyword_text: 'Lastwagenfahrschule', new_match_type: 'PHRASE' },
  { keyword_text: 'Lastwagen Prüfung', new_match_type: 'PHRASE' },

  // Fahrschule Zürich — location specific
  { keyword_text: 'fahrschule Schlieren', new_match_type: 'EXACT' },
  { keyword_text: 'fahrschule Altstetten', new_match_type: 'EXACT' },
  { keyword_text: 'fahrschule Dietikon', new_match_type: 'EXACT' },
  { keyword_text: 'fahrschule Spreitenbach', new_match_type: 'EXACT' },
  { keyword_text: 'fahrschule limmattal', new_match_type: 'PHRASE' },
  { keyword_text: 'fahrlehrer Schlieren', new_match_type: 'EXACT' },
]

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
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  const auth = getHeader(event, 'authorization') ?? ''
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun: boolean = body?.dry_run !== false
  const preset: string = body?.preset ?? ''

  // Resolve which overrides to apply
  let overrides: Array<{ keyword_text: string; new_match_type: 'EXACT' | 'PHRASE' }> = []

  if (preset === 'top_keywords') {
    overrides = TOP_KEYWORD_OVERRIDES
  } else if (Array.isArray(body?.overrides) && body.overrides.length > 0) {
    overrides = body.overrides
  } else {
    return {
      ok: false,
      reason: 'Provide preset "top_keywords" or an overrides array with { keyword_text, new_match_type }.',
    }
  }

  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').trim()
  const developerToken = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '').trim()
  const managerCustomerId = (process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID ?? '').trim()

  if (!customerId || !developerToken) return { ok: false, reason: 'missing_credentials' }

  const accessToken = await getAccessToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  }
  if (managerCustomerId) headers['login-customer-id'] = managerCustomerId

  // ── Fetch all active BROAD keywords in allowed campaigns ─────────────────────
  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`

  const allowedPrefixes = [
    'Anhänger Fahrschule',
    'Lastwagen Fahrschule',
    'Fahrschule Zürich',
    'Fahrschule Lachen',
    'VKU Kurs Lachen',
  ]

  const overrideTextsLower = new Set(overrides.map(o => o.keyword_text.toLowerCase()))

  const query = `
    SELECT campaign.name, ad_group.resource_name, ad_group.name,
           ad_group_criterion.keyword.text,
           ad_group_criterion.keyword.match_type,
           ad_group_criterion.resource_name,
           ad_group_criterion.status,
           ad_group_criterion.cpc_bid_micros
    FROM ad_group_criterion
    WHERE ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status != 'REMOVED'
      AND ad_group_criterion.keyword.match_type = 'BROAD'
      AND campaign.status = 'ENABLED'
  `

  const searchRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const searchData = await searchRes.json() as any[]

  const rows: any[] = []
  for (const batch of (Array.isArray(searchData) ? searchData : [])) {
    rows.push(...(batch.results ?? []))
  }

  // Filter to allowed campaigns and matching keyword texts
  const targetRows = rows.filter(r => {
    const campName: string = r.campaign?.name ?? ''
    if (!allowedPrefixes.some(p => campName.startsWith(p))) return false
    const kwText: string = (r.adGroupCriterion?.keyword?.text ?? '').toLowerCase()
    return overrideTextsLower.has(kwText)
  })

  logger.info(`[gads-fix-match] ${rows.length} BROAD keywords total, ${targetRows.length} match override list`)

  // Build change plan
  const plan = targetRows.map(r => {
    const kwTextLower = (r.adGroupCriterion?.keyword?.text ?? '').toLowerCase()
    const override = overrides.find(o => o.keyword_text.toLowerCase() === kwTextLower)!
    return {
      campaign: r.campaign?.name,
      ad_group: r.adGroup?.name,
      keyword: r.adGroupCriterion?.keyword?.text,
      from: 'BROAD',
      to: override.new_match_type,
      resource_name: r.adGroupCriterion?.resourceName,
      ad_group_resource_name: r.adGroup?.resourceName,
      cpc_bid_micros: r.adGroupCriterion?.cpcBidMicros ?? 0,
      criterion_status: r.adGroupCriterion?.status ?? 'ENABLED',
    }
  })

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      would_change: plan.length,
      plan,
      not_found_in_account: overrides
        .filter(o => !plan.some(p => p.keyword?.toLowerCase() === o.keyword_text.toLowerCase()))
        .map(o => o.keyword_text),
    }
  }

  if (plan.length === 0) {
    return { ok: true, changed: 0, message: 'No matching BROAD keywords found to convert.' }
  }

  const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupCriteria:mutate`
  const BATCH_SIZE = 500
  let totalChanged = 0
  const errors: any[] = []

  // Pass 1: remove old BROAD keywords
  const removeOps = plan.map(p => ({ remove: p.resource_name }))
  for (let i = 0; i < removeOps.length; i += BATCH_SIZE) {
    const batch = removeOps.slice(i, i + BATCH_SIZE)
    const res = await fetch(mutateUrl, {
      method: 'POST', headers,
      body: JSON.stringify({ operations: batch, partialFailure: true }),
    })
    const data = await res.json() as any
    if (!res.ok) {
      errors.push({ phase: 'remove', batch_start: i, error: data })
      logger.warn('[gads-fix-match] Remove error:', JSON.stringify(data).slice(0, 500))
    } else if (data.partialFailureError) {
      errors.push({ phase: 'remove_partial', batch_start: i, partialFailureError: data.partialFailureError })
    }
  }

  if (errors.some(e => e.phase === 'remove')) {
    return { ok: false, phase: 'remove_failed', changed: 0, errors }
  }

  // Pass 2: create with new match type
  const createOps = plan.map(p => ({
    create: {
      adGroup: p.ad_group_resource_name,
      type: 'KEYWORD',
      status: p.criterion_status,
      keyword: {
        text: p.keyword,
        matchType: p.to,
      },
      ...(p.cpc_bid_micros ? { cpcBidMicros: p.cpc_bid_micros } : {}),
    },
  }))

  for (let i = 0; i < createOps.length; i += BATCH_SIZE) {
    const batch = createOps.slice(i, i + BATCH_SIZE)
    const res = await fetch(mutateUrl, {
      method: 'POST', headers,
      body: JSON.stringify({ operations: batch, partialFailure: true }),
    })
    const data = await res.json() as any
    if (!res.ok) {
      errors.push({ phase: 'create', batch_start: i, error: data })
      logger.warn('[gads-fix-match] Create error:', JSON.stringify(data).slice(0, 500))
    } else {
      totalChanged += (data.results ?? []).length
      if (data.partialFailureError) {
        errors.push({ phase: 'create_partial', batch_start: i, partialFailureError: data.partialFailureError })
      }
    }
  }

  return {
    ok: errors.length === 0,
    dry_run: false,
    changed: totalChanged,
    attempted: plan.length,
    errors: errors.length > 0 ? errors : undefined,
    summary: plan.slice(0, 20).map(p => `${p.keyword} (${p.campaign}): BROAD → ${p.to}`),
  }
})
