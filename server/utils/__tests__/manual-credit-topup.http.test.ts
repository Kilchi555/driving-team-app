import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  requireAdminProfile: vi.fn(),
  logAudit: vi.fn(async () => undefined),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/auth', () => ({
  requireAdminProfile: mocks.requireAdminProfile,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/audit', () => ({
  logAudit: mocks.logAudit,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OTHER_TENANT = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const USER = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const ADMIN = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
const KEY = '11111111-1111-4111-8111-111111111111'

type Handler = (event: object) => Promise<Record<string, unknown>>

const handlerPromise = import('../../api/admin/credit/manual-topup.post') as Promise<{ default: Handler }>

function clientFor(user: { id: string; tenant_id: string; role: string } | null, rpc?: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>) {
  const rpcCalls: Array<Record<string, unknown>> = []
  return {
    rpcCalls,
    client: {
      from(table: string) {
        if (table !== 'users') throw new Error(`unexpected table ${table}`)
        return {
          select() {
            return {
              eq() {
                return { maybeSingle: async () => ({ data: user, error: null }) }
              },
            }
          },
        }
      },
      async rpc(name: string, args: Record<string, unknown>) {
        rpcCalls.push({ name, ...args })
        if (!rpc) return { data: null, error: { message: 'rpc should not run' } }
        return rpc(name, args)
      },
    },
  }
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    user_id: USER,
    amount_rappen: 1_000_000,
    note: 'Bar erhalten',
    idempotency_key: KEY,
    ...overrides,
  }
}

describe('POST /api/admin/credit/manual-topup', () => {
  beforeEach(() => {
    mocks.readBody.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.requireAdminProfile.mockReset()
    mocks.logAudit.mockClear()
    mocks.requireAdminProfile.mockResolvedValue({
      id: ADMIN,
      auth_user_id: 'auth-admin',
      tenant_id: TENANT,
      role: 'admin',
    })
  })

  it('rejects a non-admin before any credit call', async () => {
    mocks.requireAdminProfile.mockRejectedValue(createError({ statusCode: 403, statusMessage: 'Kein Admin.' }))
    mocks.readBody.mockResolvedValue(body())
    const db = clientFor({ id: USER, tenant_id: TENANT, role: 'client' })
    mocks.getSupabaseAdmin.mockReturnValue(db.client)
    const handler = (await handlerPromise).default
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(db.rpcCalls).toHaveLength(0)
  })

  it('rejects an empty idempotency key before looking up the customer', async () => {
    mocks.readBody.mockResolvedValue(body({ idempotency_key: '  ' }))
    const db = clientFor({ id: USER, tenant_id: TENANT, role: 'client' })
    mocks.getSupabaseAdmin.mockReturnValue(db.client)
    const handler = (await handlerPromise).default
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('rejects CHF 10000.01 before a booking', async () => {
    mocks.readBody.mockResolvedValue(body({ amount_rappen: 1_000_001 }))
    const db = clientFor({ id: USER, tenant_id: TENANT, role: 'client' })
    mocks.getSupabaseAdmin.mockReturnValue(db.client)
    const handler = (await handlerPromise).default
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(db.rpcCalls).toHaveLength(0)
  })

  it('rejects a customer from another tenant', async () => {
    mocks.readBody.mockResolvedValue(body())
    const db = clientFor({ id: USER, tenant_id: OTHER_TENANT, role: 'client' })
    mocks.getSupabaseAdmin.mockReturnValue(db.client)
    const handler = (await handlerPromise).default
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(db.rpcCalls).toHaveLength(0)
  })

  it('allows CHF 10000 and passes the idempotency key to the database function', async () => {
    mocks.readBody.mockResolvedValue(body())
    const db = clientFor({ id: USER, tenant_id: TENANT, role: 'client' }, async () => ({
      data: [{
        applied: true,
        already_applied: false,
        amount_rappen: 1_000_000,
        balance_rappen: 1_000_000,
        transaction_id: 'tx-1',
      }],
      error: null,
    }))
    mocks.getSupabaseAdmin.mockReturnValue(db.client)
    const handler = (await handlerPromise).default
    const result = await handler({})
    expect(result).toMatchObject({
      success: true,
      balance_rappen: 1_000_000,
      credited_rappen: 1_000_000,
      replayed: false,
    })
    expect(db.rpcCalls).toEqual([expect.objectContaining({
      name: 'apply_manual_credit_topup',
      p_tenant_id: TENANT,
      p_user_id: USER,
      p_idempotency_key: KEY,
      p_amount: 1_000_000,
      p_created_by: ADMIN,
    })])
  })
})
