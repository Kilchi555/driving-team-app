import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MARKER,
  NOISE_REASON,
  buildEvaluationInput,
  evaluateReviewState,
  extractMachineState,
  parseBugbot,
  planCommentWrites,
  renderReviewComment,
  retirementBody,
} from '../../scripts/review-state.mjs'

const passing = {
  'Test and lint': 'pass',
  'E2E login': 'pass',
  'Dependency review': 'pass',
} as const

function evaluate(overrides: Record<string, unknown> = {}) {
  return evaluateReviewState({
    headSha: 'abc123',
    baseSha: 'def456',
    mergeStateStatus: 'CLEAN',
    mergeable: true,
    requiredChecks: passing,
    codeqlCheck: 'pass',
    ignoredNoise: [],
    findings: [],
    bugbotUncertain: false,
    uncertain: false,
    ...overrides,
  })
}

describe('review state decisions', () => {
  it('waits while required checks are pending', () => {
    const state = evaluate({
      mergeStateStatus: 'UNKNOWN',
      mergeable: null,
      requiredChecks: {
        'Test and lint': 'pending',
        'E2E login': 'pending',
        'Dependency review': 'pending',
      },
      codeqlCheck: 'pending',
    })
    expect(state.next_action).toBe('wait')
    expect(state.reason).toBe('Required checks are still running.')
  })

  it('asks for a fix when a required check failed', () => {
    const state = evaluate({
      requiredChecks: { ...passing, 'Test and lint': 'fail' },
    })
    expect(state.next_action).toBe('fix')
    expect(state.reason).toBe('Required check `Test and lint` failed.')
  })

  it('asks for a rebase when the branch is behind the base', () => {
    const state = evaluate({ mergeStateStatus: 'BEHIND', mergeable: false })
    expect(state.next_action).toBe('rebase')
    expect(state.reason).toContain('behind')
  })

  it('asks for a fix when an open Bugbot finding exists', () => {
    const state = evaluate({
      findings: [{ title: 'Invoice paid before credit can fail', url: 'https://github.com/Kilchi555/driving-team-app/pull/360#discussion_r1' }],
    })
    expect(state.next_action).toBe('fix')
    expect(state.bugbot.count).toBe(1)
    expect(state.bugbot.comment_urls).toEqual([
      'https://github.com/Kilchi555/driving-team-app/pull/360#discussion_r1',
    ])
  })

  it('is ready for a human merge when required checks pass and nothing else is open', () => {
    const state = evaluate({ codeqlCheck: 'unknown' })
    expect(state.next_action).toBe('ready_for_human_merge')
    expect(state.codeql_check).toBe('unknown')
    expect(state.risk_hint).toBe('unknown')
    expect(state.reason).toContain('person still has to merge')
  })

  it('rebases a conflicting branch and still prefers a failed required check', () => {
    expect(evaluate({ mergeStateStatus: 'DIRTY', mergeable: false }).next_action).toBe('rebase')
    expect(evaluate({
      mergeStateStatus: 'BEHIND',
      mergeable: false,
      requiredChecks: { ...passing, 'Dependency review': 'fail' },
    }).next_action).toBe('fix')
  })

  it('escalates when a required check status is unrecognized', () => {
    const state = evaluate({
      requiredChecks: { ...passing, 'E2E login': 'unknown' },
    })
    expect(state.next_action).toBe('escalate')
    expect(state.reason).toContain('E2E login')
  })

  it('does not treat a red App Store check as a required failure', () => {
    const input = buildEvaluationInput({
      headSha: 'abc123',
      baseSha: 'def456',
      mergeStateStatus: 'UNSTABLE',
      mergeable: true,
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
    expect(state.required_checks['Test and lint']).toBe('pass')
    expect(renderReviewComment(state)).toContain('App \\| Default')
    expect(state.ignored_noise).toEqual([
      { name: 'App | Default', status: 'fail', reason: NOISE_REASON },
      { name: 'App | Default | Archive - iOS', status: 'fail', reason: NOISE_REASON },
    ])
  })

  it('renders the same comment twice and keeps one parseable JSON block', () => {
    const state = evaluate({
      findings: [{ title: 'Partial cash still pays other items', url: 'https://github.com/Kilchi555/driving-team-app/pull/360#discussion_r2' }],
      mergeStateStatus: 'CLEAN',
    })
    const first = renderReviewComment(state)
    const second = renderReviewComment(state)
    expect(first).toBe(second)
    expect(first.split(MARKER)).toHaveLength(2)
    expect(extractMachineState(first)).toEqual(state)
    expect(first.startsWith(MARKER)).toBe(true)
  })
})

describe('Bugbot parsing', () => {
  it('counts only unresolved current findings with a Bugbot id', () => {
    const parsed = parseBugbot({
      reviews: [
        { body: '<!-- BUGBOT_REVIEW -->\n<!-- BUGBOT_REVIEW_STALE -->\nStale Bugbot comment from a previous run.' },
        { body: '<!-- BUGBOT_REVIEW -->\nCursor Bugbot has reviewed your changes using default effort and found 1 potential issue.' },
      ],
      threads: [
        {
          isResolved: true,
          isOutdated: false,
          comment: {
            body: '### Resolved issue\n<!-- BUGBOT_BUG_ID: 14f67720-7c4b-47d2-8991-d8f5e6474c1c -->',
            url: 'https://github.com/Kilchi555/driving-team-app/pull/1#discussion_r1',
          },
        },
        {
          isResolved: false,
          isOutdated: false,
          comment: {
            body: '### Invoice paid before credit can fail\n<!-- BUGBOT_BUG_ID: 7687a38c-0f4a-46b4-8ec0-c52310fae59f -->',
            url: 'https://github.com/Kilchi555/driving-team-app/pull/1#discussion_r2',
          },
        },
      ],
    })
    expect(parsed.uncertain).toBe(false)
    expect(parsed.findings).toEqual([
      {
        title: 'Invoice paid before credit can fail',
        url: 'https://github.com/Kilchi555/driving-team-app/pull/1#discussion_r2',
      },
    ])
  })

  it('escalates when a live Bugbot review does not match the known sentence', () => {
    const parsed = parseBugbot({
      reviews: [{ body: '<!-- BUGBOT_REVIEW -->\nBugbot looked at this and has thoughts.' }],
      threads: [],
    })
    expect(parsed.uncertain).toBe(true)
    expect(evaluate({ bugbotUncertain: true }).next_action).toBe('escalate')
  })
})

describe('comment idempotency', () => {
  it('updates the oldest marker comment and retires newer copies', () => {
    const body = renderReviewComment(evaluate())
    const plan = planCommentWrites(
      [
        { id: 20, body: `${MARKER}\nold` },
        { id: 5, body: `${MARKER}\nolder` },
        { id: 7, body: 'unrelated' },
      ],
      body,
    )
    expect(plan).toEqual({ create: false, updateId: 5, retireIds: [20] })
    expect(retirementBody(5).includes(MARKER)).toBe(false)
    expect(planCommentWrites([{ id: 5, body }], body)).toEqual({
      create: false,
      updateId: null,
      retireIds: [],
    })
  })
})

describe('review-state workflow safety', () => {
  it('asks only for read and comment permissions', () => {
    const workflow = readFileSync('.github/workflows/review-state.yml', 'utf8')
    expect(workflow).toContain('contents: read')
    expect(workflow).toContain('pull-requests: write')
    expect(workflow).toContain('checks: read')
    expect(workflow).not.toContain('contents: write')
    expect(workflow).not.toContain('actions: write')
    expect(workflow).not.toContain('deployments: write')
    expect(workflow).not.toContain('security-events:')
    expect(workflow).not.toMatch(/SUPABASE_|supabase\.co|apply_migration/i)
  })
})
