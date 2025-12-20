// server/api/payment-gateway/create-transaction.post.ts
// ✅ UNIVERSELLER PAYMENT ENDPOINT - unterstützt Wallee & Stripe

import { getPaymentProviderForTenant } from '~/server/payment-providers/factory'
import type { CreateTransactionRequest } from '~/server/payment-providers/types'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  logger.debug('🚀 Universal Payment Gateway - Create Transaction')

  try {
    const body = await readBody(event)
    console.log('📥 Raw body received:', body)
    
    const {
      orderId,
      amount,
      currency = 'CHF',
      customerEmail,
      customerName,
      description,
      successUrl,
      failedUrl,
      userId,
      tenantId,
      appointmentId,
      metadata,
      lineItems
    } = body

    // Debug: Log each field
    console.log('🔍 Field validation:', {
      orderId: orderId ? '✅' : '❌',
      amount: amount !== undefined && amount !== null ? '✅' : '❌',
      customerEmail: customerEmail ? '✅' : '❌',
      userId: userId ? '✅' : '❌',
      tenantId: tenantId ? '✅' : '❌'
    })

    // Validierung
    if (!orderId || amount === undefined || amount === null || !customerEmail || !userId || !tenantId) {
      console.error('❌ Validation failed. Missing fields:', {
        orderId: !orderId ? 'MISSING' : 'OK',
        amount: (amount === undefined || amount === null) ? 'MISSING' : 'OK',
        customerEmail: !customerEmail ? 'MISSING' : 'OK',
        userId: !userId ? 'MISSING' : 'OK',
        tenantId: !tenantId ? 'MISSING' : 'OK'
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: orderId, amount, customerEmail, userId, tenantId'
      })
    }

    logger.debug('📋 Transaction request:', {
      orderId,
      amount,
      currency,
      tenantId,
      userId
    })

    // Hole den richtigen Payment Provider für den Tenant
    const provider = await getPaymentProviderForTenant(tenantId)
    logger.debug(`✅ Using payment provider: ${provider.name}`)

    // Erstelle die Transaktion
    const request: CreateTransactionRequest = {
      orderId,
      amount,
      currency,
      customerEmail,
      customerName,
      description,
      successUrl,
      failedUrl,
      userId,
      tenantId,
      appointmentId,
      metadata,
      lineItems
    }

    const result = await provider.createTransaction(request)

    if (!result.success) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || 'Transaction creation failed'
      })
    }

    logger.debug(`✅ Transaction created successfully with ${provider.name}:`, {
      transactionId: result.transactionId
    })

    return {
      success: true,
      provider: result.provider,
      transactionId: result.transactionId,
      paymentUrl: result.paymentUrl,
      metadata: result.metadata
    }
  } catch (error: any) {
    console.error('❌ Universal Payment Gateway Error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Payment gateway error'
    })
  }
})

