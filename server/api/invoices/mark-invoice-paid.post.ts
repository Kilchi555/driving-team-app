// server/api/invoices/mark-invoice-paid.post.ts
// Markiert eine Rechnung als bezahlt — NUR für Admins

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

  if (!staffUser || !['admin', 'tenant_admin'].includes(staffUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Nur Admins dürfen Rechnungen als bezahlt markieren' })
  }

  const { invoice_id, paid_at, paid_amount_rappen, note } = await readBody(event)
  if (!invoice_id) throw createError({ statusCode: 400, statusMessage: 'invoice_id required' })

  const now = new Date().toISOString()
  const paidAt = paid_at || now

  // Rechnung laden (tenant-scoped)
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, user_id, tenant_id, total_amount_rappen, payment_status')
    .eq('id', invoice_id)
    .eq('tenant_id', staffUser.tenant_id)
    .single()

  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })

  const amount = paid_amount_rappen || invoice.total_amount_rappen

  // Rechnung als bezahlt markieren
  const { error } = await supabase
    .from('invoices')
    .update({
      payment_status: 'paid',
      status: 'paid',
      paid_at: paidAt,
      paid_amount_rappen: amount,
      ...(note ? { notes: note } : {}),
      updated_at: now,
    })
    .eq('id', invoice_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Payments via invoice_id aktualisieren (für neue Rechnungen)
  await supabase
    .from('payments')
    .update({ payment_status: 'completed', paid_at: paidAt, updated_at: now })
    .eq('invoice_id', invoice_id)
    .in('payment_status', ['invoice', 'invoiced', 'pending', 'open', 'failed'])

  // Fallback: Payments über Invoice-Items → appointment_ids aktualisieren
  // (für ältere Rechnungen wo invoice_id auf den Payments noch nicht gesetzt war)
  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('appointment_id')
    .eq('invoice_id', invoice_id)
    .not('appointment_id', 'is', null)

  if (invoiceItems && invoiceItems.length > 0) {
    const appointmentIds = invoiceItems.map(item => item.appointment_id)
    await supabase
      .from('payments')
      .update({ payment_status: 'completed', invoice_id, paid_at: paidAt, updated_at: now })
      .eq('user_id', invoice.user_id ?? '')
      .in('appointment_id', appointmentIds)
      .in('payment_status', ['invoice', 'invoiced', 'pending', 'open', 'failed'])
  }

  return { success: true, invoice_id }
})
