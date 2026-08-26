import { describe, expect, it } from 'vitest'
import {
  acquisitionSelfReportLabel,
  acquisitionSelfReportNeedsNote,
  customerOriginDisplay,
  normalizeAcquisitionSelfReport,
} from '~/utils/acquisition-self-report'

describe('normalizeAcquisitionSelfReport', () => {
  it('accepts a known option without a note', () => {
    expect(normalizeAcquisitionSelfReport('instagram')).toEqual({
      source: 'instagram',
      note: null,
    })
  })

  it('requires a note for recommendation and other', () => {
    expect(normalizeAcquisitionSelfReport('recommendation')).toBeNull()
    expect(normalizeAcquisitionSelfReport('other', '  ')).toBeNull()
    expect(normalizeAcquisitionSelfReport('recommendation', 'Lisa')).toEqual({
      source: 'recommendation',
      note: 'Lisa',
    })
  })

  it('rejects unknown values', () => {
    expect(normalizeAcquisitionSelfReport('radio')).toBeNull()
    expect(normalizeAcquisitionSelfReport('')).toBeNull()
    expect(normalizeAcquisitionSelfReport(null)).toBeNull()
  })
})

describe('customerOriginDisplay', () => {
  it('prefers self-report and keeps a different tracked channel', () => {
    expect(customerOriginDisplay({
      acquisition_self_reported: 'recommendation',
      acquisition_self_reported_note: 'Lisa',
      acquisition_source: 'google',
      acquisition_medium: 'cpc',
    })).toEqual({
      label: 'Empfehlung / Freund',
      note: 'Lisa',
      tracked: 'Google Ads',
    })
  })

  it('falls back to first-touch when nobody answered', () => {
    expect(customerOriginDisplay({
      acquisition_source: 'offline',
      acquisition_medium: 'staff',
    })).toEqual({
      label: 'Team / vor Ort',
      note: null,
      tracked: null,
    })
  })
})

describe('acquisitionSelfReport helpers', () => {
  it('labels known values and flags notes', () => {
    expect(acquisitionSelfReportLabel('google_ads')).toBe('Google-Werbung')
    expect(acquisitionSelfReportNeedsNote('other')).toBe(true)
    expect(acquisitionSelfReportNeedsNote('instagram')).toBe(false)
  })
})
