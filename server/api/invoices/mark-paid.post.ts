// server/api/invoices/mark-paid.post.ts
// Markiert eine verrechnete Zahlung als BAR BEZAHLT (Staff + Admin)
// Achtung: Rechnung auf 'paid' setzen darf nur der Admin via mark-invoice-paid

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { settlementFailure } from '~/server/utils/payment-settlement'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isStaffProductSalePayment } from '~/utils/staff-product-sale-display'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: staffUser } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!staffUser || !['admin', 'staff', 'tenant_admin'].includes(staffUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (!staffUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const payment_id = body?.payment_id
  if (!payment_id) throw createError({ statusCode: 400, statusMessage: 'payment_id required' })

  const now = new Date().toISOString()

  const { data: existingPayment, error: loadError } = await supabase
    .from('payments')
    .select('id, metadata, invoice_id, tenant_id')
    .eq('id', payment_id)
    .eq('tenant_id', staffUser.tenant_id)
    .maybeSingle()

  if (loadError) {
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Aktualisieren der Zahlung' })
  }

  if (!existingPayment) {
    throw createError({ statusCode: 404, statusMessage: 'Zahlung nicht gefunden' })
  }

  if (isStaffProductSalePayment(existingPayment)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Staff-POS-Zahlungen werden nicht über diesen Abschluss verbucht.',
    })
  }

  if (existingPayment.invoice_id) {
    const { data: ownedInvoice, error: invoiceLoadError } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', existingPayment.invoice_id)
      .eq('tenant_id', staffUser.tenant_id)
      .maybeSingle()

    if (invoiceLoadError) {
      throw createError({ statusCode: 500, statusMessage: 'Fehler beim Aktualisieren der Zahlung' })
    }

    if (!ownedInvoice) {
      throw createError({ statusCode: 404, statusMessage: 'Zahlung nicht gefunden' })
    }
  }

  // Payment status and the admin invoice status commit in one function.
  // A sibling-read or invoice-update failure rolls the payment write back.
  const { data, error } = await supabase.rpc('complete_tenant_cash_payment', {
    p_actor_user_id: staffUser.id,
    p_payment_id: payment_id,
    p_paid_at: now,
  })

  const failure = settlementFailure(error, data)
  if (failure) throw createError(failure)

  return { success: true, payment_id }
})
