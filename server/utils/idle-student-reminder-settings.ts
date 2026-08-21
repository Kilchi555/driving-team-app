import { resolveCustomerChannels } from '~/server/utils/customer-notification-channel'

export type IdleStudentClientChannel = 'email' | 'sms' | 'email_first' | 'sms_first'

export const VALID_IDLE_STUDENT_CLIENT_CHANNELS: IdleStudentClientChannel[] = [
  'email',
  'sms',
  'email_first',
  'sms_first'
]

export const IDLE_STUDENT_SMS_RP_PER_SEGMENT = 15

export interface IdleStudentReminderSettings {
  enabled: boolean
  idleDays: number
  resendDays: number
  notifyClient: boolean
  notifyStaff: boolean
  notifyAdmin: boolean
  clientChannel: IdleStudentClientChannel
}

export const DEFAULT_IDLE_STUDENT_REMINDER_SETTINGS: IdleStudentReminderSettings = {
  enabled: false,
  idleDays: 30,
  resendDays: 14,
  notifyClient: true,
  notifyStaff: true,
  notifyAdmin: true,
  clientChannel: 'email_first'
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function normalizeIdleStudentClientChannel(value: unknown): IdleStudentClientChannel {
  if (VALID_IDLE_STUDENT_CLIENT_CHANNELS.includes(value as IdleStudentClientChannel)) {
    return value as IdleStudentClientChannel
  }
  return 'email_first'
}

export function resolveIdleStudentClientChannels(opts: {
  channel?: unknown
  hasEmail: boolean
  hasPhone: boolean
}): { sendEmail: boolean, sendSms: boolean } {
  const channel = normalizeIdleStudentClientChannel(opts.channel)
  return resolveCustomerChannels({
    channel: channel === 'email' || channel === 'sms' ? 'email_first' : channel,
    hasEmail: opts.hasEmail,
    hasPhone: opts.hasPhone,
    emailEnabled: channel !== 'sms',
    smsEnabled: channel !== 'email'
  })
}

export function parseIdleStudentReminderSettings(
  policy: Record<string, unknown> | null | undefined
): IdleStudentReminderSettings {
  const raw = policy || {}
  return {
    enabled: raw.idle_student_reminder_enabled === true,
    idleDays: clampInt(raw.idle_student_reminder_days, 30, 7, 365),
    resendDays: clampInt(raw.idle_student_reminder_resend_days, 14, 1, 90),
    notifyClient: raw.idle_student_reminder_notify_client !== false,
    notifyStaff: raw.idle_student_reminder_notify_staff !== false,
    notifyAdmin: raw.idle_student_reminder_notify_admin !== false,
    clientChannel: normalizeIdleStudentClientChannel(raw.idle_student_reminder_client_channel)
  }
}

export function assignedStaffIdsForStudent(student: {
  assigned_staff_id?: string | null
  assigned_staff_ids?: string[] | null
}): string[] {
  const ids = new Set<string>()
  if (student.assigned_staff_id) ids.add(student.assigned_staff_id)
  if (Array.isArray(student.assigned_staff_ids)) {
    for (const id of student.assigned_staff_ids) {
      if (typeof id === 'string' && id) ids.add(id)
    }
  }
  return [...ids]
}
