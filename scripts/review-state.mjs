#!/usr/bin/env node
import { pathToFileURL } from 'node:url'

/**
 * Read-only SIMY review-state observer.
 *
 * The comment it publishes is an observation cache, not authority and not
 * permission to merge, push, or modify code. cache.may_merge and
 * cache.may_automate are always false. ready_for_human_merge means only
 * that this observation found the conditions for a human merge decision
 * at the observed head.
 *
 * Publication barrier (not transactional; GitHub issue comments have no
 * compare-and-swap):
 *
 *   OBSERVE → EVALUATE → RE-READ HEAD → PUBLISH ONLY IF STILL CURRENT
 *
 * 1. Re-read the pull request head immediately before a write. If it
 *    differs from the evaluated head, write nothing.
 * 2. Re-read marker comments immediately before a write. The canonical
 *    marker is the one with the greatest (observed_at, evaluation_id).
 *    An older observation must not update that comment.
 * 3. After a write, reconcile again. If the head changed, retire only
 *    the comment this run just published. If another marker is newer,
 *    retire the older ones. Retirement removes the marker, so a retired
 *    comment is not controller state.
 * 4. SIGINT/SIGTERM (Actions cancellation) sets a flag that is checked
 *    before every write. A cancelled run does not publish just because
 *    a later statement runs.
 *
 * Two creates can still both POST. Until reconcile runs, a consumer must
 * ignore every marker except the canonical (observed_at, evaluation_id)
 * pair. A duplicate or a comment whose head_sha is not the live head is
 * not actionable.
 *
 * Thread freshness is eventual. GitHub Actions has no
 * pull_request_review_thread event. Threads are re-read on pull_request,
 * review, review-comment, watched check_run, and a 15-minute schedule.
 * freshness.live is false. freshness.max_lag_minutes matches that cron.
 *
 * Required check names are the contexts on ruleset "Protect main —
 * Required CI" as of 2026-09-26. When the ruleset can be read, its
 * contexts are what this run evaluates. A missing name stays pending.
 * A mismatch or an unreadable ruleset cannot become
 * ready_for_human_merge. A cancelled check on the evaluated head is
 * wait, not fix: cancellation is not a code change for an executor.
 */

const MARKER = '<!-- simy-review-state -->'
const SUPPORTED_SCHEMA_VERSION = 2
const THREAD_REFRESH_MINUTES = 15
const EXPECTED_RULESET_NAME = 'Protect main — Required CI'
const REQUIRED_CHECK_NAMES = ['Test and lint', 'E2E login', 'Dependency review']
const NOISE_CHECK_NAMES = ['App | Default', 'App | Default | Archive - iOS']
const NOISE_REASON = 'not required by the main ruleset'
const REVIEW_SENTENCE =
  /Cursor Bugbot has reviewed your changes using default effort and found (\d+) potential issues?\./
const BUG_ID = /<!-- BUGBOT_BUG_ID:\s*([0-9a-fA-F-]{36})\s*-->/
const API = 'https://api.github.com'
const NEXT_ACTIONS = ['wait', 'fix', 'rebase', 'escalate', 'ready_for_human_merge']

let stopRequested = false

export function requestStop() {
  stopRequested = true
}

export function clearStopForTests() {
  stopRequested = false
}

export function installStopHandlers() {
  const stop = () => {
    stopRequested = true
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
}

function halted() {
  return stopRequested
}

export function classifyCheckRun(run) {
  if (run?.status && run.status !== 'completed') return 'pending'
  switch (run?.conclusion) {
    case 'success':
      return 'pass'
    case 'cancelled':
      return 'cancelled'
    case 'failure':
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
  const analyze = checks.filter((check) => check.name.startsWith('Analyze ('))
  let status = 'unknown'
  if (rollup) status = rollup.status
  else if (analyze.length === 0) status = 'unknown'
  else if (analyze.some((check) => check.status === 'fail')) status = 'fail'
  else if (analyze.some((check) => check.status === 'pending')) status = 'pending'
  else if (analyze.every((check) => check.status === 'pass')) status = 'pass'

  if (analyze.some((check) => check.status === 'fail')) status = 'fail'
  if (rollup && analyze.length > 0) {
    const statuses = new Set([rollup.status, ...analyze.map((check) => check.status)])
    if (statuses.has('fail')) status = 'fail'
    else if (statuses.size > 1 && status === 'pass') status = 'unknown'
  } else if (status === 'pass' && analyze.some((check) => check.status !== 'pass')) {
    status = 'unknown'
  }

  return {
    gate: 'not_required',
    status,
    clean: status === 'pass',
  }
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

function bugbotAuthor(login) {
  return login === 'cursor' || login === 'cursor[bot]'
}

function bugbotLooking(comment) {
  const body = comment?.body || ''
  return bugbotAuthor(comment?.author) || body.includes('BUGBOT_BUG_ID') || body.includes('<!-- BUGBOT')
}

function parseFinding(comment) {
  const body = comment?.body || ''
  const idMatch = body.match(BUG_ID)
  if (!idMatch) return null
  const title = safeTitle((body.match(/^###\s+(.+)$/m) || [])[1] || '')
  const url = safeGithubUrl(comment?.url)
  if (!title || !url) return { invalid: true }
  return { invalid: false, id: idMatch[1], title, url }
}

export function analyzeReviews({ reviews = [], threads = [], threadsTruncated = false, reviewsTruncated = false } = {}) {
  const emptyThreads = {
    unresolved_count: 0,
    unresolved_non_bugbot_count: 0,
    unresolved_bugbot_count: 0,
    uncertain: Boolean(threadsTruncated || reviewsTruncated),
  }
  if (threadsTruncated || reviewsTruncated) {
    return {
      uncertain: true,
      findings: [],
      parsedUnresolvedCount: 0,
      summaryCount: null,
      reviewThreads: emptyThreads,
    }
  }

  const activeReviews = (reviews || []).filter((review) => {
    const body = review?.body || ''
    return body.includes('<!-- BUGBOT_REVIEW -->') && !body.includes('<!-- BUGBOT_REVIEW_STALE -->')
  })
  let formatUncertain = false
  let summaryCount = null
  for (const review of activeReviews) {
    const match = REVIEW_SENTENCE.exec(review.body || '')
    if (!match) {
      formatUncertain = true
      continue
    }
    summaryCount = Math.max(summaryCount ?? 0, Number(match[1]))
  }

  const findings = []
  const seen = new Set()
  let parsedUnresolvedCount = 0
  let unresolvedBugbot = 0
  let unresolvedNonBugbot = 0
  let unparsedBugbot = false

  for (const thread of threads || []) {
    if (thread?.isResolved) continue
    const comment = thread?.comment
    const parsed = parseFinding(comment)
    const looking = bugbotLooking(comment)
    if (parsed?.invalid || (looking && !parsed)) {
      unparsedBugbot = true
      unresolvedBugbot += 1
      continue
    }
    if (parsed) {
      unresolvedBugbot += 1
      if (!seen.has(parsed.id)) {
        seen.add(parsed.id)
        parsedUnresolvedCount += 1
        if (!thread?.isOutdated) findings.push({ title: parsed.title, url: parsed.url })
      }
      continue
    }
    unresolvedNonBugbot += 1
  }

  findings.sort((a, b) => a.title.localeCompare(b.title) || a.url.localeCompare(b.url))
  const countUncertain = summaryCount != null && summaryCount > parsedUnresolvedCount
  const uncertain = formatUncertain || countUncertain || unparsedBugbot
  return {
    uncertain,
    findings,
    parsedUnresolvedCount,
    summaryCount,
    reviewThreads: {
      unresolved_count: unresolvedBugbot + unresolvedNonBugbot,
      unresolved_non_bugbot_count: unresolvedNonBugbot,
      unresolved_bugbot_count: unresolvedBugbot,
      uncertain,
    },
  }
}

export function parseBugbot(input) {
  const analyzed = analyzeReviews(input)
  return { uncertain: analyzed.uncertain, findings: analyzed.findings, summaryCount: analyzed.summaryCount }
}

function normalizeMergeState(status) {
  if (status == null || status === '') return null
  return String(status).toUpperCase()
}

function failedReason(names) {
  if (names.length === 1) return `Required check \`${names[0]}\` failed.`
  return `Required checks failed: ${names.map((name) => `\`${name}\``).join(', ')}.`
}

function cacheBlock() {
  return {
    authoritative: false,
    may_merge: false,
    may_modify_code: false,
    may_automate: false,
    consumer_must_revalidate: ['head_sha', 'required_checks', 'merge_state', 'review_threads', 'ruleset', 'risk_hint'],
  }
}

export function evaluateReviewState(input) {
  const names = input.requiredCheckNames?.length ? input.requiredCheckNames : REQUIRED_CHECK_NAMES
  const required = input.requiredChecks || {}
  const findings = input.findings || []
  const threads = input.reviewThreads || {
    unresolved_count: 0,
    unresolved_non_bugbot_count: 0,
    unresolved_bugbot_count: 0,
    uncertain: false,
  }
  const ruleset = input.ruleset || { verified: false, matches_expected: false }
  const unknownRequired = names.filter((name) => required[name] === 'unknown')
  const failed = names.filter((name) => required[name] === 'fail')
  const cancelled = names.filter((name) => required[name] === 'cancelled')
  const pending = names.filter((name) => !required[name] || required[name] === 'pending')
  const merge = normalizeMergeState(input.mergeStateStatus)
  const codeql = input.codeql && typeof input.codeql === 'object'
    ? { gate: 'not_required', status: input.codeql.status || 'unknown', clean: input.codeql.status === 'pass' }
    : { gate: 'not_required', status: input.codeqlCheck || 'unknown', clean: false }
  if (codeql.status !== 'pass') codeql.clean = false

  const uncertain = Boolean(
    input.uncertain
    || input.bugbotUncertain
    || input.threadsUncertain
    || threads.uncertain
    || unknownRequired.length > 0,
  )

  let nextAction = 'escalate'
  let reason = 'Review state could not be determined reliably.'

  if (uncertain) {
    nextAction = 'escalate'
    if (input.bugbotUncertain || threads.uncertain) {
      reason = 'Bugbot or review-thread output could not be parsed reliably.'
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
    reason = findings.length === 1
      ? '1 open Bugbot finding on the current head.'
      : `${findings.length} open Bugbot findings on the current head.`
  } else if ((threads.unresolved_count || 0) > 0) {
    nextAction = 'escalate'
    const nonBugbot = threads.unresolved_non_bugbot_count || 0
    reason = nonBugbot > 0
      ? `${threads.unresolved_count} unresolved review thread(s), including ${nonBugbot} non-Bugbot thread(s).`
      : `${threads.unresolved_count} unresolved review thread(s) are not an actionable current Bugbot finding.`
  } else if (pending.length > 0 || cancelled.length > 0) {
    nextAction = 'wait'
    reason = cancelled.length > 0 && pending.length === 0
      ? 'A required check on this head was cancelled. That is not a code fix; wait for a replacement run.'
      : 'Required checks are still running or have not reported yet.'
  } else if (merge === 'DRAFT') {
    nextAction = 'wait'
    reason = 'The pull request is still a draft.'
  } else if (merge == null || merge === 'UNKNOWN') {
    nextAction = 'escalate'
    reason = 'Merge state is unknown after required checks finished.'
  } else if (merge === 'BLOCKED' || merge === 'HAS_HOOKS') {
    nextAction = 'escalate'
    reason = 'Merge state is blocked after required checks passed and no open review threads were parsed.'
  } else if (!ruleset.verified || ruleset.matches_expected !== true) {
    nextAction = 'escalate'
    reason = ruleset.verified
      ? 'The active ruleset required checks do not match the expected Test and lint, E2E login, and Dependency review contexts.'
      : 'The active ruleset could not be verified, so this observation cannot call the pull request ready.'
  } else if ((merge === 'CLEAN' || merge === 'UNSTABLE') && input.mergeable === true && (threads.unresolved_count || 0) === 0) {
    nextAction = 'ready_for_human_merge'
    reason = 'This observation found the conditions for a human merge decision at this head. It is not permission to merge.'
  }

  if (!NEXT_ACTIONS.includes(nextAction)) nextAction = 'escalate'

  const requiredChecks = {}
  for (const name of names) requiredChecks[name] = required[name] || 'pending'
  const ignoredNoise = [...(input.ignoredNoise || [])].sort((a, b) => a.name.localeCompare(b.name))

  return {
    schema_version: SUPPORTED_SCHEMA_VERSION,
    cache: cacheBlock(),
    freshness: {
      review_threads: 'eventual',
      live: false,
      max_lag_minutes: THREAD_REFRESH_MINUTES,
    },
    observed_at: input.observedAt || null,
    evaluation_id: input.evaluationId || null,
    pr_number: input.prNumber ?? null,
    head_sha: input.headSha || '',
    base_sha: input.baseSha || '',
    merge_state_status: merge || 'unknown',
    mergeable: input.mergeable === true ? true : input.mergeable === false ? false : null,
    ruleset: {
      verified: Boolean(ruleset.verified),
      name: ruleset.name || EXPECTED_RULESET_NAME,
      required_checks: ruleset.required_checks || [...REQUIRED_CHECK_NAMES],
      matches_expected: ruleset.matches_expected === true,
      requires_review_thread_resolution: ruleset.requires_review_thread_resolution !== false,
    },
    required_checks: requiredChecks,
    bugbot: {
      count: findings.length,
      summary_count: input.bugbotSummaryCount ?? null,
      findings: findings.map((finding) => ({ title: finding.title, url: finding.url })),
      comment_urls: findings.map((finding) => finding.url),
      uncertain: Boolean(input.bugbotUncertain || threads.uncertain),
    },
    review_threads: {
      unresolved_count: threads.unresolved_count || 0,
      unresolved_non_bugbot_count: threads.unresolved_non_bugbot_count || 0,
      unresolved_bugbot_count: threads.unresolved_bugbot_count || 0,
      uncertain: Boolean(threads.uncertain),
    },
    codeql,
    ignored_noise: ignoredNoise,
    risk_hint: 'unknown',
    next_action: nextAction,
    reason,
  }
}

function cell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

const STATUS_ICON = {
  pass: '✅',
  fail: '❌',
  pending: '⏳',
  cancelled: '🚫',
  unknown: '❔',
}

export function renderReviewComment(state) {
  const lines = [
    MARKER,
    '',
    '## SIMY Review State',
    '',
    'This comment is an observation cache, not permission to merge, push, or modify code.',
    'Consumers must re-read the live pull request and reject a stale, duplicate, malformed, or unknown-schema comment.',
    `Canonical marker: greatest \`observed_at\`, then \`evaluation_id\`. Review threads are eventual (about ${state.freshness?.max_lag_minutes ?? THREAD_REFRESH_MINUTES} minutes), not live.`,
    '',
    `**Next action:** \`${state.next_action}\``,
    '',
    `**Reason:** ${state.reason}`,
    '',
    `**Risk hint:** \`${state.risk_hint}\``,
    '',
    `**Observed at:** \`${state.observed_at}\``,
    '',
    `**Evaluation:** \`${state.evaluation_id}\``,
    '',
    '### Checks',
    '',
    '| Check | Status |',
    '| --- | --- |',
  ]

  for (const [name, status] of Object.entries(state.required_checks || {})) {
    lines.push(`| ${cell(name)} | ${STATUS_ICON[status] || '❔'} ${status} |`)
  }
  const codeql = state.codeql || { gate: 'not_required', status: 'unknown', clean: false }
  lines.push(`| CodeQL | ${STATUS_ICON[codeql.status] || '❔'} ${codeql.status}; gate \`${codeql.gate}\`; clean \`${codeql.clean}\` |`)
  lines.push('', '### Review threads', '')
  const threads = state.review_threads || {}
  lines.push(`Unresolved: ${threads.unresolved_count ?? 0} (Bugbot ${threads.unresolved_bugbot_count ?? 0}, other ${threads.unresolved_non_bugbot_count ?? 0}).`)
  lines.push('', '### Bugbot', '')
  if (!state.bugbot || state.bugbot.count === 0) {
    lines.push('No current actionable findings.')
  } else {
    lines.push(`${state.bugbot.count} open finding${state.bugbot.count === 1 ? '' : 's'}.`, '')
    state.bugbot.findings.forEach((finding, index) => {
      lines.push(`${index + 1}. [${finding.title}](${finding.url})`)
    })
  }

  lines.push('', '### Ignored noise', '')
  if (!state.ignored_noise?.length) {
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

export function compareObservations(left, right) {
  const time = String(left?.observed_at || '').localeCompare(String(right?.observed_at || ''))
  if (time !== 0) return time
  return String(left?.evaluation_id || '').localeCompare(String(right?.evaluation_id || ''))
}

function markerRecords(comments) {
  return (comments || [])
    .filter((comment) => typeof comment?.body === 'string' && comment.body.includes(MARKER))
    .map((comment) => {
      try {
        const state = extractMachineState(comment.body)
        const invalid = !state
          || state.schema_version !== SUPPORTED_SCHEMA_VERSION
          || typeof state.observed_at !== 'string'
          || typeof state.evaluation_id !== 'string'
          || typeof state.head_sha !== 'string'
          || state.cache?.authoritative !== false
          || state.cache?.may_merge !== false
          || state.cache?.may_automate !== false
        return { id: Number(comment.id), body: comment.body, state: invalid ? null : state, invalid }
      } catch {
        return { id: Number(comment.id), body: comment.body, state: null, invalid: true }
      }
    })
}

export function selectCanonicalMarker(comments) {
  const valid = markerRecords(comments).filter((record) => !record.invalid)
  valid.sort((left, right) => compareObservations(right.state, left.state) || left.id - right.id)
  return valid[0] || null
}

export function planPublication({ observation, currentHeadSha, comments, cancelled }) {
  if (cancelled || halted()) return { action: 'skip', reason: 'cancelled', retireIds: [] }
  if (!observation?.head_sha || currentHeadSha !== observation.head_sha) {
    return { action: 'skip', reason: 'stale-head', retireIds: [] }
  }

  const marked = markerRecords(comments)
  const canonical = selectCanonicalMarker(comments)
  const retireOthers = (keepId) => marked.filter((record) => record.id !== keepId).map((record) => record.id)

  if (canonical && compareObservations(canonical.state, observation) > 0) {
    return { action: 'skip', reason: 'older-than-canonical', retireIds: retireOthers(canonical.id) }
  }
  if (canonical && compareObservations(canonical.state, observation) === 0) {
    return { action: 'skip', reason: 'already-current', retireIds: retireOthers(canonical.id) }
  }
  if (!canonical) {
    return { action: 'create', reason: 'publish', retireIds: marked.map((record) => record.id), previousBody: null }
  }
  return {
    action: 'update',
    reason: 'publish',
    updateId: canonical.id,
    previousBody: canonical.body,
    retireIds: retireOthers(canonical.id),
  }
}

export function planReconcile({ observation, currentHeadSha, comments }) {
  const marked = markerRecords(comments)
  const ours = marked.filter((record) => record.state?.evaluation_id === observation.evaluation_id)
  if (currentHeadSha !== observation.head_sha) {
    return { retireIds: ours.map((record) => record.id), keepId: null, reason: 'stale-head' }
  }
  const canonical = selectCanonicalMarker(comments)
  if (!canonical) return { retireIds: [], keepId: null, reason: 'no-canonical' }
  return {
    retireIds: marked.filter((record) => record.id !== canonical.id).map((record) => record.id),
    keepId: canonical.id,
    reason: 'canonical',
  }
}

export function retirementBody(canonical) {
  if (!canonical?.observed_at || !canonical?.evaluation_id) {
    return [
      'This SIMY review-state comment was withdrawn because the observation was stale.',
      '',
      'It is not controller state and must not be acted on.',
      '',
    ].join('\n')
  }
  return [
    'This SIMY review-state comment is not canonical.',
    '',
    'It is not controller state and must not be acted on.',
    '',
    `Canonical observed_at: ${canonical.observed_at}.`,
    `Canonical evaluation_id: ${canonical.evaluation_id}.`,
    '',
  ].join('\n')
}

export function interpretPublishedState(comments, live = {}) {
  const refused = (reason) => ({
    usable_as_cache: false,
    actionable_for_automation: false,
    may_merge: false,
    may_modify_code: false,
    may_automate: false,
    human_only: false,
    reason,
    state: null,
  })
  const list = Array.isArray(comments) ? comments : []
  const marked = list.filter((comment) => typeof comment?.body === 'string' && comment.body.includes(MARKER))
  if (marked.length === 0) return refused('missing')

  let sawMalformed = false
  let sawUnknownSchema = false
  for (const comment of marked) {
    try {
      const state = extractMachineState(comment.body)
      if (!state || state.schema_version !== SUPPORTED_SCHEMA_VERSION) sawUnknownSchema = true
    } catch {
      sawMalformed = true
    }
  }

  const canonical = selectCanonicalMarker(list)
  if (!canonical) {
    return refused(sawMalformed && !sawUnknownSchema ? 'malformed' : 'unknown_schema')
  }
  if (canonical.state.head_sha !== live.headSha) {
    return {
      ...refused('stale_head'),
      state: canonical.state,
    }
  }
  return {
    usable_as_cache: true,
    actionable_for_automation: false,
    may_merge: false,
    may_modify_code: false,
    may_automate: false,
    human_only: canonical.state.next_action === 'ready_for_human_merge',
    reason: 'cache',
    state: canonical.state,
  }
}

export function makeEvaluationId({ runId, runAttempt, prNumber, headSha, observedAt }) {
  return [runId || 'local', runAttempt || '0', prNumber, String(headSha || '').slice(0, 12), observedAt].join(':')
}

export function expectedRulesetMatches(names) {
  const actual = [...(names || [])]
  return actual.length === REQUIRED_CHECK_NAMES.length
    && REQUIRED_CHECK_NAMES.every((name) => actual.includes(name))
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
  reviewsTruncated = false,
  checksTruncated = false,
  ruleset,
  observedAt,
  evaluationId,
  prNumber,
}) {
  const checks = collapseChecks(checkRuns, statuses)
  const names = ruleset?.verified && Array.isArray(ruleset.required_checks) && ruleset.required_checks.length
    ? [...ruleset.required_checks]
    : [...REQUIRED_CHECK_NAMES]
  const requiredChecks = {}
  for (const name of names) {
    const found = checks.find((check) => check.name === name)
    requiredChecks[name] = found ? found.status : 'pending'
  }
  const ignoredNoise = NOISE_CHECK_NAMES.flatMap((name) => {
    const found = checks.find((check) => check.name === name)
    if (!found) return []
    return [{ name, status: found.status, reason: NOISE_REASON }]
  })
  const analyzed = analyzeReviews({ reviews, threads, threadsTruncated, reviewsTruncated })
  let resolvedMerge = normalizeMergeState(mergeStateStatus)
  if (isDraft && resolvedMerge !== 'BEHIND' && resolvedMerge !== 'DIRTY') resolvedMerge = 'DRAFT'
  const rulesetState = ruleset?.verified
    ? {
      verified: true,
      name: ruleset.name || EXPECTED_RULESET_NAME,
      required_checks: names,
      matches_expected: expectedRulesetMatches(names),
      requires_review_thread_resolution: ruleset.requires_review_thread_resolution !== false,
    }
    : {
      verified: false,
      name: EXPECTED_RULESET_NAME,
      required_checks: [...REQUIRED_CHECK_NAMES],
      matches_expected: false,
      requires_review_thread_resolution: true,
    }

  return {
    headSha,
    baseSha,
    mergeStateStatus: resolvedMerge,
    mergeable,
    requiredCheckNames: names,
    requiredChecks,
    codeql: resolveCodeql(checks),
    ignoredNoise,
    findings: analyzed.findings,
    bugbotUncertain: analyzed.uncertain,
    bugbotSummaryCount: analyzed.summaryCount,
    reviewThreads: analyzed.reviewThreads,
    threadsUncertain: analyzed.reviewThreads.uncertain,
    ruleset: rulesetState,
    uncertain: checksTruncated || reviewsTruncated,
    observedAt,
    evaluationId,
    prNumber,
  }
}

async function github(token, path, { method = 'GET', body, tolerate = [] } = {}) {
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
  if (!response.ok && !tolerate.includes(response.status)) {
    const message = payload && typeof payload === 'object' ? payload.message : text
    throw new Error(`GitHub ${method} ${path} failed (${response.status}): ${message}`)
  }
  return { payload, headers: response.headers, status: response.status }
}

async function githubPaginated(token, path) {
  const items = []
  let page = 1
  for (;;) {
    if (halted()) break
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
          totalCount
          nodes { body }
        }
        reviewThreads(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            isResolved
            isOutdated
            comments(first: 1) {
              nodes { body url author { login } }
            }
          }
        }
      }
    }
  }
`

const HEAD_QUERY = `
  query($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) { headRefOid }
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
    if (halted()) break
    const { payload } = await github(token, '/graphql', {
      method: 'POST',
      body: { query: REVIEW_QUERY, variables: { owner, name, number, cursor } },
    })
    if (payload.errors?.length) {
      throw new Error(`GitHub GraphQL failed: ${payload.errors.map((error) => error.message).join('; ')}`)
    }
    pull = payload.data?.repository?.pullRequest
    if (!pull) throw new Error(`Pull request ${number} was not found`)
    const connection = pull.reviewThreads
    for (const thread of connection?.nodes || []) {
      const node = thread.comments?.nodes?.[0]
      threads.push({
        isResolved: thread.isResolved,
        isOutdated: thread.isOutdated,
        comment: node ? { body: node.body, url: node.url, author: node.author?.login || null } : null,
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
    reviewsTruncated: (pull.reviews?.totalCount || 0) > (pull.reviews?.nodes?.length || 0),
    threads,
    threadsTruncated: truncated,
  }
}

async function readHead(token, owner, name, number) {
  const { payload } = await github(token, '/graphql', {
    method: 'POST',
    body: { query: HEAD_QUERY, variables: { owner, name, number } },
  })
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL failed: ${payload.errors.map((error) => error.message).join('; ')}`)
  }
  const head = payload.data?.repository?.pullRequest?.headRefOid
  if (!head) throw new Error(`Pull request ${number} was not found`)
  return head
}

async function loadChecks(token, owner, name, sha) {
  const runs = []
  let page = 1
  let truncated = false
  let total = Infinity
  while (runs.length < total) {
    if (halted()) break
    const { payload } = await github(
      token,
      `/repos/${owner}/${name}/commits/${encodeURIComponent(sha)}/check-runs?per_page=100&page=${page}`,
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
  const { payload: statusPayload } = await github(
    token,
    `/repos/${owner}/${name}/commits/${encodeURIComponent(sha)}/status`,
  )
  return { checkRuns: runs, statuses: statusPayload.statuses || [], checksTruncated: truncated }
}

function rulesetFromPayload(payload) {
  const rule = (payload.rules || []).find((item) => item.type === 'required_status_checks')
  const names = (rule?.parameters?.required_status_checks || []).map((check) => check.context).filter(Boolean)
  const pullRequestRule = (payload.rules || []).find((item) => item.type === 'pull_request')
  return {
    verified: true,
    id: payload.id,
    name: payload.name,
    required_checks: names,
    matches_expected: expectedRulesetMatches(names),
    requires_review_thread_resolution: pullRequestRule?.parameters?.required_review_thread_resolution === true,
  }
}

async function loadRuleset(token, owner, name) {
  try {
    const { payload } = await github(token, `/repos/${owner}/${name}/rulesets`)
    const summaries = Array.isArray(payload) ? payload : []
    const branchRules = summaries.filter((ruleset) => ruleset.target === 'branch' && ruleset.enforcement === 'active')
    if (branchRules.length !== 1) {
      return { verified: false, matches_expected: false, required_checks: [...REQUIRED_CHECK_NAMES] }
    }
    const { payload: full } = await github(token, `/repos/${owner}/${name}/rulesets/${branchRules[0].id}`)
    const parsed = rulesetFromPayload(full)
    if (!parsed.required_checks.length) {
      return { verified: true, matches_expected: false, name: parsed.name, required_checks: [], requires_review_thread_resolution: parsed.requires_review_thread_resolution }
    }
    return parsed
  } catch (error) {
    console.error(`Ruleset could not be verified: ${error instanceof Error ? error.message : String(error)}`)
    return { verified: false, matches_expected: false, required_checks: [...REQUIRED_CHECK_NAMES] }
  }
}

async function listComments(token, owner, name, number) {
  return githubPaginated(token, `/repos/${owner}/${name}/issues/${number}/comments`)
}

async function getComment(token, owner, name, id) {
  const { payload } = await github(token, `/repos/${owner}/${name}/issues/comments/${id}`)
  return payload
}

async function listOpenPullNumbers(token, owner, name, sha) {
  const pulls = await githubPaginated(token, `/repos/${owner}/${name}/commits/${encodeURIComponent(sha)}/pulls`)
  return pulls.filter((pull) => pull.state === 'open').map((pull) => pull.number)
}

async function listOpenBasePullNumbers(token, owner, name) {
  const pulls = await githubPaginated(token, `/repos/${owner}/${name}/pulls?state=open&base=main`)
  return pulls.map((pull) => pull.number)
}

async function retireComments(token, owner, name, ids, canonical) {
  for (const id of ids) {
    if (halted()) return
    await github(token, `/repos/${owner}/${name}/issues/comments/${id}`, {
      method: 'PATCH',
      body: { body: retirementBody(canonical) },
    })
    console.log(`Retired non-canonical review-state comment ${id}`)
  }
}

async function publishObservation(token, owner, name, number, state) {
  if (halted()) return 'cancelled'
  const comments = await listComments(token, owner, name, number)
  if (halted()) return 'cancelled'
  const head = await readHead(token, owner, name, number)
  if (halted()) return 'cancelled'
  let plan = planPublication({
    observation: state,
    currentHeadSha: head,
    comments,
    cancelled: halted(),
  })
  if (plan.action === 'skip' && (plan.reason === 'stale-head' || plan.reason === 'cancelled')) {
    console.log(`#${number} ${plan.reason}: observation ${state.head_sha}, live ${head}`)
    return plan.reason
  }

  const headNow = await readHead(token, owner, name, number)
  if (halted() || headNow !== state.head_sha) {
    console.log(`#${number} superseded before write: observation ${state.head_sha}, live ${headNow}`)
    return 'stale-head'
  }
  const commentsNow = await listComments(token, owner, name, number)
  if (halted()) return 'cancelled'
  plan = planPublication({
    observation: state,
    currentHeadSha: headNow,
    comments: commentsNow,
    cancelled: halted(),
  })
  if (plan.action === 'skip') {
    if (plan.reason !== 'stale-head' && plan.reason !== 'cancelled') {
      await retireComments(token, owner, name, plan.retireIds, selectCanonicalMarker(commentsNow)?.state || state)
    }
    console.log(`#${number} ${plan.reason}`)
    return plan.reason
  }

  if (plan.action === 'create') {
    const headBeforeCreate = await readHead(token, owner, name, number)
    if (halted() || headBeforeCreate !== state.head_sha) {
      console.log(`#${number} superseded before create: live ${headBeforeCreate}`)
      return 'stale-head'
    }
    await github(token, `/repos/${owner}/${name}/issues/${number}/comments`, {
      method: 'POST',
      body: { body: renderReviewComment(state) },
    })
    console.log(`Created review-state comment on #${number}`)
  } else {
    const fresh = await getComment(token, owner, name, plan.updateId)
    const headBeforeUpdate = await readHead(token, owner, name, number)
    if (halted() || headBeforeUpdate !== state.head_sha) {
      console.log(`#${number} superseded before update: live ${headBeforeUpdate}`)
      return 'stale-head'
    }
    const freshPlan = planPublication({
      observation: state,
      currentHeadSha: headBeforeUpdate,
      comments: [fresh],
      cancelled: halted(),
    })
    if (freshPlan.action !== 'update') {
      console.log(`#${number} ${freshPlan.reason} at update barrier`)
      return freshPlan.reason
    }
    await github(token, `/repos/${owner}/${name}/issues/comments/${plan.updateId}`, {
      method: 'PATCH',
      body: { body: renderReviewComment(state) },
    })
    console.log(`Updated review-state comment ${plan.updateId} on #${number}`)
  }

  const headAfter = await readHead(token, owner, name, number)
  const commentsAfter = await listComments(token, owner, name, number)
  const reconcile = planReconcile({ observation: state, currentHeadSha: headAfter, comments: commentsAfter })
  const canonical = headAfter === state.head_sha ? selectCanonicalMarker(commentsAfter) : null
  if (!halted()) await retireComments(token, owner, name, reconcile.retireIds, canonical?.state || null)
  if (headAfter !== state.head_sha) {
    console.log(`#${number} unpublished stale observation after head moved to ${headAfter}`)
    return 'stale-head'
  }
  return 'published'
}

async function updateOne(token, owner, name, number) {
  if (halted()) return 'cancelled'
  const pull = await loadPullRequest(token, owner, name, number)
  if (halted()) return 'cancelled'
  const checks = await loadChecks(token, owner, name, pull.headSha)
  if (halted()) return 'cancelled'
  const ruleset = await loadRuleset(token, owner, name)
  const observedAt = new Date().toISOString()
  const evaluationId = makeEvaluationId({
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    prNumber: number,
    headSha: pull.headSha,
    observedAt,
  })
  const input = buildEvaluationInput({
    ...pull,
    ...checks,
    ruleset,
    observedAt,
    evaluationId,
    prNumber: number,
  })
  const state = evaluateReviewState(input)
  const body = renderReviewComment(state)
  const parsed = extractMachineState(body)
  if (parsed.next_action !== state.next_action || parsed.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error('Refusing to publish a comment whose machine state does not round-trip')
  }
  if (halted()) return 'cancelled'
  const result = await publishObservation(token, owner, name, number, state)
  console.log(`#${number} next_action=${state.next_action} publish=${result}`)
  return result
}

async function resolvePullNumbers(token, owner, name) {
  const requested = String(process.env.PR_NUMBER || '').trim()
  if (requested) {
    const number = Number(requested)
    if (!Number.isInteger(number)) throw new Error('PR_NUMBER must be an integer')
    return [number]
  }
  if (process.env.HEAD_SHA) return listOpenPullNumbers(token, owner, name, process.env.HEAD_SHA)
  if (process.env.EVENT_NAME === 'schedule' || process.env.EVENT_NAME === 'workflow_dispatch') {
    return listOpenBasePullNumbers(token, owner, name)
  }
  throw new Error('PR_NUMBER or HEAD_SHA is required')
}

async function main() {
  installStopHandlers()
  const token = process.env.GITHUB_TOKEN
  const repository = process.env.GITHUB_REPOSITORY || ''
  const [owner, name] = repository.split('/')
  if (!token || !owner || !name) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required')

  const numbers = await resolvePullNumbers(token, owner, name)
  if (numbers.length === 0) {
    console.log('No open pull request to update.')
    return
  }

  let failed = false
  for (const number of numbers) {
    if (halted()) {
      console.log('Stop requested. Remaining pull requests were not published.')
      break
    }
    try {
      await updateOne(token, owner, name, number)
    } catch (error) {
      failed = true
      console.error(`#${number} ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (failed) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}

export {
  MARKER,
  SUPPORTED_SCHEMA_VERSION,
  THREAD_REFRESH_MINUTES,
  REQUIRED_CHECK_NAMES,
  NOISE_CHECK_NAMES,
  NOISE_REASON,
  EXPECTED_RULESET_NAME,
}
