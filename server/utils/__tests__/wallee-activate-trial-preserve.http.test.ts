/**
 * Phase 1: Wallee activate must not shorten legacy or registration_carry Stripe trials.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  subscriptionsUpdate: vi.fn(),
  encryptSecret: vi.fn((v: string) => `enc:${v}`),
  ensureWalleeWebhook: vi.fn(async () => ({ success: true })),
  invalidateWalleeConfigCache: vi.fn(),
  clearProviderCache: vi.fn(),
  sendEmail: vi.fn(async () => undefined),
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

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/encryption', () => ({
  encryptSecret: mocks.encryptSecret,
}))

vi.mock('~/server/utils/wallee-webhook-setup', () => ({
  ensureWalleeWebhook: mocks.ensureWalleeWebhook,
}))

vi.mock('~/server/utils/wallee-config', () => ({
  invalidateWalleeConfigCache: mocks.invalidateWalleeConfigCache,
}))

vi.mock('~/server/payment-providers/factory', () => ({
  clearProviderCache: mocks.clearProviderCache,
}))

vi.mock('~/server/utils/email', () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock('stripe', () => {
  class StripeMock {
    subscriptions = {
      retrieve: mocks.subscriptionsRetrieve,
      update: mocks.subscriptionsUpdate,
    }
  }
  return { default: StripeMock }
})

const TENANT = '11111111-1111-1111-1111-111111111111'
const SUB = 'sub_legacy_wallee_trial'
const LEGACY_TRIAL_END = Math.floor(Date.parse('2026-11-20T00:00:00.000Z') / 1000)

function adminClient(opts: { metadata?: Record<string, string> }) {
  let tenantsSelectCount = 0
  return {
    from(table: string) {
      if (table === 'tenants') {
        return {
          update: () => ({
            eq: async () => ({ error: null }),
          }),
          select: () => ({
            eq: () => ({
              single: async () => {
                tenantsSelectCount += 1
                // First select after activate path: stripe_subscription_id for Stripe inspect
                // Second: contact_email for notify
                if (tenantsSelectCount === 1) {
                  return {
                    data: { stripe_subscription_id: SUB },
                    error: null,
                  }
                }
                return {
                  data: { contact_email: 'tenant@example.com', name: 'Test FS' },
                  error: null,
                }
              },
            }),
          }),
        }
      }
      if (table === 'tenant_secrets') {
        return {
          upsert: async () => ({ error: null }),
        }
      }
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      }
    },
  }
}

describe('POST /api/admin/wallee-activate trial preservation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_activate'
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'admin-1',
      role: 'super_admin',
    })
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      wallee_space_id: '123',
      wallee_user_id: '456',
      wallee_secret_key: 'secret',
    })
    mocks.subscriptionsUpdate.mockResolvedValue({})
  })

  async function loadHandler() {
    return (await import('../../api/admin/wallee-activate.post')).default as (e: object) => Promise<unknown>
  }

  it('does not call trial_end:now for legacy trialing subscription (absent trial_source)', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(adminClient({}))
    mocks.subscriptionsRetrieve.mockResolvedValue({
      id: SUB,
      status: 'trialing',
      trial_end: LEGACY_TRIAL_END,
      metadata: {},
    })

    await (await loadHandler())({})

    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith(SUB)
    expect(mocks.subscriptionsUpdate).not.toHaveBeenCalled()
  })

  it('does not call trial_end:now for registration_carry trialing subscription', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(adminClient({}))
    mocks.subscriptionsRetrieve.mockResolvedValue({
      id: SUB,
      status: 'trialing',
      trial_end: LEGACY_TRIAL_END,
      metadata: { trial_source: 'registration_carry' },
    })

    await (await loadHandler())({})

    expect(mocks.subscriptionsUpdate).not.toHaveBeenCalled()
  })
})
