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

const OWNED_SESSIONS = [
  {
    id: 'sess-1',
    course_id: COURSE,
    sari_session_id: '2110027',
    session_number: 1,
    tenant_id: TENANT,
    start_time: '2027-06-01T08:00:00.000Z',
  },
  {
    id: 'sess-2',
    course_id: COURSE,
    sari_session_id: '2110028',
    session_number: 2,
    tenant_id: TENANT,
    start_time: '2027-06-02T08:00:00.000Z',
  },
]

const FOREIGN_SESSION = {
  id: 'sess-foreign',
  course_id: COURSE,
  sari_session_id: '9999999',
  session_number: 3,
  tenant_id: OTHER,
  start_time: '2027-06-03T08:00:00.000Z',
}

const state = {
  sessionTenant: TENANT,
  registrationCourseTenant: TENANT,
  registrationQueryError: false,
  injectForeignSession: false,
  registrationSessions: OWNED_SESSIONS.map((row) => ({ ...row })),
  individualSessionNumber: null as number | null,
  partialStartSession: null as number | null,
  registrationPartial: false,
  inserts: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  updates: [] as Array<{ table: string; payload: unknown; filters: Record<string, unknown> }>,
  deletes: [] as Array<{ table: string; filters: Record<string, unknown> }>,
  queries: [] as Array<{ table: string; select: string; filters: Record<string, unknown> }>,
  memberships: [
    {
      id: 'm1',
      tenant_id: TENANT,
      registration_id: REGISTRATION,
      sari_session_id: 2110027,
      course_session_id: SESSION,
      source: 'MANUAL_ENROLLMENT',
    },
    {
      id: 'm2',
      tenant_id: TENANT,
      registration_id: REGISTRATION,
      sari_session_id: 2110028,
      course_session_id: 'sess-2',
      source: 'MANUAL_ENROLLMENT',
    },
  ] as Array<{
    id: string
    tenant_id: string
    registration_id: string
    sari_session_id: number
    course_session_id: string | null
    source: string
  }>,
}

function from(table: string) {
  const filters: Record<string, unknown> = {}
  let op = 'select'
  let payload: unknown
  let select = ''

  const run = async () => {
    if (op === 'select') {
      state.queries.push({ table, select, filters: { ...filters } })
    }
    if (op === 'insert') {
      state.inserts.push({ table, payload: payload as Record<string, unknown> })
      return { data: { id: 'reg-1' }, error: null }
    }
    if (op === 'update') {
      state.updates.push({ table, payload, filters: { ...filters } })
      return { data: null, error: null }
    }
    if (op === 'delete') {
      state.deletes.push({ table, filters: { ...filters } })
      if (table === 'registration_sari_memberships') {
        state.memberships = state.memberships.filter((row) => {
          if (filters.registration_id && row.registration_id !== filters.registration_id) return true
          if (filters.tenant_id && row.tenant_id !== filters.tenant_id) return true
          if (filters.sari_session_id != null && row.sari_session_id !== filters.sari_session_id) return true
          return false
        })
      }
      return { data: null, error: null }
    }
    if (table === 'registration_sari_memberships' && op === 'select') {
      let rows = state.memberships.slice()
      if (filters.tenant_id) rows = rows.filter((row) => row.tenant_id === filters.tenant_id)
      if (filters.registration_id) rows = rows.filter((row) => row.registration_id === filters.registration_id)
      if (filters.course_session_id) rows = rows.filter((row) => row.course_session_id === filters.course_session_id)
      if (Array.isArray(filters.registration_id_in)) {
        rows = rows.filter((row) => (filters.registration_id_in as string[]).includes(row.registration_id))
      }
      return { data: rows, error: null }
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
      if (state.registrationQueryError) {
        return { data: null, error: { code: 'PGRST200', message: 'relationship not found' } }
      }
      const hinted = select.includes('courses!course_registrations_course_id_fkey')
      if (!hinted && !select.includes('courses(')) {
        if (filters.tenant_id && filters.tenant_id !== TENANT) return { data: null, error: null }
        if (filters.user_id && filters.user_id !== STUDENT) return { data: null, error: null }
        if (filters.id && filters.id !== REGISTRATION && filters.id !== 'reg-1') return { data: null, error: null }
        return {
          data: {
            id: filters.id || REGISTRATION,
            tenant_id: TENANT,
            course_id: COURSE,
            user_id: STUDENT,
          },
          error: null,
        }
      }
      const unhintedCourses = /(?:^|,|\s)courses\(/.test(select)
      const embedsSessions = select.includes('course_sessions')
      if (!hinted || unhintedCourses || embedsSessions) {
        return {
          data: null,
          error: {
            code: embedsSessions ? 'PGRST200' : 'PGRST201',
            message: embedsSessions ? 'relationship not found' : 'ambiguous relationship',
          },
        }
      }
      if (filters.id !== REGISTRATION || filters.tenant_id !== TENANT) {
        return { data: null, error: { message: 'not found' } }
      }
      const courseId = state.registrationCourseTenant === TENANT ? COURSE : FOREIGN_COURSE
      return {
        data: {
          course_id: courseId,
          is_partial_enrollment: state.registrationPartial,
          individual_session_number: state.individualSessionNumber,
          partial_start_session: state.partialStartSession,
          custom_sessions: null,
          courses: {
            id: courseId,
            tenant_id: state.registrationCourseTenant,
            sari_managed: true,
            sari_course_id: 'GROUP_2110027_2110028',
          },
        },
        error: null,
      }
    }
    if (table === 'course_sessions') {
      if (filters.id) {
        if (filters.id !== SESSION) return { data: null, error: { message: 'not found' } }
        if (filters.tenant_id && filters.tenant_id !== state.sessionTenant) {
          return { data: null, error: null }
        }
        return {
          data: {
            id: SESSION,
            course_id: COURSE,
            tenant_id: state.sessionTenant,
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
      if (filters.course_id !== COURSE) return { data: [], error: null }
      let rows = state.registrationSessions.filter((row) => row.course_id === filters.course_id)
      if (filters.tenant_id) rows = rows.filter((row) => row.tenant_id === filters.tenant_id)
      if (state.injectForeignSession) rows = [...rows, { ...FOREIGN_SESSION }]
      return { data: rows, error: null }
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
  builder.select = vi.fn((columns: string) => {
    select = columns
    return builder
  })
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
  builder.order = vi.fn(chain)
  builder.limit = vi.fn(chain)
  builder.in = vi.fn((column: string, value: unknown) => {
    filters[`${column}_in`] = value
    return builder
  })
  builder.delete = vi.fn(() => {
    op = 'delete'
    return builder
  })
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

vi.mock('~/utils/sariClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/sariClient')>()
  return {
    ...actual,
    SARIClient: vi.fn().mockImplementation(() => ({
      enrollStudent: mocks.enrollStudent,
      unenrollStudent: mocks.unenrollStudent,
      getCourseDetail: mocks.getCourseDetail,
      getCustomer: vi.fn(async () => ({})),
    })),
  }
})

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
  state.registrationQueryError = false
  state.injectForeignSession = false
  state.registrationSessions = OWNED_SESSIONS.map((row) => ({ ...row }))
  state.individualSessionNumber = null
  state.partialStartSession = null
  state.registrationPartial = false
  state.inserts = []
  state.updates = []
  state.deletes = []
  state.queries = []
  state.memberships = [
    {
      id: 'm1',
      tenant_id: TENANT,
      registration_id: REGISTRATION,
      sari_session_id: 2110027,
      course_session_id: SESSION,
      source: 'MANUAL_ENROLLMENT',
    },
    {
      id: 'm2',
      tenant_id: TENANT,
      registration_id: REGISTRATION,
      sari_session_id: 2110028,
      course_session_id: 'sess-2',
      source: 'MANUAL_ENROLLMENT',
    },
  ]
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
    expect(state.inserts.map((row) => row.table)).toEqual([
      'course_registrations',
      'registration_sari_memberships',
    ])
    expect(state.inserts[0]?.payload.tenant_id).toBe(TENANT)
    expect(state.inserts[1]?.payload).toMatchObject({
      tenant_id: TENANT,
      registration_id: 'reg-1',
      sari_session_id: 2110027,
      course_session_id: SESSION,
      source: 'MANUAL_ENROLLMENT',
    })
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

  it('B. does not create a membership when SARI enrollment fails', async () => {
    mocks.enrollStudent.mockRejectedValueOnce(new Error('SARI error: COURSE_FULL'))
    mocks.body = { courseSessionId: SESSION, studentId: STUDENT, tenant_id: TENANT }
    await expect(handlers.enroll!({})).rejects.toMatchObject({ statusCode: 500 })
    expect(state.inserts).toHaveLength(0)
  })
})

describe('unenroll-student tenant boundary', () => {
  it('unenrolls a session owned by the authenticated tenant and scopes the registration update', async () => {
    mocks.body = { courseSessionId: SESSION, studentId: STUDENT, tenant_id: OTHER }
    const result = await handlers.unenroll!({})
    expect(result.success).toBe(true)
    expect(mocks.unenrollStudent).toHaveBeenCalledTimes(1)
    expect(mocks.unenrollStudent).toHaveBeenCalledWith(2110027, 'FABER1')
    expect(state.deletes.map((row) => row.filters.sari_session_id)).toEqual([2110027])
    expect(state.queries.some((query) => query.table === 'course_sessions' && query.select.includes('courses!course_sessions_course_id_fkey'))).toBe(true)
    expect(mocks.getTenantSecretsSecure).toHaveBeenCalledWith(
      TENANT,
      expect.any(Array),
      'SARI_UNENROLL',
    )
    expect(state.updates).toHaveLength(0)
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

  it('unenrolls every numeric session of an owned registration and ignores the GROUP_ id', async () => {
    mocks.body = { registrationId: REGISTRATION, studentId: STUDENT, tenant_id: OTHER }
    const result = await handlers.unenroll!({})
    expect(result.success).toBe(true)
    expect(mocks.unenrollStudent.mock.calls.map((call) => call[0])).toEqual([2110027, 2110028])
    expect(mocks.unenrollStudent.mock.calls.every((call) => call[1] === 'FABER1')).toBe(true)
    expect(mocks.unenrollStudent.mock.calls.some((call) => Number.isNaN(call[0]))).toBe(false)
    expect(mocks.unenrollStudent.mock.calls.some((call) => String(call[0]).includes('GROUP_'))).toBe(false)
    expect(mocks.getTenantSecretsSecure).toHaveBeenCalledWith(
      TENANT,
      expect.any(Array),
      'SARI_UNENROLL',
    )
    const registrationQuery = state.queries.find((query) => query.table === 'course_registrations')
    expect(registrationQuery?.select).toContain('courses!course_registrations_course_id_fkey')
    expect(registrationQuery?.select).not.toContain('course_sessions')
    expect(registrationQuery?.select).not.toMatch(/(?:^|,|\s)courses\(/)
    expect(registrationQuery?.filters).toMatchObject({ id: REGISTRATION, tenant_id: TENANT })
    expect(state.queries.some((query) => query.table === 'course_sessions' && !query.filters.id)).toBe(false)
    expect(state.deletes.map((row) => row.filters.sari_session_id)).toEqual([2110027, 2110028])
    expect(state.updates).toHaveLength(1)
    expect(state.updates[0]?.filters).toMatchObject({
      id: REGISTRATION,
      tenant_id: TENANT,
    })
  })

  it('unenrolls every stored membership and does not reconstruct ids from course sessions', async () => {
    state.memberships = [
      {
        id: 'm-only',
        tenant_id: TENANT,
        registration_id: REGISTRATION,
        sari_session_id: 2110099,
        course_session_id: null,
        source: 'MANUAL_ENROLLMENT',
      },
    ]
    state.registrationSessions = OWNED_SESSIONS.map((row) => ({ ...row }))
    mocks.body = { registrationId: REGISTRATION, studentId: STUDENT }
    await handlers.unenroll!({})
    expect(mocks.unenrollStudent.mock.calls.map((call) => call[0])).toEqual([2110099])
    expect(state.queries.some((query) => query.table === 'course_sessions' && !query.filters.id)).toBe(false)
  })

  it('blocks a registration whose course belongs to another tenant before SARI', async () => {
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

  it('does not pass a foreign-tenant session id to SARI', async () => {
    state.injectForeignSession = true
    mocks.body = { registrationId: REGISTRATION, studentId: STUDENT }
    await handlers.unenroll!({})
    const ids = mocks.unenrollStudent.mock.calls.map((call) => call[0])
    expect(ids).toEqual([2110027, 2110028])
    expect(ids).not.toContain(9999999)
  })

  it('fails closed when the registration has no membership', async () => {
    state.memberships = []
    mocks.body = { registrationId: REGISTRATION, studentId: STUDENT }
    await expect(handlers.unenroll!({})).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'No confirmed SARI membership for this registration',
    })
    expect(mocks.unenrollStudent).not.toHaveBeenCalled()
    expect(mocks.getTenantSecretsSecure).not.toHaveBeenCalled()
    expect(vi.mocked(SARIClient)).not.toHaveBeenCalled()
    expect(state.updates).toHaveLength(0)
    expect(state.deletes).toHaveLength(0)
  })

  it('keeps the membership when SARI unenrollment fails', async () => {
    mocks.unenrollStudent.mockRejectedValueOnce(new Error('SARI error: COURSEMEMBER_ALREADY_CONFIRMED'))
    mocks.body = { registrationId: REGISTRATION, studentId: STUDENT }
    await expect(handlers.unenroll!({})).rejects.toMatchObject({ statusCode: 409 })
    expect(state.deletes).toHaveLength(0)
    expect(state.updates).toHaveLength(0)
    expect(state.memberships.map((row) => row.sari_session_id)).toEqual([2110027, 2110028])
  })

  it('does not unenroll when the registration query errors', async () => {
    state.registrationQueryError = true
    mocks.body = { registrationId: REGISTRATION, studentId: STUDENT }
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
