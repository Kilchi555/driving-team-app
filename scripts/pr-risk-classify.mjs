/**
 * PR risk classification for merge governance.
 *
 * Highest matching class wins. Unknown never collapses to green.
 * Docs/test paths stay GREEN even if the text mentions payments (copy/tests).
 *
 * CLI:
 *   node scripts/pr-risk-classify.mjs --files files.json --json out.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const RISK_RANK = {
  green: 0,
  yellow: 1,
  red: 2,
  critical: 3,
  unknown: 4,
}

export const VALID_RISKS = new Set(Object.keys(RISK_RANK))

export const RISK_LABELS = {
  green: 'risk:green',
  yellow: 'risk:yellow',
  red: 'risk:red',
  critical: 'risk:critical',
  unknown: 'risk:unknown',
}

/** Path rules. Rank is independent of array order; max() wins per file. */
export const PATH_RULES = [
  // --- CRITICAL: money, irreversible data, merge-gate itself ---
  { id: 'migrations', risk: 'critical', re: /(^|\/)(migrations|sql_migrations)\//i },
  { id: 'wallee', risk: 'critical', re: /wallee/i },
  { id: 'payment-path', risk: 'critical', re: /(^|\/)(payments?|pay)\//i },
  { id: 'payment-file', risk: 'critical', re: /payment/i },
  { id: 'wallet', risk: 'critical', re: /wallet/i },
  { id: 'credits', risk: 'critical', re: /(^|\/)credits?(\/|$)|credit[-_/]|[-_/]credit/i },
  { id: 'webhook', risk: 'critical', re: /webhook/i },
  { id: 'giftcard', risk: 'critical', re: /gift[-_]?card/i },
  { id: 'impersonation', risk: 'critical', re: /impersonat/i },
  { id: 'account-switch', risk: 'critical', re: /account[-_]?switch/i },
  { id: 'production-scripts', risk: 'critical', re: /(^|\/)server\/scripts\//i },
  { id: 'payment-recovery', risk: 'critical', re: /recover-pending/i },
  { id: 'accounting-money', risk: 'critical', re: /(^|\/)server\/api\/admin\/(accounting|invoice|credit|cash|rental-invoice)/i },
  { id: 'cash-money', risk: 'critical', re: /cash[-_]?(payment|management|control)|staff-pos|staffpos/i },
  { id: 'invoice-money', risk: 'critical', re: /invoice[-_]?(save|update|preview|create|detail)/i },
  { id: 'topup', risk: 'critical', re: /topup|top-up/i },
  { id: 'merge-governance', risk: 'critical', re: /(^|\/)\.github\/(workflows\/(auto-merge|import-reviews)\.yml|CODEOWNERS)$/i },
  { id: 'pr-risk-classifier', risk: 'critical', re: /(^|\/)scripts\/pr-risk-classify\.mjs$/i },
  { id: 'ship-to-main-rule', risk: 'red', re: /(^|\/)\.cursor\/rules\/ship-to-main\.mdc$/i },
  { id: 'repo-scripts', risk: 'yellow', re: /(^|\/)scripts\//i },

  // --- RED: authz, tenant, customer data, other GitHub automation ---
  { id: 'github-automation', risk: 'red', re: /(^|\/)\.github\//i },
  { id: 'middleware', risk: 'red', re: /(^|\/)middleware\//i },
  { id: 'rls', risk: 'red', re: /rls/i },
  { id: 'service-role', risk: 'red', re: /service[_-]?role/i },
  { id: 'auth-path', risk: 'red', re: /(^|\/)(auth|authorization)\//i },
  { id: 'auth-file', risk: 'red', re: /(^|\/)[^/]*(auth|session-persist|session-recovery|supabase-auth)[^/]*$/i },
  { id: 'tenant-isolation', risk: 'red', re: /tenant[-_]?(isolat|boundary)|useTenant|tenant-context/i },
  { id: 'admin-api', risk: 'red', re: /(^|\/)server\/api\/admin\//i },
  { id: 'admin-ui', risk: 'red', re: /(^|\/)(pages\/admin|components\/admin|layouts\/admin)\//i },
  { id: 'student-pii', risk: 'red', re: /student/i },
  { id: 'billing-pii', risk: 'red', re: /billing/i },
  { id: 'access-control', risk: 'red', re: /access[-_]?control|requireAdmin|guest-or-auth/i },

  // --- YELLOW: normal product / API surface ---
  { id: 'server', risk: 'yellow', re: /(^|\/)server\//i },
  { id: 'pages', risk: 'yellow', re: /(^|\/)pages\//i },
  { id: 'composables', risk: 'yellow', re: /(^|\/)composables\//i },
  { id: 'plugins', risk: 'yellow', re: /(^|\/)plugins\//i },
  { id: 'nuxt-config', risk: 'yellow', re: /nuxt\.config\./i },
  { id: 'package-manifest', risk: 'yellow', re: /(^|\/)package(-lock)?\.json$/i },
  { id: 'supabase', risk: 'yellow', re: /(^|\/)supabase\//i },
  { id: 'website-server', risk: 'yellow', re: /(^|\/)apps\/website\/server\//i },
  { id: 'website-pages', risk: 'yellow', re: /(^|\/)apps\/website\/pages\//i },

  // --- GREEN: docs, tests, assets, marketing copy, uncritical UI ---
  { id: 'docs', risk: 'green', re: /(^|\/)docs\//i },
  { id: 'content', risk: 'green', re: /(^|\/)content\//i },
  { id: 'markdown', risk: 'green', re: /\.md$/i },
  { id: 'tests', risk: 'green', re: /(^|\/)(__tests__|e2e)\//i },
  { id: 'test-file', risk: 'green', re: /\.(test|spec)\.(ts|js|mjs)$/i },
  { id: 'styles', risk: 'green', re: /\.(css|scss|sass)$/i },
  { id: 'assets', risk: 'green', re: /(^|\/)(public|assets)\//i },
  { id: 'image', risk: 'green', re: /\.(png|jpe?g|gif|svg|webp|ico)$/i },
  { id: 'review-data', risk: 'green', re: /(^|\/)apps\/website\/data\/curated-reviews\.json$/i },
  { id: 'website-components', risk: 'green', re: /(^|\/)apps\/website\/components\//i },
  { id: 'vue-ui', risk: 'green', re: /\.vue$/i },
  { id: 'cursor-dx', risk: 'green', re: /(^|\/)\.cursor\//i },
]

export const CONTENT_RULES = [
  { id: 'content-wallee', risk: 'critical', re: /wallee/i },
  { id: 'content-wallet', risk: 'critical', re: /\bwallet\b/i },
  { id: 'content-impersonation', risk: 'critical', re: /impersonat/i },
  { id: 'content-account-switch', risk: 'critical', re: /account[-_ ]?switch/i },
  { id: 'content-payment-webhook', risk: 'critical', re: /payment[\s_-]*webhook/i },
  { id: 'content-service-role', risk: 'red', re: /service[_-]?role/i },
  { id: 'content-rls-ddl', risk: 'red', re: /enable\s+row\s+level\s+security|create\s+policy|alter\s+policy/i },
]

export function maxRisk(risks) {
  let winner = 'green'
  let rank = -1
  for (const risk of risks) {
    if (!VALID_RISKS.has(risk)) return 'unknown'
    if (RISK_RANK[risk] > rank) {
      winner = risk
      rank = RISK_RANK[risk]
    }
  }
  return winner
}

export function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '')
}

export function isDocsOrTestPath(filePath) {
  const p = normalizePath(filePath)
  if (/(^|\/)\.github\//.test(p)) return false
  return (
    /(^|\/)docs\//i.test(p)
    || /(^|\/)content\//i.test(p)
    || /\.md$/i.test(p)
    || /(^|\/)(__tests__|e2e)\//i.test(p)
    || /\.(test|spec)\.(ts|js|mjs)$/i.test(p)
  )
}

function matchRules(rules, text) {
  return rules.filter((rule) => rule.re.test(text))
}

export function classifyFile(file) {
  const filename = normalizePath(file?.filename || file?.path || '')
  if (!filename) {
    return {
      filename: '',
      risk: 'unknown',
      reasons: [{ id: 'missing-filename', risk: 'unknown', source: 'meta' }],
    }
  }

  const reasons = []

  if (isDocsOrTestPath(filename)) {
    reasons.push({ id: 'docs-or-test', risk: 'green', source: 'path' })
    return { filename, risk: 'green', reasons }
  }

  for (const rule of matchRules(PATH_RULES, filename)) {
    reasons.push({ id: rule.id, risk: rule.risk, source: 'path' })
  }

  const patch = typeof file?.patch === 'string' ? file.patch : ''
  if (patch) {
    for (const rule of matchRules(CONTENT_RULES, patch)) {
      reasons.push({ id: rule.id, risk: rule.risk, source: 'diff' })
    }
  }

  if (reasons.length === 0) {
    reasons.push({ id: 'unclassified-path', risk: 'unknown', source: 'path' })
  }

  return {
    filename,
    risk: maxRisk(reasons.map((reason) => reason.risk)),
    reasons,
  }
}

export function parseChangedFilesInput(raw) {
  const text = String(raw ?? '').trim()
  if (!text) throw new Error('empty_files_payload')
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('malformed_files_payload')
  }
  if (!Array.isArray(parsed)) throw new Error('malformed_files_payload')
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`malformed_file_entry:${index}`)
    }
    const filename = entry.filename || entry.path
    if (typeof filename !== 'string' || !filename.trim()) {
      throw new Error(`malformed_file_entry:${index}`)
    }
    return {
      filename: normalizePath(filename),
      status: entry.status,
      patch: entry.patch,
    }
  })
}

export function parseExistingRiskLabels(labels) {
  const names = (labels || [])
    .map((label) => (typeof label === 'string' ? label : label?.name))
    .filter(Boolean)
  return names
    .filter((name) => name.startsWith('risk:'))
    .map((name) => name.slice('risk:'.length))
}

export function mergeRiskSignals({ computed, labels = [] }) {
  if (!VALID_RISKS.has(computed)) return 'unknown'
  const fromLabels = parseExistingRiskLabels(labels)
  if (fromLabels.some((risk) => !VALID_RISKS.has(risk))) return 'unknown'
  if (fromLabels.length === 0) return computed
  return maxRisk([computed, ...fromLabels])
}

export function classifyPullRequest(files, { labels = [] } = {}) {
  if (!Array.isArray(files)) {
    return {
      risk: 'unknown',
      reasons: [{ id: 'malformed-file-list', risk: 'unknown', source: 'meta' }],
      files: [],
      autoMerge: false,
    }
  }
  if (files.length === 0) {
    return {
      risk: 'unknown',
      reasons: [{ id: 'empty-change-set', risk: 'unknown', source: 'meta' }],
      files: [],
      autoMerge: false,
    }
  }

  const classifiedFiles = files.map((file) => classifyFile(file))
  const computed = maxRisk(classifiedFiles.map((file) => file.risk))
  const risk = mergeRiskSignals({ computed, labels })
  const reasons = classifiedFiles.flatMap((file) => (
    file.reasons.map((reason) => ({ ...reason, filename: file.filename }))
  ))

  return {
    risk,
    computed,
    reasons,
    files: classifiedFiles,
    autoMerge: shouldEnableAutoMerge({ risk, draft: false, classifyOk: true }),
  }
}

export function shouldEnableAutoMerge({
  risk,
  draft = false,
  classifyOk = true,
  headRepo = 'same',
  thisRepo = 'same',
} = {}) {
  return autoMergeAction({
    classifyResult: classifyOk ? 'success' : 'failure',
    risk,
    draft,
    headRepo,
    thisRepo,
  }) === 'enable'
}

export function autoMergeAction({
  classifyResult,
  risk,
  draft = false,
  headRepo,
  thisRepo,
} = {}) {
  if (!headRepo || !thisRepo || headRepo !== thisRepo) return 'disable'
  if (classifyResult !== 'success') return 'disable'
  if (draft === true || draft === 'true') return 'disable'
  if (risk !== 'green') return 'disable'
  return 'enable'
}

export function formatRiskComment(result) {
  const risk = result?.risk || 'unknown'
  const merge = risk === 'green' ? 'allowed (GREEN only)' : 'blocked'
  const lines = [
    '<!-- simy-pr-risk -->',
    '## PR risk',
    '',
    `**${risk.toUpperCase()}** — auto-merge ${merge}.`,
    '',
    'Highest matching class wins. Unknown never becomes GREEN.',
    '',
    '| Rule | Class | Source | File |',
    '| --- | --- | --- | --- |',
  ]
  const rows = (result?.reasons || []).slice(0, 40)
  if (rows.length === 0) {
    lines.push('| unclassified | unknown | meta | — |')
  } else {
    for (const row of rows) {
      const file = row.filename || '—'
      lines.push(`| \`${row.id}\` | ${row.risk} | ${row.source} | \`${file}\` |`)
    }
  }
  if ((result?.reasons || []).length > 40) {
    lines.push('', `_+${result.reasons.length - 40} more rule hits._`)
  }
  return `${lines.join('\n')}\n`
}

export function classifyFromRaw(raw, options = {}) {
  try {
    const files = parseChangedFilesInput(raw)
    return classifyPullRequest(files, options)
  } catch (error) {
    return {
      risk: 'unknown',
      reasons: [{ id: String(error?.message || 'classifier-failure'), risk: 'unknown', source: 'meta' }],
      files: [],
      autoMerge: false,
      error: String(error?.message || error),
    }
  }
}

function parseArgs(argv) {
  const args = { files: null, json: null, githubOutput: null, comment: null }
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    const value = argv[i + 1]
    if (key === '--files') args.files = value
    else if (key === '--json') args.json = value
    else if (key === '--github-output') args.githubOutput = value
    else if (key === '--comment') args.comment = value
    else continue
    i += 1
  }
  return args
}

export function runCli(argv = process.argv.slice(2), io = {
  readFileSync,
  writeFileSync,
  stdout: process.stdout,
}) {
  const args = parseArgs(argv)
  if (!args.files) {
    io.stdout.write('usage: node pr-risk-classify.mjs --files files.json [--json out.json]\n')
    return 1
  }
  const raw = io.readFileSync(args.files, 'utf8')
  const result = classifyFromRaw(raw)
  const json = `${JSON.stringify(result, null, 2)}\n`
  if (args.json) io.writeFileSync(args.json, json)
  if (args.comment) io.writeFileSync(args.comment, formatRiskComment(result))
  if (args.githubOutput) {
    const output = [
      `risk=${result.risk}`,
      `auto_merge=${result.autoMerge ? 'true' : 'false'}`,
      '',
    ].join('\n')
    io.writeFileSync(args.githubOutput, output, { flag: 'a' })
  }
  io.stdout.write(json)
  return result.error ? 1 : 0
}

const invokedDirectly = process.argv[1]
  && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])

if (invokedDirectly) {
  process.exit(runCli())
}
