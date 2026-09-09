import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getClientIP: vi.fn(() => '203.0.113.10'),
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 4, limit: 5, reset: 0 })),
  getSupabaseAdmin: vi.fn(),
  getTenantSecretsSecure: vi.fn(),
  getCustomer: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/ip-utils', () => ({
  getClientIP: mocks.getClientIP,
}))

vi.mock('~/server/utils/rate-limiter', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/get-tenant-secrets-secure', () => ({
  getTenantSecretsSecure: mocks.getTenantSecretsSecure,
}))

vi.mock('~/utils/sariClient', () => ({
  SARIClient: vi.fn().mockImplementation(() => ({
    getCustomer: mocks.getCustomer,
  })),
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type EventHandler = (event: object) => Promise<unknown>

function thenable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.maybeSingle = vi.fn(async () => result)
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder as { eq: ReturnType<typeof vi.fn> }
}

const src = readFileSync(resolve(process.cwd(), 'server/api/sari/lookup-customer.post.ts'), 'utf8')
const modalSrc = readFileSync(
  resolve(process.cwd(), 'components/customer/CourseEnrollmentModal.vue'),
  'utf8',
)

describe('P0-06 SARI public lookup source contract', () => {
  it('stays public and binds tenant from slug, not client tenantId', () => {
    expect(src).not.toContain('requireAuthenticatedUser')
    expect(src).not.toContain('requireTenantStaff')
    expect(src).toContain("eq('slug', tenantSlug)")
    expect(src).not.toContain('body.tenantId')
    expect(modalSrc).toContain('tenantSlug: props.tenantSlug')
  })

  it('strips licenses and collapses enumeration errors', () => {
    expect(src).not.toContain('licenses')
    expect(src).not.toContain('PERSON_NOT_FOUND')
    expect(src).not.toContain('sariStatus')
  })
})

describe('P0-06 sari/lookup-customer', () => {
  let ipNonce = 0

  beforeEach(() => {
    vi.resetModules()
    ipNonce += 1
    mocks.getClientIP.mockReturnValue(`203.0.113.${ipNonce}`)
    mocks.readBody.mockReset()
    mocks.checkRateLimit.mockReset()
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 4, limit: 5, reset: 0 })
    mocks.getSupabaseAdmin.mockReset()
    mocks.getTenantSecretsSecure.mockReset()
    mocks.getCustomer.mockReset()
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/sari/lookup-customer.post')).default as EventHandler
  }

  it('does not require authentication for a public enrollment lookup', async () => {
    mocks.readBody.mockResolvedValue({
      tenantSlug: 'school-a',
      faberid: '12345678',
      birthdate: '1990-01-01',
      tenantId: 'tenant-attacker',
    })
    const tenants = thenable({
      data: { id: 'tenant-a', sari_environment: 'production', is_active: true },
      error: null,
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from: vi.fn(() => tenants) })
    mocks.getTenantSecretsSecure.mockResolvedValue({
      SARI_CLIENT_ID: 'id',
      SARI_CLIENT_SECRET: 'secret',
      SARI_USERNAME: 'user',
      SARI_PASSWORD: 'pass',
    })
    mocks.getCustomer.mockResolvedValue({
      firstname: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
      phone: '+41000',
      address: 'Street 1',
      zip: '8000',
      city: 'Zürich',
      licenses: [{ category: 'B' }],
      birthdate: '1990-01-01',
    })

    await expect((await handler())({})).resolves.toEqual({
      success: true,
      customer: {
        firstname: 'Ada',
        lastname: 'Lovelace',
        email: 'ada@example.com',
        phone: '+41000',
        address: 'Street 1',
        zip: '8000',
        city: 'Zürich',
      },
    })
    expect(tenants.eq).toHaveBeenCalledWith('slug', 'school-a')
    expect(tenants.eq).not.toHaveBeenCalledWith('id', 'tenant-attacker')
    expect(mocks.getTenantSecretsSecure).toHaveBeenCalledWith(
      'tenant-a',
      expect.any(Array),
      'SARI_LOOKUP',
    )
  })

  it('returns the same generic failure for not-found and mismatch without calling through tenant UUID', async () => {
    mocks.readBody.mockResolvedValue({
      tenantSlug: 'school-a',
      faberid: '12345678',
      birthdate: '1990-01-01',
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() =>
        thenable({
          data: { id: 'tenant-a', sari_environment: 'production', is_active: true },
          error: null,
        }),
      ),
    })
    mocks.getTenantSecretsSecure.mockResolvedValue({
      SARI_CLIENT_ID: 'id',
      SARI_CLIENT_SECRET: 'secret',
    })
    mocks.getCustomer.mockRejectedValue(new Error('SARI error: PERSON_NOT_FOUND'))
    const notFound = await (await handler())({})
    mocks.getCustomer.mockRejectedValue(new Error('SARI error: MISMATCH_BIRTHDATE_FABERID'))
    const mismatch = await (await handler())({})
    expect(notFound).toEqual(mismatch)
    expect(notFound).toEqual({
      success: false,
      message: 'Die Angaben konnten nicht bestätigt werden. Bitte prüfe Fahrausweisnummer und Geburtsdatum.',
    })
    expect(notFound).not.toHaveProperty('sariStatus')
  })

  it('rate-limits repeated lookups from the same IP', async () => {
    mocks.readBody.mockResolvedValue({
      tenantSlug: 'school-a',
      faberid: '12345678',
      birthdate: '1990-01-01',
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => thenable({ data: null, error: null })),
    })
    const run = await handler()
    for (let i = 0; i < 5; i += 1) {
      await expect(run({})).rejects.toMatchObject({ statusCode: 404 })
    }
    await expect(run({})).rejects.toMatchObject({ statusCode: 429 })
    expect(mocks.getCustomer).not.toHaveBeenCalled()
  })
})
