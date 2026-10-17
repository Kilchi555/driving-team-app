import { beforeEach, describe, expect, it, vi } from 'vitest'
import cashHandler from '~/server/api/courses/enroll-cash.post'
import transferHandler from '~/server/api/admin/courses/transfer-session.post'
import { adminEnrollInCourse, repairExistingAdminEnrollment } from '~/server/utils/admin-course-enroll'
import {
  resumeExistingConfirmedEnrollment,
  SARI_MEMBERSHIP_SOURCE,
} from '~/server/utils/registration-sari-membership'
import { drainPublicCashEnrollOutbox } from '~/server/utils/public-cash-enroll-outbox'

const mocks = vi.hoisted(() => {
  const TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const OTHER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  const COURSE = '33333333-3333-4333-8333-333333333333'
  const OTHER_COURSE = '44444444-4444-4444-8444-444444444444'
  const TARGET = '66666666-6666-4666-8666-666666666666'
  const REG = '55555555-5555-4555-8555-555555555555'
  const FOREIGN = '77777777-7777-4777-8777-777777777777'
  const USER = '22222222-2222-4222-8222-222222222222'
  return {
    TENANT,
    OTHER,
    COURSE,
    OTHER_COURSE,
    TARGET,
    REG,
    FOREIGN,
    USER,
    body: {} as Record<string, unknown>,
    getDb: (): { from: (table: string) => unknown } => {
      throw new Error('db not ready')
    },
    enrollStudent: vi.fn(async (..._args: unknown[]) => undefined),
    unenrollStudent: vi.fn(async (..._args: unknown[]) => undefined),
    validateAllSessions: vi.fn(async () => ({ canEnroll: true, reason: '' })),
    getCustomer: vi.fn(async () => ({
      firstname: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
    })),
    canEnrollInCourse: vi.fn(async () => ({ canEnroll: true, reason: '' })),
    getSARICredentialsSecure: vi.fn(async () => ({
      environment: 'test',
      clientId: 'id',
      clientSecret: 'secret',
      username: 'user',
      password: 'pass',
    })),
    course: {
      id: COURSE,
      tenant_id: TENANT,
      name: 'VKU',
      description: '',
      sari_managed: true,
      sari_course_id: '2110027',
      payment_method: 'CASH_ON_SITE',
      city: 'Zürich',
      is_partial_only: false,
      price_per_participant_rappen: 15000,
      course_category: null,
      course_sessions: [{
        id: 'sess-1',
        tenant_id: TENANT,
        course_id: COURSE,
        sari_session_id: '2110027',
        session_number: 1,
        start_time: '2027-06-01T08:00:00.000Z',
        end_time: '2027-06-01T12:00:00.000Z',
      }],
    } as Record<string, unknown>,
  }
})

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return { ...actual, readBody: async () => mocks.body }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => mocks.getDb(),
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUserWithDbId: async () => null,
  requireAdminProfile: async () => ({ id: 'admin-1', tenant_id: mocks.TENANT, role: 'admin' }),
}))

vi.mock('~/server/utils/sari-credentials-secure', () => ({
  getSARICredentialsSecure: (...args: unknown[]) => mocks.getSARICredentialsSecure(...args),
}))

vi.mock('~/utils/sariClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/sariClient')>()
  return {
    ...actual,
    SARIClient: class {
      enrollStudent(...args: unknown[]) {
        return mocks.enrollStudent(...args)
      }
      unenrollStudent(...args: unknown[]) {
        return mocks.unenrollStudent(...args)
      }
      getCustomer(...args: unknown[]) {
        return mocks.getCustomer(...args)
      }
      canEnrollInCourse(...args: unknown[]) {
        return mocks.canEnrollInCourse(...args)
      }
      validateAllSessions(...args: unknown[]) {
        return mocks.validateAllSessions(...args)
      }
    },
  }
})

vi.mock('~/server/utils/course-custom-sessions', () => ({
  loadPublicCourseForEnrollment: async () => mocks.course,
  assertCustomSessionsForTenant: async () => ({ sanitized: null, sessions: [] }),
}))

type Row = Record<string, unknown>

interface QueryResult {
  data: unknown
  error: { code?: string; message?: string } | null
  count: number | null
}

interface Chain extends PromiseLike<QueryResult> {
  select: (columns?: unknown, options?: { head?: boolean }) => Chain
  insert: (value: Row) => Chain
  update: (value: Row) => Chain
  delete: () => Chain
  eq: (column: string, value: unknown) => Chain
  in: (column: string, values: unknown[]) => Chain
  is: (column: string, value: unknown) => Chain
  neq: (column: string, value: unknown) => Chain
  ilike: (column: string, value: string) => Chain
  gte: () => Chain
  order: () => Chain
  limit: (count: number) => Chain
  maybeSingle: () => Promise<QueryResult>
  single: () => Promise<QueryResult>
}

function createMemory() {
  const tables: Record<string, Row[]> = {
    tenants: [],
    users: [],
    courses: [],
    course_registrations: [],
    course_sessions: [],
    registration_sari_memberships: [],
    payments: [],
    public_cash_course_enroll_idempotency: [],
    public_cash_course_enroll_outbox: [],
  }
  let failMembershipInsert = false

  async function rpc(fn: string, args: Record<string, unknown> = {}) {
    if (fn === 'claim_public_cash_enroll_outbox_batch') {
      const limit = Number(args.p_limit || 20)
      const worker = String(args.p_worker_id || 'worker')
      const outbox = tables.public_cash_course_enroll_outbox || (tables.public_cash_course_enroll_outbox = [])
      const picked: Row[] = []
      for (const row of outbox) {
        if (picked.length >= limit) break
        if (row.status === 'pending' || (row.status === 'processing' && row.claimed_at)) {
          row.status = 'processing'
          row.attempts = Number(row.attempts || 0) + 1
          row.claimed_by = worker
          row.claimed_at = new Date().toISOString()
          picked.push(row)
        }
      }
      return { data: picked, error: null }
    }
    if (fn === 'complete_public_cash_enroll_outbox_job') {
      const id = String(args.p_job_id || '')
      const row = (tables.public_cash_course_enroll_outbox || []).find((r) => r.id === id)
      if (!row) return { data: { status: 'not_found' }, error: null }
      row.status = 'completed'
      row.processed_at = new Date().toISOString()
      row.last_error = null
      return { data: { status: 'completed', id }, error: null }
    }
    if (fn === 'fail_public_cash_enroll_outbox_job') {
      const id = String(args.p_job_id || '')
      const permanent = Boolean(args.p_permanent)
      const row = (tables.public_cash_course_enroll_outbox || []).find((r) => r.id === id)
      if (!row) return { data: { status: 'not_found' }, error: null }
      if (permanent || Number(row.attempts || 0) >= 8) {
        row.status = 'failed'
        row.last_error = String(args.p_error || '')
      } else {
        row.status = 'pending'
        row.last_error = String(args.p_error || '')
        row.claimed_at = null
      }
      return { data: { status: row.status, id }, error: null }
    }
    if (fn !== 'enroll_public_cash_course_with_pending_payment') {
      return { data: null, error: { message: `unexpected rpc ${fn}` } }
    }
    const tenantId = String(args.p_tenant_id || '')
    const courseId = String(args.p_course_id || '')
    const userId = String(args.p_user_id || '')
    const key = String(args.p_idempotency_key || '')
    const registration = (args.p_registration || {}) as Row
    const email = String(registration.email || '')
    const faber = String(registration.sari_faberid || '')

    const idemRows = tables.public_cash_course_enroll_idempotency
    const existingIdem = idemRows.find((row) => row.tenant_id === tenantId && row.idempotency_key === key)
    const requestHash = [
      courseId,
      tenantId,
      userId,
      'cash_on_site',
      String(args.p_amount_rappen ?? ''),
      email.toLowerCase(),
      faber,
    ].join('|')

    if (existingIdem) {
      if (existingIdem.request_hash !== requestHash) {
        return {
          data: {
            status: 'idempotency_conflict',
            registration_id: existingIdem.registration_id,
            payment_id: existingIdem.payment_id,
          },
          error: null,
        }
      }
      return {
        data: {
          status: 'idempotent_replay',
          registration_id: existingIdem.registration_id,
          payment_id: existingIdem.payment_id,
        },
        error: null,
      }
    }

    const regs = tables.course_registrations
    const duplicate = regs.find((row) =>
      row.course_id === courseId
      && row.tenant_id === tenantId
      && row.deleted_at == null
      && row.status !== 'cancelled'
      && (
        row.user_id === userId
        || (email && String(row.email || '').toLowerCase() === email.toLowerCase())
        || (faber && row.sari_faberid === faber)
      ))
    if (duplicate) {
      return {
        data: { status: 'payment_conflict', registration_id: duplicate.id },
        error: null,
      }
    }

    const regId = `reg-${regs.length + 1}`
    const payId = `pay-${tables.payments.length + 1}`
    regs.push({
      id: regId,
      course_id: courseId,
      tenant_id: tenantId,
      user_id: userId,
      email,
      sari_faberid: faber || null,
      birthdate: registration.birthdate || '2000-01-02',
      status: 'confirmed',
      payment_status: 'pending',
      payment_method: 'cash_on_site',
      payment_id: payId,
      sari_synced: false,
      deleted_at: null,
      first_name: registration.first_name,
      last_name: registration.last_name,
    })
    tables.payments.push({
      id: payId,
      tenant_id: tenantId,
      user_id: userId,
      course_registration_id: regId,
      payment_method: 'cash_on_site',
      payment_status: 'pending',
      payment_provider: null,
      metadata: { public_cash_course_enroll: true, idempotency_key: key },
    })
    idemRows.push({
      tenant_id: tenantId,
      idempotency_key: key,
      request_hash: requestHash,
      registration_id: regId,
      payment_id: payId,
    })
    const outbox = tables.public_cash_course_enroll_outbox
    outbox.push({
      id: `ob-email-${regId}`,
      tenant_id: tenantId,
      registration_id: regId,
      payment_id: payId,
      enroll_idempotency_key: key,
      event_type: 'confirmation_email',
      dedupe_key: `confirmation_email:${regId}`,
      payload: { registration_id: regId, amount_rappen: args.p_amount_rappen, payment_method: 'cash' },
      status: 'pending',
      attempts: 0,
    })
    if (registration.outbox_sari) {
      outbox.push({
        id: `ob-sari-${regId}`,
        tenant_id: tenantId,
        registration_id: regId,
        payment_id: payId,
        enroll_idempotency_key: key,
        event_type: 'sari_sync',
        dedupe_key: `sari_sync:${regId}`,
        payload: { registration_id: regId, course_id: courseId, sari_session_ids: registration.outbox_sari_session_ids || [] },
        status: 'pending',
        attempts: 0,
      })
    }
    if (registration.outbox_vehicle) {
      outbox.push({
        id: `ob-veh-${regId}`,
        tenant_id: tenantId,
        registration_id: regId,
        payment_id: payId,
        enroll_idempotency_key: key,
        event_type: 'vehicle_bookings',
        dedupe_key: `vehicle_bookings:${regId}`,
        payload: { registration_id: regId, course_id: courseId, vehicle_id: registration.vehicle_id, user_id: userId },
        status: 'pending',
        attempts: 0,
      })
    }
    return {
      data: { status: 'enrolled', registration_id: regId, payment_id: payId },
      error: null,
    }
  }

  function from(table: string): Chain {
    const filters: Array<(row: Row) => boolean> = []
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
    let payload: Row | null = null
    let head = false
    let limitN: number | null = null

    const run = (): QueryResult => {
      const rows = tables[table] || (tables[table] = [])
      if (op === 'insert' && payload) {
        if (table === 'registration_sari_memberships' && failMembershipInsert) {
          return { data: null, error: { code: 'XX000', message: 'membership insert failed' }, count: null }
        }
        if (table === 'registration_sari_memberships') {
          const duplicate = rows.some((row) =>
            row.registration_id === payload?.registration_id && row.sari_session_id === payload?.sari_session_id)
          if (duplicate) return { data: null, error: { code: '23505', message: 'duplicate key' }, count: null }
        }
        const created = { id: payload.id || `${table}-${rows.length + 1}`, ...payload }
        rows.push(created)
        return { data: created, error: null, count: null }
      }
      if (op === 'update' && payload) {
        for (const row of rows) {
          if (filters.every((match) => match(row))) Object.assign(row, payload)
        }
        return { data: null, error: null, count: null }
      }
      if (op === 'delete') {
        tables[table] = rows.filter((row) => !filters.every((match) => match(row)))
        return { data: null, error: null, count: null }
      }
      let selected = rows.filter((row) => filters.every((match) => match(row)))
      if (limitN != null) selected = selected.slice(0, limitN)
      return { data: head ? null : selected, error: null, count: selected.length }
    }

    const builder = {} as Chain
    builder.select = (_columns, options) => {
      head = options?.head === true
      return builder
    }
    builder.insert = (value) => {
      op = 'insert'
      payload = value
      return builder
    }
    builder.update = (value) => {
      op = 'update'
      payload = value
      return builder
    }
    builder.delete = () => {
      op = 'delete'
      return builder
    }
    builder.eq = (column, value) => {
      filters.push((row) => row[column] === value)
      return builder
    }
    builder.in = (column, values) => {
      filters.push((row) => values.includes(row[column]))
      return builder
    }
    builder.is = (column, value) => {
      filters.push((row) => row[column] === value || (value === null && row[column] == null))
      return builder
    }
    builder.neq = (column, value) => {
      filters.push((row) => row[column] !== value)
      return builder
    }
    builder.ilike = (column, value) => {
      filters.push((row) => String(row[column] ?? '').toLowerCase() === value.toLowerCase())
      return builder
    }
    builder.gte = () => builder
    builder.order = () => builder
    builder.limit = (count) => {
      limitN = count
      return builder
    }
    builder.maybeSingle = async () => {
      const result = run()
      const data = Array.isArray(result.data) ? result.data[0] ?? null : result.data
      return { data, error: result.error, count: result.count }
    }
    builder.single = builder.maybeSingle
    builder.then = (resolve, reject) => Promise.resolve(run()).then(resolve, reject)
    return builder
  }

  return {
    from,
    rpc,
    tables,
    setFailMembershipInsert(value: boolean) {
      failMembershipInsert = value
    },
  }
}

type Memory = ReturnType<typeof createMemory>

let db: Memory
let ipSeq = 20

function ownsThisCourse() {
  return db.tables.course_registrations.some((row) =>
    row.tenant_id === mocks.TENANT && row.course_id === mocks.COURSE)
}

function confirmedRegistration(overrides: Row = {}): Row {
  return {
    id: mocks.REG,
    tenant_id: mocks.TENANT,
    course_id: mocks.COURSE,
    user_id: mocks.USER,
    sari_faberid: '7181751',
    status: 'confirmed',
    payment_method: 'cash_on_site',
    email: 'ada@example.com',
    deleted_at: null,
    sari_synced: false,
    birthdate: '2000-01-02',
    first_name: 'Ada',
    last_name: 'Lovelace',
    custom_sessions: null,
    notes: null,
    ...overrides,
  }
}

function seedAdminCourse(maxParticipants = 10) {
  db.tables.courses.push({
    id: mocks.COURSE,
    name: 'VKU',
    tenant_id: mocks.TENANT,
    sari_managed: true,
    sari_course_id: 'GROUP_9999999',
    price_per_participant_rappen: 15000,
    max_participants: maxParticipants,
    company_id: null,
    billing_mode: null,
    course_category: null,
    course_sessions: [{
      id: 'sess-1',
      sari_session_id: '2110027',
      session_number: 1,
      start_time: '2027-06-01T08:00:00.000Z',
    }],
  })
}

function cashEvent() {
  ipSeq += 1
  return {
    headers: { 'x-forwarded-for': `203.0.113.${ipSeq}` },
    node: { req: { socket: { remoteAddress: '127.0.0.1' }, url: '/api/courses/enroll-cash' } },
  }
}

/** Stable UUID v4 for logical request A (retries must reuse this). */
const CASH_KEY_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
/** Distinct UUID v4 for a genuinely new logical request. */
const CASH_KEY_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
/** Third distinct key for a further new attempt. */
const CASH_KEY_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

let activeCashIdempotencyKey: string | null = null

/**
 * Default reuses activeCashIdempotencyKey (retry of the same logical request).
 * Pass idempotencyKey for an explicit key; omit on first call to start with KEY_A.
 */
async function enrollCash(opts?: { idempotencyKey?: string }) {
  if (opts?.idempotencyKey) {
    activeCashIdempotencyKey = opts.idempotencyKey
  } else if (!activeCashIdempotencyKey) {
    activeCashIdempotencyKey = CASH_KEY_A
  }

  mocks.body = {
    courseId: mocks.COURSE,
    faberid: '7181751',
    birthdate: '2000-01-02',
    idempotencyKey: activeCashIdempotencyKey,
  }
  return (cashHandler as (event: unknown) => Promise<unknown>)(cashEvent())
}

function adminOpts() {
  return {
    tenantId: mocks.TENANT,
    adminUserId: 'admin-1',
    courseId: mocks.COURSE,
    userId: mocks.USER,
    participant: {
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      birthdate: '2000-01-02',
      faberid: '7181751',
    },
    paymentOption: 'cash' as const,
  }
}

beforeEach(() => {
  db = createMemory()
  mocks.getDb = () => db
  db.tables.tenants.push({
    id: mocks.TENANT,
    wallee_enabled: false,
    is_active: true,
    sari_enabled: true,
    name: 'School',
    contact_email: 'school@example.com',
    contact_phone: '',
  })
  db.tables.course_sessions.push({
    id: 'sess-1',
    tenant_id: mocks.TENANT,
    course_id: mocks.COURSE,
    sari_session_id: '2110027',
  })
  db.tables.users.push({
    id: mocks.USER,
    tenant_id: mocks.TENANT,
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    phone: null,
    birthdate: '2000-01-02',
    street: null,
    street_nr: null,
    zip: null,
    city: null,
    faberid: '7181751',
    role: 'client',
    is_active: true,
  })
  mocks.enrollStudent.mockReset()
  mocks.enrollStudent.mockImplementation(async () => {
    if (ownsThisCourse()) throw new Error('SARI error: ALREADY_ENROLLED')
  })
  mocks.unenrollStudent.mockReset()
  mocks.unenrollStudent.mockResolvedValue(undefined)
  mocks.validateAllSessions.mockReset()
  mocks.validateAllSessions.mockResolvedValue({ canEnroll: true, reason: '' })
  mocks.getSARICredentialsSecure.mockClear()
  activeCashIdempotencyKey = null
  vi.stubGlobal('$fetch', vi.fn(async () => ({})))
})

describe('cash enrollment membership repair', () => {
  async function seedCourseForOutbox() {
    db.tables.courses.push({
      id: mocks.COURSE,
      tenant_id: mocks.TENANT,
      sari_managed: true,
      sari_course_id: '2110027',
      course_sessions: [{
        id: 'sess-1',
        tenant_id: mocks.TENANT,
        sari_session_id: '2110027',
        session_number: 1,
        start_time: '2027-06-01T08:00:00.000Z',
        end_time: '2027-06-01T12:00:00.000Z',
      }],
    })
  }

  it('enqueued outbox on enroll; same-key replay skips inline; different key repairs', async () => {
    const fetchMock = vi.fn(async () => ({}))
    vi.stubGlobal('$fetch', fetchMock)
    await seedCourseForOutbox()

    const first = await enrollCash({ idempotencyKey: CASH_KEY_A }) as {
      success: boolean
      idempotentReplay?: boolean
      enrollmentId: string
    }
    expect(first).toMatchObject({ success: true })
    expect(first.idempotentReplay).toBeFalsy()
    expect(db.tables.course_registrations).toHaveLength(1)
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.public_cash_course_enroll_outbox.map((r) => r.event_type).sort()).toEqual([
      'confirmation_email',
      'sari_sync',
    ])
    // Required SARI/email are outbox-owned — not inline on enroll.
    expect(mocks.enrollStudent).not.toHaveBeenCalled()

    const replay = await enrollCash({ idempotencyKey: CASH_KEY_A }) as {
      success: boolean
      idempotentReplay?: boolean
      enrollmentId: string
    }
    expect(replay).toMatchObject({ success: true, idempotentReplay: true })
    expect(replay.enrollmentId).toBe(db.tables.course_registrations[0]?.id)
    expect(db.tables.course_registrations).toHaveLength(1)
    expect(db.tables.public_cash_course_enroll_outbox).toHaveLength(2)

    // Worker drain completes required side effects once.
    const drain = await drainPublicCashEnrollOutbox(db as never, { workerId: 'test-worker' })
    expect(drain.claimed).toBeGreaterThan(0)
    expect(mocks.enrollStudent).toHaveBeenCalled()
    expect(db.tables.registration_sari_memberships.length).toBeGreaterThan(0)
    expect(db.tables.public_cash_course_enroll_outbox.every((r) => r.status === 'completed')).toBe(true)

    const emailCalls = () => fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('send-course-enrollment-confirmation'))
    expect(emailCalls().length).toBe(1)

    // Drain again — no pending jobs.
    const drain2 = await drainPublicCashEnrollOutbox(db as never, { workerId: 'test-worker-2' })
    expect(drain2.claimed).toBe(0)
    expect(emailCalls().length).toBe(1)

    // New key → business duplicate → resume repair path still available.
    await expect(enrollCash({ idempotencyKey: CASH_KEY_B })).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.',
    })
    expect(db.tables.course_registrations).toHaveLength(1)
  })

  it('first enrolled request creates outbox; replay does not duplicate outbox rows', async () => {
    const fetchMock = vi.fn(async () => ({}))
    vi.stubGlobal('$fetch', fetchMock)
    await seedCourseForOutbox()

    await enrollCash({ idempotencyKey: CASH_KEY_A })
    expect(db.tables.public_cash_course_enroll_outbox).toHaveLength(2)
    await enrollCash({ idempotencyKey: CASH_KEY_A })
    expect(db.tables.public_cash_course_enroll_outbox).toHaveLength(2)
    expect(db.tables.course_registrations).toHaveLength(1)
    expect(db.tables.payments).toHaveLength(1)
  })

  it('does not repair a registration from another tenant', async () => {
    await seedCourseForOutbox()
    db.tables.course_registrations.push(confirmedRegistration({
      id: mocks.FOREIGN,
      tenant_id: mocks.OTHER,
      email: 'other@example.com',
      sari_faberid: '9999999',
    }))
    await enrollCash({ idempotencyKey: CASH_KEY_A })
    await drainPublicCashEnrollOutbox(db as never, { workerId: 't' })
    expect(db.tables.registration_sari_memberships.some((row) => row.registration_id === mocks.FOREIGN)).toBe(false)
    expect(db.tables.course_registrations.find((row) => row.id === mocks.FOREIGN)?.sari_synced).toBe(false)
    expect(db.tables.course_registrations.some((row) =>
      row.tenant_id === mocks.TENANT && row.course_id === mocks.COURSE)).toBe(true)
  })

  it('does not repair a registration for another course', async () => {
    await seedCourseForOutbox()
    db.tables.course_registrations.push(confirmedRegistration({
      id: mocks.FOREIGN,
      course_id: mocks.OTHER_COURSE,
      sari_faberid: '9999999',
      email: 'other-course@example.com',
    }))
    await enrollCash({ idempotencyKey: CASH_KEY_A })
    await drainPublicCashEnrollOutbox(db as never, { workerId: 't' })
    expect(db.tables.registration_sari_memberships.some((row) => row.registration_id === mocks.FOREIGN)).toBe(false)
    expect(db.tables.course_registrations.find((row) => row.id === mocks.FOREIGN)?.sari_synced).toBe(false)
    expect(db.tables.course_registrations.some((row) =>
      row.tenant_id === mocks.TENANT && row.course_id === mocks.COURSE)).toBe(true)
  })

  it('does not guess when the existing row is pending or ambiguous', async () => {
    db.tables.course_registrations.push(confirmedRegistration({ status: 'pending' }))
    await expect(enrollCash({ idempotencyKey: CASH_KEY_A })).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.',
    })
    expect(db.tables.course_registrations.filter((r) => r.course_id === mocks.COURSE)).toHaveLength(1)

    db.tables.course_registrations.push(confirmedRegistration({ id: 'reg-second' }))
    await expect(enrollCash({ idempotencyKey: CASH_KEY_B })).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Die bestehende Anmeldung ist nicht eindeutig.',
    })
    expect(db.tables.course_registrations.filter((r) =>
      r.course_id === mocks.COURSE && r.tenant_id === mocks.TENANT)).toHaveLength(2)
  })

  it('refuses a mismatched registration without writing a snapshot', async () => {
    const sari = { enrollStudent: vi.fn(async () => undefined) }
    await expect(resumeExistingConfirmedEnrollment({
      supabase: db as never,
      sari,
      tenantId: mocks.TENANT,
      courseId: mocks.COURSE,
      registration: confirmedRegistration({ tenant_id: mocks.OTHER }),
      faberid: '7181751',
      birthdate: '2000-01-02',
      sessions: [{ sariSessionId: 2110027, courseSessionId: 'sess-1' }],
      source: SARI_MEMBERSHIP_SOURCE.cashEnrollment,
      duplicateStatusMessage: 'Sie sind bereits für diesen Kurs angemeldet.',
    })).rejects.toMatchObject({ statusCode: 409 })
    expect(sari.enrollStudent).not.toHaveBeenCalled()
    expect(db.tables.registration_sari_memberships).toHaveLength(0)
  })
})

describe('admin enrollment membership repair', () => {
  it('repairs a missing snapshot and still returns the duplicate response', async () => {
    seedAdminCourse(1)
    db.setFailMembershipInsert(true)
    await expect(adminEnrollInCourse(adminOpts())).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'SARI enrollment succeeded, but the membership could not be saved',
    })
    expect(db.tables.course_registrations).toHaveLength(1)
    expect(db.tables.course_registrations[0]?.sari_synced).toBe(false)
    expect(db.tables.registration_sari_memberships).toHaveLength(0)
    expect(mocks.enrollStudent).toHaveBeenCalledTimes(1)
    expect(mocks.enrollStudent).toHaveBeenCalledWith(2110027, '7181751', '2000-01-02')
    expect(mocks.enrollStudent).not.toHaveBeenCalledWith(9999999, expect.anything(), expect.anything())

    db.setFailMembershipInsert(false)
    await expect(adminEnrollInCourse(adminOpts())).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Dieser Kunde ist bereits für diesen Kurs angemeldet',
    })
    expect(db.tables.course_registrations).toHaveLength(1)
    expect(db.tables.course_registrations[0]?.sari_synced).toBe(true)
    expect(db.tables.registration_sari_memberships).toEqual([
      expect.objectContaining({
        tenant_id: mocks.TENANT,
        registration_id: db.tables.course_registrations[0]?.id,
        sari_session_id: 2110027,
        source: SARI_MEMBERSHIP_SOURCE.adminCourseEnroll,
      }),
    ])
  })

  it('does not repair another tenant or another course', async () => {
    seedAdminCourse(10)
    db.tables.course_registrations.push(confirmedRegistration({
      id: mocks.FOREIGN,
      tenant_id: mocks.OTHER,
      email: 'other@example.com',
    }))
    await adminEnrollInCourse(adminOpts())
    expect(db.tables.registration_sari_memberships.some((row) => row.registration_id === mocks.FOREIGN)).toBe(false)
    expect(db.tables.course_registrations.find((row) => row.id === mocks.FOREIGN)?.sari_synced).toBe(false)

    db.tables.registration_sari_memberships = []
    db.tables.course_registrations = [confirmedRegistration({
      id: mocks.FOREIGN,
      course_id: mocks.OTHER_COURSE,
    })]
    await adminEnrollInCourse(adminOpts())
    expect(db.tables.registration_sari_memberships.some((row) => row.registration_id === mocks.FOREIGN)).toBe(false)
    expect(db.tables.course_registrations.find((row) => row.id === mocks.FOREIGN)?.sari_synced).toBe(false)
    expect(db.tables.course_registrations.some((row) => row.course_id === mocks.COURSE)).toBe(true)
  })

  it('refuses a mismatched registration passed to the admin repair helper', async () => {
    seedAdminCourse()
    await expect(repairExistingAdminEnrollment({
      supabase: db as never,
      tenantId: mocks.TENANT,
      course: { id: mocks.COURSE, course_sessions: [] },
      registration: confirmedRegistration({ course_id: mocks.OTHER_COURSE }) as never,
      faberid: '7181751',
      birthdate: '2000-01-02',
      enrollmentType: 'full',
    })).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Die bestehende Anmeldung gehört nicht zu diesem Kurs.',
    })
    expect(mocks.enrollStudent).not.toHaveBeenCalled()
    expect(mocks.getSARICredentialsSecure).not.toHaveBeenCalled()
    expect(db.tables.registration_sari_memberships).toHaveLength(0)
  })
})

describe('transfer-session coverage fail closed', () => {
  function seedTransferCourse(sessions: Row[]) {
    db.tables.courses.push({
      id: mocks.COURSE,
      name: 'VKU',
      category: 'VKU',
      sari_managed: true,
      sari_course_id: '2110027',
      tenant_id: mocks.TENANT,
      course_sessions: sessions,
    })
    db.tables.courses.push({
      id: mocks.TARGET,
      name: 'Ziel',
      category: 'VKU',
      description: '',
      tenant_id: mocks.TENANT,
      is_active: true,
    })
  }

  it('saves custom_sessions only after every moved membership is covered', async () => {
    seedTransferCourse([
      { id: 'sess-1', sari_session_id: '2110027', start_time: '2027-06-01T08:00:00.000Z', end_time: '2027-06-01T12:00:00.000Z' },
      { id: 'sess-2', sari_session_id: '2110028', start_time: '2027-06-08T08:00:00.000Z', end_time: '2027-06-08T12:00:00.000Z' },
    ])
    db.tables.course_registrations.push(confirmedRegistration())
    db.tables.registration_sari_memberships.push(
      {
        id: 'm1',
        tenant_id: mocks.TENANT,
        registration_id: mocks.REG,
        sari_session_id: 2110027,
        course_session_id: null,
        source: 'MANUAL_ENROLLMENT',
      },
      {
        id: 'm2',
        tenant_id: mocks.TENANT,
        registration_id: mocks.REG,
        sari_session_id: 2110028,
        course_session_id: null,
        source: 'MANUAL_ENROLLMENT',
      },
    )
    mocks.body = {
      registrationId: mocks.REG,
      changes: [{
        sessionPosition: 1,
        targetCourseId: mocks.TARGET,
        targetSariSessionIds: ['2110099'],
        targetDate: '2027-06-03',
      }],
    }
    const result = await (transferHandler as (event: unknown) => Promise<{ success: boolean; sariSynced: boolean }>)({})
    expect(result.success).toBe(true)
    expect(result.sariSynced).toBe(true)
    expect(db.tables.registration_sari_memberships.map((row) => row.sari_session_id).sort()).toEqual([2110028, 2110099])
    const saved = db.tables.course_registrations[0]?.custom_sessions as Record<string, { sariSessionIds?: string[] }>
    expect(saved['1']?.sariSessionIds).toEqual(['2110099'])
  })

  it('does not enroll, snapshot, or save custom_sessions when coverage is incomplete', async () => {
    seedTransferCourse([
      { id: 'sess-1', sari_session_id: '2110027', start_time: '2027-06-01T08:00:00.000Z', end_time: '2027-06-01T12:00:00.000Z' },
    ])
    db.tables.course_registrations.push(confirmedRegistration())
    db.tables.registration_sari_memberships.push({
      id: 'm-extra',
      tenant_id: mocks.TENANT,
      registration_id: mocks.REG,
      sari_session_id: 2110088,
      course_session_id: null,
      source: 'MANUAL_ENROLLMENT',
    })
    mocks.body = {
      registrationId: mocks.REG,
      changes: [{
        sessionPosition: 1,
        targetCourseId: mocks.TARGET,
        targetSariSessionIds: ['2110099'],
        targetDate: '2027-07-01',
      }],
    }
    await expect((transferHandler as (event: unknown) => Promise<unknown>)({})).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'SARI-Membership konnte dem zu verschiebenden Teil nicht eindeutig zugeordnet werden',
    })
    expect(mocks.getSARICredentialsSecure).not.toHaveBeenCalled()
    expect(mocks.validateAllSessions).not.toHaveBeenCalled()
    expect(mocks.enrollStudent).not.toHaveBeenCalled()
    expect(mocks.unenrollStudent).not.toHaveBeenCalled()
    expect(db.tables.course_registrations[0]?.custom_sessions).toBeNull()
    expect(db.tables.registration_sari_memberships.map((row) => row.sari_session_id)).toEqual([2110088])
  })

  it('fails closed when the moved part has no old SARI ids but a membership exists', async () => {
    seedTransferCourse([
      { id: 'sess-1', sari_session_id: null, start_time: '2027-06-01T08:00:00.000Z', end_time: '2027-06-01T12:00:00.000Z' },
    ])
    db.tables.course_registrations.push(confirmedRegistration())
    db.tables.registration_sari_memberships.push({
      id: 'm1',
      tenant_id: mocks.TENANT,
      registration_id: mocks.REG,
      sari_session_id: 2110027,
      course_session_id: null,
      source: 'MANUAL_ENROLLMENT',
    })
    mocks.body = {
      registrationId: mocks.REG,
      changes: [{
        sessionPosition: 1,
        targetCourseId: mocks.TARGET,
        targetSariSessionIds: ['2110099'],
        targetDate: '2027-07-01',
      }],
    }
    await expect((transferHandler as (event: unknown) => Promise<unknown>)({})).rejects.toMatchObject({ statusCode: 409 })
    expect(mocks.enrollStudent).not.toHaveBeenCalled()
    expect(mocks.validateAllSessions).not.toHaveBeenCalled()
    expect(db.tables.course_registrations[0]?.custom_sessions).toBeNull()
    expect(db.tables.registration_sari_memberships.map((row) => row.sari_session_id)).toEqual([2110027])
  })
})
