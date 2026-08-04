import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSmsOveragePriceId } from '~/utils/planFeatures'
import { logger } from '~/utils/logger'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key, { apiVersion: '2025-08-27.basil' as any })
}

/**
 * Ensure the metered SMS overage price is attached to a Stripe subscription.
 * Returns the subscription item id (cached on tenants when supabase+tenantId given).
 */
export async function ensureSmsOverageSubscriptionItem(opts: {
  subscriptionId: string
  supabase?: SupabaseClient
  tenantId?: string
  cachedItemId?: string | null
}): Promise<string | null> {
  const priceId = getSmsOveragePriceId()
  if (!priceId) return null

  const stripe = getStripe()
  if (!stripe) return null

  if (opts.cachedItemId) {
    try {
      const item = await stripe.subscriptionItems.retrieve(opts.cachedItemId)
      if (item && !item.deleted && item.price?.id === priceId) {
        return opts.cachedItemId
      }
    } catch {
      // fall through and re-resolve
    }
  }

  const sub = await stripe.subscriptions.retrieve(opts.subscriptionId, {
    expand: ['items.data.price'],
  })
  const existing = sub.items.data.find(i => i.price.id === priceId)
  if (existing) {
    await cacheSmsItemId(opts.supabase, opts.tenantId, existing.id)
    return existing.id
  }

  const created = await stripe.subscriptionItems.create({
    subscription: opts.subscriptionId,
    price: priceId,
    // Metered prices: no quantity
  })
  await cacheSmsItemId(opts.supabase, opts.tenantId, created.id)
  return created.id
}

async function cacheSmsItemId(
  supabase: SupabaseClient | undefined,
  tenantId: string | undefined,
  itemId: string,
) {
  if (!supabase || !tenantId) return
  await supabase
    .from('tenants')
    .update({ stripe_sms_subscription_item_id: itemId })
    .eq('id', tenantId)
}

/** Report only overage segments for this send (idempotent via twilio SID). */
export async function reportSmsOverageUsage(opts: {
  subscriptionItemId: string
  overageSegments: number
  idempotencyKey?: string
}): Promise<void> {
  if (opts.overageSegments <= 0) return
  const stripe = getStripe()
  if (!stripe) return

  try {
    await stripe.subscriptionItems.createUsageRecord(
      opts.subscriptionItemId,
      {
        quantity: opts.overageSegments,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'increment',
      },
      opts.idempotencyKey
        ? { idempotencyKey: `sms-overage-${opts.idempotencyKey}` }
        : undefined,
    )
  } catch (err: any) {
    logger.warn('⚠️ Stripe SMS usage record failed (non-critical):', err?.message || err)
  }
}

/** Attach SMS overage item during checkout/update when price is configured. */
export function smsOverageCheckoutLineItem(): Stripe.Checkout.SessionCreateParams.LineItem | null {
  const priceId = getSmsOveragePriceId()
  if (!priceId) return null
  // Metered: omit quantity
  return { price: priceId }
}
