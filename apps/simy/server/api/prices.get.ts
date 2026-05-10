import Stripe from 'stripe'

interface PlanPrice {
  id: string
  unitAmount: number
  formatted: string
}

export default defineCachedEventHandler(
  async () => {
    const config = useRuntimeConfig()
    const secret = config.stripeSecretKey

    if (!secret) {
      return { starter: null, professional: null, enterprise: null }
    }

    const stripe = new Stripe(secret, { apiVersion: '2025-08-27.basil' as any })

    const priceIds = [
      { key: 'starter',      id: config.stripePriceStarter },
      { key: 'professional', id: config.stripePriceProfessional },
      { key: 'enterprise',   id: config.stripePriceEnterprise },
    ].filter(p => !!p.id)

    const results = await Promise.allSettled(
      priceIds.map(p => stripe.prices.retrieve(p.id))
    )

    const out: Record<string, PlanPrice | null> = {
      starter: null, professional: null, enterprise: null,
    }

    priceIds.forEach(({ key }, i) => {
      const result = results[i]
      if (result.status === 'fulfilled') {
        const amount = result.value.unit_amount ?? 0
        out[key] = {
          id: result.value.id,
          unitAmount: amount,
          formatted: (amount / 100).toFixed(0),
        }
      }
    })

    return out
  },
  {
    maxAge: 60 * 10,
    name: 'simy-prices',
    getKey: () => 'landing-prices',
  }
)
