import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertRegistrationsDeletable,
  deleteConfirmedSariMembership,
  isUnresolvedSariRegistration,
  listRegistrationSariMemberships,
  parsePositiveSariSessionId,
  recordConfirmedSariMembership,
  SARI_MEMBERSHIP_SOURCE,
  SariMembershipWriteError,
  strictSariIdsFromGroup,
  uniqueCourseSessionIdForSari,
  uniqueLocalCourseSessionId,
} from '~/server/utils/registration-sari-membership'

const TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OTHER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const REG = '55555555-5555-4555-8555-555555555555'
const SESSION = '11111111-1111-4111-8111-111111111111'
const FOREIGN_SESSION = '99999999-9999-4999-8999-999999999999'

type Row = Record<string, unknown>

function fakeDb(seed?: { registrations?: Row[]; sessions?: Row[]; memberships?: Row[] }) {
  const tables: Record<string, Row[]> = {
    course_registrations: seed?.registrations || [{ id: REG, tenant_id: TENANT, user_id: 'student' }],
    course_sessions: seed?.sessions || [{ id: SESSION, tenant_id: TENANT }],
    registration_sari_memberships: seed?.memberships || [],
  }

  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = []
    let op: 'select' | 'insert' | 'delete' = 'select'
    let payload: Row | null = null
    let limit: number | null = null
    let orderColumn: string | null = null

    const run = () => {
      const rows = tables[table] || []
      if (op === 'insert' && payload) {
        const duplicate = rows.some(
          (row) => row.registration_id === payload?.registration_id && row.sari_session_id === payload?.sari_session_id,
        )
        if (duplicate) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
        rows.push({ id: `m-${rows.length + 1}`, ...payload })
        return { data: payload, error: null }
      }
      if (op === 'delete') {
        const next = rows.filter((row) => !filters.every((match) => match(row)))
        tables[table] = next
        return { data: null, error: null }
      }
      let selected = rows.filter((row) => filters.every((match) => match(row)))
      if (orderColumn) {
        selected = selected.slice().sort((a, b) => Number(a[orderColumn as string]) - Number(b[orderColumn as string]))
      }
      if (limit != null) selected = selected.slice(0, limit)
      return { data: selected, error: null }
    }

    const builder: Record<string, unknown> = {}
    builder.select = () => builder
    builder.insert = (value: Row) => {
      op = 'insert'
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
    builder.order = (column: string) => {
      orderColumn = column
      return builder
    }
    builder.update = () => builder
    builder.limit = (value: number) => {
      limit = value
      return builder
    }
    builder.maybeSingle = async () => {
      const result = run()
      const data = Array.isArray(result.data) ? result.data[0] || null : result.data
      return { data, error: result.error }
    }
    builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(run()).then(resolve, reject)
    return builder
  }

  return { from, tables }
}

describe('registration SARI membership source of truth', () => {
  it('parses only a positive safe integer', () => {
    expect(parsePositiveSariSessionId(2110027)).toBe(2110027)
    expect(parsePositiveSariSessionId('2110027')).toBe(2110027)
    expect(parsePositiveSariSessionId('GROUP_2110027_2110028')).toBeNull()
    expect(parsePositiveSariSessionId(0)).toBeNull()
    expect(parsePositiveSariSessionId(-1)).toBeNull()
  })

  it('A. records a membership only for a verified registration', async () => {
    const db = fakeDb()
    const result = await recordConfirmedSariMembership({
      supabase: db as never,
      tenantId: TENANT,
      registrationId: REG,
      sariSessionId: 2110027,
      courseSessionId: SESSION,
      source: SARI_MEMBERSHIP_SOURCE.manualEnrollment,
    })
    expect(result.created).toBe(true)
    expect(db.tables.registration_sari_memberships).toEqual([
      expect.objectContaining({
        tenant_id: TENANT,
        registration_id: REG,
        sari_session_id: 2110027,
        course_session_id: SESSION,
        source: 'MANUAL_ENROLLMENT',
      }),
    ])
  })

  it('B. does not insert when the SARI id is not a confirmed positive integer', async () => {
    const db = fakeDb()
    await expect(recordConfirmedSariMembership({
      supabase: db as never,
      tenantId: TENANT,
      registrationId: REG,
      sariSessionId: 'GROUP_2110027',
      source: SARI_MEMBERSHIP_SOURCE.webhookEnrollment,
    })).rejects.toMatchObject({ code: 'invalid_sari_session_id' })
    expect(db.tables.registration_sari_memberships).toHaveLength(0)
  })

  it('C. treats a duplicate membership as an idempotent retry', async () => {
    const db = fakeDb()
    const args = {
      supabase: db as never,
      tenantId: TENANT,
      registrationId: REG,
      sariSessionId: 2110027,
      courseSessionId: SESSION,
      source: SARI_MEMBERSHIP_SOURCE.cashEnrollment,
    }
    await recordConfirmedSariMembership(args)
    const second = await recordConfirmedSariMembership(args)
    expect(second.created).toBe(false)
    expect(db.tables.registration_sari_memberships).toHaveLength(1)
  })

  it('H. rejects a registration from another tenant before insert', async () => {
    const db = fakeDb()
    await expect(recordConfirmedSariMembership({
      supabase: db as never,
      tenantId: OTHER,
      registrationId: REG,
      sariSessionId: 2110027,
      source: SARI_MEMBERSHIP_SOURCE.adminCourseEnroll,
    })).rejects.toBeInstanceOf(SariMembershipWriteError)
    expect(db.tables.registration_sari_memberships).toHaveLength(0)
  })

  it('I. rejects a course session from another tenant', async () => {
    const db = fakeDb({
      sessions: [
        { id: SESSION, tenant_id: TENANT },
        { id: FOREIGN_SESSION, tenant_id: OTHER },
      ],
    })
    await expect(recordConfirmedSariMembership({
      supabase: db as never,
      tenantId: TENANT,
      registrationId: REG,
      sariSessionId: 2110027,
      courseSessionId: FOREIGN_SESSION,
      source: SARI_MEMBERSHIP_SOURCE.walleeEnrollment,
    })).rejects.toMatchObject({ code: 'session_tenant' })
    expect(db.tables.registration_sari_memberships).toHaveLength(0)
  })

  it('K and L. keeps every membership, including one whose course session was cleared', async () => {
    const db = fakeDb({
      memberships: [
        {
          id: 'm1',
          tenant_id: TENANT,
          registration_id: REG,
          sari_session_id: 2110028,
          course_session_id: SESSION,
          source: 'WEBHOOK_ENROLLMENT',
        },
        {
          id: 'm2',
          tenant_id: TENANT,
          registration_id: REG,
          sari_session_id: 2110027,
          course_session_id: null,
          source: 'WEBHOOK_ENROLLMENT',
        },
      ],
    })
    const rows = await listRegistrationSariMemberships(db as never, TENANT, REG)
    expect(rows.map((row) => row.sari_session_id)).toEqual([2110027, 2110028])
    expect(rows[0]?.course_session_id).toBeNull()
    expect(db.tables.registration_sari_memberships).toHaveLength(2)
  })

  it('G. deletes one confirmed membership and leaves the others', async () => {
    const db = fakeDb({
      memberships: [
        { id: 'm1', tenant_id: TENANT, registration_id: REG, sari_session_id: 2110027, course_session_id: null, source: 'MANUAL_ENROLLMENT' },
        { id: 'm2', tenant_id: TENANT, registration_id: REG, sari_session_id: 2110028, course_session_id: null, source: 'MANUAL_ENROLLMENT' },
      ],
    })
    await deleteConfirmedSariMembership({
      supabase: db as never,
      tenantId: TENANT,
      registrationId: REG,
      sariSessionId: 2110027,
    })
    expect(db.tables.registration_sari_memberships.map((row) => row.sari_session_id)).toEqual([2110028])
  })

  it('J. blocks registration delete while a membership exists', async () => {
    const db = fakeDb({
      memberships: [
        { id: 'm1', tenant_id: TENANT, registration_id: REG, sari_session_id: 2110027, course_session_id: null, source: 'MANUAL_ENROLLMENT' },
      ],
    })
    await expect(assertRegistrationsDeletable(db as never, [REG])).rejects.toMatchObject({ code: 'membership_exists' })
    const empty = fakeDb()
    await expect(assertRegistrationsDeletable(empty as never, [REG])).resolves.toBeUndefined()
  })

  it('I. parser rejects partial, grouped, zero, negative, decimal, blank, and unsafe ids', () => {
    expect(parsePositiveSariSessionId('2110027')).toBe(2110027)
    expect(parsePositiveSariSessionId('2110028')).toBe(2110028)
    expect(parsePositiveSariSessionId('2110027abc')).toBeNull()
    expect(parsePositiveSariSessionId('GROUP_2110027_2110028')).toBeNull()
    expect(parsePositiveSariSessionId('0')).toBeNull()
    expect(parsePositiveSariSessionId('-1')).toBeNull()
    expect(parsePositiveSariSessionId('1.5')).toBeNull()
    expect(parsePositiveSariSessionId('')).toBeNull()
    expect(parsePositiveSariSessionId(String(Number.MAX_SAFE_INTEGER + 1))).toBeNull()
    expect(strictSariIdsFromGroup('GROUP_2110027_2110028_2110027abc')).toEqual([2110027, 2110028])
  })

  it('unresolved is only a confirmed SARI registration with a faberid and no snapshot', () => {
    expect(isUnresolvedSariRegistration({
      sariManaged: true,
      faberid: '7181751',
      status: 'confirmed',
      paymentMethod: 'wallee',
      membershipCount: 0,
    })).toBe(true)
    expect(isUnresolvedSariRegistration({
      sariManaged: true,
      faberid: '7181751',
      status: 'confirmed',
      paymentMethod: 'reserved',
      membershipCount: 0,
    })).toBe(false)
    expect(isUnresolvedSariRegistration({
      sariManaged: false,
      faberid: '7181751',
      status: 'confirmed',
      paymentMethod: 'cash',
      membershipCount: 0,
    })).toBe(false)
  })

  it('K. ambiguous local sessions do not pick a course_session_id', async () => {
    expect(uniqueLocalCourseSessionId([
      { id: 'a', sari_session_id: '2110027', tenant_id: TENANT },
      { id: 'b', sari_session_id: '2110027', tenant_id: TENANT },
    ], 2110027, TENANT)).toBeNull()
    const db = fakeDb({
      sessions: [
        { id: 'a', tenant_id: TENANT, course_id: 'course', sari_session_id: '2110027' },
        { id: 'b', tenant_id: TENANT, course_id: 'course', sari_session_id: '2110027' },
      ],
    })
    await expect(uniqueCourseSessionIdForSari(db as never, TENANT, 'course', 2110027)).resolves.toBeNull()
    const one = fakeDb({
      sessions: [{ id: SESSION, tenant_id: TENANT, course_id: 'course', sari_session_id: '2110027' }],
    })
    await expect(uniqueCourseSessionIdForSari(one as never, TENANT, 'course', 2110027)).resolves.toBe(SESSION)
  })

  it('M. client surfaces do not query the membership table', () => {
    const roots = ['components', 'composables', 'pages', 'stores', 'apps/website']
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === '.nuxt' || entry === 'server') continue
        const path = join(dir, entry)
        const info = statSync(path)
        if (info.isDirectory()) walk(path)
        else if (/\.(vue|ts|js)$/.test(entry) && readFileSync(path, 'utf8').includes('registration_sari_memberships')) {
          hits.push(path)
        }
      }
    }
    for (const root of roots) walk(root)
    expect(hits).toEqual([])
  })
})
