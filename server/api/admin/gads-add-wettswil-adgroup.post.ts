/**
 * Creates a new "Fahrschule Wettswil" ad group in the Fahrschule Zürich
 * Umgebung campaign.
 *
 * BACKGROUND (July 2026 analysis): drivingteam.ch already has a complete,
 * well-optimized landing page for Wettswil am Albis (covers Wettswil,
 * Bonstetten, Stallikon, Knonaueramt — bordering Birmensdorf), but NO
 * Google Ads targeting exists for it at all. This is free, already-built
 * demand capture that was simply never wired up in Ads.
 *
 * USAGE (dry run):
 *   curl -X POST https://app.simy.ch/api/admin/gads-add-wettswil-adgroup \
 *     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const FAHRSCHULE_ZUERICH_CAMPAIGN_ID = '23868553846'
const AD_GROUP_NAME = 'Fahrschule Wettswil'
const FINAL_URL = 'https://drivingteam.ch/fahrschule-wettswil/'

const KEYWORDS: Array<{ text: string; matchType: 'EXACT' | 'PHRASE'; cpcChf: number }> = [
  { text: 'fahrschule wettswil', matchType: 'EXACT', cpcChf: 3.5 },
  { text: 'fahrschule wettswil am albis', matchType: 'EXACT', cpcChf: 3.5 },
  { text: 'fahrstunden wettswil', matchType: 'EXACT', cpcChf: 3.5 },
  { text: 'fahrlehrer wettswil', matchType: 'EXACT', cpcChf: 3.5 },
  { text: 'führerschein wettswil', matchType: 'PHRASE', cpcChf: 3.0 },
  { text: 'fahrschule bonstetten', matchType: 'EXACT', cpcChf: 3.5 },
  { text: 'fahrschule stallikon', matchType: 'EXACT', cpcChf: 3.5 },
  { text: 'fahrschule knonaueramt', matchType: 'PHRASE', cpcChf: 3.0 },
  { text: 'fahrstunden buchen wettswil', matchType: 'EXACT', cpcChf: 4.0 },
]

const HEADLINES = [
  'Fahrschule Wettswil am Albis',
  'Autobahnauffahrt A3 üben',
  'Whiskeypass Vorbereitung',
  'Jetzt Fahrstunde buchen',
  '5.0 Sterne 414 Bewertungen',
  'Fahrlehrer Skender',
  'Fahrschule Bonstetten',
  'Fahrschule Stallikon',
  'Knonaueramt Fahrschule',
  'Deutsch Englisch Albanisch',
  'StVA Albisgütli Prüfung',
  'Bhf Wettswil-Bonstetten',
]

const DESCRIPTIONS = [
  'Skender übt mit dir Autobahnauffahrten A3 und den Whiskeypass in Wettswil.',
  'Prüfung am StVA Albisgütli. Jetzt Termin buchen – einfach online.',
  'Auch für Bonstetten, Stallikon und das ganze Knonaueramt.',
  '5.0 Sterne, 414+ Bewertungen. Unterricht auf Deutsch, Englisch, Albanisch.',
]

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun: boolean = body?.dry_run !== false

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  // Check ad group doesn't already exist
  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const existsQuery = `
    SELECT ad_group.resource_name FROM ad_group
    WHERE ad_group.name = '${AD_GROUP_NAME}' AND campaign.id = ${FAHRSCHULE_ZUERICH_CAMPAIGN_ID}
  `
  const existsRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query: existsQuery }) })
  const existsData = await existsRes.json() as any[]
  const existingAdGroup = (existsData ?? []).flatMap(b => b.results ?? [])[0]?.adGroup?.resourceName

  if (existingAdGroup && !dryRun) {
    // Ad group + keywords already created in a prior run — just (re)create the ad.
    const adRes = await fetch(`https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupAds:mutate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operations: [{
          create: {
            adGroup: existingAdGroup,
            status: 'ENABLED',
            ad: {
              finalUrls: [FINAL_URL],
              responsiveSearchAd: {
                headlines: HEADLINES.map(text => ({ text })),
                descriptions: DESCRIPTIONS.map(text => ({ text })),
              },
            },
          },
        }],
      }),
    })
    const adData = await adRes.json() as any
    if (!adRes.ok) {
      logger.warn('[gads-add-wettswil] Ad create error (existing ad group):', JSON.stringify(adData).slice(0, 500))
    }
    return {
      ok: adRes.ok,
      dry_run: false,
      ad_group_resource_name: existingAdGroup,
      ad_created: (adData.results ?? []).length > 0,
      ad_errors: !adRes.ok ? adData : undefined,
    }
  }

  if (existingAdGroup && dryRun) {
    return { ok: true, reason: 'ad_group_already_exists', resource_name: existingAdGroup, note: 'Would (re)create the ad only.' }
  }

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      would_create: {
        ad_group: AD_GROUP_NAME,
        final_url: FINAL_URL,
        keywords: KEYWORDS,
        headlines: HEADLINES,
        descriptions: DESCRIPTIONS,
      },
    }
  }

  // 1. Create ad group
  const campaignResource = `customers/${customerId}/campaigns/${FAHRSCHULE_ZUERICH_CAMPAIGN_ID}`
  const createAdGroupRes = await fetch(`https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroups:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [{
        create: {
          campaign: campaignResource,
          name: AD_GROUP_NAME,
          status: 'ENABLED',
          type: 'SEARCH_STANDARD',
        },
      }],
    }),
  })
  const adGroupData = await createAdGroupRes.json() as any
  if (!createAdGroupRes.ok) {
    logger.warn('[gads-add-wettswil] Ad group create error:', JSON.stringify(adGroupData).slice(0, 500))
    return { ok: false, step: 'create_ad_group', error: adGroupData }
  }
  const adGroupResourceName = adGroupData.results?.[0]?.resourceName
  if (!adGroupResourceName) {
    return { ok: false, step: 'create_ad_group', error: 'No resource name returned', raw: adGroupData }
  }

  // 2. Create keywords
  const kwOperations = KEYWORDS.map(kw => ({
    create: {
      adGroup: adGroupResourceName,
      status: 'ENABLED',
      keyword: { text: kw.text, matchType: kw.matchType },
      cpcBidMicros: String(Math.round(kw.cpcChf * 1_000_000)),
    },
  }))
  const kwRes = await fetch(`https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupCriteria:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ operations: kwOperations, partialFailure: true }),
  })
  const kwData = await kwRes.json() as any
  if (!kwRes.ok) {
    logger.warn('[gads-add-wettswil] Keyword create error:', JSON.stringify(kwData).slice(0, 500))
  }

  // 3. Create RSA ad
  const adRes = await fetch(`https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupAds:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [{
        create: {
          adGroup: adGroupResourceName,
          status: 'ENABLED',
          ad: {
            finalUrls: [FINAL_URL],
            responsiveSearchAd: {
              headlines: HEADLINES.map(text => ({ text })),
              descriptions: DESCRIPTIONS.map(text => ({ text })),
            },
          },
        },
      }],
    }),
  })
  const adData = await adRes.json() as any
  if (!adRes.ok) {
    logger.warn('[gads-add-wettswil] Ad create error:', JSON.stringify(adData).slice(0, 500))
  }

  logger.info('[gads-add-wettswil] Ad group created:', adGroupResourceName)

  return {
    ok: true,
    dry_run: false,
    ad_group_resource_name: adGroupResourceName,
    keywords_created: (kwData.results ?? []).length,
    keyword_errors: !kwRes.ok ? kwData : undefined,
    ad_created: (adData.results ?? []).length > 0,
    ad_errors: !adRes.ok ? adData : undefined,
  }
})
