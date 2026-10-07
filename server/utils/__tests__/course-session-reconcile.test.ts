import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assertPayloadIdsBelongToCourse,
  assertRemovalsAllowed,
  buildSessionPatch,
  classifySessionPayload,
  customSessionsReferencesSessionId,
  evaluateRemovalBlockers,
  findRemovalCandidates,
  reconcileCourseSessions,
  syncRoomBookingsForSessions,
  validateCourseSessionReconcilePlan,
  type DbCourseSession,
  type SessionPayload,
} from '../course-session-reconcile'

function asSupabase(client: { from: (table: string) => unknown }): SupabaseClient {
  return client as unknown as SupabaseClient
}

const TENANT = '11111111-1111-4111-8111-111111111111'
const OTHER_TENANT = '22222222-2222-4222-8222-222222222222'
const COURSE = '33333333-3333-4333-8333-333333333333'
const OTHER_COURSE = '44444444-4444-4444-8444-444444444444'
const S1 = '55555555-5555-4555-8555-555555555555'
const S2 = '66666666-6666-4666-8666-666666666666'
const S3 = '77777777-7777-4777-8777-777777777777'
const FOREIGN = '88888888-8888-4888-8888-888888888888'

function dbSession(partial: Partial<DbCourseSession> & { id: string }): DbCourseSession {
  return {
    course_id: COURSE,
    tenant_id: TENANT,
    session_number: 1,
    start_time: '2026-10-01T07:00:00.000Z',
    end_time: '2026-10-01T09:00:00.000Z',
    room_id: null,
    confirmation_status: null,
    ...partial,
  }
}

function payload(partial: Partial<SessionPayload> & { date: string; start_time: string; end_time: string }): SessionPayload {
  return {
    description: 'Session',
    instructor_type: null,
    allow_individual_booking: false,
    individual_price: 0,
    ...partial,
  }
}

type Row = Record<string, unknown>

type Filter =
  | { type: 'eq' | 'neq' | 'is' | 'lt' | 'gt'; args: [string, unknown] }
  | { type: 'in'; args: [string, unknown[]] }
  | { type: 'not'; args: [string, string, unknown] }

type QueryResult = {
  data: Row | Row[] | null
  error: null
  count?: number
}

function createMemoryDb(seed: {
  course_sessions?: Row[]
  course_registrations?: Row[]
  registration_sari_memberships?: Row[]
  room_bookings?: Row[]
  vehicle_bookings?: Row[]
  rooms?: Row[]
}) {
  const tables: Record<string, Row[]> = {
    course_sessions: [...(seed.course_sessions || [])],
    course_registrations: [...(seed.course_registrations || [])],
    registration_sari_memberships: [...(seed.registration_sari_memberships || [])],
    room_bookings: [...(seed.room_bookings || [])],
    vehicle_bookings: [...(seed.vehicle_bookings || [])],
    rooms: [...(seed.rooms || [{ id: 'room-1', hourly_rate_rappen: 10000 }])],
  }

  const deletedSessionIds: string[] = []
  const ops: string[] = []

  function matches(row: Row, filters: Filter[]) {
    for (const f of filters) {
      if (f.type === 'eq') {
        const [col, val] = f.args
        if (row[col] !== val) return false
      } else if (f.type === 'in') {
        const [col, vals] = f.args
        if (!vals.includes(row[col])) return false
      } else if (f.type === 'neq') {
        const [col, val] = f.args
        if (row[col] === val) return false
      } else if (f.type === 'is') {
        const [col, val] = f.args
        if (val === null) {
          if (row[col] != null) return false
        }
      } else if (f.type === 'not') {
        const [col, op, val] = f.args
        if (op === 'is' && val === null) {
          if (row[col] == null) return false
        }
      } else if (f.type === 'lt') {
        const [col, val] = f.args
        if (!(String(row[col]) < String(val))) return false
      } else if (f.type === 'gt') {
        const [col, val] = f.args
        if (!(String(row[col]) > String(val))) return false
      }
    }
    return true
  }

  function from(table: string) {
    const filters: Filter[] = []
    let updatePayload: Row | null = null
    let insertPayload: Row[] | null = null
    let isDelete = false
    let isHead = false
    let wantCount = false
    let maybeSingle = false
    let orderCol: string | null = null

    const api = {
      select(_cols?: string, opts?: { count?: string; head?: boolean }) {
        if (opts?.head) isHead = true
        if (opts?.count) wantCount = true
        return api
      },
      eq(col: string, val: unknown) {
        filters.push({ type: 'eq', args: [col, val] })
        return api
      },
      in(col: string, vals: unknown[]) {
        filters.push({ type: 'in', args: [col, vals] })
        return api
      },
      neq(col: string, val: unknown) {
        filters.push({ type: 'neq', args: [col, val] })
        return api
      },
      is(col: string, val: unknown) {
        filters.push({ type: 'is', args: [col, val] })
        return api
      },
      not(col: string, op: string, val: unknown) {
        filters.push({ type: 'not', args: [col, op, val] })
        return api
      },
      lt(col: string, val: unknown) {
        filters.push({ type: 'lt', args: [col, val] })
        return api
      },
      gt(col: string, val: unknown) {
        filters.push({ type: 'gt', args: [col, val] })
        return api
      },
      order(col: string) {
        orderCol = col
        return api
      },
      update(payload: Row) {
        updatePayload = payload
        return api
      },
      insert(payload: Row | Row[]) {
        insertPayload = Array.isArray(payload) ? payload : [payload]
        return api
      },
      delete() {
        isDelete = true
        return api
      },
      maybeSingle() {
        maybeSingle = true
        return api
      },
      single() {
        maybeSingle = true
        return api
      },
      then(resolve: (v: QueryResult) => void, reject?: (e: unknown) => void) {
        return Promise.resolve()
          .then((): QueryResult => {
            const rows = tables[table] || []

            if (insertPayload) {
              ops.push(`insert:${table}`)
              const created = insertPayload.map((row) => {
                const id = (row.id as string) || `new-${Math.random().toString(16).slice(2, 10)}`
                const full = { ...row, id }
                rows.push(full)
                return full
              })
              return { data: created, error: null, count: created.length }
            }

            let matched = rows.filter((r) => matches(r, filters))

            if (updatePayload) {
              ops.push(`update:${table}`)
              for (const row of matched) {
                Object.assign(row, updatePayload)
              }
              const data = maybeSingle ? (matched[0] || null) : matched
              return { data, error: null, count: matched.length }
            }

            if (isDelete) {
              ops.push(`delete:${table}`)
              const ids = matched.map((r) => String(r.id))
              if (table === 'course_sessions') deletedSessionIds.push(...ids)
              tables[table] = rows.filter((r) => !matched.includes(r))
              return { data: matched, error: null, count: matched.length }
            }

            if (orderCol) {
              const col = orderCol
              matched = [...matched].sort((a, b) =>
                String(a[col]).localeCompare(String(b[col])),
              )
            }

            if (isHead && wantCount) {
              return { data: null, error: null, count: matched.length }
            }

            if (maybeSingle) {
              return { data: matched[0] || null, error: null }
            }

            return { data: matched, error: null, count: matched.length }
          })
          .then(resolve, reject)
      },
    }
    return api
  }

  return {
    client: { from },
    tables,
    ops,
    deletedSessionIds,
  }
}

describe('course-session-reconcile pure helpers', () => {
  it('classifies updates vs inserts and rejects duplicate IDs', () => {
    const { updates, inserts } = classifySessionPayload([
      payload({ id: S1, date: '2026-10-01', start_time: '09:00', end_time: '11:00' }),
      payload({ date: '2026-10-02', start_time: '09:00', end_time: '11:00' }),
    ])
    expect(updates).toHaveLength(1)
    expect(updates[0].id).toBe(S1)
    expect(inserts).toHaveLength(1)

    expect(() =>
      classifySessionPayload([
        payload({ id: S1, date: '2026-10-01', start_time: '09:00', end_time: '11:00' }),
        payload({ id: S1, date: '2026-10-02', start_time: '09:00', end_time: '11:00' }),
      ]),
    ).toThrow()
  })

  it('detects custom_sessions.sessionId references', () => {
    expect(
      customSessionsReferencesSessionId(
        { '2': { sessionId: S2, courseId: OTHER_COURSE } },
        S2,
      ),
    ).toBe(true)
    expect(customSessionsReferencesSessionId({ '2': { sessionId: S1 } }, S2)).toBe(false)
  })

  it('blocks removal when registrations / custom_sessions / membership / confirmation exist', () => {
    expect(
      evaluateRemovalBlockers({
        confirmationStatus: null,
        referencedByCustomSessions: false,
        hasSariMembership: false,
        courseHasActiveRegistrations: false,
      }).reasons,
    ).toEqual([])

    expect(
      evaluateRemovalBlockers({
        confirmationStatus: 'confirmed',
        referencedByCustomSessions: true,
        hasSariMembership: true,
        courseHasActiveRegistrations: true,
      }).reasons,
    ).toEqual(
      expect.arrayContaining([
        'custom_sessions',
        'registration_sari_memberships',
        'confirmation_status',
        'course_registrations',
      ]),
    )
  })

  it('rejects foreign course session IDs', () => {
    const existing = new Map([
      [S1, dbSession({ id: S1 })],
      [FOREIGN, dbSession({ id: FOREIGN, course_id: OTHER_COURSE })],
    ])
    expect(() =>
      assertPayloadIdsBelongToCourse([{ id: FOREIGN }], existing, COURSE, TENANT),
    ).toThrow()
  })

  it('rejects cross-tenant session IDs', () => {
    const existing = new Map([[S1, dbSession({ id: S1, tenant_id: OTHER_TENANT })]])
    expect(() =>
      assertPayloadIdsBelongToCourse([{ id: S1 }], existing, COURSE, TENANT),
    ).toThrow()
  })

  it('finds removal candidates as DB rows missing from payload', () => {
    const existing = [dbSession({ id: S1 }), dbSession({ id: S2, session_number: 2 })]
    expect(findRemovalCandidates(existing, new Set([S1])).map((r) => r.id)).toEqual([S2])
  })

  it('assertRemovalsAllowed throws when blockers present', () => {
    const blockers = new Map([
      [
        S2,
        evaluateRemovalBlockers({
          confirmationStatus: null,
          referencedByCustomSessions: true,
          hasSariMembership: false,
          courseHasActiveRegistrations: false,
        }),
      ],
    ])
    expect(() =>
      assertRemovalsAllowed([dbSession({ id: S2, session_number: 2 })], blockers),
    ).toThrow()
  })

  it('buildSessionPatch maps times and instructor fields', () => {
    const patch = buildSessionPatch(
      payload({
        date: '2026-01-15',
        start_time: '09:00',
        end_time: '11:00',
        instructor_type: 'internal',
        staff_id: 'staff-1',
        allow_individual_booking: true,
        individual_price: 50,
        room_id: null,
      }),
      'room-fallback',
    )
    expect(patch.staff_id).toBe('staff-1')
    expect(patch.room_id).toBe('room-fallback')
    expect(patch.individual_price_rappen).toBe(5000)
    expect(patch.start_time).toMatch(/2026-01-15/)
  })
})

describe('reconcileCourseSessions identity stability', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('TEST 1+2+11: updates existing session in place and repeated save keeps IDs', async () => {
    const db = createMemoryDb({
      course_sessions: [
        dbSession({ id: S1, session_number: 1 }),
        dbSession({
          id: S2,
          session_number: 2,
          start_time: '2026-10-08T07:00:00.000Z',
          end_time: '2026-10-08T09:00:00.000Z',
        }),
      ],
    })

    const body = [
      payload({ id: S1, date: '2026-10-01', start_time: '10:00', end_time: '12:00' }),
      payload({ id: S2, date: '2026-10-08', start_time: '09:00', end_time: '11:00' }),
    ]

    const first = await reconcileCourseSessions({
      supabase: asSupabase(db.client),
      tenantId: TENANT,
      courseId: COURSE,
      sessions: body,
      courseRoomId: null,
    })
    expect(first.map((s) => s.id).sort()).toEqual([S1, S2].sort())
    expect(db.deletedSessionIds).toEqual([])
    expect(db.ops.filter((o) => o === 'delete:course_sessions')).toEqual([])

    const second = await reconcileCourseSessions({
      supabase: asSupabase(db.client),
      tenantId: TENANT,
      courseId: COURSE,
      sessions: body,
      courseRoomId: null,
    })
    expect(second.map((s) => s.id).sort()).toEqual([S1, S2].sort())
    expect(db.tables.course_sessions).toHaveLength(2)
  })

  it('TEST 3: adds a new session without churning existing IDs', async () => {
    const db = createMemoryDb({
      course_sessions: [
        dbSession({ id: S1, session_number: 1 }),
        dbSession({ id: S2, session_number: 2 }),
      ],
    })

    const result = await reconcileCourseSessions({
      supabase: asSupabase(db.client),
      tenantId: TENANT,
      courseId: COURSE,
      sessions: [
        payload({ id: S1, date: '2026-10-01', start_time: '09:00', end_time: '11:00' }),
        payload({ id: S2, date: '2026-10-08', start_time: '09:00', end_time: '11:00' }),
        payload({ date: '2026-10-15', start_time: '09:00', end_time: '11:00' }),
      ],
      courseRoomId: null,
    })

    expect(result).toHaveLength(3)
    expect(result.map((s) => s.id)).toEqual(expect.arrayContaining([S1, S2]))
    const created = result.find((s) => s.id !== S1 && s.id !== S2)!
    expect(created.id).toBeTruthy()
    expect(created.id).not.toBe(S1)
    expect(created.id).not.toBe(S2)
    expect(db.deletedSessionIds).toEqual([])
  })

  it('TEST 4: removes an unused session when no dependencies', async () => {
    const db = createMemoryDb({
      course_sessions: [
        dbSession({ id: S1, session_number: 1 }),
        dbSession({ id: S2, session_number: 2 }),
      ],
    })

    const result = await reconcileCourseSessions({
      supabase: asSupabase(db.client),
      tenantId: TENANT,
      courseId: COURSE,
      sessions: [payload({ id: S1, date: '2026-10-01', start_time: '09:00', end_time: '11:00' })],
      courseRoomId: null,
    })

    expect(result.map((s) => s.id)).toEqual([S1])
    expect(db.deletedSessionIds).toEqual([S2])
  })

  it('TEST 5: blocks removal when custom_sessions references the session', async () => {
    const db = createMemoryDb({
      course_sessions: [
        dbSession({ id: S1, session_number: 1 }),
        dbSession({ id: S2, session_number: 2 }),
      ],
      course_registrations: [
        {
          id: 'reg-1',
          tenant_id: TENANT,
          course_id: OTHER_COURSE,
          deleted_at: null,
          status: 'confirmed',
          custom_sessions: { '2': { sessionId: S2, courseId: COURSE } },
        },
      ],
    })

    await expect(
      reconcileCourseSessions({
        supabase: asSupabase(db.client),
        tenantId: TENANT,
        courseId: COURSE,
        sessions: [payload({ id: S1, date: '2026-10-01', start_time: '09:00', end_time: '11:00' })],
        courseRoomId: null,
      }),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect(db.tables.course_sessions.map((s) => s.id).sort()).toEqual([S1, S2].sort())
    expect(db.deletedSessionIds).toEqual([])
  })

  it('TEST 5b: blocks removal when course has active registrations', async () => {
    const db = createMemoryDb({
      course_sessions: [
        dbSession({ id: S1, session_number: 1 }),
        dbSession({ id: S2, session_number: 2 }),
      ],
      course_registrations: [
        {
          id: 'reg-1',
          tenant_id: TENANT,
          course_id: COURSE,
          deleted_at: null,
          status: 'confirmed',
          custom_sessions: null,
        },
      ],
    })

    await expect(
      validateCourseSessionReconcilePlan({
        supabase: asSupabase(db.client),
        tenantId: TENANT,
        courseId: COURSE,
        sessions: [payload({ id: S1, date: '2026-10-01', start_time: '09:00', end_time: '11:00' })],
      }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('TEST 6: unknown / foreign course session ID fails without mutation', async () => {
    const db = createMemoryDb({
      course_sessions: [dbSession({ id: S1, session_number: 1 })],
    })

    await expect(
      reconcileCourseSessions({
        supabase: asSupabase(db.client),
        tenantId: TENANT,
        courseId: COURSE,
        sessions: [
          payload({ id: S1, date: '2026-10-01', start_time: '09:00', end_time: '11:00' }),
          payload({ id: FOREIGN, date: '2026-10-08', start_time: '09:00', end_time: '11:00' }),
        ],
        courseRoomId: null,
      }),
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(db.ops.filter((o) => o.startsWith('update:') || o.startsWith('delete:') || o.startsWith('insert:'))).toEqual([])
  })

  it('TEST 7: cross-tenant session ID fails closed', async () => {
    const db = createMemoryDb({
      course_sessions: [dbSession({ id: S1, tenant_id: OTHER_TENANT })],
    })

    // Session row exists but wrong tenant filter → not loaded → treated as foreign
    await expect(
      reconcileCourseSessions({
        supabase: asSupabase(db.client),
        tenantId: TENANT,
        courseId: COURSE,
        sessions: [payload({ id: S1, date: '2026-10-01', start_time: '09:00', end_time: '11:00' })],
        courseRoomId: null,
      }),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('TEST 8: room booking stays linked to the same course_session_id after time change', async () => {
    const db = createMemoryDb({
      course_sessions: [
        dbSession({
          id: S1,
          session_number: 1,
          room_id: 'room-1',
          start_time: '2026-10-01T07:00:00.000Z',
          end_time: '2026-10-01T09:00:00.000Z',
        }),
      ],
      room_bookings: [
        {
          id: 'rb-1',
          tenant_id: TENANT,
          course_id: COURSE,
          course_session_id: S1,
          room_id: 'room-1',
          start_time: '2026-10-01T07:00:00.000Z',
          end_time: '2026-10-01T09:00:00.000Z',
          status: 'confirmed',
          room_cost_rappen: 20000,
        },
      ],
      rooms: [{ id: 'room-1', hourly_rate_rappen: 10000 }],
    })

    const saved = await reconcileCourseSessions({
      supabase: asSupabase(db.client),
      tenantId: TENANT,
      courseId: COURSE,
      sessions: [
        payload({
          id: S1,
          date: '2026-10-01',
          start_time: '10:00',
          end_time: '13:00',
          room_id: 'room-1',
        }),
      ],
      courseRoomId: 'room-1',
    })

    await syncRoomBookingsForSessions({
      supabase: asSupabase(db.client),
      tenantId: TENANT,
      courseId: COURSE,
      bookedBy: 'admin-1',
      requiresRoom: true,
      sessions: saved,
    })

    expect(saved[0].id).toBe(S1)
    const booking = db.tables.room_bookings.find((b) => b.id === 'rb-1')!
    expect(booking.course_session_id).toBe(S1)
    expect(booking.status).toBe('confirmed')
    expect(booking.start_time).toBe(saved[0].start_time)
    expect(booking.end_time).toBe(saved[0].end_time)
    // 3h * 10000 = 30000
    expect(booking.room_cost_rappen).toBe(30000)
    expect(db.tables.room_bookings.filter((b) => b.course_session_id === S1)).toHaveLength(1)
  })

  it('TEST 10: SARI path is not this module — empty sessions never reconcile', () => {
    // Upsert skips reconcile when sessions: []. This documents the contract.
    expect(classifySessionPayload([])).toEqual({ updates: [], inserts: [] })
  })

  it('does not delete-all: only targeted removal of unused ids', async () => {
    const db = createMemoryDb({
      course_sessions: [
        dbSession({ id: S1, session_number: 1 }),
        dbSession({ id: S2, session_number: 2 }),
        dbSession({ id: S3, session_number: 3 }),
      ],
    })

    await reconcileCourseSessions({
      supabase: asSupabase(db.client),
      tenantId: TENANT,
      courseId: COURSE,
      sessions: [
        payload({ id: S1, date: '2026-10-01', start_time: '09:00', end_time: '11:00' }),
        payload({ id: S2, date: '2026-10-08', start_time: '09:00', end_time: '11:00' }),
      ],
      courseRoomId: null,
    })

    expect(db.deletedSessionIds).toEqual([S3])
    expect(db.tables.course_sessions.map((s) => s.id).sort()).toEqual([S1, S2].sort())
  })
})
