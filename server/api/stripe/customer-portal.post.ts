import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Creates a Stripe Billing Portal session so the tenant can:
// - Update payment method / card
// - Download invoices
// - View billing history
// Branded with the platform account (Simy) — expected for multi-tenant SaaS.
export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const tenantId = authUser.tenant_id
  const userRole = authUser.role

  if (!tenantId || userRole !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can access billing portal' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id, stripe_subscription_id, name, contact_email')
    .eq('id', tenantId)
    .single()

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
  const keyMode = stripeSecret.startsWith('sk_live') ? 'live' : 'test'

  let customerId: string | null = null
  let subscriptionId: string | null = tenant?.stripe_subscription_id || null

  // 1) Prefer active subscription tagged with this tenant (most reliable)
  try {
    const found = await stripe.subscriptions.search({
      query: `metadata["tenant_id"]:"${tenantId}" AND status:"active"`,
      limit: 5,
    })
    const sub = found.data[0]
    if (sub) {
      subscriptionId = sub.id
      customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || null
    }
  } catch (err: any) {
    // Search may be unavailable on some accounts — fall through
    console.warn('⚠️ Portal: subscription search failed:', err?.message || err)
  }

  // 2) Fall back to stored subscription id
  if (!customerId && subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || null
    } catch (err: any) {
      if (err?.code !== 'resource_missing') throw err
      console.warn(`⚠️ Portal: subscription ${subscriptionId} missing in ${keyMode} mode`)
    }
  }

  // 3) Fall back to stored customer id
  if (!customerId && tenant?.stripe_customer_id) {
    customerId = tenant.stripe_customer_id
  }

  // Validate customer still exists
  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId)
      if ((customer as any).deleted) customerId = null
    } catch (err: any) {
      if (err?.code === 'resource_missing') {
        console.warn(`⚠️ Portal: customer ${customerId} missing in ${keyMode} mode`)
        customerId = null
      } else {
        throw err
      }
    }
  }

  // 4) Self-heal: if customer has no billing history, find a better match by email
  //    (guards against empty orphan customers created by older portal code).
  if (customerId && tenant?.contact_email) {
    const history = await billingHistoryCounts(stripe, customerId)
    if (history.invoices === 0 && history.cards === 0) {
      const better = await findCustomerWithHistory(stripe, tenant.contact_email, subscriptionId)
      if (better && better !== customerId) {
        console.warn(
          `⚠️ Portal: tenant ${tenantId} customer ${customerId} has no history — switching to ${better}`
        )
        customerId = better
      }
    }
  }

  // 5) Email search if we still have no customer
  if (!customerId && tenant?.contact_email) {
    customerId = await findCustomerWithHistory(stripe, tenant.contact_email, subscriptionId)
  }

  // Persist repaired IDs
  if (customerId) {
    const patch: Record<string, string> = {}
    if (tenant?.stripe_customer_id !== customerId) patch.stripe_customer_id = customerId
    if (subscriptionId && tenant?.stripe_subscription_id !== subscriptionId) {
      patch.stripe_subscription_id = subscriptionId
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from('tenants').update(patch).eq('id', tenantId)
    }
  }

  if (!customerId) {
    const hasStoredStripeIds = !!(tenant?.stripe_subscription_id || tenant?.stripe_customer_id)
    if (hasStoredStripeIds) {
      throw createError({
        statusCode: 409,
        statusMessage: keyMode === 'test'
          ? 'Billing-Portal nicht verfügbar: Die Abo-Daten sind im Stripe-Live-Modus, lokal läuft aber der Test-Key. Bitte auf app.simy.ch öffnen.'
          : 'Kein gültiger Stripe-Customer mit Rechnungen gefunden. Bitte Support kontaktieren.',
        data: { code: 'stripe_mode_mismatch', stripe_mode: keyMode },
      })
    }

    const customer = await stripe.customers.create({
      name: tenant?.name || undefined,
      email: tenant?.contact_email || undefined,
      metadata: { tenant_id: tenantId },
    })
    customerId = customer.id
    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenantId)
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/admin/billing`,
  })

  return { url: session.url }
})

async function billingHistoryCounts(stripe: Stripe, customerId: string) {
  const [invoices, cards] = await Promise.all([
    stripe.invoices.list({ customer: customerId, limit: 1 }),
    stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 }),
  ])
  return { invoices: invoices.data.length, cards: cards.data.length }
}

/** Prefer customer that owns the known subscription, else one with invoices/cards. */
async function findCustomerWithHistory(
  stripe: Stripe,
  email: string,
  subscriptionId: string | null
): Promise<string | null> {
  const listed = await stripe.customers.list({ email, limit: 20 })
  let withHistory: string | null = null

  for (const c of listed.data) {
    if (subscriptionId) {
      try {
        const subs = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 20 })
        if (subs.data.some(s => s.id === subscriptionId)) return c.id
      } catch { /* continue */ }
    }
    const history = await billingHistoryCounts(stripe, c.id)
    if (history.invoices > 0 || history.cards > 0) {
      withHistory = c.id
    }
  }

  return withHistory
}
