/**
 * Pause Auto Lachen, keep LKW, move Auto daily budget to Zürich-West / Limmattal.
 * Does not change Lastwagen Fahrschule Lachen.
 */

import { logger } from '../../utils/logger'

export const GADS_VERSION = 'v23'
export const LACHEN_AUTO_ID = '23865472770'
export const ZH_ALTSTETTEN_ID = '24103567599'
export const ZH_UMGEBUNG_ID = '23868553846'
export const LKW_LACHEN_ID = '23898300631'

const BASE = 'https://drivingteam.ch'

export const ZH_WEST_LOCATIONS: Array<{
  name: string
  geoNames: string[]
  keywords: string[]
  landing: string
}> = [
  { name: 'Fahrschule Enge', geoNames: ['Zürich'], keywords: ['fahrschule enge', 'fahrstunden enge', 'fahrschule zürich enge', 'fahrschule bahnhof enge'], landing: `${BASE}/auto-fahrschule-zuerich/` },
  { name: 'Fahrschule Albisgütli', geoNames: ['Zürich'], keywords: ['fahrschule albisgütli', 'fahrschule albisguetli', 'fahrprüfung albisgütli'], landing: `${BASE}/auto-fahrschule-zuerich/` },
  { name: 'Fahrschule Wiedikon', geoNames: ['Zürich'], keywords: ['fahrschule wiedikon', 'fahrstunden wiedikon', 'fahrschule zürich wiedikon'], landing: `${BASE}/auto-fahrschule-zuerich/` },
  { name: 'Fahrschule Albisrieden', geoNames: ['Zürich'], keywords: ['fahrschule albisrieden', 'fahrstunden albisrieden'], landing: `${BASE}/auto-fahrschule-zuerich/` },
  { name: 'Fahrschule Altstetten', geoNames: ['Zürich'], keywords: ['fahrschule altstetten', 'fahrschule zürich altstetten', 'fahrstunden altstetten'], landing: `${BASE}/auto-fahrschule-zuerich/` },
  { name: 'Fahrschule Uitikon', geoNames: ['Uitikon'], keywords: ['fahrschule uitikon', 'fahrschule uitikon waldegg'], landing: `${BASE}/fahrschule-uitikon/` },
  { name: 'Fahrschule Schlieren', geoNames: ['Schlieren'], keywords: ['fahrschule schlieren', 'fahrstunden schlieren', 'fahrlehrer schlieren'], landing: `${BASE}/fahrschule-schlieren/` },
  { name: 'Fahrschule Birmensdorf', geoNames: ['Birmensdorf'], keywords: ['fahrschule birmensdorf', 'fahrstunden birmensdorf'], landing: `${BASE}/fahrschule-birmensdorf/` },
  { name: 'Fahrschule Urdorf', geoNames: ['Urdorf'], keywords: ['fahrschule urdorf', 'fahrstunden urdorf'], landing: `${BASE}/fahrschule-urdorf/` },
  { name: 'Fahrschule Dietikon', geoNames: ['Dietikon'], keywords: ['fahrschule dietikon', 'fahrstunden dietikon'], landing: `${BASE}/fahrschule-dietikon/` },
  { name: 'Fahrschule Spreitenbach', geoNames: ['Spreitenbach'], keywords: ['fahrschule spreitenbach', 'fahrstunden spreitenbach'], landing: `${BASE}/fahrschule-spreitenbach/` },
  { name: 'Fahrschule Wettingen', geoNames: ['Wettingen'], keywords: ['fahrschule wettingen', 'fahrstunden wettingen'], landing: `${BASE}/fahrschule-spreitenbach/` },
]

const EXTRA_GEO_NAMES = ['Schlieren', 'Dietikon', 'Urdorf', 'Birmensdorf', 'Uitikon', 'Spreitenbach', 'Wettingen']

const NEGATIVES = [
  'lachen', 'pfäffikon', 'pfaeffikon', 'siebnen', 'schwyz', 'kriens', 'luzern',
  'regensdorf', 'koch fahrschule', 'motorrad', 'lastwagen', 'lkw', 'anhänger', 'vku', 'wab', 'czv',
]

export async function gaql(customerId: string, headers: Record<string, string>, query: string): Promise<any[]> {
  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`,
    { method: 'POST', headers, body: JSON.stringify({ query }) },
  )
  const data = await res.json() as any
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 800))
  const rows: any[] = []
  for (const batch of (Array.isArray(data) ? data : [data])) rows.push(...(batch.results ?? []))
  return rows
}

export async function mutate(
  customerId: string,
  headers: Record<string, string>,
  resource: string,
  operations: object[],
): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/${resource}:mutate`,
    { method: 'POST', headers, body: JSON.stringify({ operations, partialFailure: true }) },
  )
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 500) } }
  return { ok: res.ok && !data?.partialFailureError, data }
}

function statusEnabled(s: any) {
  const v = String(s ?? '')
  return v === 'ENABLED' || v === '2'
}

function microsToChf(m: number) {
  return Math.round((m ?? 0) / 1e4) / 100
}

export async function reallocateAutoZhWest(opts: {
  customerId: string
  headers: Record<string, string>
  dryRun: boolean
}) {
  const { customerId, headers, dryRun } = opts
  const report: Record<string, any> = { dry_run: dryRun }

  const campRows = await gaql(customerId, headers, `
    SELECT campaign.id, campaign.name, campaign.status,
           campaign_budget.resource_name, campaign_budget.amount_micros,
           campaign_budget.explicitly_shared
    FROM campaign
    WHERE campaign.id IN (${LACHEN_AUTO_ID}, ${ZH_ALTSTETTEN_ID}, ${ZH_UMGEBUNG_ID}, ${LKW_LACHEN_ID})
      AND campaign.status != 'REMOVED'
  `)

  const byId = new Map<string, any>()
  for (const r of campRows) byId.set(String(r.campaign?.id), r)

  const lachen = byId.get(LACHEN_AUTO_ID)
  const alt = byId.get(ZH_ALTSTETTEN_ID)
  const umg = byId.get(ZH_UMGEBUNG_ID)
  const lkw = byId.get(LKW_LACHEN_ID)
  if (!lachen || !alt || !umg) {
    return { ok: false, reason: 'missing_campaign', found: [...byId.keys()] }
  }

  const snapshot = (r: any) => ({
    id: String(r.campaign.id),
    name: r.campaign.name,
    status: r.campaign.status,
    daily_chf: microsToChf(r.campaignBudget?.amountMicros ?? 0),
    budget: r.campaignBudget?.resourceName,
    shared: r.campaignBudget?.explicitlyShared ?? false,
  })

  report.before = {
    lachen: snapshot(lachen),
    altstetten: snapshot(alt),
    umgebung: snapshot(umg),
    lkw: lkw ? snapshot(lkw) : null,
  }

  const lachenSpend = statusEnabled(lachen.campaign.status) ? report.before.lachen.daily_chf : 0
  const umgIfEnabled = statusEnabled(umg.campaign.status) ? report.before.umgebung.daily_chf : 0
  const umgShare = Math.round((lachenSpend + umgIfEnabled) * 100) / 100
  const altShare = report.before.altstetten.daily_chf
  report.budget_plan = {
    lachen_moved_chf: lachenSpend,
    altstetten_unchanged_chf: altShare,
    umgebung_to_chf: umgShare,
    lachen_status: 'PAUSED',
    lkw_untouched: true,
  }

  const geoRows = await gaql(customerId, headers, `
    SELECT geo_target_constant.id, geo_target_constant.name, geo_target_constant.canonical_name
    FROM geo_target_constant
    WHERE geo_target_constant.country_code = 'CH'
      AND geo_target_constant.name IN (${EXTRA_GEO_NAMES.map(n => `'${n.replace(/'/g, "\\'")}'`).join(', ')})
  `)
  const geoByName = new Map<string, string>()
  for (const r of geoRows) {
    const name = String(r.geoTargetConstant?.name ?? '')
    const id = String(r.geoTargetConstant?.id ?? '')
    const canonical = String(r.geoTargetConstant?.canonicalName ?? '')
    if (!id) continue
    if (!geoByName.has(name) || canonical.includes('Switzerland')) {
      geoByName.set(name, id)
    }
  }
  report.geo_resolved = Object.fromEntries(geoByName)

  const existingLocRows = await gaql(customerId, headers, `
    SELECT campaign.id, campaign_criterion.resource_name, campaign_criterion.location.geo_target_constant
    FROM campaign_criterion
    WHERE campaign.id = ${ZH_UMGEBUNG_ID}
      AND campaign_criterion.type = 'LOCATION'
      AND campaign_criterion.negative = false
  `)
  const existingGeo = new Set(
    existingLocRows.map((r: any) => String(r.campaignCriterion?.location?.geoTargetConstant ?? '')),
  )

  const geoToAdd = [...geoByName.entries()]
    .map(([name, id]) => ({ name, resource: `geoTargetConstants/${id}` }))
    .filter(g => ![...existingGeo].some(e => e.endsWith(`/${g.resource.split('/')[1]}`) || e === g.resource))

  report.geo_to_add = geoToAdd.map(g => g.name)

  const agRows = await gaql(customerId, headers, `
    SELECT ad_group.id, ad_group.name, ad_group.resource_name, ad_group.status
    FROM ad_group
    WHERE campaign.id = ${ZH_UMGEBUNG_ID}
      AND ad_group.status != 'REMOVED'
  `)
  const agByName = new Map(agRows.map((r: any) => [String(r.adGroup?.name), r]))
  report.existing_ad_groups = [...agByName.keys()]

  const kwRows = await gaql(customerId, headers, `
    SELECT ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type
    FROM ad_group_criterion
    WHERE campaign.id = ${ZH_UMGEBUNG_ID}
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = false
      AND ad_group_criterion.status != 'REMOVED'
  `)
  const existingKw = new Set(
    kwRows.map((r: any) => `${r.adGroup?.name}|${String(r.adGroupCriterion?.keyword?.text ?? '').toLowerCase()}`),
  )

  const existingNegRows = await gaql(customerId, headers, `
    SELECT campaign_criterion.keyword.text
    FROM campaign_criterion
    WHERE campaign.id IN (${ZH_ALTSTETTEN_ID}, ${ZH_UMGEBUNG_ID})
      AND campaign_criterion.negative = true
      AND campaign_criterion.type = 'KEYWORD'
  `)
  const existingNeg = new Set(
    existingNegRows.map((r: any) => String(r.campaignCriterion?.keyword?.text ?? '').toLowerCase()),
  )
  const negsToAdd = NEGATIVES.filter(n => !existingNeg.has(n.toLowerCase()))
  report.negatives_to_add = negsToAdd

  if (dryRun) {
    report.would_create_ad_groups = ZH_WEST_LOCATIONS
      .filter(l => !agByName.has(l.name))
      .map(l => l.name)
    return { ok: true, ...report }
  }

  const actions: string[] = []

  const pauseLachen = await mutate(customerId, headers, 'campaigns', [{
    updateMask: 'status',
    update: { resourceName: `customers/${customerId}/campaigns/${LACHEN_AUTO_ID}`, status: 'PAUSED' },
  }])
  actions.push(pauseLachen.ok ? 'paused_lachen_auto' : `pause_lachen_failed:${JSON.stringify(pauseLachen.data).slice(0, 200)}`)

  const enableAlt = await mutate(customerId, headers, 'campaigns', [{
    updateMask: 'status',
    update: { resourceName: `customers/${customerId}/campaigns/${ZH_ALTSTETTEN_ID}`, status: 'ENABLED' },
  }])
  const enableUmg = await mutate(customerId, headers, 'campaigns', [{
    updateMask: 'status',
    update: { resourceName: `customers/${customerId}/campaigns/${ZH_UMGEBUNG_ID}`, status: 'ENABLED' },
  }])
  actions.push(enableAlt.ok ? 'enabled_altstetten' : 'enable_altstetten_failed')
  actions.push(enableUmg.ok ? 'enabled_umgebung' : 'enable_umgebung_failed')

  if (!report.before.altstetten.shared && report.before.altstetten.budget) {
    const b = await mutate(customerId, headers, 'campaignBudgets', [{
      updateMask: 'amountMicros',
      update: {
        resourceName: report.before.altstetten.budget,
        amountMicros: Math.round(altShare * 1_000_000),
      },
    }])
    actions.push(b.ok ? `alt_budget_${altShare}` : 'alt_budget_failed')
  }
  if (!report.before.umgebung.shared && report.before.umgebung.budget) {
    const b = await mutate(customerId, headers, 'campaignBudgets', [{
      updateMask: 'amountMicros',
      update: {
        resourceName: report.before.umgebung.budget,
        amountMicros: Math.round(umgShare * 1_000_000),
      },
    }])
    actions.push(b.ok ? `umg_budget_${umgShare}` : 'umg_budget_failed')
  }

  if (geoToAdd.length) {
    const geoOps = geoToAdd.map(g => ({
      create: {
        campaign: `customers/${customerId}/campaigns/${ZH_UMGEBUNG_ID}`,
        location: { geoTargetConstant: g.resource },
      },
    }))
    const geoRes = await mutate(customerId, headers, 'campaignCriteria', geoOps)
    actions.push(geoRes.ok ? `geo_added_${geoToAdd.length}` : `geo_failed:${JSON.stringify(geoRes.data).slice(0, 180)}`)
  }

  for (const campId of [ZH_ALTSTETTEN_ID, ZH_UMGEBUNG_ID]) {
    const ops = negsToAdd.map(text => ({
      create: {
        campaign: `customers/${customerId}/campaigns/${campId}`,
        negative: true,
        keyword: { text, matchType: 'BROAD' },
      },
    }))
    for (let i = 0; i < ops.length; i += 40) {
      const chunk = ops.slice(i, i + 40)
      if (!chunk.length) continue
      const n = await mutate(customerId, headers, 'campaignCriteria', chunk)
      if (!n.ok) logger.warn('[gads-zh-west] negatives', JSON.stringify(n.data).slice(0, 200))
    }
  }

  const createdGroups: string[] = []
  for (const loc of ZH_WEST_LOCATIONS) {
    let agResource = agByName.get(loc.name)?.adGroup?.resourceName as string | undefined
    if (!agResource) {
      const agRes = await mutate(customerId, headers, 'adGroups', [{
        create: {
          name: loc.name,
          campaign: `customers/${customerId}/campaigns/${ZH_UMGEBUNG_ID}`,
          status: 'ENABLED',
          type: 'SEARCH_STANDARD',
          cpcBidMicros: 3_200_000,
        },
      }])
      agResource = agRes.data?.results?.[0]?.resourceName
      if (!agResource) {
        actions.push(`ag_failed_${loc.name}`)
        continue
      }
      createdGroups.push(loc.name)

      await mutate(customerId, headers, 'adGroupAds', [{
        create: {
          adGroup: agResource,
          status: 'ENABLED',
          ad: {
            responsiveSearchAd: {
              headlines: [
                { text: loc.name, pinnedField: 'HEADLINE_1' },
                { text: 'Driving Team', pinnedField: 'HEADLINE_2' },
                { text: 'Online Termin buchen' },
                { text: 'Fahrstunde ab CHF 95' },
                { text: 'Kat. B Auto' },
                { text: 'Jetzt buchen' },
                { text: 'Nähe zu dir' },
              ],
              descriptions: [
                { text: `${loc.name} — flexible Fahrstunden, online buchbar.`, pinnedField: 'DESCRIPTION_1' },
                { text: 'Driving Team Zürich West. Termin in 2 Minuten sichern.' },
              ],
              path1: 'Fahrschule',
              path2: loc.name.replace('Fahrschule ', '').slice(0, 15),
            },
            finalUrls: [loc.landing],
          },
        },
      }])
    } else {
      await mutate(customerId, headers, 'adGroups', [{
        updateMask: 'status',
        update: { resourceName: agResource, status: 'ENABLED' },
      }])
    }

    const kwOps = loc.keywords
      .filter(k => !existingKw.has(`${loc.name}|${k.toLowerCase()}`))
      .flatMap(text => (['PHRASE', 'EXACT'] as const).map(matchType => ({
        create: {
          adGroup: agResource,
          status: 'ENABLED',
          keyword: { text, matchType },
          cpcBidMicros: 3_200_000,
        },
      })))
    for (let i = 0; i < kwOps.length; i += 20) {
      const chunk = kwOps.slice(i, i + 20)
      if (!chunk.length) continue
      await mutate(customerId, headers, 'adGroupCriteria', chunk)
    }
  }

  report.created_ad_groups = createdGroups
  report.actions = actions
  logger.info('[gads-zh-west] applied', JSON.stringify(actions))
  return { ok: true, ...report }
}
