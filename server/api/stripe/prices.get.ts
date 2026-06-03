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

async function fetchPrices(): Promise<PricingResponse> {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' as any })

  const planPriceIds = PLANS
    .filter(p => p.priceEnvKey && process.env[p.priceEnvKey])
    .map(p => ({ key: p.id, priceId: process.env[p.priceEnvKey!]! }))

  const addonPriceIds = ADDONS
    .filter(a => process.env[a.priceEnvKey])
    .map(a => ({ key: a.key, priceId: process.env[a.priceEnvKey]! }))

  const allPriceIds = [...planPriceIds, ...addonPriceIds]

  const results = await Promise.allSettled(
    allPriceIds.map(({ priceId }) => stripe.prices.retrieve(priceId))
  )

  const toInfo = (price: Stripe.Price): PriceInfo => {
    const amount = price.unit_amount ?? 0
    const currency = (price.currency ?? 'chf').toUpperCase()
    const formatted = `${currency} ${(amount / 100).toFixed(2)}`
    return { id: price.id, unitAmount: amount, currency, formatted }
  }

  const plans: Record<string, PriceInfo> = {}
  const addons: Record<string, PriceInfo> = {}

  // Known live prices as fallback (in Rappen) — update when Stripe prices change
  const FALLBACK_PLAN_AMOUNTS: Record<string, number> = {
    starter: 4900,       // CHF 49.–
    professional: 14900, // CHF 149.–
    enterprise: 25900,   // CHF 259.–
  }
  const FALLBACK_ADDON_AMOUNTS: Record<string, number> = {
    seats: 1900,    // CHF 19.–
    courses: 2900,  // CHF 29.–
    affiliate: 3900, // CHF 39.–
  }

  planPriceIds.forEach(({ key }, i) => {
    const result = results[i]
    if (result.status === 'fulfilled') {
      plans[key] = toInfo(result.value)
    } else {
      const fallback = FALLBACK_PLAN_AMOUNTS[key] ?? 0
      console.error(`❌ Failed to fetch price for plan ${key} (using fallback CHF ${fallback / 100}):`, result.reason?.message)
      plans[key] = {
        id: '',
        unitAmount: fallback,
        currency: 'CHF',
        formatted: fallback ? `CHF ${(fallback / 100).toFixed(2)}` : 'Preis fehlt',
      }
    }
  })

  addonPriceIds.forEach(({ key }, i) => {
    const result = results[planPriceIds.length + i]
    if (result.status === 'fulfilled') {
      addons[key] = toInfo(result.value)
    } else {
      const fallback = FALLBACK_ADDON_AMOUNTS[key] ?? 0
      console.error(`❌ Failed to fetch price for addon ${key} (using fallback CHF ${fallback / 100}):`, result.reason?.message)
      addons[key] = {
        id: '',
        unitAmount: fallback,
        currency: 'CHF',
        formatted: fallback ? `CHF ${(fallback / 100).toFixed(2)}` : 'Preis fehlt',
      }
    }
  })

  return { plans, addons }
}

// Cache prices for 5 minutes — they rarely change and each fetch hits Stripe 6 times
// Use a shorter cache (30s) when fallback prices are used so real prices load quickly after fix
export default defineCachedEventHandler(
  () => fetchPrices(),
  {
    maxAge: 60 * 5,
    name: 'stripe-prices',
    getKey: () => 'prices',
    shouldBypassCache: () => false,
  }
)
