import { describe, expect, it } from 'vitest'
import { shouldSendMetaBookingConversion } from '../meta-booking-conversion'
import { phoneLookupKeys } from '../lookup-phone-click-attribution'

describe('shouldSendMetaBookingConversion', () => {
  it('sends only first booking with Meta click id', () => {
    expect(shouldSendMetaBookingConversion({
      isFirstCustomerBooking: true,
      fbclid: 'abc',
    })).toBe(true)
    expect(shouldSendMetaBookingConversion({
      isFirstCustomerBooking: true,
      fbc: 'fb.1.1.abc',
    })).toBe(true)
  })

  it('blocks follow-up lessons and bookings without click id', () => {
    expect(shouldSendMetaBookingConversion({
      isFirstCustomerBooking: false,
      fbclid: 'abc',
    })).toBe(false)
    expect(shouldSendMetaBookingConversion({
      isFirstCustomerBooking: true,
    })).toBe(false)
    expect(shouldSendMetaBookingConversion({
      isFirstCustomerBooking: true,
      fbclid: '',
    })).toBe(false)
  })
})

describe('phoneLookupKeys', () => {
  it('returns E.164 and national Swiss variants', () => {
    expect(phoneLookupKeys('079 123 45 67')).toEqual(['+41791234567', '0791234567'])
    expect(phoneLookupKeys('+41 79 123 45 67')).toEqual(['+41791234567', '0791234567'])
  })

  it('returns empty for junk', () => {
    expect(phoneLookupKeys('')).toEqual([])
    expect(phoneLookupKeys(null)).toEqual([])
  })
})
