/**
 * Category enrollment_fields resolver / policy unit tests.
 * No DB / network / production writes.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
  applyCategoryEnrollmentFieldPolicy,
  areConfigurableEnrollmentFieldsValid,
  CategoryEnrollmentFieldsError,
  isEnrollmentFieldRequired,
  isEnrollmentFieldVisible,
  parseCategoryEnrollmentFields,
  resolveCategoryEnrollmentFields,
} from '~/utils/category-enrollment-fields'

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')

describe('resolveCategoryEnrollmentFields — migration defaults', () => {
  it('null / undefined / empty object → all required (legacy non-SARI UI)', () => {
    expect(resolveCategoryEnrollmentFields(null)).toEqual(DEFAULT_CATEGORY_ENROLLMENT_FIELDS)
    expect(resolveCategoryEnrollmentFields(undefined)).toEqual(DEFAULT_CATEGORY_ENROLLMENT_FIELDS)
    expect(resolveCategoryEnrollmentFields({})).toEqual(DEFAULT_CATEGORY_ENROLLMENT_FIELDS)
  })

  it('migration DEFAULT JSON resolves to all required', () => {
    const migrationDefault = {
      street: 'required',
      street_nr: 'required',
      zip: 'required',
      city: 'required',
      license_number: 'required',
      birthdate: 'required',
    }
    expect(resolveCategoryEnrollmentFields(migrationDefault)).toEqual(
      DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
    )
  })

  it('partial overrides merge with defaults; invalid modes ignored', () => {
    expect(
      resolveCategoryEnrollmentFields({
        license_number: 'hidden',
        street: 'optional',
        zip: 'nope',
      }),
    ).toEqual({
      ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
      street: 'optional',
      license_number: 'hidden',
    })
  })

  it('Nothelfer-like: license_number=hidden keeps other fields required by default', () => {
    const fields = resolveCategoryEnrollmentFields({ license_number: 'hidden' })
    expect(fields.license_number).toBe('hidden')
    expect(isEnrollmentFieldVisible(fields, 'license_number')).toBe(false)
    expect(isEnrollmentFieldRequired(fields, 'street')).toBe(true)
    expect(isEnrollmentFieldRequired(fields, 'birthdate')).toBe(true)
  })
})

describe('parseCategoryEnrollmentFields', () => {
  it('accepts full and partial valid objects', () => {
    expect(parseCategoryEnrollmentFields(null)).toEqual(DEFAULT_CATEGORY_ENROLLMENT_FIELDS)
    expect(
      parseCategoryEnrollmentFields({
        street: 'optional',
        license_number: 'hidden',
      }),
    ).toMatchObject({ street: 'optional', license_number: 'hidden', zip: 'required' })
  })

  it('rejects invalid modes and unknown keys', () => {
    expect(() => parseCategoryEnrollmentFields({ street: 'maybe' })).toThrow(/Ungültiger Modus/)
    expect(() => parseCategoryEnrollmentFields({ first_name: 'required' })).toThrow(/Unbekanntes/)
    expect(() => parseCategoryEnrollmentFields('required')).toThrow(/Ungültige Anmeldefelder/)
  })
})

describe('applyCategoryEnrollmentFieldPolicy — server validation', () => {
  const fullValid = {
    street: 'Musterstrasse',
    streetNr: '12',
    zip: '8000',
    city: 'Zürich',
    licenseNumber: '123456789',
    birthdate: '1990-01-15',
  }

  it('required: missing fields throw 400-style errors', () => {
    const fields = resolveCategoryEnrollmentFields(null)
    expect(() =>
      applyCategoryEnrollmentFieldPolicy(fields, { ...fullValid, street: '' }),
    ).toThrow(CategoryEnrollmentFieldsError)
    expect(() =>
      applyCategoryEnrollmentFieldPolicy(fields, { ...fullValid, licenseNumber: '12' }),
    ).toThrow(/Führerausweis/)
  })

  it('required: valid payload returns trimmed values', () => {
    const fields = resolveCategoryEnrollmentFields(null)
    const out = applyCategoryEnrollmentFieldPolicy(fields, {
      ...fullValid,
      street: '  Musterstrasse  ',
    })
    expect(out.street).toBe('Musterstrasse')
    expect(out.licenseNumber).toBe('123456789')
  })

  it('optional: empty allowed; non-empty must meet format', () => {
    const fields = resolveCategoryEnrollmentFields({
      street: 'optional',
      street_nr: 'optional',
      zip: 'optional',
      city: 'optional',
      license_number: 'optional',
      birthdate: 'optional',
    })
    const empty = applyCategoryEnrollmentFieldPolicy(fields, {})
    expect(empty).toEqual({
      street: null,
      streetNr: null,
      zip: null,
      city: null,
      licenseNumber: null,
      birthdate: null,
    })
    expect(() =>
      applyCategoryEnrollmentFieldPolicy(fields, { street: 'x' }),
    ).toThrow(/Strasse ist ungültig/)
  })

  it('hidden: rejects non-empty payload (chosen policy)', () => {
    const fields = resolveCategoryEnrollmentFields({ license_number: 'hidden' })
    expect(() =>
      applyCategoryEnrollmentFieldPolicy(fields, {
        ...fullValid,
        licenseNumber: '123456789',
      }),
    ).toThrow(/nicht erlaubt/)
  })

  it('hidden: empty/absent is OK and persists as null', () => {
    const fields = resolveCategoryEnrollmentFields({ license_number: 'hidden' })
    const out = applyCategoryEnrollmentFieldPolicy(fields, {
      ...fullValid,
      licenseNumber: '',
    })
    expect(out.licenseNumber).toBeNull()
  })
})

describe('areConfigurableEnrollmentFieldsValid — UI canSubmit', () => {
  it('defaults require all six fields (legacy)', () => {
    const fields = resolveCategoryEnrollmentFields(null)
    expect(
      areConfigurableEnrollmentFieldsValid(fields, {
        street: 'Musterstrasse',
        streetNr: '12',
        zip: '8000',
        city: 'Zürich',
        licenseNumber: '123456789',
        birthdate: '1990-01-15',
      }),
    ).toBe(true)
    expect(
      areConfigurableEnrollmentFieldsValid(fields, {
        street: '',
        streetNr: '12',
        zip: '8000',
        city: 'Zürich',
        licenseNumber: '123456789',
        birthdate: '1990-01-15',
      }),
    ).toBe(false)
  })

  it('hidden license_number may be empty; optional birthdate may be empty', () => {
    const fields = resolveCategoryEnrollmentFields({
      license_number: 'hidden',
      birthdate: 'optional',
    })
    expect(
      areConfigurableEnrollmentFieldsValid(fields, {
        street: 'Musterstrasse',
        streetNr: '12',
        zip: '8000',
        city: 'Zürich',
        licenseNumber: '',
        birthdate: '',
      }),
    ).toBe(true)
  })
})

describe('source contracts', () => {
  it('migration DEFAULT preserves all-required semantics', () => {
    const sql = read('migrations/20261011_course_categories_enrollment_fields.sql')
    expect(sql).toContain('enrollment_fields')
    expect(sql).toContain('"street":"required"')
    expect(sql).toContain('"license_number":"required"')
    expect(sql).toContain('course_categories_enrollment_fields_chk')
    expect(sql).toMatch(/booking_policy/i) // documents independence
  })

  it('enroll-cash and enroll-wallee use shared policy for non-SARI', () => {
    const cash = read('server/api/courses/enroll-cash.post.ts')
    const wallee = read('server/api/courses/enroll-wallee.post.ts')
    for (const src of [cash, wallee]) {
      expect(src).toContain('applyCategoryEnrollmentFieldPolicy')
      expect(src).toContain('resolveCategoryEnrollmentFields')
      expect(src).toContain('course_category?.enrollment_fields')
    }
  })

  it('public course embed and enroll load expose enrollment_fields', () => {
    expect(read('server/api/courses/public.get.ts')).toContain('enrollment_fields')
    expect(read('server/utils/course-custom-sessions.ts')).toContain('enrollment_fields')
  })

  it('admin save whitelists and parses enrollment_fields', () => {
    const save = read('server/api/admin/course-categories/save.post.ts')
    expect(save).toContain("'enrollment_fields'")
    expect(save).toContain('parseCategoryEnrollmentFields')
  })

  it('CourseEnrollmentModal honors visibility / required / canSubmit helpers', () => {
    const modal = read('components/customer/CourseEnrollmentModal.vue')
    expect(modal).toContain('areConfigurableEnrollmentFieldsValid')
    expect(modal).toContain('isEnrollmentFieldVisible')
    expect(modal).toContain('isEnrollmentFieldRequired')
    expect(modal).toContain('resolveCategoryEnrollmentFields')
    // Hidden fields must not be collected on submit
    expect(modal).toContain("isEnrollmentFieldVisible('license_number')")
  })

  it('does not reuse booking_policy for category enrollment fields', () => {
    const util = read('utils/category-enrollment-fields.ts')
    expect(util).toContain('Independent of tenant booking_policy')
    expect(util).not.toMatch(/DEFAULT_BOOKING_POLICY|student_required_fields/)
  })
})
