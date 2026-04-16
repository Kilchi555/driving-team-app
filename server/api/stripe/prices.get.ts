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

export default defineEventHandler(async (): Promise<PricingResponse> => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' as any })

  // Collect all price IDs we want to fetch
  const planPriceIds = PLANS
    .filter(p => p.priceEnvKey && process.env[p.priceEnvKey])
    .map(p => ({ key: p.id, priceId: process.env[p.priceEnvKey!]! }))

  const addonPriceIds = ADDONS
    .filter(a => process.env[a.priceEnvKey])
    .map(a => ({ key: a.key, priceId: process.env[a.priceEnvKey]! }))

  const allPriceIds = [...planPriceIds, ...addonPriceIds]

  // Fetch all prices individually to avoid one failure breaking everything
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

  planPriceIds.forEach(({ key }, i) => {
    const result = results[i]
    if (result.status === 'fulfilled') {
      plans[key] = toInfo(result.value)
    } else {
      console.error(`❌ Failed to fetch price for plan ${key}:`, result.reason?.message)
      plans[key] = { id: '', unitAmount: 0, currency: 'CHF', formatted: 'Preis fehlt' }
    }
  })

  addonPriceIds.forEach(({ key }, i) => {
    const result = results[planPriceIds.length + i]
    if (result.status === 'fulfilled') {
      addons[key] = toInfo(result.value)
    } else {
      console.error(`❌ Failed to fetch price for addon ${key}:`, result.reason?.message)
      addons[key] = { id: '', unitAmount: 0, currency: 'CHF', formatted: 'Preis fehlt' }
    }
  })

  return { plans, addons }
})
