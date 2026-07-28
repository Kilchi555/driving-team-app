import { PLANS, ADDONS } from '~/utils/planFeatures'
import { fetchStripePrices, type PriceInfo, type PricingResponse } from '~/server/utils/stripe-prices'

export type { PriceInfo, PricingResponse }

// Cache prices for 5 minutes — they rarely change and each fetch hits Stripe a few times.
// Include configured price IDs in the cache key so adding/changing env vars invalidates it.
export default defineCachedEventHandler(
  () => fetchStripePrices(),
  {
    maxAge: 60 * 5,
    name: 'stripe-prices',
    getKey: () => {
      const ids = [
        ...PLANS.map(p => p.priceEnvKey && process.env[p.priceEnvKey]?.trim()),
        ...ADDONS.map(a => process.env[a.priceEnvKey]?.trim()),
      ].filter(Boolean)
      return `prices:${ids.join(',')}`
    },
    shouldBypassCache: () => false,
  }
)
