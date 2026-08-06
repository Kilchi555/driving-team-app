/**
 * Fix RSA creatives on "Fahrschule Zürich / Altstetten":
 * replace "Probestunde" (not offered) with a clear booking CTA.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-fix-zuerich-altstetten-creatives \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false }'
 */

import { defineEventHandler, readBody } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const CAMPAIGN_ID = '24103567599'
const LANDING_PAGE = 'https://drivingteam.ch/auto-fahrschule-zuerich/'

const CREATIVES: Record<string, {
  headlines: Array<{ text: string; pinnedField?: string }>
  descriptions: Array<{ text: string; pinnedField?: string }>
  path1: string
  path2: string
}> = {
  'Fahrschule Zürich': {
    headlines: [
      { text: 'Fahrschule Zürich', pinnedField: 'HEADLINE_1' },
      { text: 'Driving Team Altstetten', pinnedField: 'HEADLINE_2' },
      { text: 'Online Termin buchen' },
      { text: 'Fahrstunde ab CHF 95' },
      { text: 'Flexibel & professionell' },
      { text: 'Jetzt Termin sichern' }, // was: Probestunde (not offered)
      { text: 'Kat. B Automatik & Schaltung' },
    ],
    descriptions: [
      { text: 'Fahrschule in Zürich Altstetten — online buchbar, klare Preise, erfahrene Fahrlehrer.', pinnedField: 'DESCRIPTION_1' },
      { text: 'Driving Team: Termin in 2 Minuten online. Standort Altstetten, gut erreichbar.' },
    ],
    path1: 'Fahrschule',
    path2: 'Zuerich',
  },
  'Fahrschule Altstetten': {
    headlines: [
      { text: 'Fahrschule Altstetten', pinnedField: 'HEADLINE_1' },
      { text: 'Driving Team Zürich', pinnedField: 'HEADLINE_2' },
      { text: 'Online Termin buchen' },
      { text: 'Fahrstunde ab CHF 95' },
      { text: 'Direkt in Altstetten' },
      { text: 'Jetzt buchen' },
      { text: 'Kat. B — Auto' },
    ],
    descriptions: [
      { text: 'Fahrschule Altstetten: flexible Fahrstunden, online buchbar, fairer Preis.', pinnedField: 'DESCRIPTION_1' },
      { text: 'Driving Team Zürich — Standort Altstetten. Termin in wenigen Klicks sichern.' },
    ],
    path1: 'Altstetten',
    path2: 'Buchen',
  },
}

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun = body?.dry_run !== false

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId
  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupAds:mutate`

  const query = `
    SELECT
      campaign.id,
      ad_group.id,
      ad_group.name,
      ad_group_ad.resource_name,
      ad_group_ad.ad.resource_name,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.final_urls
    FROM ad_group_ad
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group_ad.status != 'REMOVED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
  `

  const searchRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const searchData = await searchRes.json() as any[]
  const rows: any[] = []
  for (const batch of (Array.isArray(searchData) ? searchData : [])) {
    rows.push(...(batch.results ?? []))
  }

  const plan = rows.map((row) => {
    const adGroupName = row.adGroup?.name ?? ''
    const creative = CREATIVES[adGroupName]
    const headlines = (row.adGroupAd?.ad?.responsiveSearchAd?.headlines ?? []).map((h: any) => h.text)
    return {
      ad_group: adGroupName,
      ad_group_id: String(row.adGroup?.id ?? ''),
      ad_group_ad_resource_name: row.adGroupAd?.resourceName,
      current_headlines: headlines,
      has_probestunde: headlines.some((h: string) => /probestunde/i.test(h)),
      will_update: !!creative,
      new_headlines: creative?.headlines.map(h => h.text) ?? null,
    }
  })

  if (dryRun) {
    return { ok: true, dry_run: true, plan }
  }

  const results: any[] = []
  const errors: any[] = []

  for (const row of rows) {
    const adGroupName = row.adGroup?.name ?? ''
    const creative = CREATIVES[adGroupName]
    if (!creative || !row.adGroupAd?.resourceName) continue

    const adGroupResourceName = `customers/${customerId}/adGroups/${row.adGroup.id}`

    const removeRes = await fetch(mutateUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ operations: [{ remove: row.adGroupAd.resourceName }] }),
    })
    const removeData = await removeRes.json() as any
    if (!removeRes.ok) {
      errors.push({ ad_group: adGroupName, step: 'remove', error: removeData })
      continue
    }

    const createRes = await fetch(mutateUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operations: [{
          create: {
            adGroup: adGroupResourceName,
            status: 'ENABLED',
            ad: {
              responsiveSearchAd: {
                headlines: creative.headlines,
                descriptions: creative.descriptions,
                path1: creative.path1,
                path2: creative.path2,
              },
              finalUrls: [LANDING_PAGE],
            },
          },
        }],
      }),
    })
    const createData = await createRes.json() as any
    if (!createRes.ok) {
      errors.push({ ad_group: adGroupName, step: 'create', error: createData })
      continue
    }

    results.push({
      ad_group: adGroupName,
      updated: true,
      new_headlines: creative.headlines.map(h => h.text),
    })
  }

  return {
    ok: errors.length === 0,
    dry_run: false,
    updated: results.length,
    results,
    errors: errors.length ? errors : undefined,
  }
})
