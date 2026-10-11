/**
 * Contract tests: non-SARI enroll validation uses category enrollment_fields.
 * Pure unit tests — no real enrollments, emails, invoices, payments, or DB writes.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  applyCategoryEnrollmentFieldPolicy,
  CategoryEnrollmentFieldsError,
  DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
  resolveCategoryEnrollmentFields,
} from '~/utils/category-enrollment-fields'

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')

/**
 * Mirrors enroll-cash / enroll-wallee non-SARI field handling without running handlers.
 */
function validateNonSariEnrollmentPayload(opts: {
  enrollment_fields: unknown
  street?: unknown
  streetNr?: unknown
  zip?: unknown
  city?: unknown
  licenseNumber?: unknown
  birthdate?: unknown
}) {
  const fields = resolveCategoryEnrollmentFields(opts.enrollment_fields)
  return applyCategoryEnrollmentFieldPolicy(fields, {
    street: opts.street,
    streetNr: opts.streetNr,
    zip: opts.zip,
    city: opts.city,
    licenseNumber: opts.licenseNumber,
    birthdate: opts.birthdate,
  })
}

describe('enroll-cash / enroll-wallee non-SARI field policy', () => {
  const valid = {
    street: 'Bahnhofstrasse',
    streetNr: '1',
    zip: '8001',
    city: 'Zürich',
    licenseNumber: '987654321',
    birthdate: '1988-05-20',
  }

  it('existing categories (null config) retain today\'s required fields', () => {
    expect(() =>
      validateNonSariEnrollmentPayload({
        enrollment_fields: null,
        street: '',
        streetNr: valid.streetNr,
        zip: valid.zip,
        city: valid.city,
        licenseNumber: valid.licenseNumber,
        birthdate: valid.birthdate,
      }),
    ).toThrow(CategoryEnrollmentFieldsError)

    const out = validateNonSariEnrollmentPayload({
      enrollment_fields: null,
      ...valid,
    })
    expect(out.street).toBe('Bahnhofstrasse')
    expect(out.licenseNumber).toBe('987654321')
  })

  it('server rejects missing required fields (cash + wallee share policy)', () => {
    for (const key of ['street', 'streetNr', 'zip', 'city', 'licenseNumber', 'birthdate'] as const) {
      expect(() =>
        validateNonSariEnrollmentPayload({
          enrollment_fields: DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
          ...valid,
          [key]: '',
        }),
      ).toThrow(/erforderlich|ungültig/i)
    }
  })

  it('street_nr optional/hidden is not forced required (manipulated client)', () => {
    const optionalOut = validateNonSariEnrollmentPayload({
      enrollment_fields: {
        ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
        street_nr: 'optional',
      },
      ...valid,
      streetNr: '',
    })
    expect(optionalOut.streetNr).toBeNull()
    expect(optionalOut.street).toBe('Bahnhofstrasse')

    expect(() =>
      validateNonSariEnrollmentPayload({
        enrollment_fields: {
          ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
          street_nr: 'hidden',
        },
        ...valid,
        streetNr: '99',
      }),
    ).toThrow(/nicht erlaubt/)

    const hiddenOk = validateNonSariEnrollmentPayload({
      enrollment_fields: {
        ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
        street_nr: 'hidden',
      },
      ...valid,
      streetNr: '',
    })
    expect(hiddenOk.streetNr).toBeNull()
  })

  it('optional field with invalid format is rejected (cash/wallee parity)', () => {
    expect(() =>
      validateNonSariEnrollmentPayload({
        enrollment_fields: {
          ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
          zip: 'optional',
        },
        ...valid,
        zip: '12',
      }),
    ).toThrow(/PLZ ist ungültig/)
  })

  it('optional fields may be empty; hidden fields persist as null', () => {
    const out = validateNonSariEnrollmentPayload({
      enrollment_fields: {
        ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
        street: 'optional',
        license_number: 'hidden',
      },
      ...valid,
      street: '',
      licenseNumber: undefined,
    })
    expect(out.street).toBeNull()
    expect(out.licenseNumber).toBeNull()
    expect(out.city).toBe('Zürich')
  })

  it('hidden-field reject policy: non-empty hidden payload → 400', () => {
    expect(() =>
      validateNonSariEnrollmentPayload({
        enrollment_fields: {
          ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
          license_number: 'hidden',
        },
        ...valid,
        licenseNumber: '123456789',
      }),
    ).toThrow(/nicht erlaubt/)
  })

  it('Nothelfer-like category: license_number=hidden omits collection', () => {
    const out = validateNonSariEnrollmentPayload({
      enrollment_fields: {
        ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
        license_number: 'hidden',
      },
      ...valid,
      licenseNumber: '',
    })
    expect(out.licenseNumber).toBeNull()
  })

  it('SARI path is unchanged (handlers still require faberid+birthdate before category fields)', () => {
    const cash = read('server/api/courses/enroll-cash.post.ts')
    const wallee = read('server/api/courses/enroll-wallee.post.ts')
    for (const src of [cash, wallee]) {
      expect(src).toContain("if (!faberid || !birthdate)")
      expect(src).toContain('Faber-ID und Geburtsdatum erforderlich')
      // Policy call site is only in the non-SARI else branch (import at top is ignored)
      const branchMarker = '// Non-SARI course — category enrollment_fields drive address/license/birthdate'
      const sariGateIdx = src.indexOf('Faber-ID und Geburtsdatum erforderlich')
      const nonSariBranchIdx = src.indexOf(branchMarker)
      expect(sariGateIdx).toBeGreaterThan(-1)
      expect(nonSariBranchIdx).toBeGreaterThan(sariGateIdx)
      const policyCallIdx = src.indexOf('sanitizedFields = applyCategoryEnrollmentFieldPolicy')
      expect(policyCallIdx).toBeGreaterThan(nonSariBranchIdx)
      const sariCustomerAssign = src.indexOf('customerData = await sari.getCustomer')
      expect(sariCustomerAssign).toBeGreaterThan(-1)
      expect(sariCustomerAssign).toBeLessThan(policyCallIdx)
    }
  })

  it('category comes from course embed (tenant-bound), not client categoryId', () => {
    const load = read('server/utils/course-custom-sessions.ts')
    expect(load).toContain('course_categories(')
    expect(load).toContain('enrollment_fields')
    expect(load).toContain('requestedTenantId !== course.tenant_id')
  })
})
