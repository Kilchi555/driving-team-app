import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MARKER,
  NOISE_REASON,
  SUPPORTED_SCHEMA_VERSION,
  THREAD_REFRESH_MINUTES,
  analyzeReviews,
  buildEvaluationInput,
  cell,
  clearStopForTests,
  evaluateReviewState,
  extractMachineState,
  interpretPublishedState,
  planPublication,
  planReconcile,
  publishObservation,
  readWorkflowOnDefaultBranch,
  renderReviewComment,
  requestStop,
  resolveCodeql,
  retirementBody,
  selectCanonicalMarker,
} from '../../scripts/review-state.mjs'

const passing = {
  'Test and lint': 'pass',
  'E2E login': 'pass',
  'Dependency review': 'pass',
} as const

const verifiedRuleset = {
  verified: true,
  matches_expected: true,
  name: 'Protect main — Required CI',
  required_checks: ['Test and lint', 'E2E login', 'Dependency review'],
  requires_review_thread_resolution: true,
}

const openThreads = {
  unresolved_count: 0,
  unresolved_non_bugbot_count: 0,
  unresolved_bugbot_count: 0,
  uncertain: false,
}

function evaluate(overrides: Record<string, unknown> = {}) {
  return evaluateReviewState({
    headSha: 'abc123def456',
    baseSha: 'def456abc123',
    mergeStateStatus: 'CLEAN',
    mergeable: true,
    requiredChecks: passing,
    requiredCheckNames: Object.keys(passing),
    codeql: { gate: 'not_required', status: 'pass', clean: true },
    ignoredNoise: [],
    findings: [],
    bugbotUncertain: false,
    bugbotSummaryCount: null,
    reviewThreads: openThreads,
    threadsUncertain: false,
    uncertain: false,
    ruleset: verifiedRuleset,
    startedAt: '2026-10-04T07:59:00.000Z',
    observedAt: '2026-10-04T08:00:00.000Z',
    evaluationId: 'run:1:368:abc123def456:2026-10-04T08:00:00.000Z',
    prNumber: 368,
    ...overrides,
  })
}

function observation(partial: Record<string, unknown>) {
  return evaluate(partial)
}

function comment(id: number, state: ReturnType<typeof evaluate>) {
  return { id, body: renderReviewComment(state) }
}

const finding = {
  title: 'Invoice paid before credit can fail',
  url: 'https://github.com/Kilchi555/driving-team-app/pull/360#discussion_r1',
}

describe('review state decisions', () => {
  it('waits while required checks are pending or missing', () => {
    const pending = evaluate({
      mergeStateStatus: 'UNKNOWN',
      mergeable: null,
      requiredChecks: {
        'Test and lint': 'pending',
        'E2E login': 'pending',
        'Dependency review': 'pending',
      },
    })
    expect(pending.next_action).toBe('wait')
    const missing = buildEvaluationInput({
      headSha: 'abc123def456',
      baseSha: 'def456abc123',
      mergeStateStatus: 'CLEAN',
      mergeable: true,
      ruleset: verifiedRuleset,
      observedAt: '2026-10-04T08:00:00.000Z',
      evaluationId: 'missing',
      prNumber: 368,
      checkRuns: [
        { name: 'Test and lint', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
        { name: 'E2E login', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
      ],
    })
    expect(missing.requiredChecks['Dependency review']).toBe('pending')
    expect(evaluateReviewState(missing).next_action).toBe('wait')
    expect(evaluateReviewState(missing).required_checks['Dependency review']).toBe('pending')
  })

  it('asks for a fix when a required check failed', () => {
    const state = evaluate({ requiredChecks: { ...passing, 'Test and lint': 'fail' } })
    expect(state.next_action).toBe('fix')
    expect(state.reason).toBe('Required check `Test and lint` failed.')
  })

  it('does not turn an unknown required check into a fix or a ready state', () => {
    const state = evaluate({ requiredChecks: { ...passing, 'E2E login': 'unknown' } })
    expect(state.next_action).toBe('escalate')
    expect(state.reason).toContain('E2E login')
  })

  it('treats a cancelled required check as wait, including when another check failed only if that failure is real', () => {
    const cancelled = evaluate({ requiredChecks: { ...passing, 'Test and lint': 'cancelled' } })
    expect(cancelled.next_action).toBe('wait')
    expect(cancelled.reason).toContain('cancelled')
    expect(cancelled.reason).not.toContain('failed')
    const fromRun = buildEvaluationInput({
      headSha: 'abc123def456',
      baseSha: 'def456abc123',
      mergeStateStatus: 'BLOCKED',
      mergeable: true,
      ruleset: verifiedRuleset,
      observedAt: '2026-10-04T08:00:00.000Z',
      evaluationId: 'cancelled',
      prNumber: 368,
      checkRuns: [
        { name: 'Test and lint', status: 'completed', conclusion: 'cancelled', completed_at: '2026-10-04T00:02:00Z' },
        { name: 'Test and lint', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:01:00Z' },
        { name: 'E2E login', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:02:00Z' },
        { name: 'Dependency review', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:02:00Z' },
      ],
    })
    expect(fromRun.requiredChecks['Test and lint']).toBe('cancelled')
    expect(evaluateReviewState(fromRun).next_action).toBe('wait')
    expect(evaluate({
      requiredChecks: { ...passing, 'Test and lint': 'fail', 'E2E login': 'cancelled' },
    }).next_action).toBe('fix')
  })

  it('asks for a rebase when the branch is behind or dirty, and still prefers a failed check', () => {
    expect(evaluate({ mergeStateStatus: 'BEHIND', mergeable: false }).next_action).toBe('rebase')
    expect(evaluate({ mergeStateStatus: 'DIRTY', mergeable: false }).next_action).toBe('rebase')
    expect(evaluate({
      mergeStateStatus: 'BEHIND',
      mergeable: false,
      requiredChecks: { ...passing, 'Dependency review': 'fail' },
    }).next_action).toBe('fix')
  })

  it('is ready for a human decision only when the ruleset is verified and nothing is unresolved', () => {
    const state = evaluate({ codeql: { gate: 'not_required', status: 'unknown', clean: false } })
    expect(state.next_action).toBe('ready_for_human_merge')
    expect(state.cache.may_merge).toBe(false)
    expect(state.cache.may_automate).toBe(false)
    expect(state.cache.authoritative).toBe(false)
    expect(state.reason).toContain('not permission to merge')
    expect(evaluate({ ruleset: { ...verifiedRuleset, verified: false, matches_expected: false } }).next_action).toBe('escalate')
    expect(evaluate({
      ruleset: { ...verifiedRuleset, matches_expected: false, required_checks: ['Test and lint'] },
    }).next_action).toBe('escalate')
  })

  it('does not treat uncertainty as a fix or as ready', () => {
    expect(evaluate({
      uncertain: true,
      requiredChecks: { ...passing, 'Test and lint': 'fail' },
    }).next_action).toBe('escalate')
    expect(evaluate({ bugbotUncertain: true }).next_action).toBe('escalate')
  })

  it('does not treat a red App Store check as a required failure', () => {
    const input = buildEvaluationInput({
      headSha: 'abc123def456',
      baseSha: 'def456abc123',
      mergeStateStatus: 'UNSTABLE',
      mergeable: true,
      ruleset: verifiedRuleset,
      observedAt: '2026-10-04T08:00:00.000Z',
      evaluationId: 'noise',
      prNumber: 368,
      checkRuns: [
        { name: 'Test and lint', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
        { name: 'E2E login', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
        { name: 'Dependency review', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
        { name: 'CodeQL', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
        { name: 'App | Default', status: 'completed', conclusion: 'failure', completed_at: '2026-10-04T00:00:00Z' },
        { name: 'App | Default | Archive - iOS', status: 'completed', conclusion: 'action_required', completed_at: '2026-10-04T00:00:00Z' },
      ],
    })
    const state = evaluateReviewState(input)
    expect(state.next_action).toBe('ready_for_human_merge')
    expect(state.ignored_noise).toEqual([
      { name: 'App | Default', status: 'fail', reason: NOISE_REASON },
      { name: 'App | Default | Archive - iOS', status: 'fail', reason: NOISE_REASON },
    ])
  })
})

describe('Bugbot and review threads', () => {
  function thread(body: string, extra: Record<string, unknown> = {}) {
    return {
      isResolved: false,
      isOutdated: false,
      comment: {
        body,
        url: 'https://github.com/Kilchi555/driving-team-app/pull/1#discussion_r2',
        author: 'cursor',
      },
      ...extra,
    }
  }

  const bug = (title: string, id: string) =>
    `### ${title}\n<!-- BUGBOT_BUG_ID: ${id} -->`

  const summary = (count: number) =>
    `<!-- BUGBOT_REVIEW -->\nCursor Bugbot has reviewed your changes using default effort and found ${count} potential ${count === 1 ? 'issue' : 'issues'}.`

  it('fails closed when the live summary count is higher than the parsed findings', () => {
    const none = analyzeReviews({ reviews: [{ body: summary(2) }], threads: [] })
    expect(none.uncertain).toBe(true)
    expect(none.findings).toEqual([])
    expect(evaluate({ bugbotUncertain: true, bugbotSummaryCount: 2 }).next_action).toBe('escalate')

    const one = analyzeReviews({
      reviews: [{ body: summary(2) }],
      threads: [thread(bug('Only one', '7687a38c-0f4a-46b4-8ec0-c52310fae59f'))],
    })
    expect(one.uncertain).toBe(true)
    expect(one.findings).toHaveLength(1)
    expect(evaluate({
      bugbotUncertain: true,
      findings: one.findings,
      reviewThreads: one.reviewThreads,
    }).next_action).toBe('escalate')
  })

  it('keeps a matching summary on the normal path', () => {
    const parsed = analyzeReviews({
      reviews: [{ body: summary(2) }, { body: '<!-- BUGBOT_REVIEW -->\n<!-- BUGBOT_REVIEW_STALE -->\nStale Bugbot comment from a previous run.' }],
      threads: [
        thread(bug('First finding', '7687a38c-0f4a-46b4-8ec0-c52310fae59f'), {
          comment: {
            body: bug('First finding', '7687a38c-0f4a-46b4-8ec0-c52310fae59f'),
            url: 'https://github.com/Kilchi555/driving-team-app/pull/1#discussion_r2',
            author: 'cursor',
          },
        }),
        thread(bug('Second finding', '14f67720-7c4b-47d2-8991-d8f5e6474c1c'), {
          comment: {
            body: bug('Second finding', '14f67720-7c4b-47d2-8991-d8f5e6474c1c'),
            url: 'https://github.com/Kilchi555/driving-team-app/pull/1#discussion_r3',
            author: 'cursor',
          },
        }),
      ],
    })
    expect(parsed.uncertain).toBe(false)
    expect(parsed.findings).toHaveLength(2)
    expect(evaluate({
      findings: parsed.findings,
      reviewThreads: parsed.reviewThreads,
      bugbotSummaryCount: 2,
    }).next_action).toBe('fix')
  })

  it('escalates on a malformed Bugbot id or an unexpected live review', () => {
    const malformed = analyzeReviews({
      reviews: [{ body: summary(1) }],
      threads: [thread('### Title\n<!-- BUGBOT_BUG_ID: not-a-uuid -->')],
    })
    expect(malformed.uncertain).toBe(true)
    expect(malformed.findings).toEqual([])
    expect(evaluate({ bugbotUncertain: true, reviewThreads: malformed.reviewThreads }).next_action).toBe('escalate')

    const unexpected = analyzeReviews({
      reviews: [{ body: '<!-- BUGBOT_REVIEW -->\nBugbot looked at this and has thoughts.' }],
      threads: [],
    })
    expect(unexpected.uncertain).toBe(true)
  })

  it('does not treat a normal developer comment as a Bugbot finding', () => {
    const parsed = analyzeReviews({
      reviews: [],
      threads: [thread('### Please rename this\nLooks like a bug 123e4567-e89b-12d3-a456-426614174000', {
        comment: {
          body: '### Please rename this\nLooks like a bug 123e4567-e89b-12d3-a456-426614174000',
          url: 'https://github.com/Kilchi555/driving-team-app/pull/1#discussion_r9',
          author: 'octocat',
        },
      })],
    })
    expect(parsed.findings).toEqual([])
    expect(parsed.uncertain).toBe(false)
    expect(parsed.reviewThreads.unresolved_non_bugbot_count).toBe(1)
  })

  it('asks for a fix only for a current actionable Bugbot thread', () => {
    const state = evaluate({
      findings: [finding],
      reviewThreads: {
        unresolved_count: 1,
        unresolved_non_bugbot_count: 0,
        unresolved_bugbot_count: 1,
        uncertain: false,
      },
    })
    expect(state.next_action).toBe('fix')
    expect(state.bugbot.count).toBe(1)
  })

  it('does not keep a fix after the Bugbot thread is resolved', () => {
    const parsed = analyzeReviews({
      reviews: [{ body: summary(1) }],
      threads: [thread(bug('Resolved issue', '14f67720-7c4b-47d2-8991-d8f5e6474c1c'), { isResolved: true })],
    })
    expect(parsed.findings).toEqual([])
    expect(parsed.uncertain).toBe(true)
    expect(parsed.reviewThreads.unresolved_count).toBe(0)
    const resolvedAndQuiet = analyzeReviews({
      reviews: [{ body: '<!-- BUGBOT_REVIEW -->\n<!-- BUGBOT_REVIEW_STALE -->\nStale.' }],
      threads: [thread(bug('Resolved issue', '14f67720-7c4b-47d2-8991-d8f5e6474c1c'), { isResolved: true })],
    })
    expect(resolvedAndQuiet.uncertain).toBe(false)
    expect(evaluate({
      findings: [],
      reviewThreads: resolvedAndQuiet.reviewThreads,
      bugbotUncertain: false,
    }).next_action).toBe('ready_for_human_merge')
  })

  it('publishes a known clean Bugbot observation as certain and empty', () => {
    const state = evaluate({})
    expect(state.bugbot.uncertain).toBe(false)
    expect(state.bugbot.count).toBe(0)
    expect(state.bugbot.findings).toEqual([])
    expect(state.actionable_findings).toEqual([])
    expect(state.next_action).toBe('ready_for_human_merge')
    expect(renderReviewComment(state)).toContain('No current actionable findings.')
    expect(renderReviewComment(state)).not.toContain('unavailable because this observation is uncertain')
  })

  it('does not publish an unknown required check as a clean Bugbot result', () => {
    const visible = evaluate({
      requiredChecks: { ...passing, 'E2E login': 'unknown' },
      findings: [finding],
      reviewThreads: {
        unresolved_count: 1,
        unresolved_non_bugbot_count: 0,
        unresolved_bugbot_count: 1,
        uncertain: false,
      },
    })
    expect(visible.next_action).toBe('escalate')
    expect(visible.blocking_reasons).toContain('observation_uncertain')
    expect(visible.bugbot.uncertain).toBe(false)
    expect(visible.bugbot.count).toBe(1)
    expect(visible.bugbot.findings).toEqual([{ title: finding.title, url: finding.url }])
    expect(visible.actionable_findings).toEqual([
      { source: 'bugbot', title: finding.title, url: finding.url },
    ])
    const visibleComment = renderReviewComment(visible)
    expect(visibleComment).toContain(finding.title)
    expect(visibleComment).not.toContain('No current actionable findings.')
    expect(visibleComment).not.toContain('unavailable because this observation is uncertain')

    const hidden = evaluate({
      requiredChecks: { ...passing, 'E2E login': 'unknown' },
      findings: [finding],
      bugbotUncertain: true,
      reviewThreads: {
        unresolved_count: 1,
        unresolved_non_bugbot_count: 0,
        unresolved_bugbot_count: 1,
        uncertain: true,
      },
    })
    expect(hidden.next_action).toBe('escalate')
    expect(hidden.bugbot.uncertain).toBe(true)
    expect(hidden.bugbot.count).toBe(0)
    expect(hidden.bugbot.findings).toEqual([])
    expect(hidden.actionable_findings).toEqual([])
    const hiddenComment = renderReviewComment(hidden)
    expect(hiddenComment).toContain('unavailable because this observation is uncertain')
    expect(hiddenComment).not.toContain('No current actionable findings.')
    expect(hiddenComment).not.toContain(finding.title)

    const unresolvedWithoutRows = evaluate({
      requiredChecks: { ...passing, 'E2E login': 'unknown' },
      findings: [],
      reviewThreads: {
        unresolved_count: 1,
        unresolved_non_bugbot_count: 0,
        unresolved_bugbot_count: 1,
        uncertain: false,
      },
    })
    expect(unresolvedWithoutRows.next_action).toBe('escalate')
    expect(unresolvedWithoutRows.bugbot.uncertain).toBe(true)
    expect(unresolvedWithoutRows.bugbot.findings).toEqual([])
    expect(unresolvedWithoutRows.bugbot.count).toBe(0)
    expect(renderReviewComment(unresolvedWithoutRows)).not.toContain('No current actionable findings.')
  })

  it('propagates input.uncertain without claiming a certain Bugbot result', () => {
    const state = evaluate({
      uncertain: true,
      findings: [finding],
      reviewThreads: {
        unresolved_count: 1,
        unresolved_non_bugbot_count: 0,
        unresolved_bugbot_count: 1,
        uncertain: false,
      },
    })
    expect(state.next_action).toBe('escalate')
    expect(state.next_action).not.toBe('ready_for_human_merge')
    expect(state.blocking_reasons).toContain('observation_uncertain')
    expect(state.bugbot.uncertain).toBe(true)
    expect(state.bugbot.findings).toEqual([{ title: finding.title, url: finding.url }])
    expect(state.bugbot.count).toBe(1)
    expect(state.actionable_findings).toEqual([
      { source: 'bugbot', title: finding.title, url: finding.url },
    ])
    const comment = renderReviewComment(state)
    expect(comment).toContain(finding.title)
    expect(comment).toContain('not a closed result because the observation is uncertain')
    expect(comment).not.toContain('No current actionable findings.')
    expect(comment).toContain('**Next action:** `escalate`')
  })

  it('keeps Bugbot and thread parse failures explicit and does not invent findings', () => {
    const parsed = analyzeReviews({
      reviews: [{ body: summary(1) }],
      threads: [thread('### Title\n<!-- BUGBOT_BUG_ID: not-a-uuid -->')],
    })
    expect(parsed.uncertain).toBe(true)
    expect(parsed.findings).toEqual([])
    const state = evaluate({
      bugbotUncertain: parsed.uncertain,
      threadsUncertain: parsed.reviewThreads.uncertain,
      findings: parsed.findings,
      bugbotSummaryCount: parsed.summaryCount,
      reviewThreads: parsed.reviewThreads,
    })
    expect(state.bugbot.uncertain).toBe(true)
    expect(state.review_threads.uncertain).toBe(true)
    expect(state.bugbot.findings).toEqual([])
    expect(state.bugbot.count).toBe(0)
    expect(state.next_action).toBe('escalate')
    expect(renderReviewComment(state)).toContain('unavailable because this observation is uncertain')

    const threadsOnly = evaluate({
      threadsUncertain: true,
      findings: [finding],
      reviewThreads: {
        unresolved_count: 1,
        unresolved_non_bugbot_count: 0,
        unresolved_bugbot_count: 1,
        uncertain: false,
      },
    })
    expect(threadsOnly.bugbot.uncertain).toBe(true)
    expect(threadsOnly.review_threads.uncertain).toBe(true)
    expect(threadsOnly.bugbot.findings).toEqual([])
    expect(threadsOnly.bugbot.count).toBe(0)
    expect(threadsOnly.next_action).toBe('escalate')
    expect(threadsOnly.next_action).not.toBe('fix')
    expect(threadsOnly.next_action).not.toBe('ready_for_human_merge')
  })

  it('keeps a known Bugbot finding when an unrelated check is uncertain', () => {
    const state = evaluate({
      requiredChecks: { ...passing, 'Dependency review': 'unknown' },
      findings: [finding],
      reviewThreads: {
        unresolved_count: 1,
        unresolved_non_bugbot_count: 0,
        unresolved_bugbot_count: 1,
        uncertain: false,
      },
    })
    expect(state.bugbot.uncertain).toBe(false)
    expect(state.bugbot.findings).toEqual([{ title: finding.title, url: finding.url }])
    expect(state.actionable_findings).toEqual([
      { source: 'bugbot', title: finding.title, url: finding.url },
    ])
    expect(state.blocking_reasons).toContain('bugbot_finding')
    expect(state.next_action).toBe('escalate')

    const truncated = buildEvaluationInput({
      headSha: 'abc123def456',
      baseSha: 'def456abc123',
      mergeStateStatus: 'CLEAN',
      mergeable: true,
      ruleset: verifiedRuleset,
      observedAt: '2026-10-04T08:00:00.000Z',
      startedAt: '2026-10-04T07:59:00.000Z',
      evaluationId: 'truncated-checks',
      prNumber: 368,
      checksTruncated: true,
      checkRuns: [
        { name: 'Test and lint', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
        { name: 'E2E login', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
        { name: 'Dependency review', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
      ],
      reviews: [{ body: summary(1) }],
      threads: [thread(bug('Visible finding', '7687a38c-0f4a-46b4-8ec0-c52310fae59f'))],
    })
    expect(truncated.uncertain).toBe(true)
    expect(truncated.bugbotUncertain).toBe(false)
    expect(truncated.findings).toHaveLength(1)
    const published = evaluateReviewState(truncated)
    expect(published.next_action).toBe('escalate')
    expect(published.bugbot.uncertain).toBe(true)
    expect(published.bugbot.findings).toEqual(truncated.findings)
    expect(published.bugbot.count).toBe(1)
    expect(published.actionable_findings).toEqual([
      { source: 'bugbot', title: 'Visible finding', url: truncated.findings[0].url },
    ])
    expect(renderReviewComment(published)).toContain('Visible finding')
    expect(renderReviewComment(published)).not.toContain('No current actionable findings.')
  })

  it('does not call the pull request ready while a non-Bugbot thread is unresolved', () => {
    const state = evaluate({
      reviewThreads: {
        unresolved_count: 1,
        unresolved_non_bugbot_count: 1,
        unresolved_bugbot_count: 0,
        uncertain: false,
      },
    })
    expect(state.next_action).toBe('escalate')
    expect(state.reason).toContain('non-Bugbot')
    expect(state.review_threads.unresolved_non_bugbot_count).toBe(1)
  })
})

describe('CodeQL', () => {
  it('never represents fail, unknown, disagreement, or a missing check as clean', () => {
    expect(resolveCodeql([{ name: 'CodeQL', status: 'fail' }, { name: 'Analyze (javascript-typescript)', status: 'pass' }])).toEqual({
      gate: 'not_required',
      status: 'fail',
      clean: false,
    })
    expect(resolveCodeql([]).clean).toBe(false)
    expect(resolveCodeql([]).status).toBe('unknown')
    expect(resolveCodeql([{ name: 'CodeQL Analysis', status: 'fail' }])).toMatchObject({ status: 'unknown', clean: false })
    expect(resolveCodeql([
      { name: 'CodeQL', status: 'pass' },
      { name: 'Analyze (javascript-typescript)', status: 'pending' },
    ])).toMatchObject({ status: 'unknown', clean: false })
    const state = evaluate({ codeql: { gate: 'not_required', status: 'fail', clean: true } })
    expect(state.codeql.clean).toBe(false)
    expect(state.codeql.status).toBe('fail')
    expect(state.codeql.gate).toBe('not_required')
    expect(state.next_action).toBe('ready_for_human_merge')
  })
})

describe('comment publication barrier', () => {
  const older = observation({
    observedAt: '2026-10-04T08:00:00.000Z',
    evaluationId: 'run-a',
    headSha: 'oldheadoldhead',
  })
  const newerState = observation({
    observedAt: '2026-10-04T09:00:00.000Z',
    evaluationId: 'run-b',
    headSha: 'newheadnewhead',
  })

  it('does not let an older run publish after the head changes', () => {
    const plan = planPublication({
      observation: older,
      currentHeadSha: 'newheadnewhead',
      comments: [comment(5, newerState)],
      cancelled: false,
    })
    expect(plan).toEqual({ action: 'skip', reason: 'stale-head', retireIds: [] })
  })

  it('lets the later same-head observation win and blocks the earlier one', () => {
    const first = observation({
      startedAt: '2026-10-04T08:00:00.000Z',
      observedAt: '2026-10-04T08:00:01.000Z',
      evaluationId: 'same-a',
    })
    const second = observation({
      startedAt: '2026-10-04T08:05:00.000Z',
      observedAt: '2026-10-04T08:05:01.000Z',
      evaluationId: 'same-b',
    })
    expect(planPublication({
      observation: first,
      currentHeadSha: first.head_sha,
      comments: [],
      cancelled: false,
    }).action).toBe('create')
    const afterFirst = planPublication({
      observation: second,
      currentHeadSha: second.head_sha,
      comments: [comment(5, first)],
      cancelled: false,
    })
    expect(afterFirst.action).toBe('create')
    const blocked = planPublication({
      observation: first,
      currentHeadSha: first.head_sha,
      comments: [comment(5, second)],
      cancelled: false,
    })
    expect(blocked.action).toBe('skip')
    expect(blocked.reason).toBe('stale-snapshot')
    expect(blocked.retireIds).not.toContain(5)
  })

  it('keeps a newer different-head comment when an older overlapping run finishes later', () => {
    const plan = planPublication({
      observation: older,
      currentHeadSha: older.head_sha,
      comments: [comment(9, newerState)],
      cancelled: false,
    })
    expect(plan.action).toBe('skip')
    expect(plan.reason).toBe('stale-snapshot')
    expect(plan.retireIds).toEqual([])
    const reconcile = planReconcile({
      observation: older,
      currentHeadSha: 'newheadnewhead',
      comments: [comment(4, older), comment(9, newerState)],
    })
    expect(reconcile.reason).toBe('stale-head')
    expect(reconcile.retireIds).toEqual([4])
    expect(reconcile.retireIds).not.toContain(9)
  })

  it('selects the newer marker when two runs both created one from an empty list', () => {
    const first = observation({
      startedAt: '2026-10-04T08:00:00.000Z',
      observedAt: '2026-10-04T08:00:01.000Z',
      evaluationId: 'create-a',
    })
    const second = observation({
      startedAt: '2026-10-04T08:00:02.000Z',
      observedAt: '2026-10-04T08:00:03.000Z',
      evaluationId: 'create-b',
    })
    expect(planPublication({ observation: first, currentHeadSha: first.head_sha, comments: [], cancelled: false }).action).toBe('create')
    expect(planPublication({ observation: second, currentHeadSha: second.head_sha, comments: [], cancelled: false }).action).toBe('create')
    const comments = [comment(11, first), comment(12, second)]
    expect(selectCanonicalMarker(comments)?.id).toBe(12)
    const reconcile = planReconcile({
      observation: first,
      currentHeadSha: first.head_sha,
      comments,
    })
    expect(reconcile.keepId).toBe(12)
    expect(reconcile.retireIds).toEqual([11])
    expect(retirementBody(second).includes(MARKER)).toBe(false)
  })

  it('does not publish after cancellation is requested', () => {
    try {
      requestStop()
      const plan = planPublication({
        observation: newerState,
        currentHeadSha: newerState.head_sha,
        comments: [],
        cancelled: false,
      })
      expect(plan).toEqual({ action: 'skip', reason: 'cancelled', retireIds: [] })
    } finally {
      clearStopForTests()
    }
    expect(planPublication({
      observation: newerState,
      currentHeadSha: newerState.head_sha,
      comments: [],
      cancelled: true,
    }).reason).toBe('cancelled')
  })
})

describe('consumer interpretation', () => {
  it('rejects a stale head, a malformed comment, and an unknown schema', () => {
    const state = observation({})
    const stale = interpretPublishedState([comment(1, state)], { headSha: 'different-head' })
    expect(stale.usable_as_cache).toBe(false)
    expect(stale.actionable_for_automation).toBe(false)
    expect(stale.may_merge).toBe(false)
    expect(stale.may_modify_code).toBe(false)
    expect(stale.reason).toBe('stale_head')

    const malformed = interpretPublishedState([{ id: 1, body: `${MARKER}\n\`\`\`json\n{not json\n\`\`\`\n` }], { headSha: state.head_sha })
    expect(malformed.reason).toBe('malformed')
    expect(malformed.actionable_for_automation).toBe(false)

    const unknown = observation({})
    unknown.schema_version = 99
    const unknownResult = interpretPublishedState([comment(2, unknown)], { headSha: unknown.head_sha })
    expect(unknownResult.reason).toBe('unknown_schema')
    expect(unknownResult.usable_as_cache).toBe(false)
  })

  it('treats ready_for_human_merge as a human-only cache and ignores an older duplicate', () => {
    const ready = observation({ observedAt: '2026-10-04T08:00:00.000Z', evaluationId: 'ready' })
    const waiting = observation({
      observedAt: '2026-10-04T09:00:00.000Z',
      evaluationId: 'wait',
      requiredChecks: { ...passing, 'Test and lint': 'pending' },
    })
    expect(ready.next_action).toBe('ready_for_human_merge')
    expect(waiting.next_action).toBe('wait')
    const result = interpretPublishedState(
      [comment(1, ready), comment(2, waiting)],
      { headSha: waiting.head_sha },
    )
    expect(result.usable_as_cache).toBe(true)
    expect(result.state?.next_action).toBe('wait')
    expect(result.actionable_for_automation).toBe(false)
    expect(result.may_merge).toBe(false)
    expect(result.may_modify_code).toBe(false)
    expect(result.human_only).toBe(false)

    const readyOnly = interpretPublishedState([comment(1, ready)], { headSha: ready.head_sha })
    expect(readyOnly.human_only).toBe(true)
    expect(readyOnly.may_merge).toBe(false)
    expect(readyOnly.actionable_for_automation).toBe(false)
    expect(readyOnly.state?.schema_version).toBe(SUPPORTED_SCHEMA_VERSION)
  })

  it('renders one parseable JSON block twice', () => {
    const state = observation({ findings: [finding] })
    const first = renderReviewComment(state)
    const second = renderReviewComment(state)
    expect(first).toBe(second)
    expect(first.split(MARKER)).toHaveLength(2)
    expect(extractMachineState(first)).toEqual(state)
    expect(state.freshness.live).toBe(false)
    expect(state.freshness.guarantee).toBe('none')
    expect(state.freshness.max_lag_minutes).toBeNull()
    expect(state.freshness.covers_thread_resolution).toBe(false)
  })
})

function memoryGitHub(head: string) {
  const comments: { id: number, body: string }[] = []
  let headSha = head
  let nextId = 1
  const calls: string[] = []
  return {
    calls,
    comments,
    setHead(sha: string) {
      headSha = sha
    },
    async readHead() {
      calls.push('readHead')
      return headSha
    },
    async listComments() {
      calls.push('listComments')
      return comments.map((comment) => ({ ...comment }))
    },
    async createComment(_number: number, body: string) {
      calls.push('create')
      const created = { id: nextId, body }
      nextId += 1
      comments.push(created)
      return { ...created }
    },
    async updateComment(id: number, body: string) {
      calls.push('update')
      if (body.includes('<!-- simy-review-state -->')) {
        throw new Error('publisher patched a marker body')
      }
      const found = comments.find((comment) => comment.id === id)
      if (!found) throw new Error(`missing comment ${id}`)
      found.body = body
      return { ...found }
    },
  }
}

function activeMarker(client: ReturnType<typeof memoryGitHub>) {
  return client.comments.find((comment) => comment.body.includes('<!-- simy-review-state -->'))
}

describe('publisher write barrier', () => {
  const head = 'abc123def456'

  function snapshot(partial: Record<string, unknown>) {
    return observation({ headSha: head, ...partial })
  }

  it('does not let a later-finished stale same-head snapshot become authoritative', async () => {
    const client = memoryGitHub(head)
    const fresh = snapshot({
      startedAt: '2026-10-04T09:00:00.000Z',
      observedAt: '2026-10-04T09:00:02.000Z',
      evaluationId: 'fresh',
    })
    const stale = snapshot({
      startedAt: '2026-10-04T08:00:00.000Z',
      observedAt: '2026-10-04T09:00:05.000Z',
      evaluationId: 'stale',
      requiredChecks: { ...passing, 'Test and lint': 'pending' },
    })
    expect(stale.observed_at > fresh.observed_at).toBe(true)
    expect(await publishObservation(client, 368, fresh)).toBe('published')
    expect(await publishObservation(client, 368, stale)).toBe('stale-snapshot')
    const marker = activeMarker(client)
    expect(marker?.body).toContain('"evaluation_id": "fresh"')
    expect(marker?.body).not.toContain('"evaluation_id": "stale"')
    expect(client.calls.filter((call) => call === 'update')).toEqual([])
  })

  it('serializes overlapping publishers and keeps the later-started observation', async () => {
    const client = memoryGitHub(head)
    const later = snapshot({
      startedAt: '2026-10-04T09:00:00.000Z',
      observedAt: '2026-10-04T09:00:02.000Z',
      evaluationId: 'later',
    })
    const earlier = snapshot({
      startedAt: '2026-10-04T08:00:00.000Z',
      observedAt: '2026-10-04T09:00:05.000Z',
      evaluationId: 'earlier',
      requiredChecks: { ...passing, 'Test and lint': 'pending' },
    })
    let releaseCreate: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      releaseCreate = resolve
    })
    let held = false
    const originalCreate = client.createComment.bind(client)
    client.createComment = async (number, body) => {
      if (!held) {
        held = true
        await gate
      }
      return originalCreate(number, body)
    }
    let readsAtGate = -1
    const entered = new Promise<void>((resolve) => {
      const original = client.createComment
      client.createComment = async (number, body) => {
        readsAtGate = client.calls.filter((call) => call === 'readHead').length
        resolve()
        return original(number, body)
      }
    })
    const first = publishObservation(client, 368, later)
    const second = publishObservation(client, 368, earlier)
    await entered
    expect(readsAtGate).toBe(3)
    expect(client.calls.filter((call) => call === 'create')).toEqual([])
    releaseCreate?.()
    await Promise.all([first, second])
    const markers = client.comments.filter((comment) => comment.body.includes('<!-- simy-review-state -->'))
    expect(markers).toHaveLength(1)
    expect(markers[0]?.body).toContain('"evaluation_id": "later"')
    expect(client.comments.some((comment) => comment.body.includes('"evaluation_id": "earlier"') && comment.body.includes('<!-- simy-review-state -->'))).toBe(false)
  })

  it('prefers the later start when both comments were created', () => {
    const fresh = snapshot({
      startedAt: '2026-10-04T09:00:00.000Z',
      observedAt: '2026-10-04T09:00:02.000Z',
      evaluationId: 'fresh',
    })
    const stale = snapshot({
      startedAt: '2026-10-04T08:00:00.000Z',
      observedAt: '2026-10-04T09:00:05.000Z',
      evaluationId: 'stale',
      requiredChecks: { ...passing, 'Test and lint': 'pending' },
    })
    const result = interpretPublishedState(
      [comment(1, stale), comment(2, fresh)],
      { headSha: head },
    )
    expect(result.usable_as_cache).toBe(true)
    expect(result.state?.evaluation_id).toBe('fresh')
    expect(result.actionable_for_automation).toBe(false)
    expect(result.state?.next_action).not.toBe('wait')
  })

  it('refuses a different head and leaves the canonical comment untouched', async () => {
    const client = memoryGitHub(head)
    const current = snapshot({
      startedAt: '2026-10-04T09:00:00.000Z',
      observedAt: '2026-10-04T09:00:02.000Z',
      evaluationId: 'current',
    })
    expect(await publishObservation(client, 368, current)).toBe('published')
    client.setHead('ffffffffffffffff')
    const late = snapshot({
      startedAt: '2026-10-04T08:00:00.000Z',
      observedAt: '2026-10-04T09:00:06.000Z',
      evaluationId: 'old-head',
      headSha: head,
    })
    expect(await publishObservation(client, 368, late)).toBe('stale-head')
    expect(activeMarker(client)?.body).toContain('"evaluation_id": "current"')
  })

  it('replaces an older same-head comment without patching its marker body', async () => {
    const client = memoryGitHub(head)
    const first = snapshot({
      startedAt: '2026-10-04T08:00:00.000Z',
      observedAt: '2026-10-04T08:00:01.000Z',
      evaluationId: 'first',
    })
    const second = snapshot({
      startedAt: '2026-10-04T09:00:00.000Z',
      observedAt: '2026-10-04T09:00:01.000Z',
      evaluationId: 'second',
    })
    expect(await publishObservation(client, 368, first)).toBe('published')
    expect(await publishObservation(client, 368, second)).toBe('published')
    const markers = client.comments.filter((comment) => comment.body.includes('<!-- simy-review-state -->'))
    expect(markers).toHaveLength(1)
    expect(markers[0]?.body).toContain('"evaluation_id": "second"')
    expect(client.comments.some((comment) => comment.body.includes('not canonical'))).toBe(true)
  })
})

describe('ruleset fail closed', () => {
  function input(ruleset: Record<string, unknown>) {
    return buildEvaluationInput({
      headSha: 'abc123def456',
      baseSha: 'def456abc123',
      mergeStateStatus: 'CLEAN',
      mergeable: true,
      ruleset,
      observedAt: '2026-10-04T08:00:00.000Z',
      startedAt: '2026-10-04T07:59:00.000Z',
      evaluationId: 'ruleset',
      prNumber: 368,
      scheduleAvailable: false,
      checkRuns: [
        { name: 'Test and lint', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
        { name: 'E2E login', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
        { name: 'Dependency review', status: 'completed', conclusion: 'success', completed_at: '2026-10-04T00:00:00Z' },
      ],
    })
  }

  it('accepts a verified ruleset whose live checks match the expected set', () => {
    const state = evaluateReviewState(input(verifiedRuleset))
    expect(state.next_action).toBe('ready_for_human_merge')
    expect(state.ruleset.matches_expected).toBe(true)
    expect(state.ruleset.consistent).toBe(true)
    expect(state.executor.human_only).toBe(true)
    expect(state.executor.may_automate).toBe(false)
  })

  it('does not turn an empty verified ruleset into the expected checks', () => {
    const built = input({
      verified: true,
      name: 'Protect main — Required CI',
      required_checks: [],
      matches_expected: true,
    })
    expect(built.ruleset.required_checks).toEqual([])
    expect(built.requiredChecks).toEqual({})
    const state = evaluateReviewState(built)
    expect(state.next_action).toBe('escalate')
    expect(state.ruleset.matches_expected).toBe(false)
    expect(state.ruleset.observed_required_checks).toEqual([])
    expect(state.blocking_reasons).toContain('ruleset_empty')
    expect(state.reason).toContain('no required status checks')
    expect(state.ruleset.policy_checks['Test and lint']).toBe('pass')
  })

  it('does not call a pull request ready when the ruleset cannot be read', () => {
    const state = evaluateReviewState(input({ verified: false, required_checks: ['Test and lint', 'E2E login', 'Dependency review'] }))
    expect(state.next_action).toBe('escalate')
    expect(state.ruleset.verified).toBe(false)
    expect(state.ruleset.observed_required_checks).toEqual([])
    expect(state.blocking_reasons).toContain('ruleset_unverified')
  })

  it('does not call a pull request ready when the live checks differ', () => {
    const state = evaluateReviewState(input({
      verified: true,
      required_checks: ['Test and lint', 'New required check'],
      matches_expected: true,
    }))
    expect(state.next_action).toBe('escalate')
    expect(state.ruleset.matches_expected).toBe(false)
    expect(state.ruleset.observed_required_checks).toEqual(['Test and lint', 'New required check'])
    expect(state.blocking_reasons).toContain('ruleset_mismatch')
    expect(state.required_checks['New required check']).toBe('pending')
  })
})

describe('freshness contract', () => {
  it('does not publish a finite thread bound before scheduled refresh exists', () => {
    const hidden = evaluate({ scheduleAvailable: false })
    expect(hidden.freshness).toMatchObject({
      review_threads: 'unknown',
      live: false,
      event_driven: true,
      covers_thread_resolution: false,
      scheduled: false,
      max_lag_minutes: null,
      guarantee: 'none',
    })
    const visible = evaluate({ scheduleAvailable: true })
    expect(visible.freshness.guarantee).toBe('scheduled')
    expect(visible.freshness.scheduled).toBe(true)
    expect(visible.freshness.max_lag_minutes).toBe(THREAD_REFRESH_MINUTES)
    expect(visible.freshness.covers_thread_resolution).toBe(false)
  })

  it('rejects a comment that claims a 15-minute bound without the scheduled guarantee', () => {
    const state = observation({})
    state.freshness = { ...state.freshness, max_lag_minutes: 15 }
    const result = interpretPublishedState([comment(1, state)], { headSha: state.head_sha })
    expect(result.usable_as_cache).toBe(false)
    expect(result.reason).toBe('inconsistent')
    expect(result.actionable_for_automation).toBe(false)
  })

  it('reads scheduled availability from the default branch, not from the pull request head', async () => {
    const paths: string[] = []
    const absent = await readWorkflowOnDefaultBranch(async (path) => {
      paths.push(path)
      if (path.endsWith('/contents/.github/workflows/review-state.yml?ref=main')) {
        return { status: 404, payload: null }
      }
      return { status: 200, payload: { default_branch: 'main' } }
    }, 'Kilchi555', 'driving-team-app')
    expect(absent).toBe(false)
    expect(paths.some((path) => path.includes('ref=main'))).toBe(true)

    const present = await readWorkflowOnDefaultBranch(async (path) => {
      if (path.includes('/contents/')) return { status: 200, payload: { type: 'file' } }
      return { status: 200, payload: { default_branch: 'main' } }
    }, 'Kilchi555', 'driving-team-app')
    expect(present).toBe(true)
  })
})

describe('rebase does not hide findings', () => {
  it('keeps an actionable Bugbot finding ahead of branch synchronization', () => {
    const state = evaluate({
      mergeStateStatus: 'BEHIND',
      mergeable: false,
      findings: [finding],
      reviewThreads: {
        unresolved_count: 1,
        unresolved_non_bugbot_count: 0,
        unresolved_bugbot_count: 1,
        uncertain: false,
      },
    })
    expect(state.next_action).toBe('fix')
    expect(state.sync_required).toBe(true)
    expect(state.sync_only).toBe(false)
    expect(state.actionable_findings).toEqual([
      { source: 'bugbot', title: finding.title, url: finding.url },
    ])
    expect(state.blocking_reasons).toContain('bugbot_finding')
    expect(state.executor.sync_only).toBe(false)
    expect(state.executor.before_acting.join(' ')).toContain('Bugbot')
  })

  it('does not turn an unresolved review thread into a sync-only rebase', () => {
    const state = evaluate({
      mergeStateStatus: 'BEHIND',
      mergeable: false,
      reviewThreads: {
        unresolved_count: 1,
        unresolved_non_bugbot_count: 1,
        unresolved_bugbot_count: 0,
        uncertain: false,
      },
    })
    expect(state.next_action).toBe('escalate')
    expect(state.sync_required).toBe(true)
    expect(state.sync_only).toBe(false)
    expect(state.blocking_reasons).toContain('unresolved_review_thread')
    expect(state.actionable_findings).toEqual([])
    expect(state.executor.before_acting.join(' ')).toContain('Do not automate')
  })

  it('uses rebase only when the review state is otherwise clean', () => {
    const state = evaluate({ mergeStateStatus: 'BEHIND', mergeable: false })
    expect(state.next_action).toBe('rebase')
    expect(state.sync_required).toBe(true)
    expect(state.sync_only).toBe(true)
    expect(state.blocking_reasons).toEqual([])
    expect(state.actionable_findings).toEqual([])
    expect(state.executor.sync_only).toBe(true)
    expect(state.executor.before_acting.join(' ')).toContain('Synchronize the branch')
    expect(state.reason).toContain('Synchronization only')
  })

  it('is ready for a human only when sync, findings, threads, checks, and the ruleset are clear', () => {
    const state = evaluate({})
    expect(state.next_action).toBe('ready_for_human_merge')
    expect(state.sync_required).toBe(false)
    expect(state.executor.human_only).toBe(true)
    expect(state.executor.may_automate).toBe(false)
    expect(state.executor.actions.ready_for_human_merge.join(' ')).toContain('human decides')
    expect(state.executor.actions.fix.join(' ')).toContain('Re-read the live pull request head')
    expect(state.executor.actions.escalate.join(' ')).toContain('Do not automate')
  })
})

describe('markdown cell escaping', () => {
  it('escapes backslashes before pipes and still turns newlines into spaces', () => {
    expect(cell('plain')).toBe('plain')
    expect(cell('a|b')).toBe('a\\|b')
    expect(cell('a\\b')).toBe('a\\\\b')
    expect(cell('a\\|b')).toBe('a\\\\\\|b')
    expect(cell('a\nb')).toBe('a b')
    expect(cell('a\\\n|b')).toBe('a\\\\ \\|b')

    const state = evaluate({
      ignoredNoise: [{ name: 'A|B\\C', status: 'fail', reason: 'line1\nline2' }],
    })
    expect(renderReviewComment(state)).toContain('| A\\|B\\\\C | fail | line1 line2 |')
    expect(renderReviewComment(state)).toContain('| Test and lint |')
  })
})

describe('review-state workflow safety', () => {
  it('asks only for read and comment permissions and refreshes threads on a schedule', () => {
    const workflow = readFileSync('.github/workflows/review-state.yml', 'utf8')
    expect(workflow).toContain('contents: read')
    expect(workflow).toContain('pull-requests: write')
    expect(workflow).toContain('checks: read')
    expect(workflow).toContain('persist-credentials: false')
    expect(workflow).toContain("cron: '*/15 * * * *'")
    expect(workflow).toContain('group: simy-review-state')
    expect(workflow).toContain('cancel-in-progress: false')
    expect(workflow).not.toContain('cancel-in-progress: true')
    expect(workflow).not.toContain('contents: write')
    expect(workflow).not.toContain('actions: write')
    expect(workflow).not.toContain('deployments: write')
    expect(workflow).not.toContain('security-events:')
    expect(workflow).not.toContain('pull_request_review_thread')
    expect(workflow).not.toMatch(/SUPABASE_|supabase\.co|apply_migration/i)
    const script = readFileSync('scripts/review-state.mjs', 'utf8')
    expect(script).toContain('SIGTERM')
    expect(script).toContain('stale-head')
    expect(script).not.toContain('contents: write')
  })
})
