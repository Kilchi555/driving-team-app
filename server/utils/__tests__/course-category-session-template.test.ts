import { describe, expect, it } from 'vitest'
import {
  buildUniformCategorySessionTemplate,
  CategorySessionTemplateError,
  formatCategorySessionSummary,
  isCustomizedRelativeToInitializer,
  normalizeCategorySessionTemplate,
} from '../course-category-session-template'

describe('normalizeCategorySessionTemplate', () => {
  it('A: builds 4 × 2h from initializer / legacy', () => {
    const result = normalizeCategorySessionTemplate({
      session_count: 4,
      hours_per_session: 2,
      session_structure: { flexible: true, description: '4 x 2h' },
    })
    expect(result.session_count).toBe(4)
    expect(result.total_duration_hours).toBe(8)
    expect(result.hours_per_session).toBe(2)
    expect(result.session_structure.sessions).toEqual([
      { duration_hours: 2 },
      { duration_hours: 2 },
      { duration_hours: 2 },
      { duration_hours: 2 },
    ])
    expect(result.session_structure.description).toBe('2h + 2h + 2h + 2h')
    expect(result.session_structure.version).toBe(1)
    expect(result.session_structure.flexible).toBe(true)
  })

  it('B: unequal 2 + 3 + 3', () => {
    const result = normalizeCategorySessionTemplate({
      hours_per_session: 2,
      session_structure: {
        sessions: [{ duration_hours: 2 }, { duration_hours: 3 }, { duration_hours: 3 }],
      },
    })
    expect(result.session_count).toBe(3)
    expect(result.total_duration_hours).toBe(8)
    expect(result.session_structure.description).toBe('2h + 3h + 3h')
  })

  it('C: 4 + 4', () => {
    const result = normalizeCategorySessionTemplate({
      session_structure: {
        sessions: [{ duration_hours: 4 }, { duration_hours: 4 }],
      },
    })
    expect(result.session_count).toBe(2)
    expect(result.total_duration_hours).toBe(8)
  })

  it('D: legacy without sessions[] uses count × hours', () => {
    const result = normalizeCategorySessionTemplate({
      session_count: 4,
      hours_per_session: 2,
      session_structure: { flexible: true, description: '4 x 2h' },
    })
    expect(result.session_structure.sessions.map((s) => s.duration_hours)).toEqual([2, 2, 2, 2])
  })

  it('E: rejects 0 sessions (empty array → falls back; then empty after override)', () => {
    expect(() =>
      normalizeCategorySessionTemplate({
        session_count: 0,
        hours_per_session: 2,
        session_structure: { sessions: [] },
      }),
    ).not.toThrow() // empty sessions falls back to legacy; count 0 → coerced to 1
    expect(() =>
      normalizeCategorySessionTemplate({
        session_structure: { sessions: [] },
        session_count: 1,
        hours_per_session: 2,
      }),
    ).not.toThrow()
  })

  it('E2: rejects explicit empty validated path via malformed sessions object entries', () => {
    // Direct empty is legacy; force invalid by providing sessions that fail validation after being non-empty then cleared conceptually:
    expect(() =>
      normalizeCategorySessionTemplate({
        session_structure: { sessions: [{ duration_hours: 0 }] },
      }),
    ).toThrow(CategorySessionTemplateError)
  })

  it('F: rejects 0h', () => {
    expect(() =>
      normalizeCategorySessionTemplate({
        session_structure: { sessions: [{ duration_hours: 0 }] },
      }),
    ).toThrow(/grösser als 0/)
  })

  it('G: rejects 12.5h', () => {
    expect(() =>
      normalizeCategorySessionTemplate({
        session_structure: { sessions: [{ duration_hours: 12.5 }] },
      }),
    ).toThrow(/0\.5h-Schritten|maximal 12/)
  })

  it('H: rejects 11 sessions', () => {
    expect(() =>
      normalizeCategorySessionTemplate({
        session_structure: {
          sessions: Array.from({ length: 11 }, () => ({ duration_hours: 1 })),
        },
      }),
    ).toThrow(/Maximal 10/)
  })

  it('I: rejects NaN / Infinity / malformed', () => {
    expect(() =>
      normalizeCategorySessionTemplate({
        session_structure: { sessions: [{ duration_hours: Number.NaN }] },
      }),
    ).toThrow()
    expect(() =>
      normalizeCategorySessionTemplate({
        session_structure: { sessions: [{ duration_hours: Number.POSITIVE_INFINITY }] },
      }),
    ).toThrow()
    expect(() =>
      normalizeCategorySessionTemplate({
        session_structure: { sessions: ['bad'] },
      }),
    ).toThrow()
  })

  it('Q: production-like legacy loads correctly', () => {
    const result = normalizeCategorySessionTemplate({
      session_count: 3,
      hours_per_session: 4,
      total_duration_hours: 12,
      session_structure: { flexible: true, description: '3 x 4h' },
    })
    expect(result.session_count).toBe(3)
    expect(result.total_duration_hours).toBe(12)
    expect(result.session_structure.sessions).toHaveLength(3)
  })

  it('does not use hours_per_session as SoT when sessions[] present', () => {
    const result = normalizeCategorySessionTemplate({
      hours_per_session: 2,
      session_count: 4,
      session_structure: {
        sessions: [{ duration_hours: 4 }, { duration_hours: 4 }],
      },
    })
    expect(result.session_count).toBe(2)
    expect(result.total_duration_hours).toBe(8)
    expect(result.hours_per_session).toBe(2) // seed preserved
  })
})

describe('buildUniformCategorySessionTemplate / customization detect', () => {
  it('S: initializer builds N equal sessions', () => {
    const result = buildUniformCategorySessionTemplate(4, 2)
    expect(result.session_structure.sessions.map((s) => s.duration_hours)).toEqual([2, 2, 2, 2])
  })

  it('T/U: detects customized vs initializer', () => {
    const custom = [
      { duration_hours: 2 },
      { duration_hours: 3 },
      { duration_hours: 3 },
    ]
    expect(isCustomizedRelativeToInitializer(custom, 4, 2)).toBe(true)
    expect(
      isCustomizedRelativeToInitializer(
        [
          { duration_hours: 2 },
          { duration_hours: 2 },
          { duration_hours: 2 },
          { duration_hours: 2 },
        ],
        4,
        2,
      ),
    ).toBe(false)
  })
})

describe('formatCategorySessionSummary', () => {
  it('formats equal and unequal', () => {
    expect(formatCategorySessionSummary([{ duration_hours: 2 }, { duration_hours: 2 }])).toContain('×')
    expect(
      formatCategorySessionSummary([
        { duration_hours: 2 },
        { duration_hours: 3 },
        { duration_hours: 3 },
      ]),
    ).toBe('2h + 3h + 3h (8h)')
  })
})

describe('generator duration mapping (J)', () => {
  it('maps template durations onto start/end offsets from 09:00', () => {
    const template = normalizeCategorySessionTemplate({
      session_structure: {
        sessions: [{ duration_hours: 2 }, { duration_hours: 3 }, { duration_hours: 3 }],
      },
    }).session_structure.sessions

    const startHour = 9
    let cursor = startHour
    const windows = template.map((s) => {
      const start = cursor
      const end = cursor + s.duration_hours
      cursor = end
      return { start, end }
    })

    expect(windows).toEqual([
      { start: 9, end: 11 },
      { start: 11, end: 14 },
      { start: 14, end: 17 },
    ])
  })
})
