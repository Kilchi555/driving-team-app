import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  // Single price mode using STRIPE_PRICE_ID
  const priceId = process.env.STRIPE_PRICE_ID
  if (!priceId) {
    throw createError({ statusCode: 500, statusMessage: 'Missing STRIPE_PRICE_ID' })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })

  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/payment/failed`
  })

  return { id: session.id, url: session.url }
})
