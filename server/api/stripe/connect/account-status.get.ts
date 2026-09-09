import { defineEventHandler, getQuery, createError } from 'h3'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireTenantAdmin } from '~/server/utils/require-tenant-auth'

function stripeConnectClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Payment provider is not configured',
    })
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2024-04-10',
  })
}

export default defineEventHandler(async (event) => {
  const actor = await requireTenantAdmin(event)
  getQuery(event)

  const supabase = getSupabaseAdmin()
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, stripe_connect_account_id')
    .eq('id', actor.tenant_id)
    .maybeSingle()

  if (tenantError || !tenant) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const accountId = tenant.stripe_connect_account_id as string | null
  if (!accountId) {
    return {
      connected: false,
      id: null,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
    }
  }

  try {
    const stripe = stripeConnectClient()
    const account = await stripe.accounts.retrieve(accountId)

    return {
      connected: true,
      id: account.id,
      charges_enabled: !!account.charges_enabled,
      payouts_enabled: !!account.payouts_enabled,
      details_submitted: !!account.details_submitted,
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to check account status',
    })
  }
})
