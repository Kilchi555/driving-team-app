import { describe, expect, it } from 'vitest'
import {
  generatePlatformReferralCode,
  normalizePlatformReferralCode,
  PLATFORM_REFERRAL_REWARD_RATE,
} from '../platform-referral'

describe('platform-referral', () => {
  it('normalizes codes to uppercase', () => {
    expect(normalizePlatformReferralCode(' sara-ab12 ')).toBe('SARA-AB12')
  })

  it('generates slug-based codes', () => {
    const code = generatePlatformReferralCode('fahrschule-sara')
    expect(code).toMatch(/^FAHRSCHULESA-[A-Z0-9]{4}$/)
  })

  it('uses 50% reward rate', () => {
    expect(PLATFORM_REFERRAL_REWARD_RATE).toBe(0.5)
    expect(Math.round(4900 * PLATFORM_REFERRAL_REWARD_RATE)).toBe(2450)
  })
})
