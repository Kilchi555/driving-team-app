import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)

const mocks = vi.hoisted(() => ({
  enrollStudent: vi.fn(async () => undefined),
  getSARICredentialsSecure: vi.fn(async () => ({
    environment: 'test',
    clientId: 'id',
    clientSecret: 'secret',
    username: 'user',
    password: 'pass',
  })),
}))

vi.mock('~/server/utils/sari-credentials-secure', () => ({
  getSARICredentialsSecure: mocks.getSARICredentialsSecure,
}))

vi.mock('~/utils/sariClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/sariClient')>()
  return {
    ...actual,
    SARIClient: class {
      enrollStudent = mocks.enrollStudent
      unenrollStudent = vi.fn()
      getCourseDetail = vi.fn(async () => [])
    },
  }
})

const TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const REG = '55555555-5555-4555-8555-555555555555'

function registration() {
  return {
    id: REG,
    sari_faberid: '7181751',
    tenant_id: TENANT,
    course_id: 'course-1',
    payment_id: 'pay-1',
    custom_sessions: null,
    is_partial_enrollment: false,
    individual_session_number: null,
    partial_start_session: null,
    status: 'confirmed',
    payment_method: 'wallee',
    courses: {
      id: 'course-1',
      sari_managed: true,
      sari_course_id: 'GROUP_2110027',
      is_partial_only: false,
      tenant_id: TENANT,
      is_public: true,
      course_sessions: [{ id: 'sess-1', sari_session_id: '2110027', start_time: '2027-06-01T08:00:00Z', session_number: 1 }],
    },
  }
}

function supabase(options?: { failMembership?: boolean; existingMembership?: boolean }) {
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = []
  const inserts: Array<{ table: string; payload: Record<string, unknown> }> = []
  const from = (table: string) => {
    const filters: Record<string, unknown> = {}
    let payload: Record<string, unknown> = {}
    const builder: Record<string, unknown> = {}
    const chain = () => builder
    builder.select = chain
    builder.eq = (column: string, value: unknown) => {
      filters[column] = value
      return builder
    }
    builder.is = chain
    builder.in = chain
    builder.order = chain
    builder.update = (value: Record<string, unknown>) => {
      payload = value
      updates.push({ table, payload: value })
      return builder
    }
    builder.insert = (value: Record<string, unknown>) => {
      inserts.push({ table, payload: value })
      if (table === 'registration_sari_memberships' && options?.failMembership) {
        return {
          then: (resolve: (value: unknown) => unknown) => resolve({
            data: null,
            error: { code: 'XX000', message: 'membership insert failed' },
          }),
        }
      }
      return builder
    }
    builder.maybeSingle = async () => {
      if (table === 'course_registrations') return { data: registration(), error: null }
      if (table === 'payments') return { data: { metadata: { sari_birthdate: '2000-01-02' } }, error: null }
      if (table === 'course_sessions') return { data: { id: 'sess-1', tenant_id: TENANT }, error: null }
      if (table === 'registration_sari_memberships') {
        return { data: options?.existingMembership ? [{ id: 'm1', tenant_id: TENANT, registration_id: REG, sari_session_id: 2110027, course_session_id: 'sess-1', source: 'WEBHOOK_ENROLLMENT' }] : [], error: null }
      }
      return { data: null, error: null }
    }
    builder.single = builder.maybeSingle
    builder.then = (resolve: (value: unknown) => unknown) => {
      if (table === 'registration_sari_memberships' && !payload.sari_synced && inserts.some((row) => row.table === table)) {
        return resolve({ data: null, error: null })
      }
      if (table === 'registration_sari_memberships') {
        return resolve({
          data: options?.existingMembership
            ? [{ id: 'm1', tenant_id: TENANT, registration_id: REG, sari_session_id: 2110027, course_session_id: 'sess-1', source: 'WEBHOOK_ENROLLMENT' }]
            : [],
          error: null,
        })
      }
      return resolve({ data: null, error: null })
    }
    return builder
  }
  return { from, updates, inserts }
}

describe('webhook SARI membership repair', () => {
  beforeEach(() => {
    mocks.enrollStudent.mockReset()
    mocks.enrollStudent.mockResolvedValue(undefined)
  })

  it('does not report a saved membership when the write fails', async () => {
    const { enrollInSARIAfterPayment } = await import('~/server/api/wallee/webhook.post')
    const db = supabase({ failMembership: true })
    const result = await enrollInSARIAfterPayment(db, REG)
    expect(result.membershipPending).toBe(true)
    expect(db.updates.some((row) => row.table === 'course_registrations' && row.payload.sari_synced === true)).toBe(false)
  })

  it('repairs through ALREADY_ENROLLED and is idempotent when the snapshot exists', async () => {
    const { enrollInSARIAfterPayment } = await import('~/server/api/wallee/webhook.post')
    mocks.enrollStudent.mockRejectedValueOnce(new Error('SARI error: ALREADY_ENROLLED'))
    mocks.enrollStudent.mockRejectedValueOnce(new Error('SARI error: PERSON_ALREADY_ADDED'))
    const created = supabase()
    const first = await enrollInSARIAfterPayment(created, REG)
    expect(first.membershipPending).toBe(false)
    expect(created.inserts.some((row) => row.table === 'registration_sari_memberships' && row.payload.sari_session_id === 2110027)).toBe(true)
    expect(created.updates.some((row) => row.payload.sari_synced === true)).toBe(true)

    const again = supabase({ existingMembership: true })
    const second = await enrollInSARIAfterPayment(again, REG)
    expect(second.membershipPending).toBe(false)
    expect(again.updates.some((row) => row.payload.sari_synced === true)).toBe(true)
  })
})
