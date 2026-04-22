import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import {
  resolveFeatureFlags,
  ALL_FEATURE_FLAGS,
  type SubscriptionPlan,
} from '~/utils/planFeatures'

export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecret || !webhookSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
  const rawBody = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!rawBody || !signature) {
    throw createError({ statusCode: 400, statusMessage: 'Missing body or signature' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    console.error('❌ Stripe webhook signature verification failed:', err.message)
    throw createError({ statusCode: 400, statusMessage: `Webhook Error: ${err.message}` })
  }

  const supabase = getSupabaseAdmin()

  try {
    switch (stripeEvent.type) {

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = stripeEvent.data.object as Stripe.Subscription
        await handleSubscriptionUpsert(supabase, stripe, sub)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, sub)
        break
      }

      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.CheckoutSession
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          await handleSubscriptionUpsert(supabase, stripe, sub)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
          await handleSubscriptionUpsert(supabase, stripe, sub)
          // Clear any past_due flag
          const tenantId = await getTenantIdByCustomer(supabase, sub.customer as string)
          if (tenantId) {
            await supabase
              .from('tenant_settings')
              .upsert({
                tenant_id: tenantId,
                category: 'billing',
                setting_key: 'subscription_status',
                setting_value: JSON.stringify({ status: 'active' }),
              }, { onConflict: 'tenant_id,setting_key' })
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice
        if (invoice.customer) {
          const tenantId = await getTenantIdByCustomer(supabase, invoice.customer as string)
          if (tenantId) {
            // Mark tenant as past_due in tenant_settings so the UI can show a warning
            await supabase
              .from('tenant_settings')
              .upsert({
                tenant_id: tenantId,
                category: 'billing',
                setting_key: 'subscription_status',
                setting_value: JSON.stringify({ status: 'past_due', failed_at: new Date().toISOString() }),
              }, { onConflict: 'tenant_id,setting_key' })
            console.warn(`⚠️ Payment failed for tenant ${tenantId} – marked as past_due`)
          }
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        // Fires 3 days before a Stripe-managed trial ends.
        // We use our own trial system but handle this for future Stripe trial support.
        const sub = stripeEvent.data.object as Stripe.Subscription
        const tenantId = await getTenantIdByCustomer(supabase, sub.customer as string)
        if (tenantId) {
          await supabase
            .from('tenant_settings')
            .upsert({
              tenant_id: tenantId,
              category: 'billing',
              setting_key: 'subscription_status',
              setting_value: JSON.stringify({ status: 'trial_ending_soon' }),
            }, { onConflict: 'tenant_id,setting_key' })
          console.log(`📅 Trial ending soon for tenant ${tenantId}`)
        }
        break
      }

      default:
        break
    }
  } catch (err: any) {
    console.error(`❌ Error handling Stripe event ${stripeEvent.type}:`, err)
    throw createError({ statusCode: 500, statusMessage: 'Webhook handler error' })
  }

  return { received: true }
})

// ─────────────────────────────────────────────────────────────────────────────

async function handleSubscriptionUpsert(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  stripe: Stripe,
  sub: Stripe.Subscription
) {
  const customerId = sub.customer as string
  const tenantId = await resolveTenantId(supabase, customerId, sub)
  if (!tenantId) {
    console.warn(`⚠️ No tenant found for Stripe customer ${customerId}`)
    return
  }

  // ── Resolve plan from metadata ──────────────────────────────────────────
  const plan = (sub.metadata?.plan || resolvePlanFromPrices(sub)) as SubscriptionPlan
  const currentPeriodEnd = new Date((sub.current_period_end as number) * 1000).toISOString()

  // ── Resolve add-ons from subscription items ─────────────────────────────
  const addonSeats = parseAddonSeats(sub)
  const addonCourses = hasAddonByEnvKey(sub, 'STRIPE_PRICE_ADDON_COURSES') ||
    sub.metadata?.addon_courses === 'true'
  const addonAffiliate = hasAddonByEnvKey(sub, 'STRIPE_PRICE_ADDON_AFFILIATE') ||
    sub.metadata?.addon_affiliate === 'true'

  // cancel_at from Stripe (if scheduled)
  const cancelAt = sub.cancel_at
    ? new Date((sub.cancel_at as number) * 1000).toISOString()
    : null

  // ── Update tenant ───────────────────────────────────────────────────────
  await supabase
    .from('tenants')
    .update({
      stripe_subscription_id: sub.id,
      subscription_plan: plan,
      current_period_end: currentPeriodEnd,
      is_trial: false,
      addon_seats: addonSeats,
      addon_courses_enabled: addonCourses,
      addon_affiliate_enabled: addonAffiliate,
      subscription_cancel_at: cancelAt,
    })
    .eq('id', tenantId)

  // ── Sync feature flags ──────────────────────────────────────────────────
  await syncFeatureFlags(supabase, tenantId, plan, { courses: addonCourses, affiliate: addonAffiliate })

  console.log(`✅ Tenant ${tenantId} → plan=${plan} seats=+${addonSeats} courses=${addonCourses} affiliate=${addonAffiliate}`)
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  sub: Stripe.Subscription
) {
  const customerId = sub.customer as string
  const tenantId = await getTenantIdByCustomer(supabase, customerId)
  if (!tenantId) return

  await supabase
    .from('tenants')
    .update({
      stripe_subscription_id: null,
      stripe_price_id: null,
      subscription_plan: 'trial',
      current_period_end: null,
      addon_seats: 0,
      addon_courses_enabled: false,
      addon_affiliate_enabled: false,
      subscription_cancel_at: null,
    })
    .eq('id', tenantId)

  await syncFeatureFlags(supabase, tenantId, 'trial', {})
  console.log(`⚠️ Subscription cancelled for tenant ${tenantId}`)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getTenantIdByCustomer(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.id ?? null
}

async function resolveTenantId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  customerId: string,
  sub: Stripe.Subscription
): Promise<string | null> {
  // Try customer ID first
  const fromCustomer = await getTenantIdByCustomer(supabase, customerId)
  if (fromCustomer) return fromCustomer

  // Fallback: metadata set at checkout
  const tenantIdFromMeta = sub.metadata?.tenant_id
  if (tenantIdFromMeta) {
    // Bind the customer to this tenant for future lookups
    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenantIdFromMeta)
    return tenantIdFromMeta
  }

  return null
}

function resolvePlanFromPrices(sub: Stripe.Subscription): string {
  const envMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER || '_']: 'starter',
    [process.env.STRIPE_PRICE_PROFESSIONAL || '_']: 'professional',
    [process.env.STRIPE_PRICE_ENTERPRISE || '_']: 'enterprise',
  }
  for (const item of sub.items.data) {
    const match = envMap[item.price.id]
    if (match) return match
  }
  return 'starter'
}

function hasAddonByEnvKey(sub: Stripe.Subscription, envKey: string): boolean {
  const priceId = process.env[envKey]
  if (!priceId) return false
  return sub.items.data.some(item => item.price.id === priceId)
}

function parseAddonSeats(sub: Stripe.Subscription): number {
  const priceId = process.env['STRIPE_PRICE_ADDON_SEATS']
  if (!priceId) return 0
  const item = sub.items.data.find(i => i.price.id === priceId)
  return item?.quantity ?? 0
}

async function syncFeatureFlags(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  plan: SubscriptionPlan,
  addons: { courses?: boolean; affiliate?: boolean }
) {
  const enabledFlags = new Set(resolveFeatureFlags(plan, addons))

  const upserts = ALL_FEATURE_FLAGS.map(flag => ({
    tenant_id: tenantId,
    category: 'features',
    setting_key: flag,
    setting_value: JSON.stringify({ enabled: enabledFlags.has(flag) }),
  }))

  await supabase
    .from('tenant_settings')
    .upsert(upserts, { onConflict: 'tenant_id,setting_key' })
}
