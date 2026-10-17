/**
 * Full 6×3 field-mode matrix for category enrollment_fields.
 * Isolated unit data only — no production writes / enrollments.
 */
import { describe, expect, it } from 'vitest'
import {
  ENROLLMENT_FIELD_KEYS,
  ENROLLMENT_FIELD_PAYLOAD_KEYS,
  applyCategoryEnrollmentFieldPolicy,
  areConfigurableEnrollmentFieldsValid,
  CategoryEnrollmentFieldsError,
  isEnrollmentFieldRequired,
  isEnrollmentFieldVisible,
  parseCategoryEnrollmentFields,
  resolveCategoryEnrollmentFields,
  type EnrollmentFieldKey,
  type EnrollmentFieldMode,
  type CategoryEnrollmentFields,
} from '~/utils/category-enrollment-fields'

const VALID: Record<EnrollmentFieldKey, string> = {
  street: 'Musterstrasse',
  street_nr: '12',
  zip: '8000',
  city: 'Zürich',
  license_number: '123456789',
  birthdate: '1990-01-15',
}

const INVALID_SHORT: Record<EnrollmentFieldKey, string> = {
  street: 'x',
  street_nr: '',
  zip: '80',
  city: 'Z',
  license_number: '12',
  birthdate: '1990',
}

function toPolicyInput(byKey: Partial<Record<EnrollmentFieldKey, string>>) {
  return {
    street: byKey.street,
    streetNr: byKey.street_nr,
    zip: byKey.zip,
    city: byKey.city,
    licenseNumber: byKey.license_number,
    birthdate: byKey.birthdate,
  }
}

function toClientValues(byKey: Record<EnrollmentFieldKey, string>) {
  return {
    street: byKey.street,
    streetNr: byKey.street_nr,
    zip: byKey.zip,
    city: byKey.city,
    licenseNumber: byKey.license_number,
    birthdate: byKey.birthdate,
  }
}

function fieldsWith(
  key: EnrollmentFieldKey,
  mode: EnrollmentFieldMode,
): CategoryEnrollmentFields {
  return resolveCategoryEnrollmentFields({ [key]: mode })
}

describe('field mode matrix — all six keys × required|optional|hidden', () => {
  for (const key of ENROLLMENT_FIELD_KEYS) {
    describe(key, () => {
      it('required: visible + missing/invalid rejected; valid accepted', () => {
        const fields = fieldsWith(key, 'required')
        expect(isEnrollmentFieldVisible(fields, key)).toBe(true)
        expect(isEnrollmentFieldRequired(fields, key)).toBe(true)

        const missing = { ...VALID, [key]: '' }
        expect(() =>
          applyCategoryEnrollmentFieldPolicy(fields, toPolicyInput(missing)),
        ).toThrow(CategoryEnrollmentFieldsError)

        if (key !== 'street_nr') {
          // street_nr min length is 1; empty already covers required fail above
          const invalid = { ...VALID, [key]: INVALID_SHORT[key] }
          expect(() =>
            applyCategoryEnrollmentFieldPolicy(fields, toPolicyInput(invalid)),
          ).toThrow(CategoryEnrollmentFieldsError)
        }

        const ok = applyCategoryEnrollmentFieldPolicy(fields, toPolicyInput(VALID))
        const payloadKey = ENROLLMENT_FIELD_PAYLOAD_KEYS[key] as keyof typeof ok
        expect(ok[payloadKey]).toBe(VALID[key])

        expect(areConfigurableEnrollmentFieldsValid(fields, toClientValues(missing))).toBe(false)
        expect(areConfigurableEnrollmentFieldsValid(fields, toClientValues(VALID))).toBe(true)
      })

      it('optional: visible; empty allowed; invalid non-empty rejected; valid accepted', () => {
        const fields = fieldsWith(key, 'optional')
        expect(isEnrollmentFieldVisible(fields, key)).toBe(true)
        expect(isEnrollmentFieldRequired(fields, key)).toBe(false)

        const empty = applyCategoryEnrollmentFieldPolicy(
          fields,
          toPolicyInput({ ...VALID, [key]: '' }),
        )
        const payloadKey = ENROLLMENT_FIELD_PAYLOAD_KEYS[key] as keyof typeof empty
        expect(empty[payloadKey]).toBeNull()

        if (key !== 'street_nr') {
          expect(() =>
            applyCategoryEnrollmentFieldPolicy(
              fields,
              toPolicyInput({ ...VALID, [key]: INVALID_SHORT[key] }),
            ),
          ).toThrow(/ungültig/i)
        }

        const ok = applyCategoryEnrollmentFieldPolicy(fields, toPolicyInput(VALID))
        expect(ok[payloadKey]).toBe(VALID[key])

        expect(
          areConfigurableEnrollmentFieldsValid(
            fields,
            toClientValues({ ...VALID, [key]: '' }),
          ),
        ).toBe(true)
      })

      it('hidden: not visible; empty OK → null; non-empty rejected (manipulated client)', () => {
        const fields = fieldsWith(key, 'hidden')
        expect(isEnrollmentFieldVisible(fields, key)).toBe(false)
        expect(isEnrollmentFieldRequired(fields, key)).toBe(false)

        const absent = applyCategoryEnrollmentFieldPolicy(
          fields,
          toPolicyInput({ ...VALID, [key]: '' }),
        )
        const payloadKey = ENROLLMENT_FIELD_PAYLOAD_KEYS[key] as keyof typeof absent
        expect(absent[payloadKey]).toBeNull()

        expect(() =>
          applyCategoryEnrollmentFieldPolicy(fields, toPolicyInput(VALID)),
        ).toThrow(/nicht erlaubt/)

        // Client canSubmit ignores hidden values entirely
        expect(
          areConfigurableEnrollmentFieldsValid(
            fields,
            toClientValues({ ...VALID, [key]: '' }),
          ),
        ).toBe(true)
      })
    })
  }
})

describe('street_nr optional/hidden must not be forced required', () => {
  it('optional street_nr with empty value succeeds while other required fields stay enforced', () => {
    const fields = resolveCategoryEnrollmentFields({ street_nr: 'optional' })
    const out = applyCategoryEnrollmentFieldPolicy(
      fields,
      toPolicyInput({ ...VALID, street_nr: '' }),
    )
    expect(out.streetNr).toBeNull()
    expect(out.street).toBe('Musterstrasse')
    expect(() =>
      applyCategoryEnrollmentFieldPolicy(
        fields,
        toPolicyInput({ ...VALID, street_nr: '', street: '' }),
      ),
    ).toThrow(/Strasse ist erforderlich/)
  })

  it('hidden street_nr rejects injected streetNr and does not require it', () => {
    const fields = resolveCategoryEnrollmentFields({ street_nr: 'hidden' })
    expect(
      applyCategoryEnrollmentFieldPolicy(
        fields,
        toPolicyInput({ ...VALID, street_nr: '' }),
      ).streetNr,
    ).toBeNull()
    expect(() =>
      applyCategoryEnrollmentFieldPolicy(fields, toPolicyInput(VALID)),
    ).toThrow(/Hausnummer/)
  })
})

describe('invalid modes rejected at parse boundary', () => {
  for (const key of ENROLLMENT_FIELD_KEYS) {
    it(`${key}: mode "maybe" throws`, () => {
      expect(() => parseCategoryEnrollmentFields({ [key]: 'maybe' })).toThrow(/Ungültiger Modus/)
    })
  }
})

describe('legacy / missing config → all required defaults', () => {
  it('null, undefined, {}, array, string → DEFAULT all-required', () => {
    for (const raw of [null, undefined, {}, [], 'required', 1]) {
      const fields = resolveCategoryEnrollmentFields(raw)
      for (const key of ENROLLMENT_FIELD_KEYS) {
        expect(fields[key]).toBe('required')
      }
    }
  })
})
