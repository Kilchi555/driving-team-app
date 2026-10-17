import { describe, expect, it } from 'vitest'
import {
  evaluateTenantSubscriptionWriteAccess,
  type TenantSubscriptionWriteSnapshot,
} from '../tenant-subscription-write-access'

const NOW = new Date('2026-06-15T12:00:00.000Z')
const FUTURE = '2026-07-01T00:00:00.000Z'
const PAST = '2026-05-01T00:00:00.000Z'
const EXACT_NOW = '2026-06-15T12:00:00.000Z'

function snap(
  overrides: Partial<TenantSubscriptionWriteSnapshot> = {},
): TenantSubscriptionWriteSnapshot {
  return {
    is_trial: true,
    trial_ends_at: FUTURE,
    subscription_plan: 'trial',
    current_period_end: null,
    website_only: false,
    ...overrides,
  }
}

describe('evaluateTenantSubscriptionWriteAccess', () => {
  it('allows active trial before expiry', () => {
    expect(evaluateTenantSubscriptionWriteAccess(snap(), NOW)).toEqual({
      writable: true,
      reasonCode: 'active_trial',
    })
  })

  it('allows trial exactly at expiry instant (decideTrialGate: now > end)', () => {
    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({ trial_ends_at: EXACT_NOW }),
        NOW,
      ),
    ).toEqual({ writable: true, reasonCode: 'active_trial' })
  })

  it('denies expired trial', () => {
    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({ trial_ends_at: PAST }),
        NOW,
      ),
    ).toEqual({ writable: false, reasonCode: 'trial_expired' })
  })

  it('allows paid plan with future current_period_end', () => {
    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({
          is_trial: false,
          subscription_plan: 'starter',
          trial_ends_at: null,
          current_period_end: FUTURE,
        }),
        NOW,
      ),
    ).toEqual({ writable: true, reasonCode: 'paid_active' })
  })

  it('denies paid plan exactly at period end (now >= end)', () => {
    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({
          is_trial: false,
          subscription_plan: 'starter',
          trial_ends_at: null,
          current_period_end: EXACT_NOW,
        }),
        NOW,
      ),
    ).toEqual({ writable: false, reasonCode: 'paid_period_lapsed' })
  })

  it('denies paid plan after period end', () => {
    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({
          is_trial: false,
          subscription_plan: 'pro',
          trial_ends_at: null,
          current_period_end: PAST,
        }),
        NOW,
      ),
    ).toEqual({ writable: false, reasonCode: 'paid_period_lapsed' })
  })

  it('allows reactivated paid period in the future', () => {
    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({
          is_trial: false,
          subscription_plan: 'starter',
          trial_ends_at: PAST,
          current_period_end: FUTURE,
        }),
        NOW,
      ),
    ).toEqual({ writable: true, reasonCode: 'paid_active' })
  })

  it('preserves paid missing current_period_end as writable (nav compatibility)', () => {
    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({
          is_trial: false,
          subscription_plan: 'starter',
          trial_ends_at: null,
          current_period_end: null,
        }),
        NOW,
      ),
    ).toEqual({ writable: true, reasonCode: 'paid_period_missing_compat' })
  })

  it('bypasses SaaS write gate for website_only', () => {
    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({
          website_only: true,
          is_trial: true,
          trial_ends_at: PAST,
        }),
        NOW,
      ),
    ).toEqual({ writable: true, reasonCode: 'website_only_bypass' })
  })

  it('denies missing snapshot', () => {
    expect(evaluateTenantSubscriptionWriteAccess(null, NOW)).toEqual({
      writable: false,
      reasonCode: 'missing_snapshot',
    })
    expect(evaluateTenantSubscriptionWriteAccess(undefined, NOW)).toEqual({
      writable: false,
      reasonCode: 'missing_snapshot',
    })
  })

  it('denies inconsistent subscription state', () => {
    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({ is_trial: null as unknown as boolean }),
        NOW,
      ),
    ).toEqual({ writable: false, reasonCode: 'inconsistent_subscription_state' })

    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({
          is_trial: false,
          subscription_plan: 'trial',
          current_period_end: null,
        }),
        NOW,
      ),
    ).toEqual({ writable: false, reasonCode: 'inconsistent_subscription_state' })

    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({ trial_ends_at: 'not-a-date' }),
        NOW,
      ),
    ).toEqual({ writable: false, reasonCode: 'inconsistent_subscription_state' })

    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({
          is_trial: false,
          subscription_plan: 'starter',
          current_period_end: 'bad',
        }),
        NOW,
      ),
    ).toEqual({ writable: false, reasonCode: 'inconsistent_subscription_state' })
  })

  it('is deterministic for an injected now', () => {
    const a = evaluateTenantSubscriptionWriteAccess(
      snap({ trial_ends_at: '2026-06-15T12:00:00.001Z' }),
      NOW,
    )
    const b = evaluateTenantSubscriptionWriteAccess(
      snap({ trial_ends_at: '2026-06-15T12:00:00.001Z' }),
      NOW,
    )
    expect(a).toEqual(b)
    expect(a.writable).toBe(true)

    const later = new Date('2026-06-15T12:00:00.002Z')
    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({ trial_ends_at: '2026-06-15T12:00:00.001Z' }),
        later,
      ).writable,
    ).toBe(false)
  })

  it('allows active trial with missing trial_ends_at', () => {
    expect(
      evaluateTenantSubscriptionWriteAccess(
        snap({ trial_ends_at: null }),
        NOW,
      ),
    ).toEqual({ writable: true, reasonCode: 'active_trial' })
  })
})
