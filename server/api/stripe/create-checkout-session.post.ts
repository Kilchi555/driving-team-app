import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { PLANS, ADDONS, type SubscriptionPlan, type AddonKey } from '~/utils/planFeatures'

interface CheckoutBody {
  plan: SubscriptionPlan
  addons?: {
    seats?: number      // extra seats (per unit)
    courses?: boolean
    affiliate?: boolean
  }
}

export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const body = await readBody<CheckoutBody>(event)
  const plan = body?.plan || 'starter'
  const addons = body?.addons || {}

  const planDef = PLANS.find(p => p.id === plan)
  if (!planDef || !planDef.priceEnvKey) {
    throw createError({ statusCode: 400, statusMessage: `Unknown plan: ${plan}` })
  }

  const planPriceId = process.env[planDef.priceEnvKey]
  if (!planPriceId) {
    throw createError({ statusCode: 500, statusMessage: `Missing env var ${planDef.priceEnvKey}` })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://www.simy.ch'

  // ── Resolve Stripe Customer for this tenant ──────────────────────────────
  let stripeCustomerId: string | undefined
  let tenantId: string | undefined

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
            .select('stripe_customer_id, name, contact_email')
            .eq('id', tenantId)
            .single()

          if (tenant?.stripe_customer_id) {
            stripeCustomerId = tenant.stripe_customer_id
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
    } catch {
      // Non-fatal
    }
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
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: lineItems,
    subscription_data: {
      metadata: {
        plan,
        addon_seats: String(addons.seats || 0),
        addon_courses: String(!!addons.courses),
        addon_affiliate: String(!!addons.affiliate),
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
    },
    success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/upgrade`,
  })

  return { id: session.id, url: session.url }
})
