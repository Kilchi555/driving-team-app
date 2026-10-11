import { expect, test } from '@playwright/test'
import {
  evaluateEnrollmentFieldsE2EGate,
  ENROLLMENT_FIELDS_E2E_ENV,
} from '../utils/e2e-enrollment-fields-safety'
import { signIn } from './auth'

/**
 * Isolated HTTP tests against real enroll-cash / enroll-wallee routes.
 * Opt-in only. Refuses Production. Never completes a payment or enrollment
 * when Wallee mock/test short-circuit is unavailable — rejection cases only
 * unless E2E_ENROLLMENT_FIELDS_ALLOW_CASH_SUCCESS=1 on an isolated course.
 */

const isolationPassword = process.env.E2E_ISOLATION_PASSWORD
const EXPECTED_EMAIL = 'e2e-isolation@simy.ch'
const EXPECTED_TENANT_SLUG = 'e2e-isolation'
const gate = evaluateEnrollmentFieldsE2EGate(process.env)
const optedIn = process.env[ENROLLMENT_FIELDS_E2E_ENV] === '1'

const courseId = process.env.E2E_ENROLLMENT_FIELDS_COURSE_ID
const tenantSlug = process.env.E2E_ENROLLMENT_FIELDS_TENANT_SLUG || EXPECTED_TENANT_SLUG
const walleeSafeMode = process.env.E2E_ENROLLMENT_FIELDS_WALLEE_SAFE === '1'

if (optedIn && !gate.ok) {
  throw new Error(`Enrollment-fields HTTP E2E gate failed: ${gate.reason}`)
}

test.describe('enrollment fields HTTP manipulated requests (isolated)', () => {
  test.skip(!gate.ok, gate.ok ? '' : gate.reason)
  test.skip(!courseId, 'Set E2E_ENROLLMENT_FIELDS_COURSE_ID to an isolated non-SARI public course id')

  test('enroll-cash rejects hidden-field injection and invalid optional format', async ({ page }) => {
    await signIn(page, EXPECTED_EMAIL, EXPECTED_TENANT_SLUG, isolationPassword)

    const base = {
      courseId,
      tenantSlug,
      firstName: 'E2E',
      lastName: 'EnrollFields',
      email: `e2e-enroll-fields-${Date.now()}@example.invalid`,
      phone: '+41790000000',
      street: 'Bahnhofstrasse',
      streetNr: '1',
      zip: '8001',
      city: 'Zürich',
      birthdate: '1990-01-15',
      acceptTerms: true,
    }

    // Hidden license_number with non-empty value (requires category config license_number=hidden)
    const hiddenInject = await page.request.post('/api/courses/enroll-cash', {
      data: { ...base, licenseNumber: '123456789' },
    })
    // If category still has license required, this may 400 for other reasons or succeed —
    // only assert hidden reject when E2E_ENROLLMENT_FIELDS_LICENSE_HIDDEN=1
    if (process.env.E2E_ENROLLMENT_FIELDS_LICENSE_HIDDEN === '1') {
      expect(hiddenInject.status()).toBe(400)
      const body = await hiddenInject.json().catch(() => ({}))
      expect(JSON.stringify(body)).toMatch(/nicht erlaubt|Führerausweis/i)
    }

    // Optional empty street when configured optional
    if (process.env.E2E_ENROLLMENT_FIELDS_STREET_OPTIONAL === '1') {
      const emptyOptional = await page.request.post('/api/courses/enroll-cash', {
        data: { ...base, street: '', licenseNumber: '' },
      })
      // Must not fail specifically on street required; may still fail later (capacity etc.)
      const text = await emptyOptional.text()
      expect(text).not.toMatch(/Strasse ist erforderlich/)
    }

    // Invalid optional format
    if (process.env.E2E_ENROLLMENT_FIELDS_STREET_OPTIONAL === '1') {
      const badFormat = await page.request.post('/api/courses/enroll-cash', {
        data: { ...base, street: 'x' },
      })
      expect(badFormat.status()).toBe(400)
      expect(await badFormat.text()).toMatch(/Strasse ist ungültig|ungültig/i)
    }

    // Missing required field (default all-required)
    const missing = await page.request.post('/api/courses/enroll-cash', {
      data: { ...base, street: '', licenseNumber: '123456789' },
    })
    expect(missing.status()).toBe(400)
  })

  test('enroll-wallee field policy — no live payment', async ({ page }) => {
    test.skip(
      !walleeSafeMode,
      'BLOCKED: no safe Wallee mock/short-circuit flag (E2E_ENROLLMENT_FIELDS_WALLEE_SAFE=1). Refusing real payment attempts.',
    )

    await signIn(page, EXPECTED_EMAIL, EXPECTED_TENANT_SLUG, isolationPassword)

    const res = await page.request.post('/api/courses/enroll-wallee', {
      data: {
        courseId,
        tenantSlug,
        firstName: 'E2E',
        lastName: 'Wallee',
        email: `e2e-wallee-fields-${Date.now()}@example.invalid`,
        phone: '+41790000000',
        street: '',
        streetNr: '1',
        zip: '8001',
        city: 'Zürich',
        licenseNumber: '123456789',
        birthdate: '1990-01-15',
        acceptTerms: true,
      },
    })
    // Field policy must reject before payment provider is contacted
    expect(res.status()).toBe(400)
    expect(await res.text()).toMatch(/Strasse|erforderlich|ungültig|nicht erlaubt/i)
  })
})
