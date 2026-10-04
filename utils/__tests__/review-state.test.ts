import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MARKER,
  NOISE_REASON,
  SUPPORTED_SCHEMA_VERSION,
  THREAD_REFRESH_MINUTES,
  analyzeReviews,
  buildEvaluationInput,
  clearStopForTests,
  evaluateReviewState,
  extractMachineState,
  interpretPublishedState,
  planPublication,
  planReconcile,
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
    const first = observation({ observedAt: '2026-10-04T08:00:00.000Z', evaluationId: 'same-a' })
    const second = observation({ observedAt: '2026-10-04T08:05:00.000Z', evaluationId: 'same-b' })
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
    expect(afterFirst.action).toBe('update')
    expect(afterFirst.updateId).toBe(5)
    const blocked = planPublication({
      observation: first,
      currentHeadSha: first.head_sha,
      comments: [comment(5, second)],
      cancelled: false,
    })
    expect(blocked.action).toBe('skip')
    expect(blocked.reason).toBe('older-than-canonical')
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
    expect(plan.reason).toBe('older-than-canonical')
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
    const first = observation({ observedAt: '2026-10-04T08:00:00.000Z', evaluationId: 'create-a' })
    const second = observation({ observedAt: '2026-10-04T08:00:01.000Z', evaluationId: 'create-b' })
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
    expect(state.freshness.max_lag_minutes).toBe(THREAD_REFRESH_MINUTES)
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
    expect(workflow).toContain('review-state-pr-')
    expect(workflow).toContain('cancel-in-progress: true')
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
