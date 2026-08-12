/**
 * One-shot runner for Auto ZH Ads optimize (no Nuxt required).
 * Loads .env.vercel and applies the same mutations as gads-optimize-auto-zh.
 *
 * Usage:
 *   node --env-file=.env.vercel server/scripts/run-gads-optimize-auto-zh.mjs --dry-run
 *   node --env-file=.env.vercel server/scripts/run-gads-optimize-auto-zh.mjs --apply
 *   node --env-file=.env.vercel server/scripts/run-gads-optimize-auto-zh.mjs --apply --budget=55
 */

const GADS_VERSION = 'v23'
const ALTSTETTEN_ID = '24103567599'
const UMGEBUNG_ID = '23868553846'
const AG_LOCAL = 'AG_Local'
const AG_PROBE = 'AG_Probe'

const AUTO_ZH_NEGATIVES = [
  'regensdorf', 'fahrschule regensdorf', 'koch', 'fahrschule koch', 'koch fahrschule',
  'gianni sebestin', 'sebestin', 'gabi senn', 'fahrmittesta', 'fahrschule fahrmittesta',
  'assr', 'assr regensdorf', 'blink', 'blink ag', 'max drive', 'team humm', 'drivelab',
  'letzhgo', 'wallisellen', 'wetzikon', 'winterthur', 'uster', 'lachen',
  'motorrad', 'töff', 'toeff', 'roller', 'vespa', 'mofa', 'vku', 'pgs',
  'anhänger', 'anhaenger', 'lastwagen', 'lkw', 'czv', 'wab', 'boot', 'taxi',
  'bus fahrschule', 'theorie app', 'theorieprüfung app', 'strassenverkehrsamt',
]

const CORE_EXACT_KEYWORDS = [
  { text: 'fahrschule zürich', cpcChf: 4.2 },
  { text: 'fahrstunden zürich', cpcChf: 4.0 },
  { text: 'autofahrschule zürich', cpcChf: 4.0 },
  { text: 'auto fahrschule zürich', cpcChf: 4.0 },
  { text: 'fahrschule zürich west', cpcChf: 3.8 },
  { text: 'fahrstunden buchen zürich', cpcChf: 4.2 },
  { text: 'auto fahrstunden zürich', cpcChf: 4.0 },
]

const args = process.argv.slice(2)
const dryRun = !args.includes('--apply')
const budgetArg = args.find((a) => a.startsWith('--budget='))
const dailyBudgetChf = budgetArg ? Number(budgetArg.split('=')[1]) : null

function requireEnv(key) {
  const v = process.env[key]
  if (!v) throw new Error(`Missing env ${key}`)
  return v
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
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 600))
  const rows = []
  for (const batch of (Array.isArray(data) ? data : [data])) rows.push(...(batch.results ?? []))
  return rows
}

async function mutate(customerId, hdrs, resource, operations) {
  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/${resource}:mutate`,
    { method: 'POST', headers: hdrs, body: JSON.stringify({ operations, partialFailure: true }) },
  )
  const data = await res.json()
  return { ok: res.ok && !data?.partialFailureError, data }
}

function matchTypeLabel(mt) {
  const s = String(mt ?? '')
  if (s === '2' || s === 'EXACT') return 'EXACT'
  if (s === '3' || s === 'PHRASE') return 'PHRASE'
  if (s === '4' || s === 'BROAD') return 'BROAD'
  return s
}

async function main() {
  const accessToken = await getAccessToken()
  const hdrs = headers(accessToken)
  const { customerId, ...apiHeaders } = hdrs
  const report = { dry_run: dryRun, customerId }

  // Umgebung
  const umg = (await gaql(customerId, apiHeaders, `
    SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.id = ${UMGEBUNG_ID}
  `))[0]?.campaign
  const umgPaused = String(umg?.status) === 'PAUSED' || String(umg?.status) === '3'
  report.umgebung = { name: umg?.name, status: umg?.status, paused: umgPaused }
  if (!umgPaused) {
    if (dryRun) report.umgebung.action = 'would_pause'
    else {
      const r = await mutate(customerId, apiHeaders, 'campaigns', [{
        updateMask: 'status',
        update: { resourceName: `customers/${customerId}/campaigns/${UMGEBUNG_ID}`, status: 'PAUSED' },
      }])
      report.umgebung.action = r.ok ? 'paused' : r.data
    }
  }

  // Negatives
  const existingNeg = new Set((await gaql(customerId, apiHeaders, `
    SELECT campaign_criterion.keyword.text FROM campaign_criterion
    WHERE campaign.id = ${ALTSTETTEN_ID} AND campaign_criterion.type = 'KEYWORD' AND campaign_criterion.negative = true
  `)).map((r) => String(r.campaignCriterion?.keyword?.text ?? '').toLowerCase()))
  const negsToAdd = AUTO_ZH_NEGATIVES.filter((n) => !existingNeg.has(n.toLowerCase()))
  report.negatives = { to_add: negsToAdd.length, sample: negsToAdd.slice(0, 10) }
  if (!dryRun && negsToAdd.length) {
    const ops = negsToAdd.map((text) => ({
      create: {
        campaign: `customers/${customerId}/campaigns/${ALTSTETTEN_ID}`,
        negative: true,
        keyword: { text, matchType: 'BROAD' },
      },
    }))
    let added = 0
    for (let i = 0; i < ops.length; i += 50) {
      const r = await mutate(customerId, apiHeaders, 'campaignCriteria', ops.slice(i, i + 50))
      if (r.ok) added += (r.data?.results ?? []).length
      else console.error('neg fail', JSON.stringify(r.data).slice(0, 300))
    }
    report.negatives.added = added
  }

  // AG Local
  const agRows = await gaql(customerId, apiHeaders, `
    SELECT ad_group.id, ad_group.name, ad_group.resource_name, ad_group.status
    FROM ad_group WHERE campaign.id = ${ALTSTETTEN_ID} AND ad_group.status != 'REMOVED'
  `)
  const localAg = agRows.find((r) => r.adGroup?.name === AG_LOCAL)
  if (!localAg) throw new Error('AG_Local missing')

  const kwRows = await gaql(customerId, apiHeaders, `
    SELECT ad_group.name, ad_group_criterion.resource_name,
           ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
           ad_group_criterion.status
    FROM ad_group_criterion
    WHERE campaign.id = ${ALTSTETTEN_ID}
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = false
      AND ad_group_criterion.status != 'REMOVED'
  `)

  const existingKw = new Set(kwRows.map((r) => {
    const ag = r.adGroup?.name
    const text = String(r.adGroupCriterion?.keyword?.text ?? '').toLowerCase()
    const mt = matchTypeLabel(r.adGroupCriterion?.keyword?.matchType)
    return `${ag}|${text}|${mt}`
  }))

  const toCreate = CORE_EXACT_KEYWORDS.filter(
    (kw) => !existingKw.has(`${AG_LOCAL}|${kw.text.toLowerCase()}|EXACT`),
  )
  report.core_exact = { would_add: toCreate.map((k) => k.text) }

  // Also re-enable paused Exact on AG_Local / any AG for these texts
  const reenable = []
  for (const kw of CORE_EXACT_KEYWORDS) {
    for (const row of kwRows) {
      const text = String(row.adGroupCriterion?.keyword?.text ?? '').toLowerCase()
      const mt = matchTypeLabel(row.adGroupCriterion?.keyword?.matchType)
      const st = String(row.adGroupCriterion?.status)
      if (text !== kw.text.toLowerCase() || mt !== 'EXACT') continue
      if (st === 'PAUSED' || st === '3') {
        reenable.push(`${row.adGroup?.name}: ${kw.text}`)
        if (!dryRun) {
          await mutate(customerId, apiHeaders, 'adGroupCriteria', [{
            updateMask: 'status',
            update: { resourceName: row.adGroupCriterion.resourceName, status: 'ENABLED' },
          }])
        }
      }
    }
  }
  report.core_exact.re_enabled = reenable

  if (!dryRun && toCreate.length) {
    const ops = toCreate.map((kw) => ({
      create: {
        adGroup: localAg.adGroup.resourceName,
        status: 'ENABLED',
        keyword: { text: kw.text, matchType: 'EXACT' },
        cpcBidMicros: String(Math.round(kw.cpcChf * 1_000_000)),
      },
    }))
    const r = await mutate(customerId, apiHeaders, 'adGroupCriteria', ops)
    report.core_exact.added = r.ok ? (r.data?.results ?? []).length : 0
    report.core_exact.ok = r.ok
    if (!r.ok) report.core_exact.detail = r.data
  }

  // Pause broad probe KW
  report.pause = []
  for (const row of kwRows) {
    if (row.adGroup?.name !== AG_PROBE) continue
    if (String(row.adGroupCriterion?.keyword?.text ?? '').toLowerCase() !== 'erste fahrstunde') continue
    if (matchTypeLabel(row.adGroupCriterion?.keyword?.matchType) !== 'PHRASE') continue
    const st = String(row.adGroupCriterion?.status)
    if (st === 'PAUSED' || st === '3') {
      report.pause.push({ text: 'erste fahrstunde', action: 'already_paused' })
      continue
    }
    if (dryRun) report.pause.push({ text: 'erste fahrstunde', action: 'would_pause' })
    else {
      const r = await mutate(customerId, apiHeaders, 'adGroupCriteria', [{
        updateMask: 'status',
        update: { resourceName: row.adGroupCriterion.resourceName, status: 'PAUSED' },
      }])
      report.pause.push({ text: 'erste fahrstunde', action: r.ok ? 'paused' : 'failed', detail: r.ok ? undefined : r.data })
    }
  }

  // Budget
  const camp = (await gaql(customerId, apiHeaders, `
    SELECT campaign.status, campaign_budget.resource_name, campaign_budget.amount_micros
    FROM campaign WHERE campaign.id = ${ALTSTETTEN_ID}
  `))[0]
  const currentBudget = Math.round((camp?.campaignBudget?.amountMicros ?? 0) / 1e4) / 100
  report.budget = { current_chf: currentBudget }
  if (dailyBudgetChf != null) {
    report.budget.target_chf = dailyBudgetChf
    if (!dryRun && camp?.campaignBudget?.resourceName && dailyBudgetChf !== currentBudget) {
      const r = await mutate(customerId, apiHeaders, 'campaignBudgets', [{
        updateMask: 'amountMicros',
        update: {
          resourceName: camp.campaignBudget.resourceName,
          amountMicros: Math.round(dailyBudgetChf * 1_000_000),
        },
      }])
      report.budget.applied = r.ok
    } else if (dryRun) {
      report.budget.action = dailyBudgetChf === currentBudget ? 'unchanged' : 'would_update'
    }
  }

  // Ensure campaign enabled
  const campStatus = String(camp?.campaign?.status ?? '')
  if (campStatus !== 'ENABLED' && campStatus !== '2') {
    if (dryRun) report.campaign_enable = 'would_enable'
    else {
      const r = await mutate(customerId, apiHeaders, 'campaigns', [{
        updateMask: 'status',
        update: { resourceName: `customers/${customerId}/campaigns/${ALTSTETTEN_ID}`, status: 'ENABLED' },
      }])
      report.campaign_enable = r.ok
    }
  } else report.campaign_enable = 'already_enabled'

  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
