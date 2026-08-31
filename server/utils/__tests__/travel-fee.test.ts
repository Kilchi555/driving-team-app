import { describe, expect, it } from 'vitest'
import {
  calculateTravelFee,
  destinationAddressFromUnknown,
  formatTravelFeeLabel,
  isTravelDestinationName,
  parseTravelFeeSettings,
  shouldApplyTravelFee,
  travelFeeMetaFromSurcharges,
} from '../travel-fee'
import { destinationFromQuoteInput, swissPlzOrNull } from '../travel-fee-quote'

describe('parseTravelFeeSettings', () => {
  it('defaults to disabled Haku-style rates', () => {
    expect(parseTravelFeeSettings(null)).toEqual({
      enabled: false,
      rappen_per_km: 150,
      max_rappen: 7500,
      free_km: 0,
      apply: 'address_only',
      origin_location_id: null,
    })
  })

  it('accepts stored JSON and clamps junk', () => {
    const parsed = parseTravelFeeSettings({
      enabled: true,
      rappen_per_km: 175,
      max_rappen: -20,
      free_km: 5,
      apply: 'offsite',
      origin_location_id: ' loc-1 ',
    })
    expect(parsed.enabled).toBe(true)
    expect(parsed.rappen_per_km).toBe(175)
    expect(parsed.max_rappen).toBe(0)
    expect(parsed.free_km).toBe(5)
    expect(parsed.apply).toBe('offsite')
    expect(parsed.origin_location_id).toBe('loc-1')
  })
})

describe('calculateTravelFee', () => {
  const settings = { rappen_per_km: 150, max_rappen: 7500, free_km: 0 }

  it('bills Haku rates: 10 km → CHF 15', () => {
    expect(calculateTravelFee(10, settings)).toEqual({
      km: 10,
      billable_km: 10,
      fee_rappen: 1500,
      capped: false,
    })
  })

  it('caps at max (CHF 75)', () => {
    const result = calculateTravelFee(80, settings)
    expect(result.km).toBe(80)
    expect(result.fee_rappen).toBe(7500)
    expect(result.capped).toBe(true)
  })

  it('subtracts free kilometres', () => {
    const result = calculateTravelFee(12, { ...settings, free_km: 5 })
    expect(result.billable_km).toBe(7)
    expect(result.fee_rappen).toBe(1050)
  })

  it('rounds to 5 rappen', () => {
    expect(calculateTravelFee(1.3, { rappen_per_km: 150, max_rappen: 0, free_km: 0 }).fee_rappen).toBe(195)
  })

  it('returns 0 for missing or negative distance', () => {
    expect(calculateTravelFee(0, settings).fee_rappen).toBe(0)
    expect(calculateTravelFee(-4, settings).fee_rappen).toBe(0)
  })
})

describe('shouldApplyTravelFee', () => {
  const base = {
    apply: 'address_only' as const,
    originLocationId: 'hq',
    locationId: 'hq',
    locationType: 'standard',
    locationName: 'Grossdietwil',
    hasDestinationAddress: false,
  }

  it('skips HQ and remote locations', () => {
    expect(shouldApplyTravelFee(base)).toBe(false)
    expect(shouldApplyTravelFee({ ...base, locationName: 'Online Call' })).toBe(false)
    expect(shouldApplyTravelFee({ ...base, locationType: 'phone', locationName: 'Telefon' })).toBe(false)
  })

  it('applies for pickup, Hausbesuch, or an address', () => {
    expect(shouldApplyTravelFee({ ...base, locationType: 'pickup' })).toBe(true)
    expect(shouldApplyTravelFee({ ...base, locationName: 'Hausbesuch' })).toBe(true)
    expect(shouldApplyTravelFee({ ...base, hasDestinationAddress: true })).toBe(true)
  })

  it('offsite also bills another training ground', () => {
    expect(shouldApplyTravelFee({
      ...base,
      apply: 'offsite',
      locationId: 'gondiswil',
      locationName: 'Trainingsplatz Gondiswil',
    })).toBe(true)
    expect(shouldApplyTravelFee({
      ...base,
      apply: 'address_only',
      locationId: 'gondiswil',
      locationName: 'Trainingsplatz Gondiswil',
    })).toBe(false)
  })
})

describe('helpers', () => {
  it('detects mobile location names', () => {
    expect(isTravelDestinationName('Hausbesuch')).toBe(true)
    expect(isTravelDestinationName('Beim Kunden')).toBe(true)
    expect(isTravelDestinationName('Gondiswil')).toBe(false)
  })

  it('pulls an address from string or object', () => {
    expect(destinationAddressFromUnknown(' Buchenweg 5 ')).toBe('Buchenweg 5')
    expect(destinationAddressFromUnknown({ address: 'Feldweg 1' })).toBe('Feldweg 1')
    expect(destinationAddressFromUnknown({})).toBe(null)
  })

  it('formats and extracts surcharge metadata', () => {
    expect(formatTravelFeeLabel({ km: 18.4, billable_km: 18.4, fee_rappen: 2760, capped: false }))
      .toBe('Anfahrt (18.4 km)')
    expect(formatTravelFeeLabel({ km: 80, billable_km: 80, fee_rappen: 7500, capped: true }))
      .toBe('Anfahrt (80 km, max.)')
    expect(travelFeeMetaFromSurcharges([
      { type: 'vehicle', rappen: 500, label: 'Auto' },
      { type: 'travel', rappen: 1500, km: 10, billable_km: 10, label: 'Anfahrt (10 km)' },
    ])).toMatchObject({ fee_rappen: 1500, km: 10, label: 'Anfahrt (10 km)' })
    expect(travelFeeMetaFromSurcharges([])).toBe(null)
  })

  it('turns a Swiss pickup PLZ into a geocodeable address', () => {
    expect(swissPlzOrNull('8001')).toBe('8001')
    expect(swissPlzOrNull('0123')).toBe(null)
    expect(destinationFromQuoteInput({ pickupPlz: '6144' })).toBe('PLZ 6144, Schweiz')
    expect(destinationFromQuoteInput({ destinationAddress: 'Buchenweg 5', pickupPlz: '6146' }))
      .toBe('Buchenweg 5')
  })
})
