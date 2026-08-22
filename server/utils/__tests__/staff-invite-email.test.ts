import { describe, expect, it } from 'vitest'
import {
  isDueForStaffInviteReminder,
  isPlaceholderStaffInviteEmail,
  STAFF_INVITE_REMINDER_AFTER_DAYS,
} from '../staff-invite-email'

describe('isDueForStaffInviteReminder', () => {
  const now = new Date('2026-08-21T12:00:00.000Z')
  const base = {
    status: 'pending',
    email: 'liridon.maliqi@gmx.ch',
    created_at: '2026-08-18T05:35:37.000Z',
    expires_at: '2026-09-17T05:35:37.000Z',
    reminder_sent_at: null,
  }

  it('is due after 3 days', () => {
    expect(STAFF_INVITE_REMINDER_AFTER_DAYS).toBe(3)
    expect(isDueForStaffInviteReminder(base, now)).toBe(true)
  })

  it('is not due before 3 days', () => {
    expect(isDueForStaffInviteReminder({
      ...base,
      created_at: '2026-08-19T12:00:00.000Z',
    }, now)).toBe(false)
  })

  it('skips already reminded, expired, accepted, and placeholder emails', () => {
    expect(isDueForStaffInviteReminder({ ...base, reminder_sent_at: now.toISOString() }, now)).toBe(false)
    expect(isDueForStaffInviteReminder({ ...base, expires_at: '2026-08-20T00:00:00.000Z' }, now)).toBe(false)
    expect(isDueForStaffInviteReminder({ ...base, status: 'accepted' }, now)).toBe(false)
    expect(isDueForStaffInviteReminder({
      ...base,
      email: 'nicole.wolter.1@onboarding.simy.ch',
    }, now)).toBe(false)
    expect(isPlaceholderStaffInviteEmail('pending_x@invite.simy.ch')).toBe(true)
  })
})
