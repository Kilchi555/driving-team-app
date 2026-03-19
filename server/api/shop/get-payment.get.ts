// server/api/shop/get-payment.get.ts
// Public endpoint to check payment status after checkout.
// Uses the admin client so guest users (no session) can also read their payment.
// Only returns non-sensitive fields; the caller must supply the payment UUID
// or wallee_transaction_id that was embedded in the success redirect URL.

import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { validateUUID } from '~/server/utils/validators'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)

  const paymentId = query.payment_id as string | undefined
  const transactionId = query.transaction_id as string | undefined

  if (!paymentId && !transactionId) {
    throw createError({ statusCode: 400, message: 'payment_id oder transaction_id erforderlich' })
  }

  try {
    let dbQuery = supabase
      .from('payments')
      .select('id, payment_status, total_amount_rappen, metadata, tenant_id, wallee_transaction_id')

    if (paymentId && validateUUID(paymentId)) {
      dbQuery = dbQuery.eq('id', paymentId)
    } else if (transactionId) {
      // Try as UUID first, then as wallee numeric ID
      if (validateUUID(transactionId)) {
        dbQuery = dbQuery.eq('id', transactionId)
      } else {
        dbQuery = dbQuery.eq('wallee_transaction_id', transactionId)
      }
    }

    const { data, error } = await dbQuery.single()

    if (error || !data) {
      logger.warn('⚠️ shop/get-payment: not found', { paymentId, transactionId, error: error?.message })
      throw createError({ statusCode: 404, message: 'Zahlung nicht gefunden' })
    }

    // Also load vouchers so the success page doesn't need a second round-trip
    const { data: voucherData } = await supabase
      .from('vouchers')
      .select('id, code, name, description, amount_rappen, recipient_name, valid_until, tenant_id')
      .eq('payment_id', data.id)

    return { data, vouchers: voucherData || [] }
  } catch (err: any) {
    if (err.statusCode) throw err
    logger.error('❌ shop/get-payment error:', err.message)
    throw createError({ statusCode: 500, message: 'Fehler beim Laden der Zahlung' })
  }
})
