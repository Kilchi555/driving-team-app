import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SARIClient } from '~/utils/sariClient'

const TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OTHER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const SESSION = '11111111-1111-4111-8111-111111111111'
const STUDENT = '22222222-2222-4222-8222-222222222222'
const COURSE = '33333333-3333-4333-8333-333333333333'
const FOREIGN_COURSE = '44444444-4444-4444-8444-444444444444'
const REGISTRATION = '55555555-5555-4555-8555-555555555555'

const mocks = vi.hoisted(() => ({
  body: {} as Record<string, unknown>,
  enrollStudent: vi.fn(async () => undefined),
  unenrollStudent: vi.fn(async () => undefined),
  getCourseDetail: vi.fn(async () => []),
  startImport: vi.fn(async () => ({ importedFaberIds: [], warnings: [], errors: [] })),
  deleteCourse: vi.fn(async () => true),
  genConfirmation: vi.fn(async () => ({
    faberIds: [],
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
    isBinary: true,
    data: '',
  })),
  createClientForType: vi.fn(),
  getTenantSecretsSecure: vi.fn(async () => ({
    SARI_CLIENT_ID: 'id',
    SARI_CLIENT_SECRET: 'secret',
    SARI_USERNAME: 'user',
    SARI_PASSWORD: 'pass',
  })),
}))

const state = {
  sessionTenant: TENANT,
  registrationCourseTenant: TENANT,
  inserts: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  updates: [] as Array<{ table: string; payload: unknown; filters: Record<string, unknown> }>,
}

function from(table: string) {
  const filters: Record<string, unknown> = {}
  let op = 'select'
  let payload: unknown

  const run = async () => {
    if (op === 'insert') {
      state.inserts.push({ table, payload: payload as Record<string, unknown> })
      return { data: { id: 'reg-1' }, error: null }
    }
    if (op === 'update') {
      state.updates.push({ table, payload, filters: { ...filters } })
      return { data: null, error: null }
    }

    if (table === 'users' && filters.auth_user_id) {
      return {
        data: { id: 'user-1', tenant_id: TENANT, role: 'admin', auth_user_id: 'auth-1' },
        error: null,
      }
    }
    if (table === 'users') {
      if (filters.id === STUDENT && filters.tenant_id === TENANT) {
        return {
          data: {
            id: STUDENT,
            faberid: 'FABER1',
            birthdate: '2000-01-02',
            first_name: 'Ada',
            last_name: 'Admin',
            tenant_id: TENANT,
          },
          error: null,
        }
      }
      return { data: null, error: { message: 'not found' } }
    }
    if (table === 'course_registrations' && op === 'select') {
      if (filters.id !== REGISTRATION || filters.tenant_id !== TENANT) {
        return { data: null, error: { message: 'not found' } }
      }
      const courseTenant = state.registrationCourseTenant
      return {
        data: {
          course_id: courseTenant === TENANT ? COURSE : FOREIGN_COURSE,
          courses: {
            tenant_id: courseTenant,
            sari_managed: true,
            sari_course_id: '2110027',
          },
          course_sessions: { sari_session_id: '2110027' },
        },
        error: null,
      }
    }
    if (table === 'course_sessions') {
      if (filters.id !== SESSION) return { data: null, error: { message: 'not found' } }
      return {
        data: {
          id: SESSION,
          course_id: COURSE,
          sari_session_id: '2110027',
          course: {
            id: COURSE,
            sari_course_id: 'GROUP_2110027',
            sari_managed: true,
            tenant_id: state.sessionTenant,
          },
        },
        error: null,
      }
    }
    if (table === 'courses') {
      if (filters.id === COURSE && filters.tenant_id === TENANT) {
        return {
          data: {
            id: COURSE,
            name: 'VKU',
            sari_course_id: 'GROUP_2110027',
            tenant_id: TENANT,
            course_sessions: [{ id: SESSION, sari_session_id: '2110027' }],
          },
          error: null,
        }
      }
      return { data: null, error: null }
    }
    if (table === 'tenants') {
      return { data: { sari_enabled: true, sari_environment: 'test' }, error: null }
    }
    return { data: null, error: { message: `unexpected ${table}` } }
  }

  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.insert = vi.fn((value: unknown) => {
    op = 'insert'
    payload = value
    return builder
  })
  builder.update = vi.fn((value: unknown) => {
    op = 'update'
    payload = value
    return builder
  })
  builder.eq = vi.fn((column: string, value: unknown) => {
    filters[column] = value
    return builder
  })
  builder.is = vi.fn(chain)
  builder.throwOnError = vi.fn(chain)
  builder.maybeSingle = vi.fn(() => run())
  builder.single = vi.fn(() => run())
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(run()).then(resolve, reject)
  return builder
}

const db = () => ({ from })

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: async () => mocks.body,
    getHeader: () => null,
  }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => db(),
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => db(),
}))

vi.mock('~/utils/supabase', () => ({
  getSupabaseServerWithSession: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'auth-1' } }, error: null }),
    },
    from,
  }),
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: async () => ({ id: 'auth-1' }),
}))

vi.mock('~/server/utils/sari-rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/sari-rate-limit')>()
  return {
    ...actual,
    checkSARIRateLimit: async () => ({ allowed: true, retryAfter: 0 }),
  }
})

vi.mock('~/server/utils/get-tenant-secrets-secure', () => ({
  getTenantSecretsSecure: mocks.getTenantSecretsSecure,
}))

vi.mock('~/server/utils/audit', () => ({
  logAudit: async () => undefined,
}))

vi.mock('~/server/utils/ip-utils', () => ({
  getClientIP: () => '203.0.113.10',
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('~/utils/sariClient', () => ({
  SARIClient: vi.fn().mockImplementation(() => ({
    enrollStudent: mocks.enrollStudent,
    unenrollStudent: mocks.unenrollStudent,
    getCourseDetail: mocks.getCourseDetail,
    getCustomer: vi.fn(async () => ({})),
  })),
  isSariUnenrollIdempotent: () => false,
  isSariUnenrollBlocked: () => false,
  getSariUnenrollBlockedMessage: () => 'blocked',
}))

vi.mock('~/server/utils/sari-czv-fl-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/sari-czv-fl-engine')>()
  return {
    ...actual,
    createClientForType: (...args: unknown[]) => mocks.createClientForType(...args),
  }
})

type Handler = (event: unknown) => Promise<{ success?: boolean; message?: string }>

const handlers: {
  enroll?: Handler
  unenroll?: Handler
  startImport?: Handler
  deleteCourse?: Handler
  genConfirmation?: Handler
  sync?: Handler
} = {}

beforeAll(async () => {
  handlers.enroll = (await import('~/server/api/sari/enroll-student.post')).default as Handler
  handlers.unenroll = (await import('~/server/api/sari/unenroll-student.post')).default as Handler
  handlers.startImport = (await import('~/server/api/sari/czv/start-import.post')).default as Handler
  handlers.deleteCourse = (await import('~/server/api/sari/czv/delete-course.post')).default as Handler
  handlers.genConfirmation = (await import('~/server/api/sari/czv/gen-confirmation.post')).default as Handler
  handlers.sync = (await import('~/server/api/sari/sync-participants.post')).default as Handler
})

beforeEach(() => {
  mocks.body = {}
  state.sessionTenant = TENANT
  state.registrationCourseTenant = TENANT
  state.inserts = []
  state.updates = []
  mocks.enrollStudent.mockClear()
  mocks.unenrollStudent.mockClear()
  mocks.getCourseDetail.mockClear()
  mocks.startImport.mockClear()
  mocks.deleteCourse.mockClear()
  mocks.genConfirmation.mockClear()
  mocks.createClientForType.mockReset()
  mocks.createClientForType.mockImplementation(async () => ({
    startImport: mocks.startImport,
    deleteCourse: mocks.deleteCourse,
    genConfirmation: mocks.genConfirmation,
  }))
  mocks.getTenantSecretsSecure.mockClear()
  vi.mocked(SARIClient).mockClear()
})

const courseData = {
  description: 'Kurs',
  date: '2027-06-01',
  sariCourseType: 'CZV',
  location: 'Zürich',
  address: 'Strasse 1',
  zip: '8000',
  members: [],
  instructors: [],
}

describe('enroll-student tenant boundary', () => {
  it('enrolls a session owned by the authenticated tenant', async () => {
    mocks.body = { courseSessionId: SESSION, studentId: STUDENT, tenant_id: OTHER }
    const result = await handlers.enroll!({})
    expect(result.success).toBe(true)
    expect(mocks.enrollStudent).toHaveBeenCalledTimes(1)
    expect(mocks.getTenantSecretsSecure).toHaveBeenCalledWith(
      TENANT,
      expect.any(Array),
      'SARI_ENROLLMENT',
    )
    expect(state.inserts).toHaveLength(1)
    expect(state.inserts[0]?.payload.tenant_id).toBe(TENANT)
    expect(JSON.stringify(state.inserts)).not.toContain(OTHER)
  })

  it('blocks a foreign session before SARI and before the registration insert', async () => {
    state.sessionTenant = OTHER
    mocks.body = { courseSessionId: SESSION, studentId: STUDENT, tenant_id: TENANT }
    await expect(handlers.enroll!({})).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Course session not found',
    })
    expect(mocks.enrollStudent).not.toHaveBeenCalled()
    expect(mocks.getTenantSecretsSecure).not.toHaveBeenCalled()
    expect(state.inserts).toHaveLength(0)
  })
})

describe('unenroll-student tenant boundary', () => {
  it('unenrolls a session owned by the authenticated tenant and scopes the registration update', async () => {
    mocks.body = { courseSessionId: SESSION, studentId: STUDENT, tenant_id: OTHER }
    const result = await handlers.unenroll!({})
    expect(result.success).toBe(true)
    expect(mocks.unenrollStudent).toHaveBeenCalledTimes(1)
    expect(mocks.getTenantSecretsSecure).toHaveBeenCalledWith(
      TENANT,
      expect.any(Array),
      'SARI_UNENROLL',
    )
    expect(state.updates).toHaveLength(1)
    expect(state.updates[0]?.filters).toMatchObject({
      course_id: COURSE,
      user_id: STUDENT,
      tenant_id: TENANT,
    })
    expect(state.updates[0]?.filters.tenant_id).not.toBe(OTHER)
  })

  it('blocks a foreign session before SARI and before the registration update', async () => {
    state.sessionTenant = OTHER
    mocks.body = { courseSessionId: SESSION, studentId: STUDENT }
    await expect(handlers.unenroll!({})).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Course session not found',
    })
    expect(mocks.unenrollStudent).not.toHaveBeenCalled()
    expect(mocks.getTenantSecretsSecure).not.toHaveBeenCalled()
    expect(state.updates).toHaveLength(0)
  })

  it('unenrolls a registration whose course belongs to the authenticated tenant', async () => {
    mocks.body = { registrationId: REGISTRATION, studentId: STUDENT, tenant_id: OTHER }
    const result = await handlers.unenroll!({})
    expect(result.success).toBe(true)
    expect(mocks.unenrollStudent).toHaveBeenCalledTimes(1)
    expect(mocks.unenrollStudent).toHaveBeenCalledWith(2110027, 'FABER1')
    expect(mocks.getTenantSecretsSecure).toHaveBeenCalledWith(
      TENANT,
      expect.any(Array),
      'SARI_UNENROLL',
    )
    expect(state.updates).toHaveLength(1)
    expect(state.updates[0]?.filters).toMatchObject({
      course_id: COURSE,
      user_id: STUDENT,
      tenant_id: TENANT,
    })
  })

  it('blocks a registration whose joined course belongs to another tenant before SARI', async () => {
    state.registrationCourseTenant = OTHER
    mocks.body = { registrationId: REGISTRATION, studentId: STUDENT, tenant_id: TENANT }
    await expect(handlers.unenroll!({})).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Registration not found',
    })
    expect(mocks.unenrollStudent).not.toHaveBeenCalled()
    expect(mocks.getTenantSecretsSecure).not.toHaveBeenCalled()
    expect(vi.mocked(SARIClient)).not.toHaveBeenCalled()
    expect(state.updates).toHaveLength(0)
  })
})

describe('CZV and FL course ownership', () => {
  it.each(['CZV', 'FL'] as const)('imports an owned %s course and refuses a foreign course first', async (type) => {
    mocks.body = { type, courseId: COURSE, courseData, tenant_id: OTHER }
    const result = await handlers.startImport!({})
    expect(result.success).toBe(true)
    expect(mocks.createClientForType).toHaveBeenCalledWith(TENANT, type, 'test')
    expect(mocks.startImport).toHaveBeenCalledTimes(1)
    expect(state.updates.some((update) => update.table === 'courses' && update.filters.tenant_id === TENANT)).toBe(true)

    mocks.createClientForType.mockClear()
    mocks.startImport.mockClear()
    state.updates = []
    mocks.body = { type, courseId: FOREIGN_COURSE, courseData: { ...courseData, date: '2000-01-01' } }
    await expect(handlers.startImport!({})).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Kurs nicht gefunden',
    })
    expect(mocks.createClientForType).not.toHaveBeenCalled()
    expect(mocks.startImport).not.toHaveBeenCalled()
    expect(state.updates).toHaveLength(0)
  })

  it.each(['CZV', 'FL'] as const)('deletes an owned %s course and refuses a foreign course first', async (type) => {
    mocks.body = { type, courseId: COURSE, courseDate: '2027-06-01', tenant_id: OTHER }
    const result = await handlers.deleteCourse!({})
    expect(result.success).toBe(true)
    expect(mocks.createClientForType).toHaveBeenCalledWith(TENANT, type, 'test')
    expect(mocks.deleteCourse).toHaveBeenCalledTimes(1)

    mocks.createClientForType.mockClear()
    mocks.deleteCourse.mockClear()
    state.updates = []
    mocks.body = { type, courseId: FOREIGN_COURSE, courseDate: '2000-01-01' }
    await expect(handlers.deleteCourse!({})).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Kurs nicht gefunden',
    })
    expect(mocks.createClientForType).not.toHaveBeenCalled()
    expect(mocks.deleteCourse).not.toHaveBeenCalled()
    expect(state.updates).toHaveLength(0)
  })

  it.each(['CZV', 'FL'] as const)('confirms an owned %s course and refuses a foreign course first', async (type) => {
    mocks.body = { type, courseId: COURSE, tenant_id: OTHER }
    const result = await handlers.genConfirmation!({})
    expect(result.success).toBe(true)
    expect(mocks.createClientForType).toHaveBeenCalledWith(TENANT, type, 'test')
    expect(mocks.genConfirmation).toHaveBeenCalledTimes(1)

    mocks.createClientForType.mockClear()
    mocks.genConfirmation.mockClear()
    mocks.body = { type, courseId: FOREIGN_COURSE }
    await expect(handlers.genConfirmation!({})).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Kurs nicht gefunden',
    })
    expect(mocks.createClientForType).not.toHaveBeenCalled()
    expect(mocks.genConfirmation).not.toHaveBeenCalled()
  })
})

describe('sync-participants SARI id boundary', () => {
  it('does not call SARI for an injected foreign course id', async () => {
    mocks.body = { courseId: COURSE, sariCourseIds: [999999], tenant_id: OTHER }
    const result = await handlers.sync!({})
    expect(result).toMatchObject({
      success: false,
      message: 'No SARI course IDs found for this course',
    })
    expect(mocks.getCourseDetail).not.toHaveBeenCalled()
    expect(mocks.getTenantSecretsSecure).not.toHaveBeenCalled()
  })

  it('syncs SARI ids that belong to the authenticated tenant course', async () => {
    mocks.body = { courseId: COURSE, tenant_id: OTHER }
    await handlers.sync!({})
    expect(mocks.getCourseDetail).toHaveBeenCalledTimes(1)
    expect(mocks.getCourseDetail).toHaveBeenCalledWith(2110027)
    expect(mocks.getTenantSecretsSecure).toHaveBeenCalledWith(
      TENANT,
      expect.any(Array),
      'SARI_SYNC_PARTICIPANTS',
    )
  })

  it('keeps owned ids and drops injected ids in the same request', async () => {
    mocks.body = { courseId: COURSE, sariCourseIds: [999999, 2110027, '999998'] }
    await handlers.sync!({})
    expect(mocks.getCourseDetail).toHaveBeenCalledTimes(1)
    expect(mocks.getCourseDetail).toHaveBeenCalledWith(2110027)
  })
})
