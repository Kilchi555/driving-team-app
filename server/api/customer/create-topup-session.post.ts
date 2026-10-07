// server/api/customer/create-topup-session.post.ts
// Creates a Wallee payment session for credit top-up (self-service by customer)
// The Wallee webhook handles the actual credit deposit upon payment completion

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'
import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  try {
    // ── Auth (cookie + Bearer + refresh fallback) ─────────
    const user = await getAuthenticatedUser(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })

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
    // Merchant reference uses topup-{uuid} (webhook Pattern 1b). Claim keeps it
    // once set; do not fall back to payment-{uuid} for topups.
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
        metadata: { is_topup: true, topup_amount_rappen: amountRappen },
      })
      .select('id')
      .single()

    if (paymentError || !paymentRecord) {
      logger.error('❌ Failed to create topup payment record:', paymentError)
      throw createError({ statusCode: 500, statusMessage: 'Fehler beim Erstellen der Zahlung' })
    }

    const topupMerchantRef = `topup-${paymentRecord.id}`
    await supabase
      .from('payments')
      .update({ checkout_merchant_reference: topupMerchantRef })
      .eq('id', paymentRecord.id)
      .eq('tenant_id', userProfile.tenant_id)
      .is('checkout_merchant_reference', null)

    // ── Create Wallee transaction (DB-committed claim) ────
    const walleeConfig = await getWalleeConfigForTenant(userProfile.tenant_id)
    const spaceId = walleeConfig.spaceId
    const config = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)
    const transactionService = new Wallee.api.TransactionService(config)
    const paymentService = new Wallee.api.TransactionPaymentPageService(config)

    // Derive base URL from request headers (works on any deployment)
    const forwardedHost = getHeader(event, 'x-forwarded-host')
    const host = forwardedHost || getHeader(event, 'host') || 'simy.ch'
    const proto = getHeader(event, 'x-forwarded-proto') || 'https'
    const baseUrl = process.env.NUXT_PUBLIC_APP_URL
      ? `https://${process.env.NUXT_PUBLIC_APP_URL}`
      : `${proto}://${host}`

    const {
      livePaymentCheckoutDeps,
      runPaymentCheckoutCreate,
    } = await import('~/server/utils/wallee-checkout-claim')

    const checkout = await runPaymentCheckoutCreate(
      { paymentId: paymentRecord.id, tenantId: userProfile.tenant_id },
      livePaymentCheckoutDeps(
        async ({ merchantReference }) => {
          const createdTransaction = await transactionService.create(spaceId, {
            lineItems: [
              {
                name: 'Guthaben aufladen',
                quantity: 1,
                amountIncludingTax: amountChf,
                type: Wallee.model.LineItemType.PRODUCT,
                uniqueId: 'topup-1',
                taxRate: 0,
              },
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
            merchantReference: merchantReference || topupMerchantRef,
            successUrl: `${baseUrl}/customer/payments?topup_success=1`,
            failedUrl: `${baseUrl}/customer/payments?topup_failed=1`,
          })
          const transactionId = (createdTransaction as any)?.body?.id || (createdTransaction as any)?.id
          if (!transactionId) {
            throw createError({ statusCode: 502, statusMessage: 'Wallee-Transaktion konnte nicht erstellt werden' })
          }
          return { id: String(transactionId), spaceId }
        },
        {
          resolveUrl: async (transactionId) => {
            try {
              const urlResponse = await paymentService.paymentPageUrl(spaceId, Number(transactionId))
              const paymentUrl = (urlResponse as any)?.body || urlResponse
              return typeof paymentUrl === 'string' && paymentUrl ? paymentUrl : null
            } catch {
              return null
            }
          },
        }
      )
    )

    logger.debug('✅ Topup session created:', {
      userId: userProfile.id,
      amountChf,
      transactionId: checkout.transactionId,
      paymentUrl: checkout.paymentUrl?.substring(0, 80),
    })

    return {
      success: true,
      paymentUrl: checkout.paymentUrl,
      paymentId: paymentRecord.id,
      reused: checkout.reused,
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ create-topup-session error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Interner Fehler' })
  }
})
