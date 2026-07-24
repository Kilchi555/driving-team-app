import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { PLANS, type SubscriptionPlan } from '~/utils/planFeatures'
import { syncFeatureFlags } from '~/server/utils/syncFeatureFlags'

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

  // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
  // a raw Bearer-only check that would 401 whenever the client's access
  // token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ sessionId: string }>(event)
  if (!body?.sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing sessionId' })
  }

  const supabase = getSupabaseAdmin()

  // Resolve tenant from the authenticated user (already resolved by getAuthenticatedUser)
  const tenantId = authUser.db_user_id ? authUser.tenant_id : null
  if (!tenantId) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

  // Retrieve the checkout session
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(body.sessionId)
  } catch (err: any) {
    console.error('❌ sync-subscription: Failed to retrieve session', err?.message)
    throw createError({ statusCode: 400, statusMessage: 'Invalid session ID' })
  }

  if (session.status !== 'complete' || session.mode !== 'subscription') {
    return { synced: false, reason: 'session_not_complete' }
  }

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as Stripe.Subscription | null)?.id

  if (!subscriptionId) {
    return { synced: false, reason: 'no_subscription' }
  }

  // Retrieve the subscription directly to guarantee fully populated items.data and price objects
  let sub: Stripe.Subscription
  try {
    sub = await stripe.subscriptions.retrieve(subscriptionId)
  } catch (err: any) {
    console.error('❌ sync-subscription: Failed to retrieve subscription', err?.message)
    throw createError({ statusCode: 400, statusMessage: 'Failed to retrieve subscription' })
  }

  // Resolve plan from subscription metadata, fall back to price matching
  const plan = (sub.metadata?.plan || resolvePlanFromPrices(sub)) as SubscriptionPlan

  // Basil API (2025-03-31+): current_period_end lives on subscription items
  const itemEnds = (sub.items?.data ?? [])
    .map((item) => (item as Stripe.SubscriptionItem).current_period_end)
    .filter((ts): ts is number => typeof ts === 'number' && Number.isFinite(ts))
  const periodEndTs =
    (itemEnds.length > 0 ? Math.max(...itemEnds) : null)
    ?? (sub as any).current_period_end
    ?? null
  const currentPeriodEnd = periodEndTs != null && Number.isFinite(Number(periodEndTs))
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
      stripe_customer_id: (sub.customer as string) || (session.customer as string),
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

  // Sync feature flags in tenant_settings
  await syncFeatureFlags(supabase, tenantId, plan, { courses: addonCourses, affiliate: addonAffiliate })

  console.log(`✅ sync-subscription: Tenant ${tenantId} synced → plan=${plan}`)
  return { synced: true, plan, tenantId }
})

function resolvePlanFromPrices(sub: Stripe.Subscription): string {
  const envMap: Record<string, string> = {}
  for (const p of PLANS) {
    const priceId = process.env[p.priceEnvKey]?.trim()
    if (priceId) envMap[priceId] = p.id
  }
  for (const item of sub.items.data) {
    const match = envMap[item.price.id]
    if (match) return match
  }
  return 'starter'
}

function parseAddonSeats(sub: Stripe.Subscription): number {
  // Prefer metadata — always explicitly set at our checkout time and unambiguous
  if (sub.metadata?.addon_seats !== undefined && sub.metadata.addon_seats !== '') {
    const fromMeta = parseInt(sub.metadata.addon_seats, 10)
    if (!isNaN(fromMeta)) return fromMeta
  }
  // Fallback: read from subscription line items (e.g. portal-based upgrades without our metadata)
  const priceId = process.env['STRIPE_PRICE_ADDON_SEATS']
  if (priceId) {
    const item = sub.items.data.find(i => {
      // item.price can be a string ID or an expanded Price object depending on how sub was fetched
      const itemPriceId = typeof i.price === 'string' ? i.price : i.price?.id
      return itemPriceId === priceId
    })
    if (item) return item.quantity ?? 0
  }
  return 0
}
