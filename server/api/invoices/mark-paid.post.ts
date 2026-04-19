// server/api/invoices/mark-paid.post.ts
// Markiert eine verrechnete Zahlung als BAR BEZAHLT (Staff + Admin)
// Achtung: Rechnung auf 'paid' setzen darf nur der Admin via mark-invoice-paid

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

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

  const { payment_id } = await readBody(event)
  if (!payment_id) throw createError({ statusCode: 400, statusMessage: 'payment_id required' })

  const now = new Date().toISOString()

  // Zahlung auf completed + cash setzen
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({
      payment_status: 'completed',
      payment_method: 'cash',
      paid_at: now,
      updated_at: now,
    })
    .eq('id', payment_id)
    .select('id, invoice_id')
    .single()

  if (paymentError || !payment) {
    throw createError({ statusCode: 500, statusMessage: paymentError?.message || 'Fehler beim Aktualisieren der Zahlung' })
  }

  // Nur Admin darf Rechnung automatisch auf 'paid' setzen
  if (payment.invoice_id && staffUser.role === 'admin') {
    const { data: invoicePayments } = await supabase
      .from('payments')
      .select('id, payment_status')
      .eq('invoice_id', payment.invoice_id)

    const allPaid = invoicePayments?.every(p => p.payment_status === 'completed')

    await supabase
      .from('invoices')
      .update({
        payment_status: allPaid ? 'paid' : 'partial',
        ...(allPaid ? { paid_at: now } : {}),
        updated_at: now,
      })
      .eq('id', payment.invoice_id)
  }

  return { success: true, payment_id }
})
