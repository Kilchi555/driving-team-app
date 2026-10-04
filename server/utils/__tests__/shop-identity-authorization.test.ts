import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { publicShopSessionPrincipalId } from '../shop-public-identity'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getHeader: vi.fn(() => '198.51.100.10'),
  getClientIP: vi.fn(() => '198.51.100.10'),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUserWithDbId: vi.fn(),
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
    getHeader: mocks.getHeader,
  }
})

vi.mock('~/server/utils/ip-utils', () => ({
  getClientIP: mocks.getClientIP,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUserWithDbId: mocks.getAuthenticatedUserWithDbId,
}))

vi.mock('~/server/utils/rate-limiter', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '11111111-1111-4111-8111-111111111111'
const OTHER_TENANT = '22222222-2222-4222-8222-222222222222'
const VICTIM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const USER_A = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const USER_B = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const PRODUCT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const PAYMENT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

type EventHandler = (event: object) => Promise<unknown>

const fakeEvent = {
  node: { req: { headers: {}, socket: { remoteAddress: '198.51.100.10' } } },
}

function thenable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.in = vi.fn(chain)
  builder.insert = vi.fn(async () => result)
  builder.update = vi.fn(async () => result)
  builder.maybeSingle = vi.fn(async () => result)
  builder.single = vi.fn(async () => result)
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder
}

describe('publicShopSessionPrincipalId', () => {
  it('binds same-tenant client and student only', () => {
    expect(publicShopSessionPrincipalId(
      { id: USER_A, tenant_id: TENANT, role: 'client' },
      TENANT,
    )).toBe(USER_A)
    expect(publicShopSessionPrincipalId(
      { id: USER_A, tenant_id: TENANT, role: 'student' },
      TENANT,
    )).toBe(USER_A)
  })

  it('does not bind staff, admin, tenant_admin, or cross-tenant clients', () => {
    expect(publicShopSessionPrincipalId(
      { id: USER_A, tenant_id: TENANT, role: 'staff' },
      TENANT,
    )).toBeNull()
    expect(publicShopSessionPrincipalId(
      { id: USER_A, tenant_id: TENANT, role: 'admin' },
      TENANT,
    )).toBeNull()
    expect(publicShopSessionPrincipalId(
      { id: USER_A, tenant_id: TENANT, role: 'tenant_admin' },
      TENANT,
    )).toBeNull()
    expect(publicShopSessionPrincipalId(
      { id: USER_A, tenant_id: OTHER_TENANT, role: 'client' },
      TENANT,
    )).toBeNull()
  })
})

describe('shop identity source contracts', () => {
  it('create-payment ignores body user_id and binds session principal only', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/shop/create-payment.post.ts'), 'utf8')
    expect(src).toContain('getAuthenticatedUserWithDbId')
    expect(src).toContain('publicShopSessionPrincipalId')
    expect(src).toContain('user_id: paymentUserId')
    expect(src).not.toContain('user_id: userId')
    expect(src).not.toMatch(/const userId = user_id/)
  })

  it('find-or-create does not update PII on contact match', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/shop/find-or-create-guest-user.post.ts'), 'utf8')
    expect(src).toContain('getAuthenticatedUserWithDbId')
    expect(src).toContain('publicShopSessionPrincipalId')
    expect(src).not.toMatch(/\.update\(/)
    expect(src).toContain("code === '23505'")
    expect(src).toContain('id: null')
  })

  it('resolve-customer does not return existing account ids from email', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/shop/resolve-customer.post.ts'), 'utf8')
    expect(src).toContain('getAuthenticatedUserWithDbId')
    expect(src).toContain('publicShopSessionPrincipalId')
    expect(src).toContain("code === '23505'")
    expect(src).not.toContain('return publicCustomer(existingUser.id)')
    expect(src).not.toContain('return publicCustomer(retryUser.id)')
  })
})

describe('shop identity HTTP attacks', () => {
  let ipNonce = 0

  beforeEach(() => {
    vi.resetModules()
    ipNonce += 1
    mocks.getClientIP.mockReturnValue(`198.51.100.${ipNonce}`)
    mocks.getHeader.mockReturnValue(`198.51.100.${ipNonce}`)
    mocks.readBody.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.getAuthenticatedUserWithDbId.mockReset()
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue(null)
    mocks.checkRateLimit.mockResolvedValue({ allowed: true })
  })

  async function resolveHandler(): Promise<EventHandler> {
    return (await import('../../api/shop/resolve-customer.post')).default as EventHandler
  }

  async function findOrCreateHandler(): Promise<EventHandler> {
    return (await import('../../api/shop/find-or-create-guest-user.post')).default as EventHandler
  }

  async function createPaymentHandler(): Promise<EventHandler> {
    return (await import('../../api/shop/create-payment.post')).default as EventHandler
  }

  function shopPaymentBody(overrides: Record<string, unknown> = {}) {
    return {
      user_id: VICTIM,
      tenant_id: TENANT,
      total_amount_rappen: 10000,
      products_price_rappen: 10000,
      discount_amount_rappen: 0,
      metadata: { products: [{ id: PRODUCT, quantity: 1 }] },
      ...overrides,
    }
  }

  function createPaymentSupabase(opts?: { insert?: ReturnType<typeof vi.fn> }) {
    const captured = { insertPayload: null as Record<string, unknown> | null }
    const insert = opts?.insert || vi.fn(async (payload: Record<string, unknown>) => {
      captured.insertPayload = payload
      return {
        data: {
          id: PAYMENT,
          total_amount_rappen: 10000,
          payment_status: 'pending',
          tenant_id: TENANT,
          payment_method: 'wallee',
        },
        error: null,
      }
    })

    const from = vi.fn((table: string) => {
      if (table === 'tenants') {
        return thenable({ data: { id: TENANT, is_active: true }, error: null })
      }
      if (table === 'products') {
        return thenable({
          data: [{
            id: PRODUCT,
            name: 'Gutschein',
            price_rappen: 10000,
            is_voucher: false,
            allow_custom_amount: false,
            is_active: true,
            show_in_shop: true,
            tenant_id: TENANT,
          }],
          error: null,
        })
      }
      if (table === 'payments') {
        const builder = thenable({
          data: {
            id: PAYMENT,
            total_amount_rappen: 10000,
            payment_status: 'pending',
            tenant_id: TENANT,
            payment_method: 'wallee',
          },
          error: null,
        })
        builder.insert = (payload: Record<string, unknown>) => {
          const result = insert(payload)
          return {
            select: () => ({
              single: async () => result,
            }),
          }
        }
        return builder
      }
      return thenable({ data: null, error: null })
    })

    mocks.getSupabaseAdmin.mockReturnValue({ from })
    return { insert, captured }
  }

  it('Attack 1: resolve-customer does not disclose victim users.id from email', async () => {
    mocks.readBody.mockResolvedValue({ tenant_slug: 'demo-school', email: 'victim@example.com' })
    const insert = vi.fn()
    const from = vi.fn((table: string) => {
      if (table === 'tenants') {
        return thenable({ data: { id: TENANT, is_active: true }, error: null })
      }
      const builder = thenable({ data: { id: VICTIM }, error: null })
      builder.insert = insert
      return builder
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })

    const result = await (await resolveHandler())(fakeEvent) as { customer: { id: unknown } }
    expect(result.customer.id).toBeNull()
    expect(JSON.stringify(result)).not.toContain(VICTIM)
    expect(insert).not.toHaveBeenCalled()
  })

  it('Attack 2: find-or-create does not return or attach an existing account', async () => {
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      email: 'victim@example.com',
      first_name: 'Attacker',
      phone: '0790000000',
    })
    const update = vi.fn()
    const insert = vi.fn()
    const from = vi.fn((table: string) => {
      if (table === 'tenants') {
        return thenable({ data: { id: TENANT, is_active: true }, error: null })
      }
      const builder = thenable({ data: { id: VICTIM }, error: null })
      builder.update = update
      builder.insert = insert
      return builder
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })

    const result = await (await findOrCreateHandler())(fakeEvent) as { data: { id: unknown, created: boolean } }
    expect(result.data).toEqual({ id: null, created: false })
    expect(JSON.stringify(result)).not.toContain(VICTIM)
    expect(update).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('Attack 3: forged body.user_id is ignored for public guest payments', async () => {
    mocks.readBody.mockResolvedValue(shopPaymentBody())
    const { insert } = createPaymentSupabase()

    await (await createPaymentHandler())(fakeEvent)
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert.mock.calls[0][0].user_id).toBeNull()
    expect(insert.mock.calls[0][0].user_id).not.toBe(VICTIM)
  })

  it('Attack 4: logged-in A plus body user_id B binds A', async () => {
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue({
      id: USER_A,
      tenant_id: TENANT,
      role: 'client',
      auth_user_id: 'auth-a',
    })
    mocks.readBody.mockResolvedValue(shopPaymentBody({ user_id: USER_B }))
    const { insert } = createPaymentSupabase()

    await (await createPaymentHandler())(fakeEvent)
    expect(insert.mock.calls[0][0].user_id).toBe(USER_A)
    expect(insert.mock.calls[0][0].user_id).not.toBe(USER_B)
  })

  it('Attack 5: cross-tenant session is not bound to the shop tenant', async () => {
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue({
      id: USER_A,
      tenant_id: OTHER_TENANT,
      role: 'client',
      auth_user_id: 'auth-a',
    })
    mocks.readBody.mockResolvedValue(shopPaymentBody({ user_id: USER_A }))
    const { insert } = createPaymentSupabase()

    await (await createPaymentHandler())(fakeEvent)
    expect(insert.mock.calls[0][0].user_id).toBeNull()
    expect(insert.mock.calls[0][0].tenant_id).toBe(TENANT)
  })

  it('Attack 6: staff session is not bound as customer', async () => {
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue({
      id: USER_A,
      tenant_id: TENANT,
      role: 'staff',
      auth_user_id: 'auth-staff',
    })
    mocks.readBody.mockResolvedValue(shopPaymentBody({ user_id: USER_A }))
    const { insert } = createPaymentSupabase()

    await (await createPaymentHandler())(fakeEvent)
    expect(insert.mock.calls[0][0].user_id).toBeNull()
  })

  it('Attack 7: admin and tenant_admin sessions are not bound as customer', async () => {
    for (const role of ['admin', 'tenant_admin'] as const) {
      vi.resetModules()
      mocks.getAuthenticatedUserWithDbId.mockResolvedValue({
        id: USER_A,
        tenant_id: TENANT,
        role,
        auth_user_id: `auth-${role}`,
      })
      mocks.readBody.mockResolvedValue(shopPaymentBody({ user_id: USER_A }))
      const { insert } = createPaymentSupabase()
      await (await createPaymentHandler())(fakeEvent)
      expect(insert.mock.calls[0][0].user_id).toBeNull()
    }
  })

  it('Attack 8: 23505 does not fall back to the existing account id', async () => {
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      email: 'victim@example.com',
    })
    const from = vi.fn((table: string) => {
      if (table === 'tenants') {
        return thenable({ data: { id: TENANT, is_active: true }, error: null })
      }
      const builder = thenable({ data: null, error: null })
      builder.insert = vi.fn(async () => ({ data: null, error: { code: '23505', message: 'duplicate' } }))
      builder.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
      return builder
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })

    const created = await (await findOrCreateHandler())(fakeEvent) as { data: { id: unknown } }
    expect(created.data.id).toBeNull()
    expect(JSON.stringify(created)).not.toContain(VICTIM)

    mocks.readBody.mockResolvedValue({ tenant_slug: 'demo-school', email: 'victim@example.com' })
    const resolveFrom = vi.fn((table: string) => {
      if (table === 'tenants') {
        return thenable({ data: { id: TENANT, is_active: true }, error: null })
      }
      const builder = thenable({ data: null, error: null })
      builder.insert = vi.fn(async () => ({ data: null, error: { code: '23505', message: 'duplicate' } }))
      return builder
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from: resolveFrom })
    const resolved = await (await resolveHandler())(fakeEvent) as { customer: { id: unknown } }
    expect(resolved.customer.id).toBeNull()
    expect(JSON.stringify(resolved)).not.toContain(VICTIM)
  })

  it('Attack 9: public request does not mutate victim PII', async () => {
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      email: 'victim@example.com',
      first_name: 'Attacker',
      last_name: 'Person',
      phone: '0790000000',
    })
    const update = vi.fn()
    const from = vi.fn((table: string) => {
      if (table === 'tenants') {
        return thenable({ data: { id: TENANT, is_active: true }, error: null })
      }
      const builder = thenable({
        data: { id: VICTIM, first_name: 'Victim', last_name: 'User', phone: '0781111111' },
        error: null,
      })
      builder.update = update
      return builder
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })

    await (await findOrCreateHandler())(fakeEvent)
    expect(update).not.toHaveBeenCalled()
  })
})
