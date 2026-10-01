import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError } from 'h3'

const TENANT = '64259d68-195a-4c68-8875-f1b44d962830'
const OTHER = '11111111-1111-1111-1111-111111111111'
const USER = '051ce913-169f-480a-9cc6-e96c7b748a21'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireStaffOrInternal: vi.fn(),
  verifyRegistrationToken: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  sendEmail: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getTenantTerminology: vi.fn(),
  buildOnboardingEmailHtml: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/require-staff-or-internal', () => ({
  requireStaffOrInternal: mocks.requireStaffOrInternal,
}))

vi.mock('~/server/utils/registration-token', () => ({
  verifyRegistrationToken: mocks.verifyRegistrationToken,
}))

vi.mock('~/server/utils/send-welcome-email', () => ({
  sendWelcomeEmail: mocks.sendWelcomeEmail,
}))

vi.mock('~/server/utils/email', () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/tenant-terminology', () => ({
  getTenantTerminology: mocks.getTenantTerminology,
}))

vi.mock('~/server/utils/onboarding-email', () => ({
  buildOnboardingEmailHtml: mocks.buildOnboardingEmailHtml,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('uuid', () => ({
  v4: () => 'token-fixed',
}))

type Eq = [string, unknown]

function chain(opts: {
  single?: () => Promise<{ data: unknown; error: unknown }>
  updateResult?: { error: unknown }
  eqs?: Eq[]
}) {
  const eqs = opts.eqs ?? []
  const query: {
    select: () => typeof query
    update: () => typeof query
    eq: (column: string, value: unknown) => typeof query
    single: () => Promise<{ data: unknown; error: unknown }>
    then: (resolve: (value: { error: unknown }) => unknown) => unknown
  } = {
    select: () => query,
    update: () => query,
    eq: (column, value) => {
      eqs.push([column, value])
      return query
    },
    single: opts.single || (async () => ({ data: null, error: { message: 'missing' } })),
    then: (resolve) => resolve(opts.updateResult ?? { error: null }),
  }
  return query
}

const tenantRow = {
  name: 'Fahrschule A',
  contact_email: 'office@example.test',
  contact_person_first_name: 'Ada',
  slug: 'fahrschule-a',
  business_type: 'driving',
  primary_color: '#2563eb',
  twilio_from_sender: null,
  logo_wide_url: null,
  logo_url: null,
  logo_square_url: null,
}

const storedUser = {
  id: USER,
  tenant_id: TENANT,
  email: 'stored@example.test',
  phone: '+41790000000',
  first_name: 'Stored',
  last_name: 'User',
  onboarding_status: 'pending',
}

function staff(tenantId: string, role = 'staff') {
  return { mode: 'staff' as const, profile: { id: 'caller', tenant_id: tenantId, role, email: 'staff@example.test', auth_user_id: 'auth' } }
}

describe('P0-A POST /api/tenants/send-welcome-email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyRegistrationToken.mockReturnValue(false)
    mocks.sendWelcomeEmail.mockResolvedValue(undefined)
    mocks.getSupabaseAdmin.mockReturnValue({
      from: () => chain({
        single: async () => ({ data: tenantRow, error: null }),
      }),
    })
  })

  it('rejects an unauthenticated request', async () => {
    mocks.readBody.mockResolvedValue({ tenantId: TENANT })
    mocks.requireStaffOrInternal.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    const handler = (await import('~/server/api/tenants/send-welcome-email.post')).default as (event: unknown) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.sendWelcomeEmail).not.toHaveBeenCalled()
  })

  it('rejects an authenticated caller with an unauthorized role', async () => {
    mocks.readBody.mockResolvedValue({ tenantId: TENANT })
    mocks.requireStaffOrInternal.mockRejectedValue(createError({ statusCode: 403, statusMessage: 'Forbidden – insufficient role' }))
    const handler = (await import('~/server/api/tenants/send-welcome-email.post')).default as (event: unknown) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.sendWelcomeEmail).not.toHaveBeenCalled()
  })

  it('sends the stored tenant contact for the caller’s own tenant', async () => {
    mocks.readBody.mockResolvedValue({ tenantId: TENANT, email: 'attacker@example.test' })
    mocks.requireStaffOrInternal.mockResolvedValue(staff(TENANT))
    const handler = (await import('~/server/api/tenants/send-welcome-email.post')).default as (event: unknown) => Promise<unknown>
    await expect(handler({})).resolves.toEqual({ success: true })
    expect(mocks.sendWelcomeEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'office@example.test',
      tenantId: TENANT,
    }))
  })

  it('rejects a staff caller targeting another tenant', async () => {
    mocks.readBody.mockResolvedValue({ tenantId: OTHER })
    mocks.requireStaffOrInternal.mockResolvedValue(staff(TENANT))
    const handler = (await import('~/server/api/tenants/send-welcome-email.post')).default as (event: unknown) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.sendWelcomeEmail).not.toHaveBeenCalled()
  })

  it('allows the registration HMAC for that tenant without a staff session', async () => {
    mocks.readBody.mockResolvedValue({ tenantId: TENANT, registration_token: 'signed' })
    mocks.verifyRegistrationToken.mockImplementation((token: string, tenantId: string) => token === 'signed' && tenantId === TENANT)
    const handler = (await import('~/server/api/tenants/send-welcome-email.post')).default as (event: unknown) => Promise<unknown>
    await expect(handler({})).resolves.toEqual({ success: true })
    expect(mocks.requireStaffOrInternal).not.toHaveBeenCalled()
    expect(mocks.verifyRegistrationToken).toHaveBeenCalledWith('signed', TENANT)
  })
})

describe('P0-B POST /api/students/send-onboarding-reminder', () => {
  let userEqs: Eq[]
  let updateEqs: Eq[]

  beforeEach(() => {
    vi.clearAllMocks()
    userEqs = []
    updateEqs = []
    mocks.sendEmail.mockResolvedValue({ id: 'msg' })
    mocks.getTenantTerminology.mockResolvedValue({ businessNoun: 'Fahrschule', client: 'Schüler' })
    mocks.buildOnboardingEmailHtml.mockReturnValue('<p>reminder</p>')
    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'tenants') {
          return chain({ single: async () => ({ data: tenantRow, error: null }) })
        }
        if (userEqs.length === 0) {
          return chain({
            eqs: userEqs,
            single: async () => ({ data: storedUser, error: null }),
          })
        }
        return chain({ eqs: updateEqs, updateResult: { error: null } })
      },
    })
  })

  it('rejects an unauthenticated request', async () => {
    mocks.readBody.mockResolvedValue({ userId: USER, tenantId: TENANT, email: 'stored@example.test' })
    mocks.requireStaffOrInternal.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    const handler = (await import('~/server/api/students/send-onboarding-reminder.post')).default as (event: unknown) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('rejects an unauthorized role', async () => {
    mocks.readBody.mockResolvedValue({ userId: USER, tenantId: TENANT })
    mocks.requireStaffOrInternal.mockRejectedValue(createError({ statusCode: 403, statusMessage: 'Forbidden – insufficient role' }))
    const handler = (await import('~/server/api/students/send-onboarding-reminder.post')).default as (event: unknown) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('sends to the stored contact for the caller’s own tenant', async () => {
    mocks.readBody.mockResolvedValue({
      userId: USER,
      tenantId: TENANT,
      email: 'attacker@example.test',
      phone: '+41000000000',
      firstName: 'Attacker',
    })
    mocks.requireStaffOrInternal.mockResolvedValue(staff(TENANT, 'admin'))
    const handler = (await import('~/server/api/students/send-onboarding-reminder.post')).default as (event: unknown) => Promise<unknown>
    const result = await handler({}) as { success: boolean; emailSent: boolean; smsSent: boolean }
    expect(result.success).toBe(true)
    expect(result.emailSent).toBe(true)
    expect(result.smsSent).toBe(true)
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'stored@example.test' }))
    expect(mocks.buildOnboardingEmailHtml).toHaveBeenCalledWith(expect.objectContaining({ customerFirstName: 'Stored' }))
    expect(userEqs).toEqual(expect.arrayContaining([['id', USER], ['tenant_id', TENANT]]))
    expect(updateEqs).toEqual(expect.arrayContaining([
      ['id', USER],
      ['tenant_id', TENANT],
      ['onboarding_status', 'pending'],
    ]))
  })

  it('does not email a body address when the stored user has only a phone', async () => {
    userEqs = [['primed']]
    const phoneOnlyEqs: Eq[] = []
    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'tenants') return chain({ single: async () => ({ data: tenantRow, error: null }) })
        if (phoneOnlyEqs.length === 0) {
          return chain({
            eqs: phoneOnlyEqs,
            single: async () => ({ data: { ...storedUser, email: null }, error: null }),
          })
        }
        return chain({ eqs: updateEqs, updateResult: { error: null } })
      },
    })
    mocks.readBody.mockResolvedValue({
      userId: USER,
      tenantId: TENANT,
      email: 'attacker@example.test',
      phone: '+41000000000',
    })
    mocks.requireStaffOrInternal.mockResolvedValue(staff(TENANT))
    const handler = (await import('~/server/api/students/send-onboarding-reminder.post')).default as (event: unknown) => Promise<unknown>
    const result = await handler({}) as { smsSent: boolean; emailSent: boolean }
    expect(result.smsSent).toBe(true)
    expect(result.emailSent).toBe(false)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('rejects a staff caller targeting another tenant before any write', async () => {
    mocks.readBody.mockResolvedValue({ userId: USER, tenantId: OTHER, email: 'stored@example.test' })
    mocks.requireStaffOrInternal.mockResolvedValue(staff(TENANT))
    const handler = (await import('~/server/api/students/send-onboarding-reminder.post')).default as (event: unknown) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('returns not found when the user is not in the authorized tenant', async () => {
    mocks.getSupabaseAdmin.mockReturnValue({
      from: () => chain({
        eqs: userEqs,
        single: async () => ({ data: null, error: { message: 'no row' } }),
      }),
    })
    mocks.readBody.mockResolvedValue({ userId: USER, tenantId: TENANT, email: 'stored@example.test' })
    mocks.requireStaffOrInternal.mockResolvedValue(staff(TENANT))
    const handler = (await import('~/server/api/students/send-onboarding-reminder.post')).default as (event: unknown) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(userEqs).toEqual(expect.arrayContaining([['id', USER], ['tenant_id', TENANT]]))
  })
})

describe('cron onboarding reminders stay on assertCronRequest', () => {
  it('does not adopt staff/internal authorization', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/cron/send-onboarding-reminders.get.ts'), 'utf8')
    expect(src).toContain('assertCronRequest')
    expect(src).not.toContain('requireStaffOrInternal')
  })
})
