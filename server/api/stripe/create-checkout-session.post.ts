import Stripe from 'stripe'
import { createError, defineEventHandler, getHeader, readBody } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { PLANS, ADDONS, type SubscriptionPlan, type AddonKey } from '~/utils/planFeatures'
import { getAuthenticatedUser } from '~/server/utils/auth'
import {
  decideRegistrationTrialForCheckout,
  TRIAL_SOURCE_META_KEY,
} from '~/server/utils/registration-trial-checkout'

interface CheckoutBody {
  plan: SubscriptionPlan
  addons?: {
    seats?: number
    courses?: boolean
    affiliate?: boolean
    gbp?: boolean
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
  let referredByCode: string | null = null
  // Registration-trial carry-through (server-authoritative; never from body).
  let registrationTrialDecision = decideRegistrationTrialForCheckout({
    is_trial: false,
    trial_ends_at: null,
  })
  let tenantTrialFieldsLoaded = false

  try {
    const supabase = getSupabaseAdmin()
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id, name, contact_email, wallee_onboarding_status, stripe_subscription_id, referred_by_code, is_trial, trial_ends_at')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant nicht gefunden.',
        data: { code: 'tenant_not_found' },
      })
    }

    referredByCode = tenant.referred_by_code || null
    tenantTrialFieldsLoaded = true
    registrationTrialDecision = decideRegistrationTrialForCheckout({
      is_trial: tenant.is_trial,
      trial_ends_at: tenant.trial_ends_at,
    })
    if (registrationTrialDecision.kind === 'reject') {
      throw createError({
        statusCode: 400,
        statusMessage: registrationTrialDecision.statusMessage,
        data: { code: registrationTrialDecision.code },
      })
    }

    // Prevent a second full subscription when the tenant already pays via Stripe.
    // Mid-cycle plan/seat changes go through /api/stripe/update-subscription (proration).
    if (tenant?.stripe_subscription_id) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)
        if (['active', 'trialing', 'past_due', 'paused'].includes(existingSub.status)) {
          throw createError({
            statusCode: 409,
            statusMessage: 'Du hast bereits ein aktives Abonnement. Änderungen werden anteilsmässig verrechnet — bitte die Upgrade-Seite erneut laden.',
            data: { code: 'existing_subscription' },
          })
        }
      } catch (existingErr: any) {
        if (existingErr?.statusCode === 409) throw existingErr
        // Missing/stale subscription id → allow a fresh Checkout
        if (existingErr?.code !== 'resource_missing') {
          console.warn('⚠️ Could not verify existing subscription before checkout:', existingErr?.message)
        }
      }
    }

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
    if (err?.statusCode === 409 || err?.statusCode === 400 || err?.statusCode === 404) throw err
    console.error('⚠️ Could not resolve tenant customer:', err?.message)
  }

  if (!tenantTrialFieldsLoaded) {
    throw createError({
      statusCode: 503,
      statusMessage:
        'Probezeitraum konnte nicht geladen werden. Bitte später erneut versuchen (Code: trial_lookup_failed).',
      data: { code: 'trial_lookup_failed' },
    })
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

  // Add-on: Google Business Profile
  if (addons.gbp) {
    const gbpPriceId = process.env[ADDONS.find(a => a.key === 'gbp')!.priceEnvKey]?.trim()
    if (!gbpPriceId) throw createError({ statusCode: 500, statusMessage: 'Missing STRIPE_PRICE_ADDON_GBP' })
    lineItems.push({ price: gbpPriceId, quantity: 1 })
  }

  // Metered SMS overage (CHF 0.15/segment above plan included quota) — no quantity.
  // Skip if price is missing in current Stripe mode (common: live price + sk_test locally).
  const { smsOverageCheckoutLineItemSafe } = await import('~/server/utils/sms-stripe')
  const smsLine = await smsOverageCheckoutLineItemSafe()
  if (smsLine) lineItems.push(smsLine)

  // ── Create Checkout Session ───────────────────────────────────────────────
  // Registration-trial carry-through: absolute trial_end from tenants.trial_ends_at
  // (same with/without Wallee). Never use fixed trial_period_days for Wallee.
  // Legacy Stripe trials (pre-carry-through) keep their scheduled ends (soft-drain).
  const successUrl = withWallee
    ? `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&wallee_setup=1`
    : `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`

  const trialSource = registrationTrialDecision.trialSource
  const carryTrialEndUnix =
    registrationTrialDecision.kind === 'carry'
      ? registrationTrialDecision.trialEndUnix
      : undefined

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: lineItems,
      subscription_data: {
        ...(carryTrialEndUnix != null ? { trial_end: carryTrialEndUnix } : {}),
        metadata: {
          plan,
          addon_seats: String(addons.seats || 0),
          addon_courses: String(!!addons.courses),
          addon_affiliate: String(!!addons.affiliate),
          addon_gbp: String(!!addons.gbp),
          with_wallee: String(withWallee),
          [TRIAL_SOURCE_META_KEY]: trialSource,
          ...(registrationTrialDecision.kind === 'carry'
            ? { registration_trial_ends_at: registrationTrialDecision.trialEndsAtIso }
            : {}),
          ...(staffToDeactivate.length > 0 ? { staff_to_deactivate: staffToDeactivate.join(',') } : {}),
          ...(tenantId ? { tenant_id: tenantId } : {}),
          ...(referredByCode ? { referred_by_code: referredByCode } : {}),
        },
      },
      success_url: successUrl,
      cancel_url: `${baseUrl}/upgrade`,
    }

    try {
      const session = await stripe.checkout.sessions.create(sessionParams)
      return { id: session.id, url: session.url }
    } catch (firstErr: any) {
      // Legacy metered SMS price (no Billing Meter) 502s the whole checkout.
      const firstMsg = String(firstErr?.message || '')
      if (smsLine && /meter/i.test(firstMsg)) {
        console.warn('⚠️ Retrying checkout without SMS overage line:', firstMsg)
        sessionParams.line_items = lineItems.filter(item => item.price !== smsLine.price)
        const session = await stripe.checkout.sessions.create(sessionParams)
        return { id: session.id, url: session.url }
      }
      throw firstErr
    }
  } catch (stripeErr: any) {
    const stripeMsg = String(stripeErr?.message || '')
    // Stripe rejects trial_end that is too soon / invalid — never silently extend.
    if (/trial_end/i.test(stripeMsg) || /trial period/i.test(stripeMsg)) {
      console.error('❌ Stripe rejected trial_end (no silent extension)', {
        message: stripeMsg,
        code: stripeErr?.code,
        trialEndUnix: carryTrialEndUnix ?? null,
      })
      throw createError({
        statusCode: 400,
        statusMessage:
          'Stripe hat das Probezeitraum-Ende abgelehnt. Bitte Support kontaktieren (Code: stripe_trial_end_rejected). Es wurde kein längerer Probezeitraum erzeugt.',
        data: {
          code: 'stripe_trial_end_rejected',
          stripe: true,
          type: stripeErr?.type,
          stripeCode: stripeErr?.code,
        },
      })
    }
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
      data: {
        stripe: true,
        type: stripeErr?.type,
        code: stripeErr?.code,
        keyMode,
        planPriceId,
        statusMessage: `Stripe-Fehler (${stripeErr?.type || 'unknown'}): ${stripeErr?.message || 'Checkout konnte nicht erstellt werden'}`,
      },
    })
  }
})
