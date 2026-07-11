/**
 * Add high-intent booking keywords to "Fahrschule Zürich Umgebung" and
 * "Fahrschule Lachen Umgebung" campaigns.
 *
 * Uses the REST API directly (no library overhead, no pre-fetch of existing
 * keywords — Google Ads silently ignores exact duplicates via ALREADY_EXISTS).
 *
 * Keywords added per location ad group:
 *   Zürich: fahrstunden buchen [city], auto fahrstunden [city], führerschein machen [city]
 *   Lachen: same pattern for Lachen, Pfäffikon SZ + generic March SZ terms
 *
 * USAGE (dry run):
 *   curl -X POST https://app.simy.ch/api/admin/gads-add-booking-keywords \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 *
 * USAGE (apply):
 *   curl -X POST https://app.simy.ch/api/admin/gads-add-booking-keywords \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false }'
 */

import { defineEventHandler, readBody } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'

// CPC bids in CHF for booking-intent keywords
const CPC_EXACT = 4.0   // CHF — [exact match] direct booking terms
const CPC_PHRASE = 3.5  // CHF — "phrase match" broader booking terms

// Keywords per ad group (identified by name pattern in campaign)
// Structure: { campaign_name, ad_group_name, keywords[] }
const BOOKING_KEYWORDS: Array<{
  campaign: string
  ad_group: string
  keywords: Array<{ text: string; matchType: 'EXACT' | 'PHRASE'; cpc: number }>
}> = [
  // ── Fahrschule Zürich Umgebung ──────────────────────────────────────────────
  {
    campaign: 'Fahrschule Zürich Umgebung',
    ad_group: 'Fahrschule Altstetten',
    keywords: [
      { text: 'fahrstunden buchen zürich',      matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'auto fahrstunden zürich',         matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'führerschein machen zürich',      matchType: 'PHRASE', cpc: CPC_PHRASE },
      { text: 'fahrlehrer zürich buchen',        matchType: 'PHRASE', cpc: CPC_PHRASE },
      { text: 'fahrschule zürich online buchen', matchType: 'PHRASE', cpc: CPC_PHRASE },
      { text: 'auto führerschein zürich',        matchType: 'PHRASE', cpc: CPC_PHRASE },
      { text: 'fahrstunden buchen altstetten',   matchType: 'EXACT',  cpc: CPC_EXACT },
    ],
  },
  {
    campaign: 'Fahrschule Zürich Umgebung',
    ad_group: 'Fahrschule Dietikon',
    keywords: [
      { text: 'fahrstunden buchen dietikon',   matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'auto fahrstunden dietikon',     matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'führerschein machen dietikon',  matchType: 'PHRASE', cpc: CPC_PHRASE },
      { text: 'fahrlehrer dietikon buchen',    matchType: 'PHRASE', cpc: CPC_PHRASE },
    ],
  },
  {
    campaign: 'Fahrschule Zürich Umgebung',
    ad_group: 'Fahrschule Schlieren',
    keywords: [
      { text: 'fahrstunden buchen schlieren',  matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'auto fahrstunden schlieren',    matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'führerschein machen schlieren', matchType: 'PHRASE', cpc: CPC_PHRASE },
    ],
  },
  {
    campaign: 'Fahrschule Zürich Umgebung',
    ad_group: 'Fahrschule Urdorf',
    keywords: [
      { text: 'fahrstunden buchen urdorf', matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'auto fahrstunden urdorf',   matchType: 'EXACT',  cpc: CPC_EXACT },
    ],
  },
  {
    campaign: 'Fahrschule Zürich Umgebung',
    ad_group: 'Fahrschule Birmensdorf',
    keywords: [
      { text: 'fahrstunden buchen birmensdorf', matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'fahrschule birmensdorf buchen',  matchType: 'EXACT',  cpc: CPC_EXACT },
    ],
  },

  // ── Fahrschule Lachen Umgebung ──────────────────────────────────────────────
  {
    campaign: 'Fahrschule Lachen Umgebung',
    ad_group: 'Fahrschule Lachen',
    keywords: [
      { text: 'fahrstunden buchen lachen',       matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'auto fahrstunden lachen',         matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'führerschein machen lachen',      matchType: 'PHRASE', cpc: CPC_PHRASE },
      { text: 'führerschein machen march',       matchType: 'PHRASE', cpc: CPC_PHRASE },
      { text: 'fahrlehrer lachen buchen',        matchType: 'PHRASE', cpc: CPC_PHRASE },
      { text: 'fahrschule lachen online buchen', matchType: 'PHRASE', cpc: CPC_PHRASE },
      { text: 'auto führerschein lachen',        matchType: 'PHRASE', cpc: CPC_PHRASE },
      { text: 'fahrstunden march sz',            matchType: 'PHRASE', cpc: CPC_PHRASE },
    ],
  },
  {
    campaign: 'Fahrschule Lachen Umgebung',
    ad_group: 'Fahrschule Pfäffikon SZ',
    keywords: [
      { text: 'fahrstunden buchen pfäffikon',  matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'auto fahrstunden pfäffikon',    matchType: 'EXACT',  cpc: CPC_EXACT },
      { text: 'führerschein machen pfäffikon', matchType: 'PHRASE', cpc: CPC_PHRASE },
      { text: 'fahrlehrer pfäffikon sz',       matchType: 'PHRASE', cpc: CPC_PHRASE },
    ],
  },
]

const MATCH_TYPE_MAP: Record<string, number> = { EXACT: 3, PHRASE: 2, BROAD: 1 }

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event) as { dry_run?: boolean }
  const dryRun = body?.dry_run !== false

  if (dryRun) {
    const total = BOOKING_KEYWORDS.reduce((s, g) => s + g.keywords.length, 0)
    return {
      dry_run: true,
      total_keywords: total,
      groups: BOOKING_KEYWORDS.map(g => ({
        campaign: g.campaign,
        ad_group: g.ad_group,
        keywords: g.keywords.map(k => `[${k.matchType}] ${k.text} (CHF ${k.cpc})`),
      })),
      note: 'Google Ads returns ALREADY_EXISTS for true duplicates — safe to re-run',
    }
  }

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerPrefix = `customers/${gads.customerId}`

  // 1. Fetch ad groups for both campaigns
  const gaqlRes = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/${customerPrefix}/googleAds:search`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `
          SELECT ad_group.resource_name, ad_group.name, campaign.name
          FROM ad_group
          WHERE campaign.name IN ('Fahrschule Zürich Umgebung', 'Fahrschule Lachen Umgebung')
            AND ad_group.status = 'ENABLED'
        `,
      }),
    },
  )
  const gaqlData = await gaqlRes.json() as any
  if (!gaqlRes.ok) {
    return { ok: false, step: 'fetch_ad_groups', error: gaqlData }
  }

  // Build ad group lookup: "Campaign::AdGroup" → resourceName
  const agLookup: Record<string, string> = {}
  for (const row of (gaqlData.results ?? [])) {
    const key = `${row.adGroup?.campaign}::${row.adGroup?.name}`
    agLookup[key] = row.adGroup?.resourceName ?? ''

    // Also try campaign name from campaign field
    const key2 = `${row.campaign?.name}::${row.adGroup?.name}`
    agLookup[key2] = row.adGroup?.resourceName ?? ''
  }

  // 2. Add keywords to each ad group
  const results: any[] = []

  for (const group of BOOKING_KEYWORDS) {
    const agResource = agLookup[`${group.campaign}::${group.ad_group}`]
    if (!agResource) {
      results.push({ campaign: group.campaign, ad_group: group.ad_group, error: 'Ad group not found', lookup_key: `${group.campaign}::${group.ad_group}` })
      continue
    }

    const operations = group.keywords.map(kw => ({
      create: {
        adGroup: agResource,
        status: 'ENABLED',
        keyword: {
          text: kw.text,
          matchType: kw.matchType,
        },
        cpcBidMicros: String(Math.round(kw.cpc * 1_000_000)),
      },
    }))

    const kwRes = await fetch(
      `https://googleads.googleapis.com/${GADS_VERSION}/${customerPrefix}/adGroupCriteria:mutate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ operations }),
      },
    )
    const kwData = await kwRes.json() as any

    // Count ALREADY_EXISTS as ok (idempotent)
    const partialErrors = kwData.partialFailureError?.details ?? []
    const alreadyExists = partialErrors.filter((e: any) =>
      JSON.stringify(e).includes('ALREADY_EXISTS') || JSON.stringify(e).includes('already exists'),
    ).length

    results.push({
      campaign: group.campaign,
      ad_group: group.ad_group,
      keywords_attempted: group.keywords.length,
      ok: kwRes.ok,
      already_existed: alreadyExists,
      added: kwRes.ok ? group.keywords.length - alreadyExists : 0,
      errors: kwRes.ok ? [] : [kwData],
    })
  }

  const totalAdded = results.reduce((s, r) => s + (r.added ?? 0), 0)
  const failedGroups = results.filter(r => !r.ok || r.error)

  return {
    dry_run: false,
    total_added: totalAdded,
    results,
    failed_groups: failedGroups.length,
  }
})
