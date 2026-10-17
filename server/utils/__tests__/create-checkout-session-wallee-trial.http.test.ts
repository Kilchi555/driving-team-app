/**
 * Checkout must not attach Stripe trial_period_days for Wallee onboarding.
 * Registration free trial (SAAS_TRIAL_DAYS) remains separate.
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

type Handler = (event: object) => Promise<{ id?: string; url?: string }>

function tenantClient(opts: {
  walleeStatus: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
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
                wallee_onboarding_status: opts.walleeStatus,
                stripe_subscription_id: opts.stripeSubscriptionId ?? null,
                referred_by_code: null,
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

describe('POST /api/stripe/create-checkout-session Wallee trial removed', () => {
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

  it('withWallee=true and Wallee inactive: no trial_period_days; keeps with_wallee metadata', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantClient({ walleeStatus: 'not_started', stripeCustomerId: CUS }),
    )
    mocks.readBody.mockResolvedValue({ plan: 'starter', withWallee: true, addons: {} })

    const handler = await loadHandler()
    const result = await handler({})
    expect(result).toMatchObject({ id: 'cs_test_1' })

    const subData = mocks.lastSessionParams?.subscription_data as Record<string, unknown>
    expect(subData).toBeTruthy()
    expect(subData.trial_period_days).toBeUndefined()
    expect((subData.metadata as Record<string, string>).with_wallee).toBe('true')
    expect(mocks.lastSessionParams?.custom_text).toBeUndefined()
    expect(String(mocks.lastSessionParams?.success_url)).toContain('wallee_setup=1')
  })

  it('Wallee already active: no Stripe trial', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantClient({ walleeStatus: 'active', stripeCustomerId: CUS }),
    )
    mocks.readBody.mockResolvedValue({ plan: 'starter', withWallee: true, addons: {} })

    const handler = await loadHandler()
    await handler({})

    const subData = mocks.lastSessionParams?.subscription_data as Record<string, unknown>
    expect(subData.trial_period_days).toBeUndefined()
    expect((subData.metadata as Record<string, string>).with_wallee).toBe('true')
  })

  it('withWallee=false: no Stripe trial', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      tenantClient({ walleeStatus: 'not_started', stripeCustomerId: CUS }),
    )
    mocks.readBody.mockResolvedValue({ plan: 'starter', withWallee: false, addons: {} })

    const handler = await loadHandler()
    await handler({})

    const subData = mocks.lastSessionParams?.subscription_data as Record<string, unknown>
    expect(subData.trial_period_days).toBeUndefined()
    expect((subData.metadata as Record<string, string>).with_wallee).toBe('false')
    expect(String(mocks.lastSessionParams?.success_url)).not.toContain('wallee_setup=1')
  })

  it('registration SaaS trial length remains SAAS_TRIAL_DAYS (30)', () => {
    expect(SAAS_TRIAL_DAYS).toBe(30)
    const registerSrc = readFileSync(resolve(process.cwd(), 'server/api/tenants/register.post.ts'), 'utf8')
    expect(registerSrc).toContain('SAAS_TRIAL_DAYS')
    expect(registerSrc).toContain('trialEndsAt.setDate(trialEndsAt.getDate() + SAAS_TRIAL_DAYS)')
  })

  it('source contract: create-checkout-session never sets trial_period_days', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'server/api/stripe/create-checkout-session.post.ts'),
      'utf8',
    )
    expect(src).not.toMatch(/trial_period_days\s*:/)
    expect(src).toContain("with_wallee: String(withWallee)")
    expect(src).not.toContain('Bis dahin läuft dein Abonnement kostenlos')
  })

  it('wallee-activate still ends legacy Stripe trialing subscriptions', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/admin/wallee-activate.post.ts'), 'utf8')
    expect(src).toContain("sub.status === 'trialing'")
    expect(src).toContain("trial_end: 'now'")
  })

  it('webhook still upserts legacy trialing Wallee subscriptions', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/stripe/webhook.post.ts'), 'utf8')
    expect(src).toContain("sub.metadata?.with_wallee === 'true' && sub.status === 'trialing'")
    expect(src).toContain('wallee_trial_started_at')
    expect(src).not.toContain('Du hast 30 Tage — hier ist dein Plan')
    expect(src).toContain('verlängert deine Testphase nicht')
  })

  it('frontend/email copy no longer promises free SaaS until Wallee active', () => {
    const upgrade = readFileSync(resolve(process.cwd(), 'pages/upgrade.vue'), 'utf8')
    const success = readFileSync(resolve(process.cwd(), 'pages/payment/success.vue'), 'utf8')
    const widget = readFileSync(
      resolve(process.cwd(), 'components/admin/WalleeOnboardingWidget.vue'),
      'utf8',
    )
    const reminders = readFileSync(
      resolve(process.cwd(), 'server/api/cron/send-wallee-reminders.get.ts'),
      'utf8',
    )
    for (const src of [upgrade, success, widget, reminders]) {
      expect(src).not.toMatch(/Abrechnung startet erst wenn/)
      expect(src).not.toMatch(/Bis dahin läuft dein Abonnement kostenlos/)
      expect(src).not.toMatch(/du hast <strong>30 Tage<\/strong> Zeit/)
    }
    expect(upgrade).toContain('verlängert deine Testphase nicht')
    expect(success).toContain('voneinander unabhängig')
    expect(widget).toContain('Online-Zahlungen sind aktiviert')
  })
})
