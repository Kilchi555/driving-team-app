import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { PLANS, ADDONS, type SubscriptionPlan } from '~/utils/planFeatures'

interface UpdateBody {
  plan?: SubscriptionPlan
  addons?: {
    seats?: number    // total extra seats desired (on top of plan's included)
    courses?: boolean
    affiliate?: boolean
  }
}

export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { data: userRow } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!userRow?.tenant_id || userRow.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can update subscriptions' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_subscription_id, stripe_customer_id, subscription_plan, addon_seats, addon_courses_enabled, addon_affiliate_enabled')
    .eq('id', userRow.tenant_id)
    .single()

  if (!tenant?.stripe_subscription_id) {
    throw createError({ statusCode: 400, statusMessage: 'No active subscription to update. Please subscribe first.' })
  }

  const body = await readBody<UpdateBody>(event)
  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

  // ── Fetch current subscription from Stripe ──────────────────────────────────
  const sub = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id, {
    expand: ['items.data.price'],
  })

  if (sub.status === 'canceled') {
    throw createError({ statusCode: 400, statusMessage: 'Subscription is already canceled' })
  }

  // ── Resolve desired state ────────────────────────────────────────────────────
  const desiredPlan = (body.plan || tenant.subscription_plan || 'starter') as SubscriptionPlan
  const desiredSeats = body.addons?.seats ?? tenant.addon_seats ?? 0
  const desiredCourses = body.addons?.courses ?? tenant.addon_courses_enabled ?? false
  const desiredAffiliate = body.addons?.affiliate ?? tenant.addon_affiliate_enabled ?? false

  const planDef = PLANS.find(p => p.id === desiredPlan)
  if (!planDef?.priceEnvKey) {
    throw createError({ statusCode: 400, statusMessage: `Unknown plan: ${desiredPlan}` })
  }

  const planPriceId = process.env[planDef.priceEnvKey]
  const seatPriceId = process.env[ADDONS.find(a => a.key === 'seats')!.priceEnvKey]
  const coursesPriceId = process.env[ADDONS.find(a => a.key === 'courses')!.priceEnvKey]
  const affiliatePriceId = process.env[ADDONS.find(a => a.key === 'affiliate')!.priceEnvKey]

  if (!planPriceId) {
    throw createError({ statusCode: 500, statusMessage: `Missing env var ${planDef.priceEnvKey}` })
  }

  // ── Map current items by price ID ────────────────────────────────────────────
  const currentItems = sub.items.data
  const findItem = (priceId: string | undefined) =>
    priceId ? currentItems.find(i => i.price.id === priceId) : undefined

  const currentPlanItem = currentItems.find(i =>
    PLANS.some(p => p.priceEnvKey && process.env[p.priceEnvKey] === i.price.id)
  )
  const currentSeatItem = findItem(seatPriceId)
  const currentCoursesItem = findItem(coursesPriceId)
  const currentAffiliateItem = findItem(affiliatePriceId)

  // ── Build update params ──────────────────────────────────────────────────────
  const itemUpdates: Stripe.SubscriptionUpdateParams.Item[] = []

  // Plan item: swap price if changed, keep if same
  if (currentPlanItem) {
    if (currentPlanItem.price.id !== planPriceId) {
      // Upgrade/downgrade
      itemUpdates.push({ id: currentPlanItem.id, price: planPriceId, quantity: 1 })
    }
    // else: no change needed for plan
  } else {
    // No plan item found (shouldn't happen) — add it
    itemUpdates.push({ price: planPriceId, quantity: 1 })
  }

  // Seats add-on
  if (seatPriceId) {
    if (desiredSeats > 0) {
      if (currentSeatItem) {
        if (currentSeatItem.quantity !== desiredSeats) {
          itemUpdates.push({ id: currentSeatItem.id, quantity: desiredSeats })
        }
      } else {
        itemUpdates.push({ price: seatPriceId, quantity: desiredSeats })
      }
    } else if (currentSeatItem) {
      // Remove seats
      itemUpdates.push({ id: currentSeatItem.id, deleted: true })
    }
  }

  // Courses add-on
  if (coursesPriceId) {
    if (desiredCourses && !currentCoursesItem) {
      itemUpdates.push({ price: coursesPriceId, quantity: 1 })
    } else if (!desiredCourses && currentCoursesItem) {
      itemUpdates.push({ id: currentCoursesItem.id, deleted: true })
    }
  }

  // Affiliate add-on
  if (affiliatePriceId) {
    if (desiredAffiliate && !currentAffiliateItem) {
      itemUpdates.push({ price: affiliatePriceId, quantity: 1 })
    } else if (!desiredAffiliate && currentAffiliateItem) {
      itemUpdates.push({ id: currentAffiliateItem.id, deleted: true })
    }
  }

  if (itemUpdates.length === 0) {
    return { success: true, message: 'No changes detected', unchanged: true }
  }

  // ── Apply update with proration ─────────────────────────────────────────────
  const updatedSub = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
    items: itemUpdates,
    proration_behavior: 'create_prorations',
    metadata: {
      plan: desiredPlan,
      addon_seats: String(desiredSeats),
      addon_courses: String(desiredCourses),
      addon_affiliate: String(desiredAffiliate),
      tenant_id: userRow.tenant_id,
    },
  })

  // ── Sync to DB immediately (webhook will also fire but this keeps UI snappy) ─
  const currentPeriodEnd = new Date((updatedSub.current_period_end as number) * 1000).toISOString()

  await supabase
    .from('tenants')
    .update({
      subscription_plan: desiredPlan,
      current_period_end: currentPeriodEnd,
      addon_seats: desiredSeats,
      addon_courses_enabled: desiredCourses,
      addon_affiliate_enabled: desiredAffiliate,
      is_trial: false,
    })
    .eq('id', userRow.tenant_id)

  console.log(`✅ Subscription updated for tenant ${userRow.tenant_id}: plan=${desiredPlan}, seats=+${desiredSeats}`)

  return {
    success: true,
    subscription_id: updatedSub.id,
    plan: desiredPlan,
    addons: { seats: desiredSeats, courses: desiredCourses, affiliate: desiredAffiliate },
    current_period_end: currentPeriodEnd,
    message: 'Abonnement erfolgreich aktualisiert. Anteilsmässige Verrechnung erfolgt auf der nächsten Rechnung.',
  }
})
