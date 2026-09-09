import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getClientIP: vi.fn(() => '198.51.100.10'),
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

vi.mock('~/server/utils/ip-utils', () => ({
  getClientIP: mocks.getClientIP,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
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
  builder.insert = vi.fn(async () => result)
  builder.maybeSingle = vi.fn(async () => result)
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder
}

const src = readFileSync(resolve(process.cwd(), 'server/api/shop/resolve-customer.post.ts'), 'utf8')

describe('P0-07 shop resolve-customer source contract', () => {
  it('stays public but does not return PII or onboarding tokens', () => {
    expect(src).not.toContain('requireAuthenticatedUser')
    expect(src).not.toContain('magicLinkToken')
    expect(src).not.toContain('first_name, last_name, phone')
    expect(src).toContain('select(\'id\')')
    expect(src).toContain('customer: { id }')
  })
})

describe('P0-07 resolve-customer', () => {
  let ipNonce = 0

  beforeEach(() => {
    vi.resetModules()
    ipNonce += 1
    mocks.getClientIP.mockReturnValue(`198.51.100.${ipNonce}`)
    mocks.readBody.mockReset()
    mocks.getSupabaseAdmin.mockReset()
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/shop/resolve-customer.post')).default as EventHandler
  }

  it('returns only an id for an existing customer, with no profile fields or tokens', async () => {
    mocks.readBody.mockResolvedValue({ tenant_id: 'tenant-a', email: 'ada@example.com' })
    const from = vi.fn((table: string) => {
      if (table === 'tenants') {
        return thenable({ data: { id: 'tenant-a', is_active: true }, error: null })
      }
      return thenable({ data: { id: 'user-existing' }, error: null })
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    const result = await (await handler())({}) as { customer: Record<string, unknown> }
    expect(result).toEqual({ customer: { id: 'user-existing' } })
    expect(result.customer).not.toHaveProperty('phone')
    expect(result.customer).not.toHaveProperty('firstName')
    expect(result.customer).not.toHaveProperty('street')
    expect(result).not.toHaveProperty('metadata')
  })

  it('does not return the onboarding token when creating a guest', async () => {
    mocks.readBody.mockResolvedValue({ tenant_id: 'tenant-a', email: 'new@example.com' })
    const insert = vi.fn(async () => ({ data: null, error: null }))
    const from = vi.fn((table: string) => {
      if (table === 'tenants') {
        return thenable({ data: { id: 'tenant-a', is_active: true }, error: null })
      }
      const builder = thenable({ data: null, error: null })
      builder.insert = insert
      return builder
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    const result = await (await handler())({}) as { customer: Record<string, unknown>; metadata?: unknown }
    expect(result.customer).toEqual({ id: expect.any(String) })
    expect(result.customer).not.toHaveProperty('onboarding_token')
    expect(result.metadata).toBeUndefined()
    expect(JSON.stringify(result)).not.toMatch(/magicLinkToken|onboarding_token/)
    expect(insert).toHaveBeenCalled()
  })
})
