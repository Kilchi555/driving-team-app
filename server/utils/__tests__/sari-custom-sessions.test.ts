import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applySariSessionSwaps,
  buildSariSessionMap,
  collectPublicSessionIds,
  loadSariSessionMap,
  resolveCustomSessionEntry,
  type CourseSessionSariRow,
  type CustomSessionsMap,
} from '~/server/utils/sari-custom-sessions'

/**
 * A three-day course where the SARI ids inside sari_course_id are deliberately
 * NOT in start_time order. Any positional heuristic gets this wrong.
 */
const SESSIONS: CourseSessionSariRow[] = [
  { id: 'uuid-day1', sari_session_id: '5001', start_time: '2026-01-10T08:00:00Z' },
  { id: 'uuid-day2', sari_session_id: '5002', start_time: '2026-01-11T08:00:00Z' },
  { id: 'uuid-day3', sari_session_id: '5003', start_time: '2026-01-12T08:00:00Z' },
]

// GROUP_5003_5001_5002 → scrambled relative to start_time order
const BASE_SCRAMBLED = ['5003', '5001', '5002']
// GROUP_5001_5002_5003 → aligned with start_time order
const BASE_ALIGNED = ['5001', '5002', '5003']

/** Swap target lives in another course, so it is not part of SESSIONS. */
const SWAP_TARGET: CourseSessionSariRow = {
  id: 'uuid-other-course-day3',
  sari_session_id: '7009',
  start_time: '2026-02-01T08:00:00Z',
}

/** Narrows a hand-rolled query stub to the client type without using `any`. */
const asClient = (stub: { from: (table: string) => unknown }) =>
  stub as unknown as SupabaseClient

function resolverFor(rows: CourseSessionSariRow[]) {
  const map = buildSariSessionMap(rows)
  return (id: string) => map.get(id)
}

const resolveAll = resolverFor([...SESSIONS, SWAP_TARGET])

describe('SARI custom session resolution', () => {
  // ── TEST A ────────────────────────────────────────────────────────────────
  it('TEST A: normal enrollment without swaps leaves the SARI list untouched', () => {
    for (const base of [BASE_ALIGNED, BASE_SCRAMBLED]) {
      for (const custom of [undefined, null, {}] as (CustomSessionsMap | null | undefined)[]) {
        const result = applySariSessionSwaps(base, custom, resolveAll, SESSIONS)
        expect(result.sariSessionIds).toEqual(base)
        expect(result.replacements).toEqual([])
        expect(result.unresolvedSessionIds).toEqual([])
        expect(result.legacyPositionalPositions).toEqual([])
      }
    }
  })

  // ── TEST B ────────────────────────────────────────────────────────────────
  it('TEST B: allow_individual_booking swap resolves the correct SARI session', () => {
    // Individual booking: only day 3 is enrolled, then swapped out.
    const base = ['5003']
    const custom: CustomSessionsMap = {
      '3': { originalSessionIds: ['uuid-day3'], sessionIds: ['uuid-other-course-day3'] },
    }
    const result = applySariSessionSwaps(base, custom, resolveAll, SESSIONS)

    expect(result.sariSessionIds).toEqual(['7009'])
    expect(result.replacements).toEqual([{ from: '5003', to: '7009' }])
    expect(result.unresolvedSessionIds).toEqual([])
    expect(result.legacyPositionalPositions).toEqual([])
  })

  // ── TEST C ────────────────────────────────────────────────────────────────
  it('TEST C: allow_partial_enrollment swap resolves the correct SARI session', () => {
    // Partial enrollment from position 2 → base already filtered to day 2 + 3.
    const base = ['5002', '5003']
    const custom: CustomSessionsMap = {
      '3': { originalSessionIds: ['uuid-day3'], sessionIds: ['uuid-other-course-day3'] },
    }
    const result = applySariSessionSwaps(base, custom, resolveAll, SESSIONS)

    // Day 2 untouched, day 3 replaced — regardless of its index.
    expect(result.sariSessionIds).toEqual(['5002', '7009'])
    expect(result.legacyPositionalPositions).toEqual([])
  })

  // ── TEST D (most important) ───────────────────────────────────────────────
  it('TEST D: SARI id order differs from start_time order and the right session still wins', () => {
    const custom: CustomSessionsMap = {
      '3': { originalSessionIds: ['uuid-day3'], sessionIds: ['uuid-other-course-day3'] },
    }
    const result = applySariSessionSwaps(BASE_SCRAMBLED, custom, resolveAll, SESSIONS)

    // 5003 (day 3) sits at index 0 in the scrambled list. Value-based matching
    // replaces index 0. A positional heuristic would have hit index 2 (5002).
    expect(result.sariSessionIds).toEqual(['7009', '5001', '5002'])
    expect(result.sariSessionIds).not.toContain('5003')
    expect(result.sariSessionIds).toContain('5002')
    expect(result.replacements).toEqual([{ from: '5003', to: '7009' }])
    expect(result.legacyPositionalPositions).toEqual([])
  })

  it('TEST D2: the same swap on an aligned list yields the same session set', () => {
    const custom: CustomSessionsMap = {
      '3': { originalSessionIds: ['uuid-day3'], sessionIds: ['uuid-other-course-day3'] },
    }
    const scrambled = applySariSessionSwaps(BASE_SCRAMBLED, custom, resolveAll, SESSIONS)
    const aligned = applySariSessionSwaps(BASE_ALIGNED, custom, resolveAll, SESSIONS)

    // Order may differ, the enrolled set must not.
    expect([...scrambled.sariSessionIds].sort()).toEqual([...aligned.sariSessionIds].sort())
    expect([...aligned.sariSessionIds].sort()).toEqual(['5001', '5002', '7009'])
  })

  it('TEST D3: grouped day (two sessions on one date) swaps both by value', () => {
    const grouped: CourseSessionSariRow[] = [
      { id: 'g-a', sari_session_id: '6001', start_time: '2026-03-01T08:00:00Z' },
      { id: 'g-b', sari_session_id: '6002', start_time: '2026-03-01T13:00:00Z' },
      { id: 'g-c', sari_session_id: '6003', start_time: '2026-03-02T08:00:00Z' },
      { id: 'g-d', sari_session_id: '6004', start_time: '2026-03-02T13:00:00Z' },
    ]
    const targets: CourseSessionSariRow[] = [
      { id: 'n-a', sari_session_id: '8001', start_time: '2026-04-01T08:00:00Z' },
      { id: 'n-b', sari_session_id: '8002', start_time: '2026-04-01T13:00:00Z' },
    ]
    // Scrambled base: day-2 pair first.
    const base = ['6003', '6004', '6001', '6002']
    const custom: CustomSessionsMap = {
      '2': { originalSessionIds: ['g-c', 'g-d'], sessionIds: ['n-a', 'n-b'] },
    }
    const result = applySariSessionSwaps(base, custom, resolverFor([...grouped, ...targets]), grouped)

    expect(result.sariSessionIds).toEqual(['8001', '8002', '6001', '6002'])
    expect(result.legacyPositionalPositions).toEqual([])
  })

  // ── Security: cross-tenant / unknown references ───────────────────────────
  it('reports unresolved public session ids instead of silently guessing', () => {
    const custom: CustomSessionsMap = {
      '3': { originalSessionIds: ['uuid-day3'], sessionIds: ['uuid-foreign-tenant'] },
    }
    const result = applySariSessionSwaps(BASE_SCRAMBLED, custom, resolveAll, SESSIONS)

    expect(result.unresolvedSessionIds).toEqual(['uuid-foreign-tenant'])
    // Nothing was swapped in, so callers can reject before touching SARI.
    expect(result.sariSessionIds).toEqual(BASE_SCRAMBLED)
    expect(result.legacyPositionalPositions).toEqual([])
  })

  it('never falls back to positional matching for public-shape payloads', () => {
    const custom: CustomSessionsMap = {
      '2': { originalSessionIds: ['uuid-unknown'], sessionIds: ['uuid-other-course-day3'] },
    }
    const result = applySariSessionSwaps(BASE_SCRAMBLED, custom, resolveAll, SESSIONS)

    expect(result.unresolvedSessionIds).toEqual(['uuid-unknown'])
    expect(result.legacyPositionalPositions).toEqual([])
    // The original could not be identified → no blind index write.
    expect(result.sariSessionIds).toEqual(BASE_SCRAMBLED)
  })

  it('loadSariSessionMap scopes the lookup to the tenant', async () => {
    const calls: Record<string, unknown> = {}
    const supabase = {
      from: (table: string) => {
        calls.table = table
        return {
          select: (cols: string) => {
            calls.select = cols
            return {
              in: (col: string, ids: string[]) => {
                calls.inCol = col
                calls.inIds = ids
                return {
                  eq: (col2: string, val: string) => {
                    calls.eqCol = col2
                    calls.eqVal = val
                    return Promise.resolve({
                      data: [{ id: 'uuid-day1', sari_session_id: '5001' }],
                      error: null,
                    })
                  },
                }
              },
            }
          },
        }
      },
    }

    const map = await loadSariSessionMap(asClient(supabase), ['uuid-day1', 'uuid-day1'], 'tenant-a')

    expect(calls.table).toBe('course_sessions')
    expect(calls.select).toBe('id, sari_session_id')
    expect(calls.inIds).toEqual(['uuid-day1'])
    expect(calls.eqCol).toBe('tenant_id')
    expect(calls.eqVal).toBe('tenant-a')
    expect(map.get('uuid-day1')).toBe('5001')
  })

  it('loadSariSessionMap short-circuits without ids or tenant', async () => {
    const supabase = { from: () => { throw new Error('must not query') } }
    expect((await loadSariSessionMap(asClient(supabase), [], 'tenant-a')).size).toBe(0)
    expect((await loadSariSessionMap(asClient(supabase), ['x'], '')).size).toBe(0)
  })

  // ── Backwards compatibility with already-persisted rows ───────────────────
  it('still honours legacy internal-SARI-id payloads by value', () => {
    const custom: CustomSessionsMap = {
      '3': { originalSariIds: ['5003'], sariSessionIds: ['7009'] },
    }
    const result = applySariSessionSwaps(BASE_SCRAMBLED, custom, resolveAll, SESSIONS)

    expect(result.sariSessionIds).toEqual(['7009', '5001', '5002'])
    expect(result.legacyPositionalPositions).toEqual([])
  })

  it('uses the positional fallback only for legacy rows without originals', () => {
    const custom: CustomSessionsMap = { '3': { sariSessionIds: ['7009'] } }
    const result = applySariSessionSwaps(BASE_ALIGNED, custom, resolveAll, SESSIONS)

    expect(result.legacyPositionalPositions).toEqual(['3'])
    expect(result.sariSessionIds).toEqual(['5001', '5002', '7009'])
  })

  it('collectPublicSessionIds gathers both sides and ignores legacy fields', () => {
    const custom: CustomSessionsMap = {
      '2': { originalSessionIds: ['a'], sessionIds: ['b', 'c'] },
      '3': { originalSessionIds: ['d'], sessionId: 'e' },
      '4': { originalSariIds: ['5003'], sariSessionIds: ['7009'] },
    }
    expect(collectPublicSessionIds(custom).sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('resolveCustomSessionEntry flags which shape was used', () => {
    const publicEntry = resolveCustomSessionEntry(
      { originalSessionIds: ['uuid-day3'], sessionIds: ['uuid-other-course-day3'] },
      resolveAll,
    )
    expect(publicEntry.usedLegacyShape).toBe(false)
    expect(publicEntry.originalSariIds).toEqual(['5003'])
    expect(publicEntry.newSariIds).toEqual(['7009'])

    const legacyEntry = resolveCustomSessionEntry(
      { originalSariIds: ['5003'], sariSessionIds: ['7009'] },
      resolveAll,
    )
    expect(legacyEntry.usedLegacyShape).toBe(true)
    expect(legacyEntry.originalSariIds).toEqual(['5003'])
  })

  it('buildSariSessionMap skips sessions without a SARI id', () => {
    const map = buildSariSessionMap([
      { id: 'a', sari_session_id: null },
      { id: 'b', sari_session_id: '  ' },
      { id: 'c', sari_session_id: 4242 },
      { id: null, sari_session_id: '9' },
    ])
    expect(map.has('a')).toBe(false)
    expect(map.has('b')).toBe(false)
    expect(map.get('c')).toBe('4242')
    expect(map.size).toBe(1)
  })
})
