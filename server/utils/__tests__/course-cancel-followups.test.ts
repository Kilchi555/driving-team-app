/**
 * Staff / SARI recovery semantics for course cancellation follow-ups.
 * In-memory fakes only — never touches staging or production.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CourseCancelResult } from '../cancel-course'
import {
  classifySariCancelRegistration,
  runCourseCancelFollowUps,
} from '../course-cancel-followups'
import { deleteStaffCourseAppointments } from '../course-staff-notifications'

const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OTHER_TENANT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const COURSE = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const STAFF = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const REG1 = '11111111-1111-4111-8111-111111111111'
const APPT1 = '99999999-9999-4999-8999-999999999999'
const APPT_OTHER = '88888888-8888-4888-8888-888888888888'

const unenrollMock = vi.fn()
const notifyStaffMock = vi.fn()

vi.mock('~/utils/sariClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/sariClient')>()
  return {
    ...actual,
    SARIClient: class {
      unenrollStudent = (...args: unknown[]) => unenrollMock(...args)
    },
  }
})

vi.mock('~/server/utils/get-tenant-secrets-secure', () => ({
  getTenantSecretsSecure: vi.fn(async () => ({
    SARI_CLIENT_ID: 'id',
    SARI_CLIENT_SECRET: 'secret',
    SARI_USERNAME: 'user',
    SARI_PASSWORD: 'pass',
  })),
}))

vi.mock('~/server/utils/course-staff-notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/course-staff-notifications')>()
  return {
    ...actual,
    notifyStaffCourseCancelled: (...args: unknown[]) => notifyStaffMock(...args),
  }
})

type Row = Record<string, unknown>

function makeStore(tables: Record<string, Row[]>) {
  return Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.map((r) => ({ ...r }))]))
}

function makeFakeSupabase(
  store: Record<string, Row[]>,
  opts: { failDeleteAppointments?: boolean } = {},
): SupabaseClient {
  function from(table: string) {
    const filters: Array<(r: Row) => boolean> = []
    let pendingUpdate: Row | null = null
    let pendingDelete = false
    let notStaffNull = false

    type QueryBuilder = {
      select: () => QueryBuilder
      eq: (col: string, val: unknown) => QueryBuilder
      in: (col: string, vals: unknown[]) => QueryBuilder
      not: (col: string, op: string, val: unknown) => QueryBuilder
      is: (col: string, val: null) => QueryBuilder
      order: () => QueryBuilder
      limit: () => QueryBuilder
      update: (payload: Row) => QueryBuilder
      delete: () => QueryBuilder
      insert: (payload: Row | Row[]) => Promise<{ data: null; error: null }>
      maybeSingle: () => Promise<{ data: Row | null; error: null }>
      then: (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) => Promise<unknown>
    }

    const builder: QueryBuilder = {
      select() { return builder },
      eq(col: string, val: unknown) {
        filters.push((r) => r[col] === val || String(r[col]) === String(val))
        return builder
      },
      in(col: string, vals: unknown[]) {
        filters.push((r) => vals.some((v) => r[col] === v || String(r[col]) === String(v)))
        return builder
      },
      not(col: string, op: string, val: unknown) {
        if (col === 'staff_id' && op === 'is' && val === null) notStaffNull = true
        return builder
      },
      is(col: string, _val: null) {
        filters.push((r) => r[col] == null)
        return builder
      },
      order() { return builder },
      limit() { return builder },
      update(payload: Row) {
        pendingUpdate = payload
        return builder
      },
      delete() {
        pendingDelete = true
        return builder
      },
      insert(payload: Row | Row[]) {
        const rows = Array.isArray(payload) ? payload : [payload]
        store[table] = store[table] || []
        for (const row of rows) store[table].push({ id: row.id || crypto.randomUUID(), ...row })
        return Promise.resolve({ data: null, error: null })
      },
      maybeSingle: async () => {
        const rows = applyFilters()
        return { data: rows[0] || null, error: null }
      },
      then(resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) {
        if (pendingDelete) {
          if (table === 'appointments' && opts.failDeleteAppointments) {
            pendingDelete = false
            return Promise.resolve({
              data: null,
              error: { message: 'appointment delete failed' },
            }).then(resolve, reject)
          }
          const deleted: Row[] = []
          store[table] = (store[table] || []).filter((r) => {
            if (filters.every((f) => f(r))) {
              deleted.push(r)
              return false
            }
            return true
          })
          pendingDelete = false
          return Promise.resolve({ data: deleted, error: null }).then(resolve, reject)
        }
        if (pendingUpdate) {
          const updated: Row[] = []
          store[table] = (store[table] || []).map((r) => {
            if (filters.every((f) => f(r))) {
              const next = { ...r, ...pendingUpdate }
              updated.push(next)
              return next
            }
            return r
          })
          pendingUpdate = null
          return Promise.resolve({ data: updated, error: null }).then(resolve, reject)
        }
        return Promise.resolve({ data: applyFilters(), error: null }).then(resolve, reject)
      },
    }

    function applyFilters() {
      return (store[table] || []).filter((r) => {
        if (notStaffNull && r.staff_id == null) return false
        return filters.every((f) => f(r))
      })
    }

    return builder
  }

  return { from } as unknown as SupabaseClient
}

function baseCancelResult(overrides: Partial<CourseCancelResult> = {}): CourseCancelResult {
  return {
    success: true,
    complete: true,
    courseId: COURSE,
    tenantId: TENANT,
    database: {
      courseId: COURSE,
      tenantId: TENANT,
      alreadyCancelled: false,
      registrationIds: [REG1],
      paymentIdsCancelled: [],
      paymentIdsSkippedPaid: [],
      invoiceIdsCancelled: [],
      invoiceIdsSkippedPaid: [],
      roomBookingIds: [],
      vehicleBookingIds: [],
      path: 'rpc',
      resources: { ok: true, roomBookingIds: [], vehicleBookingIds: [], errors: [] },
    },
    emails: { requested: false, queued: 0, skippedDuplicate: 0, skippedNoEmail: 0, errors: [] },
    resources: { ok: true, roomBookingIds: [], vehicleBookingIds: [], errors: [] },
    manualReviewRequired: [],
    warnings: [],
    auditId: null,
    ...overrides,
  }
}

describe('classifySariCancelRegistration', () => {
  it('recognizes durable synced state after membership wipe', () => {
    expect(classifySariCancelRegistration({
      faberid: '7181751',
      paymentMethod: 'online',
      membershipCount: 0,
      sariSynced: true,
    })).toBe('already_completed')
  })

  it('does not invent confirmed/unresolved when synced is false and memberships empty', () => {
    expect(classifySariCancelRegistration({
      faberid: '7181751',
      paymentMethod: 'online',
      membershipCount: 0,
      sariSynced: false,
    })).toBe('unresolved')
  })

  it('pending when memberships remain', () => {
    expect(classifySariCancelRegistration({
      faberid: '7181751',
      paymentMethod: 'online',
      membershipCount: 1,
      sariSynced: false,
    })).toBe('pending_unenroll')
  })
})

describe('deleteStaffCourseAppointments tenant isolation', () => {
  it('deletes only matching tenant appointments and reports failure honestly', async () => {
    const store = makeStore({
      appointments: [
        { id: APPT1, staff_id: STAFF, notes: `course:${COURSE}`, tenant_id: TENANT },
        { id: APPT_OTHER, staff_id: STAFF, notes: `course:${COURSE}`, tenant_id: OTHER_TENANT },
      ],
    })
    const supabase = makeFakeSupabase(store)
    const ok = await deleteStaffCourseAppointments(supabase, STAFF, COURSE, TENANT)
    expect(ok.ok).toBe(true)
    expect(ok.deletedIds).toEqual([APPT1])
    expect(store.appointments.map((a) => a.id)).toEqual([APPT_OTHER])

    const missingTenant = await deleteStaffCourseAppointments(supabase, STAFF, COURSE, '')
    expect(missingTenant.ok).toBe(false)
    expect(missingTenant.deletedIds).toEqual([])
  })

  it('returns ok:false when delete errors', async () => {
    const store = makeStore({
      appointments: [
        { id: APPT1, staff_id: STAFF, notes: `course:${COURSE}`, tenant_id: TENANT },
      ],
    })
    const supabase = makeFakeSupabase(store, { failDeleteAppointments: true })
    const result = await deleteStaffCourseAppointments(supabase, STAFF, COURSE, TENANT)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/appointment delete failed/)
    expect(store.appointments).toHaveLength(1)
  })
})

describe('runCourseCancelFollowUps staff honesty', () => {
  beforeEach(() => {
    unenrollMock.mockReset()
    notifyStaffMock.mockReset()
  })

  it('staff delete failure → staff.ok false, complete false, actionable warning', async () => {
    const store = makeStore({
      course_sessions: [
        { id: 's1', course_id: COURSE, tenant_id: TENANT, staff_id: STAFF, start_time: '2026-10-01T08:00:00Z', end_time: '2026-10-01T09:00:00Z' },
      ],
      courses: [
        { id: COURSE, tenant_id: TENANT, name: 'Test', sari_managed: false, tenants: { sari_enabled: false } },
      ],
      appointments: [
        { id: APPT1, staff_id: STAFF, notes: `course:${COURSE}`, tenant_id: TENANT },
      ],
    })
    const supabase = makeFakeSupabase(store, { failDeleteAppointments: true })
    const result = await runCourseCancelFollowUps({
      supabase,
      tenantId: TENANT,
      courseId: COURSE,
      notifyStaff: true,
      cancelResult: baseCancelResult(),
    })
    expect(result.staff.ok).toBe(false)
    expect(result.staff.instructorsCleared).toBe(0)
    expect(result.staff.notified).toBe(0)
    expect(result.complete).toBe(false)
    expect(result.warnings.some((w) => /Staff-Kalender|appointment delete failed/i.test(w))).toBe(true)
    expect(notifyStaffMock).not.toHaveBeenCalled()
  })

  it('staff deletion retry removes remaining appointments and completes', async () => {
    const store = makeStore({
      course_sessions: [
        { id: 's1', course_id: COURSE, tenant_id: TENANT, staff_id: STAFF, start_time: '2026-10-01T08:00:00Z', end_time: '2026-10-01T09:00:00Z' },
      ],
      courses: [
        { id: COURSE, tenant_id: TENANT, name: 'Test', sari_managed: false, tenants: { sari_enabled: false } },
      ],
      appointments: [
        { id: APPT1, staff_id: STAFF, notes: `course:${COURSE}`, tenant_id: TENANT },
      ],
    })
    const failing = makeFakeSupabase(store, { failDeleteAppointments: true })
    const first = await runCourseCancelFollowUps({
      supabase: failing,
      tenantId: TENANT,
      courseId: COURSE,
      notifyStaff: false,
      cancelResult: baseCancelResult(),
    })
    expect(first.complete).toBe(false)
    expect(store.appointments).toHaveLength(1)

    const okClient = makeFakeSupabase(store)
    const second = await runCourseCancelFollowUps({
      supabase: okClient,
      tenantId: TENANT,
      courseId: COURSE,
      notifyStaff: false,
      cancelResult: baseCancelResult(),
    })
    expect(second.staff.ok).toBe(true)
    expect(second.staff.instructorsCleared).toBe(1)
    expect(second.complete).toBe(true)
    expect(store.appointments).toHaveLength(0)

    // Third retry: nothing left → still complete, no notify when notifyStaff false
    const third = await runCourseCancelFollowUps({
      supabase: okClient,
      tenantId: TENANT,
      courseId: COURSE,
      notifyStaff: true,
      cancelResult: baseCancelResult(),
    })
    expect(third.complete).toBe(true)
    expect(third.staff.notified).toBe(0)
    expect(notifyStaffMock).not.toHaveBeenCalled()
  })
})

describe('runCourseCancelFollowUps SARI retry', () => {
  beforeEach(() => {
    unenrollMock.mockReset()
    notifyStaffMock.mockReset()
  })

  it('successful unenroll + membership wipe → retry recognizes already_completed', async () => {
    const store = makeStore({
      course_sessions: [],
      courses: [
        {
          id: COURSE,
          tenant_id: TENANT,
          name: 'SARI Course',
          sari_managed: true,
          tenants: { sari_enabled: true, sari_environment: 'test' },
        },
      ],
      appointments: [],
      course_registrations: [
        {
          id: REG1,
          course_id: COURSE,
          tenant_id: TENANT,
          status: 'cancelled',
          deleted_at: null,
          payment_method: 'online',
          sari_faberid: '7181751',
          sari_synced: false,
          users: { id: 'u1', faberid: '7181751' },
        },
      ],
      registration_sari_memberships: [
        {
          id: 'm1',
          tenant_id: TENANT,
          registration_id: REG1,
          sari_session_id: 2110027,
          status: 'confirmed',
        },
      ],
      sari_sync_logs: [],
    })

    unenrollMock.mockResolvedValueOnce(undefined)
    const supabase = makeFakeSupabase(store)
    const first = await runCourseCancelFollowUps({
      supabase,
      tenantId: TENANT,
      courseId: COURSE,
      cancelResult: baseCancelResult(),
    })
    expect(first.sari?.ok).toBe(true)
    expect(first.sari?.unenrolled).toBe(1)
    expect(first.complete).toBe(true)
    expect(unenrollMock).toHaveBeenCalledTimes(1)
    expect(store.registration_sari_memberships).toHaveLength(0)
    expect(store.course_registrations[0].sari_synced).toBe(true)

    const second = await runCourseCancelFollowUps({
      supabase,
      tenantId: TENANT,
      courseId: COURSE,
      cancelResult: baseCancelResult(),
    })
    expect(second.sari?.ok).toBe(true)
    expect(second.sari?.alreadyCompleted).toBe(1)
    expect(second.sari?.unresolved).toBe(0)
    expect(second.complete).toBe(true)
    expect(unenrollMock).toHaveBeenCalledTimes(1)
  })

  it('SARI external failure → not complete', async () => {
    const store = makeStore({
      course_sessions: [],
      courses: [
        {
          id: COURSE,
          tenant_id: TENANT,
          name: 'SARI Course',
          sari_managed: true,
          tenants: { sari_enabled: true, sari_environment: 'test' },
        },
      ],
      appointments: [],
      course_registrations: [
        {
          id: REG1,
          course_id: COURSE,
          tenant_id: TENANT,
          status: 'cancelled',
          deleted_at: null,
          payment_method: 'online',
          sari_faberid: '7181751',
          sari_synced: false,
          users: { id: 'u1', faberid: '7181751' },
        },
      ],
      registration_sari_memberships: [
        {
          id: 'm1',
          tenant_id: TENANT,
          registration_id: REG1,
          sari_session_id: 2110027,
          status: 'confirmed',
        },
      ],
      sari_sync_logs: [],
    })
    unenrollMock.mockRejectedValueOnce(new Error('SARI 500 boom'))
    const supabase = makeFakeSupabase(store)
    const result = await runCourseCancelFollowUps({
      supabase,
      tenantId: TENANT,
      courseId: COURSE,
      cancelResult: baseCancelResult(),
    })
    expect(result.sari?.ok).toBe(false)
    expect(result.sari?.failed).toBe(1)
    expect(result.complete).toBe(false)
    expect(store.registration_sari_memberships).toHaveLength(1)
    expect(store.course_registrations[0].sari_synced).toBe(false)
  })

  it('mixed staff failure + SARI success → complete false', async () => {
    const store = makeStore({
      course_sessions: [
        { id: 's1', course_id: COURSE, tenant_id: TENANT, staff_id: STAFF, start_time: '2026-10-01T08:00:00Z', end_time: '2026-10-01T09:00:00Z' },
      ],
      courses: [
        {
          id: COURSE,
          tenant_id: TENANT,
          name: 'SARI Course',
          sari_managed: true,
          tenants: { sari_enabled: true, sari_environment: 'test' },
        },
      ],
      appointments: [
        { id: APPT1, staff_id: STAFF, notes: `course:${COURSE}`, tenant_id: TENANT },
      ],
      course_registrations: [
        {
          id: REG1,
          course_id: COURSE,
          tenant_id: TENANT,
          status: 'cancelled',
          deleted_at: null,
          payment_method: 'online',
          sari_faberid: '7181751',
          sari_synced: true,
          users: { id: 'u1', faberid: '7181751' },
        },
      ],
      registration_sari_memberships: [],
      sari_sync_logs: [],
    })
    const supabase = makeFakeSupabase(store, { failDeleteAppointments: true })
    const result = await runCourseCancelFollowUps({
      supabase,
      tenantId: TENANT,
      courseId: COURSE,
      cancelResult: baseCancelResult(),
    })
    expect(result.staff.ok).toBe(false)
    expect(result.sari?.ok).toBe(true)
    expect(result.sari?.alreadyCompleted).toBe(1)
    expect(result.complete).toBe(false)
  })
})

describe('API entry-point contracts for honest follow-up responses', () => {
  it('cancel-course and update-status expose complete/staff/sari from cancelCourseWithFollowUps', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const cancelApi = readFileSync(resolve(process.cwd(), 'server/api/admin/courses/cancel-course.post.ts'), 'utf8')
    const updateApi = readFileSync(resolve(process.cwd(), 'server/api/courses/update-status.post.ts'), 'utf8')
    expect(cancelApi).toContain('cancelCourseWithFollowUps')
    expect(cancelApi).toContain('complete')
    expect(cancelApi).toContain('alreadyCompleted')
    expect(cancelApi).toMatch(/staff:\s*\{/)
    expect(updateApi).toContain('cancelCourseWithFollowUps')
    expect(updateApi).toContain('complete')
    expect(updateApi).toContain('followUps.staff')
    expect(updateApi).toContain('followUps.sari')
  })
})
