/**
 * Update RSA final URLs per ad group so location-specific ads land on
 * the correct drivingteam.ch pages (critical for Quality Score + conversions).
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-fix-landing-urls \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true, "preset": "zuerich_locations" }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const BASE = 'https://drivingteam.ch'

const ZUERICH_LOCATION_URLS: Record<string, string> = {
  'Fahrschule Schlieren': `${BASE}/fahrschule-schlieren/`,
  'Fahrschule Dietikon': `${BASE}/fahrschule-dietikon/`,
  'Fahrschule Birmensdorf': `${BASE}/fahrschule-birmensdorf/`,
  'Fahrschule Altstetten': `${BASE}/`,
  'Fahrschule Urdorf': `${BASE}/`,
  'Fahrschule Uitikon': `${BASE}/fahrschule-birmensdorf/`,
  'Fahrschule Spreitenbach': `${BASE}/fahrschule-spreitenbach/`,
}

const MOTORRAD_ZUERICH_URLS: Record<string, string> = {
  'Motorrad Grundkurs Zürich': `${BASE}/motorrad-grundkurs-zuerich/`,
  'Motorrad Kategorie A': `${BASE}/motorrad-grundkurs-zuerich/`,
  'Motorrad Grundkurs Standort': `${BASE}/motorrad-grundkurs-altstetten/`,
  'Motorrad Fahrstunden': `${BASE}/motorrad-fahrschule-zuerich/`,
  'Motorrad Fahren Lernen': `${BASE}/motorrad-fahrschule-zuerich/`,
  'Motorrad Fahrschule Zürich': `${BASE}/motorrad-fahrschule-zuerich/`,
}

const PRESETS: Record<string, { campaign_contains: string; url_map: Record<string, string> }> = {
  zuerich_locations: {
    campaign_contains: 'Fahrschule Zürich Umgebung',
    url_map: ZUERICH_LOCATION_URLS,
  },
  motorrad_zuerich: {
    campaign_contains: 'Motorrad',
    url_map: MOTORRAD_ZUERICH_URLS,
  },
}

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun: boolean = body?.dry_run !== false
  const preset: string = body?.preset ?? 'zuerich_locations'

  const presetConfig = PRESETS[preset]
  if (!presetConfig) {
    return { ok: false, reason: `Unknown preset. Use: ${Object.keys(PRESETS).join(', ')}` }
  }

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId
  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`

  const query = `
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_ad.resource_name,
      ad_group_ad.ad.final_urls,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions
    FROM ad_group_ad
    WHERE ad_group_ad.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
  `

  const searchRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const searchData = await searchRes.json() as any[]

  const rows: any[] = []
  for (const batch of (Array.isArray(searchData) ? searchData : [])) {
    rows.push(...(batch.results ?? []))
  }

  const plan: Array<{
    campaign: string
    ad_group: string
    current_url: string
    new_url: string
    ad_group_ad_resource_name: string
    ad_group_resource_name: string
    headlines: Array<{ text: string; pinnedField?: string }>
    descriptions: Array<{ text: string; pinnedField?: string }>
  }> = []

  for (const row of rows) {
    const campaignName: string = row.campaign?.name ?? ''
    if (!campaignName.includes(presetConfig.campaign_contains)) continue
    if (preset === 'motorrad_zuerich' && !campaignName.toLowerCase().includes('zürich') && !campaignName.toLowerCase().includes('zurich')) {
      continue
    }

    const adGroupName: string = row.adGroup?.name ?? ''
    const targetUrl = presetConfig.url_map[adGroupName]
    if (!targetUrl) continue

    const currentUrls: string[] = row.adGroupAd?.ad?.finalUrls ?? []
    const currentUrl = currentUrls[0] ?? ''
    if (currentUrl.replace(/\/$/, '') === targetUrl.replace(/\/$/, '')) continue

    const adGroupAdResourceName: string = row.adGroupAd?.resourceName ?? ''
    const adGroupId = adGroupAdResourceName.split('/adGroupAds/')[1]?.split('~')[0]
    if (!adGroupId) continue

    plan.push({
      campaign: campaignName,
      ad_group: adGroupName,
      current_url: currentUrl,
      new_url: targetUrl,
      ad_group_ad_resource_name: adGroupAdResourceName,
      ad_group_resource_name: `customers/${customerId}/adGroups/${adGroupId}`,
      headlines: (row.adGroupAd?.ad?.responsiveSearchAd?.headlines ?? []).map((h: any) =>
        h.pinnedField ? { text: h.text, pinnedField: h.pinnedField } : { text: h.text },
      ),
      descriptions: (row.adGroupAd?.ad?.responsiveSearchAd?.descriptions ?? []).map((d: any) =>
        d.pinnedField ? { text: d.text, pinnedField: d.pinnedField } : { text: d.text },
      ),
    })
  }

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      preset,
      would_update: plan.length,
      plan: plan.map(p => ({
        campaign: p.campaign,
        ad_group: p.ad_group,
        from: p.current_url,
        to: p.new_url,
      })),
    }
  }

  const mutateAdUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupAds:mutate`
  const updated: string[] = []
  const errors: any[] = []

  for (const item of plan) {
    const removeRes = await fetch(mutateAdUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ operations: [{ remove: item.ad_group_ad_resource_name }] }),
    })
    const removeData = await removeRes.json() as any
    if (!removeRes.ok) {
      errors.push({ ad_group: item.ad_group, step: 'remove', error: removeData })
      continue
    }

    const createRes = await fetch(mutateAdUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operations: [{
          create: {
            adGroup: item.ad_group_resource_name,
            status: 'ENABLED',
            ad: {
              responsiveSearchAd: {
                headlines: item.headlines,
                descriptions: item.descriptions,
              },
              finalUrls: [item.new_url],
            },
          },
        }],
      }),
    })
    const createData = await createRes.json() as any
    if (!createRes.ok) {
      errors.push({ ad_group: item.ad_group, step: 'create', error: createData })
      logger.warn(`[gads-fix-landing-urls] Failed for ${item.ad_group}:`, JSON.stringify(createData).slice(0, 300))
    } else {
      updated.push(`${item.ad_group}: ${item.current_url || '(empty)'} → ${item.new_url}`)
      logger.info(`[gads-fix-landing-urls] Updated ${item.ad_group} → ${item.new_url}`)
    }
  }

  return {
    ok: errors.length === 0,
    dry_run: false,
    preset,
    updated: updated.length,
    details: updated,
    errors: errors.length > 0 ? errors : undefined,
  }
})
