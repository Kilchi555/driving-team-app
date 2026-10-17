import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  categoryHasTheoryPricing,
  clientTheoryLessonPriceRappen,
} from '~/utils/theory-client-price'
import { appointmentSaveErrorMessage } from '~/utils/appointment-save-error'

describe('clientTheoryLessonPriceRappen', () => {
  it('prices from an active theory ppm without inventing CHF 85', () => {
    const priced = clientTheoryLessonPriceRappen({
      theoryPricePerMinuteRappen: 188.8889,
      durationMinutes: 45,
    })
    expect(priced.missingRule).toBe(false)
    expect(priced.priceRappen).toBe(8500)
  })

  it('marks missing rule when only base lesson would exist (no CHF 85 fallback)', () => {
    const priced = clientTheoryLessonPriceRappen({
      theoryPricePerMinuteRappen: 0,
      durationMinutes: 45,
    })
    expect(priced).toEqual({ priceRappen: 0, missingRule: true })
  })

  it('marks missing rule for null / undefined ppm', () => {
    expect(clientTheoryLessonPriceRappen({
      theoryPricePerMinuteRappen: null,
      durationMinutes: 45,
    }).missingRule).toBe(true)
    expect(clientTheoryLessonPriceRappen({
      durationMinutes: 45,
    }).missingRule).toBe(true)
  })
})

describe('categoryHasTheoryPricing', () => {
  it('treats category A enabled and B not when only A has a theory rule', () => {
    const enabled = ['A', 'A1']
    expect(categoryHasTheoryPricing('A', enabled)).toBe(true)
    expect(categoryHasTheoryPricing('a', enabled)).toBe(true)
    expect(categoryHasTheoryPricing('B', enabled)).toBe(false)
    expect(categoryHasTheoryPricing('', enabled)).toBe(false)
  })

  it('does not treat another tenant code as enabled via empty list', () => {
    expect(categoryHasTheoryPricing('B', [])).toBe(false)
  })
})

describe('appointmentSaveErrorMessage — NO_PRICE_RULE', () => {
  it('uses statusMessage when data.message is missing', () => {
    const msg = appointmentSaveErrorMessage({
      statusCode: 503,
      statusMessage: 'Der Preis für diese Buchung konnte nicht ermittelt werden. Bitte versuche es erneut oder kontaktiere uns direkt.',
      data: { code: 'NO_PRICE_RULE' },
      message: '[POST] "/api/appointments/save": 503',
    })
    expect(msg).toContain('Preis für diese Buchung')
    expect(msg).not.toContain('[POST]')
  })

  it('falls back to a German explanation when only the code is present', () => {
    const msg = appointmentSaveErrorMessage({
      data: { code: 'NO_PRICE_RULE' },
      message: '[POST] "/api/appointments/save": 503',
    })
    expect(msg.toLowerCase()).toContain('theoriepreis')
  })
})

describe('usePricing theory path — no invent CHF 85', () => {
  it('does not hardcode 8500 / 85 CHF fallback for theory in usePricing', () => {
    const src = readFileSync(resolve(process.cwd(), 'composables/usePricing.ts'), 'utf8')
    expect(src).toContain('clientTheoryLessonPriceRappen')
    expect(src).toContain('missing_price_rule')
    expect(src).not.toMatch(/THEORY_BASE_RAPPEN\s*=\s*8500/)
    expect(src).not.toMatch(/Standardpreis \(85 CHF\/45min\)/)
  })

  it('EventModal blocks save when theory price rule is missing', () => {
    const src = readFileSync(resolve(process.cwd(), 'components/EventModal.vue'), 'utf8')
    expect(src).toContain('theoryPriceRuleMissing')
    expect(src).toContain('categoryHasTheoryPricing')
    expect(src).toContain('kein gültiger Theoriepreis')
  })

  it('CategorySelector filters theory to theory-enabled categories', () => {
    const src = readFileSync(resolve(process.cwd(), 'components/CategorySelector.vue'), 'utf8')
    expect(src).toContain("appointmentType === 'theory'")
    expect(src).toContain('categoryHasTheoryPricing')
    expect(src).toContain('theoryEnabledCategories')
  })

  it('save form uses appointmentSaveErrorMessage for API failures', () => {
    const src = readFileSync(resolve(process.cwd(), 'composables/useEventModalForm.ts'), 'utf8')
    expect(src).toContain('appointmentSaveErrorMessage')
    expect(src).toContain('categoryHasTheoryPricing')
  })
})
