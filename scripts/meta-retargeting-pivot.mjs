#!/usr/bin/env node
/**
 * Meta Ads: Pivot to retargeting-only
 *
 * 1. Pause all non-retargeting campaigns
 * 2. Create pixel custom audiences (visitors 7d/30d, InitiateCheckout 14d, Purchase 180d)
 * 3. Ensure retargeting campaign has Hot 7d / Warm 30d / Checkout 14d ad sets
 * 4. Optimize for Purchase, set ~CHF 22/day total retargeting budget, activate
 *
 * Usage:
 *   node --env-file=.env.vercel scripts/meta-retargeting-pivot.mjs --dry-run
 *   node --env-file=.env.vercel scripts/meta-retargeting-pivot.mjs
 */

const GRAPH = 'https://graph.facebook.com/v19.0'
const dryRun = process.argv.includes('--dry-run')

const TOKEN = process.env.META_SYSTEM_USER_TOKEN || process.env.META_ACCESS_TOKEN
const AD_ACCOUNT = (process.env.META_AD_ACCOUNT_ID || '').replace(/^act_/, '')
/** Meta requires numeric pixel id inside custom-audience rules (string → Invalid rule JSON). */
const PIXEL_ID = Number(
  String(process.env.META_PIXEL_ID || '')
    .trim()
    .replace(/\\n$/i, '')
    .replace(/\r?\n$/g, '')
    .trim(),
)
const PAGE_ID = process.env.META_PAGE_ID

const ACT = `act_${AD_ACCOUNT}`
const TOTAL_DAILY_BUDGET_CENTS = 2200 // CHF 22/day across retargeting ad sets
/** Keep placements aligned with existing live ad sets (FB reels position is invalid). */
const DEFAULT_PLACEMENTS = {
  publisher_platforms: ['facebook', 'instagram'],
  facebook_positions: ['feed', 'story'],
  instagram_positions: ['stream', 'story', 'reels'],
}
const GEO = {
  custom_locations: [
    { latitude: 47.3688, longitude: 8.4876, radius: 15, distance_unit: 'kilometer' },
    { latitude: 47.1975, longitude: 8.8533, radius: 25, distance_unit: 'kilometer' },
  ],
  location_types: ['home', 'recent'],
}

function log(...args) {
  console.log(...args)
}

async function metaGet(path, params = {}) {
  const url = new URL(`${GRAPH}/${path}`)
  url.searchParams.set('access_token', TOKEN)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(`GET ${path}: ${data.error?.message || JSON.stringify(data)}`)
  }
  return data
}

async function metaPost(path, body = {}) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(`POST ${path}: ${data.error?.message || JSON.stringify(data)}`)
  }
  return data
}

async function getAll(path, params = {}) {
  const out = []
  let after
  do {
    const page = await metaGet(path, { ...params, limit: 100, ...(after ? { after } : {}) })
    out.push(...(page.data || []))
    after = page.paging?.cursors?.after
    if (!page.paging?.next) break
  } while (after)
  return out
}

function isRetargetingName(name = '') {
  return /retarget/i.test(name)
}

async function createOrFindAudience({ name, retentionSeconds, eventName }) {
  const existing = await getAll(`${ACT}/customaudiences`, {
    fields: 'id,name,approximate_count_lower_bound,approximate_count_upper_bound',
  })
  const found = existing.find((a) => a.name === name)
  if (found) {
    log(`  audience exists: ${name} (${found.id})`)
    return found
  }

  const ruleObj = eventName
    ? {
        inclusions: {
          operator: 'or',
          rules: [
            {
              event_sources: [{ id: PIXEL_ID, type: 'pixel' }],
              retention_seconds: retentionSeconds,
              filter: {
                operator: 'and',
                filters: [{ field: 'event', operator: 'eq', value: eventName }],
              },
            },
          ],
        },
      }
    : {
        inclusions: {
          operator: 'or',
          rules: [
            {
              event_sources: [{ id: PIXEL_ID, type: 'pixel' }],
              retention_seconds: retentionSeconds,
              filter: {
                operator: 'and',
                filters: [{ field: 'url', operator: 'i_contains', value: '' }],
              },
              template: 'ALL_VISITORS',
            },
          ],
        },
      }

  if (dryRun) {
    log(`  [dry-run] would create audience: ${name}`)
    return { id: `dry_${name}`, name }
  }

  // Form-urlencoded is more reliable for audience rules than JSON body.
  const body = new URLSearchParams()
  body.set('name', name)
  body.set('description', `Driving Team retargeting pivot — ${name}`)
  body.set('rule', JSON.stringify(ruleObj))
  body.set('prefill', '1')
  body.set('access_token', TOKEN)
  const res = await fetch(`${GRAPH}/${ACT}/customaudiences`, { method: 'POST', body })
  const created = await res.json()
  if (!res.ok || created.error) {
    throw new Error(`Audience create [${name}]: ${created.error?.message || JSON.stringify(created)}`)
  }
  log(`  created audience: ${name} (${created.id})`)
  return { id: created.id, name }
}

async function pauseProspecting(campaigns) {
  const results = []
  for (const c of campaigns) {
    if (isRetargetingName(c.name)) {
      results.push({ id: c.id, name: c.name, action: 'keep' })
      continue
    }
    if (c.status === 'PAUSED' || c.effective_status === 'PAUSED') {
      results.push({ id: c.id, name: c.name, action: 'already_paused' })
      continue
    }
    if (dryRun) {
      log(`  [dry-run] would pause: ${c.name} (${c.id}) [${c.status}]`)
      results.push({ id: c.id, name: c.name, action: 'would_pause' })
      continue
    }
    await metaPost(c.id, { status: 'PAUSED' })
    log(`  paused: ${c.name} (${c.id})`)
    results.push({ id: c.id, name: c.name, action: 'paused' })
  }
  return results
}

async function ensureRetargetingAdSets({ campaignId, audiences, templateAd }) {
  const adsets = await getAll(`${ACT}/adsets`, {
    fields: 'id,name,status,daily_budget,campaign_id,targeting,optimization_goal,promoted_object',
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaignId }]),
  })

  const plan = [
    {
      key: 'hot7',
      name: 'Retargeting — Hot Visitors 7d Dual',
      budgetShare: 0.45,
      include: audiences.visitors7d.id,
      exclude: [audiences.purchasers180d.id],
    },
    {
      key: 'warm30',
      name: 'Retargeting — Warm Visitors 8–30d Dual',
      budgetShare: 0.30,
      include: audiences.visitors30d.id,
      // Exclude hot 7d so Warm is truly 8–30d overlap-reduced
      exclude: [audiences.purchasers180d.id, audiences.visitors7d.id],
    },
    {
      key: 'checkout14',
      name: 'Retargeting — Checkout Abandoners 14d Dual',
      budgetShare: 0.25,
      include: audiences.checkout14d.id,
      exclude: [audiences.purchasers180d.id],
    },
  ]

  // Pause legacy blob ad sets that aren't in the new plan
  const plannedNames = new Set(plan.map((p) => p.name))
  for (const a of adsets) {
    if (plannedNames.has(a.name)) continue
    if (a.status === 'ACTIVE' || a.effective_status === 'ACTIVE') {
      if (dryRun) {
        log(`  [dry-run] would pause legacy ad set: ${a.name}`)
      } else {
        await metaPost(a.id, { status: 'PAUSED' })
        log(`  paused legacy ad set: ${a.name}`)
      }
    }
  }

  const created = []
  for (const p of plan) {
    const existing = adsets.find((a) => a.name === p.name)
    const dailyBudget = Math.max(100, Math.round(TOTAL_DAILY_BUDGET_CENTS * p.budgetShare))
    const targeting = {
      geo_locations: GEO,
      age_min: 18,
      age_max: 55,
      custom_audiences: [{ id: p.include }],
      excluded_custom_audiences: p.exclude.map((id) => ({ id })),
      ...DEFAULT_PLACEMENTS,
      targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
      targeting_automation: { advantage_audience: 0 },
    }

    const promotedObject = {
      pixel_id: String(PIXEL_ID),
      custom_event_type: 'PURCHASE',
    }
    const attributionSpec = [
      { event_type: 'CLICK_THROUGH', window_days: 7 },
      { event_type: 'VIEW_THROUGH', window_days: 1 },
    ]

    if (existing) {
      if (dryRun) {
        log(`  [dry-run] would update ad set ${existing.name}: budget=${dailyBudget}, ACTIVE`)
      } else {
        await metaPost(existing.id, {
          daily_budget: dailyBudget,
          targeting,
          status: 'ACTIVE',
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          optimization_goal: 'OFFSITE_CONVERSIONS',
          // promoted_object often immutable after create — ignore failure below if needed
          promoted_object: promotedObject,
        })
        log(`  updated ad set: ${existing.name} (CHF ${(dailyBudget / 100).toFixed(2)}/day)`)
      }
      created.push({ ...p, id: existing.id, action: 'updated' })
      continue
    }

    if (dryRun) {
      log(`  [dry-run] would create ad set: ${p.name} (CHF ${(dailyBudget / 100).toFixed(2)}/day)`)
      created.push({ ...p, id: `dry_${p.key}`, action: 'would_create' })
      continue
    }

    const adset = await metaPost(`${ACT}/adsets`, {
      name: p.name,
      campaign_id: campaignId,
      daily_budget: dailyBudget,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting,
      promoted_object: promotedObject,
      attribution_spec: attributionSpec,
      status: 'ACTIVE',
    })
    log(`  created ad set: ${p.name} (${adset.id})`)

    // Clone creative/ad from template if available
    if (templateAd?.creative?.id || templateAd?.creative?.creative_id) {
      const creativeId = templateAd.creative.id || templateAd.creative.creative_id
      const ad = await metaPost(`${ACT}/ads`, {
        name: `DT Ad — ${p.key}`,
        adset_id: adset.id,
        creative: { creative_id: creativeId },
        status: 'ACTIVE',
      })
      log(`  created ad from template creative: ${ad.id}`)
    } else if (templateAd?.id) {
      // Fallback: copy ad fields
      const ad = await metaPost(`${ACT}/ads`, {
        name: `DT Ad — ${p.key}`,
        adset_id: adset.id,
        creative: templateAd.creative,
        status: 'ACTIVE',
      })
      log(`  created ad: ${ad.id}`)
    } else {
      log(`  WARN: no template ad/creative — create creatives in Ads Manager for ${p.name}`)
    }

    created.push({ ...p, id: adset.id, action: 'created' })
  }

  return created
}

async function main() {
  if (!TOKEN || !AD_ACCOUNT || !PIXEL_ID || Number.isNaN(PIXEL_ID)) {
    console.error('Missing META_SYSTEM_USER_TOKEN / META_AD_ACCOUNT_ID / META_PIXEL_ID')
    process.exit(1)
  }

  log(`\nMeta retargeting pivot ${dryRun ? '(DRY RUN)' : '(LIVE)'}`)
  log(`Account: ${ACT}  Pixel: ${PIXEL_ID}  Page: ${PAGE_ID || 'n/a'}\n`)

  const campaigns = await getAll(`${ACT}/campaigns`, {
    fields: 'id,name,status,effective_status,objective,daily_budget',
  })
  log(`Campaigns (${campaigns.length}):`)
  for (const c of campaigns) {
    log(`  - [${c.effective_status || c.status}] ${c.name} (${c.id}) obj=${c.objective}`)
  }

  log('\n1) Pause prospecting campaigns')
  const pauseResults = await pauseProspecting(campaigns)

  let retargeting = campaigns.find((c) => isRetargetingName(c.name))
  if (!retargeting) {
    if (dryRun) {
      log('  [dry-run] no retargeting campaign found — would create DT — Retargeting Closers')
      retargeting = { id: 'dry_retargeting', name: 'DT — Retargeting Closers' }
    } else {
      log('  creating retargeting campaign…')
      const created = await metaPost(`${ACT}/campaigns`, {
        name: 'DT — Retargeting Closers',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        special_ad_categories: [],
        is_adset_budget_sharing_enabled: false,
      })
      retargeting = { id: created.id, name: 'DT — Retargeting Closers' }
      log(`  created campaign: ${retargeting.name} (${retargeting.id})`)
    }
  } else if (!dryRun && retargeting.status !== 'ACTIVE') {
    await metaPost(retargeting.id, { status: 'ACTIVE' })
    log(`  activated retargeting campaign: ${retargeting.name}`)
  }

  log('\n2) Custom audiences')
  const audiences = {
    visitors7d: await createOrFindAudience({
      name: 'DT — Website Visitors 7d',
      retentionSeconds: 7 * 86400,
    }),
    visitors30d: await createOrFindAudience({
      name: 'DT — Website Visitors 30d',
      retentionSeconds: 30 * 86400,
    }),
    checkout14d: await createOrFindAudience({
      name: 'DT — InitiateCheckout 14d',
      retentionSeconds: 14 * 86400,
      eventName: 'InitiateCheckout',
    }),
    purchasers180d: await createOrFindAudience({
      name: 'DT — Purchasers 180d (exclude)',
      retentionSeconds: 180 * 86400,
      eventName: 'Purchase',
    }),
  }

  // Find a template ad under the retargeting campaign (or any active ad with creative)
  log('\n3) Retargeting ad sets')
  let templateAd = null
  const ads = await getAll(`${ACT}/ads`, {
    fields: 'id,name,status,adset_id,creative{id,name}',
  })
  const retargetingAdSets = await getAll(`${ACT}/adsets`, {
    fields: 'id,name,campaign_id',
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: retargeting.id }]),
  })
  const retargetingAdSetIds = new Set(retargetingAdSets.map((a) => a.id))
  templateAd =
    ads.find((a) => retargetingAdSetIds.has(a.adset_id) && a.creative?.id) ||
    ads.find((a) => a.creative?.id && (a.status === 'ACTIVE' || a.effective_status === 'ACTIVE')) ||
    ads.find((a) => a.creative?.id) ||
    null
  if (templateAd) {
    log(`  template ad: ${templateAd.name || templateAd.id} creative=${templateAd.creative?.id}`)
  } else {
    log('  WARN: no template creative found')
  }

  const adsetResults = await ensureRetargetingAdSets({
    campaignId: retargeting.id,
    audiences,
    templateAd,
  })

  log('\n=== DONE ===')
  log(JSON.stringify({ dryRun, pauseResults, audiences, adsetResults, retargeting }, null, 2))
  if (dryRun) {
    log('\nRe-run without --dry-run to apply.')
  } else {
    log('\nNext: verify in Ads Manager that creatives exist on new ad sets and Purchase is the optimization event.')
  }
}

main().catch((err) => {
  console.error('\nFAILED:', err.message)
  process.exit(1)
})
