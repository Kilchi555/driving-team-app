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
 * Concurrency. GitHub issue comments have no compare-and-swap. Safety
 * does not come from a GET before PATCH.
 *
 * 1. The workflow concurrency group `simy-review-state` allows one run
 *    at a time and does not cancel the in-progress run. A later event
 *    waits until this process has exited, then reads GitHub again.
 * 2. publishObservation holds an in-process lock for the whole write.
 *    Two calls cannot interleave their reads and writes.
 * 3. Publication appends a new comment. It never patches a marker body
 *    over another observation. Retirement removes the marker from losers.
 * 4. started_at is taken before any read. The canonical marker is the
 *    greatest started_at, then observed_at, then evaluation_id. A
 *    snapshot that started before the canonical observed_at is not
 *    published. An earlier-started comment cannot become authoritative
 *    even if its observed_at is later.
 * 5. SIGINT/SIGTERM sets a flag checked before every write.
 *
 * Freshness. Review-thread resolution is not an event this workflow
 * receives. event_driven refresh is not a time bound.
 * freshness.max_lag_minutes is 15 only when this workflow file is
 * present on the repository default branch, which is what makes the
 * schedule real. Otherwise the guarantee is none and max_lag_minutes
 * is null.
 *
 * Ruleset. Expected check names are policy. They are never copied over
 * an empty, missing, or unreadable live ruleset. Those states cannot
 * become ready_for_human_merge.
 *
 * Precedence. Uncertainty escalates. Actionable findings and failed
 * required checks are fix. An inconsistent ruleset or an unresolved
 * thread escalates. rebase is synchronization only, and only when
 * blocking_reasons and actionable_findings are empty.
 */

const MARKER = '<!-- simy-review-state -->'
const SUPPORTED_SCHEMA_VERSION = 3
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

const EXECUTOR_ACTIONS = {
  fix: [
    'Re-read the live pull request head. Stop if it differs from head_sha.',
    'Re-read required checks on that head.',
    'Re-read current review threads and Bugbot findings.',
    'Continue only if this observation is still the canonical marker for that same head.',
  ],
  rebase: [
    'Re-read the live head and base relationship.',
    'Confirm blocking_reasons is empty and actionable_findings is empty.',
    'Synchronize the branch onto its base only. Do not modify product code.',
    'Re-read review state after synchronization.',
  ],
  ready_for_human_merge: [
    'Do not automate. A human decides whether to merge.',
    'Re-read the live head.',
    'Verify required checks, the live ruleset, unresolved review threads, Bugbot, and risk_hint.',
  ],
  escalate: [
    'Do not automate.',
    'Read blocking_reasons. This observation is not a safe automatic action.',
  ],
  wait: [
    'Do not automate.',
    'Re-read this pull request after the waited condition changes.',
  ],
}

export function freshnessContract(scheduleAvailable) {
  const shared = {
    live: false,
    event_driven: true,
    covers_thread_resolution: false,
  }
  if (scheduleAvailable === true) {
    return {
      ...shared,
      review_threads: 'eventual',
      scheduled: true,
      max_lag_minutes: THREAD_REFRESH_MINUTES,
      guarantee: 'scheduled',
    }
  }
  return {
    ...shared,
    review_threads: 'unknown',
    scheduled: false,
    max_lag_minutes: null,
    guarantee: 'none',
  }
}

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
    consumer_must_revalidate: [
      'head_sha',
      'required_checks',
      'merge_state',
      'review_threads',
      'ruleset',
      'risk_hint',
      'blocking_reasons',
      'actionable_findings',
      'freshness',
      'sync_required',
    ],
  }
}

function liveRequiredNames(ruleset) {
  if (ruleset?.verified !== true) return []
  if (Array.isArray(ruleset.observed_required_checks)) return [...ruleset.observed_required_checks]
  if (Array.isArray(ruleset.required_checks)) return [...ruleset.required_checks]
  return []
}

function rulesetBlockReason(ruleset) {
  if (!ruleset.verified) {
    return 'The active ruleset could not be verified, so this observation cannot call the pull request ready.'
  }
  if (!ruleset.observed_required_checks.length) {
    return 'The live ruleset has no required status checks, so this observation cannot call the pull request ready.'
  }
  return 'The live ruleset required checks do not match the expected Test and lint, E2E login, and Dependency review contexts, so this observation cannot call the pull request ready.'
}

export function evaluateReviewState(input) {
  const supplied = input.ruleset || { verified: false }
  const names = liveRequiredNames(supplied)
  const matchesExpected = supplied.verified === true && expectedRulesetMatches(names)
  const ruleset = {
    verified: supplied.verified === true,
    name: supplied.name || EXPECTED_RULESET_NAME,
    required_checks: names,
    observed_required_checks: names,
    expected_required_checks: [...REQUIRED_CHECK_NAMES],
    matches_expected: matchesExpected,
    consistent: matchesExpected,
    requires_review_thread_resolution: supplied.verified === true && supplied.requires_review_thread_resolution === true,
    policy_checks: supplied.policy_checks || input.policyChecks || null,
  }
  const required = input.requiredChecks || {}
  const findings = input.findings || []
  const threads = input.reviewThreads || {
    unresolved_count: 0,
    unresolved_non_bugbot_count: 0,
    unresolved_bugbot_count: 0,
    uncertain: false,
  }
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
  const syncRequired = merge === 'BEHIND' || merge === 'DIRTY'
  const bugbotFindings = findings.map((finding) => ({
    source: 'bugbot',
    title: finding.title,
    url: finding.url,
  }))
  const actionableFindings = uncertain
    ? []
    : [
      ...failed.map((name) => ({ source: 'required_check', title: name, url: null })),
      ...bugbotFindings,
    ]
  const blockingReasons = []
  if (uncertain) blockingReasons.push('observation_uncertain')
  if (failed.length > 0) blockingReasons.push('required_check_failed')
  if (bugbotFindings.length > 0 && !uncertain) blockingReasons.push('bugbot_finding')
  if (!ruleset.consistent) {
    if (!ruleset.verified) blockingReasons.push('ruleset_unverified')
    else if (!ruleset.observed_required_checks.length) blockingReasons.push('ruleset_empty')
    else blockingReasons.push('ruleset_mismatch')
  }
  if ((threads.unresolved_count || 0) > 0) blockingReasons.push('unresolved_review_thread')
  if (pending.length > 0) blockingReasons.push('checks_pending')
  if (cancelled.length > 0) blockingReasons.push('checks_cancelled')
  if (merge === 'DRAFT') blockingReasons.push('draft')
  if (merge == null || merge === 'UNKNOWN') blockingReasons.push('merge_state_unknown')
  if (merge === 'BLOCKED' || merge === 'HAS_HOOKS') blockingReasons.push('merge_blocked')

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
  } else if (bugbotFindings.length > 0) {
    nextAction = 'fix'
    reason = bugbotFindings.length === 1
      ? '1 open Bugbot finding on the current head.'
      : `${bugbotFindings.length} open Bugbot findings on the current head.`
  } else if (!ruleset.consistent) {
    nextAction = 'escalate'
    reason = rulesetBlockReason(ruleset)
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
  } else if (syncRequired) {
    nextAction = 'rebase'
    reason = merge === 'BEHIND'
      ? 'The branch is behind the base. Synchronization only; this is not a content fix.'
      : 'The branch conflicts with the base. Synchronization only; this is not a content fix.'
  } else if (merge == null || merge === 'UNKNOWN') {
    nextAction = 'escalate'
    reason = 'Merge state is unknown after required checks finished.'
  } else if (merge === 'BLOCKED' || merge === 'HAS_HOOKS') {
    nextAction = 'escalate'
    reason = 'Merge state is blocked after required checks passed and no open review threads were parsed.'
  } else if ((merge === 'CLEAN' || merge === 'UNSTABLE') && input.mergeable === true && (threads.unresolved_count || 0) === 0 && ruleset.consistent) {
    nextAction = 'ready_for_human_merge'
    reason = 'This observation found the conditions for a human merge decision at this head. It is not permission to merge.'
  }

  if (!NEXT_ACTIONS.includes(nextAction)) nextAction = 'escalate'
  const syncOnly = nextAction === 'rebase'
  if (syncOnly && (blockingReasons.length > 0 || actionableFindings.length > 0)) {
    nextAction = 'escalate'
    reason = 'Synchronization was withheld because blocking review state is still present.'
  }

  const requiredChecks = {}
  for (const name of names) requiredChecks[name] = required[name] || 'pending'
  const ignoredNoise = [...(input.ignoredNoise || [])].sort((a, b) => a.name.localeCompare(b.name))

  return {
    schema_version: SUPPORTED_SCHEMA_VERSION,
    cache: cacheBlock(),
    freshness: freshnessContract(input.scheduleAvailable === true),
    started_at: input.startedAt || null,
    observed_at: input.observedAt || null,
    evaluation_id: input.evaluationId || null,
    pr_number: input.prNumber ?? null,
    head_sha: input.headSha || '',
    base_sha: input.baseSha || '',
    merge_state_status: merge || 'unknown',
    mergeable: input.mergeable === true ? true : input.mergeable === false ? false : null,
    ruleset,
    required_checks: requiredChecks,
    bugbot: {
      count: uncertain ? 0 : bugbotFindings.length,
      summary_count: input.bugbotSummaryCount ?? null,
      findings: uncertain ? [] : bugbotFindings.map((finding) => ({ title: finding.title, url: finding.url })),
      comment_urls: uncertain ? [] : bugbotFindings.map((finding) => finding.url),
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
    blocking_reasons: blockingReasons,
    actionable_findings: actionableFindings,
    sync_required: syncRequired,
    sync_only: syncOnly && nextAction === 'rebase',
    executor: {
      may_automate: false,
      human_only: nextAction === 'ready_for_human_merge',
      sync_only: nextAction === 'rebase',
      before_acting: EXECUTOR_ACTIONS[nextAction] || EXECUTOR_ACTIONS.escalate,
      actions: EXECUTOR_ACTIONS,
    },
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
    'Canonical marker: greatest `started_at`, then `observed_at`, then `evaluation_id`.',
    state.freshness?.guarantee === 'scheduled'
      ? `Scheduled refresh from the default branch is about ${state.freshness.max_lag_minutes} minutes. Review-thread resolution is not an event, so that bound is eventual, not live.`
      : 'Scheduled refresh is not available from the default branch. Review-thread age is not guaranteed. Resolving a thread does not by itself refresh this comment.',
    '',
    `**Next action:** \`${state.next_action}\``,
    '',
    `**Sync required:** \`${Boolean(state.sync_required)}\``,
    '',
    `**Sync only:** \`${state.next_action === 'rebase'}\``,
    '',
    `**Blocking reasons:** ${state.blocking_reasons?.length ? state.blocking_reasons.map((reason) => `\`${reason}\``).join(', ') : 'none'}`,
    '',
    `**Actionable findings:** ${state.actionable_findings?.length || 0}`,
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
  const start = String(left?.started_at || '').localeCompare(String(right?.started_at || ''))
  if (start !== 0) return start
  const time = String(left?.observed_at || '').localeCompare(String(right?.observed_at || ''))
  if (time !== 0) return time
  return String(left?.evaluation_id || '').localeCompare(String(right?.evaluation_id || ''))
}

function freshnessConsistent(state) {
  const fresh = state?.freshness
  if (!fresh || fresh.live !== false || fresh.covers_thread_resolution !== false || fresh.event_driven !== true) return false
  if (fresh.guarantee === 'none') return fresh.scheduled === false && fresh.max_lag_minutes == null
  if (fresh.guarantee === 'scheduled') {
    return fresh.scheduled === true && fresh.max_lag_minutes === THREAD_REFRESH_MINUTES
  }
  return false
}

function markerRecords(comments) {
  return (comments || [])
    .filter((comment) => typeof comment?.body === 'string' && comment.body.includes(MARKER))
    .map((comment) => {
      try {
        const state = extractMachineState(comment.body)
        const invalid = !state
          || state.schema_version !== SUPPORTED_SCHEMA_VERSION
          || typeof state.started_at !== 'string'
          || typeof state.observed_at !== 'string'
          || state.started_at > state.observed_at
          || typeof state.evaluation_id !== 'string'
          || typeof state.head_sha !== 'string'
          || !Array.isArray(state.blocking_reasons)
          || !Array.isArray(state.actionable_findings)
          || state.cache?.authoritative !== false
          || state.cache?.may_merge !== false
          || state.cache?.may_modify_code !== false
          || state.cache?.may_automate !== false
          || state.executor?.may_automate !== false
          || !freshnessConsistent(state)
          || (state.next_action === 'rebase' && (state.sync_only !== true || state.executor?.sync_only !== true || state.blocking_reasons.length > 0 || state.actionable_findings.length > 0))
          || (state.next_action === 'ready_for_human_merge' && state.executor?.human_only !== true)
          || (state.next_action !== 'rebase' && state.sync_only === true)
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
  if (typeof observation.started_at !== 'string' || typeof observation.observed_at !== 'string') {
    return { action: 'skip', reason: 'stale-snapshot', retireIds: [] }
  }

  const marked = markerRecords(comments)
  const canonical = selectCanonicalMarker(comments)
  const retireOthers = (keepId) => marked.filter((record) => record.id !== keepId).map((record) => record.id)

  if (canonical && canonical.state.evaluation_id === observation.evaluation_id) {
    return { action: 'skip', reason: 'already-current', retireIds: retireOthers(canonical.id) }
  }
  if (canonical && (canonical.state.observed_at >= observation.started_at || compareObservations(canonical.state, observation) >= 0)) {
    return { action: 'skip', reason: 'stale-snapshot', retireIds: retireOthers(canonical.id) }
  }
  return {
    action: 'create',
    reason: 'publish',
    retireIds: marked.map((record) => record.id),
    previousBody: null,
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
    if (sawMalformed && !sawUnknownSchema) return refused('malformed')
    if (sawUnknownSchema) return refused('unknown_schema')
    return refused('inconsistent')
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
  startedAt,
  evaluationId,
  prNumber,
  scheduleAvailable = false,
}) {
  const checks = collapseChecks(checkRuns, statuses)
  const names = ruleset?.verified === true && Array.isArray(ruleset.required_checks)
    ? [...ruleset.required_checks]
    : []
  const requiredChecks = {}
  for (const name of names) {
    const found = checks.find((check) => check.name === name)
    requiredChecks[name] = found ? found.status : 'pending'
  }
  const policyChecks = {}
  for (const name of REQUIRED_CHECK_NAMES) {
    const found = checks.find((check) => check.name === name)
    policyChecks[name] = found ? found.status : 'pending'
  }
  const ignoredNoise = NOISE_CHECK_NAMES.flatMap((name) => {
    const found = checks.find((check) => check.name === name)
    if (!found) return []
    return [{ name, status: found.status, reason: NOISE_REASON }]
  })
  const analyzed = analyzeReviews({ reviews, threads, threadsTruncated, reviewsTruncated })
  let resolvedMerge = normalizeMergeState(mergeStateStatus)
  if (isDraft && resolvedMerge !== 'BEHIND' && resolvedMerge !== 'DIRTY') resolvedMerge = 'DRAFT'
  const rulesetState = ruleset?.verified === true
    ? {
      verified: true,
      name: ruleset.name || EXPECTED_RULESET_NAME,
      required_checks: names,
      observed_required_checks: names,
      matches_expected: expectedRulesetMatches(names),
      requires_review_thread_resolution: ruleset.requires_review_thread_resolution === true,
      policy_checks: policyChecks,
    }
    : {
      verified: false,
      name: EXPECTED_RULESET_NAME,
      required_checks: [],
      observed_required_checks: [],
      matches_expected: false,
      requires_review_thread_resolution: false,
      policy_checks: policyChecks,
    }

  return {
    headSha,
    baseSha,
    mergeStateStatus: resolvedMerge,
    mergeable,
    requiredCheckNames: names,
    requiredChecks,
    policyChecks,
    scheduleAvailable: scheduleAvailable === true,
    startedAt,
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
      return { verified: false, matches_expected: false, required_checks: [] }
    }
    const { payload: full } = await github(token, `/repos/${owner}/${name}/rulesets/${branchRules[0].id}`)
    const parsed = rulesetFromPayload(full)
    if (!parsed.required_checks.length) {
      return { verified: true, matches_expected: false, name: parsed.name, required_checks: [], requires_review_thread_resolution: parsed.requires_review_thread_resolution }
    }
    return parsed
  } catch (error) {
    console.error(`Ruleset could not be verified: ${error instanceof Error ? error.message : String(error)}`)
    return { verified: false, matches_expected: false, required_checks: [] }
  }
}

async function listComments(token, owner, name, number) {
  return githubPaginated(token, `/repos/${owner}/${name}/issues/${number}/comments`)
}

async function listOpenPullNumbers(token, owner, name, sha) {
  const pulls = await githubPaginated(token, `/repos/${owner}/${name}/commits/${encodeURIComponent(sha)}/pulls`)
  return pulls.filter((pull) => pull.state === 'open').map((pull) => pull.number)
}

async function listOpenBasePullNumbers(token, owner, name) {
  const pulls = await githubPaginated(token, `/repos/${owner}/${name}/pulls?state=open&base=main`)
  return pulls.map((pull) => pull.number)
}

const publicationTail = new Map()

export function withPublicationLock(key, fn) {
  const previous = publicationTail.get(key) || Promise.resolve()
  const run = previous.then(fn, fn)
  publicationTail.set(key, run.then(() => undefined, () => undefined))
  return run
}

async function retireComments(client, ids, canonical) {
  for (const id of ids) {
    if (halted()) return
    const body = retirementBody(canonical)
    if (body.includes(MARKER)) throw new Error('Retirement note must not contain the review-state marker')
    await client.updateComment(id, body)
    console.log(`Retired non-canonical review-state comment ${id}`)
  }
}

async function publishObservationLocked(client, number, state) {
  if (halted()) return 'cancelled'
  const head = await client.readHead(number)
  if (halted()) return 'cancelled'
  let comments = await client.listComments(number)
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

  const headNow = await client.readHead(number)
  if (halted() || headNow !== state.head_sha) {
    console.log(`#${number} superseded before write: observation ${state.head_sha}, live ${headNow}`)
    return 'stale-head'
  }
  comments = await client.listComments(number)
  if (halted()) return 'cancelled'
  plan = planPublication({
    observation: state,
    currentHeadSha: headNow,
    comments,
    cancelled: halted(),
  })
  if (plan.action === 'skip') {
    if (plan.reason !== 'stale-head' && plan.reason !== 'cancelled') {
      await retireComments(client, plan.retireIds, selectCanonicalMarker(comments)?.state || null)
    }
    console.log(`#${number} ${plan.reason}`)
    return plan.reason
  }

  const headBeforeCreate = await client.readHead(number)
  if (halted() || headBeforeCreate !== state.head_sha) {
    console.log(`#${number} superseded before create: live ${headBeforeCreate}`)
    return 'stale-head'
  }
  comments = await client.listComments(number)
  plan = planPublication({
    observation: state,
    currentHeadSha: headBeforeCreate,
    comments,
    cancelled: halted(),
  })
  if (plan.action !== 'create') {
    if (plan.action === 'skip' && plan.reason !== 'stale-head' && plan.reason !== 'cancelled') {
      await retireComments(client, plan.retireIds, selectCanonicalMarker(comments)?.state || null)
    }
    console.log(`#${number} ${plan.reason} at create barrier`)
    return plan.reason
  }

  await client.createComment(number, renderReviewComment(state))
  console.log(`Created review-state comment on #${number}`)

  const headAfter = await client.readHead(number)
  const commentsAfter = await client.listComments(number)
  const reconcile = planReconcile({ observation: state, currentHeadSha: headAfter, comments: commentsAfter })
  const canonical = headAfter === state.head_sha ? selectCanonicalMarker(commentsAfter) : null
  if (!halted()) await retireComments(client, reconcile.retireIds, canonical?.state || null)
  if (headAfter !== state.head_sha) {
    console.log(`#${number} unpublished stale observation after head moved to ${headAfter}`)
    return 'stale-head'
  }
  return 'published'
}

export async function publishObservation(client, number, state) {
  return withPublicationLock(number, () => publishObservationLocked(client, number, state))
}

function createGitHubClient(token, owner, name) {
  return {
    readHead: (number) => readHead(token, owner, name, number),
    listComments: (number) => listComments(token, owner, name, number),
    createComment: async (number, body) => {
      await github(token, `/repos/${owner}/${name}/issues/${number}/comments`, {
        method: 'POST',
        body: { body },
      })
    },
    updateComment: async (id, body) => {
      await github(token, `/repos/${owner}/${name}/issues/comments/${id}`, {
        method: 'PATCH',
        body: { body },
      })
    },
  }
}

export async function readWorkflowOnDefaultBranch(request, owner, name) {
  try {
    const repo = await request(`/repos/${owner}/${name}`)
    const branch = repo?.payload?.default_branch
    if (!branch) return false
    const file = await request(
      `/repos/${owner}/${name}/contents/.github/workflows/review-state.yml?ref=${encodeURIComponent(branch)}`,
      { tolerate: [404] },
    )
    return file?.status === 200
  } catch (error) {
    console.error(`Scheduled freshness could not be confirmed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function updateOne(token, owner, name, number) {
  if (halted()) return 'cancelled'
  const startedAt = new Date().toISOString()
  const scheduleAvailable = await readWorkflowOnDefaultBranch(
    (path, options) => github(token, path, options),
    owner,
    name,
  )
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
    startedAt,
    evaluationId,
    prNumber: number,
    scheduleAvailable,
  })
  const state = evaluateReviewState(input)
  const body = renderReviewComment(state)
  const parsed = extractMachineState(body)
  if (parsed.next_action !== state.next_action || parsed.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error('Refusing to publish a comment whose machine state does not round-trip')
  }
  if (halted()) return 'cancelled'
  const result = await publishObservation(createGitHubClient(token, owner, name), number, state)
  console.log(`#${number} next_action=${state.next_action} freshness=${state.freshness.guarantee} publish=${result}`)
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
