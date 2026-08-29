import { describe, expect, it } from 'vitest'
import {
  calendarSmsQuotaAlertPeriodKey,
  parseSmsQuotaAlertState,
  smsQuotaAlertPeriodMonth,
  smsQuotaAlertPeriodsMatch,
} from '~/server/utils/sms-quota'

describe('SMS quota alert period matching', () => {
  it('uses UTC calendar month as the canonical key', () => {
    expect(calendarSmsQuotaAlertPeriodKey(new Date('2026-08-27T05:15:00.000Z'))).toBe('2026-08')
  })

  it('treats legacy Stripe ISO keys as the same month', () => {
    expect(smsQuotaAlertPeriodMonth('stripe:2026-08-05T08:11:36.000Z')).toBe('2026-08')
    expect(smsQuotaAlertPeriodsMatch('stripe:2026-08-05T08:11:36.000Z', '2026-08')).toBe(true)
    expect(smsQuotaAlertPeriodsMatch('2026-08', 'stripe:2026-08-05T08:11:36.000Z')).toBe(true)
    expect(smsQuotaAlertPeriodsMatch('calendar:2026-08-01T00:00:00.000Z', '2026-08')).toBe(true)
  })

  it('does not treat a new month as the same period', () => {
    expect(smsQuotaAlertPeriodsMatch('2026-08', '2026-09')).toBe(false)
    expect(smsQuotaAlertPeriodsMatch('stripe:2026-08-05T08:11:36.000Z', '2026-09')).toBe(false)
    expect(smsQuotaAlertPeriodsMatch(undefined, '2026-08')).toBe(false)
  })

  it('parses string, object, and double-encoded JSON state', () => {
    const state = { period: '2026-08', warned80: true, warned100: false }
    expect(parseSmsQuotaAlertState(state)).toEqual(state)
    expect(parseSmsQuotaAlertState(JSON.stringify(state))).toEqual(state)
    expect(parseSmsQuotaAlertState(JSON.stringify(JSON.stringify(state)))).toEqual(state)
    expect(parseSmsQuotaAlertState('not-json')).toEqual({})
  })
})
