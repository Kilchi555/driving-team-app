/**
 * F-3 micro-fix — /api/courses/available-sessions authorization.
 *
 * admin=true unlocks is_public=false courses. It used to be a plain query-string
 * flag on an unauthenticated endpoint. These tests drive the real handler with a
 * stubbed Supabase query builder that actually applies the filters, so the
 * assertions reflect what a caller would receive.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Handler = (event: unknown) => Promise<{ success: boolean; sessions: PublicSession[] }>
type PublicSession = Record<string, unknown> & { courseName: string; sessionId: string }

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'

type CourseFixture = {
  id: string
  name: string
  description: string
  sari_course_id: string
  max_participants: number
  current_participants: number
  is_public: boolean
  tenant_id: string
  category: string
  sari_managed: boolean
  status: string
  course_sessions: Array<{
    id: string
    sari_session_id: string
    start_time: string
    end_time: string
    current_participants: number
    max_participants: number | null
  }>
}

/** Two dates per course, so sessionPosition=2 resolves to the second day. */
function makeCourse(
  id: string,
  name: string,
  tenantId: string,
  isPublic: boolean,
  sariPrefix: string,
): CourseFixture {
  return {
    id,
    name,
    description: 'Teststrasse 1, 8000 Zürich',
    sari_course_id: `GROUP_${sariPrefix}1_${sariPrefix}2`,
    max_participants: 20,
    current_participants: 0,
    is_public: isPublic,
    tenant_id: tenantId,
    category: 'VKU',
    sari_managed: true,
    status: 'active',
    course_sessions: [
      {
        id: `${id}-s1`,
        sari_session_id: `${sariPrefix}1`,
        start_time: '2026-11-02T08:00:00Z',
        end_time: '2026-11-02T12:00:00Z',
        current_participants: 0,
        max_participants: null,
      },
      {
        id: `${id}-s2`,
        sari_session_id: `${sariPrefix}2`,
        start_time: '2026-11-09T08:00:00Z',
        end_time: '2026-11-09T12:00:00Z',
        current_participants: 0,
        max_participants: null,
      },
    ],
  }
}

const COURSES: CourseFixture[] = [
  makeCourse('pub-a', 'Public Course A', TENANT_A, true, '11'),
  makeCourse('priv-a', 'UNPUBLISHED Course A', TENANT_A, false, '22'),
  makeCourse('pub-b', 'Public Course B', TENANT_B, true, '33'),
  makeCourse('priv-b', 'UNPUBLISHED Course B', TENANT_B, false, '44'),
]

/** Chainable stub that really applies the .eq() filters the handler builds. */
function makeSupabaseStub() {
  const build = (filters: Array<[string, unknown]>) => ({
    eq(column: string, value: unknown) {
      return build([...filters, [column, value]])
    },
    then(onFulfilled: (r: { data: CourseFixture[]; error: null }) => unknown) {
      const data = COURSES.filter(course =>
        filters.every(([column, value]) => (course as unknown as Record<string, unknown>)[column] === value)
      )
      return Promise.resolve(onFulfilled({ data, error: null }))
    },
  })
  return { from: () => ({ select: () => build([]) }) }
}

const mockCreateError = (opts: { statusCode: number; statusMessage?: string }) =>
  Object.assign(new Error(opts.statusMessage || 'error'), opts)

/**
 * @param adminProfile undefined = requireAdminProfile must not be reached,
 *   an Error = it throws (unauthenticated / wrong role), else it resolves.
 */
async function loadHandler(
  query: Record<string, string>,
  adminProfile?: { tenant_id: string; role: string } | Error,
) {
  const requireAdminProfile = vi.fn(async () => {
    if (adminProfile instanceof Error) throw adminProfile
    if (!adminProfile) throw new Error('requireAdminProfile called unexpectedly')
    return { id: 'u1', tenant_id: adminProfile.tenant_id, role: adminProfile.role, email: '', auth_user_id: 'a1' }
  })

  vi.doMock('h3', () => ({
    defineEventHandler: (fn: Handler) => fn,
    getQuery: () => query,
    createError: mockCreateError,
  }))
  vi.doMock('~/server/utils/supabase-admin', () => ({ getSupabaseAdmin: () => makeSupabaseStub() }))
  vi.doMock('~/server/utils/auth', () => ({ requireAdminProfile }))
  vi.doMock('~/utils/logger', () => ({
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }))

  const handler = (await import('../../api/courses/available-sessions.get')).default as unknown as Handler
  return { handler, requireAdminProfile }
}

const baseQuery = { tenantId: TENANT_A, category: 'VKU', sessionPosition: '2' }

beforeEach(() => vi.resetModules())
afterEach(() => vi.doUnmock('h3'))

describe('available-sessions authorization', () => {
  // ── TEST A ────────────────────────────────────────────────────────────────
  it('TEST A: public request without admin=true keeps the existing public behavior', async () => {
    const { handler, requireAdminProfile } = await loadHandler({ ...baseQuery })
    const res = await handler({})

    expect(res.success).toBe(true)
    expect(res.sessions.length).toBeGreaterThan(0)
    // Public course of the requested tenant is returned.
    expect(res.sessions.map(s => s.courseName)).toContain('Public Course A')
    // No unpublished course leaks.
    expect(res.sessions.some(s => String(s.courseName).includes('UNPUBLISHED'))).toBe(false)
    // Authorization is not consulted for public traffic.
    expect(requireAdminProfile).not.toHaveBeenCalled()
  })

  // ── TEST B ────────────────────────────────────────────────────────────────
  it('TEST B: unauthenticated admin=true is denied and returns no unpublished sessions', async () => {
    const unauthorized = mockCreateError({ statusCode: 401, statusMessage: 'Unauthorized' })
    const { handler, requireAdminProfile } = await loadHandler({ ...baseQuery, admin: 'true' }, unauthorized)

    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
    expect(requireAdminProfile).toHaveBeenCalled()
  })

  it('TEST B2: the ?admin=1 spelling is equally gated', async () => {
    const unauthorized = mockCreateError({ statusCode: 401, statusMessage: 'Unauthorized' })
    const { handler } = await loadHandler({ ...baseQuery, admin: '1' }, unauthorized)

    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
  })

  // ── TEST C ────────────────────────────────────────────────────────────────
  it('TEST C: authenticated non-admin with admin=true is denied', async () => {
    const forbidden = mockCreateError({ statusCode: 403, statusMessage: 'Forbidden – insufficient role' })
    const { handler, requireAdminProfile } = await loadHandler({ ...baseQuery, admin: 'true' }, forbidden)

    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(requireAdminProfile).toHaveBeenCalled()
  })

  // ── TEST D ────────────────────────────────────────────────────────────────
  it('TEST D: authorized admin keeps the existing admin behavior', async () => {
    const { handler } = await loadHandler(
      { ...baseQuery, admin: 'true' },
      { tenant_id: TENANT_A, role: 'admin' },
    )
    const res = await handler({})

    const names = res.sessions.map(s => s.courseName)
    // Admin mode still surfaces unpublished courses of the own tenant.
    expect(names).toContain('UNPUBLISHED Course A')
    expect(names).toContain('Public Course A')
    // Still scoped to the own tenant.
    expect(names.some(n => String(n).includes('Course B'))).toBe(false)
  })

  it('TEST D2: staff is accepted by the same primitive as the rest of the admin surface', async () => {
    const { handler } = await loadHandler(
      { ...baseQuery, admin: 'true' },
      { tenant_id: TENANT_A, role: 'staff' },
    )
    const res = await handler({})
    expect(res.sessions.map(s => s.courseName)).toContain('UNPUBLISHED Course A')
  })

  // ── TEST E ────────────────────────────────────────────────────────────────
  it('TEST E: an admin of another tenant cannot read tenant A unpublished sessions', async () => {
    const { handler } = await loadHandler(
      { ...baseQuery, admin: 'true' }, // asks for TENANT_A
      { tenant_id: TENANT_B, role: 'admin' }, // but is admin of TENANT_B
    )

    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('TEST E2: tenant isolation is unchanged for public traffic', async () => {
    const { handler } = await loadHandler({ ...baseQuery, tenantId: TENANT_B })
    const res = await handler({})

    expect(res.sessions.map(s => s.courseName)).toContain('Public Course B')
    expect(res.sessions.some(s => String(s.courseName).includes('Course A'))).toBe(false)
    expect(res.sessions.some(s => String(s.courseName).includes('UNPUBLISHED'))).toBe(false)
  })

  // ── TEST F ────────────────────────────────────────────────────────────────
  it('TEST F: no response shape exposes an internal SARI session id', async () => {
    for (const profile of [undefined, { tenant_id: TENANT_A, role: 'admin' as const }]) {
      const q = profile ? { ...baseQuery, admin: 'true' } : { ...baseQuery }
      const { handler } = await loadHandler(q, profile)
      const res = await handler({})

      expect(res.sessions.length).toBeGreaterThan(0)
      for (const session of res.sessions) {
        expect(session).not.toHaveProperty('sariSessionId')
        expect(session).not.toHaveProperty('sari_session_id')
      }
      // Nothing anywhere in the serialized payload either.
      const serialized = JSON.stringify(res)
      expect(serialized).not.toContain('sariSessionId')
      expect(serialized).not.toContain('sari_session_id')
      // The SARI id values themselves must not appear under another key.
      expect(serialized).not.toContain('"111"')
      expect(serialized).not.toContain('"222"')
    }
  })
})

describe('available-sessions authorization contract', () => {
  const src = readFileSync(resolve(process.cwd(), 'server/api/courses/available-sessions.get.ts'), 'utf8')

  it('gates admin mode behind requireAdminProfile, not the query string', () => {
    expect(src).toContain('requireAdminProfile(event)')
    // The admin flag must be authorized before the data query is built.
    expect(src.indexOf('requireAdminProfile(event)')).toBeLessThan(src.indexOf("from('courses')"))
    // And the non-public relaxation still hangs off that authorized flag.
    expect(src).toContain("coursesQuery = coursesQuery.eq('is_public', true)")
  })

  it('scopes admin mode to the caller tenant', () => {
    expect(src).toContain('profile.tenant_id !== tenantId')
    expect(src).toContain('statusCode: 403')
  })

  it('never returns an internal SARI id', () => {
    expect(src).not.toMatch(/sariSessionId\s*:/)
  })
})
