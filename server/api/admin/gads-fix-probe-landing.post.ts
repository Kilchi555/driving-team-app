/**
 * Point Fahrschule Zürich / Altstetten (24103567599) at the first-lesson
 * landing and drop sitelinks that leak to Preise / Team / Motorrad / VKU.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-fix-probe-landing \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 *
 *   curl -X POST https://app.simy.ch/api/admin/gads-fix-probe-landing \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const CAMPAIGN_ID = '24103567599'
const PROBE_PATH = 'auto-fahrschule-zuerich-probe'
const PROBE_URL =
  `https://drivingteam.ch/${PROBE_PATH}/` +
  '?code=ERSTE30&utm_source=google&utm_medium=cpc' +
  '&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}'
const SITELINK_URL = `https://drivingteam.ch/${PROBE_PATH}/?code=ERSTE30`
const LEAKY_SITELINK = /fahrschule-preise|auto-fahrschule-zuerich-preis|\/team\/?(\?|$)|motorrad|vku-kurs/i
const OFFER_SITELINKS = [
  {
    linkText: 'Erste Lektion CHF 65',
    description1: 'Nur die 1. Lektion',
    description2: 'danach 95.– / 45 Min',
  },
  {
    linkText: 'Jetzt online buchen',
    description1: 'Kat. B Automatik',
    description2: 'Bahnhof Altstetten',
  },
] as const

type Headline = { text: string; pinnedField?: string }
type Description = { text: string; pinnedField?: string }

function isProbeUrl(url: unknown): boolean {
  return String(url ?? '').includes(PROBE_PATH)
}

async function gaql(customerId: string, headers: Record<string, string>, query: string): Promise<any[]> {
  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`,
    { method: 'POST', headers, body: JSON.stringify({ query }) },
  )
  const data = await res.json() as any
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 500))
  const rows: any[] = []
  for (const batch of (Array.isArray(data) ? data : [data])) {
    rows.push(...(batch.results ?? []))
  }
  return rows
}

async function mutate(
  customerId: string,
  headers: Record<string, string>,
  resource: string,
  operations: object[],
  partialFailure = true,
): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/${resource}:mutate`,
    { method: 'POST', headers, body: JSON.stringify({ operations, partialFailure }) },
  )
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 500) } }
  return { ok: res.ok && !data?.partialFailureError, data }
}

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as { dry_run?: boolean }
  const dryRun = body?.dry_run !== false

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  const [adRows, kwRows, sitelinkRows] = await Promise.all([
    gaql(customerId, headers, `
      SELECT
        ad_group.id, ad_group.name, ad_group.status, ad_group.resource_name,
        ad_group_ad.resource_name, ad_group_ad.status,
        ad_group_ad.ad.resource_name, ad_group_ad.ad.final_urls,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.responsive_search_ad.path1,
        ad_group_ad.ad.responsive_search_ad.path2
      FROM ad_group_ad
      WHERE campaign.id = ${CAMPAIGN_ID}
        AND campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_ad.status = 'ENABLED'
        AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
    `),
    gaql(customerId, headers, `
      SELECT
        ad_group.name, ad_group.status,
        ad_group_criterion.resource_name,
        ad_group_criterion.status,
        ad_group_criterion.keyword.text,
        ad_group_criterion.final_urls
      FROM ad_group_criterion
      WHERE campaign.id = ${CAMPAIGN_ID}
        AND campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_criterion.status = 'ENABLED'
        AND ad_group_criterion.type = 'KEYWORD'
        AND ad_group_criterion.negative = false
    `),
    gaql(customerId, headers, `
      SELECT
        campaign_asset.resource_name, campaign_asset.status,
        asset.resource_name, asset.sitelink_asset.link_text, asset.final_urls
      FROM campaign_asset
      WHERE campaign.id = ${CAMPAIGN_ID}
        AND campaign_asset.field_type = 'SITELINK'
        AND campaign_asset.status != 'REMOVED'
    `),
  ])

  const adsPlan = adRows.map((row) => {
    const current = (row.adGroupAd?.ad?.finalUrls ?? []) as string[]
    return {
      ad_group: row.adGroup?.name ?? '',
      current,
      needs_update: !current.some(isProbeUrl),
      ad_resource_name: row.adGroupAd?.ad?.resourceName ?? '',
      ad_group_ad_resource_name: row.adGroupAd?.resourceName ?? '',
      ad_group_resource_name: row.adGroup?.resourceName ?? '',
      headlines: (row.adGroupAd?.ad?.responsiveSearchAd?.headlines ?? []).map((h: any) =>
        h.pinnedField ? { text: String(h.text ?? ''), pinnedField: h.pinnedField } : { text: String(h.text ?? '') },
      ).filter((h: Headline) => h.text) as Headline[],
      descriptions: (row.adGroupAd?.ad?.responsiveSearchAd?.descriptions ?? []).map((d: any) =>
        d.pinnedField ? { text: String(d.text ?? ''), pinnedField: d.pinnedField } : { text: String(d.text ?? '') },
      ).filter((d: Description) => d.text) as Description[],
      path1: row.adGroupAd?.ad?.responsiveSearchAd?.path1 || undefined,
      path2: row.adGroupAd?.ad?.responsiveSearchAd?.path2 || undefined,
    }
  })

  const keywordsPlan = kwRows.map((row) => {
    const current = (row.adGroupCriterion?.finalUrls ?? []) as string[]
    return {
      ad_group: row.adGroup?.name ?? '',
      keyword: row.adGroupCriterion?.keyword?.text ?? '',
      current,
      needs_update: current.length > 0 && !current.some(isProbeUrl),
      resource_name: row.adGroupCriterion?.resourceName ?? '',
    }
  }).filter((k) => k.needs_update)

  const sitelinks = sitelinkRows.map((row) => {
    const urls = (row.asset?.finalUrls ?? []) as string[]
    const text = String(row.asset?.sitelinkAsset?.linkText ?? '')
    return {
      text,
      urls,
      resource_name: row.campaignAsset?.resourceName ?? '',
      is_probe: urls.some(isProbeUrl),
      is_leaky: urls.some((u) => LEAKY_SITELINK.test(String(u))),
    }
  })
  const leakySitelinks = sitelinks.filter((s) => s.is_leaky && !s.is_probe)
  const hasProbeSitelink = sitelinks.some((s) => s.is_probe)

  const report: Record<string, unknown> = {
    ok: true,
    dry_run: dryRun,
    campaign_id: CAMPAIGN_ID,
    probe_url: PROBE_URL,
    ads: {
      total: adsPlan.length,
      already_probe: adsPlan.filter((a) => !a.needs_update).length,
      to_update: adsPlan.filter((a) => a.needs_update).map((a) => ({
        ad_group: a.ad_group,
        from: a.current,
        to: PROBE_URL,
      })),
    },
    keywords: {
      with_wrong_url: keywordsPlan.length,
      sample: keywordsPlan.slice(0, 20).map((k) => ({
        ad_group: k.ad_group,
        keyword: k.keyword,
        from: k.current,
      })),
    },
    sitelinks: {
      existing: sitelinks.map((s) => ({ text: s.text, urls: s.urls, leaky: s.is_leaky, probe: s.is_probe })),
      unlink: leakySitelinks.map((s) => s.text),
      add_offer: OFFER_SITELINKS.filter((s) => !sitelinks.some((e) => e.text === s.linkText)).map((s) => s.linkText),
    },
  }

  if (dryRun) return report

  const adsUpdated: string[] = []
  const adsErrors: unknown[] = []
  for (const ad of adsPlan.filter((a) => a.needs_update)) {
    let updated = false
    if (ad.ad_resource_name) {
      const patch = await mutate(customerId, headers, 'ads', [{
        updateMask: 'finalUrls',
        update: { resourceName: ad.ad_resource_name, finalUrls: [PROBE_URL] },
      }], false)
      if (patch.ok) {
        updated = true
      }
    }
    if (!updated) {
      if (ad.ad_group_ad_resource_name) {
        await mutate(customerId, headers, 'adGroupAds', [{ remove: ad.ad_group_ad_resource_name }], false)
      }
      const createRes = await mutate(customerId, headers, 'adGroupAds', [{
        create: {
          adGroup: ad.ad_group_resource_name,
          status: 'ENABLED',
          ad: {
            responsiveSearchAd: {
              headlines: ad.headlines,
              descriptions: ad.descriptions,
              path1: ad.path1,
              path2: ad.path2,
            },
            finalUrls: [PROBE_URL],
          },
        },
      }], false)
      if (!createRes.ok) {
        adsErrors.push({ ad_group: ad.ad_group, error: createRes.data })
        logger.warn('[gads-fix-probe-landing] RSA recreate failed', ad.ad_group, JSON.stringify(createRes.data).slice(0, 300))
        continue
      }
    }
    adsUpdated.push(ad.ad_group)
  }

  let keywordsUpdated = 0
  let keywordsError: unknown
  if (keywordsPlan.length) {
    const kwRes = await mutate(customerId, headers, 'adGroupCriteria', keywordsPlan.map((k) => ({
      updateMask: 'finalUrls',
      update: { resourceName: k.resource_name, finalUrls: [PROBE_URL] },
    })))
    if (kwRes.ok) keywordsUpdated = keywordsPlan.length
    else keywordsError = kwRes.data
  }

  const unlinked: string[] = []
  const unlinkErrors: unknown[] = []
  if (leakySitelinks.length) {
    const unlinkRes = await mutate(customerId, headers, 'campaignAssets', leakySitelinks.map((s) => ({
      remove: s.resource_name,
    })))
    if (unlinkRes.ok) unlinked.push(...leakySitelinks.map((s) => s.text))
    else unlinkErrors.push(unlinkRes.data)
  }

  const sitelinkCreates: string[] = []
  let sitelinkError: unknown
  const missingOffers = OFFER_SITELINKS.filter((s) => !sitelinks.some((e) => e.text === s.linkText))
  for (const offer of missingOffers) {
    const assetRes = await mutate(customerId, headers, 'assets', [{
      create: {
        sitelinkAsset: {
          linkText: offer.linkText,
          description1: offer.description1,
          description2: offer.description2,
        },
        finalUrls: [SITELINK_URL],
      },
    }], false)
    const assetName = assetRes.data?.results?.[0]?.resourceName
    if (!assetRes.ok || !assetName) {
      sitelinkError = assetRes.data
      break
    }
    const linkRes = await mutate(customerId, headers, 'campaignAssets', [{
      create: {
        campaign: `customers/${customerId}/campaigns/${CAMPAIGN_ID}`,
        asset: assetName,
        fieldType: 'SITELINK',
      },
    }], false)
    if (!linkRes.ok) {
      sitelinkError = linkRes.data
      break
    }
    sitelinkCreates.push(offer.linkText)
  }
  const sitelinkAction = sitelinkCreates.length
    ? `created:${sitelinkCreates.join(',')}`
    : (hasProbeSitelink ? 'already_present' : 'skipped')

  logger.info(`[gads-fix-probe-landing] ads=${adsUpdated.length} keywords=${keywordsUpdated} sitelinks_unlinked=${unlinked.length} sitelink=${sitelinkAction}`)

  return {
    ...report,
    dry_run: false,
    applied: {
      ads_updated: adsUpdated,
      ads_errors: adsErrors.length ? adsErrors : undefined,
      keywords_updated: keywordsUpdated,
      keywords_error: keywordsError,
      sitelinks_unlinked: unlinked,
      sitelinks_unlink_errors: unlinkErrors.length ? unlinkErrors : undefined,
      sitelink_offer: sitelinkAction,
      sitelink_error: sitelinkError,
    },
    ok: adsErrors.length === 0 && !keywordsError && unlinkErrors.length === 0 && !sitelinkError,
  }
})
