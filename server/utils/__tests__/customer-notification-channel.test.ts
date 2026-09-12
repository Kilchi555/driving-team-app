import { describe, expect, it } from 'vitest'
import {
  normalizeCustomerNotificationChannel,
  policyAllowsCustomerNotification,
  resolveCustomerChannels,
  resolvePolicyCustomerChannels,
} from '../customer-notification-channel'

describe('resolveCustomerChannels', () => {
  it('defaults unknown channel to email_first', () => {
    expect(normalizeCustomerNotificationChannel('nope')).toBe('email_first')
    expect(normalizeCustomerNotificationChannel(null)).toBe('email_first')
  })

  it('email_first: email when available, else SMS', () => {
    expect(resolveCustomerChannels({
      channel: 'email_first',
      hasEmail: true,
      hasPhone: true,
      emailEnabled: true,
      smsEnabled: true,
    })).toEqual({ sendEmail: true, sendSms: false })

    expect(resolveCustomerChannels({
      channel: 'email_first',
      hasEmail: false,
      hasPhone: true,
      emailEnabled: true,
      smsEnabled: true,
    })).toEqual({ sendEmail: false, sendSms: true })
  })

  it('sms_first: SMS when available, else email', () => {
    expect(resolveCustomerChannels({
      channel: 'sms_first',
      hasEmail: true,
      hasPhone: true,
      emailEnabled: true,
      smsEnabled: true,
    })).toEqual({ sendEmail: false, sendSms: true })

    expect(resolveCustomerChannels({
      channel: 'sms_first',
      hasEmail: true,
      hasPhone: false,
      emailEnabled: true,
      smsEnabled: true,
    })).toEqual({ sendEmail: true, sendSms: false })
  })

  it('both: sends every available enabled channel', () => {
    expect(resolveCustomerChannels({
      channel: 'both',
      hasEmail: true,
      hasPhone: true,
      emailEnabled: true,
      smsEnabled: true,
    })).toEqual({ sendEmail: true, sendSms: true })

    expect(resolveCustomerChannels({
      channel: 'both',
      hasEmail: true,
      hasPhone: true,
      emailEnabled: true,
      smsEnabled: false,
    })).toEqual({ sendEmail: true, sendSms: false })
  })
})

describe('policyAllowsCustomerNotification', () => {
  it('defaults missing keys to on', () => {
    expect(policyAllowsCustomerNotification({}, 'reminder', 'email')).toBe(true)
    expect(policyAllowsCustomerNotification({}, 'course_enrollment', 'sms')).toBe(false)
  })

  it('respects the master switch', () => {
    expect(policyAllowsCustomerNotification(
      { customer_notifications_enabled: false, confirmation_email_enabled: true },
      'confirmation',
      'email',
    )).toBe(false)
  })

  it('respects per-type email off', () => {
    expect(policyAllowsCustomerNotification(
      { reminder_email_enabled: false },
      'reminder',
      'email',
    )).toBe(false)
    expect(policyAllowsCustomerNotification(
      { reminder_email_enabled: false, reminder_sms_enabled: true },
      'reminder',
      'sms',
    )).toBe(true)
  })
})

describe('resolvePolicyCustomerChannels', () => {
  it('skips reminder email when that toggle is off', () => {
    expect(resolvePolicyCustomerChannels(
      { reminder_email_enabled: false, reminder_sms_enabled: true, customer_notification_channel: 'email_first' },
      'reminder',
      { hasEmail: true, hasPhone: true },
    )).toEqual({ sendEmail: false, sendSms: true })
  })

  it('sends nothing when master is off', () => {
    expect(resolvePolicyCustomerChannels(
      { customer_notifications_enabled: false, customer_notification_channel: 'both' },
      'confirmation',
      { hasEmail: true, hasPhone: true },
    )).toEqual({ sendEmail: false, sendSms: false })
  })
})
