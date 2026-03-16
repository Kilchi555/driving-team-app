// server/api/customer/create-topup-session.post.ts
// Creates a Wallee payment session for credit top-up (self-service by customer)
// The Wallee webhook handles the actual credit deposit upon payment completion

import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'
import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  try {
    // ── Auth ──────────────────────────────────────────────
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Invalid authentication' })

    // ── Get user profile ──────────────────────────────────
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tenant_id, first_name, last_name, email')
      .eq('auth_user_id', user.id)
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
        metadata: JSON.stringify({ is_topup: true, topup_amount_rappen: amountRappen })
      })
      .select('id')
      .single()

    if (paymentError || !paymentRecord) {
      logger.error('❌ Failed to create topup payment record:', paymentError)
      throw createError({ statusCode: 500, statusMessage: 'Fehler beim Erstellen der Zahlung' })
    }

    // ── Create Wallee transaction ──────────────────────────
    const walleeConfig = getWalleeConfigForTenant(userProfile.tenant_id)
    const spaceId = walleeConfig.spaceId
    const config = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)
    const transactionService = new Wallee.api.TransactionService(config)
    const paymentService = new Wallee.api.TransactionPaymentPageService(config)

    // Derive base URL from request headers (works on any deployment)
    const forwardedHost = getHeader(event, 'x-forwarded-host')
    const host = forwardedHost || getHeader(event, 'host') || 'app.drivingteam.ch'
    const proto = getHeader(event, 'x-forwarded-proto') || 'https'
    const baseUrl = process.env.NUXT_PUBLIC_APP_URL
      ? `https://${process.env.NUXT_PUBLIC_APP_URL}`
      : `${proto}://${host}`

    const transactionCreate: Wallee.model.TransactionCreate = {
      lineItems: [
        {
          name: 'Guthaben aufladen',
          quantity: 1,
          amountIncludingTax: amountChf,
          type: Wallee.model.LineItemType.PRODUCT,
          uniqueId: 'topup-1',
          taxRate: 0
        }
      ],
      spaceViewId: null,
      currency: 'CHF',
      autoConfirmationEnabled: true,
      chargeRetryEnabled: false,
      customersEmailAddress: userProfile.email,
      customerId: `dt-${userProfile.tenant_id}-${userProfile.id}`,
      shippingAddress: null,
      billingAddress: null,
      deviceSessionIdentifier: null,
      merchantReference: `topup-${paymentRecord.id} | ${userProfile.first_name} ${userProfile.last_name}`,
      successUrl: `${baseUrl}/customer/payments?topup_success=1`,
      failedUrl: `${baseUrl}/customer/payments?topup_failed=1`
    }

    const createdTransaction = await transactionService.create(spaceId, transactionCreate)
    const transactionId = (createdTransaction as any)?.body?.id || (createdTransaction as any)?.id
    if (!transactionId) {
      await supabase.from('payments').delete().eq('id', paymentRecord.id)
      throw createError({ statusCode: 500, statusMessage: 'Wallee-Transaktion konnte nicht erstellt werden' })
    }

    // ── Store wallee transaction ID on payment record ─────
    await supabase
      .from('payments')
      .update({ wallee_transaction_id: String(transactionId) })
      .eq('id', paymentRecord.id)

    const urlResponse = await paymentService.paymentPageUrl(spaceId, transactionId)
    let paymentUrl: string = (urlResponse as any)?.body || urlResponse

    if (!paymentUrl || typeof paymentUrl !== 'string') {
      paymentUrl = `https://app-wallee.com/payment/transaction/pay?spaceId=${spaceId}&transactionId=${transactionId}`
    }

    logger.debug('✅ Topup session created:', { userId: userProfile.id, amountChf, transactionId, paymentUrl: paymentUrl?.substring(0, 80) })

    return {
      success: true,
      paymentUrl,
      paymentId: paymentRecord.id
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ create-topup-session error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Interner Fehler' })
  }
})
