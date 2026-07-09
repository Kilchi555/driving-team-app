/**
 * Add campaign-level negative keywords to one or more Google Ads campaigns.
 *
 * USAGE (dry run):
 *   curl -X POST http://localhost:3000/api/admin/gads-add-negative-keywords \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true, "preset": "competitors_and_irrelevant" }'
 *
 * USAGE (apply to all DrivingTeam campaigns):
 *   curl -X POST http://localhost:3000/api/admin/gads-add-negative-keywords \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false, "preset": "competitors_and_irrelevant" }'
 *
 * USAGE (custom keywords on specific campaigns):
 *   curl -X POST http://localhost:3000/api/admin/gads-add-negative-keywords \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "dry_run": false,
 *       "campaign_ids": ["23865472770"],
 *       "negative_keywords": [
 *         { "text": "fahrschule fratelli", "match_type": "BROAD" }
 *       ]
 *     }'
 *
 * match_type for negative keywords: BROAD = phrase-free match (recommended), PHRASE, EXACT
 */

import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { logger } from '~/utils/logger'

const GADS_VERSION = 'v23'

// ── Preset: all competitor brand names + confirmed irrelevant search terms ────
// These were identified from actual search term reports (June–July 2026).
const COMPETITOR_NEGATIVES = [
  // Competitor schools / brands
  'fahrschule fratelli',
  'easydriving',
  'fahrschule koch',
  'fahrschule steiner',
  'fahrschule kleiner',
  'blink fahrschule',
  'fahrschule star',
  'star fahrschule',
  'auto pronto',
  'fahrschule city',
  'fahrschule kalberer',
  'florin fahrschule',
  'markus krieg',
  'roger marty',
  // Competitor instructors found in search terms (July 2026)
  'halide studer',
  // Competitor websites / apps
  'theorie24',
  'lkwtheorie',
  'transportschule',
  'fahrschule regensdorf',  // specific competitor location if not served
  'ziganek fahrschule',
  'ziganek',
]

// Irrelevant search terms that keep appearing across campaigns and waste budget.
// These are BROAD negative so they block the phrase in any context.
const IRRELEVANT_NEGATIVES = [
  // Wrong service: CZV (Berufskraftfahrer-Kurse — not a Fahrschule offering)
  'czv kurs',
  'czv kurse',
  'czv grundausbildung',
  'czv ausbildung',
  'czv abfragen',
  'czv weiterbildung',
  'czv online',
  // Wrong service: WAB-Kurse (Weiterbildung Ausbilder / WAB != VKU)
  'wab kurs',
  'wab kurs zürich',
  'wab kurs aargau',
  'wab kurs pfäffikon',
  'wab kurs motorrad',
  // Wrong service: Motorrad / Scooter (not offered or separate campaign scope)
  'motorrad grundkurs',
  'motorrad grundkurs zürich',
  'motorrad grundkurs aargau',
  'motorrad grundkurs in der nähe',
  'motorradprüfung',
  'motorrad prüfung',
  'motorrad führerschein',
  '125ccm',
  '125 motorrad',
  'rollerprüfung',
  'roller prüfung',
  'motorradkategorien',
  'a1 prüfung',
  'a1 führerschein',
  'schweiz motorrad',
  // Wrong service: Schleuderkurs (safety training — not offered)
  'schleuderkurs',
  'schleuderkurs zürich',
  // Wrong service: 2-Phasige / VKU confusion
  '2 phasen kurs',
  '2-phasen',
  'zweiphasen',
  // Government offices (info seekers with no purchase intent)
  'strassenverkehrsamt',
  'strassenverkehrsamt zürich',
  'strassenverkehrsamt aargau',
  'strassenverkehrsamt schwyz',
  'strassenverkehrsamt regensdorf',
  'verkehrsamt',
  'verkehrsamt schwyz',
  'mfk',
  // Theorieprüfung-Info seekers (want to study, not book a course)
  'theorieprüfung kaufen',
  'gratis theorieprüfung',
  'theorieprüfung lernen',
  'theorieprüfung auto',
  'autoprüfung theorie',
  'theorieprüfungsfragen',
  'zusatztheorieprüfung',
  'führerprüfung',  // generic driving exam info
  // Führerschein-Kategorien Info (no purchase intent)
  'führerausweis kategorien',
  'führerausweis schweiz kategorien',
  'führerschein kategorien',
  'führerschein klassen',
  'fahrzeug kategorien',
  'motorfahrzeug kategorien',
  'führerschein kat',
  'ab wann theorieprüfung',
  // Price/cost research only (not booking intent)
  'vku kosten',
  'vku kurs kosten',
  'was kostet',
  // LKW-Theorie platforms (competitor apps)
  'lkw lernen',
  'www.lkwtheorie',
  // Misc irrelevant
  'fresh up',
  'lernfahrten begleitperson',
  'mobility lernfahrten',
  'rückwärts einparken',
  'autobahn fahren lernen',
  'fahrgesuch',
  'driving school near me',  // English queries — low intent for CH-German school
  'driving exam switzerland',
  'learning driving licence',
  // Government info pages
  'www.zh.ch',
  'zh.ch lernfahrer',
  'lernfahrer zh',
  // Price info only (not booking)
  'fahrstunden preis',
  'fahrstunden preis schweiz',
  'fahrschule preise vergleich',
  // Competitor: TCS
  'tcs fahrkurs',
  'tcs fahrkurse',
  'tcs fahrschule',
  // Wrong licence categories
  'lernfahrausweis kat a',
  'führerausweis kategorie m',
  'kategorie m',
  'kat m führerschein',
  'c1 führerschein wohnmobil',
  'wohnmobil führerschein',
  'autoprüfung anmelden',
  'prüfungsanmeldung',
  'fahrprüfung anmelden',
  // Wrong product: category info seekers (want info about BE licence, not a course)
  'fahrausweise schweiz',
  'führerausweise',
  'ausweis kategorien',
  'ausweis kategorie',
  'kat be',             // only info, no booking intent — real buyers search "anhänger kurs" etc.
  'kategorie be',
  'kat be schweiz',
  // TCS/ADAC-style courses
  'sicherheitskurs',
  'fahrsicherheitskurs',
]

// All campaigns owned by DrivingTeam (campaign IDs from DB)
const DRIVING_TEAM_CAMPAIGN_IDS = [
  '23865472770', // Fahrschule Lachen Umgebung
  '23868553846', // Fahrschule Zürich Umgebung
  '23888643015', // Anhänger Fahrschule Lachen
  '23893427204', // Anhänger Fahrschule Zürich
  '23893818404', // Anhänger Fahrschule Aargau
  '23898300631', // Lastwagen Fahrschule Lachen
  '23956180976', // VKU Kurs Lachen 2026
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
  const dryRun: boolean = body?.dry_run !== false // default: dry run
  const preset: string = body?.preset ?? ''

  // Determine which keywords to add
  let negativeKeywords: Array<{ text: string; match_type: 'BROAD' | 'PHRASE' | 'EXACT' }> = []

  if (preset === 'competitors_and_irrelevant') {
    negativeKeywords = [
      ...COMPETITOR_NEGATIVES.map(text => ({ text, match_type: 'BROAD' as const })),
      ...IRRELEVANT_NEGATIVES.map(text => ({ text, match_type: 'BROAD' as const })),
    ]
  } else if (preset === 'competitors') {
    negativeKeywords = COMPETITOR_NEGATIVES.map(text => ({ text, match_type: 'BROAD' as const }))
  } else if (preset === 'irrelevant') {
    negativeKeywords = IRRELEVANT_NEGATIVES.map(text => ({ text, match_type: 'BROAD' as const }))
  } else if (Array.isArray(body?.negative_keywords) && body.negative_keywords.length > 0) {
    negativeKeywords = body.negative_keywords
  } else {
    return {
      ok: false,
      reason: 'Provide preset ("competitors_and_irrelevant" | "competitors" | "irrelevant") or negative_keywords array.',
      available_presets: ['competitors_and_irrelevant', 'competitors', 'irrelevant'],
    }
  }

  // Determine which campaigns to target
  const campaignIds: string[] = Array.isArray(body?.campaign_ids) && body.campaign_ids.length > 0
    ? body.campaign_ids
    : DRIVING_TEAM_CAMPAIGN_IDS

  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').trim()
  const developerToken = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '').trim()
  const managerCustomerId = (process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID ?? '').trim()

  if (!customerId || !developerToken) {
    return { ok: false, reason: 'missing_credentials' }
  }

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      campaigns_targeted: campaignIds,
      negative_keywords_count: negativeKeywords.length,
      negative_keywords: negativeKeywords,
      message: 'Set dry_run: false to apply these negative keywords to all targeted campaigns.',
    }
  }

  // ── OAuth ─────────────────────────────────────────────────────────────────────
  const accessToken = await getAccessToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  }
  if (managerCustomerId) headers['login-customer-id'] = managerCustomerId

  const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/campaignCriteria:mutate`

  // First: fetch existing negative keywords to avoid duplicates
  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const existingQuery = `
    SELECT campaign.id, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type
    FROM campaign_criterion
    WHERE campaign_criterion.type = 'KEYWORD'
      AND campaign_criterion.negative = true
      AND campaign.status != 'REMOVED'
  `
  const existingRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query: existingQuery }) })
  const existingData = await existingRes.json() as any[]

  const existingNegatives = new Set<string>()
  for (const batch of (Array.isArray(existingData) ? existingData : [])) {
    for (const row of (batch.results ?? [])) {
      const campId: string = String(row.campaign?.id ?? '')
      const kw: string = (row.campaignCriterion?.keyword?.text ?? '').toLowerCase()
      const mt: string = row.campaignCriterion?.keyword?.matchType ?? ''
      existingNegatives.add(`${campId}::${kw}::${mt}`)
    }
  }

  logger.info(`[gads-neg-kw] Found ${existingNegatives.size} existing campaign-level negative keywords`)

  // Build mutate operations — one negative keyword per campaign
  const operations: object[] = []
  const skipped: string[] = []

  for (const campaignId of campaignIds) {
    const campaignResourceName = `customers/${customerId}/campaigns/${campaignId}`
    for (const kw of negativeKeywords) {
      const dedupeKey = `${campaignId}::${kw.text.toLowerCase()}::${kw.match_type}`
      if (existingNegatives.has(dedupeKey)) {
        skipped.push(`[${campaignId}] ${kw.text} (${kw.match_type}) — already exists`)
        continue
      }
      operations.push({
        create: {
          campaign: campaignResourceName,
          negative: true,
          keyword: {
            text: kw.text,
            matchType: kw.match_type,
          },
        },
      })
    }
  }

  if (operations.length === 0) {
    return {
      ok: true,
      dry_run: false,
      added: 0,
      skipped: skipped.length,
      message: 'All negative keywords already exist across all campaigns.',
    }
  }

  // Batch in groups of 1000 (API limit per call)
  const BATCH_SIZE = 1000
  let totalAdded = 0
  const errors: any[] = []

  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = operations.slice(i, i + BATCH_SIZE)
    const res = await fetch(mutateUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ operations: batch, partialFailure: true }),
    })
    const data = await res.json() as any
    if (!res.ok) {
      errors.push({ batch_start: i, error: data })
      logger.warn('[gads-neg-kw] Mutate error:', JSON.stringify(data).slice(0, 500))
    } else {
      const added = (data.results ?? []).length
      totalAdded += added
      if (data.partialFailureError) {
        errors.push({ batch_start: i, partialFailureError: data.partialFailureError })
        logger.warn('[gads-neg-kw] Partial failure:', JSON.stringify(data.partialFailureError).slice(0, 300))
      }
      logger.info(`[gads-neg-kw] Batch ${i}–${i + batch.length}: added ${added} negative keywords`)
    }
  }

  return {
    ok: errors.length === 0,
    dry_run: false,
    added: totalAdded,
    skipped: skipped.length,
    campaigns_targeted: campaignIds,
    negative_keywords_count: negativeKeywords.length,
    errors: errors.length > 0 ? errors : undefined,
  }
})
