import { describe, expect, it } from 'vitest'
import {
  assignedStaffIdsForStudent,
  parseIdleStudentReminderSettings,
  resolveIdleStudentClientChannels
} from '../idle-student-reminder-settings'
import { formatLastLessonLabel } from '../idle-student-reminder-emails'
import { createIdleStopToken, verifyIdleStopToken } from '../idle-stop-token'

describe('parseIdleStudentReminderSettings', () => {
  it('defaults to disabled and email_first client channel', () => {
    expect(parseIdleStudentReminderSettings(null)).toEqual({
      enabled: false,
      idleDays: 30,
      resendDays: 14,
      notifyClient: true,
      notifyStaff: true,
      notifyAdmin: true,
      clientChannel: 'email_first'
    })
  })

  it('reads enabled flags and clamps days', () => {
    expect(parseIdleStudentReminderSettings({
      idle_student_reminder_enabled: true,
      idle_student_reminder_days: 2,
      idle_student_reminder_resend_days: 120,
      idle_student_reminder_notify_client: false,
      idle_student_reminder_notify_staff: false,
      idle_student_reminder_client_channel: 'sms'
    })).toEqual({
      enabled: true,
      idleDays: 7,
      resendDays: 90,
      notifyClient: false,
      notifyStaff: false,
      notifyAdmin: true,
      clientChannel: 'sms'
    })
  })
})

describe('resolveIdleStudentClientChannels', () => {
  it('email: only email, no SMS fallback', () => {
    expect(resolveIdleStudentClientChannels({
      channel: 'email',
      hasEmail: true,
      hasPhone: true
    })).toEqual({ sendEmail: true, sendSms: false })

    expect(resolveIdleStudentClientChannels({
      channel: 'email',
      hasEmail: false,
      hasPhone: true
    })).toEqual({ sendEmail: false, sendSms: false })
  })

  it('sms: only SMS, no email fallback', () => {
    expect(resolveIdleStudentClientChannels({
      channel: 'sms',
      hasEmail: true,
      hasPhone: true
    })).toEqual({ sendEmail: false, sendSms: true })

    expect(resolveIdleStudentClientChannels({
      channel: 'sms',
      hasEmail: true,
      hasPhone: false
    })).toEqual({ sendEmail: false, sendSms: false })
  })

  it('email_first falls back to SMS when no email', () => {
    expect(resolveIdleStudentClientChannels({
      channel: 'email_first',
      hasEmail: true,
      hasPhone: true
    })).toEqual({ sendEmail: true, sendSms: false })

    expect(resolveIdleStudentClientChannels({
      channel: 'email_first',
      hasEmail: false,
      hasPhone: true
    })).toEqual({ sendEmail: false, sendSms: true })
  })

  it('sms_first falls back to email when no phone', () => {
    expect(resolveIdleStudentClientChannels({
      channel: 'sms_first',
      hasEmail: true,
      hasPhone: true
    })).toEqual({ sendEmail: false, sendSms: true })

    expect(resolveIdleStudentClientChannels({
      channel: 'sms_first',
      hasEmail: true,
      hasPhone: false
    })).toEqual({ sendEmail: true, sendSms: false })
  })
})

describe('assignedStaffIdsForStudent', () => {
  it('merges single and array assignment without duplicates', () => {
    expect(assignedStaffIdsForStudent({
      assigned_staff_id: 'a',
      assigned_staff_ids: ['a', 'b']
    })).toEqual(['a', 'b'])
  })
})

describe('formatLastLessonLabel', () => {
  it('labels missing and older lessons', () => {
    const now = new Date('2026-08-20T10:00:00.000Z')
    expect(formatLastLessonLabel({ lastStartTime: null, hasUpcoming: false }, now)).toBe('Noch kein Termin')
    expect(formatLastLessonLabel({
      lastStartTime: '2026-07-21T10:00:00.000Z',
      hasUpcoming: false
    }, now)).toContain('vor 30 Tagen')
  })
})

describe('idle stop token', () => {
  const userId = '64259d68-195a-4c68-8875-f1b44d962830'

  it('round-trips a valid user id', () => {
    const token = createIdleStopToken(userId)
    expect(verifyIdleStopToken(token)).toBe(userId)
  })

  it('rejects tampered tokens', () => {
    const token = createIdleStopToken(userId)
    expect(verifyIdleStopToken(token.slice(0, -1) + 'x')).toBeNull()
    expect(verifyIdleStopToken('not-a-token')).toBeNull()
    expect(verifyIdleStopToken('')).toBeNull()
  })
})

