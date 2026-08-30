import { describe, expect, it } from 'vitest'
import { zurichLocalToUtcIso } from '../zurich-time'

describe('zurichLocalToUtcIso', () => {
  it('converts CEST (UTC+2) wall-clock to UTC', () => {
    expect(zurichLocalToUtcIso('2026-10-07', '08:00')).toBe('2026-10-07T06:00:00.000Z')
    expect(zurichLocalToUtcIso('2026-10-07', '17:00')).toBe('2026-10-07T15:00:00.000Z')
  })

  it('converts CET (UTC+1) wall-clock to UTC after DST ends', () => {
    expect(zurichLocalToUtcIso('2026-10-28', '08:00')).toBe('2026-10-28T07:00:00.000Z')
    expect(zurichLocalToUtcIso('2026-11-04', '08:00')).toBe('2026-11-04T07:00:00.000Z')
  })

  it('does not treat Zurich local as UTC (the staff-calendar bug)', () => {
    expect(zurichLocalToUtcIso('2026-10-07', '08:00')).not.toBe('2026-10-07T08:00:00.000Z')
    expect(zurichLocalToUtcIso('2026-10-07', '08:00')).toBe('2026-10-07T06:00:00.000Z')
  })
})
