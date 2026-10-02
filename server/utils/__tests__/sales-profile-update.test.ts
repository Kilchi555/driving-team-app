import { describe, expect, it } from 'vitest'
import { buildProfileWrite, resolveStoredFollowUp } from '../sales-profile-update'

const existing = {
  sales_status: 'contacted',
  assigned_to: '11111111-1111-1111-1111-111111111111',
  next_follow_up_at: '2026-10-20T00:00:00.000Z',
  notes: 'existing',
  objections: 'price',
  current_software: 'other',
  pain_points: 'calendar',
  interested_features: 'billing',
  lost_reason: 'timing',
  demo_booked_at: null,
}

describe('resolveStoredFollowUp', () => {
  it('preserves the stored follow-up when the field is omitted, null, or empty', () => {
    expect(resolveStoredFollowUp({}, existing.next_follow_up_at)).toEqual({
      value: existing.next_follow_up_at,
      logged: null,
    })
    expect(resolveStoredFollowUp({ next_follow_up_at: null }, existing.next_follow_up_at).value).toBe(existing.next_follow_up_at)
    expect(resolveStoredFollowUp({ next_follow_up_at: '' }, existing.next_follow_up_at).value).toBe(existing.next_follow_up_at)
  })

  it('stores a valid follow-up date', () => {
    const resolved = resolveStoredFollowUp({ next_follow_up_at: '2026-11-02' }, existing.next_follow_up_at)
    expect(resolved).toMatchObject({ logged: '2026-11-02T00:00:00.000Z' })
    if ('value' in resolved) expect(resolved.value).toBe('2026-11-02T00:00:00.000Z')
  })

  it('has no explicit clear sentinel: empty input preserves the stored date', () => {
    const resolved = resolveStoredFollowUp({ next_follow_up_at: '' }, existing.next_follow_up_at)
    expect(resolved).toEqual({ value: existing.next_follow_up_at, logged: null })
  })

  it('rejects an invalid date', () => {
    expect(resolveStoredFollowUp({ next_follow_up_at: 'tomorrow' }, existing.next_follow_up_at)).toEqual({ error: 'invalid_date' })
    expect(resolveStoredFollowUp({ next_follow_up_at: '2026-13-40' }, existing.next_follow_up_at)).toEqual({ error: 'invalid_date' })
  })
})

describe('buildProfileWrite', () => {
  it('updates only the supplied text field', () => {
    const write = buildProfileWrite({
      body: { objections: 'migration' },
      existing,
      now: '2026-10-02T00:00:00.000Z',
      fallbackAssignee: '22222222-2222-2222-2222-222222222222',
    })
    expect(write.ok).toBe(true)
    if (!write.ok) return
    expect(write.fields).toEqual({ objections: 'migration' })
    expect(write.fields.notes).toBeUndefined()
    expect(write.fields.current_software).toBeUndefined()
    expect(write.salesStatus).toBe('contacted')
  })

  it('ignores unknown fields', () => {
    const write = buildProfileWrite({
      body: { objections: 'migration', prospect_id: 'spoof', won_at: '2026-01-01', created_at: '2020-01-01' },
      existing,
      now: '2026-10-02T00:00:00.000Z',
      fallbackAssignee: null,
    })
    expect(write.ok).toBe(true)
    if (!write.ok) return
    expect(write.fields).toEqual({ objections: 'migration' })
  })

  it('rejects an invalid status, a non-text value, and oversized text', () => {
    expect(buildProfileWrite({
      body: { sales_status: 'send_now' },
      existing,
      now: '2026-10-02T00:00:00.000Z',
      fallbackAssignee: null,
    })).toMatchObject({ ok: false })
    expect(buildProfileWrite({
      body: { notes: 12 },
      existing,
      now: '2026-10-02T00:00:00.000Z',
      fallbackAssignee: null,
    })).toMatchObject({ ok: false, message: 'Text erwartet' })
    expect(buildProfileWrite({
      body: { objections: 'x'.repeat(2001) },
      existing,
      now: '2026-10-02T00:00:00.000Z',
      fallbackAssignee: null,
    })).toMatchObject({ ok: false, message: 'Text ist zu lang' })
  })
})
