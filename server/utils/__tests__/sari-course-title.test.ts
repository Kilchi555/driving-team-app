import { describe, expect, it } from 'vitest'
import { formatSariLocalDateForTitle, sariCourseDisplayName } from '../sari-course-title'

describe('formatSariLocalDateForTitle', () => {
  it('formats a SARI local datetime as de-CH', () => {
    expect(formatSariLocalDateForTitle('2026-09-12 13:00')).toBe('12.09.2026')
  })

  it('returns null for empty input', () => {
    expect(formatSariLocalDateForTitle('')).toBeNull()
    expect(formatSariLocalDateForTitle(null)).toBeNull()
  })
})

describe('sariCourseDisplayName', () => {
  it('uses the earliest session date, not the stale group date', () => {
    expect(sariCourseDisplayName(
      'Motorrad Zürich-Altstetten',
      [
        { date: '2026-09-12 13:00' },
        { date: '2026-09-13 13:00' },
        { date: '2026-09-15 17:00' },
      ],
      '2026-09-07 12:00',
    )).toBe('Motorrad Zürich-Altstetten - 12.09.2026')
  })

  it('falls back to group.date when sessions have no dates', () => {
    expect(sariCourseDisplayName('Verkehrskunde Lachen', [], '2026-10-20 08:00'))
      .toBe('Verkehrskunde Lachen - 20.10.2026')
  })
})
