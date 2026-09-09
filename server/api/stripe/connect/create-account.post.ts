import { defineEventHandler, readBody, createError } from 'h3'
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
  await readBody(event).catch(() => null)

  const appUrl = process.env.NUXT_PUBLIC_APP_URL
  if (!appUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Payment provider is not configured',
    })
  }

  const supabase = getSupabaseAdmin()
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, contact_email, stripe_connect_account_id')
    .eq('id', actor.tenant_id)
    .maybeSingle()

  if (tenantError || !tenant) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const email = tenant.contact_email || actor.email
  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant email is required',
    })
  }

  try {
    const stripe = stripeConnectClient()
    let accountId = tenant.stripe_connect_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'CH',
        email,
        business_type: 'company',
        company: {
          name: tenant.name || 'Business Name',
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily',
            },
          },
        },
      })
      accountId = account.id

      const { error: persistError } = await supabase
        .from('tenants')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', actor.tenant_id)

      if (persistError || !accountId) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create Stripe Connect account',
        })
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/admin/stripe-connect/reauth`,
      return_url: `${appUrl}/admin/stripe-connect/success`,
      type: 'account_onboarding',
    })

    return {
      accountId,
      onboardingUrl: accountLink.url,
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create Stripe Connect account',
    })
  }
})
