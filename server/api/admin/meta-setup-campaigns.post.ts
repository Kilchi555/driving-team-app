/**
 * Meta Campaign Setup API
 *
 * Creates the full Driving Team campaign structure via Meta Marketing API:
 *   - 2 Campaigns (Prospecting + Retargeting)
 *   - 5 Ad Sets with Dynamic Creative enabled
 *   - 1 Dynamic Creative Ad per Ad Set (5 headlines × 4 descriptions × images)
 *
 * Requires:
 *   META_SYSTEM_USER_TOKEN  — with ads_management scope
 *   META_AD_ACCOUNT_ID      — e.g. act_112579503417059
 *   META_PIXEL_ID           — 1523803071276836
 *
 * Run once via POST /api/admin/meta-setup-campaigns
 * Body: { dry_run: true }  — validates structure without creating
 */

import { logger } from '~/utils/logger'
import { metaPost as _metaPost, getMetaCredentials } from '~/server/utils/meta-ads-api'

const { adAccount: AD_ACCOUNT, pixelId: PIXEL_ID, token: TOKEN } = getMetaCredentials()

// Driving Team booking URL — all ads point here
const BOOKING_URL = 'https://drivingteam.ch?utm_source=facebook&utm_medium=paid_social&utm_campaign='

// ─── Creative assets per product ─────────────────────────────────────────────

const CREATIVES: Record<string, { headlines: string[]; descriptions: string[] }> = {
  auto: {
    headlines: [
      'Führerschein Zürich — ab CHF 95/Lektion. Jetzt buchen.',
      'Online buchen, sofort bestätigt. Fahrschule Zürich & Lachen.',
      'Führerschein in 3–4 Monaten. Flexible Termine.',
      'Über 500 Fahrschüler. 4.9 Sterne. Jetzt starten.',
      'Deine Fahrschule in Altstetten & Lachen.',
    ],
    descriptions: [
      'Termin online wählen, sofort bestätigt. Kat. B Automatik & Schaltung.',
      'Zertifizierte Fahrlehrer, flexible Zeiten, faire Preise.',
      'Kein Warten, kein Pendeln — lerne in deiner Nähe.',
      'Starte heute. Online buchen, sofort fahren.',
    ],
  },
  anhaenger: {
    headlines: [
      'Anhängerkurs Zürich & Lachen — Kat. BE. Jetzt buchen.',
      'Wohnwagen, Pferdeanhänger, Bootsanhänger — Kat. BE.',
      'Anhänger legal ziehen. Kurs in Lachen & Zürich.',
      'BE-Prüfung in 1 Tag. Online buchen.',
      'Kat. BE: Alles was du ziehen willst — legal.',
    ],
    descriptions: [
      'Kurs in Lachen und Zürich Altstetten. Flexibler Termin.',
      'Wohnwagen, Pferdeanhänger, Trailer — alles erlaubt mit Kat. BE.',
      'Praktische Prüfung direkt ab Kurs möglich.',
      'Online buchen, sofort bestätigt. Fahrschule Driving Team.',
    ],
  },
  lastwagen: {
    headlines: [
      'Lastwagen Führerschein C/CE — Driving Team Lachen.',
      'LKW Führerschein Lachen & Zürich. Professionell.',
      'Kat. C, C1, CE — alles aus einer Hand in Lachen.',
      'LKW fahren lernen: Theorie + Praxis bei Driving Team.',
      'Berufschauffeur werden. Kurse in Lachen & Zürich.',
    ],
    descriptions: [
      'Kat. C, C1, CE und CE — zertifizierte Ausbildung in Lachen.',
      'Berufliche Weiterbildung als Chauffeur. Jetzt Termin buchen.',
      'Theorie und Praxis kombiniert. Flexible Termine in Lachen.',
      'Driving Team — dein Partner für den LKW-Führerschein.',
    ],
  },
}

// Legacy fallback (not used directly)
const HEADLINES = CREATIVES.auto.headlines
const DESCRIPTIONS = CREATIVES.auto.descriptions

// ─── Local alias so existing call-sites (metaPost(path, body)) keep working ──
function metaPost(path: string, body: Record<string, any>) {
  return _metaPost(path, body, TOKEN)
}

// ─── Campaign creation ────────────────────────────────────────────────────────
async function createCampaign(name: string, objective: string, status: string) {
  return metaPost(`${AD_ACCOUNT}/campaigns`, {
    name,
    objective,
    status,
    special_ad_categories: [],
  })
}

// ─── Ad Set creation ──────────────────────────────────────────────────────────
async function createAdSet(params: {
  name: string
  campaignId: string
  dailyBudgetCHF: number
  targeting: Record<string, any>
  optimizationGoal: string
  billingEvent: string
  status: string
  utmCampaign: string
}) {
  return metaPost(`${AD_ACCOUNT}/adsets`, {
    name: params.name,
    campaign_id: params.campaignId,
    daily_budget: Math.round(params.dailyBudgetCHF * 100), // in cents (CHF * 100)
    billing_event: params.billingEvent,
    optimization_goal: params.optimizationGoal,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting: params.targeting,
    is_dynamic_creative: true,
    promoted_object: {
      pixel_id: PIXEL_ID,
      custom_event_type: 'PURCHASE',
    },
    status: params.status,
  })
}

  // ─── Ad Creative with Dynamic Creative (asset_feed_spec) ──────────────────────
async function createDynamicCreative(params: {
  name: string
  utmCampaign: string
  product: 'auto' | 'anhaenger' | 'lastwagen'
  imageHashes?: string[]
}) {
  const link = `${BOOKING_URL}${params.utmCampaign}`
  const creative = CREATIVES[params.product]

  const assetFeedSpec: Record<string, any> = {
    bodies: creative.descriptions.map(text => ({ text })),
    titles: creative.headlines.map(text => ({ text })),
    link_urls: [{ website_url: link, display_url: 'drivingteam.ch' }],
    call_to_action_types: ['BOOK_TRAVEL', 'LEARN_MORE'],
    ad_formats: ['AUTOMATIC_FORMAT'],
  }

  if (params.imageHashes?.length) {
    assetFeedSpec.images = params.imageHashes.map(hash => ({ hash }))
  }

  return metaPost(`${AD_ACCOUNT}/adcreatives`, {
    name: params.name,
    asset_feed_spec: assetFeedSpec,
    object_story_spec: {
      page_id: process.env.META_PAGE_ID ?? '',
    },
  })
}

// ─── Ad ───────────────────────────────────────────────────────────────────────
async function createAd(name: string, adSetId: string, creativeId: string, status: string) {
  return metaPost(`${AD_ACCOUNT}/ads`, {
    name,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status,
  })
}

// ─── Targeting presets — precise geo based on GSC location data ──────────────

// Zürich Altstetten (main office: Baslerstrasse 145, 8048) + 15km
// Covers: Zürich city, Schlieren, Dietikon, Spreitenbach, Killwangen, Baden edge
const ZURICH_GEO = {
  geo_locations: {
    custom_locations: [
      { latitude: 47.3688, longitude: 8.4876, radius: 15, distance_unit: 'kilometer' }, // Altstetten
    ],
  },
}

// Lachen SZ + 25km
// Covers: March, Schwytz, Wädenswil, Horgen, Pfäffikon SZ, Rapperswil, Altendorf
const LACHEN_GEO = {
  geo_locations: {
    custom_locations: [
      { latitude: 47.1975, longitude: 8.8533, radius: 25, distance_unit: 'kilometer' }, // Lachen SZ
    ],
  },
}

// Both locations combined — for products available at both sites
const DUAL_GEO = {
  geo_locations: {
    custom_locations: [
      { latitude: 47.3688, longitude: 8.4876, radius: 15, distance_unit: 'kilometer' }, // Altstetten
      { latitude: 47.1975, longitude: 8.8533, radius: 25, distance_unit: 'kilometer' }, // Lachen SZ
    ],
  },
}

// B Automatik — young adults, Zürich focus (GSC: "fahrschule zürich", "fahrschule altstetten", "fahrkurse jugendliche")
const AUTO_TARGETING = {
  ...ZURICH_GEO,
  age_min: 17,
  age_max: 30,
}

// Anhänger/BE — car owners, homeowners, 30-55, both locations
// GSC: "anhänger fahrschule lachen" 230 Impr., "anhängerkurs" strong in Lachen area
const ANHAENGER_TARGETING = {
  ...DUAL_GEO,
  age_min: 25,
  age_max: 55,
}

// Lastwagen C/C1/CE — transport & logistics professionals, Lachen-focused
// GSC: "lastwagen fahrschule lachen" 119, "car fahrschule lachen" 143, "bus fahrschule lachen" 139
// LKW drivers will travel up to 40km for training → wider radius
const LKW_TARGETING = {
  geo_locations: {
    custom_locations: [
      { latitude: 47.1975, longitude: 8.8533, radius: 40, distance_unit: 'kilometer' }, // Lachen — wider for LKW
      { latitude: 47.3688, longitude: 8.4876, radius: 20, distance_unit: 'kilometer' }, // Altstetten
    ],
  },
  age_min: 21,
  age_max: 55,
}

// Retargeting — all visitors, all locations
const RETARGETING_TARGETING = {
  ...DUAL_GEO,
  age_min: 17,
  age_max: 55,
}

// ─── Main setup function ──────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  // Admin-only endpoint
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!TOKEN || !AD_ACCOUNT || !PIXEL_ID) {
    return {
      success: false,
      reason: 'missing_credentials',
      missing: [
        !TOKEN && 'META_SYSTEM_USER_TOKEN',
        !AD_ACCOUNT && 'META_AD_ACCOUNT_ID',
        !PIXEL_ID && 'META_PIXEL_ID',
      ].filter(Boolean),
      instructions: 'Set META_SYSTEM_USER_TOKEN (ads_management scope), META_AD_ACCOUNT_ID, META_PIXEL_ID in env vars.',
    }
  }

  const body = await readBody(event).catch(() => ({})) as { dry_run?: boolean; status?: string }
  const dryRun = body.dry_run === true
  const adStatus = body.status ?? 'PAUSED' // Always start paused — activate manually after review

  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      plan: {
        campaigns: [
          'B Automatik — Zürich Neukunden (CHF 20/Tag)',
          'Anhänger/BE — Zürich + Lachen (CHF 12/Tag)',
          'Lastwagen C/CE — Lachen fokus (CHF 10/Tag)',
          'Retargeting — alle Produkte (CHF 8/Tag)',
        ],
        ad_sets: [
          'Auto — Lookalike 1% Zürich Altstetten +15km',
          'Auto — Broad 17–30 Altstetten',
          'Anhänger — Broad 25–55 Zürich+Lachen dual-geo',
          'LKW C/CE — Broad 21–55 Lachen +40km + Zürich',
          'Retargeting — Website-Besucher 30d dual-geo',
        ],
        geo_targeting: {
          auto: 'Zürich Altstetten (47.3688, 8.4876) +15km',
          anhaenger: 'Dual: Altstetten +15km + Lachen (47.1975, 8.8533) +25km',
          lkw: 'Dual: Lachen +40km + Altstetten +20km',
          retargeting: 'Dual: Altstetten +15km + Lachen +25km',
        },
        creatives_per_product: {
          auto: { headlines: 5, descriptions: 4 },
          anhaenger: { headlines: 5, descriptions: 4 },
          lastwagen: { headlines: 5, descriptions: 4 },
        },
        total_daily_budget_chf: 50,
        all_ads_status: adStatus,
      },
    }
  }

  const created: Record<string, any> = { campaigns: {}, adsets: {}, creatives: {}, ads: {} }

  try {
    // ── Kampagne 1: B Automatik — Zürich Neukunden ──────────────────────────
    logger.info('meta-setup: creating B Automatik campaign')
    const autoCampaign = await createCampaign('DT — B Automatik Zürich', 'OUTCOME_SALES', adStatus)
    created.campaigns.auto = autoCampaign.id

    // Ad Set A1 — Lookalike 1% Zürich (based on existing bookers)
    const autoLookalike = await createAdSet({
      name: 'Auto — Lookalike 1% Zürich',
      campaignId: autoCampaign.id,
      dailyBudgetCHF: 10,
      targeting: { ...AUTO_TARGETING, lookalike_specs: [{ ratio: 0.01, country: 'CH' }] },
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      billingEvent: 'IMPRESSIONS',
      status: adStatus,
      utmCampaign: 'auto_lookalike_zh',
    })
    created.adsets.auto_lookalike = autoLookalike.id

    // Ad Set A2 — Broad 17-30 Zürich Altstetten area
    const autoBroad = await createAdSet({
      name: 'Auto — Broad 17–30 Altstetten',
      campaignId: autoCampaign.id,
      dailyBudgetCHF: 10,
      targeting: AUTO_TARGETING,
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      billingEvent: 'IMPRESSIONS',
      status: adStatus,
      utmCampaign: 'auto_broad_zh',
    })
    created.adsets.auto_broad = autoBroad.id

    // ── Kampagne 2: Anhänger/BE — Zürich + Lachen ───────────────────────────
    logger.info('meta-setup: creating Anhänger/BE campaign')
    const anhaengerCampaign = await createCampaign('DT — Anhänger BE Zürich+Lachen', 'OUTCOME_LEADS', adStatus)
    created.campaigns.anhaenger = anhaengerCampaign.id

    // GSC: "anhänger fahrschule lachen" 230 Impr. pos 19.5 — strong Lachen signal
    const anhaengerBroad = await createAdSet({
      name: 'Anhänger — Broad 25–55 Dual-Location',
      campaignId: anhaengerCampaign.id,
      dailyBudgetCHF: 12,
      targeting: ANHAENGER_TARGETING,
      optimizationGoal: 'LEAD_GENERATION',
      billingEvent: 'IMPRESSIONS',
      status: adStatus,
      utmCampaign: 'anhaenger_broad',
    })
    created.adsets.anhaenger_broad = anhaengerBroad.id

    // ── Kampagne 3: Lastwagen C/C1/CE — Lachen fokus ────────────────────────
    logger.info('meta-setup: creating Lastwagen C/CE campaign')
    const lkwCampaign = await createCampaign('DT — Lastwagen C/CE Lachen', 'OUTCOME_LEADS', adStatus)
    created.campaigns.lkw = lkwCampaign.id

    // GSC: "lastwagen fahrschule lachen" 119, "car fahrschule lachen" 143 — Lachen dominant
    const lkwBroad = await createAdSet({
      name: 'LKW C/CE — Broad 21–55 Lachen+Zürich',
      campaignId: lkwCampaign.id,
      dailyBudgetCHF: 10,
      targeting: LKW_TARGETING,
      optimizationGoal: 'LEAD_GENERATION',
      billingEvent: 'IMPRESSIONS',
      status: adStatus,
      utmCampaign: 'lkw_broad_lachen',
    })
    created.adsets.lkw_broad = lkwBroad.id

    // ── Kampagne 4: Retargeting — alle Produkte ──────────────────────────────
    logger.info('meta-setup: creating Retargeting campaign')
    const retargetingCampaign = await createCampaign('DT — Retargeting Website-Besucher', 'OUTCOME_SALES', adStatus)
    created.campaigns.retargeting = retargetingCampaign.id

    const retargetingAdSet = await createAdSet({
      name: 'Retargeting — Website 30d Dual-Location',
      campaignId: retargetingCampaign.id,
      dailyBudgetCHF: 8,
      targeting: RETARGETING_TARGETING,
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      billingEvent: 'IMPRESSIONS',
      status: adStatus,
      utmCampaign: 'retargeting_all',
    })
    created.adsets.retargeting = retargetingAdSet.id

    // ── Dynamic Creative Ads ─────────────────────────────────────────────────
    logger.info('meta-setup: creating Dynamic Creative ads')

    const adSetProductMap: Array<{ key: string; adSetId: string; product: 'auto' | 'anhaenger' | 'lastwagen' }> = [
      { key: 'auto_lookalike', adSetId: autoLookalike.id, product: 'auto' },
      { key: 'auto_broad', adSetId: autoBroad.id, product: 'auto' },
      { key: 'anhaenger_broad', adSetId: anhaengerBroad.id, product: 'anhaenger' },
      { key: 'lkw_broad', adSetId: lkwBroad.id, product: 'lastwagen' },
      { key: 'retargeting', adSetId: retargetingAdSet.id, product: 'auto' },
    ]

    for (const { key, adSetId, product } of adSetProductMap) {
      const creative = await createDynamicCreative({
        name: `DT Dynamic Creative — ${key}`,
        utmCampaign: key,
        product,
      })
      created.creatives[key] = creative.id

      const ad = await createAd(`DT Ad — ${key}`, adSetId, creative.id, adStatus)
      created.ads[key] = ad.id
      logger.info(`meta-setup: ad created for ${key}: ${ad.id}`)
    }

    logger.info('meta-setup: all campaigns created successfully', created)
    return {
      success: true,
      status: adStatus,
      note: 'All ads created as PAUSED. Review in Meta Ads Manager, add images, then activate.',
      next_steps: [
        '1. Upload images via Meta Ads Manager or /adimages endpoint',
        '2. Create Custom Audiences for retargeting in Events Manager',
        '3. Review ad copy and targeting in Ads Manager',
        '4. Set status to ACTIVE when ready',
      ],
      created,
    }
  } catch (err: any) {
    logger.error('meta-setup: failed', err?.message)
    return {
      success: false,
      error: err?.message,
      partial: created,
    }
  }
})
