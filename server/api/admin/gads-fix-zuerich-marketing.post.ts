/**
 * One-shot orchestrator: apply all Zürich- and Lachen-region Google Ads fixes
 * identified in the July 2026 marketing analysis.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-fix-zuerich-marketing \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders, buildGadsCustomer } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'

const FAHRSCHULE_ZUERICH_CAMPAIGN_ID = '23868553846'
const FAHRSCHULE_LACHEN_CAMPAIGN_ID = '23865472770'
const MOTORRAD_GRUNDKURS_ZUERICH_ID = '24023050951'
const MOTORRAD_FAHRSTUNDEN_ZUERICH_ID = '24014870373'

const ZUERICH_AUTO_NEGATIVES = [
  'motorrad grundkurs',
  'motorrad grundkurs zürich',
  'motorrad grundkurs in der nähe',
  'motorradprüfung',
  'motorrad prüfung',
  'pgs kurs',
  'pgs kurs zürich',
  'vku kurs',
  'vku altstetten',
  'vku zürich',
  'theorieprüfung anmelden',
  'lernfahrgesuch zürich',
  'strassenverkehrsamt',
  'team humm',
  'max drive',
  'blink ag',
  'drivelab',
  'letzhgo',
  'motorrad fahrtraining',
  '2 phasen kurs motorrad',
  'lastwagen prüfung',
  'schriftliche prüfung auto',
]

const MOTORRAD_ZUERICH_NEGATIVES = [
  'fahrschule schlieren',
  'fahrschule dietikon',
  'fahrschule birmensdorf',
  'fahrschule altstetten',
  'fahrstunden zürich',
  'führerschein machen',
  'vku kurs',
  'anhänger',
  'lastwagen',
]

async function addCampaignNegatives(
  customerId: string,
  headers: Record<string, string>,
  campaignId: string,
  negatives: string[],
  dryRun: boolean,
): Promise<{ added: number; skipped: number }> {
  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const existingQuery = `
    SELECT campaign_criterion.keyword.text
    FROM campaign_criterion
    WHERE campaign_criterion.type = 'KEYWORD'
      AND campaign_criterion.negative = true
      AND campaign.id = ${campaignId}
  `
  const existingRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query: existingQuery }) })
  const existingData = await existingRes.json() as any[]
  const existing = new Set<string>()
  for (const batch of (Array.isArray(existingData) ? existingData : [])) {
    for (const row of (batch.results ?? [])) {
      existing.add((row.campaignCriterion?.keyword?.text ?? '').toLowerCase())
    }
  }

  const toAdd = negatives.filter(n => !existing.has(n.toLowerCase()))
  if (dryRun || toAdd.length === 0) {
    return { added: toAdd.length, skipped: negatives.length - toAdd.length }
  }

  const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/campaignCriteria:mutate`
  const campaignResource = `customers/${customerId}/campaigns/${campaignId}`
  const operations = toAdd.map(text => ({
    create: {
      campaign: campaignResource,
      negative: true,
      keyword: { text, matchType: 'BROAD' },
    },
  }))

  const res = await fetch(mutateUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ operations, partialFailure: true }),
  })
  const data = await res.json() as any
  if (!res.ok) {
    logger.warn('[gads-fix-zuerich] Negative keyword error:', JSON.stringify(data).slice(0, 400))
    return { added: 0, skipped: negatives.length }
  }

  return { added: (data.results ?? []).length, skipped: negatives.length - toAdd.length }
}

async function pauseBroadFahrschuleKeywords(
  customerId: string,
  headers: Record<string, string>,
  campaignId: string,
  dryRun: boolean,
): Promise<{ paused: number }> {
  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const query = `
    SELECT ad_group_criterion.resource_name
    FROM ad_group_criterion
    WHERE ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status = 'ENABLED'
      AND ad_group_criterion.keyword.match_type = 'BROAD'
      AND campaign.id = ${campaignId}
      AND ad_group_criterion.keyword.text IN ('fahrschule', 'fahrschule in der nähe')
  `
  const searchRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const searchData = await searchRes.json() as any[]
  const resources: string[] = []
  for (const batch of (Array.isArray(searchData) ? searchData : [])) {
    for (const row of (batch.results ?? [])) {
      if (row.adGroupCriterion?.resourceName) resources.push(row.adGroupCriterion.resourceName)
    }
  }

  if (dryRun || resources.length === 0) return { paused: resources.length }

  const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupCriteria:mutate`
  const operations = resources.map(resource_name => ({
    update: { resourceName: resource_name, status: 'PAUSED' },
    updateMask: 'status',
  }))

  await fetch(mutateUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ operations, partialFailure: true }),
  })

  return { paused: resources.length }
}

async function updateBudgets(
  customerId: string,
  headers: Record<string, string>,
  dryRun: boolean,
): Promise<Array<{ campaign: string; from_chf: number; to_chf: number }>> {
  const updates = [
    { campaign_id: MOTORRAD_GRUNDKURS_ZUERICH_ID, daily_budget_chf: 20 },
    { campaign_id: MOTORRAD_FAHRSTUNDEN_ZUERICH_ID, daily_budget_chf: 12 },
    { campaign_id: FAHRSCHULE_ZUERICH_CAMPAIGN_ID, daily_budget_chf: 28 },
    { campaign_id: FAHRSCHULE_LACHEN_CAMPAIGN_ID, daily_budget_chf: 28 },
  ]

  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const query = `
    SELECT campaign.id, campaign.name, campaign_budget.resource_name, campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.status = 'ENABLED'
  `
  const searchRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const searchData = await searchRes.json() as any[]

  const budgets: Record<string, { resource: string; chf: number; name: string }> = {}
  for (const batch of (Array.isArray(searchData) ? searchData : [])) {
    for (const row of (batch.results ?? [])) {
      const id = String(row.campaign?.id ?? '')
      budgets[id] = {
        resource: row.campaignBudget?.resourceName ?? '',
        chf: Math.round((row.campaignBudget?.amountMicros ?? 0) / 10_000) / 100,
        name: row.campaign?.name ?? id,
      }
    }
  }

  const results: Array<{ campaign: string; from_chf: number; to_chf: number }> = []

  for (const u of updates) {
    const current = budgets[u.campaign_id]
    if (!current?.resource) continue
    const targetChf = Math.max(current.chf, u.daily_budget_chf)
    results.push({ campaign: current.name, from_chf: current.chf, to_chf: targetChf })

    if (dryRun || current.chf >= u.daily_budget_chf) continue

    const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/campaignBudgets:mutate`
    await fetch(mutateUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operations: [{
          updateMask: 'amountMicros',
          update: {
            resourceName: current.resource,
            amountMicros: Math.round(u.daily_budget_chf * 1_000_000),
          },
        }],
      }),
    })
  }

  return results
}

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun: boolean = body?.dry_run !== false

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  const results: Record<string, unknown> = {
    negatives_auto: await addCampaignNegatives(
      customerId, headers, FAHRSCHULE_ZUERICH_CAMPAIGN_ID, ZUERICH_AUTO_NEGATIVES, dryRun,
    ),
    negatives_motorrad: await addCampaignNegatives(
      customerId, headers, MOTORRAD_GRUNDKURS_ZUERICH_ID, MOTORRAD_ZUERICH_NEGATIVES, dryRun,
    ),
    pause_broad_fahrschule_zuerich: await pauseBroadFahrschuleKeywords(
      customerId, headers, FAHRSCHULE_ZUERICH_CAMPAIGN_ID, dryRun,
    ),
    pause_broad_fahrschule_lachen: await pauseBroadFahrschuleKeywords(
      customerId, headers, FAHRSCHULE_LACHEN_CAMPAIGN_ID, dryRun,
    ),
    budgets: await updateBudgets(customerId, headers, dryRun),
  }

  if (!dryRun) {
    const customer = buildGadsCustomer(gads)
    const campaignResponse = await customer.query(`
      SELECT campaign.resource_name, campaign.name,
             campaign.target_impression_share.cpc_bid_ceiling_micros
      FROM campaign
      WHERE campaign.status = 'ENABLED'
        AND campaign.name IN ('Fahrschule Zürich Umgebung', 'Fahrschule Lachen Umgebung', 'Motorrad Grundkurs Zürich', 'Motorrad Fahrstunden Zürich')
    `)

    const bidUpdates: string[] = []
    for (const camp of campaignResponse as any[]) {
      const name = camp.campaign?.name ?? ''
      const resourceName = camp.campaign?.resource_name ?? ''
      const currentChf = (camp.campaign?.target_impression_share?.cpc_bid_ceiling_micros ?? 0) / 1_000_000

      let targetChf = currentChf
      if (name === 'Fahrschule Zürich Umgebung') targetChf = Math.max(currentChf * 1.25, 5.0)
      if (name === 'Fahrschule Lachen Umgebung') targetChf = Math.max(currentChf * 1.25, 5.0)
      if (name.includes('Motorrad') && name.includes('Zürich')) targetChf = Math.max(currentChf * 1.3, 4.5)

      if (Math.abs(targetChf - currentChf) < 0.01) continue

      await customer.mutateResources([{
        entity: 'campaign',
        operation: 'update',
        resource: {
          resource_name: resourceName,
          target_impression_share: {
            location: 2,
            location_fraction_micros: 800_000,
            cpc_bid_ceiling_micros: Math.round(Math.min(targetChf, 8) * 1_000_000),
          },
        },
        update_mask: {
          paths: [
            'target_impression_share.cpc_bid_ceiling_micros',
            'target_impression_share.location_fraction_micros',
          ],
        },
      }])
      bidUpdates.push(`${name}: CHF ${currentChf.toFixed(2)} → CHF ${targetChf.toFixed(2)}`)
    }
    results.bids = bidUpdates
  } else {
    results.bids = 'Would raise CPC ceilings for Fahrschule Zürich (+25%), Fahrschule Lachen (+25%), Motorrad Zürich (+30%)'
  }

  logger.info(`[gads-fix-zuerich-marketing] Completed (dry_run=${dryRun})`)

  return {
    ok: true,
    dry_run: dryRun,
    message: dryRun
      ? 'Dry run complete. Set dry_run: false to apply all changes.'
      : 'Zürich + Lachen marketing fixes applied.',
    results,
    next_steps: dryRun ? undefined : [
      'POST /api/admin/gads-fix-landing-urls { "dry_run": false, "preset": "zuerich_locations" }',
      'POST /api/admin/gads-fix-landing-urls { "dry_run": false, "preset": "motorrad_zuerich" }',
    ],
  }
})
