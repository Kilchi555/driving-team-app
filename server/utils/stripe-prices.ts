import Stripe from 'stripe'
import { PLANS, ADDONS } from '~/utils/planFeatures'

export interface PriceInfo {
  id: string
  unitAmount: number  // in Rappen/Cents
  currency: string
  formatted: string   // e.g. "CHF 59.00"
}

export interface PricingResponse {
  plans: Record<string, PriceInfo>
  addons: Record<string, PriceInfo>
}

/** Fallback amounts (Rappen) if Stripe is unreachable — keep in sync with live prices. */
export const FALLBACK_PLAN_AMOUNTS: Record<string, number> = {
  starter: 4900,       // CHF 49.–
  professional: 14900, // CHF 149.–
  enterprise: 25900,   // CHF 259.–
}

export const FALLBACK_ADDON_AMOUNTS: Record<string, number> = {
  seats: 1900,     // CHF 19.–
  courses: 2900,   // CHF 29.–
  affiliate: 3900, // CHF 39.–
  gbp: 1900,       // CHF 19.–
}

/**
 * Fetch current plan + add-on unit amounts from Stripe Price IDs in env.
 * Falls back to known amounts when a price is missing or Stripe fails.
 */
export async function fetchStripePrices(): Promise<PricingResponse> {
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' as any })

  // .trim() defensively against trailing newlines pasted into Vercel env vars.
  const planPriceIds = PLANS
    .filter(p => p.priceEnvKey && process.env[p.priceEnvKey]?.trim())
    .map(p => ({ key: p.id, priceId: process.env[p.priceEnvKey!]!.trim() }))

  // Include every known add-on so callers always get a value (fallback if env missing).
  const addonPriceIds = ADDONS.map(a => ({
    key: a.key,
    priceId: process.env[a.priceEnvKey]?.trim() || '',
  }))

  const fetchable = [
    ...planPriceIds.map(p => ({ ...p, kind: 'plan' as const })),
    ...addonPriceIds.filter(a => a.priceId).map(a => ({ ...a, kind: 'addon' as const })),
  ]

  const results = await Promise.allSettled(
    fetchable.map(({ priceId }) => stripe.prices.retrieve(priceId))
  )

  const fetched = new Map<string, Stripe.Price>()
  fetchable.forEach(({ key }, i) => {
    const result = results[i]
    if (result.status === 'fulfilled') fetched.set(key, result.value)
    else console.error(`❌ Failed to fetch Stripe price for ${key}:`, result.reason?.message)
  })

  const toInfo = (price: Stripe.Price): PriceInfo => {
    const amount = price.unit_amount ?? 0
    const currency = (price.currency ?? 'chf').toUpperCase()
    const formatted = `${currency} ${(amount / 100).toFixed(2)}`
    return { id: price.id, unitAmount: amount, currency, formatted }
  }

  const fallbackInfo = (amount: number): PriceInfo => ({
    id: '',
    unitAmount: amount,
    currency: 'CHF',
    formatted: amount ? `CHF ${(amount / 100).toFixed(2)}` : 'Preis fehlt',
  })

  const plans: Record<string, PriceInfo> = {}
  for (const { key } of planPriceIds) {
    const price = fetched.get(key)
    plans[key] = price ? toInfo(price) : fallbackInfo(FALLBACK_PLAN_AMOUNTS[key] ?? 0)
  }

  const addons: Record<string, PriceInfo> = {}
  for (const { key } of addonPriceIds) {
    const price = fetched.get(key)
    addons[key] = price ? toInfo(price) : fallbackInfo(FALLBACK_ADDON_AMOUNTS[key] ?? 0)
  }

  return { plans, addons }
}

export type AddonFlags = {
  addon_seats?: number | null
  addon_courses_enabled?: boolean | null
  addon_affiliate_enabled?: boolean | null
  addon_gbp_enabled?: boolean | null
}

/** Estimate monthly recurring revenue in Rappen from plan + add-on flags. */
export function estimateMrrFromPricing(
  pricing: PricingResponse,
  plan: string,
  addons: AddonFlags = {}
): number {
  let total = pricing.plans[plan]?.unitAmount ?? FALLBACK_PLAN_AMOUNTS[plan] ?? 0
  total += (addons.addon_seats || 0) * (pricing.addons.seats?.unitAmount ?? FALLBACK_ADDON_AMOUNTS.seats)
  if (addons.addon_courses_enabled) {
    total += pricing.addons.courses?.unitAmount ?? FALLBACK_ADDON_AMOUNTS.courses
  }
  if (addons.addon_affiliate_enabled) {
    total += pricing.addons.affiliate?.unitAmount ?? FALLBACK_ADDON_AMOUNTS.affiliate
  }
  if (addons.addon_gbp_enabled) {
    total += pricing.addons.gbp?.unitAmount ?? FALLBACK_ADDON_AMOUNTS.gbp
  }
  return total
}
