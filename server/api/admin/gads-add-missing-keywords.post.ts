/**
 * Add missing high-intent keywords to existing campaigns/ad groups.
 *
 * Analysis (July 2026):
 *  - Anhänger campaigns are missing Kat. BE specific keywords (highest buyer intent)
 *  - Lachen Umgebung is missing "fahrschule march" (correct region name for March/SZ)
 *  - Fahrstunden keywords need better coverage and higher bids
 *
 * USAGE (dry run):
 *   curl -X POST https://app.simy.ch/api/admin/gads-add-missing-keywords \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true, "preset": "all" }'
 *
 * USAGE (apply):
 *   curl -X POST https://app.simy.ch/api/admin/gads-add-missing-keywords \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false, "preset": "all" }'
 *
 * Presets:
 *   "all"             — applies all groups below
 *   "be_keywords"     — only Kat. BE / trailer keywords
 *   "march"           — only "fahrschule march" in Lachen campaign
 *   "fahrstunden"     — only fahrstunden keywords in Zürich campaign
 *   "buchungsintent"  — high-intent booking keywords for Fahrschule Zürich + Lachen
 */

import { resolveGadsAuth, buildGadsCustomer } from '~/server/utils/gads-auth'

const MATCH_TYPE_ENUM: Record<string, number> = {
  EXACT: 3,
  PHRASE: 2,
  BROAD: 1,
}

// Keywords to add per campaign (identified by partial name match) + ad group
const KEYWORD_GROUPS: Array<{
  preset: string
  campaign_name_contains: string
  ad_group_name_contains: string
  keywords: Array<{ text: string; match_type: 'EXACT' | 'PHRASE' | 'BROAD'; cpc_chf: number }>
  reason: string
}> = [
  // ── Kat. BE / Anhänger high-intent keywords for Zürich ─────────────────────
  {
    preset: 'be_keywords',
    campaign_name_contains: 'Anhänger Fahrschule Zürich',
    ad_group_name_contains: 'Fahrschule Altstetten',
    keywords: [
      { text: 'be führerschein zürich', match_type: 'EXACT', cpc_chf: 4.5 },
      { text: 'be führerschein', match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'anhänger kurs zürich', match_type: 'PHRASE', cpc_chf: 4.0 },
      { text: 'anhänger fahren lernen zürich', match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'be prüfung zürich', match_type: 'PHRASE', cpc_chf: 4.0 },
      { text: 'anhänger fahrlehrer zürich', match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'fahrschule be kategorie zürich', match_type: 'PHRASE', cpc_chf: 3.5 },
    ],
    reason: 'Kat. BE buyer-intent keywords missing in Anhänger Zürich campaign',
  },

  // ── Kat. BE / Anhänger high-intent keywords for Lachen ─────────────────────
  {
    preset: 'be_keywords',
    campaign_name_contains: 'Anhänger Fahrschule Lachen',
    ad_group_name_contains: 'Fahrschule Lachen',
    keywords: [
      { text: 'be führerschein lachen', match_type: 'EXACT', cpc_chf: 4.0 },
      { text: 'be führerschein', match_type: 'PHRASE', cpc_chf: 3.0 },
      { text: 'anhänger kurs lachen', match_type: 'PHRASE', cpc_chf: 4.0 },
      { text: 'anhänger fahren lernen', match_type: 'PHRASE', cpc_chf: 3.0 },
      { text: 'be prüfung lachen', match_type: 'EXACT', cpc_chf: 4.0 },
      { text: 'be prüfung pfäffikon', match_type: 'EXACT', cpc_chf: 3.5 },
      { text: 'anhänger fahrschule pfäffikon', match_type: 'PHRASE', cpc_chf: 3.5 },
    ],
    reason: 'Kat. BE buyer-intent keywords missing in Anhänger Lachen campaign',
  },

  // ── "Fahrschule March" for Lachen region ────────────────────────────────────
  {
    preset: 'march',
    campaign_name_contains: 'Fahrschule Lachen Umgebung',
    ad_group_name_contains: 'Fahrschule Lachen',
    keywords: [
      { text: 'fahrschule march', match_type: 'EXACT', cpc_chf: 3.5 },
      { text: 'fahrschule march sz', match_type: 'EXACT', cpc_chf: 3.5 },
      { text: 'fahrschule obersee sz', match_type: 'EXACT', cpc_chf: 3.0 },
      { text: 'fahrstunden march', match_type: 'PHRASE', cpc_chf: 3.0 },
    ],
    reason: 'March (Bezirk March, SZ) is the correct regional name for Lachen area — missing keyword',
  },

  // ── Fahrstunden keywords for Zürich (currently underrepresented) ────────────
  {
    preset: 'fahrstunden',
    campaign_name_contains: 'Fahrschule Zürich Umgebung',
    ad_group_name_contains: 'Fahrschule Schlieren',
    keywords: [
      { text: 'fahrstunden schlieren', match_type: 'EXACT', cpc_chf: 3.5 },
      { text: 'fahrlehrer schlieren', match_type: 'EXACT', cpc_chf: 3.5 },
    ],
    reason: 'Fahrstunden-intent keywords missing in Schlieren ad group',
  },
  {
    preset: 'fahrstunden',
    campaign_name_contains: 'Fahrschule Zürich Umgebung',
    ad_group_name_contains: 'Fahrschule Altstetten',
    keywords: [
      { text: 'fahrstunden altstetten', match_type: 'EXACT', cpc_chf: 3.5 },
    ],
    reason: 'Fahrstunden-intent keyword missing in Altstetten ad group',
  },
  {
    preset: 'fahrstunden',
    campaign_name_contains: 'Fahrschule Zürich Umgebung',
    ad_group_name_contains: 'Fahrschule Urdorf',
    keywords: [
      { text: 'fahrstunden urdorf', match_type: 'EXACT', cpc_chf: 3.5 },
    ],
    reason: 'Fahrstunden-intent keyword missing in Urdorf ad group',
  },
  {
    preset: 'fahrstunden',
    campaign_name_contains: 'Fahrschule Zürich Umgebung',
    ad_group_name_contains: 'Fahrschule Dietikon',
    keywords: [
      { text: 'fahrstunden dietikon', match_type: 'EXACT', cpc_chf: 3.5 },
      { text: 'fahrschule limmattal', match_type: 'PHRASE', cpc_chf: 3.0 },
    ],
    reason: 'Fahrstunden and Limmattal intent keywords missing in Dietikon ad group',
  },

  // ── Buchungsintent: Zürich — generic + per location ─────────────────────────
  {
    preset: 'buchungsintent',
    campaign_name_contains: 'Fahrschule Zürich Umgebung',
    ad_group_name_contains: 'Fahrschule Altstetten',
    keywords: [
      { text: 'fahrstunden buchen zürich',     match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'auto fahrstunden zürich',        match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'führerschein machen zürich',     match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'fahrschule zürich online buchen',match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'fahrlehrer zürich buchen',       match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'fahrstunden buchen altstetten',  match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'auto führerschein zürich',       match_type: 'PHRASE', cpc_chf: 3.5 },
    ],
    reason: 'Hochintent-Buchungskeywords fehlen komplett in Zürich Kampagne',
  },
  {
    preset: 'buchungsintent',
    campaign_name_contains: 'Fahrschule Zürich Umgebung',
    ad_group_name_contains: 'Fahrschule Dietikon',
    keywords: [
      { text: 'fahrstunden buchen dietikon',    match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'auto fahrstunden dietikon',      match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'führerschein machen dietikon',   match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'fahrlehrer dietikon buchen',     match_type: 'PHRASE', cpc_chf: 3.5 },
    ],
    reason: 'Hochintent-Buchungskeywords fehlen in Dietikon Ad Group',
  },
  {
    preset: 'buchungsintent',
    campaign_name_contains: 'Fahrschule Zürich Umgebung',
    ad_group_name_contains: 'Fahrschule Schlieren',
    keywords: [
      { text: 'fahrstunden buchen schlieren',   match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'auto fahrstunden schlieren',     match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'führerschein machen schlieren',  match_type: 'PHRASE', cpc_chf: 3.5 },
    ],
    reason: 'Hochintent-Buchungskeywords fehlen in Schlieren Ad Group',
  },
  {
    preset: 'buchungsintent',
    campaign_name_contains: 'Fahrschule Zürich Umgebung',
    ad_group_name_contains: 'Fahrschule Urdorf',
    keywords: [
      { text: 'fahrstunden buchen urdorf',      match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'auto fahrstunden urdorf',        match_type: 'EXACT',  cpc_chf: 4.0 },
    ],
    reason: 'Hochintent-Buchungskeywords fehlen in Urdorf Ad Group',
  },
  {
    preset: 'buchungsintent',
    campaign_name_contains: 'Fahrschule Zürich Umgebung',
    ad_group_name_contains: 'Fahrschule Birmensdorf',
    keywords: [
      { text: 'fahrstunden buchen birmensdorf', match_type: 'EXACT',  cpc_chf: 3.5 },
      { text: 'fahrschule birmensdorf buchen',  match_type: 'EXACT',  cpc_chf: 3.5 },
    ],
    reason: 'Hochintent-Buchungskeywords fehlen in Birmensdorf Ad Group',
  },

  // ── Buchungsintent: Lachen — generic + per location ─────────────────────────
  {
    preset: 'buchungsintent',
    campaign_name_contains: 'Fahrschule Lachen Umgebung',
    ad_group_name_contains: 'Fahrschule Lachen',
    keywords: [
      { text: 'fahrstunden buchen lachen',      match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'auto fahrstunden lachen',        match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'führerschein machen lachen',     match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'führerschein machen march',      match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'fahrschule lachen online buchen',match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'fahrlehrer lachen buchen',       match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'auto führerschein lachen',       match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'fahrstunden march sz',           match_type: 'PHRASE', cpc_chf: 3.5 },
    ],
    reason: 'Hochintent-Buchungskeywords fehlen komplett in Lachen Kampagne',
  },
  {
    preset: 'buchungsintent',
    campaign_name_contains: 'Fahrschule Lachen Umgebung',
    ad_group_name_contains: 'Fahrschule Pfäffikon',
    keywords: [
      { text: 'fahrstunden buchen pfäffikon',   match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'auto fahrstunden pfäffikon',     match_type: 'EXACT',  cpc_chf: 4.0 },
      { text: 'führerschein machen pfäffikon',  match_type: 'PHRASE', cpc_chf: 3.5 },
      { text: 'fahrlehrer pfäffikon sz',        match_type: 'PHRASE', cpc_chf: 3.5 },
    ],
    reason: 'Hochintent-Buchungskeywords fehlen in Pfäffikon Ad Group',
  },
]

export default defineEventHandler(async (event) => {
  // ── Auth + Credentials (tenant-aware) ────────────────────────────────────────
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event)
  const dryRun: boolean = body?.dry_run !== false
  const preset: string = body?.preset ?? 'all'

  const validPresets = ['all', 'be_keywords', 'march', 'fahrstunden', 'buchungsintent']
  if (!validPresets.includes(preset)) {
    return { ok: false, reason: `Invalid preset. Use one of: ${validPresets.join(', ')}` }
  }

  const customer = buildGadsCustomer(gads)

  // 1. Fetch all active ad groups with their campaign names
  let adGroupsResponse: any[]
  let existingKwResponse: any[]
  try {
    adGroupsResponse = await customer.query(`
      SELECT
        ad_group.resource_name,
        ad_group.name,
        campaign.name,
        campaign.resource_name
      FROM ad_group
      WHERE
        ad_group.status = 'ENABLED'
        AND campaign.status != 'REMOVED'
    `) as any[]
  }
  catch (err: any) {
    return { ok: false, step: 'fetch_ad_groups', error: err?.message ?? String(err) }
  }

  const adGroups = adGroupsResponse

  // 2. Fetch existing keywords to avoid duplicates
  try {
    existingKwResponse = await customer.query(`
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group.resource_name
      FROM ad_group_criterion
      WHERE
        ad_group_criterion.type = 'KEYWORD'
        AND ad_group_criterion.status != 'REMOVED'
        AND campaign.status != 'REMOVED'
    `) as any[]
  }
  catch (err: any) {
    return { ok: false, step: 'fetch_existing_keywords', error: err?.message ?? String(err) }
  }

  const existingKwSet = new Set(
    (existingKwResponse as any[]).map(
      kw => `${kw.ad_group?.resource_name}::${kw.ad_group_criterion?.keyword?.text?.toLowerCase()}::${kw.ad_group_criterion?.keyword?.match_type}`,
    ),
  )

  // 3. Resolve which ad groups match each keyword group
  const applicableGroups = KEYWORD_GROUPS.filter(
    g => preset === 'all' || g.preset === preset,
  )

  const plan: Array<{
    campaign: string
    ad_group: string
    ad_group_resource: string
    keywords_to_add: Array<{ text: string; match_type: string; cpc_chf: number }>
    reason: string
  }> = []

  for (const group of applicableGroups) {
    const matchedAdGroups = adGroups.filter(
      ag =>
        (ag.campaign?.name ?? '').toLowerCase().includes(group.campaign_name_contains.toLowerCase()) &&
        (ag.ad_group?.name ?? '').toLowerCase().includes(group.ad_group_name_contains.toLowerCase()),
    )

    for (const ag of matchedAdGroups) {
      const adGroupResourceName = ag.ad_group.resource_name

      const toAdd = group.keywords.filter((kw) => {
        const key = `${adGroupResourceName}::${kw.text.toLowerCase()}::${kw.match_type}`
        return !existingKwSet.has(key)
      })

      if (toAdd.length > 0) {
        plan.push({
          campaign: ag.campaign.name,
          ad_group: ag.ad_group.name,
          ad_group_resource: adGroupResourceName,
          keywords_to_add: toAdd,
          reason: group.reason,
        })
      }
    }
  }

  if (dryRun) {
    return {
      dry_run: true,
      preset,
      plan: plan.map(p => ({
        campaign: p.campaign,
        ad_group: p.ad_group,
        keywords_to_add: p.keywords_to_add,
        reason: p.reason,
      })),
      total_additions: plan.reduce((s, p) => s + p.keywords_to_add.length, 0),
    }
  }

  // 4. Apply mutations
  const added: string[] = []
  const errors: string[] = []

  for (const entry of plan) {
    const operations = entry.keywords_to_add.map(kw => ({
      entity: 'ad_group_criterion',
      operation: 'create',
      resource: {
        ad_group: entry.ad_group_resource,
        status: 2, // ENABLED
        keyword: {
          text: kw.text,
          match_type: MATCH_TYPE_ENUM[kw.match_type] ?? 1,
        },
        cpc_bid_micros: Math.round(kw.cpc_chf * 1_000_000),
      },
    }))

    try {
      await customer.mutateResources(operations)
      for (const kw of entry.keywords_to_add) {
        added.push(`[${kw.match_type}] "${kw.text}" (CHF ${kw.cpc_chf}) → ${entry.campaign} / ${entry.ad_group}`)
      }
    }
    catch (err: any) {
      errors.push(`${entry.campaign} / ${entry.ad_group}: ${err?.message ?? String(err)}`)
    }
  }

  return {
    dry_run: false,
    preset,
    added,
    errors,
    total_added: added.length,
    total_errors: errors.length,
  }
})
