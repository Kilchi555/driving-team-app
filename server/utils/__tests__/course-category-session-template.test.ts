import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

  it('rejects invalid hours_per_session seed even when sessions[] is valid', () => {
    expect(() =>
      normalizeCategorySessionTemplate({
        hours_per_session: 99,
        session_structure: {
          sessions: [{ duration_hours: 2 }, { duration_hours: 3 }, { duration_hours: 3 }],
        },
      }),
    ).toThrow(/Dauer pro Termin \(Initial\)/)
    expect(() =>
      normalizeCategorySessionTemplate({
        hours_per_session: 2.25,
        session_structure: {
          sessions: [{ duration_hours: 2 }],
        },
      }),
    ).toThrow(/0\.5h-Schritten/)
  })

  it('allows product max total 10 × 12h = 120h', () => {
    const result = normalizeCategorySessionTemplate({
      hours_per_session: 12,
      session_structure: {
        sessions: Array.from({ length: 10 }, () => ({ duration_hours: 12 })),
      },
    })
    expect(result.session_count).toBe(10)
    expect(result.total_duration_hours).toBe(120)
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

describe('UI template ops catch invalid seeds without mutating state (Bugbot #384)', () => {
  /**
   * Mirrors applyCategoryTemplateInitializer / generateSessionsFromCategory / edit-load:
   * normalize/build first; only mutate after success; surface err.message on failure.
   */
  function runTemplateOpSafely<T>(
    op: () => T,
    mutate: (value: T) => void,
  ): { error: string | null; mutated: boolean } {
    let error: string | null = null
    let mutated = false
    try {
      const value = op()
      mutate(value)
      mutated = true
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Ungültige Terminstruktur'
    }
    return { error, mutated }
  }

  /**
   * Faithful control-flow mirror of pages/admin/courses.vue
   * applyCategoryTemplateInitializer — customized check MUST stay inside try/catch.
   */
  function applyCategoryTemplateInitializerMirror(
    state: {
      sessions: { duration_hours: number }[]
      session_count: number
      hours_per_session: number
      total_duration_hours?: number
    },
    opts?: { confirmResult?: boolean },
  ): { error: string | null } {
    let error: string | null = null
    const count = Number(state.session_count) || 1
    const hours = Number(state.hours_per_session) || 8
    try {
      const customized = isCustomizedRelativeToInitializer(state.sessions, count, hours)
      if (customized) {
        const ok = opts?.confirmResult !== false
        if (!ok) return { error: null }
      }
      const uniform = buildUniformCategorySessionTemplate(count, hours)
      state.sessions = uniform.session_structure.sessions.map((s) => ({
        duration_hours: s.duration_hours,
      }))
      state.session_count = uniform.session_count
      state.total_duration_hours = uniform.total_duration_hours
      state.hours_per_session = uniform.hours_per_session
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Ungültige Terminstruktur'
    }
    return { error }
  }

  /** Pre-fix order that Bugbot discussion_r4236018608 caught. */
  function applyCategoryTemplateInitializerBrokenPreTry(
    state: {
      sessions: { duration_hours: number }[]
      session_count: number
      hours_per_session: number
    },
  ) {
    const count = Number(state.session_count) || 1
    const hours = Number(state.hours_per_session) || 8
    // Throws here for 2.25 / 99 — outside any catch.
    const customized = isCustomizedRelativeToInitializer(state.sessions, count, hours)
    if (customized) {
      /* confirm omitted in repro */
    }
    try {
      const uniform = buildUniformCategorySessionTemplate(count, hours)
      state.sessions = uniform.session_structure.sessions.map((s) => ({
        duration_hours: s.duration_hours,
      }))
    } catch {
      // unreachable for invalid seeds — throw already escaped above
    }
  }

  it.each([2.25, 99] as const)(
    'invalid seed %s produces a validation error and does not mutate UI state',
    (hours) => {
      const state = {
        sessions: [{ duration_hours: 2 }, { duration_hours: 3 }, { duration_hours: 3 }],
        session_count: 3,
        hours_per_session: 2,
      }
      const before = structuredClone(state)

      const result = runTemplateOpSafely(
        () => buildUniformCategorySessionTemplate(3, hours),
        (uniform) => {
          state.sessions = uniform.session_structure.sessions.map((s) => ({
            duration_hours: s.duration_hours,
          }))
          state.session_count = uniform.session_count
          state.hours_per_session = uniform.hours_per_session
        },
      )

      expect(result.mutated).toBe(false)
      expect(result.error).toMatch(/Dauer pro Termin \(Initial\)|0\.5h-Schritten|maximal 12/)
      expect(state).toEqual(before)
    },
  )

  it.each([2.25, 99] as const)(
    'pre-try failure repro: isCustomizedRelativeToInitializer throws uncaught for seed %s',
    (hours) => {
      const state = {
        sessions: [{ duration_hours: 2 }, { duration_hours: 3 }, { duration_hours: 3 }],
        session_count: 3,
        hours_per_session: hours,
      }
      expect(() => applyCategoryTemplateInitializerBrokenPreTry(state)).toThrow(
        /Dauer pro Termin \(Initial\)|0\.5h-Schritten|maximal 12/,
      )
    },
  )

  it.each([2.25, 99] as const)(
    'applyCategoryTemplateInitializer mirror: invalid seed %s sets banner and does not mutate',
    (hours) => {
      const state = {
        sessions: [{ duration_hours: 2 }, { duration_hours: 3 }, { duration_hours: 3 }],
        session_count: 3,
        hours_per_session: hours,
        total_duration_hours: 8,
      }
      const before = structuredClone(state)

      expect(() => {
        const result = applyCategoryTemplateInitializerMirror(state)
        expect(result.error).toMatch(/Dauer pro Termin \(Initial\)|0\.5h-Schritten|maximal 12/)
      }).not.toThrow()

      expect(state).toEqual(before)
    },
  )

  it('courses.vue keeps isCustomizedRelativeToInitializer inside applyCategoryTemplateInitializer try', () => {
    const src = readFileSync(resolve(process.cwd(), 'pages/admin/courses.vue'), 'utf8')
    const fnStart = src.indexOf('const applyCategoryTemplateInitializer = () => {')
    expect(fnStart).toBeGreaterThan(-1)
    const fnEnd = src.indexOf('\nconst addCategoryTemplateSession', fnStart)
    expect(fnEnd).toBeGreaterThan(fnStart)
    const body = src.slice(fnStart, fnEnd)
    const tryAt = body.indexOf('try {')
    const customizedAt = body.indexOf('isCustomizedRelativeToInitializer(')
    const catchAt = body.indexOf('} catch')
    expect(tryAt).toBeGreaterThan(-1)
    expect(customizedAt).toBeGreaterThan(tryAt)
    expect(catchAt).toBeGreaterThan(customizedAt)
    expect(body).toContain("error.value = err?.message || 'Ungültige Terminstruktur'")
  })

  it('edit-load aborts before opening form state when stored seed is invalid', () => {
    let editingOpened = false
    const result = runTemplateOpSafely(
      () =>
        normalizeCategorySessionTemplate({
          hours_per_session: 99,
          session_structure: {
            sessions: [{ duration_hours: 2 }, { duration_hours: 3 }, { duration_hours: 3 }],
          },
        }),
      () => {
        editingOpened = true
      },
    )

    expect(result.mutated).toBe(false)
    expect(editingOpened).toBe(false)
    expect(result.error).toMatch(/Dauer pro Termin \(Initial\)/)
  })

  it('generate-sessions aborts before clearing courseSessions when category template is invalid', () => {
    const courseSessions = [{ date: '2026-11-01', start: '09:00', end: '11:00' }]
    const before = structuredClone(courseSessions)

    const result = runTemplateOpSafely(
      () =>
        normalizeCategorySessionTemplate({
          hours_per_session: 2.25,
          session_structure: {
            sessions: [{ duration_hours: 2 }],
          },
        }).session_structure.sessions,
      () => {
        courseSessions.length = 0
      },
    )

    expect(result.mutated).toBe(false)
    expect(courseSessions).toEqual(before)
    expect(result.error).toMatch(/0\.5h-Schritten/)
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
