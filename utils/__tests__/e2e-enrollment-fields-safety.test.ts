import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ENROLLMENT_FIELDS_E2E_ENV,
  ENROLLMENT_FIELDS_HTTP_SPEC_BASENAME,
  ENROLLMENT_FIELDS_SPEC_BASENAME,
  evaluateEnrollmentFieldsE2EGate,
  isProductionAppBaseUrl,
  playwrightTestIgnoreForEnrollmentFields,
} from '~/utils/e2e-enrollment-fields-safety'

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')

describe('enrollment-fields E2E safety gate', () => {
  it('ignores specs by default (no Production side effects via CI discovery)', () => {
    expect(playwrightTestIgnoreForEnrollmentFields({})).toEqual([
      `**/${ENROLLMENT_FIELDS_SPEC_BASENAME}`,
      `**/${ENROLLMENT_FIELDS_HTTP_SPEC_BASENAME}`,
    ])
    expect(
      playwrightTestIgnoreForEnrollmentFields({ [ENROLLMENT_FIELDS_E2E_ENV]: '1' }),
    ).toEqual([])
  })

  it('rejects Production base URL and missing opt-in', () => {
    expect(isProductionAppBaseUrl('https://app.simy.ch')).toBe(true)
    expect(isProductionAppBaseUrl('http://127.0.0.1:3000')).toBe(false)
    expect(evaluateEnrollmentFieldsE2EGate({}).ok).toBe(false)
    expect(
      evaluateEnrollmentFieldsE2EGate({
        [ENROLLMENT_FIELDS_E2E_ENV]: '1',
        E2E_BASE_URL: 'https://app.simy.ch',
        E2E_ISOLATION_PASSWORD: 'x'.repeat(12),
      }).ok,
    ).toBe(false)
  })

  it('accepts isolated base URL with password + opt-in', () => {
    const gate = evaluateEnrollmentFieldsE2EGate({
      [ENROLLMENT_FIELDS_E2E_ENV]: '1',
      E2E_BASE_URL: 'http://127.0.0.1:3000/',
      E2E_ISOLATION_PASSWORD: 'x'.repeat(12),
    })
    expect(gate).toEqual({ ok: true, baseURL: 'http://127.0.0.1:3000' })
  })

  it('playwright.config wires enrollment-fields ignore helper', () => {
    const cfg = read('playwright.config.ts')
    expect(cfg).toContain('playwrightTestIgnoreForEnrollmentFields')
    expect(cfg).toContain('enrollmentFieldsIgnore')
  })
})
