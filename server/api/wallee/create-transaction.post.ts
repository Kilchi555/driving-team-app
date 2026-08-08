// server/api/wallee/create-transaction.post.ts
// Generic Wallee transaction endpoint used by the public shop (standalone product purchases)
// Supports both authenticated users and guests (no auth required)

import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'
import { Wallee } from 'wallee'
import { z } from 'zod'

const CreateTransactionSchema = z.object({
  orderId:       z.string().uuid(),
  amount:        z.number().positive().max(100000),
  currency:      z.enum(['CHF', 'EUR', 'USD']).default('CHF'),
  customerEmail: z.string().email().max(254),
  customerName:  z.string().min(1).max(200).trim(),
  description:   z.string().max(500).default('Produktkauf'),
  tenantId:      z.string().uuid().optional(),
  userId:        z.string().uuid().optional(),
  successUrl:    z.string().url().max(2000).optional(),
  failedUrl:     z.string().url().max(2000).optional(),
})

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  try {
    const rawBody = await readBody(event)
    const parseResult = CreateTransactionSchema.safeParse(rawBody)
    if (!parseResult.success) {
      throw createError({
        statusCode: 400,
        message: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      })
    }
    const {
      orderId,
      amount: clientAmount,
      currency,
      customerEmail,
      customerName,
      description,
      tenantId,
      userId,
      successUrl,
      failedUrl
    } = parseResult.data

    // Load payment server-side — never trust client amount for an existing payment.
    const { data: paymentRow, error: paymentLookupError } = await supabase
      .from('payments')
      .select('id, tenant_id, total_amount_rappen, payment_status, currency, wallee_transaction_id, wallee_space_id')
      .eq('id', orderId)
      .maybeSingle()

    if (paymentLookupError || !paymentRow) {
      throw createError({ statusCode: 404, message: 'Zahlung nicht gefunden' })
    }

    if (!['pending', 'processing', 'failed'].includes(paymentRow.payment_status)) {
      throw createError({ statusCode: 409, message: 'Zahlung kann in diesem Status nicht erneut gestartet werden' })
    }

    const serverAmountChf = Number(paymentRow.total_amount_rappen || 0) / 100
    if (!(serverAmountChf > 0)) {
      throw createError({ statusCode: 400, message: 'Ungültiger Zahlungsbetrag' })
    }

    // Reject obvious underpayment attempts; always charge the DB amount
    if (Math.abs(clientAmount - serverAmountChf) > 0.01) {
      logger.warn('🚫 create-transaction: client amount mismatch, using DB amount', {
        orderId,
        clientAmount,
        serverAmountChf
      })
    }
    const amount = serverAmountChf
    const currencyResolved = (paymentRow.currency as 'CHF' | 'EUR' | 'USD') || currency

    // Keep endpoint resilient for public callers:
    // if tenantId is missing in client payload, derive it from the payment record.
    let resolvedTenantId = tenantId || paymentRow.tenant_id
    if (!resolvedTenantId) {
      throw createError({ statusCode: 400, message: 'tenantId fehlt und konnte nicht aus payment ermittelt werden' })
    }
    if (tenantId && paymentRow.tenant_id && tenantId !== paymentRow.tenant_id) {
      throw createError({ statusCode: 403, message: 'Tenant mismatch' })
    }

    // ── Wallee config for this tenant ─────────────────────
    let walleeConfig: any
    try {
      walleeConfig = await getWalleeConfigForTenant(resolvedTenantId)
    } catch (e: any) {
      throw createError({ statusCode: 500, message: `Wallee nicht konfiguriert für diesen Tenant: ${e.message}` })
    }

    const spaceId = walleeConfig.spaceId
    const sdkConfig = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)
    const transactionService = new Wallee.api.TransactionService(sdkConfig)
    const paymentPageService = new Wallee.api.TransactionPaymentPageService(sdkConfig)

    // Reuse open Wallee transactions — never create a parallel charge
    if (paymentRow.wallee_transaction_id) {
      try {
        const existingTxResponse = await transactionService.read(spaceId, parseInt(paymentRow.wallee_transaction_id, 10))
        const existingTx = (existingTxResponse as any)?.body || existingTxResponse
        const state = existingTx?.state ? String(existingTx.state) : null
        const COMPLETED = ['FULFILL', 'COMPLETED', 'SUCCESSFUL']
        const OPEN = ['PENDING', 'CONFIRMED', 'PROCESSING']
        const FAIL = ['FAILED', 'CANCELED', 'DECLINE', 'VOIDED']

        if (state && COMPLETED.includes(state)) {
          await supabase.from('payments').update({
            payment_status: 'completed',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            wallee_transaction_state: state
          }).eq('id', orderId)
          throw createError({ statusCode: 409, message: 'Zahlung wurde bereits abgeschlossen' })
        }

        if (state && OPEN.includes(state)) {
          let paymentUrl: string =
            existingTx?.paymentPageUrl ||
            existingTx?.paymentPageEndpoint ||
            ''
          if (!paymentUrl) {
            try {
              const urlResponse = await paymentPageService.paymentPageUrl(spaceId, parseInt(paymentRow.wallee_transaction_id, 10))
              paymentUrl = (urlResponse as any)?.body || urlResponse
            } catch {
              paymentUrl = `https://app-wallee.com/payment/transaction/pay?spaceId=${spaceId}&transactionId=${paymentRow.wallee_transaction_id}`
            }
          }
          await supabase.from('payments').update({
            payment_status: 'processing',
            updated_at: new Date().toISOString(),
            wallee_transaction_state: state
          }).eq('id', orderId)
          return {
            success: true,
            transactionId: String(paymentRow.wallee_transaction_id),
            paymentUrl,
            reused: true
          }
        }

        if (state && !FAIL.includes(state)) {
          throw createError({ statusCode: 409, message: 'Zahlung wird noch verarbeitet. Bitte warte kurz.' })
        }
      } catch (e: any) {
        if (e?.statusCode) throw e
        throw createError({ statusCode: 503, message: 'Zahlungsstatus konnte nicht geprüft werden' })
      }
    }

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
      currency: currencyResolved,
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
