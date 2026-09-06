// server/api/customer/create-topup-session.post.ts
// Creates a Wallee payment session for credit top-up (self-service by customer)
// The Wallee webhook handles the actual credit deposit upon payment completion

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { loadCheckoutVat } from '~/server/utils/wallee-line-item'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  try {
    // ── Auth (cookie + Bearer + refresh fallback) ─────────
    const { requireGuestOrAuth } = await import('~/server/utils/require-guest-or-auth')
    const sessionUser = await requireGuestOrAuth(event)

    // ── Get user profile ──────────────────────────────────
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tenant_id, first_name, last_name, email')
      .eq('id', sessionUser.db_user_id)
      .single()
    if (!userProfile) throw createError({ statusCode: 404, statusMessage: 'Benutzerprofil nicht gefunden' })

    // ── Body ──────────────────────────────────────────────
    const body = await readBody(event)
    const { amountRappen } = body

    if (!amountRappen || typeof amountRappen !== 'number' || amountRappen < 500) {
      throw createError({ statusCode: 400, statusMessage: 'Mindestbetrag CHF 5.00 erforderlich' })
    }
    if (amountRappen > 100000) {
      throw createError({ statusCode: 400, statusMessage: 'Maximalbetrag CHF 1000.00 überschritten' })
    }

    const amountChf = amountRappen / 100
    const checkoutVat = await loadCheckoutVat(supabase, userProfile.tenant_id, amountRappen)

    // ── Create payment record (for webhook tracking) ──────
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userProfile.id,
        tenant_id: userProfile.tenant_id,
        total_amount_rappen: amountRappen,
        lesson_price_rappen: amountRappen,
        payment_method: 'wallee',
        payment_status: 'pending',
        currency: 'CHF',
        description: `Guthaben aufladen – ${userProfile.first_name} ${userProfile.last_name}`.trim(),
        payment_provider: 'wallee',
        metadata: JSON.stringify({
          is_topup: true,
          topup_amount_rappen: amountRappen,
          vat_rate: checkoutVat.vatRate,
          vat_amount_rappen: checkoutVat.vatAmountRappen,
        })
      })
      .select('id')
      .single()

    if (paymentError || !paymentRecord) {
      logger.error('❌ Failed to create topup payment record:', paymentError)
      throw createError({ statusCode: 500, statusMessage: 'Fehler beim Erstellen der Zahlung' })
    }

    const forwardedHost = getHeader(event, 'x-forwarded-host')
    const host = forwardedHost || getHeader(event, 'host') || 'simy.ch'
    const proto = getHeader(event, 'x-forwarded-proto') || 'https'
    const baseUrl = process.env.NUXT_PUBLIC_APP_URL
      ? `https://${process.env.NUXT_PUBLIC_APP_URL}`
      : `${proto}://${host}`

    const { createWalleeCheckoutForPayment } = await import('~/server/utils/wallee-appointment-checkout')
    const checkout = await createWalleeCheckoutForPayment({
      paymentId: paymentRecord.id,
      tenantId: userProfile.tenant_id,
      customerEmail: userProfile.email,
      customerName: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Kunde',
      customerId: userProfile.id,
      successUrl: `${baseUrl}/customer/payments?topup_success=1`,
      failedUrl: `${baseUrl}/customer/payments?topup_failed=1`,
    })

    logger.debug('✅ Topup session created:', { userId: userProfile.id, amountChf, transactionId: checkout.transactionId })

    return {
      success: true,
      paymentUrl: checkout.paymentUrl,
      paymentId: paymentRecord.id
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ create-topup-session error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Interner Fehler' })
  }
})
