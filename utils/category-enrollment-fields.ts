/**
 * Category-level public course enrollment field modes (non-SARI).
 *
 * Modes:
 * - required: visible and mandatory
 * - optional: visible and not mandatory
 * - hidden: not displayed and not collected
 *
 * Defaults preserve today's non-SARI UI (all six fields required).
 * SARI identity flows must not use these settings.
 *
 * Hidden-field policy (server): reject non-empty submitted values with 400.
 * Empty / null / undefined for a hidden field is treated as not submitted.
 *
 * Independent of tenant booking_policy.
 */

export const ENROLLMENT_FIELD_KEYS = [
  'street',
  'street_nr',
  'zip',
  'city',
  'license_number',
  'birthdate',
] as const

export type EnrollmentFieldKey = (typeof ENROLLMENT_FIELD_KEYS)[number]

export const ENROLLMENT_FIELD_MODES = ['required', 'optional', 'hidden'] as const

export type EnrollmentFieldMode = (typeof ENROLLMENT_FIELD_MODES)[number]

export type CategoryEnrollmentFields = Record<EnrollmentFieldKey, EnrollmentFieldMode>

/** Safe defaults: match current non-SARI CourseEnrollmentModal requirements. */
export const DEFAULT_CATEGORY_ENROLLMENT_FIELDS: CategoryEnrollmentFields = {
  street: 'required',
  street_nr: 'required',
  zip: 'required',
  city: 'required',
  license_number: 'required',
  birthdate: 'required',
}

export const ENROLLMENT_FIELD_LABELS_DE: Record<EnrollmentFieldKey, string> = {
  street: 'Strasse',
  street_nr: 'Hausnummer',
  zip: 'PLZ',
  city: 'Ort',
  license_number: 'Führerausweis-Nr.',
  birthdate: 'Geburtsdatum',
}

/** Client payload keys (camelCase) for each DB/config key. */
export const ENROLLMENT_FIELD_PAYLOAD_KEYS: Record<EnrollmentFieldKey, string> = {
  street: 'street',
  street_nr: 'streetNr',
  zip: 'zip',
  city: 'city',
  license_number: 'licenseNumber',
  birthdate: 'birthdate',
}

export function isEnrollmentFieldMode(value: unknown): value is EnrollmentFieldMode {
  return value === 'required' || value === 'optional' || value === 'hidden'
}

/**
 * Resolve stored JSON (or null/undefined) to a complete typed config.
 * Unknown keys ignored; missing/invalid modes fall back to defaults.
 * Deterministic: null/undefined/{} → DEFAULT (all required).
 */
export function resolveCategoryEnrollmentFields(
  raw: unknown,
): CategoryEnrollmentFields {
  const resolved: CategoryEnrollmentFields = { ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS }
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return resolved
  }
  const obj = raw as Record<string, unknown>
  for (const key of ENROLLMENT_FIELD_KEYS) {
    const mode = obj[key]
    if (isEnrollmentFieldMode(mode)) {
      resolved[key] = mode
    }
  }
  return resolved
}

/**
 * Parse admin/API input for course_categories.enrollment_fields.
 * null / undefined → defaults (all required).
 * Partial objects allowed; missing keys filled from defaults.
 * Throws on invalid mode or non-object (when provided).
 */
export function parseCategoryEnrollmentFields(value: unknown): CategoryEnrollmentFields {
  if (value === null || value === undefined) {
    return { ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS }
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      'Ungültige Anmeldefelder. Erwartet wird ein Objekt mit Modi required, optional oder hidden.',
    )
  }
  const obj = value as Record<string, unknown>
  const result: CategoryEnrollmentFields = { ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS }
  for (const key of ENROLLMENT_FIELD_KEYS) {
    if (obj[key] === undefined) continue
    if (!isEnrollmentFieldMode(obj[key])) {
      throw new Error(
        `Ungültiger Modus für ${ENROLLMENT_FIELD_LABELS_DE[key]}. Erlaubt sind required, optional oder hidden.`,
      )
    }
    result[key] = obj[key]
  }
  // Reject unknown keys that look like field config mistakes
  for (const key of Object.keys(obj)) {
    if (!(ENROLLMENT_FIELD_KEYS as readonly string[]).includes(key)) {
      throw new Error(
        `Unbekanntes Anmeldefeld «${key}». Erlaubt sind: ${ENROLLMENT_FIELD_KEYS.join(', ')}.`,
      )
    }
  }
  return result
}

export function isEnrollmentFieldVisible(
  fields: CategoryEnrollmentFields,
  key: EnrollmentFieldKey,
): boolean {
  return fields[key] !== 'hidden'
}

export function isEnrollmentFieldRequired(
  fields: CategoryEnrollmentFields,
  key: EnrollmentFieldKey,
): boolean {
  return fields[key] === 'required'
}

function trimOrEmpty(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

function isNonEmptySubmitted(value: unknown): boolean {
  return trimOrEmpty(value).length > 0
}

/** Minimum length checks matching today's CourseEnrollmentModal rules. */
export function enrollmentFieldMeetsFormat(
  key: EnrollmentFieldKey,
  raw: unknown,
): boolean {
  const value = trimOrEmpty(raw)
  switch (key) {
    case 'street':
      return value.length >= 2
    case 'street_nr':
      return value.length >= 1
    case 'zip':
      return value.length >= 4
    case 'city':
      return value.length >= 2
    case 'license_number':
      return value.length >= 6
    case 'birthdate':
      return value.length >= 8
    default:
      return false
  }
}

export class CategoryEnrollmentFieldsError extends Error {
  statusCode = 400
  constructor(message: string) {
    super(message)
    this.name = 'CategoryEnrollmentFieldsError'
  }
}

export type NonSariEnrollmentFieldValues = {
  street?: unknown
  streetNr?: unknown
  zip?: unknown
  city?: unknown
  licenseNumber?: unknown
  birthdate?: unknown
}

/**
 * Validate + sanitize non-SARI enrollment address/identity fields.
 * Returns values ready for customerData / persistence (empty optional → null).
 * Hidden fields are never returned with a value; non-empty hidden payloads reject.
 */
export function applyCategoryEnrollmentFieldPolicy(
  fields: CategoryEnrollmentFields,
  input: NonSariEnrollmentFieldValues,
): {
  street: string | null
  streetNr: string | null
  zip: string | null
  city: string | null
  licenseNumber: string | null
  birthdate: string | null
} {
  const byKey: Record<EnrollmentFieldKey, unknown> = {
    street: input.street,
    street_nr: input.streetNr,
    zip: input.zip,
    city: input.city,
    license_number: input.licenseNumber,
    birthdate: input.birthdate,
  }

  const out: Record<EnrollmentFieldKey, string | null> = {
    street: null,
    street_nr: null,
    zip: null,
    city: null,
    license_number: null,
    birthdate: null,
  }

  for (const key of ENROLLMENT_FIELD_KEYS) {
    const mode = fields[key]
    const raw = byKey[key]
    const label = ENROLLMENT_FIELD_LABELS_DE[key]

    if (mode === 'hidden') {
      if (isNonEmptySubmitted(raw)) {
        throw new CategoryEnrollmentFieldsError(
          `Das Feld «${label}» ist für diese Kursart nicht erlaubt.`,
        )
      }
      out[key] = null
      continue
    }

    const trimmed = trimOrEmpty(raw)
    if (mode === 'required') {
      if (!enrollmentFieldMeetsFormat(key, trimmed)) {
        throw new CategoryEnrollmentFieldsError(`${label} ist erforderlich.`)
      }
      out[key] = trimmed
      continue
    }

    // optional
    if (!trimmed) {
      out[key] = null
      continue
    }
    if (!enrollmentFieldMeetsFormat(key, trimmed)) {
      throw new CategoryEnrollmentFieldsError(`${label} ist ungültig.`)
    }
    out[key] = trimmed
  }

  return {
    street: out.street,
    streetNr: out.street_nr,
    zip: out.zip,
    city: out.city,
    licenseNumber: out.license_number,
    birthdate: out.birthdate,
  }
}

/**
 * Client-side: whether configurable non-SARI fields pass for canSubmit.
 * Core name/email/phone/AGB are checked separately.
 */
export function areConfigurableEnrollmentFieldsValid(
  fields: CategoryEnrollmentFields,
  values: {
    street: string
    streetNr: string
    zip: string
    city: string
    licenseNumber: string
    birthdate: string
  },
): boolean {
  const byKey: Record<EnrollmentFieldKey, string> = {
    street: values.street,
    street_nr: values.streetNr,
    zip: values.zip,
    city: values.city,
    license_number: values.licenseNumber,
    birthdate: values.birthdate,
  }
  for (const key of ENROLLMENT_FIELD_KEYS) {
    const mode = fields[key]
    if (mode === 'hidden') continue
    if (mode === 'optional') {
      const v = trimOrEmpty(byKey[key])
      if (v && !enrollmentFieldMeetsFormat(key, v)) return false
      continue
    }
    if (!enrollmentFieldMeetsFormat(key, byKey[key])) return false
  }
  return true
}
