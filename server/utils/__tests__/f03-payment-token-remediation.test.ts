/**
 * F-03 — Payment token get/save auth remediation tests.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUserWithDbId: vi.fn(),
}))

vi.mock('~/server/utils/require-staff-or-internal', () => ({
  isInternalSecretRequest: vi.fn(),
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(),
}))

import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { isInternalSecretRequest } from '~/server/utils/require-staff-or-internal'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  authorizeGetUserPaymentToken,
  authorizeSavePaymentToken,
} from '../payment-token-auth'

const savePath = resolve(process.cwd(), 'server/api/wallee/save-payment-token.post.ts')
const getPath = resolve(process.cwd(), 'server/api/booking/get-user-payment-token.post.ts')
const webhookPath = resolve(process.cwd(), 'server/api/wallee/webhook.post.ts')

function mockPaymentLookup(payment: { user_id: string; tenant_id: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: payment
      ? { id: 'pay-1', user_id: payment.user_id, tenant_id: payment.tenant_id, wallee_transaction_id: 'txn-1' }
      : null,
    error: null,
  })
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle,
        })),
      })),
    })),
  } as any)
  return maybeSingle
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

  it('webhook still calls save-payment-token with internalSecretHeaders', () => {
    const src = readFileSync(webhookPath, 'utf8')
    expect(src).toContain('/api/wallee/save-payment-token')
    expect(src).toContain('internalSecretHeaders()')
  })
})

describe('authorizeSavePaymentToken', () => {
  const event = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers without internal secret (401)', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(false)
    vi.mocked(getAuthenticatedUserWithDbId).mockResolvedValue(null)

    await expect(
      authorizeSavePaymentToken(event, {
        transactionId: 'txn-1',
        userId: 'u-attacker',
        tenantId: 't-attacker',
      })
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('internal secret path binds identity from payment row, not body', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(true)
    mockPaymentLookup({ user_id: 'u-real', tenant_id: 't-real' })

    const actor = await authorizeSavePaymentToken(event, {
      transactionId: 'txn-1',
      userId: 'u-attacker',
      tenantId: 't-attacker',
    })

    expect(actor).toEqual({
      mode: 'internal',
      userId: 'u-real',
      tenantId: 't-real',
      transactionId: 'txn-1',
    })
    expect(getAuthenticatedUserWithDbId).not.toHaveBeenCalled()
  })

  it('internal secret path 404s when payment missing', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(true)
    mockPaymentLookup(null)

    await expect(
      authorizeSavePaymentToken(event, { transactionId: 'txn-missing' })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('owner path 403s when payment belongs to another user', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(false)
    vi.mocked(getAuthenticatedUserWithDbId).mockResolvedValue({
      id: 'u-me',
      tenant_id: 't-me',
      auth_user_id: 'auth-me',
      email: 'me@example.com',
      role: 'customer',
    } as any)
    mockPaymentLookup({ user_id: 'u-other', tenant_id: 't-me' })

    await expect(
      authorizeSavePaymentToken(event, { transactionId: 'txn-1' })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('owner path succeeds when payment matches session', async () => {
    vi.mocked(isInternalSecretRequest).mockReturnValue(false)
    vi.mocked(getAuthenticatedUserWithDbId).mockResolvedValue({
      id: 'u-me',
      tenant_id: 't-me',
      auth_user_id: 'auth-me',
      email: 'me@example.com',
      role: 'customer',
    } as any)
    mockPaymentLookup({ user_id: 'u-me', tenant_id: 't-me' })

    const actor = await authorizeSavePaymentToken(event, {
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
  })
})

describe('authorizeGetUserPaymentToken', () => {
  const event = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers', async () => {
    vi.mocked(getAuthenticatedUserWithDbId).mockResolvedValue(null)
    await expect(authorizeGetUserPaymentToken(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns session db user + tenant (ignores body)', async () => {
    vi.mocked(getAuthenticatedUserWithDbId).mockResolvedValue({
      id: 'u-me',
      tenant_id: 't-me',
      auth_user_id: 'auth-me',
      email: 'me@example.com',
      role: 'customer',
    } as any)

    await expect(authorizeGetUserPaymentToken(event)).resolves.toEqual({
      mode: 'owner',
      userId: 'u-me',
      tenantId: 't-me',
    })
  })
})
