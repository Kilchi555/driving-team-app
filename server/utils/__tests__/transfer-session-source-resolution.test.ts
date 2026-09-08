/**
 * F-3 follow-up — admin session transfer must unenroll the session the student
 * is actually in.
 *
 * F-3 changed course_registrations.custom_sessions from internal SARI ids to
 * public course_sessions.id. The admin transfer still read only the SARI keys,
 * so a swapped registration fell through to the course's own session at that
 * position. SARI then answered NOT_ENROLLED (swallowed by the handler) and the
 * student stayed in the swapped session while also being enrolled in the target.
 *
 * These tests drive the real handler and assert the concrete SARI ids handed to
 * unenrollStudent / enrollStudent, not just the status code.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const TENANT = 'tenant-1'
const OTHER_TENANT = 'tenant-2'

/** SARI ids are deliberately distinct per session so a mix-up is visible. */
const SESSIONS = [
  { id: 'c1-s1', sari_session_id: '1001', tenant_id: TENANT, start_time: '2026-11-02T08:00:00Z', end_time: '2026-11-02T12:00:00Z' },
  { id: 'c1-s2', sari_session_id: '1002', tenant_id: TENANT, start_time: '2026-11-09T08:00:00Z', end_time: '2026-11-09T12:00:00Z' },
  { id: 'c2-s2', sari_session_id: '2002', tenant_id: TENANT, start_time: '2026-11-16T08:00:00Z', end_time: '2026-11-16T12:00:00Z' },
  { id: 'c3-s2', sari_session_id: '3002', tenant_id: TENANT, start_time: '2026-11-23T08:00:00Z', end_time: '2026-11-23T12:00:00Z' },
  { id: 'c4-s2', sari_session_id: '4002', tenant_id: TENANT, start_time: '2026-11-30T08:00:00Z', end_time: '2026-11-30T12:00:00Z' },
  { id: 'foreign-s2', sari_session_id: '9002', tenant_id: OTHER_TENANT, start_time: '2026-12-07T08:00:00Z', end_time: '2026-12-07T12:00:00Z' },
]

/** The registration's own course. Position 1 = c1-s1, position 2 = c1-s2. */
const COURSE_C1 = {
  id: 'c1',
  name: 'VKU Zürich',
  category: 'VKU',
  sari_managed: true,
  sari_course_id: 'GROUP_1001_1002',
  tenant_id: TENANT,
  course_sessions: SESSIONS.filter(s => s.id.startsWith('c1-')).map(s => ({
    id: s.id,
    sari_session_id: s.sari_session_id,
    start_time: s.start_time,
    end_time: s.end_time,
    session_number: 1,
  })),
}

const TARGET_COURSES: Record<string, { id: string; name: string; category: string; description: string }> = {
  c3: { id: 'c3', name: 'VKU Winterthur', category: 'VKU', description: '' },
  c4: { id: 'c4', name: 'VKU Uster', category: 'VKU', description: '' },
}

type SariCalls = { validated: string[][]; unenroll: number[]; enroll: number[] }

function makeSupabase(customSessions: Record<string, unknown> | null) {
  const captured: { update?: Record<string, unknown>; sessionLookupTenants: unknown[] } = {
    sessionLookupTenants: [],
  }

  const singleFor = (table: string, filters: Array<[string, unknown]>) => {
    if (table === 'course_registrations') {
      return {
        data: {
          id: 'reg-1',
          course_id: 'c1',
          tenant_id: TENANT,
          user_id: 'user-1',
          sari_faberid: '123.456.789',
          birthdate: '2000-01-01',
          sari_data: null,
          custom_sessions: customSessions,
          status: 'confirmed',
          email: 'k@example.com',
          first_name: 'Kim',
          last_name: 'Muster',
          notes: null,
        },
        error: null,
      }
    }
    if (table === 'courses') {
      const id = filters.find(([c]) => c === 'id')?.[1]
      if (id === 'c1') return { data: COURSE_C1, error: null }
      return { data: TARGET_COURSES[String(id)] ?? null, error: null }
    }
    if (table === 'tenants') {
      return { data: { id: TENANT, name: 'Fahrschule', contact_email: null, contact_phone: null, sari_enabled: true }, error: null }
    }
    return { data: null, error: null }
  }

  function builder(table: string) {
    const filters: Array<[string, unknown]> = []
    let inIds: string[] = []
    const api: Record<string, unknown> = {
      select: () => api,
      eq: (column: string, value: unknown) => { filters.push([column, value]); return api },
      in: (column: string, values: string[]) => { if (column === 'id') inIds = values; return api },
      is: () => api,
      single: () => Promise.resolve(singleFor(table, filters)),
      maybeSingle: () => Promise.resolve(singleFor(table, filters)),
      update: (payload: Record<string, unknown>) => { captured.update = payload; return api },
      then: (onFulfilled: (r: { data: unknown; error: null }) => unknown) => {
        if (table === 'course_sessions') {
          const tenantId = filters.find(([c]) => c === 'tenant_id')?.[1]
          captured.sessionLookupTenants.push(tenantId)
          const data = SESSIONS
            .filter(s => inIds.includes(s.id) && s.tenant_id === tenantId)
            .map(s => ({ id: s.id, sari_session_id: s.sari_session_id }))
          return Promise.resolve(onFulfilled({ data, error: null }))
        }
        return Promise.resolve(onFulfilled({ data: null, error: null }))
      },
    }
    return api
  }

  return { client: { from: (table: string) => builder(table) }, captured }
}

async function runTransfer(
  customSessions: Record<string, unknown> | null,
  change: Record<string, unknown> = { sessionPosition: 2, targetCourseId: 'c3', targetSessionIds: ['c3-s2'], targetDate: '2026-11-23' },
) {
  const sari: SariCalls = { validated: [], unenroll: [], enroll: [] }
  const { client, captured } = makeSupabase(customSessions)
  const requireAdminProfile = vi.fn(async () => ({ id: 'admin-1', tenant_id: TENANT, role: 'admin', email: '', auth_user_id: 'a1' }))

  vi.doMock('h3', () => ({
    defineEventHandler: (fn: (e: unknown) => unknown) => fn,
    readBody: async () => ({ registrationId: 'reg-1', changes: [change] }),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage || 'error'), opts),
  }))
  vi.doMock('~/server/utils/auth', () => ({ requireAdminProfile }))
  vi.doMock('~/server/utils/supabase-admin', () => ({ getSupabaseAdmin: () => client }))
  vi.doMock('~/server/utils/sari-credentials-secure', () => ({
    getSARICredentialsSecure: async () => ({ username: 'u', password: 'p' }),
  }))
  vi.doMock('~/utils/sariClient', () => ({
    SARIClient: class {
      async validateAllSessions(ids: string[]) { sari.validated.push(ids); return { canEnroll: true } }
      async unenrollStudent(id: number) { sari.unenroll.push(id) }
      async enrollStudent(id: number) { sari.enroll.push(id) }
    },
  }))
  vi.doMock('~/server/utils/session-order-rules', () => ({
    buildEffectiveSessionDates: () => ({}),
    evaluateSessionOrder: () => ({ ok: true, warnings: [], mode: 'strict' }),
  }))
  vi.doMock('~/server/utils/email', () => ({ sendTenantEmail: vi.fn() }))
  vi.doMock('~/server/utils/tenant-terminology', () => ({ getTenantTerminology: async () => ({ businessNoun: 'Fahrschule' }) }))
  vi.doMock('~/utils/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

  const handler = (await import('../../api/admin/courses/transfer-session.post')).default as unknown as (e: unknown) => Promise<Record<string, unknown>>
  return { handler, sari, captured, requireAdminProfile }
}

/** custom_sessions as the F-3 customer swap persists it: public UUIDs only. */
const PUBLIC_SHAPE_SWAP = {
  '2': {
    sessionIds: ['c2-s2'],
    sessionId: 'c2-s2',
    originalSessionIds: ['c1-s2'],
    date: '2026-11-16',
  },
}

beforeEach(() => vi.resetModules())
afterEach(() => vi.doUnmock('h3'))

describe('admin transfer — source session resolution', () => {
  // ── TEST A ────────────────────────────────────────────────────────────────
  it('TEST A: public shape resolves the source through the SARI session map', async () => {
    const { handler, sari } = await runTransfer(PUBLIC_SHAPE_SWAP)
    const res = await handler({})

    expect(res.success).toBe(true)
    // The student sits in c2-s2 (2002) after the customer swap — that is what
    // must be released, and c3-s2 (3002) is what the admin picked.
    expect(sari.unenroll).toEqual([2002])
    expect(sari.enroll).toEqual([3002])
  })

  // ── TEST B ────────────────────────────────────────────────────────────────
  it('TEST B: legacy sariSessionIds keeps working', async () => {
    const { handler, sari } = await runTransfer({
      '2': { sariSessionIds: ['2002'], originalSariIds: ['1002'], date: '2026-11-16' },
    })
    await handler({})

    expect(sari.unenroll).toEqual([2002])
    expect(sari.enroll).toEqual([3002])
  })

  // ── TEST C ────────────────────────────────────────────────────────────────
  it('TEST C: legacy singular sariSessionId keeps working', async () => {
    const { handler, sari } = await runTransfer({
      '2': { sariSessionId: '2002', date: '2026-11-16' },
    })
    await handler({})

    expect(sari.unenroll).toEqual([2002])
    expect(sari.enroll).toEqual([3002])
  })

  // ── TEST D ────────────────────────────────────────────────────────────────
  it('TEST D: a registration without a custom entry still falls back to the course session', async () => {
    const { handler, sari } = await runTransfer(null)
    await handler({})

    // No swap ever happened, so the course's own position-2 session (1002) is
    // where the student is.
    expect(sari.unenroll).toEqual([1002])
    expect(sari.enroll).toEqual([3002])
  })

  // ── TEST E ────────────────────────────────────────────────────────────────
  it('TEST E: never unenrolls the course session when a public swap says otherwise', async () => {
    const { handler, sari } = await runTransfer(PUBLIC_SHAPE_SWAP)
    await handler({})

    // 1002 is the course's own position-2 session — the value the pre-fix code
    // fell back to. Touching it would leave the student enrolled in c2-s2.
    expect(sari.unenroll).not.toContain(1002)
    expect(sari.unenroll).toContain(2002)
  })

  // ── TEST F ────────────────────────────────────────────────────────────────
  it('TEST F: an unresolvable public source fails instead of unenrolling something else', async () => {
    const { handler, sari } = await runTransfer({
      '2': { sessionIds: ['ghost-session'], originalSessionIds: ['c1-s2'], date: '2026-11-16' },
    })

    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(sari.unenroll).toEqual([])
    expect(sari.enroll).toEqual([])
  })

  it('TEST F2: a source session of another tenant is not resolvable', async () => {
    const { handler, sari } = await runTransfer({
      '2': { sessionIds: ['foreign-s2'], date: '2026-11-16' },
    })

    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(sari.unenroll).toEqual([])
  })

  // ── TEST G ────────────────────────────────────────────────────────────────
  it('TEST G: authorization and tenant scoping are unchanged', async () => {
    const { handler, captured, requireAdminProfile } = await runTransfer(PUBLIC_SHAPE_SWAP)
    await handler({})

    expect(requireAdminProfile).toHaveBeenCalled()
    // Every public id lookup is scoped to the admin's own tenant.
    expect(captured.sessionLookupTenants.length).toBeGreaterThan(0)
    expect(captured.sessionLookupTenants.every(t => t === TENANT)).toBe(true)
  })

  // ── persisted shape ───────────────────────────────────────────────────────
  it('leaves no stale public refs behind, so a second transfer stays correct', async () => {
    const first = await runTransfer(PUBLIC_SHAPE_SWAP)
    await first.handler({})

    const persisted = (first.captured.update?.custom_sessions as Record<string, Record<string, unknown>>)['2']
    // The pre-transfer swap target must not survive next to the new SARI ids.
    expect(persisted.sessionIds).toEqual(['c3-s2'])
    expect(persisted.sariSessionIds).toEqual(['3002'])

    vi.resetModules()
    const second = await runTransfer(
      { '2': persisted },
      { sessionPosition: 2, targetCourseId: 'c4', targetSessionIds: ['c4-s2'], targetDate: '2026-11-30' },
    )
    await second.handler({})

    // The second transfer releases what the first one booked, not the swap.
    expect(second.sari.unenroll).toEqual([3002])
    expect(second.sari.unenroll).not.toContain(2002)
    expect(second.sari.enroll).toEqual([4002])
  })
})
