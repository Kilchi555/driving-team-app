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

  const { invoice_id, paid_at, paid_amount_rappen, note, payment_method } = await readBody(event)
  if (!invoice_id) throw createError({ statusCode: 400, statusMessage: 'invoice_id required' })

  const now = new Date().toISOString()
  const paidAt = paid_at || now

  // Rechnung laden (tenant-scoped) inkl. bereits bezahltem Betrag
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, user_id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status')
    .eq('id', invoice_id)
    .eq('tenant_id', staffUser.tenant_id)
    .single()

  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })

  // Neuen Betrag zum bereits bezahlten addieren (kumulativ)
  const newPayment = paid_amount_rappen || invoice.total_amount_rappen
  const previouslyPaid = invoice.paid_amount_rappen || 0
  const totalPaid = previouslyPaid + newPayment
  // Kumulativen Betrag auf Rechnungsbetrag deckeln
  const clampedTotal = Math.min(totalPaid, invoice.total_amount_rappen)

  const isPartial = clampedTotal < invoice.total_amount_rappen
  const paymentStatus = isPartial ? 'partial' : 'paid'
  const invoiceStatus = isPartial ? 'sent' : 'paid'   // partial keeps invoice open

  // Rechnung als bezahlt (oder Teilzahlung) markieren
  const { error } = await supabase
    .from('invoices')
    .update({
      payment_status: paymentStatus,
      status: invoiceStatus,
      paid_at: paidAt,
      paid_amount_rappen: clampedTotal,
      ...(note ? { internal_notes: note } : {}),
      updated_at: now,
    })
    .eq('id', invoice_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Jede Zahlung als eigene Zeile in invoice_payments protokollieren
  await supabase
    .from('invoice_payments')
    .insert({
      invoice_id,
      tenant_id: staffUser.tenant_id,
      amount_rappen: newPayment,
      payment_date: paidAt,
      payment_method: payment_method || note || 'manual',
      notes: note || null,
      status: 'completed',
      currency: 'CHF',
    })

  // Payments nur als 'completed' markieren wenn Rechnung vollständig bezahlt
  if (!isPartial) {
    await supabase
      .from('payments')
      .update({ payment_status: 'completed', paid_at: paidAt, updated_at: now })
      .eq('invoice_id', invoice_id)
      .in('payment_status', ['invoice', 'invoiced', 'pending', 'open', 'failed'])

    // Fallback: Payments über Invoice-Items → appointment_ids aktualisieren
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
  }

  return { success: true, invoice_id, paid_amount_rappen: clampedTotal, is_partial: isPartial }
})
