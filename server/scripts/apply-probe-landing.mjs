/**
 * Point Altstetten search ads at the first-lesson landing.
 *
 *   node --env-file=/tmp/simy-app-prod.env server/scripts/apply-probe-landing.mjs
 *   node --env-file=/tmp/simy-app-prod.env server/scripts/apply-probe-landing.mjs --apply
 */

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
  { linkText: 'Erste Lektion CHF 65', description1: 'Nur die 1. Lektion', description2: 'danach 95.– / 45 Min' },
  { linkText: 'Jetzt online buchen', description1: 'Kat. B Automatik', description2: 'Bahnhof Altstetten' },
]

const dryRun = !process.argv.includes('--apply')

function requireEnv(key) {
  const v = process.env[key]
  if (!v) throw new Error(`Missing env ${key}`)
  return v
}

function isProbeUrl(url) {
  return String(url ?? '').includes(PROBE_PATH)
}

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_ADS_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_ADS_CLIENT_SECRET'),
      refresh_token: requireEnv('GOOGLE_ADS_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`OAuth failed: ${JSON.stringify(data)}`)
  return data.access_token
}

function headers(accessToken) {
  const customerId = requireEnv('GOOGLE_ADS_CUSTOMER_ID').replace(/-/g, '')
  const loginCustomerId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || customerId).replace(/-/g, '')
  return {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': requireEnv('GOOGLE_ADS_DEVELOPER_TOKEN'),
    'login-customer-id': loginCustomerId,
    'Content-Type': 'application/json',
    customerId,
  }
}

async function gaql(customerId, hdrs, query) {
  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`,
    { method: 'POST', headers: hdrs, body: JSON.stringify({ query }) },
  )
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 800))
  const rows = []
  for (const batch of (Array.isArray(data) ? data : [data])) rows.push(...(batch.results ?? []))
  return rows
}

async function mutate(customerId, hdrs, resource, operations, partialFailure = true) {
  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/${resource}:mutate`,
    { method: 'POST', headers: hdrs, body: JSON.stringify({ operations, partialFailure }) },
  )
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 600) } }
  return { ok: res.ok && !data?.partialFailureError, data }
}

const accessToken = await getAccessToken()
const hdrs = headers(accessToken)
const { customerId } = hdrs

const [adRows, kwRows, sitelinkRows] = await Promise.all([
  gaql(customerId, hdrs, `
    SELECT
      ad_group.name, ad_group.resource_name,
      ad_group_ad.resource_name, ad_group_ad.ad.resource_name, ad_group_ad.ad.final_urls,
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
  gaql(customerId, hdrs, `
    SELECT
      ad_group.name, ad_group_criterion.resource_name,
      ad_group_criterion.keyword.text, ad_group_criterion.final_urls
    FROM ad_group_criterion
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND ad_group_criterion.status = 'ENABLED'
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = false
  `),
  gaql(customerId, hdrs, `
    SELECT
      campaign_asset.resource_name, asset.sitelink_asset.link_text, asset.final_urls
    FROM campaign_asset
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND campaign_asset.field_type = 'SITELINK'
      AND campaign_asset.status != 'REMOVED'
  `),
])

const adsPlan = adRows.map((row) => {
  const current = row.adGroupAd?.ad?.finalUrls ?? []
  return {
    ad_group: row.adGroup?.name ?? '',
    current,
    needs_update: !current.some(isProbeUrl),
    ad_resource_name: row.adGroupAd?.ad?.resourceName ?? '',
    ad_group_ad_resource_name: row.adGroupAd?.resourceName ?? '',
    ad_group_resource_name: row.adGroup?.resourceName ?? '',
    headlines: (row.adGroupAd?.ad?.responsiveSearchAd?.headlines ?? [])
      .map((h) => (h.pinnedField ? { text: h.text, pinnedField: h.pinnedField } : { text: h.text }))
      .filter((h) => h.text),
    descriptions: (row.adGroupAd?.ad?.responsiveSearchAd?.descriptions ?? [])
      .map((d) => (d.pinnedField ? { text: d.text, pinnedField: d.pinnedField } : { text: d.text }))
      .filter((d) => d.text),
    path1: row.adGroupAd?.ad?.responsiveSearchAd?.path1 || undefined,
    path2: row.adGroupAd?.ad?.responsiveSearchAd?.path2 || undefined,
  }
})

const keywordsPlan = kwRows.map((row) => {
  const current = row.adGroupCriterion?.finalUrls ?? []
  return {
    ad_group: row.adGroup?.name ?? '',
    keyword: row.adGroupCriterion?.keyword?.text ?? '',
    current,
    needs_update: current.length > 0 && !current.some(isProbeUrl),
    resource_name: row.adGroupCriterion?.resourceName ?? '',
  }
}).filter((k) => k.needs_update)

const sitelinks = sitelinkRows.map((row) => {
  const urls = row.asset?.finalUrls ?? []
  return {
    text: row.asset?.sitelinkAsset?.linkText ?? '',
    urls,
    resource_name: row.campaignAsset?.resourceName ?? '',
    is_probe: urls.some(isProbeUrl),
    is_leaky: urls.some((u) => LEAKY_SITELINK.test(String(u))),
  }
})
const leakySitelinks = sitelinks.filter((s) => s.is_leaky && !s.is_probe)
const hasProbeSitelink = sitelinks.some((s) => s.is_probe)

const report = {
  dry_run: dryRun,
  ads: adsPlan.map((a) => ({ ad_group: a.ad_group, from: a.current, update: a.needs_update })),
  keywords_wrong_url: keywordsPlan.length,
  sitelinks: sitelinks.map((s) => ({ text: s.text, urls: s.urls, probe: s.is_probe })),
  unlink: leakySitelinks.map((s) => s.text),
  add_offer_sitelink: OFFER_SITELINKS.filter((s) => !sitelinks.some((e) => e.text === s.linkText)).map((s) => s.linkText),
}

if (dryRun) {
  console.log(JSON.stringify(report, null, 2))
  process.exit(0)
}

const adsUpdated = []
const adsErrors = []
for (const ad of adsPlan.filter((a) => a.needs_update)) {
  let updated = false
  if (ad.ad_resource_name) {
    const patch = await mutate(customerId, hdrs, 'ads', [{
      updateMask: 'finalUrls',
      update: { resourceName: ad.ad_resource_name, finalUrls: [PROBE_URL] },
    }], false)
    if (patch.ok) updated = true
  }
  if (!updated) {
    if (ad.ad_group_ad_resource_name) {
      await mutate(customerId, hdrs, 'adGroupAds', [{ remove: ad.ad_group_ad_resource_name }], false)
    }
    const createRes = await mutate(customerId, hdrs, 'adGroupAds', [{
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
      continue
    }
  }
  adsUpdated.push(ad.ad_group)
}

let keywordsUpdated = 0
let keywordsError
if (keywordsPlan.length) {
  const kwRes = await mutate(customerId, hdrs, 'adGroupCriteria', keywordsPlan.map((k) => ({
    updateMask: 'finalUrls',
    update: { resourceName: k.resource_name, finalUrls: [PROBE_URL] },
  })))
  if (kwRes.ok) keywordsUpdated = keywordsPlan.length
  else keywordsError = kwRes.data
}

const unlinked = []
if (leakySitelinks.length) {
  const unlinkRes = await mutate(customerId, hdrs, 'campaignAssets', leakySitelinks.map((s) => ({
    remove: s.resource_name,
  })))
  if (unlinkRes.ok) unlinked.push(...leakySitelinks.map((s) => s.text))
  else report.unlink_error = unlinkRes.data
}

const sitelinkCreates = []
const missingOffers = OFFER_SITELINKS.filter((s) => !sitelinks.some((e) => e.text === s.linkText))
let sitelinkAction = hasProbeSitelink ? 'already_present' : 'skipped'
for (const offer of missingOffers) {
  const assetRes = await mutate(customerId, hdrs, 'assets', [{
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
    sitelinkAction = 'asset_failed'
    report.sitelink_error = assetRes.data
    break
  }
  const linkRes = await mutate(customerId, hdrs, 'campaignAssets', [{
    create: {
      campaign: `customers/${customerId}/campaigns/${CAMPAIGN_ID}`,
      asset: assetName,
      fieldType: 'SITELINK',
    },
  }], false)
  if (!linkRes.ok) {
    sitelinkAction = 'link_failed'
    report.sitelink_error = linkRes.data
    break
  }
  sitelinkCreates.push(offer.linkText)
}
if (sitelinkCreates.length) sitelinkAction = `created:${sitelinkCreates.join(',')}`

console.log(JSON.stringify({
  ...report,
  dry_run: false,
  ads_updated: adsUpdated,
  ads_errors: adsErrors,
  keywords_updated: keywordsUpdated,
  keywords_error: keywordsError,
  sitelinks_unlinked: unlinked,
  sitelink_offer: sitelinkAction,
}, null, 2))
if (adsErrors.length || keywordsError) process.exit(1)
