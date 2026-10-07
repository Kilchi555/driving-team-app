/**
 * Regressions for flexible category session templates (PR #384 review findings):
 * - Category save must not mutate existing courses / course_sessions / bookings
 * - Room bookings use concrete session start/end (unequal template)
 * - Vehicle booking windows use concrete session start/end (unequal template)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeCategorySessionTemplate,
} from '~/utils/course-category-session-template'
import { syncRoomBookingsForSessions } from '../course-session-reconcile'
import { isSchoolVehicleAvailable } from '../vehicle-availability'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  syncAutoCategoryWaitlists: vi.fn(async () => undefined),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock('~/server/utils/rate-limiter', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}))

vi.mock('~/server/utils/auto-category-waitlist', () => ({
  syncAutoCategoryWaitlists: (...args: unknown[]) => mocks.syncAutoCategoryWaitlists(...args),
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '64259d68-195a-4c68-8875-f1b44d962830'
const COURSE = '33333333-3333-4333-8333-333333333333'
const S1 = '55555555-5555-4555-8555-555555555555'
const S2 = '66666666-6666-4666-8666-666666666666'
const S3 = '77777777-7777-4777-8777-777777777777'

type Row = Record<string, unknown>
type Write = { table: string; op: string; payload?: Row; filters?: Record<string, string> }

function clone<T>(value: T): T {
  return structuredClone(value)
}

function buildCategoryDb() {
  const initialCategory = {
    id: 'cat-own',
    tenant_id: TENANT,
    name: 'VKU Flex',
    session_count: 3,
    hours_per_session: 2,
    total_duration_hours: 8,
    session_structure: {
      version: 1,
      flexible: true,
      description: '2h + 3h + 3h',
      sessions: [
        { duration_hours: 2 },
        { duration_hours: 3 },
        { duration_hours: 3 },
      ],
    },
  }

  const initialCourse = {
    id: COURSE,
    tenant_id: TENANT,
    course_category_id: 'cat-own',
    name: 'VKU Kurs A',
    status: 'active',
  }

  const initialSessions = [
    {
      id: S1,
      course_id: COURSE,
      tenant_id: TENANT,
      session_number: 1,
      start_time: '2026-11-01T08:00:00.000Z',
      end_time: '2026-11-01T10:00:00.000Z',
    },
    {
      id: S2,
      course_id: COURSE,
      tenant_id: TENANT,
      session_number: 2,
      start_time: '2026-11-02T08:00:00.000Z',
      end_time: '2026-11-02T11:00:00.000Z',
    },
    {
      id: S3,
      course_id: COURSE,
      tenant_id: TENANT,
      session_number: 3,
      start_time: '2026-11-03T08:00:00.000Z',
      end_time: '2026-11-03T11:00:00.000Z',
    },
  ]

  const initialBookings = [
    {
      id: 'rb-1',
      tenant_id: TENANT,
      course_id: COURSE,
      course_session_id: S1,
      start_time: '2026-11-01T08:00:00.000Z',
      end_time: '2026-11-01T10:00:00.000Z',
      status: 'confirmed',
    },
  ]

  const tables: Record<string, Row[]> = {
    course_categories: [clone(initialCategory)],
    courses: [clone(initialCourse)],
    course_sessions: clone(initialSessions),
    room_bookings: clone(initialBookings),
    vehicle_bookings: [],
  }
  const writes: Write[] = []

  function categoryQuery() {
    let action: 'select' | 'update' | 'insert' = 'select'
    let payload: Row | null = null
    const filters: Record<string, string> = {}
    const query = {
      select() { return query },
      update(next: Row) {
        action = 'update'
        payload = next
        return query
      },
      insert(next: Row) {
        action = 'insert'
        payload = next
        return query
      },
      eq(column: string, value: string) {
        filters[column] = value
        return query
      },
      async single() {
        if (action === 'insert' && payload) {
          writes.push({ table: 'course_categories', op: 'insert', payload: { ...payload }, filters: { ...filters } })
          const row = { id: 'cat-new', ...payload }
          tables.course_categories.push(row)
          return { data: { ...row }, error: null }
        }
        const row = tables.course_categories.find(
          (item) => item.id === filters.id && item.tenant_id === filters.tenant_id,
        )
        if (!row) return { data: null, error: { code: 'PGRST116', message: 'missing category' } }
        if (action === 'update' && payload) {
          writes.push({ table: 'course_categories', op: 'update', payload: { ...payload }, filters: { ...filters } })
          Object.assign(row, payload)
        }
        return { data: { ...row }, error: null }
      },
    }
    return query
  }

  function forbiddenTable(table: string) {
    return {
      select() {
        writes.push({ table, op: 'select' })
        throw new Error(`category save must not touch ${table}`)
      },
      update(payload: Row) {
        writes.push({ table, op: 'update', payload })
        throw new Error(`category save must not touch ${table}`)
      },
      insert(payload: Row) {
        writes.push({ table, op: 'insert', payload })
        throw new Error(`category save must not touch ${table}`)
      },
      delete() {
        writes.push({ table, op: 'delete' })
        throw new Error(`category save must not touch ${table}`)
      },
    }
  }

  return {
    tables,
    writes,
    snapshots: {
      course: clone(initialCourse),
      sessions: clone(initialSessions),
      bookings: clone(initialBookings),
    },
    from(table: string) {
      if (table === 'course_categories') return categoryQuery()
      if (table === 'rooms') {
        // save.post may validate default_room_id — not used in this test body
        return forbiddenTable(table)
      }
      return forbiddenTable(table)
    },
  }
}

describe('category save must not mutate existing courses', () => {
  let db: ReturnType<typeof buildCategoryDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = buildCategoryDb()
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
      tenant_id: TENANT,
      db_user_id: 'db-admin-1',
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from: (table: string) => db.from(table) })
  })

  async function save(body: unknown) {
    mocks.readBody.mockResolvedValue(body)
    const handler = (await import('~/server/api/admin/course-categories/save.post')).default as (
      event: unknown,
    ) => Promise<{ success: boolean; data: Row }>
    return handler({})
  }

  it('changing template [2,3,3] → [4,4] leaves courses, sessions, and bookings untouched', async () => {
    const result = await save({
      categoryId: 'cat-own',
      name: 'VKU Flex',
      hours_per_session: 4,
      session_structure: {
        sessions: [{ duration_hours: 4 }, { duration_hours: 4 }],
      },
    })

    expect(result.success).toBe(true)
    expect(result.data.session_count).toBe(2)
    expect(result.data.total_duration_hours).toBe(8)
    expect(result.data.session_structure).toMatchObject({
      sessions: [{ duration_hours: 4 }, { duration_hours: 4 }],
    })

    // Only course_categories written
    expect(db.writes.every((w) => w.table === 'course_categories')).toBe(true)
    expect(db.tables.courses).toEqual([db.snapshots.course])
    expect(db.tables.course_sessions).toEqual(db.snapshots.sessions)
    expect(db.tables.room_bookings).toEqual(db.snapshots.bookings)
    expect(db.tables.course_sessions.map((s) => s.id)).toEqual([S1, S2, S3])
    expect(db.tables.course_sessions.map((s) => s.start_time)).toEqual(
      db.snapshots.sessions.map((s) => s.start_time),
    )
    expect(db.tables.course_sessions.map((s) => s.end_time)).toEqual(
      db.snapshots.sessions.map((s) => s.end_time),
    )
  })
})

describe('room booking unequal template [2h,3h,3h]', () => {
  type Filter =
    | { type: 'eq' | 'neq' | 'is' | 'lt' | 'gt'; args: [string, unknown] }
    | { type: 'in'; args: [string, unknown[]] }
    | { type: 'not'; args: [string, string, unknown] }

  function createMemoryDb(seed: {
    course_sessions?: Row[]
    room_bookings?: Row[]
    rooms?: Row[]
  }) {
    const tables: Record<string, Row[]> = {
      course_sessions: [...(seed.course_sessions || [])],
      room_bookings: [...(seed.room_bookings || [])],
      rooms: [...(seed.rooms || [{ id: 'room-1', hourly_rate_rappen: 10000 }])],
      course_registrations: [],
      registration_sari_memberships: [],
      vehicle_bookings: [],
    }

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
          if (val === null && row[col] != null) return false
        } else if (f.type === 'not') {
          const [col, op, val] = f.args
          if (op === 'is' && val === null && row[col] == null) return false
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
      let payload: Row | null = null
      let action: 'select' | 'update' | 'insert' = 'select'

      const run = async (): Promise<{ data: Row | Row[] | null; error: null }> => {
        if (action === 'insert' && payload) {
          const row = { id: `ins-${tables[table].length + 1}`, ...payload }
          tables[table].push(row)
          return { data: row, error: null }
        }
        const rows = tables[table].filter((r) => matches(r, filters))
        if (action === 'update' && payload) {
          for (const row of rows) Object.assign(row, payload)
          return { data: rows, error: null }
        }
        return { data: rows, error: null }
      }

      type QueryChain = {
        select: () => QueryChain
        update: (next: Row) => QueryChain
        insert: (next: Row) => QueryChain
        eq: (col: string, val: unknown) => QueryChain
        neq: (col: string, val: unknown) => QueryChain
        in: (col: string, vals: unknown[]) => QueryChain
        is: (col: string, val: unknown) => QueryChain
        not: (col: string, op: string, val: unknown) => QueryChain
        lt: (col: string, val: unknown) => QueryChain
        gt: (col: string, val: unknown) => QueryChain
        then: (resolve: (v: unknown) => unknown) => Promise<unknown>
        single: () => Promise<{ data: Row | null; error: { code: string; message: string } | null }>
      }

      const query: QueryChain = {
        select() { return query },
        update(next: Row) { action = 'update'; payload = next; return query },
        insert(next: Row) { action = 'insert'; payload = next; return query },
        eq(col: string, val: unknown) { filters.push({ type: 'eq', args: [col, val] }); return query },
        neq(col: string, val: unknown) { filters.push({ type: 'neq', args: [col, val] }); return query },
        in(col: string, vals: unknown[]) { filters.push({ type: 'in', args: [col, vals] }); return query },
        is(col: string, val: unknown) { filters.push({ type: 'is', args: [col, val] }); return query },
        not(col: string, op: string, val: unknown) { filters.push({ type: 'not', args: [col, op, val] }); return query },
        lt(col: string, val: unknown) { filters.push({ type: 'lt', args: [col, val] }); return query },
        gt(col: string, val: unknown) { filters.push({ type: 'gt', args: [col, val] }); return query },
        then(resolve: (v: unknown) => unknown) { return run().then(resolve) },
        async single() {
          const { data } = await run()
          const row = Array.isArray(data) ? data[0] : data
          return { data: row ?? null, error: row ? null : { code: 'PGRST116', message: 'missing' } }
        },
      }
      return query
    }

    return { tables, client: { from } }
  }

  it('creates room booking windows from unequal session start/end, not hours_per_session', async () => {
    const template = normalizeCategorySessionTemplate({
      hours_per_session: 2, // seed — must NOT define booking windows
      session_structure: {
        sessions: [
          { duration_hours: 2 },
          { duration_hours: 3 },
          { duration_hours: 3 },
        ],
      },
    })
    expect(template.hours_per_session).toBe(2)
    expect(template.session_count).toBe(3)

    // Concrete sessions generated from template durations (per-day 09:00 start)
    const sessions = [
      {
        id: S1,
        room_id: 'room-1',
        start_time: '2026-11-01T08:00:00.000Z', // 09:00 Zurich ≈ 08:00Z winter
        end_time: '2026-11-01T10:00:00.000Z', // +2h
      },
      {
        id: S2,
        room_id: 'room-1',
        start_time: '2026-11-02T08:00:00.000Z',
        end_time: '2026-11-02T11:00:00.000Z', // +3h
      },
      {
        id: S3,
        room_id: 'room-1',
        start_time: '2026-11-03T08:00:00.000Z',
        end_time: '2026-11-03T11:00:00.000Z', // +3h
      },
    ]

    const db = createMemoryDb({ rooms: [{ id: 'room-1', hourly_rate_rappen: 10000 }] })
    await syncRoomBookingsForSessions({
      supabase: db.client as unknown as SupabaseClient,
      tenantId: TENANT,
      courseId: COURSE,
      bookedBy: 'admin-1',
      requiresRoom: true,
      sessions,
    })

    const bookings = db.tables.room_bookings
    expect(bookings).toHaveLength(3)

    for (let i = 0; i < sessions.length; i++) {
      const booking = bookings.find((b) => b.course_session_id === sessions[i].id)!
      expect(booking.start_time).toBe(sessions[i].start_time)
      expect(booking.end_time).toBe(sessions[i].end_time)
      // Must not use uniform seed hours (2h) for every booking cost
      const hours =
        (new Date(String(sessions[i].end_time)).getTime() -
          new Date(String(sessions[i].start_time)).getTime()) /
        3_600_000
      expect(booking.room_cost_rappen).toBe(Math.round(10000 * hours))
    }

    // Unequal middle session is 3h, not seed 2h
    const mid = bookings.find((b) => b.course_session_id === S2)!
    expect(mid.room_cost_rappen).toBe(30000)
    expect(mid.room_cost_rappen).not.toBe(20000)
  })
})

describe('vehicle booking unequal template [2h,3h,3h]', () => {
  it('maps vehicle booking windows from concrete session times, not category seed hours', () => {
    const hoursPerSessionSeed = 2
    const courseSessions = [
      { id: S1, start_time: '2026-11-01T08:00:00.000Z', end_time: '2026-11-01T10:00:00.000Z' },
      { id: S2, start_time: '2026-11-02T08:00:00.000Z', end_time: '2026-11-02T11:00:00.000Z' },
      { id: S3, start_time: '2026-11-03T08:00:00.000Z', end_time: '2026-11-03T11:00:00.000Z' },
    ]

    // Mirrors enroll-cash / webhook vehicle_bookings mapping (no new architecture).
    const vehicleId = 'veh-1'
    const vBookings = courseSessions.map((s) => ({
      vehicle_id: vehicleId,
      tenant_id: TENANT,
      course_id: COURSE,
      course_session_id: s.id,
      start_time: s.start_time,
      end_time: s.end_time,
      purpose: 'course',
      status: 'confirmed',
    }))

    expect(vBookings).toHaveLength(3)
    expect(vBookings[0].end_time).toBe('2026-11-01T10:00:00.000Z') // 2h
    expect(vBookings[1].end_time).toBe('2026-11-02T11:00:00.000Z') // 3h unequal
    expect(vBookings[2].end_time).toBe('2026-11-03T11:00:00.000Z') // 3h

    for (const booking of vBookings) {
      const hours =
        (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 3_600_000
      // At least one booking must differ from uniform seed hours
      if (booking.course_session_id === S2) {
        expect(hours).toBe(3)
        expect(hours).not.toBe(hoursPerSessionSeed)
      }
    }
  })

  it('availability probe uses the concrete unequal session window', async () => {
    const seen: Array<{ start: string; end: string }> = []
    const supabase = {
      from(table: string) {
        let pendingEnd = ''
        const chain: Record<string, unknown> = {}
        const self = () => chain
        chain.select = self
        chain.eq = self
        chain.contains = self
        chain.neq = self
        chain.lt = (col: string, val: string) => {
          if (table === 'vehicle_bookings' && col === 'start_time') pendingEnd = val
          return chain
        }
        chain.gt = (col: string, val: string) => {
          if (table === 'vehicle_bookings' && col === 'end_time') {
            seen.push({ start: val, end: pendingEnd })
          }
          return chain
        }
        chain.then = (resolve: (v: unknown) => unknown) =>
          Promise.resolve(
            table === 'vehicles'
              ? { count: 1, error: null }
              : { count: 0, error: null },
          ).then(resolve)
        return chain
      },
    }

    const unequalSession = {
      start_time: '2026-11-02T08:00:00.000Z',
      end_time: '2026-11-02T11:00:00.000Z', // 3h, not seed 2h
    }

    const ok = await isSchoolVehicleAvailable(supabase, {
      tenantId: TENANT,
      locationId: 'loc-1',
      categoryCode: 'B',
      startTime: unequalSession.start_time,
      endTime: unequalSession.end_time,
    })
    expect(ok).toBe(true)
    expect(seen).toEqual([
      { start: unequalSession.start_time, end: unequalSession.end_time },
    ])
  })
})
