import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { PLANS, ADDONS, type SubscriptionPlan, type AddonKey } from '~/utils/planFeatures'
import { getAuthenticatedUser } from '~/server/utils/auth'

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
  // .trim() defensively: env values pasted into Vercel sometimes carry a trailing
  // newline (price_…\n), which makes Stripe reject the key/price ("No such price").
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
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

  const planPriceId = process.env[planDef.priceEnvKey]?.trim()
  if (!planPriceId) {
    throw createError({ statusCode: 500, statusMessage: `Missing env var ${planDef.priceEnvKey}` })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'

  // Diagnostic: detect key/price mode so a live/test mismatch is obvious in logs.
  const keyMode = stripeSecret.startsWith('sk_live_') || stripeSecret.startsWith('rk_live_')
    ? 'live'
    : stripeSecret.startsWith('sk_test_') || stripeSecret.startsWith('rk_test_')
      ? 'test'
      : 'unknown'
  const priceMode = planPriceId.startsWith('price_') ? 'price_id' : 'invalid'
  console.log('💳 create-checkout-session config', {
    keyMode,
    keyPrefix: stripeSecret.slice(0, 8),
    planPriceId,
    priceLooksValid: priceMode === 'price_id' && !/\s/.test(planPriceId),
  })

  // ── Resolve the authenticated tenant FIRST ───────────────────────────────
  // Auth must run OUTSIDE the Stripe-customer try/catch below — otherwise an
  // auth/refresh failure gets swallowed and surfaces as a confusing 401 only
  // because tenantId ends up undefined. getAuthenticatedUser handles cookie
  // fallback, deduplicated token refresh, and tenant resolution.
  const authHeaderPresent = !!getHeader(event, 'authorization')?.startsWith('Bearer ')
  const cookieHeaderPresent = !!getHeader(event, 'cookie')

  const authUser = await getAuthenticatedUser(event)
  const tenantId = authUser?.tenant_id || authUser?.profile?.tenant_id

  // Require an authenticated tenant — no anonymous checkouts allowed
  if (!tenantId) {
    // Distinguish the failure mode so we can debug 401s in production:
    //  - no authUser at all → token + cookie both failed to verify (expired/rotated session)
    //  - authUser but no tenant_id → token verified but DB user/tenant lookup failed
    const reason = !authUser
      ? 'token_and_cookie_invalid'
      : 'user_resolved_but_no_tenant'
    console.error('❌ create-checkout-session 401', {
      reason,
      authHeaderPresent,
      cookieHeaderPresent,
      authUserId: authUser?.id || null,
      hasProfile: !!authUser?.profile,
    })
    throw createError({
      statusCode: 401,
      statusMessage: `Unauthenticated (${reason}). Bitte erneut anmelden.`,
      data: { reason, authHeaderPresent, cookieHeaderPresent },
    })
  }

  // ── Resolve Stripe Customer for this tenant ──────────────────────────────
  // Accounts V2 requires a customer for Checkout. We always ensure one exists.
  // Failures here are tolerated: we fall back to a transient customer below.
  let stripeCustomerId: string | undefined
  let wallleeAlreadyActive = false

  try {
    const supabase = getSupabaseAdmin()
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
  } catch (err: any) {
    console.error('⚠️ Could not resolve tenant customer:', err?.message)
  }

  // Accounts V2: always requires a customer — create a transient one if none resolved.
  // Wrapped so an invalid/revoked Stripe key surfaces as a clear error instead of a
  // confusing generic 401 "Server Error" bubbling up from the uncaught Stripe call.
  if (!stripeCustomerId) {
    try {
      const transient = await stripe.customers.create({
        description: 'Transient customer – Simy upgrade flow',
        metadata: { tenant_id: tenantId },
      })
      stripeCustomerId = transient.id
    } catch (stripeErr: any) {
      console.error('❌ Stripe customers.create failed', {
        type: stripeErr?.type,
        code: stripeErr?.code,
        statusCode: stripeErr?.statusCode,
        message: stripeErr?.message,
        keyMode,
      })
      throw createError({
        statusCode: 502,
        statusMessage: `Stripe-Fehler (${stripeErr?.type || 'unknown'}): ${stripeErr?.message || 'Zahlungsanbieter nicht erreichbar'}`,
        data: { stripe: true, type: stripeErr?.type, code: stripeErr?.code, keyMode },
      })
    }
  }

  // ── Build line_items ──────────────────────────────────────────────────────
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: planPriceId, quantity: 1 },
  ]

  // Add-on: extra seats (per unit)
  if (addons.seats && addons.seats > 0) {
    const seatPriceId = process.env[ADDONS.find(a => a.key === 'seats')!.priceEnvKey]?.trim()
    if (!seatPriceId) throw createError({ statusCode: 500, statusMessage: 'Missing STRIPE_PRICE_ADDON_SEATS' })
    lineItems.push({ price: seatPriceId, quantity: addons.seats })
  }

  // Add-on: courses
  if (addons.courses) {
    const coursesPriceId = process.env[ADDONS.find(a => a.key === 'courses')!.priceEnvKey]?.trim()
    if (!coursesPriceId) throw createError({ statusCode: 500, statusMessage: 'Missing STRIPE_PRICE_ADDON_COURSES' })
    lineItems.push({ price: coursesPriceId, quantity: 1 })
  }

  // Add-on: affiliate
  if (addons.affiliate) {
    const affiliatePriceId = process.env[ADDONS.find(a => a.key === 'affiliate')!.priceEnvKey]?.trim()
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

  try {
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
  } catch (stripeErr: any) {
    console.error('❌ Stripe checkout.sessions.create failed', {
      type: stripeErr?.type,
      code: stripeErr?.code,
      statusCode: stripeErr?.statusCode,
      message: stripeErr?.message,
      keyMode,
      planPriceId,
    })
    throw createError({
      statusCode: 502,
      statusMessage: `Stripe-Fehler (${stripeErr?.type || 'unknown'}): ${stripeErr?.message || 'Checkout konnte nicht erstellt werden'}`,
      data: { stripe: true, type: stripeErr?.type, code: stripeErr?.code, keyMode, planPriceId },
    })
  }
})
