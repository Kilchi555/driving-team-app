/**
 * Add campaign-specific cross-campaign negative keywords to prevent
 * cannibalization between campaigns targeting the same audience.
 *
 * Problem (July 2026 analysis):
 *  - "fahrschule lachen" triggered in "Anhänger Fahrschule Lachen" (CHF 16.75, 0 conv):
 *    Someone searching for a regular driving school ends up seeing a trailer course ad.
 *  - "vku kurs" triggered in Anhänger campaigns (CHF 6.00, 0 conv):
 *    VKU course seekers land on Anhänger ads — wrong product.
 *  - "fahrschule lachen" triggered in "Motorrad Grundkurs Lachen 2026" (CHF 3.00, 0 conv):
 *    Regular Fahrschule searchers are confused by Motorrad ads.
 *  - Generic "fahrschule" broad in Lastwagen campaign triggering car driving school queries.
 *
 * Solution: Add campaign-level negative exact keywords to each campaign to
 * prevent sibling campaigns from stealing each other's intent traffic.
 *
 * USAGE (dry run):
 *   curl -X POST http://localhost:3000/api/admin/gads-cross-campaign-negatives \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 *
 * USAGE (apply):
 *   curl -X POST http://localhost:3000/api/admin/gads-cross-campaign-negatives \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false }'
 */

import { resolveGadsAuth, buildGadsCustomer } from '~/server/utils/gads-auth'

// Cross-campaign negatives: add these EXACT negatives to the specified campaigns
// so that traffic clearly associated with a different campaign cannot bleed over.
const CROSS_CAMPAIGN_NEGATIVES: Array<{
  campaign_name_contains: string
  negatives: Array<{ text: string; match_type: 'EXACT' | 'PHRASE' | 'BROAD' }>
  reason: string
}> = [
  {
    campaign_name_contains: 'Anhänger Fahrschule Lachen',
    negatives: [
      { text: 'fahrschule lachen', match_type: 'EXACT' },
      { text: 'fahrstunden lachen', match_type: 'EXACT' },
      { text: 'fahrlehrer lachen', match_type: 'EXACT' },
      { text: 'vku kurs', match_type: 'PHRASE' },
      { text: 'vku lachen', match_type: 'EXACT' },
      { text: 'verkehrskunde', match_type: 'PHRASE' },
    ],
    reason: 'Prevent regular Fahrschule / VKU traffic from landing on trailer course ads',
  },
  {
    campaign_name_contains: 'Anhänger Fahrschule Zürich',
    negatives: [
      { text: 'vku kurs', match_type: 'PHRASE' },
      { text: 'verkehrskunde', match_type: 'PHRASE' },
      { text: 'fahrschule zürich', match_type: 'EXACT' },
    ],
    reason: 'Prevent Zürich Fahrschule / VKU traffic from landing on Zürich trailer ads',
  },
  {
    campaign_name_contains: 'Anhänger Fahrschule Aargau',
    negatives: [
      { text: 'vku kurs', match_type: 'PHRASE' },
      { text: 'verkehrskunde', match_type: 'PHRASE' },
      { text: 'fahrschule aargau', match_type: 'EXACT' },
    ],
    reason: 'Prevent Aargau Fahrschule / VKU traffic from landing on Aargau trailer ads',
  },
  {
    campaign_name_contains: 'Lastwagen Fahrschule Lachen',
    negatives: [
      // Block regular B-category driving school queries
      { text: 'fahrschule lachen', match_type: 'EXACT' },
      { text: 'fahrstunden lachen', match_type: 'EXACT' },
      { text: 'fahrschule pfäffikon', match_type: 'PHRASE' },
      // Block VKU / Motorrad queries from LKW campaign
      { text: 'vku kurs', match_type: 'PHRASE' },
      { text: 'verkehrskunde', match_type: 'PHRASE' },
      { text: 'motorrad', match_type: 'PHRASE' },
      { text: 'anhänger', match_type: 'PHRASE' },
    ],
    reason: 'Isolate LKW campaign from B-license and VKU/Motorrad traffic',
  },
  {
    campaign_name_contains: 'Motorrad Grundkurs Lachen',
    negatives: [
      // Block non-motorrad queries
      { text: 'fahrschule lachen', match_type: 'EXACT' },
      { text: 'fahrstunden lachen', match_type: 'EXACT' },
      { text: 'vku kurs', match_type: 'PHRASE' },
      { text: 'verkehrskunde', match_type: 'PHRASE' },
      { text: 'anhänger', match_type: 'PHRASE' },
      { text: 'lastwagen', match_type: 'PHRASE' },
    ],
    reason: 'Isolate Motorrad campaign from non-motorrad Fahrschule traffic',
  },
]

export default defineEventHandler(async (event) => {
  // ── Auth + Credentials (tenant-aware) ────────────────────────────────────────
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event)
  const dryRun: boolean = body?.dry_run !== false

  const customer = buildGadsCustomer(gads)

  // 1. Fetch all active campaigns
  const campaignsResponse = await customer.query(`
    SELECT campaign.resource_name, campaign.name, campaign.status
    FROM campaign
    WHERE campaign.status != 'REMOVED'
  `)

  const campaigns = campaignsResponse as any[]

  // 2. For each rule, find matching campaigns and resolve existing negatives to avoid dups
  const MATCH_TYPE_ENUM: Record<string, number> = {
    EXACT: 3,
    PHRASE: 2,
    BROAD: 1,
  }

  const plan: Array<{
    campaignName: string
    resourceName: string
    toAdd: Array<{ text: string; match_type: string }>
    reason: string
  }> = []

  for (const rule of CROSS_CAMPAIGN_NEGATIVES) {
    const matched = campaigns.filter((c: any) =>
      (c.campaign?.name ?? '').toLowerCase().includes(rule.campaign_name_contains.toLowerCase()),
    )

    for (const campaign of matched) {
      const campaignResourceName = campaign.campaign.resource_name

      // Fetch existing campaign-level negative keywords for this campaign
      const existingNegsResponse = await customer.query(`
        SELECT
          campaign_criterion.keyword.text,
          campaign_criterion.keyword.match_type,
          campaign_criterion.negative
        FROM campaign_criterion
        WHERE
          campaign_criterion.type = 'KEYWORD'
          AND campaign_criterion.negative = true
          AND campaign.resource_name = '${campaignResourceName}'
      `)

      const existingNegs = existingNegsResponse as any[]
      const existingSet = new Set(
        existingNegs.map(
          (n: any) =>
            `${(n.campaign_criterion?.keyword?.text ?? '').toLowerCase()}::${n.campaign_criterion?.keyword?.match_type ?? ''}`,
        ),
      )

      const toAdd = rule.negatives.filter(
        neg => !existingSet.has(`${neg.text.toLowerCase()}::${neg.match_type}`),
      )

      if (toAdd.length > 0) {
        plan.push({
          campaignName: campaign.campaign.name,
          resourceName: campaignResourceName,
          toAdd,
          reason: rule.reason,
        })
      }
    }
  }

  if (dryRun) {
    return {
      dry_run: true,
      plan: plan.map(p => ({
        campaign: p.campaignName,
        to_add: p.toAdd,
        reason: p.reason,
      })),
      total_additions: plan.reduce((s, p) => s + p.toAdd.length, 0),
    }
  }

  // 3. Apply mutations
  const added: string[] = []
  const errors: string[] = []

  for (const entry of plan) {
    const operations = entry.toAdd.map(neg => ({
      entity: 'campaign_criterion',
      operation: 'create',
      resource: {
        campaign: entry.resourceName,
        negative: true,
        keyword: {
          text: neg.text,
          match_type: MATCH_TYPE_ENUM[neg.match_type] ?? 1,
        },
      },
    }))

    try {
      await customer.mutateResources(operations)
      for (const neg of entry.toAdd) {
        added.push(`[${neg.match_type}] "${neg.text}" → ${entry.campaignName}`)
      }
    }
    catch (err: any) {
      errors.push(`${entry.campaignName}: ${err?.message ?? String(err)}`)
    }
  }

  return {
    dry_run: false,
    added,
    errors,
    total_added: added.length,
    total_errors: errors.length,
  }
})
