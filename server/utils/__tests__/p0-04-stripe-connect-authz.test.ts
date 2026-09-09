import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getQuery: vi.fn(),
  requireTenantAdmin: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  accountsCreate: vi.fn(),
  accountsRetrieve: vi.fn(),
  accountLinksCreate: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
    getQuery: mocks.getQuery,
  }
})

vi.mock('~/server/utils/require-tenant-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/require-tenant-auth')>()
  return {
    ...actual,
    requireTenantAdmin: mocks.requireTenantAdmin,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('stripe', () => {
  const Stripe = vi.fn().mockImplementation(function StripeMock(this: {
    accounts: { create: unknown; retrieve: unknown }
    accountLinks: { create: unknown }
  }) {
    this.accounts = {
      create: mocks.accountsCreate,
      retrieve: mocks.accountsRetrieve,
    }
    this.accountLinks = { create: mocks.accountLinksCreate }
  })
  return { default: Stripe }
})

type EventHandler = (event: object) => Promise<unknown>

const adminActor = {
  id: 'admin-a',
  tenant_id: 'tenant-a',
  role: 'admin',
  email: 'admin@example.com',
  auth_user_id: 'auth-admin-a',
}

function tenantLookup(row: Record<string, unknown> | null, updateError: unknown = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: row, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ data: null, error: updateError })),
      })),
    })),
  }
}

const createSrc = readFileSync(
  resolve(process.cwd(), 'server/api/stripe/connect/create-account.post.ts'),
  'utf8',
)
const statusSrc = readFileSync(
  resolve(process.cwd(), 'server/api/stripe/connect/account-status.get.ts'),
  'utf8',
)
const uiSrc = readFileSync(resolve(process.cwd(), 'components/StripeConnectOnboarding.vue'), 'utf8')
const migrationSrc = readFileSync(
  resolve(process.cwd(), 'migrations/20260909_stripe_connect_account_id.sql'),
  'utf8',
)

describe('P0-04 Stripe Connect source contract', () => {
  it('authorizes tenant admin before Stripe or body tenantId', () => {
    const handlerStart = createSrc.indexOf('export default defineEventHandler')
    expect(createSrc.indexOf('requireTenantAdmin(event)', handlerStart)).toBeGreaterThan(handlerStart)
    expect(createSrc.indexOf('readBody', handlerStart)).toBeGreaterThan(
      createSrc.indexOf('requireTenantAdmin(event)', handlerStart),
    )
    expect(createSrc).toContain('actor.tenant_id')
    expect(createSrc).not.toContain('body.tenantId')
    expect(statusSrc).toContain('requireTenantAdmin(event)')
    expect(statusSrc).toContain('stripe_connect_account_id')
    expect(statusSrc).not.toContain('query.accountId')
  })

  it('does not echo Stripe provider errors and UI no longer sends accountId', () => {
    expect(createSrc).not.toContain('error.message')
    expect(statusSrc).not.toContain('error.message')
    expect(uiSrc).not.toContain('accountId=')
    expect(uiSrc).not.toContain('tenantId: props.tenantId')
    expect(migrationSrc).toContain('stripe_connect_account_id')
    expect(migrationSrc).toContain('REVOKE UPDATE (stripe_connect_account_id)')
  })
})

describe('P0-04 create-account', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireTenantAdmin.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.accountsCreate.mockReset()
    mocks.accountLinksCreate.mockReset()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_not_live'
    process.env.NUXT_PUBLIC_APP_URL = 'https://app.example.test'
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/stripe/connect/create-account.post')).default as EventHandler
  }

  it('returns 401 for anonymous callers before creating an account', async () => {
    mocks.requireTenantAdmin.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.accountsCreate).not.toHaveBeenCalled()
    expect(mocks.readBody).not.toHaveBeenCalled()
  })

  it('returns 403 for staff that is not a tenant admin', async () => {
    mocks.requireTenantAdmin.mockRejectedValue(createError({ statusCode: 403, statusMessage: 'Forbidden' }))
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.accountsCreate).not.toHaveBeenCalled()
  })

  it('creates an account for the session tenant and ignores body.tenantId', async () => {
    mocks.requireTenantAdmin.mockResolvedValue(adminActor)
    mocks.readBody.mockResolvedValue({ tenantId: 'tenant-attacker', email: 'attacker@example.com' })
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantLookup({
        id: 'tenant-a',
        name: 'School A',
        contact_email: 'school@example.com',
        stripe_connect_account_id: null,
      }),
    )
    mocks.accountsCreate.mockResolvedValue({ id: 'acct_test_123' })
    mocks.accountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.test/setup' })

    await expect((await handler())({})).resolves.toEqual({
      accountId: 'acct_test_123',
      onboardingUrl: 'https://connect.stripe.test/setup',
    })
    expect(mocks.accountsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'school@example.com',
        company: { name: 'School A' },
      }),
    )
    expect(mocks.accountLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({ account: 'acct_test_123' }),
    )
  })

  it('reuses a stored connected account instead of creating another', async () => {
    mocks.requireTenantAdmin.mockResolvedValue(adminActor)
    mocks.readBody.mockResolvedValue({})
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantLookup({
        id: 'tenant-a',
        name: 'School A',
        contact_email: 'school@example.com',
        stripe_connect_account_id: 'acct_existing',
      }),
    )
    mocks.accountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.test/setup' })

    await expect((await handler())({})).resolves.toMatchObject({ accountId: 'acct_existing' })
    expect(mocks.accountsCreate).not.toHaveBeenCalled()
    expect(mocks.accountLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({ account: 'acct_existing' }),
    )
  })

  it('returns a generic 500 when Stripe fails, without provider details', async () => {
    mocks.requireTenantAdmin.mockResolvedValue(adminActor)
    mocks.readBody.mockResolvedValue({})
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantLookup({
        id: 'tenant-a',
        name: 'School A',
        contact_email: 'school@example.com',
        stripe_connect_account_id: null,
      }),
    )
    mocks.accountsCreate.mockRejectedValue(new Error('sk_live_leaked_material invalid'))

    await expect((await handler())({})).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to create Stripe Connect account',
    })
  })
})

describe('P0-04 account-status', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getQuery.mockReset()
    mocks.requireTenantAdmin.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.accountsRetrieve.mockReset()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_not_live'
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/stripe/connect/account-status.get')).default as EventHandler
  }

  it('returns 401 for anonymous callers', async () => {
    mocks.requireTenantAdmin.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.accountsRetrieve).not.toHaveBeenCalled()
  })

  it('does not retrieve a client-supplied accountId', async () => {
    mocks.requireTenantAdmin.mockResolvedValue(adminActor)
    mocks.getQuery.mockReturnValue({ accountId: 'acct_attacker' })
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantLookup({ id: 'tenant-a', stripe_connect_account_id: 'acct_owned' }),
    )
    mocks.accountsRetrieve.mockResolvedValue({
      id: 'acct_owned',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    })

    await expect((await handler())({})).resolves.toMatchObject({
      connected: true,
      id: 'acct_owned',
    })
    expect(mocks.accountsRetrieve).toHaveBeenCalledWith('acct_owned')
    expect(mocks.accountsRetrieve).not.toHaveBeenCalledWith('acct_attacker')
  })

  it('returns connected=false when the tenant has no stored account', async () => {
    mocks.requireTenantAdmin.mockResolvedValue(adminActor)
    mocks.getQuery.mockReturnValue({ accountId: 'acct_attacker' })
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantLookup({ id: 'tenant-a', stripe_connect_account_id: null }),
    )
    await expect((await handler())({})).resolves.toMatchObject({ connected: false, id: null })
    expect(mocks.accountsRetrieve).not.toHaveBeenCalled()
  })
})
