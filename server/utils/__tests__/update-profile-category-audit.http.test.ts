import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireAdminProfile: vi.fn(),
  getSupabaseAdmin: vi.fn(),
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

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const PROFILE = '44444444-4444-4444-4444-444444444444'
const TENANT = '11111111-1111-1111-1111-111111111111'

function createSupabase(opts: {
  currentCategory: string[]
  updates: Record<string, unknown>[]
  audits: Record<string, unknown>[]
}) {
  return {
    from() {
      const state: { op: 'select' | 'update'; payload: Record<string, unknown> | null } = {
        op: 'select',
        payload: null,
      }
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.update = (payload?: Record<string, unknown>) => {
        state.op = 'update'
        state.payload = payload || {}
        if (payload) opts.updates.push(payload)
        return chain
      }
      chain.single = async () => {
        if (state.op === 'update') {
          return { data: { id: PROFILE, category: state.payload?.category, auth_user_id: 'auth' }, error: null }
        }
        return { data: { category: opts.currentCategory }, error: null }
      }
      return chain
    },
    rpc: async (_fn: string, args: Record<string, unknown>) => {
      opts.audits.push(args)
      return { data: 'audit-id', error: null }
    },
    auth: { admin: { updateUserById: vi.fn() } },
  }
}

type Handler = (event: object) => Promise<{ success: boolean }>
const handlerPromise = import('~/server/api/staff/update-profile.post') as Promise<{ default: Handler }>

describe('POST /api/staff/update-profile category audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminProfile.mockResolvedValue({
      id: PROFILE,
      tenant_id: TENANT,
      role: 'staff',
      email: 'samir@example.com',
      auth_user_id: 'auth',
    })
  })

  async function run(body: Record<string, unknown>, currentCategory = ['Boot', 'B', 'BE', 'B Automatik']) {
    const updates: Record<string, unknown>[] = []
    const audits: Record<string, unknown>[] = []
    mocks.getSupabaseAdmin.mockReturnValue(createSupabase({ currentCategory, updates, audits }))
    mocks.readBody.mockResolvedValue(body)
    const { default: handler } = await handlerPromise
    const result = await handler({})
    return { result, updates, audits }
  }

  it('audits a real category change with server actor, target, and endpoint source', async () => {
    const { result, updates, audits } = await run({
      category: ['Boot', 'B', 'BE'],
      performed_by: 'forged-actor',
      tenant_id: 'forged-tenant',
    })
    expect(result.success).toBe(true)
    expect(updates[0].category).toEqual(['Boot', 'B', 'BE'])
    expect(audits).toEqual([{
      action_type: 'category_change',
      target_id: PROFILE,
      performer_id: PROFILE,
      reason_text: 'staff/update-profile',
      old_vals: { category: ['Boot', 'B', 'BE', 'B Automatik'] },
      new_vals: { category: ['Boot', 'B', 'BE'] },
    }])
  })

  it('does not audit when the category list is unchanged', async () => {
    const { audits } = await run({ category: ['Boot', 'B', 'BE', 'B Automatik'] })
    expect(audits).toEqual([])
  })

  it('does not audit a profile save that omits category', async () => {
    const { updates, audits } = await run({ first_name: 'Samir' })
    expect(updates[0]).toEqual({ first_name: 'Samir' })
    expect(audits).toEqual([])
  })
})
