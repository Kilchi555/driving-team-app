import type Stripe from 'stripe'

/**
 * Basil API (2025-03-31+): billing periods live on subscription items.
 * Never fall back to billing_cycle_anchor — that is the cycle anchor day
 * (e.g. "5th of the month"), not the next invoice date.
 */
export function resolveSubscriptionPeriodEndTs(sub: Stripe.Subscription): number | null {
  const itemEnds = (sub.items?.data ?? [])
    .map((item) => (item as Stripe.SubscriptionItem).current_period_end)
    .filter((ts): ts is number => typeof ts === 'number' && Number.isFinite(ts))

  if (itemEnds.length > 0) return Math.max(...itemEnds)

  const legacy = (sub as any).current_period_end
  if (typeof legacy === 'number' && Number.isFinite(legacy)) return legacy

  return null
}

export function resolveSubscriptionPeriodEnd(sub: Stripe.Subscription): string | null {
  const ts = resolveSubscriptionPeriodEndTs(sub)
  if (ts == null) return null
  return new Date(ts * 1000).toISOString()
}

/** True when stored period end is missing or already in the past (stale/wrong). */
export function isStalePeriodEnd(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return true
  const ms = new Date(iso).getTime()
  return !Number.isFinite(ms) || ms <= now
}
