import { describe, expect, it } from 'vitest'
import {
  deriveSmsSenderFromTenantName,
  resolveSmsSenderName,
  toAlphanumericSenderId,
} from '../sms-sender'

describe('toAlphanumericSenderId', () => {
  it('strips umlauts and caps at 11 characters', () => {
    expect(toAlphanumericSenderId('Müller & Söhne')).toBe('Muller Sohn')
    expect(toAlphanumericSenderId('Müller & Söhne AG')).toBe('Muller Sohn')
    expect(toAlphanumericSenderId('Fahrschule Driving Team')).toBe('Fahrschule')
  })

  it('rejects names without a letter', () => {
    expect(toAlphanumericSenderId('12345')).toBeNull()
    expect(toAlphanumericSenderId('   ')).toBeNull()
  })
})

describe('deriveSmsSenderFromTenantName', () => {
  it('does not truncate "Fahrschule Driving Team" to generic Fahrschule', () => {
    expect(deriveSmsSenderFromTenantName('Fahrschule Driving Team')).toBe('DrivingTeam')
  })

  it('compacts a short brand name', () => {
    expect(deriveSmsSenderFromTenantName('Driving Team')).toBe('DrivingTeam')
  })

  it('keeps a distinctive first word when there is no generic prefix', () => {
    expect(deriveSmsSenderFromTenantName('Lumi Fahrschule GmbH')).toBe('Lumi')
  })

  it('uses the brand after Fahrschule', () => {
    expect(deriveSmsSenderFromTenantName('Fahrschule Gemperli')).toBe('Gemperli')
    expect(deriveSmsSenderFromTenantName('Fahrschule By Nicole')).toBe('ByNicole')
  })
})

describe('resolveSmsSenderName', () => {
  it('prefers the configured Twilio sender over the legal tenant name', () => {
    expect(resolveSmsSenderName({
      twilioFromSender: 'DrivingTeam',
      tenantName: 'Fahrschule Driving Team',
      fallback: 'Fahrschule',
    })).toBe('DrivingTeam')
  })

  it('derives a brand sender when no Twilio sender is set', () => {
    expect(resolveSmsSenderName({
      tenantName: 'Fahrschule Driving Team',
      fallback: 'Fahrschule',
    })).toBe('DrivingTeam')
  })

  it('ignores a generic fallback when a tenant name exists', () => {
    expect(resolveSmsSenderName({
      tenantName: 'Driving Team',
      fallback: 'Fahrschule',
    })).toBe('DrivingTeam')
  })
})
