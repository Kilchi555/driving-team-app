import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId, email, businessName } = body

  if (!tenantId || !email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID and email are required.'
    })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe secret key not configured.'
    })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-04-10',
  })

  try {
    // Create Express account for the tenant
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'CH',
      email: email,
      business_type: 'company',
      company: {
        name: businessName || 'Business Name'
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'daily'
          }
        }
      }
    })

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NUXT_PUBLIC_APP_URL}/admin/stripe-connect/reauth?tenant=${tenantId}`,
      return_url: `${process.env.NUXT_PUBLIC_APP_URL}/admin/stripe-connect/success?tenant=${tenantId}`,
      type: 'account_onboarding'
    })

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url
    }

  } catch (error: any) {
    console.error('Stripe Connect account creation failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create Stripe Connect account.'
    })
  }
})
