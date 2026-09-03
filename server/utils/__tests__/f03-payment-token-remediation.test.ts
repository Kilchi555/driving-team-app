/**
 * F-03 — Payment token get/save auth remediation tests.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { isInternalSecretRequest } from '~/server/utils/require-staff-or-internal'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  authorizeGetUserPaymentToken,
  authorizeSavePaymentToken,
} from '../payment-token-auth'

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUserWithDbId: vi.fn(),
}))

vi.mock('~/server/utils/require-staff-or-internal', () => ({
  isInternalSecretRequest: vi.fn(),
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(),
}))

const savePath = resolve(process.cwd(), 'server/api/wallee/save-payment-token.post.ts')
const getPath = resolve(process.cwd(), 'server/api/booking/get-user-payment-token.post.ts')
const webhookPath = resolve(process.cwd(), 'server/api/wallee/webhook.post.ts')

type PaymentRow = { user_id: string; tenant_id: string; wallee_space_id?: string }

function mockPaymentLookup(payments: PaymentRow[] | null) {
  const limit = vi.fn().mockResolvedValue({
    data: payments
      ? payments.map((p, i) => ({
          id: `pay-${i + 1}`,
          user_id: p.user_id,
          tenant_id: p.tenant_id,
          wallee_transaction_id: 'txn-1',
          wallee_space_id: p.wallee_space_id ?? 'space-1',
        }))
      : [],
    error: null,
  })

  const eq = vi.fn()
  const chain = {
    eq: (...args: unknown[]) => {
      eq(...args)
      return chain
    },
    limit,
  }

  vi.mocked(getSupabaseAdmin).mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => chain),
    })),
  } as unknown as ReturnType<typeof getSupabaseAdmin>)

  return { eq, limit }
}

const emptyEvent = {} as Parameters<typeof authorizeSavePaymentToken>[0]

const sessionUser = {
  id: 'u-me',
  tenant_id: 't-me',
  auth_user_id: 'auth-me',
  email: 'me@example.com',
  role: 'customer',
}

describe('F-03 contract — endpoints require auth helpers', () => {
  it('save-payment-token uses authorizeSavePaymentToken and does not trust body alone', () => {
    const src = readFileSync(savePath, 'utf8')
    expect(src).toContain('authorizeSavePaymentToken')
    expect(src).toContain('payment-token-auth')
    expect(src).not.toMatch(/const \{ transactionId, userId, tenantId \} = body/)
  })

  it('get-user-payment-token uses authorizeGetUserPaymentToken', () => {
    const src = readFileSync(getPath, 'utf8')
    expect(src).toContain('authorizeGetUserPaymentToken')
    expect(src).not.toMatch(/const \{ userId, tenantId \} = body/)
  })

  it('webhook passes spaceId with internal save-payment-token call', () => {
    const src = readFileSync(webhookPath, 'utf8')
    expect(src).toContain('/api/wallee/save-payment-token')
    expect(src).toContain('internalSecretHeaders()')
    expect(src).toContain('spaceId: payment.wallee_space_id')
  })
})

describe('authorizeSavePaymentToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers without internal secret (401)', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(false)
    vi.mocked(getAuthenticatedUserWithDbId).mockResolvedValue(null)

    await expect(
      authorizeSavePaymentToken(emptyEvent, {
        transactionId: 'txn-1',
        userId: 'u-attacker',
        tenantId: 't-attacker',
      })
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('internal secret path requires tenantId or spaceId disambiguator', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(true)

    await expect(
      authorizeSavePaymentToken(emptyEvent, { transactionId: 'txn-1' })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('internal secret path binds identity from payment row scoped by tenant', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(true)
    const { eq } = mockPaymentLookup([{ user_id: 'u-real', tenant_id: 't-real' }])

    const actor = await authorizeSavePaymentToken(emptyEvent, {
      transactionId: 'txn-1',
      userId: 'u-attacker',
      tenantId: 't-real',
      spaceId: 'space-1',
    })

    expect(actor).toEqual({
      mode: 'internal',
      userId: 'u-real',
      tenantId: 't-real',
      transactionId: 'txn-1',
    })
    expect(eq).toHaveBeenCalledWith('wallee_transaction_id', 'txn-1')
    expect(eq).toHaveBeenCalledWith('tenant_id', 't-real')
    expect(eq).toHaveBeenCalledWith('wallee_space_id', 'space-1')
    expect(getAuthenticatedUserWithDbId).not.toHaveBeenCalled()
  })

  it('internal secret path 404s when payment missing', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(true)
    mockPaymentLookup([])

    await expect(
      authorizeSavePaymentToken(emptyEvent, { transactionId: 'txn-missing', tenantId: 't-1' })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('internal secret path 409s on ambiguous multi-match', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(true)
    mockPaymentLookup([
      { user_id: 'u-a', tenant_id: 't-a' },
      { user_id: 'u-b', tenant_id: 't-b' },
    ])

    await expect(
      authorizeSavePaymentToken(emptyEvent, { transactionId: 'txn-1', spaceId: 'space-1' })
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('owner path scopes by session tenant and 403s foreign user', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(false)
    vi.mocked(getAuthenticatedUserWithDbId).mockResolvedValue(sessionUser)
    mockPaymentLookup([{ user_id: 'u-other', tenant_id: 't-me' }])

    await expect(
      authorizeSavePaymentToken(emptyEvent, { transactionId: 'txn-1' })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('owner path succeeds when payment matches session', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(false)
    vi.mocked(getAuthenticatedUserWithDbId).mockResolvedValue(sessionUser)
    const { eq } = mockPaymentLookup([{ user_id: 'u-me', tenant_id: 't-me' }])

    const actor = await authorizeSavePaymentToken(emptyEvent, {
      transactionId: 'txn-1',
      userId: 'ignored',
      tenantId: 'ignored',
    })

    expect(actor).toEqual({
      mode: 'owner',
      userId: 'u-me',
      tenantId: 't-me',
      transactionId: 'txn-1',
    })
    expect(eq).toHaveBeenCalledWith('tenant_id', 't-me')
  })
})

describe('authorizeGetUserPaymentToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers', async () => {
    vi.mocked(getAuthenticatedUserWithDbId).mockResolvedValue(null)
    await expect(authorizeGetUserPaymentToken(emptyEvent)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns session db user + tenant (ignores body)', async () => {
    vi.mocked(getAuthenticatedUserWithDbId).mockResolvedValue(sessionUser)

    await expect(authorizeGetUserPaymentToken(emptyEvent)).resolves.toEqual({
      mode: 'owner',
      userId: 'u-me',
      tenantId: 't-me',
    })
  })
})
