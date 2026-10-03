import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { SARISyncEngine } from '~/server/utils/sari-sync-engine'
import { applySariSessionTransfer } from '~/server/utils/sari-session-transfer'
import { SARI_MEMBERSHIP_SOURCE } from '~/server/utils/registration-sari-membership'

const TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const COURSE = '33333333-3333-4333-8333-333333333333'
const REG = '55555555-5555-4555-8555-555555555555'

type Row = Record<string, unknown>

function memoryDb() {
  const tables: Record<string, Row[]> = {
    course_registrations: [],
    course_sessions: [],
    registration_sari_memberships: [],
    payments: [],
  }
  let failMembershipInsert = false

  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = []
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
    let payload: Row | null = null

    const run = () => {
      const rows = tables[table] || (tables[table] = [])
      if (op === 'insert' && payload) {
        if (table === 'registration_sari_memberships' && failMembershipInsert) {
          return { data: null, error: { code: 'XX000', message: 'membership insert failed' } }
        }
        if (table === 'registration_sari_memberships') {
          const duplicate = rows.some(
            (row) => row.registration_id === payload?.registration_id && row.sari_session_id === payload?.sari_session_id,
          )
          if (duplicate) return { data: null, error: { code: '23505', message: 'duplicate key' } }
        }
        const created = { id: payload.id || `${table}-${rows.length + 1}`, ...payload }
        rows.push(created)
        return { data: created, error: null }
      }
      if (op === 'update' && payload) {
        for (const row of rows) {
          if (filters.every((match) => match(row))) Object.assign(row, payload)
        }
        return { data: null, error: null }
      }
      if (op === 'delete') {
        tables[table] = rows.filter((row) => !filters.every((match) => match(row)))
        return { data: null, error: null }
      }
      const selected = rows.filter((row) => filters.every((match) => match(row)))
      return { data: selected, error: null }
    }

    const builder: Record<string, unknown> = {}
    const chain = () => builder
    builder.select = chain
    builder.insert = (value: Row) => {
      op = 'insert'
      payload = value
      return builder
    }
    builder.update = (value: Row) => {
      op = 'update'
      payload = value
      return builder
    }
    builder.delete = () => {
      op = 'delete'
      return builder
    }
    builder.eq = (column: string, value: unknown) => {
      filters.push((row) => row[column] === value)
      return builder
    }
    builder.in = (column: string, values: unknown[]) => {
      filters.push((row) => values.includes(row[column]))
      return builder
    }
    builder.is = chain
    builder.gte = chain
    builder.contains = chain
    builder.order = chain
    builder.limit = chain
    builder.neq = chain
    builder.not = chain
    builder.gt = chain
    builder.maybeSingle = async () => {
      const result = run()
      const data = Array.isArray(result.data) ? result.data[0] || null : result.data
      return { data, error: result.error }
    }
    builder.single = builder.maybeSingle
    builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(run()).then(resolve, reject)
    return builder
  }

  return {
    from,
    tables,
    setFailMembershipInsert(value: boolean) {
      failMembershipInsert = value
    },
  }
}

function engine(db: ReturnType<typeof memoryDb>, detail: Record<number, Array<Record<string, unknown>>>) {
  const sari = {
    getCourseDetail: vi.fn(async (id: number) => detail[id] || []),
    getCustomer: vi.fn(async () => {
      throw new Error('no customer')
    }),
  }
  return { sync: new SARISyncEngine(db as never, sari as never, TENANT), sari }
}

describe('syncCourseParticipants membership', () => {
  it('writes a membership for the SARI id that getCourseDetail confirmed', async () => {
    const db = memoryDb()
    db.tables.course_sessions.push({
      id: 'sess-1',
      tenant_id: TENANT,
      course_id: COURSE,
      sari_session_id: '2110027',
    })
    const { sync, sari } = engine(db, {
      2110027: [{ faberid: '007181751', firstname: 'Ada', lastname: 'Lovelace' }],
    })
    await sync.syncCourseParticipants(COURSE, 2110027)
    expect(sari.getCourseDetail).toHaveBeenCalledWith(2110027)
    expect(db.tables.registration_sari_memberships).toEqual([
      expect.objectContaining({
        tenant_id: TENANT,
        sari_session_id: 2110027,
        course_session_id: 'sess-1',
        source: SARI_MEMBERSHIP_SOURCE.syncEngine,
      }),
    ])
    expect(db.tables.course_registrations[0]?.sari_synced).toBe(true)
  })

  it('keeps one membership per confirmed SARI id for the same faberid', async () => {
    const db = memoryDb()
    const { sync } = engine(db, {
      2110027: [{ faberid: '7181751', firstname: 'Ada', lastname: 'Lovelace' }],
      2110028: [{ faberid: '7181751', firstname: 'Ada', lastname: 'Lovelace' }],
    })
    await sync.syncCourseParticipants(COURSE, 2110027)
    await sync.syncCourseParticipants(COURSE, 2110028)
    expect(db.tables.registration_sari_memberships.map((row) => row.sari_session_id)).toEqual([2110027, 2110028])
    expect(db.tables.course_registrations).toHaveLength(1)
  })

  it('stores a null course_session_id when the local session is ambiguous', async () => {
    const db = memoryDb()
    db.tables.course_sessions.push(
      { id: 'sess-a', tenant_id: TENANT, course_id: COURSE, sari_session_id: '2110027' },
      { id: 'sess-b', tenant_id: TENANT, course_id: COURSE, sari_session_id: '2110027' },
    )
    const { sync } = engine(db, {
      2110027: [{ faberid: '7181751', firstname: 'Ada', lastname: 'Lovelace' }],
    })
    await sync.syncCourseParticipants(COURSE, 2110027)
    expect(db.tables.registration_sari_memberships[0]?.course_session_id).toBeNull()
  })

  it('fails the import when the membership write fails', async () => {
    const db = memoryDb()
    db.setFailMembershipInsert(true)
    const { sync } = engine(db, {
      2110027: [{ faberid: '7181751', firstname: 'Ada', lastname: 'Lovelace' }],
    })
    await expect(sync.syncCourseParticipants(COURSE, 2110027)).rejects.toMatchObject({ code: 'persist_failed' })
    expect(db.tables.course_registrations[0]?.sari_synced).toBe(false)
  })

  it('repairs a missing membership on re-sync', async () => {
    const db = memoryDb()
    const { sync } = engine(db, {
      2110027: [{ faberid: '7181751', firstname: 'Ada', lastname: 'Lovelace' }],
    })
    await sync.syncCourseParticipants(COURSE, 2110027)
    db.tables.registration_sari_memberships = []
    db.tables.course_registrations[0].sari_synced = false
    await sync.syncCourseParticipants(COURSE, 2110027)
    expect(db.tables.registration_sari_memberships).toHaveLength(1)
    expect(db.tables.course_registrations[0]?.sari_synced).toBe(true)
  })
})

describe('cancel and remove unresolved semantics', () => {
  it('does not count a zero-membership registration as SARI-unenrolled', () => {
    const cancel = readFileSync('server/api/admin/courses/cancel-course.post.ts', 'utf8')
    expect(cancel).toContain('unresolved: sariUnresolved')
    expect(cancel).toContain('localOnly: sariLocalOnly')
    expect(cancel).toContain('failed: sariFailedCount')
    expect(cancel).not.toContain('.length - sariFailedCount')
    expect(cancel).toContain("status: 'confirmed'")
    const remove = readFileSync('server/api/admin/courses/remove-participant.post.ts', 'utf8')
    expect(remove).toContain('SARI membership status unknown')
    expect(remove.indexOf('SARI membership status unknown')).toBeLessThan(remove.indexOf('deleted_at: new Date'))
    const toast = readFileSync('pages/admin/courses.vue', 'utf8')
    expect(toast).not.toContain('Teilnehmer wurden aus SARI abgemeldet')
    expect(toast).toContain('SARI-Mitgliedschaft(en) entfernt')
  })
})

describe('transfer-session membership order', () => {
  const membership = {
    id: 'm1',
    tenant_id: TENANT,
    registration_id: REG,
    sari_session_id: 2110027,
    course_session_id: null,
    source: 'MANUAL_ENROLLMENT',
  }

  function dbWithMembership() {
    const db = memoryDb()
    db.tables.course_registrations.push({ id: REG, tenant_id: TENANT })
    db.tables.registration_sari_memberships.push({ ...membership })
    return db
  }

  it('keeps the old membership when the target enroll fails', async () => {
    const db = dbWithMembership()
    const sari = {
      unenrollStudent: vi.fn(async () => undefined),
      enrollStudent: vi.fn(async () => {
        throw new Error('SARI error: COURSE_FULL')
      }),
    }
    await expect(applySariSessionTransfer({
      supabase: db as never,
      sari,
      tenantId: TENANT,
      registrationId: REG,
      faberid: '7181751',
      birthdate: '2000-01-02',
      changes: [{ oldSariIds: ['2110027'], targetSariSessionIds: ['2110099'] }],
      memberships: [membership],
    })).rejects.toMatchObject({ statusCode: 502 })
    expect(db.tables.registration_sari_memberships.map((row) => row.sari_session_id)).toEqual([2110027])
  })

  it('treats an already-removed old seat as idempotent and continues', async () => {
    const db = dbWithMembership()
    const sari = {
      unenrollStudent: vi.fn(async () => {
        throw new Error('SARI error: PERSON_NOT_REGISTERED')
      }),
      enrollStudent: vi.fn(async () => undefined),
    }
    await applySariSessionTransfer({
      supabase: db as never,
      sari,
      tenantId: TENANT,
      registrationId: REG,
      faberid: '7181751',
      birthdate: '2000-01-02',
      changes: [{ oldSariIds: ['2110027'], targetSariSessionIds: ['2110099'] }],
      memberships: [membership],
    })
    expect(db.tables.registration_sari_memberships.map((row) => row.sari_session_id)).toEqual([2110099])
  })

  it('accepts an already-enrolled target and only then deletes the old row', async () => {
    const db = dbWithMembership()
    const events: string[] = []
    const originalInsert = db.from
    db.from = ((table: string) => {
      const builder = originalInsert(table)
      if (table === 'registration_sari_memberships') {
        const insert = builder.insert
        builder.insert = (value: Row) => {
          events.push(`insert:${value.sari_session_id}`)
          return insert(value)
        }
        const del = builder.delete
        builder.delete = () => {
          events.push('delete-old')
          return del()
        }
      }
      return builder
    }) as typeof db.from
    const sari = {
      unenrollStudent: vi.fn(async () => undefined),
      enrollStudent: vi.fn(async () => {
        throw new Error('SARI error: ALREADY_ENROLLED')
      }),
    }
    await applySariSessionTransfer({
      supabase: db as never,
      sari,
      tenantId: TENANT,
      registrationId: REG,
      faberid: '7181751',
      birthdate: '2000-01-02',
      changes: [{ oldSariIds: ['2110027'], targetSariSessionIds: ['2110099'] }],
      memberships: [membership],
    })
    expect(events[0]).toBe('insert:2110099')
    expect(events.at(-1)).toBe('delete-old')
    expect(db.tables.registration_sari_memberships.map((row) => row.sari_session_id)).toEqual([2110099])
  })
})
