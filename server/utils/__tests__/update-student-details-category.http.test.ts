import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getAuthUserFromRequest: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/auth-helper', () => ({
  getAuthUserFromRequest: mocks.getAuthUserFromRequest,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

vi.mock('~/utils/logger', () => {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  return { default: logger, logger }
})

const TENANT = '11111111-1111-1111-1111-111111111111'
const OTHER_TENANT = '22222222-2222-2222-2222-222222222222'
const CALLER = '44444444-4444-4444-4444-444444444444'
const TARGET = '55555555-5555-5555-5555-555555555555'
const AUTH = 'auth-staff'

type UserRow = {
  id: string
  tenant_id: string
  role: string
  category?: string[] | null
}

function createSupabase(opts: {
  caller: UserRow
  target: UserRow
  updates: Record<string, unknown>[]
  audits: Record<string, unknown>[]
}) {
  return {
    from(table: string) {
      const state: {
        op: 'select' | 'update'
        filters: Record<string, unknown>
        payload: Record<string, unknown> | null
      } = { op: 'select', filters: {}, payload: null }

      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = (col: string, val: unknown) => {
        state.filters[col] = val
        return chain
      }
      chain.neq = () => chain
      chain.ilike = () => chain
      chain.maybeSingle = async () => ({ data: null, error: null })
      chain.update = (payload?: Record<string, unknown>) => {
        state.op = 'update'
        state.payload = payload || {}
        if (table === 'users' && payload) opts.updates.push(payload)
        return chain
      }
      chain.single = async () => {
        if (table !== 'users') return { data: null, error: { message: 'not found' } }
        if (state.filters.auth_user_id) return { data: opts.caller, error: null }
        if (state.filters.id) return { data: opts.target, error: null }
        return { data: null, error: { message: 'not found' } }
      }
      chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        const result = state.op === 'update'
          ? { data: [{ id: opts.target.id, ...state.payload }], error: null }
          : { data: null, error: null }
        return Promise.resolve(result).then(resolve, reject)
      }
      return chain
    },
    rpc: async (_fn: string, args: Record<string, unknown>) => {
      opts.audits.push(args)
      return { data: 'audit-id', error: null }
    },
  }
}

type Handler = (event: object) => Promise<{ success: boolean; data: { category?: string[] } | null }>
const handlerPromise = import('~/server/api/staff/update-student-details.post') as Promise<{ default: Handler }>

describe('POST /api/staff/update-student-details category protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthUserFromRequest.mockResolvedValue({ id: AUTH })
  })

  async function run(opts: {
    targetRole: string
    targetTenant?: string
    category?: unknown
    includeCategory?: boolean
    firstName?: string
    extra?: Record<string, unknown>
  }) {
    const updates: Record<string, unknown>[] = []
    const audits: Record<string, unknown>[] = []
    mocks.createClient.mockReturnValue(createSupabase({
      caller: { id: CALLER, tenant_id: TENANT, role: 'staff' },
      target: {
        id: TARGET,
        tenant_id: opts.targetTenant || TENANT,
        role: opts.targetRole,
        category: ['Boot', 'B', 'BE', 'B Automatik'],
      },
      updates,
      audits,
    }))
    const body: Record<string, unknown> = {
      user_id: TARGET,
      ...opts.extra,
    }
    if (opts.firstName !== undefined) body.first_name = opts.firstName
    if (opts.includeCategory !== false && opts.category !== undefined) body.category = opts.category
    if (opts.includeCategory !== false && opts.category === undefined && opts.firstName === undefined) {
      body.category = ['Boot', 'B', 'BE']
    }
    mocks.readBody.mockResolvedValue(body)
    const { default: handler } = await handlerPromise
    const result = await handler({})
    return { result, updates, audits }
  }

  it('allows a same-tenant client category update and audits old and new values', async () => {
    const { result, updates, audits } = await run({
      targetRole: 'client',
      category: ['Boot', 'B', 'BE'],
    })
    expect(result.success).toBe(true)
    expect(updates[0].category).toEqual(['Boot', 'B', 'BE'])
    expect(audits).toEqual([{
      action_type: 'category_change',
      target_id: TARGET,
      performer_id: CALLER,
      reason_text: 'staff/update-student-details',
      old_vals: { category: ['Boot', 'B', 'BE', 'B Automatik'] },
      new_vals: { category: ['Boot', 'B', 'BE'] },
    }])
    expect(audits[0]).not.toHaveProperty('tenant_id')
  })

  it('rejects a same-tenant staff category update', async () => {
    await expect(run({ targetRole: 'staff', category: ['B'] })).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Not authorized - staff/admin only',
    })
  })

  it('rejects a same-tenant admin category update', async () => {
    await expect(run({ targetRole: 'admin', category: ['B'] })).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('rejects a same-tenant superadmin category update without writing', async () => {
    const updates: Record<string, unknown>[] = []
    const audits: Record<string, unknown>[] = []
    mocks.createClient.mockReturnValue(createSupabase({
      caller: { id: CALLER, tenant_id: TENANT, role: 'staff' },
      target: { id: TARGET, tenant_id: TENANT, role: 'superadmin', category: ['B'] },
      updates,
      audits,
    }))
    mocks.readBody.mockResolvedValue({ user_id: TARGET, category: ['Boot'] })
    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(updates).toEqual([])
    expect(audits).toEqual([])
  })

  it('rejects a cross-tenant target', async () => {
    await expect(run({
      targetRole: 'client',
      targetTenant: OTHER_TENANT,
      category: ['B'],
    })).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Dieser Kunde gehört nicht zu eurer Fahrschule',
    })
  })

  it('preserves updates that omit category, including for a staff target', async () => {
    const client = await run({
      targetRole: 'client',
      includeCategory: false,
      firstName: 'Ada',
    })
    expect(client.updates[0]).toEqual({ first_name: 'Ada' })
    expect(client.audits).toEqual([])

    const staff = await run({
      targetRole: 'staff',
      includeCategory: false,
      firstName: 'Sam',
    })
    expect(staff.result.success).toBe(true)
    expect(staff.updates[0]).toEqual({ first_name: 'Sam' })
    expect(staff.updates[0]).not.toHaveProperty('category')
    expect(staff.audits).toEqual([])
  })

  it('ignores a client-supplied performer and does not audit an unchanged category', async () => {
    const { audits } = await run({
      targetRole: 'client',
      category: ['Boot', 'B', 'BE', 'B Automatik'],
      extra: { performed_by: 'forged', tenant_id: OTHER_TENANT },
    })
    expect(audits).toEqual([])
  })

  it('rejects a malformed category before any write', async () => {
    await expect(run({
      targetRole: 'client',
      category: 'B',
    })).rejects.toMatchObject({ statusCode: 400 })
  })
})
