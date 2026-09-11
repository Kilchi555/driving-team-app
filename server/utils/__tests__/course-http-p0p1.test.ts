/**
 * Course HTTP P0/P1 reconstruction — helper behavior + source contracts.
 *
 * These tests exercise the real validation helpers with a fake Supabase
 * client (filterable in-memory tables). Endpoint contracts are checked
 * against source so the security gates cannot be removed silently.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  COURSE_SESSIONS_COURSE_FK,
  courseSessionsEmbed,
} from '../course-session-embed'
import {
  assertCustomSessionsForTenant,
  collectCustomSessionPointers,
  loadPublicCourseForEnrollment,
  PUBLIC_ENROLLABLE_STATUSES,
} from '../course-custom-sessions'

const TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const COURSE_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const COURSE_A2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const COURSE_B = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const COURSE_PRIV = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const SESS_A = '11111111-1111-4111-8111-111111111111'
const SESS_A2 = '22222222-2222-4222-8222-222222222222'
const SESS_B = '33333333-3333-4333-8333-333333333333'
const SESS_PRIV = '44444444-4444-4444-8444-444444444444'

function statusOf(err: unknown): number | undefined {
  return (err as { statusCode?: number })?.statusCode
}

async function expectReject(fn: () => Promise<unknown>, status: number) {
  try {
    await fn()
    throw new Error('expected rejection')
  } catch (err) {
    if ((err as Error).message === 'expected rejection') throw err
    expect(statusOf(err) ?? (err as { statusCode?: number }).statusCode).toBe(status)
  }
}

function makeSupabase(tables: Record<string, Array<Record<string, unknown>>>): SupabaseClient {
  return {
    from(table: string) {
      let rows = [...(tables[table] || [])]
      const builder = {
        select() { return builder },
        eq(col: string, val: unknown) {
          rows = rows.filter((r) => r[col] === val)
          return builder
        },
        in(col: string, vals: unknown[]) {
          rows = rows.filter((r) => vals.includes(r[col]))
          return builder
        },
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        single: async () => ({
          data: rows[0] ?? null,
          error: rows[0] ? null : { message: 'not found' },
        }),
        then(resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) {
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
        },
      }
      return builder
    },
  } as unknown as SupabaseClient
}

const sessionTables = {
  course_sessions: [
    {
      id: SESS_A,
      course_id: COURSE_A,
      tenant_id: TENANT_A,
      sari_session_id: '1001',
      start_time: '2026-10-01T08:00:00+00:00',
      end_time: '2026-10-01T12:00:00+00:00',
      courses: { id: COURSE_A, tenant_id: TENANT_A, is_public: true },
    },
    {
      id: SESS_A2,
      course_id: COURSE_A2,
      tenant_id: TENANT_A,
      sari_session_id: '1002',
      start_time: '2026-10-08T08:00:00+00:00',
      end_time: '2026-10-08T12:00:00+00:00',
      courses: { id: COURSE_A2, tenant_id: TENANT_A, is_public: true },
    },
    {
      id: SESS_B,
      course_id: COURSE_B,
      tenant_id: TENANT_B,
      sari_session_id: '2001',
      start_time: '2026-10-01T08:00:00+00:00',
      end_time: '2026-10-01T12:00:00+00:00',
      courses: { id: COURSE_B, tenant_id: TENANT_B, is_public: true },
    },
    {
      id: SESS_PRIV,
      course_id: COURSE_PRIV,
      tenant_id: TENANT_A,
      sari_session_id: '1003',
      start_time: '2026-10-15T08:00:00+00:00',
      end_time: '2026-10-15T12:00:00+00:00',
      courses: { id: COURSE_PRIV, tenant_id: TENANT_A, is_public: false },
    },
  ],
  courses: [
    {
      id: COURSE_A,
      tenant_id: TENANT_A,
      is_public: true,
      is_active: true,
      status: 'active',
      name: 'VKU A',
      course_sessions: [],
    },
    {
      id: COURSE_PRIV,
      tenant_id: TENANT_A,
      is_public: false,
      is_active: true,
      status: 'active',
      name: 'Private',
      course_sessions: [],
    },
    {
      id: COURSE_B,
      tenant_id: TENANT_B,
      is_public: true,
      is_active: true,
      status: 'active',
      name: 'VKU B',
      course_sessions: [],
    },
  ],
}

function src(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
}

describe('course-session-embed', () => {
  it('qualifies the existing course_sessions_course_id_fkey relationship', () => {
    expect(COURSE_SESSIONS_COURSE_FK).toBe('course_sessions_course_id_fkey')
    expect(courseSessionsEmbed('id, start_time')).toBe(
      'course_sessions!course_sessions_course_id_fkey(id, start_time)',
    )
  })
})

describe('collectCustomSessionPointers', () => {
  it('treats null/empty as empty', () => {
    expect(collectCustomSessionPointers(null).empty).toBe(true)
    expect(collectCustomSessionPointers({}).empty).toBe(true)
  })

  it('rejects non-objects and malformed UUIDs', () => {
    expect(() => collectCustomSessionPointers('nope')).toThrow()
    expect(() => collectCustomSessionPointers({ '1': { sessionId: 'not-a-uuid' } })).toThrow()
    expect(() => collectCustomSessionPointers({ '1': { sessionId: SESS_B } })).not.toThrow()
    const ok = collectCustomSessionPointers({ '2': { sessionId: SESS_A, courseId: COURSE_A, sariSessionIds: ['1001'] } })
    expect(ok.sessionIds).toEqual([SESS_A])
    expect(ok.courseIds).toEqual([COURSE_A])
    expect(ok.sariIds).toEqual(['1001'])
  })
})

describe('assertCustomSessionsForTenant', () => {
  const supabase = makeSupabase(sessionTables)

  it('allows empty custom sessions', async () => {
    const result = await assertCustomSessionsForTenant({
      supabase,
      tenantId: TENANT_A,
      customSessions: null,
      requirePublic: true,
    })
    expect(result.sanitized).toBeNull()
  })

  it('rejects a Tenant B session UUID on a Tenant A enrollment (P0)', async () => {
    await expectReject(
      () => assertCustomSessionsForTenant({
        supabase,
        tenantId: TENANT_A,
        customSessions: { '2': { sessionId: SESS_B, courseId: COURSE_B, sariSessionIds: ['2001'] } },
        requirePublic: true,
        enrollmentCourseId: COURSE_A,
      }),
      400,
    )
  })

  it('rejects a Tenant B SARI id even without a session UUID (P0)', async () => {
    await expectReject(
      () => assertCustomSessionsForTenant({
        supabase,
        tenantId: TENANT_A,
        customSessions: { '2': { sariSessionIds: ['2001'] } },
        requirePublic: true,
        enrollmentCourseId: COURSE_A,
      }),
      400,
    )
  })

  it('rejects a private-course session on a public enrollment (P1)', async () => {
    await expectReject(
      () => assertCustomSessionsForTenant({
        supabase,
        tenantId: TENANT_A,
        customSessions: { '2': { sessionId: SESS_PRIV, courseId: COURSE_PRIV } },
        requirePublic: true,
        enrollmentCourseId: COURSE_A,
      }),
      400,
    )
  })

  it('rejects courseId that does not match the session row', async () => {
    await expectReject(
      () => assertCustomSessionsForTenant({
        supabase,
        tenantId: TENANT_A,
        customSessions: { '2': { sessionId: SESS_A, courseId: COURSE_A2 } },
        requirePublic: true,
        enrollmentCourseId: COURSE_A,
      }),
      400,
    )
  })

  it('allows a same-tenant public session from another course (available-sessions swap)', async () => {
    const result = await assertCustomSessionsForTenant({
      supabase,
      tenantId: TENANT_A,
      customSessions: {
        '2': { sessionId: SESS_A2, courseId: COURSE_A2, sariSessionIds: ['1002'] },
      },
      requirePublic: true,
      enrollmentCourseId: COURSE_A,
    })
    expect(result.sanitized?.['2']?.sessionId).toBe(SESS_A2)
    expect(result.sanitized?.['2']?.sariSessionIds).toEqual(['1002'])
    expect(result.sessions[0].tenant_id).toBe(TENANT_A)
  })

  it('rejects an empty custom-session entry with no ids', async () => {
    await expectReject(
      () => assertCustomSessionsForTenant({
        supabase,
        tenantId: TENANT_A,
        customSessions: { '1': {} },
        requirePublic: true,
        enrollmentCourseId: COURSE_A,
      }),
      400,
    )
  })

  it('rejects a malformed enrollmentCourseId', async () => {
    await expectReject(
      () => assertCustomSessionsForTenant({
        supabase,
        tenantId: TENANT_A,
        customSessions: { '1': { sessionId: SESS_A } },
        requirePublic: true,
        enrollmentCourseId: 'not-a-uuid',
      }),
      400,
    )
  })

  it('overwrites client SARI ids with the database value', async () => {
    const result = await assertCustomSessionsForTenant({
      supabase,
      tenantId: TENANT_A,
      customSessions: {
        '1': { sessionId: SESS_A, courseId: COURSE_A, sariSessionIds: ['1001'] },
      },
      requirePublic: true,
      enrollmentCourseId: COURSE_A,
    })
    expect(result.sanitized?.['1']?.sariSessionId).toBe('1001')
  })
})

describe('loadPublicCourseForEnrollment', () => {
  it('rejects a private course with 404 (no oracle)', async () => {
    await expectReject(
      () => loadPublicCourseForEnrollment(makeSupabase(sessionTables), COURSE_PRIV, TENANT_A),
      404,
    )
  })

  it('rejects a tenant mismatch with 404', async () => {
    await expectReject(
      () => loadPublicCourseForEnrollment(makeSupabase(sessionTables), COURSE_A, TENANT_B),
      404,
    )
  })

  it('returns the course and authoritative tenant for a public course', async () => {
    const course = await loadPublicCourseForEnrollment(
      makeSupabase(sessionTables),
      COURSE_A,
      TENANT_A,
    )
    expect(course.tenant_id).toBe(TENANT_A)
    expect(course.is_public).toBe(true)
  })

  it('ignores a missing client tenantId and still uses the course tenant', async () => {
    const course = await loadPublicCourseForEnrollment(
      makeSupabase(sessionTables),
      COURSE_A,
    )
    expect(course.tenant_id).toBe(TENANT_A)
  })

  it('only treats active/scheduled as enrollable', () => {
    expect(PUBLIC_ENROLLABLE_STATUSES).toEqual(['active', 'scheduled'])
  })
})

describe('source contracts — P0/P1 gates', () => {
  it('enroll-cash derives tenant from the public course and validates custom sessions', () => {
    const cash = src('server/api/courses/enroll-cash.post.ts')
    expect(cash).toContain('loadPublicCourseForEnrollment')
    expect(cash).toContain('assertCustomSessionsForTenant')
    expect(cash).toContain('requirePublic: true')
    expect(cash).toContain('const tenantId = course.tenant_id')
    expect(cash).not.toMatch(/\.eq\('id',\s*courseId\)\s*\n\s*\.eq\('tenant_id',\s*tenantId\)/)
  })

  it('enroll-wallee derives tenant from the public course and validates custom sessions', () => {
    const wallee = src('server/api/courses/enroll-wallee.post.ts')
    expect(wallee).toContain('loadPublicCourseForEnrollment')
    expect(wallee).toContain('assertCustomSessionsForTenant')
    expect(wallee).toContain('requirePublic: true')
    expect(wallee).toContain('const tenantId = course.tenant_id')
  })

  it('process-public requires is_public and validates custom_sessions before Wallee', () => {
    const pay = src('server/api/payments/process-public.post.ts')
    expect(pay).toContain(".eq('is_public', true)")
    expect(pay).toContain("enrollment.courses?.is_public !== true")
    expect(pay).toContain('courseSessionsEmbed')
    expect(pay).toContain('assertCustomSessionsForTenant')
  })

  it('available-sessions requires admin auth and rejects a foreign tenantId', () => {
    const available = src('server/api/courses/available-sessions.get.ts')
    expect(available).toContain('requireAdminProfile')
    expect(available).toContain("statusCode: 403")
    expect(available).toContain('profile.tenant_id')
    expect(available).toContain(".eq('is_public', true)")
    expect(available).toContain('courseSessionsEmbed')
    expect(available).not.toMatch(/const isAdmin = admin === 'true'/)
  })

  it('transfer-targets excludes private courses', () => {
    const transfer = src('server/api/courses/transfer-targets.get.ts')
    expect(transfer).toContain(".eq('is_public', true)")
    expect(transfer).toContain('userRecord.tenant_id')
  })

  it('upcoming registrations are tenant-scoped and allowlisted', () => {
    const upcoming = src('server/api/customer/upcoming-course-registrations.get.ts')
    expect(upcoming).toContain('user.tenant_id')
    expect(upcoming).toContain(".eq('tenant_id', tenantId)")
    expect(upcoming).toContain('CUSTOMER_REGISTRATION_COLUMNS')
    expect(upcoming).not.toMatch(/\.select\('\*'\)/)
    expect(upcoming).not.toMatch(/\.\.\.reg/)
    expect(upcoming).not.toContain('sari_faberid')
    expect(upcoming).not.toContain('license_number')
  })

  it('public catalog qualifies course_sessions and filters is_public', () => {
    const pub = src('server/api/courses/public.get.ts')
    expect(pub).toContain('courseSessionsEmbed')
    expect(pub).toContain(".eq('is_public', true)")
    const category = src('pages/courses/category/[category].vue')
    expect(category).toContain('course_sessions!course_sessions_course_id_fkey')
    expect(category).toContain(".eq('is_public', true)")
  })

  it('wallee webhook qualifies course_sessions and re-validates custom sessions', () => {
    const hook = src('server/api/wallee/webhook.post.ts')
    expect(hook).toContain('course_sessions!course_sessions_course_id_fkey')
    expect(hook).toContain('assertCustomSessionsForTenant')
    expect(hook).toContain(".eq('tenant_id', payment.tenant_id)")
    expect(hook).toContain('course.tenant_id !== registration.tenant_id')
  })
})

describe('unenroll-student remains out of this slice', () => {
  it('is unchanged as a SARI path (not part of Course HTTP P0/P1)', () => {
    const unenroll = src('server/api/sari/unenroll-student.post.ts')
    expect(unenroll).toContain("course_sessions(sari_session_id)")
  })
})
