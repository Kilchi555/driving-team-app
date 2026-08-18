import Stripe from 'stripe'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  getWebsitePriceIds,
  homepageHasContent,
  loadWebsiteHomePage,
  websitePublishBlockedReason,
} from '~/server/utils/website-billing'
import { isWebsiteHostingPlan, type WebsiteHostingPlan } from '~/utils/website-billing'

function appBaseUrl(event: any) {
  const fromEnv = process.env.NUXT_PUBLIC_APP_URL || process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host')
  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https'
  return host ? `${proto}://${host}` : 'https://app.simy.ch'
}

export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const authUser = await getAuthenticatedUser(event)
  const tenantId = authUser?.tenant_id || authUser?.profile?.tenant_id
  if (!tenantId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  }

  const body = await readBody<{
    hosting_plan?: WebsiteHostingPlan
    include_setup?: boolean
    publish_after_pay?: boolean
  }>(event)

  const supabase = getSupabaseAdmin()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, contact_email, website_only, website_setup_paid_at, website_hosting_plan, trial_ends_at, stripe_customer_id, stripe_subscription_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.website_only) {
    throw createError({ statusCode: 400, statusMessage: 'Nur für Website-only Tenants' })
  }

  const setupAlreadyPaid = !!tenant.website_setup_paid_at
  const hostingAlreadyPaid = isWebsiteHostingPlan(tenant.website_hosting_plan)
  const includeSetup = body?.include_setup !== false && !setupAlreadyPaid
  const includeHosting = !hostingAlreadyPaid
  const hostingPlan: WebsiteHostingPlan = isWebsiteHostingPlan(body?.hosting_plan)
    ? body.hosting_plan
    : (tenant.website_hosting_plan as WebsiteHostingPlan) || 'host'
  const publishAfterPay = !!body?.publish_after_pay

  if (!includeSetup && !includeHosting) {
    throw createError({ statusCode: 400, statusMessage: 'Nichts zu bezahlen' })
  }

  if (publishAfterPay) {
    const { data: website } = await supabase
      .from('website_tenants')
      .select('id')
      .eq('tenant_id', tenantId)
      .maybeSingle()
    const home = website ? await loadWebsiteHomePage(supabase, website.id) : null
    if (!home || !homepageHasContent(home.blocks)) {
      throw createError({ statusCode: 400, statusMessage: 'Homepage ist noch nicht bereit' })
    }
    const blocked = websitePublishBlockedReason({
      ...tenant,
      website_setup_paid_at: includeSetup ? tenant.website_setup_paid_at : new Date().toISOString(),
      website_hosting_plan: includeHosting ? hostingPlan : tenant.website_hosting_plan,
    })
    // After this checkout, both should be paid — only block if homepage missing (already checked).
    void blocked
  }

  const priceIds = getWebsitePriceIds()
  if (includeSetup && !priceIds.setup) {
    throw createError({ statusCode: 500, statusMessage: 'Missing STRIPE_PRICE_WEBSITE_SETUP' })
  }
  if (includeHosting && !(hostingPlan === 'care' ? priceIds.care : priceIds.host)) {
    throw createError({ statusCode: 500, statusMessage: `Missing STRIPE_PRICE_WEBSITE_${hostingPlan.toUpperCase()}` })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

  let stripeCustomerId = tenant.stripe_customer_id || undefined
  if (stripeCustomerId) {
    try {
      await stripe.customers.retrieve(stripeCustomerId)
    } catch (err: any) {
      if (err?.code === 'resource_missing') stripeCustomerId = undefined
      else throw err
    }
  }
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: tenant.name || undefined,
      email: tenant.contact_email || undefined,
      metadata: { tenant_id: tenantId, product: 'website' },
    })
    stripeCustomerId = customer.id
    await supabase.from('tenants').update({ stripe_customer_id: customer.id }).eq('id', tenantId)
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
  if (includeHosting) {
    lineItems.push({
      price: hostingPlan === 'care' ? priceIds.care : priceIds.host,
      quantity: 1,
    })
  }
  if (includeSetup) {
    lineItems.push({ price: priceIds.setup, quantity: 1 })
  }

  const base = appBaseUrl(event)
  const successUrl = `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}&website=1`
  const cancelUrl = `${base}/admin/billing`

  const metadata = {
    product: 'website',
    tenant_id: tenantId,
    hosting_plan: hostingPlan,
    include_setup: String(includeSetup),
    publish_after_pay: String(publishAfterPay),
  }

  const mode: Stripe.Checkout.SessionCreateParams.Mode = includeHosting ? 'subscription' : 'payment'

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      customer: stripeCustomerId,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      ...(mode === 'subscription'
        ? {
            subscription_data: {
              metadata,
            },
          }
        : {
            payment_intent_data: {
              metadata,
            },
          }),
    })

    return { id: session.id, url: session.url }
  } catch (stripeErr: any) {
    console.error('❌ website checkout failed', stripeErr?.message)
    throw createError({
      statusCode: 502,
      statusMessage: `Stripe-Fehler: ${stripeErr?.message || 'Checkout konnte nicht erstellt werden'}`,
    })
  }
})
