import { describe, expect, it } from 'vitest'
import {
  isAllowedProspectVatRate,
  mergeVatSelectionIntoAnalysis,
  readProspectVatSelection,
  resolveProspectVatRate,
} from '../website-prospect-vat'

describe('prospect VAT allowlist', () => {
  it('accepts Swiss product rates only', () => {
    expect(isAllowedProspectVatRate(0)).toBe(true)
    expect(isAllowedProspectVatRate(2.6)).toBe(true)
    expect(isAllowedProspectVatRate(3.8)).toBe(true)
    expect(isAllowedProspectVatRate(8.1)).toBe(true)
    expect(isAllowedProspectVatRate(7.7)).toBe(false)
    expect(isAllowedProspectVatRate(19)).toBe(false)
    expect(isAllowedProspectVatRate(null)).toBe(false)
  })
})

describe('resolveProspectVatRate', () => {
  it('reuses an authoritative existing tenant rate', () => {
    const r = resolveProspectVatRate({
      businessType: 'generic',
      existingTenantVatRate: 2.6,
    })
    expect(r).toMatchObject({
      ok: true,
      rate: 2.6,
      selection: { source: 'tenant_existing', rate_percent: 2.6 },
    })
  })

  it('uses education default 0 without silent 8.1', () => {
    const r = resolveProspectVatRate({ businessType: 'driving_school' })
    expect(r).toEqual({
      ok: true,
      rate: 0,
      selection: { rate_percent: 0, source: 'education_default' },
    })
  })

  it('requires explicit selection for ambiguous generic (no silent 8.1%)', () => {
    expect(resolveProspectVatRate({ businessType: 'generic' })).toEqual({
      ok: false,
      reason: 'selection_required',
    })
    expect(resolveProspectVatRate({ businessType: 'salon' })).toEqual({
      ok: false,
      reason: 'selection_required',
    })
  })

  it('persists and reuses an explicit selection from analysis', () => {
    const selected = resolveProspectVatRate({
      businessType: 'generic',
      selection: 8.1,
      nowIso: '2026-10-16T12:00:00.000Z',
    })
    expect(selected).toMatchObject({
      ok: true,
      rate: 8.1,
      selection: { rate_percent: 8.1, source: 'explicit_selection' },
    })
    const analysis = mergeVatSelectionIntoAnalysis(
      { findings: [], recommend_generate: true, summary: '' },
      selected.ok ? selected.selection : { rate_percent: 8.1, source: 'explicit_selection' },
    )
    const reused = resolveProspectVatRate({
      businessType: 'generic',
      selection: analysis,
    })
    expect(reused).toMatchObject({ ok: true, rate: 8.1 })
    expect(readProspectVatSelection(analysis)?.rate_percent).toBe(8.1)
  })

  it('rejects invalid rates', () => {
    expect(resolveProspectVatRate({ businessType: 'generic', selection: 7.7 })).toEqual({
      ok: false,
      reason: 'invalid_rate',
    })
  })
})
