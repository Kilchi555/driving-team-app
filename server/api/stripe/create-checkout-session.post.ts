import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { PLANS, ADDONS, type SubscriptionPlan, type AddonKey } from '~/utils/planFeatures'

interface CheckoutBody {
  plan: SubscriptionPlan
  addons?: {
    seats?: number
    courses?: boolean
    affiliate?: boolean
  }
  withWallee?: boolean
  staffToDeactivate?: string[] // user IDs to deactivate after payment
}

export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const MAX_ADDON_SEATS = 10

  const body = await readBody<CheckoutBody>(event)
  const plan = body?.plan || 'starter'
  const addons = body?.addons || {}
  // Enforce maximum 10 addon seats server-side to prevent manipulation
  if (addons.seats && addons.seats > MAX_ADDON_SEATS) {
    addons.seats = MAX_ADDON_SEATS
  }
  const withWallee = body?.withWallee !== false // default: true
  const staffToDeactivate = Array.isArray(body?.staffToDeactivate) ? body.staffToDeactivate : []

  const planDef = PLANS.find(p => p.id === plan)
  if (!planDef || !planDef.priceEnvKey) {
    throw createError({ statusCode: 400, statusMessage: `Unknown plan: ${plan}` })
  }

  const planPriceId = process.env[planDef.priceEnvKey]
  if (!planPriceId) {
    throw createError({ statusCode: 500, statusMessage: `Missing env var ${planDef.priceEnvKey}` })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'

  // ── Resolve Stripe Customer for this tenant ──────────────────────────────
  // Accounts V2 requires a customer for Checkout. We always ensure one exists.
  let stripeCustomerId: string | undefined
  let tenantId: string | undefined
  let wallleeAlreadyActive = false

  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const supabase = getSupabaseAdmin()
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)

      if (user) {
        const { data: userRow } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('auth_user_id', user.id)
          .single()

        tenantId = userRow?.tenant_id

        if (tenantId) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('stripe_customer_id, name, contact_email, wallee_onboarding_status')
            .eq('id', tenantId)
            .single()

          wallleeAlreadyActive = tenant?.wallee_onboarding_status === 'active'

          if (tenant?.stripe_customer_id) {
            // Verify the customer actually exists in the current Stripe mode (live vs test)
            try {
              await stripe.customers.retrieve(tenant.stripe_customer_id)
              stripeCustomerId = tenant.stripe_customer_id
            } catch (retrieveErr: any) {
              if (retrieveErr?.code === 'resource_missing') {
                // Customer exists in wrong Stripe mode (e.g. test key ID used with live key)
                // Create a new customer and overwrite the stale ID
                console.warn(`⚠️ Stripe customer ${tenant.stripe_customer_id} not found in current mode — creating new one`)
                const customer = await stripe.customers.create({
                  name: tenant.name || undefined,
                  email: tenant.contact_email || undefined,
                  metadata: { tenant_id: tenantId },
                })
                stripeCustomerId = customer.id
                await supabase
                  .from('tenants')
                  .update({ stripe_customer_id: customer.id })
                  .eq('id', tenantId)
              } else {
                throw retrieveErr
              }
            }
          } else if (tenant) {
            const customer = await stripe.customers.create({
              name: tenant.name || undefined,
              email: tenant.contact_email || undefined,
              metadata: { tenant_id: tenantId },
            })
            stripeCustomerId = customer.id
            await supabase
              .from('tenants')
              .update({ stripe_customer_id: customer.id })
              .eq('id', tenantId)
          }
        }
      }
    } catch (err: any) {
      console.error('⚠️ Could not resolve tenant customer:', err?.message)
    }
  }

  // Require an authenticated tenant — no anonymous checkouts allowed
  if (!tenantId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated: please log in or create an account before upgrading.' })
  }

  // Accounts V2: always requires a customer — create a transient one if none resolved
  if (!stripeCustomerId) {
    const transient = await stripe.customers.create({
      description: 'Transient customer – Simy upgrade flow',
      metadata: { tenant_id: tenantId },
    })
    stripeCustomerId = transient.id
  }

  // ── Build line_items ──────────────────────────────────────────────────────
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: planPriceId, quantity: 1 },
  ]

  // Add-on: extra seats (per unit)
  if (addons.seats && addons.seats > 0) {
    const seatPriceId = process.env[ADDONS.find(a => a.key === 'seats')!.priceEnvKey]
    if (!seatPriceId) throw createError({ statusCode: 500, statusMessage: 'Missing STRIPE_PRICE_ADDON_SEATS' })
    lineItems.push({ price: seatPriceId, quantity: addons.seats })
  }

  // Add-on: courses
  if (addons.courses) {
    const coursesPriceId = process.env[ADDONS.find(a => a.key === 'courses')!.priceEnvKey]
    if (!coursesPriceId) throw createError({ statusCode: 500, statusMessage: 'Missing STRIPE_PRICE_ADDON_COURSES' })
    lineItems.push({ price: coursesPriceId, quantity: 1 })
  }

  // Add-on: affiliate
  if (addons.affiliate) {
    const affiliatePriceId = process.env[ADDONS.find(a => a.key === 'affiliate')!.priceEnvKey]
    if (!affiliatePriceId) throw createError({ statusCode: 500, statusMessage: 'Missing STRIPE_PRICE_ADDON_AFFILIATE' })
    lineItems.push({ price: affiliatePriceId, quantity: 1 })
  }

  // ── Create Checkout Session ───────────────────────────────────────────────
  // If tenant wants Wallee AND it's not yet active → 30-day billing pause:
  // ~20 days for Handelsregister (HR) registration + ~5 days for Wallee onboarding + buffer.
  // Trial ends automatically when Wallee is activated (wallee-activate.post.ts sets trial_end: 'now').
  const needsWalleeTrial = withWallee && !wallleeAlreadyActive
  const successUrl = withWallee
    ? `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&wallee_setup=1`
    : `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: lineItems,
    subscription_data: {
      ...(needsWalleeTrial ? { trial_period_days: 30 } : {}),
      metadata: {
        plan,
        addon_seats: String(addons.seats || 0),
        addon_courses: String(!!addons.courses),
        addon_affiliate: String(!!addons.affiliate),
        with_wallee: String(withWallee),
        ...(staffToDeactivate.length > 0 ? { staff_to_deactivate: staffToDeactivate.join(',') } : {}),
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
    },
    ...(needsWalleeTrial ? {
      custom_text: {
        submit: {
          message: 'Du wirst erst belastet, sobald dein Wallee-Konto aktiviert ist. Bis dahin läuft dein Abonnement kostenlos.',
        },
      },
    } : {}),
    success_url: successUrl,
    cancel_url: `${baseUrl}/upgrade`,
  })

  return { id: session.id, url: session.url }
})
