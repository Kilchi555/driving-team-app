import { describe, expect, it, vi } from 'vitest'
import {
  getTenantSmsUsage,
  parseSmsQuotaAlertState,
  resolveCalendarSmsBillingPeriod,
  resolveSmsBillingPeriod,
  smsQuotaAlertPeriodsMatch,
} from '../sms-quota'

describe('resolveSmsBillingPeriod', () => {
  const now = new Date('2026-09-03T12:00:00.000Z')

  it('falls back to UTC calendar month when Stripe fields are missing', () => {
    const period = resolveSmsBillingPeriod({ now })
    expect(period.isCalendarFallback).toBe(true)
    expect(period.start.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(period.resetAt.toISOString()).toBe('2026-10-01T00:00:00.000Z')
    expect(period.periodKey).toContain('2026-09-01')
    expect(period.resetLabel).toMatch(/01\.10\.2026|10\/01\/2026|2026/)
  })

  it('uses Stripe start+end when both are valid and not expired', () => {
    const period = resolveSmsBillingPeriod({
      currentPeriodStart: '2026-08-24T09:18:58.000Z',
      currentPeriodEnd: '2026-09-24T09:18:58.000Z',
      now,
    })
    expect(period.isCalendarFallback).toBe(false)
    expect(period.start.toISOString()).toBe('2026-08-24T09:18:58.000Z')
    expect(period.resetAt.toISOString()).toBe('2026-09-24T09:18:58.000Z')
  })

  it('derives start ~1 month before end when start is null (production shape)', () => {
    const period = resolveSmsBillingPeriod({
      currentPeriodStart: null,
      currentPeriodEnd: '2026-09-24T09:18:58.000Z',
      now,
    })
    expect(period.isCalendarFallback).toBe(false)
    expect(period.resetAt.toISOString()).toBe('2026-09-24T09:18:58.000Z')
    expect(period.start.toISOString()).toBe('2026-08-24T09:18:58.000Z')
  })

  it('falls back when Stripe period end is already past (stale)', () => {
    const period = resolveSmsBillingPeriod({
      currentPeriodStart: '2026-07-01T00:00:00.000Z',
      currentPeriodEnd: '2026-08-01T00:00:00.000Z',
      now,
    })
    expect(period.isCalendarFallback).toBe(true)
    expect(period.start.toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('falls back when period is inverted', () => {
    const period = resolveSmsBillingPeriod({
      currentPeriodStart: '2026-09-20T00:00:00.000Z',
      currentPeriodEnd: '2026-09-10T00:00:00.000Z',
      now,
    })
    expect(period.isCalendarFallback).toBe(true)
  })

  it('matches resolveCalendarSmsBillingPeriod helper', () => {
    expect(resolveSmsBillingPeriod({ now })).toEqual(resolveCalendarSmsBillingPeriod(now))
  })
})

describe('sms quota alert helpers', () => {
  it('parseSmsQuotaAlertState accepts JSON string and object', () => {
    expect(parseSmsQuotaAlertState('{"period":"p1","warned80":true}')).toEqual({
      period: 'p1',
      warned80: true,
      warned100: false,
    })
    expect(parseSmsQuotaAlertState({ period: 'p2', warned100: true })).toEqual({
      period: 'p2',
      warned80: false,
      warned100: true,
    })
    expect(parseSmsQuotaAlertState('not-json')).toEqual({})
  })

  it('smsQuotaAlertPeriodsMatch resets on period change', () => {
    expect(smsQuotaAlertPeriodsMatch('a', 'a')).toBe(true)
    expect(smsQuotaAlertPeriodsMatch('a', 'b')).toBe(false)
    expect(smsQuotaAlertPeriodsMatch(undefined, 'a')).toBe(false)
  })
})

describe('getTenantSmsUsage', () => {
  it('filters billable rows with inclusive start and exclusive end', async () => {
    const lt = vi.fn().mockResolvedValue({
      data: [{ segment_count: 2 }, { segment_count: 3 }],
      error: null,
    })
    const gte = vi.fn(() => ({ lt }))
    const eqBillable = vi.fn(() => ({ gte }))
    const eqTenant = vi.fn(() => ({ eq: eqBillable }))
    const select = vi.fn(() => ({ eq: eqTenant }))
    const supabase = { from: vi.fn(() => ({ select })) } as unknown as import('@supabase/supabase-js').SupabaseClient

    const start = new Date('2026-09-01T00:00:00.000Z')
    const end = new Date('2026-10-01T00:00:00.000Z')
    const used = await getTenantSmsUsage(supabase, 'tenant-1', start, end)

    expect(supabase.from).toHaveBeenCalledWith('sms_logs')
    expect(eqTenant).toHaveBeenCalledWith('tenant_id', 'tenant-1')
    expect(eqBillable).toHaveBeenCalledWith('billable', true)
    expect(gte).toHaveBeenCalledWith('sent_at', start.toISOString())
    expect(lt).toHaveBeenCalledWith('sent_at', end.toISOString())
    expect(used).toBe(5)
  })

  it('omits end bound when periodEnd is not provided (legacy callers)', async () => {
    const gte = vi.fn().mockResolvedValue({
      data: [{ segment_count: 1 }],
      error: null,
    })
    const eqBillable = vi.fn(() => ({ gte }))
    const eqTenant = vi.fn(() => ({ eq: eqBillable }))
    const select = vi.fn(() => ({ eq: eqTenant }))
    const supabase = { from: vi.fn(() => ({ select })) } as unknown as import('@supabase/supabase-js').SupabaseClient

    const used = await getTenantSmsUsage(
      supabase,
      'tenant-1',
      new Date('2026-09-01T00:00:00.000Z'),
    )
    expect(used).toBe(1)
    expect(gte).toHaveBeenCalled()
  })
})
