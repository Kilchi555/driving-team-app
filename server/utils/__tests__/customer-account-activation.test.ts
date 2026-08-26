import { describe, expect, it } from 'vitest'
import { allowsCustomerAccountActivation } from '../customer-account-activation'

describe('allowsCustomerAccountActivation', () => {
  it('defaults to allowed (SMS on, account required)', () => {
    expect(allowsCustomerAccountActivation({})).toBe(true)
    expect(allowsCustomerAccountActivation(null)).toBe(true)
  })

  it('allows when only public register creates a login', () => {
    expect(allowsCustomerAccountActivation({
      registration_account_mode: 'required',
      onboarding_sms_enabled: false,
      onboarding_email_enabled: false,
    })).toBe(true)
  })

  it('allows when only staff onboarding SMS is on', () => {
    expect(allowsCustomerAccountActivation({
      registration_account_mode: 'hidden',
      onboarding_sms_enabled: true,
      onboarding_email_enabled: false,
    })).toBe(true)
  })

  it('allows when only onboarding email is on', () => {
    expect(allowsCustomerAccountActivation({
      registration_account_mode: 'hidden',
      onboarding_sms_enabled: false,
      onboarding_email_enabled: true,
    })).toBe(true)
  })

  it('blocks when admin turned off account step and both onboarding channels', () => {
    expect(allowsCustomerAccountActivation({
      registration_account_mode: 'hidden',
      onboarding_sms_enabled: false,
      onboarding_email_enabled: false,
    })).toBe(false)
  })
})
