// server/api/admin/extend-stripe-trial.post.ts
// Super-admin only: extend a tenant's Stripe subscription trial by 7 days.

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const { tenant_id } = await readBody(event)
  if (!tenant_id) throw createError({ statusCode: 400, statusMessage: 'tenant_id erforderlich' })

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })

  const supabase = getSupabaseAdmin()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_subscription_id, name')
    .eq('id', tenant_id)
    .single()

  if (!tenant?.stripe_subscription_id) {
    throw createError({ statusCode: 404, statusMessage: 'Kein aktives Stripe-Abonnement gefunden' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' as any })
  const sub = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)

  if (sub.status !== 'trialing') {
    throw createError({ statusCode: 400, statusMessage: `Abonnement ist nicht im Trial-Status (aktuell: ${sub.status})` })
  }

  const currentTrialEnd = sub.trial_end ?? Math.floor(Date.now() / 1000)
  const newTrialEnd = currentTrialEnd + 7 * 24 * 60 * 60 // +7 days in seconds

  await stripe.subscriptions.update(tenant.stripe_subscription_id, {
    trial_end: newTrialEnd,
  })

  const newTrialEndDate = new Date(newTrialEnd * 1000).toLocaleDateString('de-CH')
  console.log(`✅ Stripe trial extended by 7 days for tenant ${tenant_id}. New end: ${newTrialEndDate}`)

  return {
    success: true,
    message: `Trial verlängert bis ${newTrialEndDate}`,
    newTrialEnd: new Date(newTrialEnd * 1000).toISOString(),
  }
})
