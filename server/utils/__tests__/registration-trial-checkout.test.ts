import { describe, expect, it } from 'vitest'
import {
  decideRegistrationTrialForCheckout,
  isRegistrationCarryTrialSource,
  shouldEndStripeTrialOnWalleeActivate,
  shouldSendWalleeUpgradeOpsEmail,
  STRIPE_MIN_TRIAL_END_SECONDS,
} from '~/server/utils/registration-trial-checkout'

const NOW = new Date('2026-10-17T12:00:00.000Z')

describe('decideRegistrationTrialForCheckout', () => {
  it('carries future registration trial as absolute unix trial_end', () => {
    const end = new Date('2026-11-06T12:00:00.000Z') // 20 days
    const d = decideRegistrationTrialForCheckout(
      { is_trial: true, trial_ends_at: end.toISOString() },
      NOW,
    )
    expect(d.kind).toBe('carry')
    if (d.kind === 'carry') {
      expect(d.trialEndUnix).toBe(Math.floor(end.getTime() / 1000))
      expect(d.trialSource).toBe('registration_carry')
      expect(d.trialEndUnix - Math.floor(NOW.getTime() / 1000)).toBeGreaterThanOrEqual(
        STRIPE_MIN_TRIAL_END_SECONDS,
      )
    }
  })

  it('expired registration trial → no Stripe trial', () => {
    const d = decideRegistrationTrialForCheckout(
      { is_trial: true, trial_ends_at: '2026-10-01T00:00:00.000Z' },
      NOW,
    )
    expect(d).toEqual({ kind: 'expired_no_trial', trialSource: 'none' })
  })

  it('missing trial_ends_at on registration trial → reject', () => {
    const d = decideRegistrationTrialForCheckout({ is_trial: true, trial_ends_at: null }, NOW)
    expect(d.kind).toBe('reject')
    if (d.kind === 'reject') expect(d.code).toBe('trial_end_missing')
  })

  it('malformed trial_ends_at → reject', () => {
    const d = decideRegistrationTrialForCheckout(
      { is_trial: true, trial_ends_at: 'not-a-date' },
      NOW,
    )
    expect(d.kind).toBe('reject')
    if (d.kind === 'reject') expect(d.code).toBe('trial_end_invalid')
  })

  it('remaining under Stripe 48h minimum → reject without inventing extension', () => {
    const soon = new Date(NOW.getTime() + 24 * 60 * 60 * 1000)
    const d = decideRegistrationTrialForCheckout(
      { is_trial: true, trial_ends_at: soon.toISOString() },
      NOW,
    )
    expect(d.kind).toBe('reject')
    if (d.kind === 'reject') expect(d.code).toBe('trial_end_too_soon_for_stripe')
  })

  it('paid / non-registration tenant → not_registration_trial', () => {
    const d = decideRegistrationTrialForCheckout(
      { is_trial: false, trial_ends_at: '2026-11-01T00:00:00.000Z' },
      NOW,
    )
    expect(d).toEqual({ kind: 'not_registration_trial', trialSource: 'none' })
  })
})

describe('legacy vs registration_carry activate policy', () => {
  it('never ends Stripe trial on Wallee activate (soft-drain + carry-through)', () => {
    expect(shouldEndStripeTrialOnWalleeActivate(undefined)).toBe(false)
    expect(shouldEndStripeTrialOnWalleeActivate({})).toBe(false)
    expect(shouldEndStripeTrialOnWalleeActivate({ trial_source: 'registration_carry' })).toBe(false)
    expect(shouldEndStripeTrialOnWalleeActivate({ trial_source: 'none' })).toBe(false)
  })

  it('detects registration_carry metadata', () => {
    expect(isRegistrationCarryTrialSource({ trial_source: 'registration_carry' })).toBe(true)
    expect(isRegistrationCarryTrialSource({ trial_source: 'none' })).toBe(false)
    expect(isRegistrationCarryTrialSource({})).toBe(false)
  })
})

describe('shouldSendWalleeUpgradeOpsEmail idempotency', () => {
  it('sends once per subscription id; retries skip', () => {
    expect(shouldSendWalleeUpgradeOpsEmail(null, 'sub_1')).toBe(true)
    expect(shouldSendWalleeUpgradeOpsEmail(undefined, 'sub_1')).toBe(true)
    expect(shouldSendWalleeUpgradeOpsEmail('sub_1', 'sub_1')).toBe(false)
    expect(shouldSendWalleeUpgradeOpsEmail('sub_old', 'sub_1')).toBe(true)
    expect(shouldSendWalleeUpgradeOpsEmail('sub_1', '')).toBe(false)
  })
})
