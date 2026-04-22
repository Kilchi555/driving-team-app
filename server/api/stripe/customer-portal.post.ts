import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'

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

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { data: userRow } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!userRow?.tenant_id || userRow.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can access billing portal' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id, name, email')
    .eq('id', userRow.tenant_id)
    .single()

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://www.simy.ch'

  // Create customer if not yet existing (edge case: trial without checkout)
  let customerId = tenant?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: tenant?.name || undefined,
      email: tenant?.email || undefined,
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
    return_url: `${baseUrl}/upgrade`,
  })

  return { url: session.url }
})
