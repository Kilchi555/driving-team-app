import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { accountId } = query

  if (!accountId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Account ID is required.'
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
    const account = await stripe.accounts.retrieve(accountId as string)

    return {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
      business_profile: account.business_profile
    }

  } catch (error: any) {
    console.error('Stripe Connect account status check failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to check account status.'
    })
  }
})
