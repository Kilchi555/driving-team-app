import { createError } from 'h3'
import { logger } from '~/utils/logger'

export type LicenseValidationState =
  | 'VALID'
  | 'EXPIRED'
  | 'UNKNOWN_EXPIRATION'
  | 'INVALID_EXPIRATION'
  | 'NO_MATCHING_LICENSE'

export const UNKNOWN_LICENSE_EXPIRATION_MESSAGE =
  'Das Ablaufdatum Ihrer Lizenz konnte nicht eindeutig ermittelt werden. Bitte wenden Sie sich an die Fahrschule.'

export const INVALID_LICENSE_EXPIRATION_MESSAGE =
  'Das Ablaufdatum Ihrer Lizenz konnte nicht korrekt verarbeitet werden. Bitte wenden Sie sich an die Fahrschule.'

interface SARILicense {
  category: string
  expirationdate?: string | null
}

interface SARICustomer {
  licenses?: Array<SARILicense>
}

interface CourseSession {
  start_time: string
  end_time: string
}

interface Course {
  category: string
  course_sessions?: CourseSession[]
}

type ExpirationParse =
  | { kind: 'VALID_DATE'; date: Date }
  | { kind: 'UNKNOWN' }
  | { kind: 'INVALID' }

/**
 * Classify a SARI license expiration value without coercing null/0/false into Unix Epoch.
 * Only non-empty strings are parsed with Date.
 */
export function classifyExpirationDate(raw: unknown): ExpirationParse {
  if (raw === null || raw === undefined) {
    return { kind: 'UNKNOWN' }
  }
  if (typeof raw !== 'string') {
    return { kind: 'INVALID' }
  }
  const trimmed = raw.trim()
  if (trimmed === '') {
    return { kind: 'INVALID' }
  }
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    return { kind: 'INVALID' }
  }
  return { kind: 'VALID_DATE', date }
}

function formatDeChDate(date: Date): string {
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function throwLicenseError(state: Exclude<LicenseValidationState, 'VALID'>, statusMessage: string): never {
  throw createError({
    statusCode: 403,
    statusMessage,
    data: { licenseValidationState: state },
  })
}

/**
 * Validates if a customer's SARI license meets the course requirements and is valid for all sessions.
 * Throws an H3Error if validation fails.
 *
 * expirationdate null/missing → UNKNOWN_EXPIRATION (fail closed, never Date(null)/01.01.1970).
 * malformed / non-string expiration → INVALID_EXPIRATION (fail closed).
 */
export function validateLicense(course: Course, customerData: SARICustomer): void {
  if (!course.category) {
    logger.debug('ℹ️ Course has no category, skipping license validation.')
    return
  }

  const requiredCategory = course.category.toUpperCase()
  const customerLicenses = customerData.licenses || []

  let allowedCategories: string[] = []
  if (['PGS'].includes(requiredCategory)) {
    allowedCategories = ['A1', 'A35KW', 'A']
  } else if (['VKU'].includes(requiredCategory)) {
    allowedCategories = ['A1', 'A35KW', 'A', 'B']
  } else {
    allowedCategories = [requiredCategory]
  }

  const matchingLicenses = customerLicenses.filter(
    lic => allowedCategories.includes(String(lic.category || '').toUpperCase()),
  )

  if (matchingLicenses.length === 0) {
    throwLicenseError(
      'NO_MATCHING_LICENSE',
      `Für diesen Kurs benötigen Sie eine Lizenz der Kategorie ${allowedCategories.join(' oder ')}. Ihre Lizenzen: ${customerLicenses.map(l => l.category).join(', ') || 'Keine'}.`,
    )
  }

  const datedLicenses: Array<{ license: SARILicense; expiry: Date; categoryIndex: number }> = []
  let sawUnknown = false

  for (const license of matchingLicenses) {
    const parsed = classifyExpirationDate(license.expirationdate)
    if (parsed.kind === 'UNKNOWN') {
      sawUnknown = true
      continue
    }
    if (parsed.kind === 'INVALID') {
      continue
    }
    datedLicenses.push({
      license,
      expiry: parsed.date,
      categoryIndex: allowedCategories.indexOf(String(license.category).toUpperCase()),
    })
  }

  datedLicenses.sort((a, b) => {
    const expiryDiff = b.expiry.getTime() - a.expiry.getTime()
    if (expiryDiff !== 0) return expiryDiff
    return b.categoryIndex - a.categoryIndex
  })

  const bestDated = datedLicenses[0]
  if (!bestDated) {
    if (sawUnknown) {
      throwLicenseError('UNKNOWN_EXPIRATION', UNKNOWN_LICENSE_EXPIRATION_MESSAGE)
    }
    throwLicenseError('INVALID_EXPIRATION', INVALID_LICENSE_EXPIRATION_MESSAGE)
  }

  const licenseExpiry = bestDated.expiry
  const courseSessions = course.course_sessions || []
  if (courseSessions.length > 0) {
    const lastSessionEndTime = courseSessions
      .map(s => new Date(s.end_time))
      .sort((a, b) => b.getTime() - a.getTime())[0]

    if (lastSessionEndTime > licenseExpiry) {
      throwLicenseError(
        'EXPIRED',
        `Ihre Lizenz (Kategorie ${bestDated.license.category}) läuft am ${formatDeChDate(licenseExpiry)} ab, aber der letzte Kursteil findet am ${formatDeChDate(lastSessionEndTime)} statt. Bitte verlängern Sie zuerst Ihre Lizenz.`,
      )
    }
  } else {
    const now = new Date()
    if (licenseExpiry < now) {
      throwLicenseError(
        'EXPIRED',
        `Ihre Lizenz (Kategorie ${bestDated.license.category}) ist bereits am ${formatDeChDate(licenseExpiry)} abgelaufen.`,
      )
    }
  }
}
