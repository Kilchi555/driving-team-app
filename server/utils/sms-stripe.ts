import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSmsOveragePriceId } from '~/utils/planFeatures'
import { logger } from '~/utils/logger'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key, { apiVersion: '2025-08-27.basil' as any })
}

/** In-memory cache: priceId → meter event_name */
let cachedMeterEventName: { priceId: string; eventName: string } | null = null

/**
 * Resolve the Billing Meter event_name for the SMS overage price.
 * Prefer env override, otherwise load meter linked to STRIPE_PRICE_ADDON_SMS_OVERAGE.
 */
export async function getSmsMeterEventName(stripe?: Stripe | null): Promise<string | null> {
  const fromEnv = process.env.STRIPE_SMS_METER_EVENT_NAME?.trim()
  if (fromEnv) return fromEnv

  const priceId = getSmsOveragePriceId()
  if (!priceId) return null

  if (cachedMeterEventName?.priceId === priceId) {
    return cachedMeterEventName.eventName
  }

  const client = stripe || getStripe()
  if (!client) return null

  try {
    const price = await client.prices.retrieve(priceId)
    const meterId = (price.recurring as any)?.meter as string | undefined
    if (!meterId) {
      logger.warn('⚠️ SMS overage price has no Billing Meter linked — cannot report usage on Basil API')
      return null
    }
    const meter = await client.billing.meters.retrieve(meterId)
    const eventName = meter.event_name
    if (!eventName) return null
    cachedMeterEventName = { priceId, eventName }
    return eventName
  } catch (err: any) {
    logger.warn('⚠️ Could not resolve SMS meter event name:', err?.message || err)
    return null
  }
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
      if (item && !(item as any).deleted && item.price?.id === priceId) {
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

/**
 * Report overage SMS segments via Stripe Billing Meters (Basil+).
 * Legacy subscriptionItems.createUsageRecord is removed on 2025-03-31.basil.
 */
export async function reportSmsOverageUsage(opts: {
  customerId: string
  overageSegments: number
  idempotencyKey?: string
}): Promise<void> {
  if (opts.overageSegments <= 0) return
  if (!opts.customerId) {
    logger.warn('⚠️ SMS overage report skipped — missing stripe_customer_id')
    return
  }

  const stripe = getStripe()
  if (!stripe) return

  const eventName = await getSmsMeterEventName(stripe)
  if (!eventName) {
    logger.warn('⚠️ SMS overage report skipped — no meter event_name (set STRIPE_SMS_METER_EVENT_NAME or link a meter to the price)')
    return
  }

  try {
    await stripe.billing.meterEvents.create(
      {
        event_name: eventName,
        payload: {
          stripe_customer_id: opts.customerId,
          value: String(opts.overageSegments),
        },
        ...(opts.idempotencyKey
          ? { identifier: `sms-overage-${opts.idempotencyKey}`.slice(0, 100) }
          : {}),
      },
      opts.idempotencyKey
        ? { idempotencyKey: `sms-meter-${opts.idempotencyKey}`.slice(0, 255) }
        : undefined,
    )
  } catch (err: any) {
    logger.warn('⚠️ Stripe SMS meter event failed (non-critical):', err?.message || err)
  }
}

/** Attach SMS overage item during checkout/update when price is configured. */
export function smsOverageCheckoutLineItem(): Stripe.Checkout.SessionCreateParams.LineItem | null {
  const priceId = getSmsOveragePriceId()
  if (!priceId) return null
  return { price: priceId }
}

/**
 * Like smsOverageCheckoutLineItem, but verifies the price exists in the current
 * Stripe mode (test vs live). Prevents checkout 502 when .env has a live SMS
 * price while STRIPE_SECRET_KEY is sk_test_… (or vice versa).
 */
export async function smsOverageCheckoutLineItemSafe(): Promise<Stripe.Checkout.SessionCreateParams.LineItem | null> {
  const line = smsOverageCheckoutLineItem()
  if (!line?.price || typeof line.price !== 'string') return null

  const stripe = getStripe()
  if (!stripe) return null

  try {
    await stripe.prices.retrieve(line.price)
    return line
  } catch (err: any) {
    logger.warn('⚠️ Skipping SMS overage checkout line — price not available in current Stripe mode:', {
      priceId: line.price,
      message: err?.message,
    })
    return null
  }
}
