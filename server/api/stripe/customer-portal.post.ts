import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Creates a Stripe Billing Portal session so the tenant can:
// - Update payment method / card
// - Download invoices
// - View billing history
// The portal is hosted by Stripe – no PCI scope for us.
export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
  // a raw Bearer-only check that would 401 whenever the client's access
  // token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const userRow = authUser.db_user_id
    ? { tenant_id: authUser.tenant_id, role: authUser.role }
    : null

  if (!userRow?.tenant_id || userRow.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can access billing portal' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id, name, email')
    .eq('id', userRow.tenant_id)
    .single()

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'

  // Resolve or create a valid Stripe customer for the current mode (test vs live).
  // A stored ID may come from the other mode (e.g. cus_test_… used with live key) —
  // detect that via resource_missing and create a fresh customer in the current mode.
  let customerId = tenant?.stripe_customer_id
  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId)
    } catch (err: any) {
      if (err?.code === 'resource_missing') {
        console.warn(`⚠️ Stripe customer ${customerId} not found in current mode — creating new one`)
        customerId = null as any
      } else {
        throw err
      }
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: tenant?.name || undefined,
      email: (tenant as any)?.contact_email || (tenant as any)?.email || undefined,
      metadata: { tenant_id: userRow.tenant_id },
    })
    customerId = customer.id
    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', userRow.tenant_id)
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/admin/billing`,
  })

  return { url: session.url }
})
