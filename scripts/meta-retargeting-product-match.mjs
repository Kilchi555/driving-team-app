#!/usr/bin/env node
/**
 * Meta Ads: Product-matched retargeting (Auto-first)
 *
 * 1. URL / event custom audiences (auto, moto, lkw, anhaenger, checkout, purchasers)
 * 2. Campaign "DT — Retargeting Closers" with product Ad Sets + matched creatives
 * 3. Pause legacy ALL_VISITORS retargeting ad sets / old retargeting campaign
 * 4. Optional: --reactivate-auto-prospecting (Core ZH + Lachen only; waste stays paused)
 *
 * Usage:
 *   node --env-file=.env.backfill scripts/meta-retargeting-product-match.mjs --dry-run
 *   node --env-file=.env.backfill scripts/meta-retargeting-product-match.mjs
 *   node --env-file=.env.backfill scripts/meta-retargeting-product-match.mjs --reactivate-auto-prospecting
 */

import fs from 'node:fs'
import path from 'node:path'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const env = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let val = m[2]
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    env[m[1]] = val.replace(/\\n$/i, '').replace(/\r?\n$/g, '').trim()
  }
  return env
}

const env = {
  ...loadEnvFile(path.join(process.cwd(), '.env.vercel')),
  ...loadEnvFile(path.join(process.cwd(), '.env.vercel.production')),
  ...loadEnvFile(path.join(process.cwd(), '.env.backfill')),
  ...process.env,
}

const dryRun = process.argv.includes('--dry-run')
const reactivateAuto = process.argv.includes('--reactivate-auto-prospecting')

const TOKEN = env.META_SYSTEM_USER_TOKEN || env.META_ACCESS_TOKEN
const AD_ACCOUNT = String(env.META_AD_ACCOUNT_ID || '').replace(/^act_/, '')
const PIXEL_ID = Number(
  String(env.META_PIXEL_ID || '')
    .trim()
    .replace(/\\n$/i, '')
    .replace(/\r?\n$/g, '')
    .trim(),
)
const PAGE_ID = env.META_PAGE_ID || '1499718320302620'
const ACT = `act_${AD_ACCOUNT}`
const GRAPH = 'https://graph.facebook.com/v19.0'

const CAMPAIGN_CLOSERS_NAME = 'DT — Retargeting Closers'
const LEGACY_RETARGET_NAME = 'DT — Retargeting Website-Besucher'

/** Creatives created on first live run — reuse without listing all adcreatives. */
const KNOWN_CREATIVE_IDS = {
  'DT Creative — Retarget Auto Hot Reminder': '1488066483077259',
  'DT Creative — Retarget Auto Warm Trust': '1420230926826352',
  'DT Creative — Retarget Auto Checkout FOMO': '1057149720336976',
  'DT Creative — Retarget Moto GK': '1519660916139671',
  'DT Creative — Retarget Moto FS': '1519805806116514', // DC asset_feed (not link_data)
  'DT Creative — Retarget Moto FS DC': '1519805806116514',
  'DT Creative — Retarget LKW': '2228721771252386',
  'DT Creative — Retarget Anhänger': '1014075441236913',
}

/** Known template creatives (clone + rewrite LP/UTM). */
const TEMPLATE_CREATIVES = {
  auto_core: '865636853014012', // DT Ad — Auto Core Zürich (micro creatives)
  moto_gk: '1022072303743644',
  moto_fs: '1693580391723831',
  lkw: '1493341832116516', // DT Ad lkw
  anhaenger: '975976168572085',
}

const PROSPECTING = {
  campaignZh: { id: '52577807288671', name: 'DT — B Automatik Zürich', dailyBudget: null },
  campaignLachen: { id: '52609910935671', name: 'DT — B Automatik Lachen', dailyBudget: null },
  coreZh: { id: '52612269006271', name: 'Auto — Core Zürich 18-30 Radius 20km', dailyBudget: 4500 },
  lachen: { id: '52609910939071', name: 'Auto — Broad 18-30 Lachen', dailyBudget: 1800 },
  /** Keep paused (waste / fragments learning). */
  keepPaused: [
    '52612269019271', // Lookalike 1% Zürich
    '52577810066671', // Broad Altstetten
    '52577810040071', // Lookalike Altstetten
    '52579879422071',
    '52579875016671',
    '52579873181271',
    '52579871693071',
    '52579869760671',
    '52579867632471',
    '52579866384271',
    '52579865974871', // Altstetten geo micro
  ],
}

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

const IMAGE_HASHES_AUTO = [
  'dde525bcdfdd82777423793b60f714eb',
  'c6afc4f2fe41c5dc4eb1b808a9bebad1',
  'c141ea250d1af1ead3bbd3537dc97969',
  'f0aa47cf2e4a90da90164d4eccfcf6dc',
  'b3c823aabff9fb7768216668b228498f',
  '0babf0db3f8c10a836e13827b4720d3b',
  '33341b696ff1bab4f1b627f033608aaf',
  'd1429971d86dff490bacacf3184131fe',
  '0a80e4bfaa8d17c353c4e8e8f24005b7',
  'b39e90a931d04af74f4836643e7dcaad',
]

const LANDINGS = {
  auto: 'https://drivingteam.ch/auto-fahrschule-zuerich/?utm_source=facebook&utm_medium=paid_social&utm_campaign=retarget_auto',
  moto_gk:
    'https://drivingteam.ch/motorrad-grundkurs-zuerich/?utm_source=facebook&utm_medium=paid_social&utm_campaign=retarget_moto_gk',
  moto_fs:
    'https://drivingteam.ch/motorrad-fahrschule-zuerich/?utm_source=facebook&utm_medium=paid_social&utm_campaign=retarget_moto_fs',
  lkw: 'https://drivingteam.ch/lastwagen-fahrschule-lachen/?utm_source=facebook&utm_medium=paid_social&utm_campaign=retarget_lkw',
  be: 'https://drivingteam.ch/anhaenger-fahrschule-zuerich/?utm_source=facebook&utm_medium=paid_social&utm_campaign=retarget_be',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function log(...args) {
  console.log(...args)
}

async function metaGet(apiPath, params = {}) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const url = new URL(`${GRAPH}/${apiPath}`)
    url.searchParams.set('access_token', TOKEN)
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
    }
    const res = await fetch(url)
    const data = await res.json()
    if (data.error?.code === 17 || /request limit/i.test(data.error?.message || '')) {
      const wait = 60000 + attempt * 15000
      log(`  rate limit — waiting ${Math.round(wait / 1000)}s...`)
      await sleep(wait)
      continue
    }
    if (data.error) throw new Error(`GET ${apiPath}: ${data.error.message}`)
    return data
  }
  throw new Error(`GET ${apiPath}: rate limited out`)
}

async function metaPost(apiPath, body = {}) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`${GRAPH}/${apiPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: TOKEN }),
    })
    const data = await res.json()
    if (data.error?.code === 17 || /request limit/i.test(data.error?.message || '')) {
      const wait = 60000 + attempt * 15000
      log(`  rate limit — waiting ${Math.round(wait / 1000)}s...`)
      await sleep(wait)
      continue
    }
    if (!res.ok || data.error) {
      const detail =
        data.error?.error_user_msg ||
        data.error?.error_user_title ||
        data.error?.message ||
        JSON.stringify(data)
      throw new Error(`POST ${apiPath}: ${detail}`)
    }
    return data
  }
  throw new Error(`POST ${apiPath}: rate limited out`)
}

async function getAll(apiPath, params = {}) {
  const out = []
  let after
  do {
    const page = await metaGet(apiPath, { ...params, limit: 100, ...(after ? { after } : {}) })
    out.push(...(page.data || []))
    after = page.paging?.cursors?.after
    if (!page.paging?.next) break
  } while (after)
  return out
}

async function createOrFindAudience({ name, retentionSeconds, eventName, urlContains }) {
  const existing = await getAll(`${ACT}/customaudiences`, {
    fields: 'id,name,approximate_count_lower_bound,approximate_count_upper_bound',
  })
  const found = existing.find((a) => a.name === name)
  if (found) {
    log(`  audience exists: ${name} (${found.id}) size≈${found.approximate_count_lower_bound}`)
    return found
  }

  let ruleObj
  if (eventName) {
    ruleObj = {
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
  } else if (urlContains) {
    ruleObj = {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ id: PIXEL_ID, type: 'pixel' }],
            retention_seconds: retentionSeconds,
            filter: {
              operator: 'and',
              filters: [{ field: 'url', operator: 'i_contains', value: urlContains }],
            },
          },
        ],
      },
    }
  } else {
    throw new Error(`Audience ${name}: need eventName or urlContains`)
  }

  if (dryRun) {
    log(`  [dry-run] would create audience: ${name}`)
    return { id: `dry_${name.replace(/\s+/g, '_')}`, name }
  }

  const body = new URLSearchParams()
  body.set('name', name)
  body.set('description', `DT product-match retargeting — ${name}`)
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

function slimAssetFeed(feed, websiteUrl, { titles, bodies, descriptions, ctaTypes } = {}) {
  return {
    images: (feed.images || []).map((i) => ({ hash: i.hash })),
    bodies: bodies || feed.bodies || [],
    titles: titles || feed.titles || [],
    descriptions: descriptions || feed.descriptions || [{ text: '' }],
    call_to_action_types: ctaTypes || feed.call_to_action_types || ['LEARN_MORE'],
    link_urls: [{ website_url: websiteUrl, display_url: 'drivingteam.ch' }],
    ad_formats: feed.ad_formats || ['AUTOMATIC_FORMAT'],
    optimization_type: feed.optimization_type || 'REGULAR',
  }
}

async function cloneCreativeWithUrl(sourceCreativeId, name, websiteUrl, copyOverrides = {}) {
  const src = await metaGet(sourceCreativeId, {
    fields: 'id,name,object_story_spec,asset_feed_spec,degrees_of_freedom_spec',
  })
  const pageId = src.object_story_spec?.page_id || PAGE_ID

  if (!src.asset_feed_spec?.images?.length && copyOverrides.images) {
    // Fall through to build from hashes below
  }

  if (src.asset_feed_spec?.images?.length) {
    const assetFeed = slimAssetFeed(src.asset_feed_spec, websiteUrl, copyOverrides)
    const dof = src.degrees_of_freedom_spec
      ? { creative_features_spec: src.degrees_of_freedom_spec.creative_features_spec }
      : undefined
    return metaPost(`${ACT}/adcreatives`, {
      name,
      object_story_spec: { page_id: pageId },
      asset_feed_spec: JSON.stringify(assetFeed),
      ...(dof ? { degrees_of_freedom_spec: JSON.stringify(dof) } : {}),
    })
  }

  // object_story_spec link_data style
  const oss = src.object_story_spec || {}
  if (oss.link_data) {
    const linkData = {
      ...oss.link_data,
      link: websiteUrl,
      ...(copyOverrides.singleTitle ? { name: copyOverrides.singleTitle } : {}),
      ...(copyOverrides.singleBody ? { message: copyOverrides.singleBody } : {}),
      call_to_action: {
        type: copyOverrides.cta || oss.link_data.call_to_action?.type || 'LEARN_MORE',
        value: { link: websiteUrl },
      },
    }
    return metaPost(`${ACT}/adcreatives`, {
      name,
      object_story_spec: { page_id: pageId, link_data: linkData },
    })
  }

  throw new Error(`Cannot clone creative ${sourceCreativeId}: no asset_feed_spec.images or link_data`)
}

async function createAutoDynamicCreative(name, websiteUrl, { titles, bodies, descriptions }) {
  const assetFeed = {
    images: IMAGE_HASHES_AUTO.map((hash) => ({ hash })),
    bodies: bodies.map((text) => ({ text })),
    titles: titles.map((text) => ({ text })),
    descriptions: descriptions.map((text) => ({ text })),
    call_to_action_types: ['LEARN_MORE'],
    link_urls: [{ website_url: websiteUrl, display_url: 'drivingteam.ch' }],
    ad_formats: ['AUTOMATIC_FORMAT'],
    optimization_type: 'REGULAR',
  }
  return metaPost(`${ACT}/adcreatives`, {
    name,
    object_story_spec: { page_id: PAGE_ID },
    asset_feed_spec: JSON.stringify(assetFeed),
  })
}

async function ensureCampaignClosers(campaigns) {
  let closers = campaigns.find((c) => c.name === CAMPAIGN_CLOSERS_NAME)
  if (closers) {
    log(`  campaign exists: ${closers.name} (${closers.id}) [${closers.effective_status || closers.status}]`)
    if (!dryRun && closers.status !== 'ACTIVE') {
      await metaPost(closers.id, { status: 'ACTIVE' })
      log(`  activated ${closers.name}`)
    }
    return closers
  }

  if (dryRun) {
    log(`  [dry-run] would create campaign: ${CAMPAIGN_CLOSERS_NAME}`)
    return { id: 'dry_closers', name: CAMPAIGN_CLOSERS_NAME }
  }

  const created = await metaPost(`${ACT}/campaigns`, {
    name: CAMPAIGN_CLOSERS_NAME,
    objective: 'OUTCOME_SALES',
    status: 'ACTIVE',
    special_ad_categories: [],
    is_adset_budget_sharing_enabled: false,
  })
  log(`  created campaign: ${CAMPAIGN_CLOSERS_NAME} (${created.id})`)
  return { id: created.id, name: CAMPAIGN_CLOSERS_NAME }
}

async function pauseLegacyRetargeting(campaigns) {
  const legacy = campaigns.find((c) => c.name === LEGACY_RETARGET_NAME)
  if (!legacy) {
    log('  no legacy retargeting campaign found')
    return
  }

  const adsets = await getAll(`${ACT}/adsets`, {
    fields: 'id,name,status,effective_status',
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: legacy.id }]),
  })

  for (const a of adsets) {
    if (a.status === 'PAUSED') {
      log(`  already paused: ${a.name}`)
      continue
    }
    if (dryRun) {
      log(`  [dry-run] would pause legacy ad set: ${a.name}`)
    } else {
      await metaPost(a.id, { status: 'PAUSED' })
      log(`  paused legacy ad set: ${a.name}`)
      await sleep(200)
    }
  }

  if (legacy.status === 'ACTIVE' || legacy.effective_status === 'ACTIVE') {
    if (dryRun) {
      log(`  [dry-run] would pause campaign: ${legacy.name}`)
    } else {
      await metaPost(legacy.id, { status: 'PAUSED' })
      log(`  paused campaign: ${legacy.name}`)
    }
  }
}

async function ensureAdSetAndAd({ campaignId, plan, audiences, creativeId }) {
  const adsets = await getAll(`${ACT}/adsets`, {
    fields: 'id,name,status,daily_budget,is_dynamic_creative',
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaignId }]),
  })
  // Exact name only (ignore "… (legacy non-DC)")
  const named = adsets.filter((a) => a.name === plan.name)
  named.sort((a, b) => {
    const score = (x) => (x.status === 'ACTIVE' ? 4 : 0) + (x.is_dynamic_creative ? 2 : 0)
    return score(b) - score(a)
  })
  let existing = named[0]

  const includeIds = plan.includeKeys.map((k) => audiences[k].id)
  const excludeIds = plan.excludeKeys.map((k) => audiences[k].id)

  const targeting = {
    geo_locations: GEO,
    age_min: 18,
    age_max: 55,
    custom_audiences: includeIds.map((id) => ({ id })),
    excluded_custom_audiences: excludeIds.map((id) => ({ id })),
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

  let adsetId = existing?.id

  // Pause duplicate ACTIVE ad sets with same name (keep best one).
  if (!dryRun) {
    for (const dup of named.slice(1)) {
      if (dup.status === 'ACTIVE') {
        await metaPost(dup.id, { status: 'PAUSED', name: `${plan.name} (duplicate)` })
        log(`  paused duplicate ad set: ${dup.id}`)
        await sleep(400)
      }
    }
  }

  if (existing && existing.is_dynamic_creative === false) {
    log(`  existing ad set ${plan.name} lacks is_dynamic_creative — will recreate`)
    if (!dryRun) {
      await metaPost(existing.id, { status: 'PAUSED', name: `${plan.name} (legacy non-DC)` })
      log(`  paused legacy non-DC: ${existing.id}`)
    }
    existing = null
    adsetId = undefined
  }

  if (existing) {
    if (dryRun) {
      log(`  [dry-run] would ensure ad set ${plan.name}: CHF ${(plan.dailyBudget / 100).toFixed(2)}/day ACTIVE`)
    } else {
      // Budget + status only — avoid heavy retargeting updates that thrash learning.
      await metaPost(existing.id, {
        daily_budget: plan.dailyBudget,
        status: 'ACTIVE',
      })
      log(`  ensured ad set: ${plan.name} (${existing.id}) CHF ${(plan.dailyBudget / 100).toFixed(2)}/day`)
    }
  } else if (dryRun) {
    log(`  [dry-run] would create ad set: ${plan.name} CHF ${(plan.dailyBudget / 100).toFixed(2)}/day`)
    adsetId = `dry_${plan.key}`
  } else {
    const adset = await metaPost(`${ACT}/adsets`, {
      name: plan.name,
      campaign_id: campaignId,
      daily_budget: plan.dailyBudget,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting,
      promoted_object: promotedObject,
      attribution_spec: attributionSpec,
      is_dynamic_creative: true,
      status: 'ACTIVE',
    })
    adsetId = adset.id
    log(`  created ad set: ${plan.name} (${adsetId}) [dynamic creative]`)
    await sleep(800)
  }

  if (!creativeId || String(creativeId).startsWith('dry_')) {
    log(`  WARN: no creative for ${plan.name}`)
    return { adsetId, adId: null }
  }

  const adName = `DT Ad — ${plan.key}`

  if (dryRun) {
    log(`  [dry-run] would create/update ad: ${adName}`)
    return { adsetId, adId: `dry_${plan.key}_ad` }
  }

  // DC ad sets allow exactly one ad — list first, then create or update.
  const adsOnSet = await getAll(`${ACT}/ads`, {
    fields: 'id,name,status',
    filtering: JSON.stringify([{ field: 'adset.id', operator: 'EQUAL', value: adsetId }]),
  })
  await sleep(500)

  const existingAd = adsOnSet.find((a) => a.name === adName) || adsOnSet[0]
  if (existingAd) {
    await metaPost(existingAd.id, {
      name: adName,
      creative: { creative_id: creativeId },
      status: 'ACTIVE',
    })
    log(`  ensured ad: ${adName} (${existingAd.id}) → creative ${creativeId}`)
    // Pause extra ads on this DC ad set
    for (const extra of adsOnSet) {
      if (extra.id !== existingAd.id && extra.status === 'ACTIVE') {
        await metaPost(extra.id, { status: 'PAUSED' })
        log(`  paused extra ad on DC ad set: ${extra.id}`)
      }
    }
    return { adsetId, adId: existingAd.id }
  }

  const ad = await metaPost(`${ACT}/ads`, {
    name: adName,
    adset_id: adsetId,
    creative: { creative_id: creativeId },
    status: 'ACTIVE',
  })
  log(`  created ad: ${adName} (${ad.id})`)
  return { adsetId, adId: ad.id }
}

async function reactivateAutoProspecting() {
  log('\n4) Reactivate Auto prospecting (Core ZH + Lachen)')

  if (dryRun) {
    log(`  [dry-run] would ACTIVE campaign ${PROSPECTING.campaignZh.name}`)
    log(`  [dry-run] would ACTIVE campaign ${PROSPECTING.campaignLachen.name}`)
    log(`  [dry-run] would ACTIVE ${PROSPECTING.coreZh.name} @ CHF ${(PROSPECTING.coreZh.dailyBudget / 100).toFixed(0)}/day`)
    log(`  [dry-run] would ACTIVE ${PROSPECTING.lachen.name} @ CHF ${(PROSPECTING.lachen.dailyBudget / 100).toFixed(0)}/day`)
    for (const id of PROSPECTING.keepPaused) {
      log(`  [dry-run] would keep PAUSED ad set ${id}`)
    }
    return
  }

  await metaPost(PROSPECTING.campaignZh.id, { status: 'ACTIVE' })
  log(`  activated ${PROSPECTING.campaignZh.name}`)
  await metaPost(PROSPECTING.campaignLachen.id, { status: 'ACTIVE' })
  log(`  activated ${PROSPECTING.campaignLachen.name}`)

  await metaPost(PROSPECTING.coreZh.id, {
    status: 'ACTIVE',
    daily_budget: PROSPECTING.coreZh.dailyBudget,
  })
  log(`  activated ${PROSPECTING.coreZh.name} CHF ${(PROSPECTING.coreZh.dailyBudget / 100).toFixed(0)}/day`)

  await metaPost(PROSPECTING.lachen.id, {
    status: 'ACTIVE',
    daily_budget: PROSPECTING.lachen.dailyBudget,
  })
  log(`  activated ${PROSPECTING.lachen.name} CHF ${(PROSPECTING.lachen.dailyBudget / 100).toFixed(0)}/day`)

  for (const id of PROSPECTING.keepPaused) {
    try {
      await metaPost(id, { status: 'PAUSED' })
      log(`  kept paused: ${id}`)
      await sleep(150)
    } catch (err) {
      log(`  warn pause ${id}: ${err.message}`)
    }
  }
}

async function main() {
  if (!TOKEN || !AD_ACCOUNT || !PIXEL_ID || Number.isNaN(PIXEL_ID)) {
    console.error('Missing META_SYSTEM_USER_TOKEN / META_AD_ACCOUNT_ID / META_PIXEL_ID')
    process.exit(1)
  }

  log(`\nMeta product-match retargeting ${dryRun ? '(DRY RUN)' : '(LIVE)'}`)
  log(`Account: ${ACT}  Pixel: ${PIXEL_ID}  Page: ${PAGE_ID}`)
  log(`Flags: reactivate-auto-prospecting=${reactivateAuto}\n`)

  const campaigns = await getAll(`${ACT}/campaigns`, {
    fields: 'id,name,status,effective_status,objective',
  })

  log('1) Custom audiences (URL + events)')
  const audiences = {
    auto7d: await createOrFindAudience({
      name: 'DT — Auto Visitors 7d',
      retentionSeconds: 7 * 86400,
      urlContains: 'auto-fahrschule',
    }),
    auto30d: await createOrFindAudience({
      name: 'DT — Auto Visitors 30d',
      retentionSeconds: 30 * 86400,
      urlContains: 'auto-fahrschule',
    }),
    motoGk14d: await createOrFindAudience({
      name: 'DT — Moto GK Visitors 14d',
      retentionSeconds: 14 * 86400,
      urlContains: 'motorrad-grundkurs',
    }),
    motoFs14d: await createOrFindAudience({
      name: 'DT — Moto FS Visitors 14d',
      retentionSeconds: 14 * 86400,
      urlContains: 'motorrad-fahrschule',
    }),
    lkw14d: await createOrFindAudience({
      name: 'DT — LKW Visitors 14d',
      retentionSeconds: 14 * 86400,
      urlContains: 'lastwagen',
    }),
    be14d: await createOrFindAudience({
      name: 'DT — Anhänger Visitors 14d',
      retentionSeconds: 14 * 86400,
      urlContains: 'anhaenger',
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

  log('\n2) Creatives (product-matched)')
  const creatives = {}

  /** Cache creatives once to avoid hammering the API. */
  let creativeCache = null
  async function findCreativeByPrefix(prefix) {
    if (!creativeCache) {
      creativeCache = await getAll(`${ACT}/adcreatives`, { fields: 'id,name,status' })
      await sleep(800)
    }
    const hits = creativeCache.filter((c) => c.name?.startsWith(prefix) && c.status !== 'DELETED')
    hits.sort((a, b) => String(b.id).localeCompare(String(a.id)))
    return hits[0] || null
  }

  async function ensureCreative(prefix, createFn) {
    if (KNOWN_CREATIVE_IDS[prefix]) {
      log(`  reuse creative: ${prefix} (${KNOWN_CREATIVE_IDS[prefix]})`)
      return { id: KNOWN_CREATIVE_IDS[prefix], name: prefix }
    }
    const found = await findCreativeByPrefix(prefix)
    if (found) {
      log(`  reuse creative: ${found.name} (${found.id})`)
      return found
    }
    const created = await createFn()
    creativeCache = null // invalidate
    log(`  created ${created.id} ${prefix}`)
    await sleep(800)
    return created
  }

  if (dryRun) {
    log('  [dry-run] would create Auto Reminder / Trust / Checkout creatives')
    log('  [dry-run] would clone Moto GK / Moto FS / LKW / Anhänger creatives with retarget UTMs')
    creatives.autoHot = { id: 'dry_auto_hot' }
    creatives.autoWarm = { id: 'dry_auto_warm' }
    creatives.autoCheckout = { id: 'dry_auto_checkout' }
    creatives.motoGk = { id: 'dry_moto_gk' }
    creatives.motoFs = { id: 'dry_moto_fs' }
    creatives.lkw = { id: 'dry_lkw' }
    creatives.be = { id: 'dry_be' }
  } else {
    creatives.autoHot = await ensureCreative('DT Creative — Retarget Auto Hot Reminder', () =>
      createAutoDynamicCreative('DT Creative — Retarget Auto Hot Reminder', LANDINGS.auto, {
        titles: [
          'Noch keinen Termin gebucht? Jetzt sichern.',
          'Fahrschule Zürich — online buchen',
          'Letzte freie Termine — Driving Team',
        ],
        bodies: [
          'Du warst auf unserer Auto-Seite. Sichere dir jetzt deine Fahrstunde — Kat. B Automatik & Schaltung, ab CHF 95, online bestätigt.',
          'Fahrschule Driving Team Zürich & Umgebung. Flexible Termine, 4.9 Sterne — jetzt Termin buchen.',
        ],
        descriptions: ['Online buchen — sofort bestätigt', 'Kat. B Automatik & Schaltung'],
      }),
    )
    await sleep(300)

    creatives.autoWarm = await ensureCreative('DT Creative — Retarget Auto Warm Trust', () =>
      createAutoDynamicCreative('DT Creative — Retarget Auto Warm Trust', LANDINGS.auto, {
        titles: [
          'Deine Fahrschule in Zürich wartet.',
          '4.9 Sterne — Driving Team Zürich',
          'Kat. B nah bei dir — jetzt buchen',
        ],
        bodies: [
          'Über 15 Jahre Erfahrung. Zertifizierte Fahrlehrer. Faire Preise. Online buchen, sofort bestätigt — Driving Team Zürich & Lachen.',
          'Automatik oder Schaltung, abends & samstags. Dein Führerschein mit Driving Team.',
        ],
        descriptions: ['4.9 Sterne auf Google', 'Flexible Termine'],
      }),
    )
    await sleep(300)

    creatives.autoCheckout = await ensureCreative('DT Creative — Retarget Auto Checkout FOMO', () =>
      createAutoDynamicCreative('DT Creative — Retarget Auto Checkout FOMO', LANDINGS.auto, {
        titles: [
          'Deine Buchung wartet — jetzt abschliessen',
          'Noch einen Klick bis zum Termin',
          'Platz sichern — Buchung fortsetzen',
        ],
        bodies: [
          'Du hast den Checkout gestartet. Schliess jetzt ab und sichere dir deinen Fahrstunden-Termin bei Driving Team.',
          'Nur noch einen Schritt: Online buchen, sofort bestätigt — Fahrschule Zürich & Lachen.',
        ],
        descriptions: ['Buchung fortsetzen', 'Sofort bestätigt'],
      }),
    )
    await sleep(300)

    creatives.motoGk = await ensureCreative('DT Creative — Retarget Moto GK', () =>
      cloneCreativeWithUrl(TEMPLATE_CREATIVES.moto_gk, 'DT Creative — Retarget Moto GK', LANDINGS.moto_gk),
    )
    await sleep(250)

    creatives.motoFs = await ensureCreative('DT Creative — Retarget Moto FS DC', async () => {
      // Prefer DC-compatible asset_feed; fall back to converting link_data clone.
      try {
        return await cloneCreativeWithUrl(
          TEMPLATE_CREATIVES.moto_fs,
          'DT Creative — Retarget Moto FS DC',
          LANDINGS.moto_fs,
        )
      } catch {
        const src = await metaGet(TEMPLATE_CREATIVES.moto_fs, {
          fields: 'object_story_spec',
        })
        const ld = src.object_story_spec?.link_data
        if (!ld?.image_hash) throw new Error('Moto FS template has no image_hash')
        return createAutoDynamicCreative('DT Creative — Retarget Moto FS DC', LANDINGS.moto_fs, {
          titles: [ld.name || 'Motorrad Fahrstunden Zürich'],
          bodies: [ld.message || 'Motorrad Fahrstunden Zürich — Driving Team. Online buchen.'],
          descriptions: [ld.description || 'Online buchen'],
        }).catch(async () => {
          // createAutoDynamicCreative uses Auto image hashes — build single-image feed instead
          return metaPost(`${ACT}/adcreatives`, {
            name: 'DT Creative — Retarget Moto FS DC',
            object_story_spec: { page_id: PAGE_ID },
            asset_feed_spec: JSON.stringify({
              images: [{ hash: ld.image_hash }],
              bodies: [{ text: ld.message || 'Motorrad Fahrstunden Zürich — Driving Team.' }],
              titles: [{ text: ld.name || 'Motorrad Fahrstunden Zürich' }],
              descriptions: [{ text: ld.description || 'Online buchen' }],
              call_to_action_types: ['LEARN_MORE'],
              link_urls: [{ website_url: LANDINGS.moto_fs, display_url: 'drivingteam.ch' }],
              ad_formats: ['AUTOMATIC_FORMAT'],
              optimization_type: 'REGULAR',
            }),
          })
        })
      }
    })
    // Also accept the non-DC prefix via known map
    if (!KNOWN_CREATIVE_IDS['DT Creative — Retarget Moto FS']) {
      KNOWN_CREATIVE_IDS['DT Creative — Retarget Moto FS'] = creatives.motoFs.id
    }

    creatives.lkw = await ensureCreative('DT Creative — Retarget LKW', () =>
      cloneCreativeWithUrl(TEMPLATE_CREATIVES.lkw, 'DT Creative — Retarget LKW', LANDINGS.lkw),
    )
    await sleep(250)

    creatives.be = await ensureCreative('DT Creative — Retarget Anhänger', () =>
      cloneCreativeWithUrl(TEMPLATE_CREATIVES.anhaenger, 'DT Creative — Retarget Anhänger', LANDINGS.be),
    )
  }

  log('\n3) Campaign + product Ad Sets')
  const closers = await ensureCampaignClosers(campaigns)

  const adSetPlans = [
    {
      key: 'auto_hot7',
      name: 'Retarget — Auto Hot 7d',
      dailyBudget: 1200,
      includeKeys: ['auto7d'],
      excludeKeys: ['purchasers180d'],
      creative: creatives.autoHot,
    },
    {
      key: 'auto_warm30',
      name: 'Retarget — Auto Warm 8–30d',
      dailyBudget: 800,
      includeKeys: ['auto30d'],
      excludeKeys: ['auto7d', 'purchasers180d'],
      creative: creatives.autoWarm,
    },
    {
      key: 'auto_checkout14',
      name: 'Retarget — Auto Checkout 14d',
      dailyBudget: 800,
      includeKeys: ['checkout14d'],
      excludeKeys: ['purchasers180d'],
      creative: creatives.autoCheckout,
    },
    {
      key: 'moto_gk14',
      name: 'Retarget — Moto GK 14d',
      dailyBudget: 300,
      includeKeys: ['motoGk14d'],
      excludeKeys: ['purchasers180d'],
      creative: creatives.motoGk,
    },
    {
      key: 'moto_fs14',
      name: 'Retarget — Moto FS 14d',
      dailyBudget: 300,
      includeKeys: ['motoFs14d'],
      excludeKeys: ['purchasers180d'],
      creative: creatives.motoFs,
    },
    {
      key: 'lkw14',
      name: 'Retarget — LKW 14d',
      dailyBudget: 300,
      includeKeys: ['lkw14d'],
      excludeKeys: ['purchasers180d'],
      creative: creatives.lkw,
    },
    {
      key: 'be14',
      name: 'Retarget — Anhänger 14d',
      dailyBudget: 300,
      includeKeys: ['be14d'],
      excludeKeys: ['purchasers180d'],
      creative: creatives.be,
    },
  ]

  const adsetResults = []
  for (const plan of adSetPlans) {
    const result = await ensureAdSetAndAd({
      campaignId: closers.id,
      plan,
      audiences,
      creativeId: plan.creative?.id,
    })
    adsetResults.push({ ...plan, ...result })
    await sleep(2500)
  }

  log('\n3b) Pause legacy ALL_VISITORS retargeting')
  await pauseLegacyRetargeting(campaigns)

  if (reactivateAuto) {
    await reactivateAutoProspecting()
  } else {
    log('\n4) Auto prospecting: skipped (pass --reactivate-auto-prospecting)')
  }

  log('\n=== DONE ===')
  log(
    JSON.stringify(
      {
        dryRun,
        reactivateAuto,
        closers,
        audiences: Object.fromEntries(Object.entries(audiences).map(([k, v]) => [k, v.id])),
        creatives: Object.fromEntries(Object.entries(creatives).map(([k, v]) => [k, v.id])),
        adsets: adsetResults.map((r) => ({
          key: r.key,
          name: r.name,
          adsetId: r.adsetId,
          adId: r.adId,
          budgetChf: r.dailyBudget / 100,
        })),
      },
      null,
      2,
    ),
  )

  if (dryRun) {
    log('\nRe-run without --dry-run to apply.')
    log('Add --reactivate-auto-prospecting to turn Core ZH + Lachen back on.')
  } else {
    log('\nNext: Ads Manager spot-check — each Ad Set creative matches product LP/UTM.')
    log('Auto Hot/Warm/Checkout → retarget_auto; Moto/LKW/BE → own retarget_* campaigns.')
  }
}

main().catch((err) => {
  console.error('\nFAILED:', err.message)
  process.exit(1)
})
