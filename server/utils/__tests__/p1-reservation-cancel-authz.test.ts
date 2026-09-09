import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getClientIP: vi.fn(() => '198.51.100.10'),
  checkRateLimit: vi.fn(async () => ({ allowed: true, retryAfter: 0 })),
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
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock('~/utils/supabase', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/ip-utils', () => ({
  getClientIP: mocks.getClientIP,
}))

vi.mock('~/server/utils/rate-limiter', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type EventHandler = (event: object) => Promise<unknown>

function reservationClient(row: Record<string, unknown> | null, deleteError: unknown = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: row, error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: deleteError })),
        })),
      })),
    })),
  }
}

describe('P1 reservation cancellation ownership', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.getAuthenticatedUser.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 })
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/booking/cancel-reservation.post')).default as EventHandler
  }

  it('does not delete a foreign reservation without proof', async () => {
    mocks.readBody.mockResolvedValue({ reservation_id: 'res-b' })
    mocks.getAuthenticatedUser.mockResolvedValue(null)
    mocks.getSupabaseAdmin.mockReturnValue(
      reservationClient({
        id: 'res-b',
        tenant_id: 'tenant-b',
        guest_email: 'owner@example.com',
        status: 'reserved',
      }),
    )

    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects staff from another tenant', async () => {
    mocks.readBody.mockResolvedValue({ reservation_id: 'res-b' })
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'auth-a',
      tenant_id: 'tenant-a',
      role: 'staff',
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      reservationClient({
        id: 'res-b',
        tenant_id: 'tenant-b',
        guest_email: 'owner@example.com',
        status: 'reserved',
      }),
    )

    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('cancels when guest_email matches', async () => {
    mocks.readBody.mockResolvedValue({
      reservation_id: 'res-a',
      guest_email: 'owner@example.com',
    })
    const client = reservationClient({
      id: 'res-a',
      tenant_id: 'tenant-a',
      guest_email: 'owner@example.com',
      status: 'reserved',
    })
    mocks.getSupabaseAdmin.mockReturnValue(client)

    const result = await handler().then((fn) => fn({}))
    expect(result).toEqual({ success: true })
    expect(mocks.getAuthenticatedUser).not.toHaveBeenCalled()
  })
})
