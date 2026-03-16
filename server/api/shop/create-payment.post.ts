// server/api/shop/create-payment.post.ts
// Public endpoint to create a payment record for standalone shop purchases
// No authentication required — supports guest checkout
// tenantId must be provided in body (validated against DB)

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  try {
    const body = await readBody(event)
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

    // Validate required fields
    if (!tenant_id) {
      throw createError({ statusCode: 400, message: 'tenant_id ist erforderlich' })
    }
    if (typeof total_amount_rappen !== 'number' || total_amount_rappen <= 0) {
      throw createError({ statusCode: 400, message: 'total_amount_rappen muss eine positive Zahl sein' })
    }

    // Verify tenant exists and is active
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenant_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!tenant) {
      throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user_id || null,
        staff_id: staff_id || null,
        tenant_id,
        appointment_id: null,
        lesson_price_rappen: 0,
        products_price_rappen: products_price_rappen ?? total_amount_rappen,
        discount_amount_rappen: discount_amount_rappen ?? 0,
        admin_fee_rappen,
        subtotal_rappen: total_amount_rappen,
        total_amount_rappen,
        amount_rappen: 0,
        payment_method,
        payment_status: 'pending',
        currency,
        description,
        is_standalone: true,
        metadata: metadata ? JSON.stringify(metadata) : null
      })
      .select('id, total_amount_rappen, payment_status, tenant_id')
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
