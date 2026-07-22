/**
 * A/B TEST (July 2026): Direct-to-booking-page RSA vs. landing-page RSA.
 *
 * BACKGROUND:
 * User asked what a world-class Ads marketer would think about sending some
 * traffic straight to the booking tool (app.simy.ch/booking/...) instead of
 * the drivingteam.ch landing page. Analysis of the real keyword data showed
 * there is NO separate high-volume "booking intent" keyword segment to target
 * directly (all `... buchen` exact/phrase keywords have 0 impressions/clicks
 * in the last 30 days — the "too few impressions" problem from the earlier
 * exact-match experiment). All real click volume in "Fahrschule Zürich
 * Umgebung" comes from generic broad location keywords in a handful of ad
 * groups, dominated by Fahrschule Altstetten (62 clicks/30d) and Fahrschule
 * Schlieren (27 clicks/30d).
 *
 * TEST DESIGN:
 * Add a SECOND Responsive Search Ad in each of these two ad groups, with
 * IDENTICAL headlines/descriptions to the existing ad (so the landing page is
 * the only variable being tested), but pointing straight to the booking tool
 * instead of the drivingteam.ch landing page. Google Ads will serve both ads
 * within the ad group and — via the "ad group ads" performance report — you
 * can compare CTR, cost, and (once conversion tracking catches up) booking
 * completion rate per ad/final URL.
 *
 * The direct-booking final URL includes utm_source/medium/campaign/term/content
 * as static + ValueTrack params. gclid/gbraid/wbraid are appended automatically
 * by Google Ads auto-tagging (already enabled — confirmed via existing
 * attribution flows) and are picked up directly by
 * plugins/booking-session-tracking.client.ts on app.simy.ch (the "Fallback:
 * Google Ads linked directly to app.simy.ch" branch), so no cross-domain hop
 * is needed and no gclid should be lost.
 *
 * CAVEAT: RSA ad rotation for Search campaigns is fully automatic ("Optimize:
 * prefer best-performing ads") — there is no manual "rotate evenly" override
 * available via the API for standard RSA campaigns. Early on, Google will
 * lean on CTR signals; once a few conversions land, it re-weights toward
 * actual conversion performance. Read results per-ad in the Google Ads UI
 * (Ads tab, segment by "Final URL" or ad ID) rather than assuming a 50/50
 * split.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-test-direct-booking-ads \
 *     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'

interface Headline { text: string; pinnedField?: string }
interface Description { text: string; pinnedField?: string }

interface TargetAdGroup {
  id: string
  name: string
  headlines: Headline[]
  descriptions: Description[]
}

// Top-volume ad groups in "Fahrschule Zürich Umgebung" (62 + 27 clicks/30d —
// everything else in the campaign is <20 clicks/30d, too little to read a
// test on). Headlines/descriptions cloned 1:1 from the live RSA on 2026-07-22
// so the landing page is the only variable under test.
const TARGET_AD_GROUPS: TargetAdGroup[] = [
  {
    id: '197486214232',
    name: 'Fahrschule Altstetten',
    headlines: [
      { text: 'Fahrschule Altstetten' },
      { text: 'Jetzt Fahrstunden buchen' },
      { text: 'Fahrlehrer in Altstetten' },
      { text: 'Driving Team Altstetten' },
      { text: 'CHF 95.- pro Lektion' },
      { text: 'Direkte Online-Buchung' },
      { text: 'Wichtige Prüfungsrouten' },
      { text: 'Flexible Zeiten & Treffpunkte' },
      { text: 'Erfahrene Fahrlehrer' },
      { text: 'Fahrstunden für Kategorie B' },
      { text: 'Professionelle Fahrstunden' },
      { text: 'Online Termin – Sofort buchen' },
      { text: 'Führerschein Kategorie B' },
      { text: 'Schnell zum Führerschein' },
      { text: 'Fahrschule mit Automatik' },
    ],
    descriptions: [
      { text: 'Professionelle Fahrstunden in Altstetten & Umgebung. Flexible Zeiten & Online-Buchung.' },
      { text: 'CHF 95.- pro 45min · Erfahrene Fahrlehrer · Moderne Fahrzeuge · Termin online buchen!' },
      { text: 'Top-Fahrschule in Altstetten. Schnell zum Führerschein – Termin in 2 Minuten buchen.' },
      { text: 'Fahrlektionen für CHF 95.- · Online buchen · Flexible Zeiten · Dietikon & Umgebung' },
    ],
  },
  {
    id: '197337023472',
    name: 'Fahrschule Schlieren',
    headlines: [
      { text: 'Fahrschule Schlieren' },
      { text: 'Jetzt Fahrstunden buchen' },
      { text: 'Fahrlehrer in Schlieren' },
      { text: 'Driving Team Schlieren' },
      { text: 'CHF 95.- pro Lektion' },
      { text: 'Direkte Online-Buchung' },
      { text: 'Whiskeypass & Prüfungsrouten' },
      { text: 'Flexible Zeiten & Treffpunkte' },
      { text: 'Erfahrene Fahrlehrer' },
      { text: 'Fahrstunden für Kategorie B' },
      { text: 'Professionelle Fahrstunden' },
      { text: 'Online Termin – Sofort buchen' },
      { text: 'Führerschein Kategorie B' },
      { text: 'Schnell zum Führerschein' },
      { text: 'Fahrschule mit Automatik' },
    ],
    descriptions: [
      { text: 'Professionelle Fahrstunden in Schlieren & Umgebung. Flexible Zeiten & Online-Buchung.' },
      { text: 'CHF 95.- pro 45min · Erfahrene Fahrlehrer · Moderne Fahrzeuge · Termin online buchen!' },
      { text: 'Top-Fahrschule im Limmattal. Schnell zum Führerschein – Termin in 2 Minuten buchen.' },
      { text: 'Fahrlektionen für CHF 95.- · Online buchen · Flexible Zeiten · Schlieren & Umgebung' },
    ],
  },
]

const DIRECT_BOOKING_FINAL_URL =
  'https://app.simy.ch/booking/availability/driving-team' +
  '?category=B&utm_source=google&utm_medium=cpc' +
  '&utm_campaign={campaignid}&utm_term={keyword}&utm_content={adgroupid}'

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as { dry_run?: boolean }
  const dryRun = body?.dry_run !== false

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  const plan = TARGET_AD_GROUPS.map(ag => ({
    ad_group: ag.name,
    ad_group_id: ag.id,
    final_url: DIRECT_BOOKING_FINAL_URL,
    headline_count: ag.headlines.length,
    description_count: ag.descriptions.length,
  }))

  if (dryRun) {
    return { ok: true, dry_run: true, plan, message: 'Dry run complete. Set dry_run: false to create the ads.' }
  }

  const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupAds:mutate`
  const operations = TARGET_AD_GROUPS.map(ag => ({
    create: {
      adGroup: `customers/${customerId}/adGroups/${ag.id}`,
      status: 'ENABLED',
      ad: {
        finalUrls: [DIRECT_BOOKING_FINAL_URL],
        responsiveSearchAd: {
          headlines: ag.headlines,
          descriptions: ag.descriptions,
        },
      },
    },
  }))

  const res = await fetch(mutateUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ operations, partialFailure: true }),
  })
  const data = await res.json() as { results?: unknown[]; partialFailureError?: unknown }
  if (!res.ok) {
    logger.error('[gads-test-direct-booking-ads] Mutate error:', JSON.stringify(data).slice(0, 800))
    return { ok: false, error: data }
  }

  logger.info(`[gads-test-direct-booking-ads] Created ${(data.results ?? []).length} direct-booking RSAs`)

  return {
    ok: true,
    dry_run: false,
    plan,
    results: data.results ?? [],
    partial_failure_error: data.partialFailureError ?? null,
    message: 'Direct-to-booking RSAs created. Monitor per-ad performance (Final URL segment) in Google Ads UI.',
  }
})
