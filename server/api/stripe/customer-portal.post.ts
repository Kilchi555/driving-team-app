import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Creates a Stripe Billing Portal session so the tenant can:
// - Update payment method / card
// - Download invoices
// - View billing history
// The portal is hosted by Stripe and branded with the platform account (Simy),
// not the tenant name — that is expected for a multi-tenant SaaS.
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

  // Prefer the customer that actually owns the active subscription.
  // Otherwise portal can open on an empty/orphan customer (no cards, no invoices)
  // after a test/live mismatch recreate.
  let customerId: string | null = tenant?.stripe_customer_id || null

  if (tenant?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)
      const subCustomer = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
      if (subCustomer) {
        if (customerId && customerId !== subCustomer) {
          console.warn(
            `⚠️ Portal: tenant ${tenantId} customer ${customerId} ≠ subscription customer ${subCustomer} — using subscription customer`
          )
        }
        customerId = subCustomer
        if (tenant.stripe_customer_id !== subCustomer) {
          await supabase
            .from('tenants')
            .update({ stripe_customer_id: subCustomer })
            .eq('id', tenantId)
        }
      }
    } catch (err: any) {
      if (err?.code !== 'resource_missing') throw err
      console.warn(`⚠️ Portal: subscription ${tenant.stripe_subscription_id} missing in current Stripe mode`)
    }
  }

  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId)
      if ((customer as any).deleted) customerId = null
    } catch (err: any) {
      if (err?.code === 'resource_missing') {
        console.warn(`⚠️ Stripe customer ${customerId} not found in current mode`)
        customerId = null
      } else {
        throw err
      }
    }
  }

  // Only create a brand-new customer when there is truly nothing to attach —
  // never when a subscription/customer ID exists in DB but is missing in this Stripe mode
  // (typical local setup: live IDs in DB + sk_test_ key → would open an empty portal).
  if (!customerId) {
    const hasStoredStripeIds = !!(tenant?.stripe_subscription_id || tenant?.stripe_customer_id)
    const keyMode = stripeSecret.startsWith('sk_live') ? 'live' : 'test'

    if (hasStoredStripeIds) {
      throw createError({
        statusCode: 409,
        statusMessage: keyMode === 'test'
          ? 'Billing-Portal nicht verfügbar: Die Abo-Daten sind im Stripe-Live-Modus, lokal läuft aber der Test-Key. Bitte auf app.simy.ch öffnen oder lokal den Live-Key verwenden.'
          : 'Stripe-Abo/Customer nicht im aktuellen Stripe-Modus gefunden. Bitte Support kontaktieren.',
        data: {
          code: 'stripe_mode_mismatch',
          stripe_mode: keyMode,
          has_subscription_id: !!tenant?.stripe_subscription_id,
          has_customer_id: !!tenant?.stripe_customer_id,
        },
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
