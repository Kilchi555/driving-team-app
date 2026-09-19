import { describe, expect, it } from 'vitest'
import {
  classifyExpirationDate,
  INVALID_LICENSE_EXPIRATION_MESSAGE,
  validateLicense,
} from '../license-validation'

interface LicenseErrorShape {
  statusCode?: number
  statusMessage?: string
  data?: { licenseValidationState?: string }
}

function catchLicenseError(fn: () => void): LicenseErrorShape {
  try {
    fn()
    throw new Error('expected validateLicense to throw')
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'expected validateLicense to throw') throw error
    const h3 = error as LicenseErrorShape
    return {
      statusCode: h3.statusCode,
      statusMessage: h3.statusMessage,
      data: h3.data,
    }
  }
}

const vkuCourse = {
  category: 'VKU',
  course_sessions: [
    { start_time: '2026-10-16T08:00:00', end_time: '2026-10-16T16:00:00' },
    { start_time: '2026-10-17T08:00:00', end_time: '2026-10-17T16:00:00' },
  ],
}

describe('classifyExpirationDate', () => {
  it('treats null, undefined, empty, and whitespace as ABSENT without using Date', () => {
    expect(classifyExpirationDate(null)).toEqual({ kind: 'ABSENT' })
    expect(classifyExpirationDate(undefined)).toEqual({ kind: 'ABSENT' })
    expect(classifyExpirationDate('')).toEqual({ kind: 'ABSENT' })
    expect(classifyExpirationDate('   ')).toEqual({ kind: 'ABSENT' })
  })

  it('treats 0, false, and malformed strings as INVALID', () => {
    expect(classifyExpirationDate(0)).toEqual({ kind: 'INVALID' })
    expect(classifyExpirationDate(false)).toEqual({ kind: 'INVALID' })
    expect(classifyExpirationDate('not-a-date')).toEqual({ kind: 'INVALID' })
  })

  it('parses a non-empty date string', () => {
    const parsed = classifyExpirationDate('2027-12-31')
    expect(parsed.kind).toBe('VALID_DATE')
    if (parsed.kind === 'VALID_DATE') {
      expect(Number.isNaN(parsed.date.getTime())).toBe(false)
    }
  })
})

describe('validateLicense', () => {
  it('Test 1: valid future date continues (VALID)', () => {
    expect(() =>
      validateLicense(vkuCourse, {
        licenses: [{ category: 'A1', expirationdate: '2027-12-31' }],
      }),
    ).not.toThrow()
  })

  it('Test 2: genuine expired date throws EXPIRED with the real date, not 1970', () => {
    const err = catchLicenseError(() =>
      validateLicense(vkuCourse, {
        licenses: [{ category: 'A1', expirationdate: '2026-09-15' }],
      }),
    )
    expect(err.statusCode).toBe(403)
    expect(err.data?.licenseValidationState).toBe('EXPIRED')
    expect(err.statusMessage).toMatch(/läuft am 15\.09\.2026 ab/)
    expect(err.statusMessage).toMatch(/17\.10\.2026/)
    expect(err.statusMessage).not.toContain('01.01.1970')
  })

  it('Test 3: null expiration is ABSENT and allows enrollment', () => {
    expect(() =>
      validateLicense(vkuCourse, {
        licenses: [{ category: 'A1', expirationdate: null }],
      }),
    ).not.toThrow()
  })

  it('Test 4: missing expiration field is ABSENT and allows enrollment', () => {
    expect(() =>
      validateLicense(vkuCourse, {
        licenses: [{ category: 'A1' }],
      }),
    ).not.toThrow()
  })

  it('undefined expiration is ABSENT and allows enrollment', () => {
    expect(() =>
      validateLicense(vkuCourse, {
        licenses: [{ category: 'A1', expirationdate: undefined }],
      }),
    ).not.toThrow()
  })

  it('empty string expiration is ABSENT and allows enrollment', () => {
    expect(() =>
      validateLicense(vkuCourse, {
        licenses: [{ category: 'A1', expirationdate: '' }],
      }),
    ).not.toThrow()
  })

  it('whitespace expiration is ABSENT and allows enrollment', () => {
    expect(() =>
      validateLicense(vkuCourse, {
        licenses: [{ category: 'A1', expirationdate: '   ' }],
      }),
    ).not.toThrow()
  })

  it('Test 5: malformed expiration is INVALID', () => {
    const err = catchLicenseError(() =>
      validateLicense(vkuCourse, {
        licenses: [{ category: 'A1', expirationdate: 'not-a-date' }],
      }),
    )
    expect(err.statusCode).toBe(403)
    expect(err.data?.licenseValidationState).toBe('INVALID_EXPIRATION')
    expect(err.statusMessage).toBe(INVALID_LICENSE_EXPIRATION_MESSAGE)
    expect(err.statusMessage).not.toContain('01.01.1970')
  })

  it('Test 6: multiple A1 dates use the latest (not the earlier expiry)', () => {
    const mid2027Course = {
      category: 'VKU',
      course_sessions: [{ start_time: '2027-06-01T08:00:00', end_time: '2027-06-01T16:00:00' }],
    }
    expect(() =>
      validateLicense(mid2027Course, {
        licenses: [
          { category: 'A1', expirationdate: '2026-12-31' },
          { category: 'A1', expirationdate: '2027-12-31' },
        ],
      }),
    ).not.toThrow()

    const ifEarlierWon = catchLicenseError(() =>
      validateLicense(mid2027Course, {
        licenses: [{ category: 'A1', expirationdate: '2026-12-31' }],
      }),
    )
    expect(ifEarlierWon.data?.licenseValidationState).toBe('EXPIRED')
  })

  it('Test 7: valid A1 plus null A1 uses the dated license', () => {
    expect(() =>
      validateLicense(vkuCourse, {
        licenses: [
          { category: 'A1', expirationdate: '2027-12-31' },
          { category: 'A1', expirationdate: null },
        ],
      }),
    ).not.toThrow()
  })

  it('Regression A: valid future date plus null stays VALID (null does not displace the dated license)', () => {
    expect(() =>
      validateLicense(vkuCourse, {
        licenses: [
          { category: 'A1', expirationdate: '2027-12-31' },
          { category: 'A1', expirationdate: null },
        ],
      }),
    ).not.toThrow()
  })

  it('future plus empty uses the dated license and allows', () => {
    expect(() =>
      validateLicense(vkuCourse, {
        licenses: [
          { category: 'A1', expirationdate: '2027-12-31' },
          { category: 'A1', expirationdate: '' },
        ],
      }),
    ).not.toThrow()
  })

  it('Regression B: null plus null is ABSENT-only and allows enrollment', () => {
    expect(() =>
      validateLicense(vkuCourse, {
        licenses: [
          { category: 'A1', expirationdate: null },
          { category: 'A1', expirationdate: null },
        ],
      }),
    ).not.toThrow()
  })

  it('invalid plus future uses the dated license and allows', () => {
    expect(() =>
      validateLicense(vkuCourse, {
        licenses: [
          { category: 'A1', expirationdate: 'not-a-date' },
          { category: 'A1', expirationdate: '2027-12-31' },
        ],
      }),
    ).not.toThrow()
  })

  it('expired plus null is DENY (ABSENT does not override a dated expiry)', () => {
    const err = catchLicenseError(() =>
      validateLicense(vkuCourse, {
        licenses: [
          { category: 'A1', expirationdate: '2026-09-15' },
          { category: 'A1', expirationdate: null },
        ],
      }),
    )
    expect(err.statusCode).toBe(403)
    expect(err.data?.licenseValidationState).toBe('EXPIRED')
    expect(err.statusMessage).toMatch(/läuft am 15\.09\.2026 ab/)
    expect(err.statusMessage).not.toContain('01.01.1970')
  })

  it('expired plus empty is DENY (empty is ABSENT, not unlimited)', () => {
    const err = catchLicenseError(() =>
      validateLicense(vkuCourse, {
        licenses: [
          { category: 'A1', expirationdate: '2026-09-15' },
          { category: 'A1', expirationdate: '' },
        ],
      }),
    )
    expect(err.statusCode).toBe(403)
    expect(err.data?.licenseValidationState).toBe('EXPIRED')
    expect(err.statusMessage).not.toContain('01.01.1970')
  })

  it('invalid plus expired is DENY (dated expiry still governs)', () => {
    const err = catchLicenseError(() =>
      validateLicense(vkuCourse, {
        licenses: [
          { category: 'A1', expirationdate: 'not-a-date' },
          { category: 'A1', expirationdate: '2026-09-15' },
        ],
      }),
    )
    expect(err.statusCode).toBe(403)
    expect(err.data?.licenseValidationState).toBe('EXPIRED')
    expect(err.statusMessage).not.toContain('01.01.1970')
  })

  it('Regression C: invalid plus null is INVALID_EXPIRATION (403, never VALID/EXPIRED/1970)', () => {
    const err = catchLicenseError(() =>
      validateLicense(vkuCourse, {
        licenses: [
          { category: 'A1', expirationdate: 'not-a-date' },
          { category: 'A1', expirationdate: null },
        ],
      }),
    )
    expect(err.statusCode).toBe(403)
    expect(err.data?.licenseValidationState).toBe('INVALID_EXPIRATION')
    expect(err.data?.licenseValidationState).not.toBe('EXPIRED')
    expect(err.statusMessage).toBe(INVALID_LICENSE_EXPIRATION_MESSAGE)
    expect(err.statusMessage).not.toContain('01.01.1970')
    expect(err.statusMessage?.toLowerCase()).not.toContain('abgelaufen')
  })

  it('accepts VKU licenses A35KW, A, and B', () => {
    for (const category of ['A35KW', 'A', 'B']) {
      expect(() =>
        validateLicense(vkuCourse, {
          licenses: [{ category, expirationdate: '2027-12-31' }],
        }),
      ).not.toThrow()
    }
  })

  it('rejects a category that does not match the course', () => {
    const err = catchLicenseError(() =>
      validateLicense(
        { category: 'C', course_sessions: vkuCourse.course_sessions },
        { licenses: [{ category: 'A1', expirationdate: '2027-12-31' }] },
      ),
    )
    expect(err.data?.licenseValidationState).toBe('NO_MATCHING_LICENSE')
    expect(err.statusMessage).toMatch(/Kategorie C/)
  })

  it('uses the latest session end time among multiple sessions', () => {
    const err = catchLicenseError(() =>
      validateLicense(
        {
          category: 'VKU',
          course_sessions: [
            { start_time: '2026-10-01T08:00:00', end_time: '2026-10-01T16:00:00' },
            { start_time: '2026-10-17T08:00:00', end_time: '2026-10-17T16:00:00' },
            { start_time: '2026-10-10T08:00:00', end_time: '2026-10-10T16:00:00' },
          ],
        },
        { licenses: [{ category: 'A1', expirationdate: '2026-10-16' }] },
      ),
    )
    expect(err.data?.licenseValidationState).toBe('EXPIRED')
    expect(err.statusMessage).toMatch(/17\.10\.2026/)
  })

  it('treats 0 and false as INVALID, not epoch/expired', () => {
    const zero = catchLicenseError(() =>
      validateLicense(vkuCourse, {
        licenses: [{ category: 'A1', expirationdate: 0 as unknown as string }],
      }),
    )
    expect(zero.data?.licenseValidationState).toBe('INVALID_EXPIRATION')
    expect(zero.statusMessage).not.toContain('01.01.1970')

    const falsy = catchLicenseError(() =>
      validateLicense(vkuCourse, {
        licenses: [{ category: 'A1', expirationdate: false as unknown as string }],
      }),
    )
    expect(falsy.data?.licenseValidationState).toBe('INVALID_EXPIRATION')
    expect(falsy.statusMessage).not.toContain('01.01.1970')
  })

  it('skips validation when the course has no category', () => {
    expect(() =>
      validateLicense(
        { category: '', course_sessions: vkuCourse.course_sessions },
        { licenses: [{ category: 'A1', expirationdate: null }] },
      ),
    ).not.toThrow()
  })
})
