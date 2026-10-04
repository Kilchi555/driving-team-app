#!/usr/bin/env node
import { pathToFileURL } from 'node:url'

/**
 * Read-only SIMY review-state observer.
 *
 * Upserts one pull request comment marked `<!-- simy-review-state -->`.
 * It does not merge, approve, push, deploy, or call Supabase.
 *
 * Duplicate marker comments: the lowest comment id is canonical and is
 * updated in place. Every newer marker comment is edited into a short
 * retirement note that does not contain the marker. Comments are not
 * deleted. Running again with the same inputs leaves the canonical body
 * untouched when it already matches.
 */

const MARKER = '<!-- simy-review-state -->'
const REQUIRED_CHECK_NAMES = ['Test and lint', 'E2E login', 'Dependency review']
const NOISE_CHECK_NAMES = ['App | Default', 'App | Default | Archive - iOS']
const NOISE_REASON = 'not required by the main ruleset'
const REVIEW_SENTENCE =
  /Cursor Bugbot has reviewed your changes using default effort and found (\d+) potential issues?\./
const BUG_ID = /<!-- BUGBOT_BUG_ID:\s*([0-9a-fA-F-]{36})\s*-->/
const API = 'https://api.github.com'

export function classifyCheckRun(run) {
  if (run?.status && run.status !== 'completed') return 'pending'
  switch (run?.conclusion) {
    case 'success':
      return 'pass'
    case 'failure':
    case 'cancelled':
    case 'timed_out':
    case 'action_required':
    case 'startup_failure':
      return 'fail'
    default:
      return 'unknown'
  }
}

export function classifyCommitStatus(state) {
  switch (state) {
    case 'success':
      return 'pass'
    case 'failure':
    case 'error':
      return 'fail'
    case 'pending':
    case 'expected':
      return 'pending'
    default:
      return 'unknown'
  }
}

function checkTimestamp(run) {
  const raw = run?.completed_at || run?.started_at || run?.created_at || 0
  const value = Date.parse(raw)
  return Number.isNaN(value) ? 0 : value
}

export function collapseChecks(checkRuns = [], statuses = []) {
  const ranked = [...checkRuns].sort((a, b) => checkTimestamp(b) - checkTimestamp(a))
  const byName = new Map()
  for (const run of ranked) {
    if (!run?.name || byName.has(run.name)) continue
    byName.set(run.name, { name: run.name, status: classifyCheckRun(run) })
  }
  for (const status of statuses) {
    const name = status?.context
    if (!name || byName.has(name)) continue
    byName.set(name, { name, status: classifyCommitStatus(status.state) })
  }
  return [...byName.values()]
}

export function resolveCodeql(checks) {
  const rollup = checks.find((check) => check.name === 'CodeQL')
  if (rollup) return rollup.status
  const analyze = checks.filter((check) => check.name.startsWith('Analyze ('))
  if (analyze.length === 0) return 'unknown'
  if (analyze.some((check) => check.status === 'fail')) return 'fail'
  if (analyze.some((check) => check.status === 'pending')) return 'pending'
  if (analyze.every((check) => check.status === 'pass')) return 'pass'
  return 'unknown'
}

function safeTitle(title) {
  const cleaned = String(title).replace(/\s+/g, ' ').replace(/[[\]]/g, '').trim()
  return cleaned || null
}

function safeGithubUrl(url) {
  if (typeof url !== 'string') return null
  if (!/^https:\/\/github\.com\/[^\s)]+$/.test(url)) return null
  return url
}

export function parseBugbot({ reviews = [], threads = [], threadsTruncated = false } = {}) {
  if (threadsTruncated) {
    return { uncertain: true, findings: [] }
  }

  const activeReviews = reviews.filter((review) => {
    const body = review?.body || ''
    return body.includes('<!-- BUGBOT_REVIEW -->') && !body.includes('<!-- BUGBOT_REVIEW_STALE -->')
  })
  for (const review of activeReviews) {
    if (!REVIEW_SENTENCE.test(review.body || '')) {
      return { uncertain: true, findings: [] }
    }
  }

  const findings = []
  const seen = new Set()
  for (const thread of threads) {
    if (thread?.isResolved || thread?.isOutdated) continue
    const body = thread?.comment?.body || ''
    const idMatch = body.match(BUG_ID)
    if (!idMatch) continue
    const title = safeTitle((body.match(/^###\s+(.+)$/m) || [])[1] || '')
    const url = safeGithubUrl(thread?.comment?.url)
    if (!title || !url) return { uncertain: true, findings: [] }
    if (seen.has(idMatch[1])) continue
    seen.add(idMatch[1])
    findings.push({ title, url })
  }

  findings.sort((a, b) => a.title.localeCompare(b.title) || a.url.localeCompare(b.url))
  return { uncertain: false, findings }
}

function normalizeMergeState(status) {
  if (status == null || status === '') return null
  return String(status).toUpperCase()
}

function failedReason(names) {
  if (names.length === 1) return `Required check \`${names[0]}\` failed.`
  return `Required checks failed: ${names.map((name) => `\`${name}\``).join(', ')}.`
}

export function evaluateReviewState(input) {
  const required = input.requiredChecks || {}
  const findings = input.findings || []
  const unknownRequired = REQUIRED_CHECK_NAMES.filter((name) => required[name] === 'unknown')
  const failed = REQUIRED_CHECK_NAMES.filter((name) => required[name] === 'fail')
  const pending = REQUIRED_CHECK_NAMES.filter((name) => !required[name] || required[name] === 'pending')
  const merge = normalizeMergeState(input.mergeStateStatus)

  let nextAction = 'escalate'
  let reason = 'Review state could not be determined reliably.'

  if (input.uncertain || input.bugbotUncertain || unknownRequired.length > 0) {
    nextAction = 'escalate'
    if (input.bugbotUncertain) {
      reason = 'Bugbot output could not be parsed reliably.'
    } else if (unknownRequired.length === 1) {
      reason = `Required check \`${unknownRequired[0]}\` has an unrecognized status.`
    } else if (unknownRequired.length > 1) {
      reason = `Required checks have unrecognized statuses: ${unknownRequired.map((name) => `\`${name}\``).join(', ')}.`
    } else {
      reason = 'Review state could not be determined reliably.'
    }
  } else if (failed.length > 0) {
    nextAction = 'fix'
    reason = failedReason(failed)
  } else if (merge === 'BEHIND') {
    nextAction = 'rebase'
    reason = 'The branch is behind the base and must be updated before merge.'
  } else if (merge === 'DIRTY') {
    nextAction = 'rebase'
    reason = 'The branch conflicts with the base and must be updated before merge.'
  } else if (findings.length > 0) {
    nextAction = 'fix'
    reason = findings.length === 1 ? '1 open Bugbot finding.' : `${findings.length} open Bugbot findings.`
  } else if (pending.length > 0) {
    nextAction = 'wait'
    reason = 'Required checks are still running.'
  } else if (merge === 'DRAFT') {
    nextAction = 'wait'
    reason = 'The pull request is still a draft.'
  } else if (merge == null || merge === 'UNKNOWN') {
    nextAction = 'escalate'
    reason = 'Merge state is unknown after required checks finished.'
  } else if (merge === 'BLOCKED' || merge === 'HAS_HOOKS') {
    nextAction = 'escalate'
    reason = 'Merge state is blocked after required checks passed and no open Bugbot findings were found.'
  } else if ((merge === 'CLEAN' || merge === 'UNSTABLE') && input.mergeable === true) {
    nextAction = 'ready_for_human_merge'
    reason = 'Required checks passed, there are no open Bugbot findings, and GitHub reports the pull request mergeable. Risk is unknown, so a person still has to merge.'
  }

  const ignoredNoise = [...(input.ignoredNoise || [])].sort((a, b) => a.name.localeCompare(b.name))

  return {
    schema_version: 1,
    head_sha: input.headSha || '',
    base_sha: input.baseSha || '',
    merge_state_status: merge || 'unknown',
    required_checks: {
      'Test and lint': required['Test and lint'] || 'pending',
      'E2E login': required['E2E login'] || 'pending',
      'Dependency review': required['Dependency review'] || 'pending',
    },
    bugbot: {
      count: findings.length,
      findings: findings.map((finding) => ({ title: finding.title, url: finding.url })),
      comment_urls: findings.map((finding) => finding.url),
    },
    codeql_check: input.codeqlCheck || 'unknown',
    ignored_noise: ignoredNoise,
    risk_hint: 'unknown',
    next_action: nextAction,
    reason,
  }
}

function cell(value) {
  return String(value).replace(/\|/g, '\\|')
}

const STATUS_ICON = {
  pass: '✅',
  fail: '❌',
  pending: '⏳',
  unknown: '❔',
}

export function renderReviewComment(state) {
  const lines = [
    MARKER,
    '',
    '## SIMY Review State',
    '',
    `**Next action:** \`${state.next_action}\``,
    '',
    `**Reason:** ${state.reason}`,
    '',
    `**Risk hint:** \`${state.risk_hint}\``,
    '',
    '### Checks',
    '',
    '| Check | Status |',
    '| --- | --- |',
  ]

  for (const name of REQUIRED_CHECK_NAMES) {
    const status = state.required_checks[name]
    lines.push(`| ${cell(name)} | ${STATUS_ICON[status] || '❔'} ${status} |`)
  }
  lines.push(`| CodeQL | ${STATUS_ICON[state.codeql_check] || '❔'} ${state.codeql_check} |`)
  lines.push('', '### Bugbot', '')

  if (state.bugbot.count === 0) {
    lines.push('No open findings.')
  } else {
    lines.push(`${state.bugbot.count} open finding${state.bugbot.count === 1 ? '' : 's'}.`, '')
    state.bugbot.findings.forEach((finding, index) => {
      lines.push(`${index + 1}. [${finding.title}](${finding.url})`)
    })
  }

  lines.push('', '### Ignored noise', '')
  if (!state.ignored_noise.length) {
    lines.push('None of the known non-blocking checks are present.')
  } else {
    lines.push('| Check | Status | Reason |', '| --- | --- | --- |')
    for (const noise of state.ignored_noise) {
      lines.push(`| ${cell(noise.name)} | ${noise.status} | ${cell(noise.reason)} |`)
    }
  }

  lines.push(
    '',
    '### Merge state',
    '',
    `\`${state.merge_state_status}\``,
    '',
    '### Machine state',
    '',
    '```json',
    JSON.stringify(state, null, 2),
    '```',
    '',
  )
  return lines.join('\n')
}

export function extractMachineState(body) {
  const match = String(body).match(/```json\n([\s\S]*?)\n```/)
  if (!match) throw new Error('Review comment is missing a JSON block')
  return JSON.parse(match[1])
}

export function planCommentWrites(comments, body) {
  const marked = (comments || [])
    .filter((comment) => typeof comment?.body === 'string' && comment.body.includes(MARKER))
    .sort((a, b) => Number(a.id) - Number(b.id))

  if (marked.length === 0) {
    return { create: true, updateId: null, retireIds: [] }
  }

  const canonical = marked[0]
  return {
    create: false,
    updateId: canonical.body === body ? null : canonical.id,
    retireIds: marked.slice(1).map((comment) => comment.id),
  }
}

export function retirementBody(canonicalId) {
  return [
    'This extra SIMY review-state comment was retired so the pull request keeps one observer comment.',
    '',
    `Canonical comment id: ${canonicalId}.`,
    '',
  ].join('\n')
}

export function buildEvaluationInput({
  headSha,
  baseSha,
  mergeStateStatus,
  mergeable,
  isDraft = false,
  checkRuns = [],
  statuses = [],
  reviews = [],
  threads = [],
  threadsTruncated = false,
  checksTruncated = false,
}) {
  const checks = collapseChecks(checkRuns, statuses)
  const requiredChecks = {}
  for (const name of REQUIRED_CHECK_NAMES) {
    const found = checks.find((check) => check.name === name)
    requiredChecks[name] = found ? found.status : 'pending'
  }
  const ignoredNoise = NOISE_CHECK_NAMES.flatMap((name) => {
    const found = checks.find((check) => check.name === name)
    if (!found) return []
    return [{ name, status: found.status, reason: NOISE_REASON }]
  })
  const bugbot = parseBugbot({ reviews, threads, threadsTruncated })
  let resolvedMerge = normalizeMergeState(mergeStateStatus)
  if (isDraft && resolvedMerge !== 'BEHIND' && resolvedMerge !== 'DIRTY') {
    resolvedMerge = 'DRAFT'
  }

  return {
    headSha,
    baseSha,
    mergeStateStatus: resolvedMerge,
    mergeable,
    requiredChecks,
    codeqlCheck: resolveCodeql(checks),
    ignoredNoise,
    findings: bugbot.findings,
    bugbotUncertain: bugbot.uncertain,
    uncertain: checksTruncated,
  }
}

async function github(token, path, { method = 'GET', body } = {}) {
  const response = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }
  if (!response.ok) {
    const message = payload && typeof payload === 'object' ? payload.message : text
    throw new Error(`GitHub ${method} ${path} failed (${response.status}): ${message}`)
  }
  return { payload, headers: response.headers }
}

async function githubPaginated(token, path) {
  const items = []
  let page = 1
  for (;;) {
    const separator = path.includes('?') ? '&' : '?'
    const { payload, headers } = await github(token, `${path}${separator}per_page=100&page=${page}`)
    const batch = Array.isArray(payload) ? payload : []
    items.push(...batch)
    const link = headers.get('link') || ''
    if (!link.includes('rel="next"') || batch.length === 0) break
    page += 1
    if (page > 20) break
  }
  return items
}

const REVIEW_QUERY = `
  query($owner: String!, $name: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        headRefOid
        baseRefOid
        isDraft
        mergeable
        mergeStateStatus
        reviews(last: 50) {
          nodes { body }
        }
        reviewThreads(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            isResolved
            isOutdated
            comments(first: 1) {
              nodes { body url }
            }
          }
        }
      }
    }
  }
`

function mapMergeable(value) {
  if (value === 'MERGEABLE') return true
  if (value === 'CONFLICTING') return false
  return null
}

async function loadPullRequest(token, owner, name, number) {
  const threads = []
  let cursor = null
  let truncated = false
  let pull = null

  for (let page = 0; page < 10; page += 1) {
    const { payload } = await github(token, '/graphql', {
      method: 'POST',
      body: {
        query: REVIEW_QUERY,
        variables: { owner, name, number, cursor },
      },
    })
    if (payload.errors?.length) {
      throw new Error(`GitHub GraphQL failed: ${payload.errors.map((error) => error.message).join('; ')}`)
    }
    pull = payload.data?.repository?.pullRequest
    if (!pull) throw new Error(`Pull request ${number} was not found`)
    const connection = pull.reviewThreads
    for (const thread of connection?.nodes || []) {
      threads.push({
        isResolved: thread.isResolved,
        isOutdated: thread.isOutdated,
        comment: thread.comments?.nodes?.[0]
          ? { body: thread.comments.nodes[0].body, url: thread.comments.nodes[0].url }
          : null,
      })
    }
    if (!connection?.pageInfo?.hasNextPage) {
      truncated = false
      break
    }
    cursor = connection.pageInfo.endCursor
    truncated = true
  }

  return {
    headSha: pull.headRefOid,
    baseSha: pull.baseRefOid,
    isDraft: pull.isDraft,
    mergeable: mapMergeable(pull.mergeable),
    mergeStateStatus: pull.mergeStateStatus,
    reviews: pull.reviews?.nodes || [],
    threads,
    threadsTruncated: truncated,
  }
}

async function loadChecks(token, owner, name, sha) {
  const runs = []
  let page = 1
  let truncated = false
  let total = Infinity
  while (runs.length < total) {
    const { payload } = await github(
      token,
      `/repos/${owner}/${name}/commits/${sha}/check-runs?per_page=100&page=${page}`,
    )
    total = payload.total_count ?? 0
    const batch = payload.check_runs || []
    runs.push(...batch)
    if (batch.length === 0 || runs.length >= total) break
    page += 1
    if (page > 10) {
      truncated = true
      break
    }
  }
  const { payload: statusPayload } = await github(token, `/repos/${owner}/${name}/commits/${sha}/status`)
  return { checkRuns: runs, statuses: statusPayload.statuses || [], checksTruncated: truncated }
}

async function listOpenPullNumbers(token, owner, name, sha) {
  const pulls = await githubPaginated(token, `/repos/${owner}/${name}/commits/${sha}/pulls`)
  return pulls.filter((pull) => pull.state === 'open').map((pull) => pull.number)
}

async function publish(token, owner, name, number, body) {
  const comments = await githubPaginated(token, `/repos/${owner}/${name}/issues/${number}/comments`)
  const plan = planCommentWrites(comments, body)
  const canonicalId = plan.updateId || comments
    .filter((comment) => typeof comment.body === 'string' && comment.body.includes(MARKER))
    .sort((a, b) => Number(a.id) - Number(b.id))[0]?.id

  if (plan.create) {
    await github(token, `/repos/${owner}/${name}/issues/${number}/comments`, {
      method: 'POST',
      body: { body },
    })
    console.log(`Created review-state comment on #${number}`)
    return
  }

  if (plan.updateId != null) {
    await github(token, `/repos/${owner}/${name}/issues/comments/${plan.updateId}`, {
      method: 'PATCH',
      body: { body },
    })
    console.log(`Updated review-state comment ${plan.updateId} on #${number}`)
  } else {
    console.log(`Review state unchanged on #${number}`)
  }

  for (const id of plan.retireIds) {
    await github(token, `/repos/${owner}/${name}/issues/comments/${id}`, {
      method: 'PATCH',
      body: { body: retirementBody(canonicalId) },
    })
    console.log(`Retired duplicate review-state comment ${id} on #${number}`)
  }
}

async function updateOne(token, owner, name, number) {
  const pull = await loadPullRequest(token, owner, name, number)
  const checks = await loadChecks(token, owner, name, pull.headSha)
  const input = buildEvaluationInput({ ...pull, ...checks })
  const state = evaluateReviewState(input)
  const body = renderReviewComment(state)
  extractMachineState(body)
  await publish(token, owner, name, number, body)
  console.log(`#${number} next_action=${state.next_action}`)
}

async function resolvePullNumbers(token, owner, name) {
  const requested = String(process.env.PR_NUMBER || '').trim()
  if (requested) {
    const number = Number(requested)
    if (!Number.isInteger(number)) throw new Error('PR_NUMBER must be an integer')
    return [number]
  }
  if (process.env.HEAD_SHA) return listOpenPullNumbers(token, owner, name, process.env.HEAD_SHA)
  throw new Error('PR_NUMBER or HEAD_SHA is required')
}

async function main() {
  const token = process.env.GITHUB_TOKEN
  const repository = process.env.GITHUB_REPOSITORY || ''
  const [owner, name] = repository.split('/')
  if (!token || !owner || !name) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required')
  }

  const numbers = await resolvePullNumbers(token, owner, name)

  if (numbers.length === 0) {
    console.log('No open pull request to update.')
    return
  }

  for (const number of numbers) {
    await updateOne(token, owner, name, number)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}

export {
  MARKER,
  REQUIRED_CHECK_NAMES,
  NOISE_CHECK_NAMES,
  NOISE_REASON,
}
