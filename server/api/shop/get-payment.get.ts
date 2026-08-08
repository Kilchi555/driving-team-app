// server/api/shop/get-payment.get.ts
// Public success-page helper. Callers must supply payment_id / transaction_id from
// the checkout redirect (capability URL). Voucher codes are only returned for
// completed payments and never for pending/failed states.

import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { validateUUID } from '~/server/utils/validators'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { STAFF_ADMIN_ROLES } from '~/server/utils/require-staff-or-internal'

function sanitizePayment(row: any) {
  return {
    id: row.id,
    payment_status: row.payment_status,
    total_amount_rappen: row.total_amount_rappen,
    tenant_id: row.tenant_id,
    wallee_transaction_id: row.wallee_transaction_id,
    // Only expose product flags needed by the success page — never raw PII blobs
    metadata: row.metadata
      ? {
          products: Array.isArray(row.metadata?.products)
            ? row.metadata.products.map((p: any) => ({
                is_voucher: !!p?.is_voucher,
                name: p?.name || null,
                quantity: p?.quantity || null,
              }))
            : undefined,
        }
      : null,
  }
}

function sanitizeVouchers(vouchers: any[], includeFullCode: boolean) {
  return (vouchers || []).map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    amount_rappen: v.amount_rappen,
    recipient_name: v.recipient_name,
    valid_until: v.valid_until,
    tenant_id: v.tenant_id,
    code: includeFullCode
      ? v.code
      : v.code
        ? `${String(v.code).slice(0, 2)}••••${String(v.code).slice(-4)}`
        : null,
  }))
}

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
      .select('id, payment_status, total_amount_rappen, metadata, tenant_id, wallee_transaction_id, user_id')

    if (paymentId && validateUUID(paymentId)) {
      dbQuery = dbQuery.eq('id', paymentId)
    } else if (transactionId) {
      if (validateUUID(transactionId)) {
        dbQuery = dbQuery.eq('id', transactionId)
      } else {
        dbQuery = dbQuery.eq('wallee_transaction_id', transactionId)
      }
    }

    const { data, error } = await dbQuery.maybeSingle()

    if (data) {
      const authUser = await getAuthenticatedUser(event).catch(() => null)
      const role = authUser?.role || ''
      const isPrivileged = (STAFF_ADMIN_ROLES as readonly string[]).includes(role)
      const isOwner =
        !!authUser?.db_user_id && data.user_id && authUser.db_user_id === data.user_id

      const paid = ['completed', 'authorized'].includes(data.payment_status || '')
      // Full voucher codes only for paid payments (success page) or staff/owner.
      // Pending payments never expose redeemable codes.
      const includeFullCode = paid || isPrivileged || isOwner

      let vouchers: any[] = []
      if (paid || isPrivileged || isOwner) {
        const { data: voucherData } = await supabase
          .from('vouchers')
          .select('id, code, name, description, amount_rappen, recipient_name, valid_until, tenant_id')
          .eq('payment_id', data.id)
        vouchers = sanitizeVouchers(voucherData || [], includeFullCode && paid)
      }

      return { data: sanitizePayment(data), vouchers }
    }

    const saleId = paymentId || transactionId
    if (saleId && validateUUID(saleId)) {
      const { data: saleData } = await supabase
        .from('product_sales')
        .select('id, status, total_amount_rappen, tenant_id, payment_method')
        .eq('id', saleId)
        .maybeSingle()

      if (saleData) {
        const mapped = {
          id: saleData.id,
          payment_status:
            saleData.status === 'completed'
              ? 'completed'
              : saleData.status === 'pending'
                ? 'pending'
                : 'failed',
          total_amount_rappen: saleData.total_amount_rappen,
          tenant_id: saleData.tenant_id,
          metadata: null,
          wallee_transaction_id: null,
        }
        return { data: mapped, vouchers: [] }
      }
    }

    logger.warn('⚠️ shop/get-payment: not found', { paymentId, transactionId, error: error?.message })
    throw createError({ statusCode: 404, message: 'Zahlung nicht gefunden' })
  } catch (err: any) {
    if (err.statusCode) throw err
    logger.error('❌ shop/get-payment error:', err.message)
    throw createError({ statusCode: 500, message: 'Fehler beim Laden der Zahlung' })
  }
})
