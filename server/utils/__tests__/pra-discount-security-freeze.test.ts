/**
 * PR-A DISCOUNT SECURITY FREEZE — C1 / C2 / C3 contract + handler tests.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError, type H3Event } from 'h3'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getAuthenticatedUserWithDbId: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
  getAuthenticatedUserWithDbId: mocks.getAuthenticatedUserWithDbId,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const root = process.cwd()
const migrationPath = resolve(root, 'migrations/20260920_pra_discount_security_freeze.sql')
const managePath = resolve(root, 'server/api/discounts/manage.post.ts')
const applyByIdPath = resolve(root, 'server/api/discounts/apply/[discountId].post.ts')
const applyPendingPath = resolve(root, 'server/api/appointments/apply-discount.post.ts')
const voucherManagePath = resolve(root, 'server/api/vouchers/manage.post.ts')
const voucherCodesManagePath = resolve(root, 'server/api/voucher-codes/manage.post.ts')
const useDiscountsPath = resolve(root, 'composables/useDiscounts.ts')
const paymentServicePath = resolve(root, 'utils/paymentService.ts')
const customerPaymentsPath = resolve(root, 'pages/customer/payments.vue')

const TENANT = '11111111-1111-1111-1111-111111111111'
const OTHER_TENANT = '22222222-2222-2222-2222-222222222222'
const DISCOUNT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const AUTH = 'auth-user'

type Role = 'client' | 'staff' | 'admin' | 'tenant_admin'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules'
      || entry.name === '.git'
      || entry.name === 'dist'
      || entry.name === '.nuxt'
      || entry.name === '.output'
      || entry.name === 'coverage'
    ) continue
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      collectSourceFiles(full, acc)
      continue
    }
    if (/\.(ts|js|vue)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

function createManageSupabase(opts: {
  updates: Record<string, unknown>[]
  inserts: Record<string, unknown>[]
}) {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.update = (payload?: Record<string, unknown>) => {
        if (table === 'discounts' && payload) opts.updates.push(payload)
        return chain
      }
      chain.insert = (payload?: Record<string, unknown> | Record<string, unknown>[]) => {
        const rows = Array.isArray(payload) ? payload : payload ? [payload] : []
        if (table === 'discounts') opts.inserts.push(...rows)
        return chain
      }
      chain.single = async () => ({
        data: { id: DISCOUNT_ID, name: 'kept', usage_count: 3 },
        error: null,
      })
      return chain
    },
  }
}

type Handler = (event: object) => Promise<unknown>
const emptyEvent = {} as H3Event

describe('PR-A C1 — counter freeze migration', () => {
  const sql = read(migrationPath)

  it('creates usage_count and current_redemptions client-mutation triggers', () => {
    expect(sql).toContain('prevent_discounts_usage_count_client_mutation')
    expect(sql).toContain('prevent_voucher_codes_redemptions_client_mutation')
    expect(sql).toContain('BEFORE INSERT OR UPDATE ON public.discounts')
    expect(sql).toContain('BEFORE INSERT OR UPDATE ON public.voucher_codes')
    expect(sql).toContain('Do not apply automatically to production')
  })

  it('allows service_role and non-JWT SQL, blocks client counter changes', () => {
    expect(sql).toContain("jwt_role = 'service_role'")
    expect(sql).toContain("jwt_claim_role = 'service_role'")
    expect(sql).toContain('NEW.usage_count IS DISTINCT FROM OLD.usage_count')
    expect(sql).toContain('NEW.current_redemptions IS DISTINCT FROM OLD.current_redemptions')
    expect(sql).not.toContain("current_user IN ('postgres', 'supabase_admin')")
    expect(sql).not.toContain('discount_usages')
    expect(sql).not.toContain('reserve_discount_usage')
  })

  it('revokes counter UPDATE from authenticated, anon, and PUBLIC', () => {
    expect(sql).toContain(
      'REVOKE UPDATE (usage_count) ON TABLE public.discounts FROM authenticated',
    )
    expect(sql).toContain(
      'REVOKE UPDATE (usage_count) ON TABLE public.discounts FROM anon',
    )
    expect(sql).toContain(
      'REVOKE UPDATE (current_redemptions) ON TABLE public.voucher_codes FROM authenticated',
    )
    expect(sql).toContain(
      'REVOKE UPDATE (current_redemptions) ON TABLE public.voucher_codes FROM anon',
    )
    expect(sql).toContain('NEW.usage_count := 0')
    expect(sql).toContain('NEW.current_redemptions := 0')
  })
})

describe('PR-A C1 — /api/discounts/manage strips counters', () => {
  const managePromise = import('~/server/api/discounts/manage.post') as Promise<{ default: Handler }>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function run(opts: { role: Role; body: Record<string, unknown> }) {
    const updates: Record<string, unknown>[] = []
    const inserts: Record<string, unknown>[] = []
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: AUTH,
      tenant_id: TENANT,
      role: opts.role,
    })
    mocks.getSupabaseAdmin.mockReturnValue(createManageSupabase({ updates, inserts }))
    mocks.readBody.mockResolvedValue(opts.body)
    const { default: handler } = await managePromise
    let result: unknown = null
    let error: { statusCode?: number } | null = null
    try {
      result = await handler(emptyEvent)
    } catch (err: any) {
      error = err
    }
    return { result, error, updates, inserts }
  }

  it('customer cannot mutate usage_count via manage', async () => {
    const { error, updates, inserts } = await run({
      role: 'client',
      body: { id: DISCOUNT_ID, name: 'legitimate edit', usage_count: 999999 },
    })
    expect(error).toMatchObject({ statusCode: 403 })
    expect(updates).toHaveLength(0)
    expect(inserts).toHaveLength(0)
  })

  it('staff malicious usage_count payload is stripped; name still updates', async () => {
    const { error, result, updates } = await run({
      role: 'staff',
      body: { id: DISCOUNT_ID, name: 'legitimate edit', usage_count: 999999, tenant_id: OTHER_TENANT },
    })
    expect(error).toBeNull()
    expect(result).toMatchObject({ success: true })
    expect(updates).toHaveLength(1)
    expect(updates[0]).not.toHaveProperty('usage_count')
    expect(updates[0].name).toBe('legitimate edit')
    expect(updates[0].tenant_id).toBe(TENANT)
  })

  it('admin malicious usage_count payload is stripped', async () => {
    const { error, updates } = await run({
      role: 'admin',
      body: { id: DISCOUNT_ID, name: 'admin edit', usage_count: 999999 },
    })
    expect(error).toBeNull()
    expect(updates[0]).not.toHaveProperty('usage_count')
    expect(updates[0].name).toBe('admin edit')
  })

  it('tenant admin create forces usage_count 0', async () => {
    const { error, inserts } = await run({
      role: 'tenant_admin',
      body: { name: 'new discount', usage_count: 999999, tenant_id: OTHER_TENANT },
    })
    expect(error).toBeNull()
    expect(inserts[0].usage_count).toBe(0)
    expect(inserts[0].tenant_id).toBe(TENANT)
  })
})

describe('PR-A C1 — voucher manage / voucher-codes manage source contracts', () => {
  it('vouchers/manage does not accept client usage_count', () => {
    const src = read(voucherManagePath)
    expect(src).not.toMatch(/'usage_count'/)
    expect(src).toContain('usage_count: 0')
  })

  it('voucher-codes/manage strips current_redemptions on update', () => {
    const src = read(voucherCodesManagePath)
    expect(src).toContain('stripVoucherCurrentRedemptions')
    expect(src).toContain('writableUpdates')
  })

  it('discounts/manage strips usage_count and forces tenant from session', () => {
    const src = read(managePath)
    expect(src).toContain('stripDiscountUsageCount')
    expect(src).toContain('usage_count: 0')
    expect(src).toContain('tenant_id: authUser.tenant_id')
    expect(src).toContain("authUser.role || ''")
  })
})

describe('PR-A C2 — /api/discounts/apply/:id disabled', () => {
  const applyPromise = import('~/server/api/discounts/apply/[discountId].post') as Promise<{
    default: Handler
  }>

  it('route source does not write usage_count', () => {
    const src = read(applyByIdPath)
    expect(src).toContain('statusCode: 410')
    expect(src).not.toContain(".from('discounts')")
    expect(src).not.toContain('usage_count:')
    expect(src).not.toContain('getSupabaseAdmin')
  })

  it('POST returns 410 and does not mutate counters', async () => {
    mocks.getSupabaseAdmin.mockReturnValue({
      from() {
        throw new Error('C2 must not touch the database')
      },
    })
    const { default: handler } = await applyPromise
    await expect(handler(emptyEvent)).rejects.toMatchObject({
      statusCode: 410,
    })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('no remaining callers of /api/discounts/apply/', () => {
    const files = collectSourceFiles(root)
    const callers = files.filter((file) => {
      if (file.endsWith('discounts/apply/[discountId].post.ts')) return false
      if (file.endsWith('pra-discount-security-freeze.test.ts')) return false
      const src = read(file)
      return src.includes('/api/discounts/apply/')
    })
    expect(callers).toEqual([])
  })

  it('useDiscounts.applyDiscount is disabled and paymentService does not call the route', () => {
    expect(read(useDiscountsPath)).toContain('Discount apply-by-id is disabled')
    expect(read(useDiscountsPath)).not.toContain('/api/discounts/apply/')
    expect(read(paymentServicePath)).not.toContain('/api/discounts/apply/')
    expect(read(paymentServicePath)).not.toContain('applyDiscount(')
  })
})

describe('PR-A C3 — customer pending apply-discount denied', () => {
  const applyDiscountPromise = import('~/server/api/appointments/apply-discount.post') as Promise<{
    default: Handler
  }>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function usersOnlySupabase(profile: { id: string; role: string; tenant_id: string } | null) {
    return {
      from(table: string) {
        if (table !== 'users') {
          throw new Error(`C3 must not touch ${table}`)
        }
        const chain: Record<string, unknown> = {}
        chain.select = () => chain
        chain.eq = () => chain
        chain.single = async () => ({ data: profile, error: profile ? null : { message: 'missing' } })
        return chain
      },
    }
  }

  async function run(opts: {
    auth?: { id: string } | null
    profile?: { id: string; role: string; tenant_id: string } | null
    body?: Record<string, unknown>
  }) {
    mocks.getAuthenticatedUser.mockResolvedValue(opts.auth === undefined ? { id: AUTH } : opts.auth)
    mocks.getSupabaseAdmin.mockReturnValue(
      usersOnlySupabase(
        opts.profile === undefined
          ? { id: 'user-1', role: 'client', tenant_id: TENANT }
          : opts.profile,
      ),
    )
    mocks.readBody.mockResolvedValue({
      paymentId: 'pay-1',
      code: 'SAVE10',
      role: 'admin',
      is_admin: true,
      tenant_id: OTHER_TENANT,
      ...opts.body,
    })
    const { default: handler } = await applyDiscountPromise
    return handler(emptyEvent)
  }

  it('customer receives 403 even with a valid-looking payload and spoofed admin flags', async () => {
    await expect(run({
      profile: { id: 'cust-1', role: 'client', tenant_id: TENANT },
      body: { role: 'admin', is_admin: true, is_staff: true, tenant_id: OTHER_TENANT },
    })).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  })

  it('staff keep existing denial on this route', async () => {
    await expect(run({
      profile: { id: 'staff-1', role: 'staff', tenant_id: TENANT },
    })).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Nur Kunden können Rabattcodes anwenden',
    })
  })

  it('admin keep existing denial on this route', async () => {
    await expect(run({
      profile: { id: 'admin-1', role: 'admin', tenant_id: TENANT },
    })).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Nur Kunden können Rabattcodes anwenden',
    })
  })

  it('cross-tenant identifiers in the body cannot bypass C3', async () => {
    await expect(run({
      profile: { id: 'cust-2', role: 'client', tenant_id: TENANT },
      body: {
        paymentId: 'other-tenant-payment',
        tenant_id: OTHER_TENANT,
        user_id: 'other-user',
        discount_id: 'other-discount',
      },
    })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('unauthenticated request is 401', async () => {
    await expect(run({ auth: null })).rejects.toMatchObject({ statusCode: 401 })
  })

  it('handler source does not trust body role flags and does not write counters', () => {
    const src = read(applyPendingPath)
    expect(src).toContain("role === 'client'")
    expect(src).toContain('statusCode: 403')
    expect(src).toContain('Forbidden')
    expect(src).toContain(".eq('auth_user_id', authUser.id)")
    expect(src).not.toContain('body.role')
    expect(src).not.toContain('usage_count:')
    expect(src).not.toContain('current_redemptions:')
    expect(src).not.toContain(".from('payments')")
  })

  it('customer payments page no longer calls apply-discount', () => {
    const src = read(customerPaymentsPath)
    expect(src).not.toContain('/api/appointments/apply-discount')
    expect(src).toContain('Jetzt bezahlen')
  })
})
