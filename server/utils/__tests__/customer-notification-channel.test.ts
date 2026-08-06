import { describe, expect, it } from 'vitest'
import {
  normalizeCustomerNotificationChannel,
  resolveCustomerChannels,
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
