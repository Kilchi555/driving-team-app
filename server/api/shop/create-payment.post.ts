// server/api/shop/create-payment.post.ts
// Public endpoint to create a payment record for standalone shop purchases
// No authentication required — supports guest checkout
// tenantId must be provided in body (validated against DB)

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { sanitizeString, validateUUID } from '~/server/utils/validators'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  // Follow same public-payment pattern as /api/payments/process-public:
  // public endpoint + strict server-side validation/rate-limiting with admin client.
  const supabase = getSupabaseAdmin()

  try {
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() ||
      getHeader(event, 'x-real-ip') ||
      event.node.req.socket.remoteAddress ||
      'unknown'

    const body = await readBody(event)
    if (!body || typeof body !== 'object') {
      throw createError({ statusCode: 400, message: 'Ungültiger Request-Body' })
    }

    const {
      user_id,
      staff_id,
      tenant_id,
      total_amount_rappen,
      products_price_rappen,
      discount_amount_rappen,
      admin_fee_rappen = 0,
      payment_method = 'wallee',
      currency = 'CHF',
      description = 'Produktkauf',
      metadata
    } = body

    const tenantId = sanitizeString(tenant_id, 64)
    const userId = user_id ? sanitizeString(user_id, 64) : null
    const staffId = staff_id ? sanitizeString(staff_id, 64) : null
    const paymentMethod = sanitizeString(payment_method, 32) || 'wallee'
    const paymentCurrency = sanitizeString(currency, 8) || 'CHF'
    const paymentDescription = sanitizeString(description, 255) || 'Produktkauf'

    const rateLimit = await checkRateLimit(
      ipAddress,
      'shop_create_payment',
      20,
      5 * 60 * 1000,
      typeof metadata?.customer_email === 'string' ? metadata.customer_email : undefined,
      tenantId || undefined
    )
    if (!rateLimit.allowed) {
      throw createError({
        statusCode: 429,
        message: 'Zu viele Zahlungsanfragen. Bitte versuchen Sie es in wenigen Minuten erneut.'
      })
    }

    // Validate required fields
    if (!tenantId) {
      throw createError({ statusCode: 400, message: 'tenant_id ist erforderlich' })
    }
    if (!validateUUID(tenantId).valid) {
      throw createError({ statusCode: 400, message: 'tenant_id ist ungültig' })
    }
    if (userId && !validateUUID(userId).valid) {
      throw createError({ statusCode: 400, message: 'user_id ist ungültig' })
    }
    if (staffId && !validateUUID(staffId).valid) {
      throw createError({ statusCode: 400, message: 'staff_id ist ungültig' })
    }

    const isIntegerAmount = (value: any) => Number.isInteger(value) && value >= 0
    if (!isIntegerAmount(total_amount_rappen) || total_amount_rappen <= 0) {
      throw createError({ statusCode: 400, message: 'total_amount_rappen muss eine positive Zahl sein' })
    }
    if (!isIntegerAmount(products_price_rappen ?? 0)) {
      throw createError({ statusCode: 400, message: 'products_price_rappen muss eine gültige Zahl sein' })
    }
    if (!isIntegerAmount(discount_amount_rappen ?? 0)) {
      throw createError({ statusCode: 400, message: 'discount_amount_rappen muss eine gültige Zahl sein' })
    }
    if (!isIntegerAmount(admin_fee_rappen ?? 0)) {
      throw createError({ statusCode: 400, message: 'admin_fee_rappen muss eine gültige Zahl sein' })
    }
    if (paymentCurrency !== 'CHF') {
      throw createError({ statusCode: 400, message: 'Nur CHF wird unterstützt' })
    }

    // Create payment record — only columns that exist in the DB
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        staff_id: staffId,
        tenant_id: tenantId,
        appointment_id: null,
        lesson_price_rappen: 0,
        products_price_rappen: products_price_rappen ?? total_amount_rappen,
        discount_amount_rappen: discount_amount_rappen ?? 0,
        voucher_discount_rappen: 0,
        admin_fee_rappen: admin_fee_rappen ?? 0,
        total_amount_rappen,
        payment_method: paymentMethod,
        payment_status: 'pending',
        currency: paymentCurrency,
        description: paymentDescription,
        metadata: metadata ?? null
      })
      .select('id, total_amount_rappen, payment_status, tenant_id, payment_method')
      .single()

    if (paymentError || !payment) {
      logger.error('❌ shop/create-payment: DB error:', paymentError)
      throw createError({ statusCode: 500, message: 'Fehler beim Erstellen der Zahlung' })
    }

    logger.debug('✅ shop/create-payment: Payment created:', { id: payment.id, total_amount_rappen })

    return { data: payment }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ shop/create-payment error:', error)
    throw createError({ statusCode: 500, message: 'Interner Fehler' })
  }
})
