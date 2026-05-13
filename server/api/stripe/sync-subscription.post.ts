import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { PLANS, type SubscriptionPlan } from '~/utils/planFeatures'

/**
 * Called from the success page after a Stripe checkout.
 * Syncs the subscription state directly to the tenant — acts as a reliable
 * fallback in case the webhook hasn't fired yet or failed silently.
 */
export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ sessionId: string }>(event)
  if (!body?.sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing sessionId' })
  }

  const supabase = getSupabaseAdmin()
  const token = authHeader.replace('Bearer ', '')

  // Resolve tenant from the authenticated user
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .single()

  const tenantId = userRow?.tenant_id
  if (!tenantId) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

  // Retrieve the checkout session
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(body.sessionId, {
      expand: ['subscription'],
    })
  } catch (err: any) {
    console.error('❌ sync-subscription: Failed to retrieve session', err?.message)
    throw createError({ statusCode: 400, statusMessage: 'Invalid session ID' })
  }

  if (session.status !== 'complete' || session.mode !== 'subscription') {
    return { synced: false, reason: 'session_not_complete' }
  }

  const sub = session.subscription as Stripe.Subscription | null
  if (!sub) {
    return { synced: false, reason: 'no_subscription' }
  }

  // Resolve plan from subscription metadata, fall back to price matching
  const plan = (sub.metadata?.plan || resolvePlanFromPrices(sub)) as SubscriptionPlan

  const periodEndTs = (sub as any).current_period_end ?? null
  const currentPeriodEnd = periodEndTs
    ? new Date(Number(periodEndTs) * 1000).toISOString()
    : null

  const addonSeats = parseAddonSeats(sub)
  const addonCourses = sub.metadata?.addon_courses === 'true'
  const addonAffiliate = sub.metadata?.addon_affiliate === 'true'

  const cancelAtTs = (sub as any).cancel_at ?? null
  const cancelAt = cancelAtTs ? new Date(Number(cancelAtTs) * 1000).toISOString() : null

  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      stripe_subscription_id: sub.id,
      stripe_customer_id: session.customer as string,
      subscription_plan: plan,
      current_period_end: currentPeriodEnd,
      is_trial: false,
      addon_seats: addonSeats,
      addon_courses_enabled: addonCourses,
      addon_affiliate_enabled: addonAffiliate,
      subscription_cancel_at: cancelAt,
    })
    .eq('id', tenantId)

  if (updateError) {
    console.error(`❌ sync-subscription: Supabase update failed for tenant ${tenantId}:`, updateError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to update subscription' })
  }

  console.log(`✅ sync-subscription: Tenant ${tenantId} synced → plan=${plan}`)
  return { synced: true, plan, tenantId }
})

function resolvePlanFromPrices(sub: Stripe.Subscription): string {
  const envMap: Record<string, string> = {}
  for (const p of PLANS) {
    const priceId = process.env[p.priceEnvKey]
    if (priceId) envMap[priceId] = p.id
  }
  for (const item of sub.items.data) {
    const match = envMap[item.price.id]
    if (match) return match
  }
  return 'starter'
}

function parseAddonSeats(sub: Stripe.Subscription): number {
  const priceId = process.env['STRIPE_PRICE_ADDON_SEATS']
  if (!priceId) return 0
  const item = sub.items.data.find(i => i.price.id === priceId)
  return item?.quantity ?? 0
}
