import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
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
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '11111111-1111-1111-1111-111111111111'
const CLIENT = '33333333-3333-3333-3333-333333333333'
const AUTH = 'auth-client'

function createUsersSupabase(profile: { id: string; role: string; tenant_id: string } | null) {
  return {
    from(table: string) {
      if (table !== 'users') {
        throw new Error(`apply-discount freeze must not query ${table}`)
      }
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.single = async () => ({
        data: profile,
        error: profile ? null : { message: 'not found' },
      })
      return chain
    },
  }
}

type Handler = (event: object) => Promise<unknown>

const handlerPromise = import('~/server/api/appointments/apply-discount.post') as Promise<{ default: Handler }>

describe('POST /api/appointments/apply-discount PR-A C3 freeze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedUser.mockResolvedValue({ id: AUTH })
    mocks.readBody.mockResolvedValue({ paymentId: 'pay-1', code: 'TENPCT' })
  })

  async function run(opts?: { userProfile?: { id: string; role: string; tenant_id: string } | null }) {
    mocks.getSupabaseAdmin.mockReturnValue(
      createUsersSupabase(
        opts?.userProfile === undefined
          ? { id: CLIENT, role: 'client', tenant_id: TENANT }
          : opts.userProfile,
      ),
    )
    const { default: handler } = await handlerPromise
    return handler({})
  }

  it('owning customer is forbidden', async () => {
    await expect(run({})).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  })

  it('staff keep existing denial', async () => {
    await expect(run({
      userProfile: { id: CLIENT, role: 'staff', tenant_id: TENANT },
    })).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Nur Kunden können Rabattcodes anwenden',
    })
  })

  it('admin keep existing denial', async () => {
    await expect(run({
      userProfile: { id: CLIENT, role: 'admin', tenant_id: TENANT },
    })).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Nur Kunden können Rabattcodes anwenden',
    })
  })
})

describe('apply-discount Slice 2 / C3 contract', () => {
  const src = readFileSync(resolve(process.cwd(), 'server/api/appointments/apply-discount.post.ts'), 'utf8')

  it('derives role from the users row and denies customers with 403', () => {
    expect(src).toContain('getAuthenticatedUser')
    expect(src).toContain(".eq('auth_user_id', authUser.id)")
    expect(src).toContain("role === 'client'")
    expect(src).toContain("statusMessage: 'Forbidden'")
    expect(src).toContain('Nur Kunden können Rabattcodes anwenden')
    expect(src).not.toContain('body.role')
    expect(src).not.toContain('quoteStaffAppointmentOffer')
  })
})
