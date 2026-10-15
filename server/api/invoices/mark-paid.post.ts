// server/api/invoices/mark-paid.post.ts
// Markiert eine verrechnete Zahlung als BAR BEZAHLT (Staff + Admin)
// Achtung: Rechnung auf 'paid' setzen darf nur der Admin via mark-invoice-paid

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
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

  // Zahlung auf completed + cash setzen
  const { data: updatedPayments, error: paymentError } = await supabase
    .from('payments')
    .update({
      payment_status: 'completed',
      payment_method: 'cash',
      paid_at: now,
      updated_at: now,
    })
    .eq('id', payment_id)
    .eq('tenant_id', staffUser.tenant_id)
    .select('id, invoice_id')

  if (paymentError) {
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Aktualisieren der Zahlung' })
  }

  const payment = updatedPayments?.[0]
  if (!payment) {
    throw createError({ statusCode: 404, statusMessage: 'Zahlung nicht gefunden' })
  }

  // Nur Admin darf Rechnung automatisch auf 'paid' setzen
  if (payment.invoice_id && staffUser.role === 'admin') {
    const { data: tenantPayments } = await supabase
      .from('payments')
      .select('id, payment_status')
      .eq('invoice_id', payment.invoice_id)
      .eq('tenant_id', staffUser.tenant_id)

    const { data: unsetTenantPayments } = await supabase
      .from('payments')
      .select('id, payment_status')
      .eq('invoice_id', payment.invoice_id)
      .is('tenant_id', null)

    const invoicePayments = [...(tenantPayments || []), ...(unsetTenantPayments || [])]
    const allPaid = invoicePayments.every(p => p.payment_status === 'completed')

    const { data: updatedInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .update({
        payment_status: allPaid ? 'paid' : 'partial',
        ...(allPaid ? { paid_at: now } : {}),
        updated_at: now,
      })
      .eq('id', payment.invoice_id)
      .eq('tenant_id', staffUser.tenant_id)
      .select('id')

    if (invoiceError) {
      throw createError({ statusCode: 500, statusMessage: 'Fehler beim Aktualisieren der Zahlung' })
    }

    if (!updatedInvoices?.length) {
      throw createError({ statusCode: 404, statusMessage: 'Zahlung nicht gefunden' })
    }
  }

  return { success: true, payment_id }
})
