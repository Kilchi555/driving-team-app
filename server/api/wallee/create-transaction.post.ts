// server/api/wallee/create-transaction.post.ts
// Generic Wallee transaction endpoint used by the public shop (standalone product purchases)
// Supports both authenticated users and guests (no auth required)

import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'
import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  try {
    const body = await readBody(event)
    const {
      orderId,        // existing payment record ID
      amount,         // in CHF (not rappen)
      currency = 'CHF',
      customerEmail,
      customerName,
      description = 'Produktkauf',
      tenantId,
      userId,
      successUrl,
      failedUrl
    } = body

    if (!orderId || !amount || !customerEmail || !customerName) {
      throw createError({ statusCode: 400, message: 'Pflichtfelder fehlen: orderId, amount, customerEmail, customerName' })
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw createError({ statusCode: 400, message: 'amount muss eine positive Zahl sein' })
    }

    // Keep endpoint resilient for public callers:
    // if tenantId is missing in client payload, derive it from the payment record.
    let resolvedTenantId = tenantId
    if (!resolvedTenantId) {
      const { data: paymentData, error: paymentLookupError } = await supabase
        .from('payments')
        .select('tenant_id')
        .eq('id', orderId)
        .maybeSingle()

      if (paymentLookupError || !paymentData?.tenant_id) {
        throw createError({ statusCode: 400, message: 'tenantId fehlt und konnte nicht aus payment ermittelt werden' })
      }
      resolvedTenantId = paymentData.tenant_id
      logger.debug('ℹ️ Resolved tenantId from payment:', { orderId, tenantId: resolvedTenantId })
    }

    // ── Wallee config for this tenant ─────────────────────
    let walleeConfig: any
    try {
      walleeConfig = getWalleeConfigForTenant(resolvedTenantId)
    } catch (e: any) {
      throw createError({ statusCode: 500, message: `Wallee nicht konfiguriert für diesen Tenant: ${e.message}` })
    }

    const spaceId = walleeConfig.spaceId
    const sdkConfig = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)
    const transactionService = new Wallee.api.TransactionService(sdkConfig)
    const paymentPageService = new Wallee.api.TransactionPaymentPageService(sdkConfig)

    // ── Base URL for redirects ─────────────────────────────
    const forwardedHost = getHeader(event, 'x-forwarded-host')
    const host = forwardedHost || getHeader(event, 'host') || 'app.simy.ch'
    const proto = getHeader(event, 'x-forwarded-proto') || 'https'
    const baseUrl = process.env.NUXT_PUBLIC_APP_URL
      ? `https://${process.env.NUXT_PUBLIC_APP_URL}`
      : `${proto}://${host}`

    const resolvedSuccessUrl = successUrl || `${baseUrl}/payment/success?transaction_id=${orderId}`
    const resolvedFailedUrl  = failedUrl  || `${baseUrl}/payment/failed?transaction_id=${orderId}`

    // ── Merchant reference ─────────────────────────────────
    const toAscii = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').trim()
    const merchantRef = `payment-${orderId} | ${toAscii(customerName)}`.substring(0, 100)

    // ── Create Wallee transaction ──────────────────────────
    const transactionCreate: Wallee.model.TransactionCreate = {
      lineItems: [
        {
          name: toAscii(description).substring(0, 100) || 'Produktkauf',
          quantity: 1,
          amountIncludingTax: amount, // amount is already in CHF
          type: Wallee.model.LineItemType.PRODUCT,
          uniqueId: 'item-1',
          taxRate: 0
        }
      ],
      spaceViewId: null,
      currency,
      autoConfirmationEnabled: true,
      chargeRetryEnabled: false,
      customersEmailAddress: customerEmail,
      customerId: `dt-${resolvedTenantId}-${customerEmail.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`.substring(0, 100),
      shippingAddress: null,
      billingAddress: null,
      deviceSessionIdentifier: null,
      merchantReference: merchantRef,
      successUrl: resolvedSuccessUrl,
      failedUrl: resolvedFailedUrl
    }

    logger.debug('💳 Creating Wallee transaction for shop order:', { orderId, amount, customerEmail, tenantId: resolvedTenantId })

    let createdTransaction: any
    try {
      createdTransaction = await transactionService.create(spaceId, transactionCreate)
    } catch (walleeErr: any) {
      logger.error('❌ Wallee API error:', { message: walleeErr?.message, body: walleeErr?.body })
      // Clean up payment record on failure
      await supabase.from('payments').delete().eq('id', orderId)
      throw createError({ statusCode: 502, message: `Wallee-Fehler: ${walleeErr?.message || 'Unbekannter Fehler'}` })
    }

    const transactionId = createdTransaction?.body?.id ?? createdTransaction?.id
    if (!transactionId) {
      await supabase.from('payments').delete().eq('id', orderId)
      throw createError({ statusCode: 500, message: 'Wallee-Transaktion konnte nicht erstellt werden' })
    }

    // ── Store transaction ID on payment record ────────────
    await supabase
      .from('payments')
      .update({ wallee_transaction_id: String(transactionId) })
      .eq('id', orderId)

    // ── Get payment page URL ──────────────────────────────
    const urlResponse = await paymentPageService.paymentPageUrl(spaceId, transactionId)
    let paymentUrl: string = (urlResponse as any)?.body || urlResponse

    if (!paymentUrl || typeof paymentUrl !== 'string') {
      paymentUrl = `https://app-wallee.com/payment/transaction/pay?spaceId=${spaceId}&transactionId=${transactionId}`
    }

    logger.info('✅ Wallee transaction created for shop order:', { orderId, transactionId, paymentUrl: paymentUrl.substring(0, 80) })

    return {
      success: true,
      transactionId: String(transactionId),
      paymentUrl
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ create-transaction error:', error)
    throw createError({ statusCode: 500, message: 'Interner Fehler bei der Zahlungserstellung' })
  }
})
