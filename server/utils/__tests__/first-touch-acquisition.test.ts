import { describe, expect, it } from 'vitest'
import {
  acquisitionChannelLabel,
  cleanTrackingValue,
  deriveAcquisitionFields,
  hasAdsAcquisitionSignal,
  isPaidAcquisition,
  shouldApplyNewClientGate,
} from '../first-touch-acquisition'

describe('cleanTrackingValue', () => {
  it('drops ValueTrack placeholders and empty tokens', () => {
    expect(cleanTrackingValue('{campaignname}')).toBeNull()
    expect(cleanTrackingValue('{campaignid}')).toBeNull()
    expect(cleanTrackingValue('(none)')).toBeNull()
    expect(cleanTrackingValue('none')).toBeNull()
    expect(cleanTrackingValue('  ')).toBeNull()
    expect(cleanTrackingValue('24023050951')).toBe('24023050951')
  })
})

describe('deriveAcquisitionFields', () => {
  it('maps gclid to google/cpc when UTM is missing', () => {
    expect(deriveAcquisitionFields({ gclid: 'abc' })).toEqual({
      source: 'google',
      medium: 'cpc',
      campaign: null,
      term: null,
      gclid: 'abc',
      referrerPage: null,
    })
  })

  it('maps fbclid to facebook/paid_social', () => {
    const d = deriveAcquisitionFields({ fbclid: 'fb.1.x' })
    expect(d.source).toBe('facebook')
    expect(d.medium).toBe('paid_social')
    expect(d.gclid).toBeNull()
  })

  it('prefers real UTM over inferred click-id source', () => {
    const d = deriveAcquisitionFields({
      gclid: 'abc',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'VKU Kurs Lachen 2026',
    })
    expect(d.campaign).toBe('VKU Kurs Lachen 2026')
    expect(d.source).toBe('google')
  })

  it('uses referrer as organic/direct when no ads signal', () => {
    const d = deriveAcquisitionFields({}, '/auto-fahrschule-zuerich')
    expect(d.source).toBe('organic/direct')
    expect(d.medium).toBe('organic')
  })
})

describe('isPaidAcquisition', () => {
  it('detects Google, Meta, and gclid', () => {
    expect(isPaidAcquisition('google', 'cpc', null)).toBe(true)
    expect(isPaidAcquisition('facebook', 'paid_social', null)).toBe(true)
    expect(isPaidAcquisition('direct', 'none', 'gclid-1')).toBe(true)
    expect(isPaidAcquisition('organic/direct', 'organic', null)).toBe(false)
    expect(isPaidAcquisition('offline', 'staff', null)).toBe(false)
    expect(isPaidAcquisition('instagram', 'self_reported', null)).toBe(false)
    expect(isPaidAcquisition('google_ads', 'self_reported', null)).toBe(false)
  })
})

describe('new-client gate', () => {
  it('skips staff fallback on existing clients, not ads clicks', () => {
    expect(shouldApplyNewClientGate({ onlyIfNewClient: true, hasAdsSignal: false })).toBe(true)
    expect(shouldApplyNewClientGate({ onlyIfNewClient: true, hasAdsSignal: true })).toBe(false)
    expect(shouldApplyNewClientGate({ onlyIfNewClient: false, hasAdsSignal: false })).toBe(false)
    expect(hasAdsAcquisitionSignal(deriveAcquisitionFields({ gclid: 'abc' }))).toBe(true)
    expect(hasAdsAcquisitionSignal(deriveAcquisitionFields({}, '/blog'))).toBe(false)
  })
})

describe('acquisitionChannelLabel', () => {
  it('names ads channels without a campaign', () => {
    expect(acquisitionChannelLabel('google', 'cpc', null)).toBe('Google Ads')
    expect(acquisitionChannelLabel('facebook', 'paid_social', null)).toBe('Meta Ads')
    expect(acquisitionChannelLabel('offline', 'staff', null)).toBe('Team / vor Ort')
    expect(acquisitionChannelLabel('instagram', 'self_reported', null)).toBe('Instagram')
  })
})
