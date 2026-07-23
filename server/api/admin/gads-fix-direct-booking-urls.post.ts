/**
 * FIX (2026-07-23): The direct-to-booking RSAs created for the A/B test were
 * DISAPPROVED by Google Ads with policy topic ONE_WEBSITE_PER_AD_GROUP — every
 * ad in an ad group must share the same domain as the other ads in that group,
 * and app.simy.ch != drivingteam.ch.
 *
 * FIX: remove the disapproved ads and recreate them pointing at the new
 * drivingteam.ch/go/buchen redirect bridge (apps/website/server/routes/go/buchen.get.ts),
 * which is same-domain (policy-compliant) and 302-redirects straight to the
 * booking tool with attribution preserved.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-fix-direct-booking-urls \
 *     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'

interface Headline { text: string; pinnedField?: string }
interface Description { text: string; pinnedField?: string }

interface DisapprovedAd {
  adGroupId: string
  adGroupName: string
  adResourceName: string
  headlines: Headline[]
  descriptions: Description[]
}

// The two disapproved ads from gads-test-direct-booking-ads (2026-07-22).
const DISAPPROVED_ADS: DisapprovedAd[] = [
  {
    adGroupId: '197486214232',
    adGroupName: 'Fahrschule Altstetten',
    adResourceName: 'customers/1916698119/adGroupAds/197486214232~818002748600',
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
    adGroupId: '197337023472',
    adGroupName: 'Fahrschule Schlieren',
    adResourceName: 'customers/1916698119/adGroupAds/197337023472~818002748603',
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

const NEW_FINAL_URL =
  'https://drivingteam.ch/go/buchen' +
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

  const plan = DISAPPROVED_ADS.map(ad => ({
    ad_group: ad.adGroupName,
    remove: ad.adResourceName,
    new_final_url: NEW_FINAL_URL,
  }))

  if (dryRun) {
    return { ok: true, dry_run: true, plan, message: 'Dry run complete. Set dry_run: false to apply.' }
  }

  const removeUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupAds:mutate`
  const removeOps = DISAPPROVED_ADS.map(ad => ({ remove: ad.adResourceName }))
  const removeRes = await fetch(removeUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ operations: removeOps, partialFailure: true }),
  })
  const removeData = await removeRes.json() as { results?: unknown[] }
  if (!removeRes.ok) {
    logger.error('[gads-fix-direct-booking-urls] Remove error:', JSON.stringify(removeData).slice(0, 800))
    return { ok: false, step: 'remove', error: removeData }
  }

  const createUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupAds:mutate`
  const createOps = DISAPPROVED_ADS.map(ad => ({
    create: {
      adGroup: `customers/${customerId}/adGroups/${ad.adGroupId}`,
      status: 'ENABLED',
      ad: {
        finalUrls: [NEW_FINAL_URL],
        responsiveSearchAd: {
          headlines: ad.headlines,
          descriptions: ad.descriptions,
        },
      },
    },
  }))
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ operations: createOps, partialFailure: true }),
  })
  const createData = await createRes.json() as { results?: unknown[]; partialFailureError?: unknown }
  if (!createRes.ok) {
    logger.error('[gads-fix-direct-booking-urls] Create error:', JSON.stringify(createData).slice(0, 800))
    return { ok: false, step: 'create', error: createData }
  }

  logger.info(`[gads-fix-direct-booking-urls] Recreated ${(createData.results ?? []).length} ads with drivingteam.ch bridge URL`)

  return {
    ok: true,
    dry_run: false,
    removed: removeData.results ?? [],
    created: createData.results ?? [],
    partial_failure_error: createData.partialFailureError ?? null,
    message: 'Direct-booking ads recreated with policy-compliant drivingteam.ch/go/buchen bridge URL.',
  }
})
