/**
 * Phase 1: registration-trial carry-through + no fixed Wallee Stripe trial.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SAAS_TRIAL_DAYS } from '~/utils/saas-trial'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getHeader: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  checkoutCreate: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  customersCreate: vi.fn(),
  customersRetrieve: vi.fn(),
  pricesRetrieve: vi.fn(),
  lastSessionParams: null as Record<string, unknown> | null,
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
    getHeader: mocks.getHeader,
  }
})

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock('~/utils/supabase', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/sms-stripe', () => ({
  smsOverageCheckoutLineItemSafe: vi.fn(async () => null),
}))

vi.mock('stripe', () => {
  class StripeMock {
    static instances: StripeMock[] = []
    checkout = {
      sessions: {
        create: mocks.checkoutCreate,
      },
    }
    subscriptions = {
      retrieve: mocks.subscriptionsRetrieve,
    }
    customers = {
      create: mocks.customersCreate,
      retrieve: mocks.customersRetrieve,
    }
    prices = {
      retrieve: mocks.pricesRetrieve,
    }
    constructor() {
      StripeMock.instances.push(this)
    }
  }
  return { default: StripeMock }
})

const TENANT = '11111111-1111-1111-1111-111111111111'
const CUS = 'cus_test_checkout'
const FUTURE_END = '2026-11-06T12:00:00.000Z' // ~20d from mid-Oct 2026 fixtures in other tests; absolute
const FUTURE_UNIX = Math.floor(Date.parse(FUTURE_END) / 1000)

type Handler = (event: object) => Promise<{ id?: string; url?: string }>

function tenantClient(opts: {
  walleeStatus?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  is_trial?: boolean
  trial_ends_at?: string | null
}) {
  return {
    from(table: string) {
      if (table !== 'tenants') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                stripe_customer_id: opts.stripeCustomerId ?? CUS,
                name: 'Test Fahrschule',
                contact_email: 'billing@example.com',
                wallee_onboarding_status: opts.walleeStatus ?? 'not_started',
                stripe_subscription_id: opts.stripeSubscriptionId ?? null,
                referred_by_code: null,
                is_trial: opts.is_trial ?? false,
                trial_ends_at: opts.trial_ends_at ?? null,
              },
              error: null,
            }),
          }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }
    },
  }
}

describe('POST /api/stripe/create-checkout-session registration-trial carry-through', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.lastSessionParams = null
    process.env.STRIPE_SECRET_KEY = 'sk_test_checkout_wallee'
    process.env.STRIPE_PRICE_STARTER = 'price_starter_test'
    process.env.NUXT_PUBLIC_BASE_URL = 'https://app.simy.ch'
    mocks.getHeader.mockReturnValue('Bearer test')
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'auth-1',
      tenant_id: TENANT,
      profile: { tenant_id: TENANT },
    })
    mocks.checkoutCreate.mockImplementation(async (params: Record<string, unknown>) => {
      mocks.lastSessionParams = params
      return { id: 'cs_test_1', url: 'https://checkout.stripe.test/session' }
    })
    mocks.customersRetrieve.mockResolvedValue({ id: CUS, deleted: false })
  })

  async function loadHandler(): Promise<Handler> {
    return (await import('../../api/stripe/create-checkout-session.post')).default as Handler
  }

  it('future trial + Wallee on: absolute trial_end, no trial_period_days, trial_source=registration_carry', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantClient({ is_trial: true, trial_ends_at: FUTURE_END, walleeStatus: 'not_started' }),
    )
    mocks.readBody.mockResolvedValue({
      plan: 'starter',
      withWallee: true,
      addons: {},
      // Client-supplied trial must be ignored
      trial_ends_at: '2099-01-01T00:00:00.000Z',
      trialEndsAt: '2099-01-01T00:00:00.000Z',
    })

    const handler = await loadHandler()
    await handler({})

    const subData = mocks.lastSessionParams?.subscription_data as Record<string, unknown>
    expect(subData.trial_period_days).toBeUndefined()
    expect(subData.trial_end).toBe(FUTURE_UNIX)
    const meta = subData.metadata as Record<string, string>
    expect(meta.with_wallee).toBe('true')
    expect(meta.trial_source).toBe('registration_carry')
    expect(meta.registration_trial_ends_at).toBe(new Date(FUTURE_END).toISOString())
    expect(String(mocks.lastSessionParams?.success_url)).toContain('wallee_setup=1')
  })

  it('future trial + Wallee off: same absolute trial_end (parity)', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantClient({ is_trial: true, trial_ends_at: FUTURE_END }),
    )
    mocks.readBody.mockResolvedValue({ plan: 'starter', withWallee: false, addons: {} })

    const handler = await loadHandler()
    await handler({})

    const subData = mocks.lastSessionParams?.subscription_data as Record<string, unknown>
    expect(subData.trial_end).toBe(FUTURE_UNIX)
    expect(subData.trial_period_days).toBeUndefined()
    const meta = subData.metadata as Record<string, string>
    expect(meta.with_wallee).toBe('false')
    expect(meta.trial_source).toBe('registration_carry')
    expect(String(mocks.lastSessionParams?.success_url)).not.toContain('wallee_setup=1')
  })

  it('does not reset remaining duration to 30 days', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantClient({ is_trial: true, trial_ends_at: FUTURE_END, walleeStatus: 'not_started' }),
    )
    mocks.readBody.mockResolvedValue({ plan: 'starter', withWallee: true, addons: {} })
    await (await loadHandler())({})
    const subData = mocks.lastSessionParams?.subscription_data as Record<string, unknown>
    expect(subData.trial_period_days).toBeUndefined()
    expect(subData.trial_end).toBe(FUTURE_UNIX)
    expect(subData.trial_end).not.toBe(
      Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    )
  })

  it('expired registration trial: no Stripe trial', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantClient({ is_trial: true, trial_ends_at: '2020-01-01T00:00:00.000Z' }),
    )
    mocks.readBody.mockResolvedValue({ plan: 'starter', withWallee: true, addons: {} })
    await (await loadHandler())({})
    const subData = mocks.lastSessionParams?.subscription_data as Record<string, unknown>
    expect(subData.trial_end).toBeUndefined()
    expect(subData.trial_period_days).toBeUndefined()
    expect((subData.metadata as Record<string, string>).trial_source).toBe('none')
  })

  it('missing trial_ends_at on registration trial blocks Checkout', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantClient({ is_trial: true, trial_ends_at: null }),
    )
    mocks.readBody.mockResolvedValue({ plan: 'starter', withWallee: false, addons: {} })
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      data: { code: 'trial_end_missing' },
    })
    expect(mocks.checkoutCreate).not.toHaveBeenCalled()
  })

  it('malformed trial_ends_at blocks Checkout', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantClient({ is_trial: true, trial_ends_at: 'garbage' }),
    )
    mocks.readBody.mockResolvedValue({ plan: 'starter', withWallee: true, addons: {} })
    await expect((await loadHandler())({})).rejects.toMatchObject({
      statusCode: 400,
      data: { code: 'trial_end_invalid' },
    })
    expect(mocks.checkoutCreate).not.toHaveBeenCalled()
  })

  it('non-trial paid-style tenant: no registration trial_end invented', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantClient({ is_trial: false, trial_ends_at: FUTURE_END }),
    )
    mocks.readBody.mockResolvedValue({ plan: 'starter', withWallee: false, addons: {} })
    await (await loadHandler())({})
    const subData = mocks.lastSessionParams?.subscription_data as Record<string, unknown>
    expect(subData.trial_end).toBeUndefined()
    expect((subData.metadata as Record<string, string>).trial_source).toBe('none')
  })

  it('existing subscription still returns 409 (unrelated upgrade path)', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantClient({
        is_trial: true,
        trial_ends_at: FUTURE_END,
        stripeSubscriptionId: 'sub_existing',
      }),
    )
    mocks.subscriptionsRetrieve.mockResolvedValue({ id: 'sub_existing', status: 'active' })
    mocks.readBody.mockResolvedValue({ plan: 'starter', withWallee: true, addons: {} })
    await expect((await loadHandler())({})).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'existing_subscription' },
    })
    expect(mocks.checkoutCreate).not.toHaveBeenCalled()
  })

  it('registration SaaS_TRIAL_DAYS remains 30 for register.post', () => {
    expect(SAAS_TRIAL_DAYS).toBe(30)
    const registerSrc = readFileSync(resolve(process.cwd(), 'server/api/tenants/register.post.ts'), 'utf8')
    expect(registerSrc).toContain('SAAS_TRIAL_DAYS')
  })

  it('source: never uses trial_period_days; activate preserves trials', () => {
    const checkout = readFileSync(
      resolve(process.cwd(), 'server/api/stripe/create-checkout-session.post.ts'),
      'utf8',
    )
    expect(checkout).not.toMatch(/trial_period_days\s*:/)
    expect(checkout).toContain('decideRegistrationTrialForCheckout')
    expect(checkout).not.toContain('Bis dahin läuft dein Abonnement kostenlos')

    const activate = readFileSync(
      resolve(process.cwd(), 'server/api/admin/wallee-activate.post.ts'),
      'utf8',
    )
    expect(activate).toContain('shouldEndStripeTrialOnWalleeActivate')
    expect(activate).toContain('Preserving Stripe trial_end')

    const webhook = readFileSync(resolve(process.cwd(), 'server/api/stripe/webhook.post.ts'), 'utf8')
    expect(webhook).toContain("sub.status === 'trialing' || sub.status === 'active'")
    expect(webhook).toContain('handleWalleeUpgradeOpsEmail')
    expect(webhook).toContain('WALLEE_UPGRADE_OPS_EMAIL_SETTING_KEY')
    expect(webhook).toContain('shouldSendWalleeUpgradeOpsEmail')

    const success = readFileSync(resolve(process.cwd(), 'pages/payment/success.vue'), 'utf8')
    expect(success).toContain('Checkout abgeschlossen')
    expect(success).not.toContain('Abonnement aktiviert!')
    expect(success).toContain('kein bestätigter Zahlungserfolg')

    const sync = readFileSync(resolve(process.cwd(), 'server/api/stripe/sync-subscription.post.ts'), 'utf8')
    expect(sync).toContain('NOT proof of a successful charge')
  })
})
