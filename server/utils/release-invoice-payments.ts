import type { SupabaseClient } from '@supabase/supabase-js'

const SOURCE_TABLES = ['course_registrations', 'room_bookings', 'vehicle_bookings'] as const

/**
 * When an invoice is cancelled, reverse the “verrechnet” stamp:
 * - payments: clear invoice_id and set status back to pending (not completed/refunded)
 * - appointments: status 'verrechnet' → 'confirmed' so they show as open again
 * - course/room/vehicle rows: clear invoice_id so they reappear as open items
 */
export async function releaseInvoicePayments(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<{ paymentsReleased: number; appointmentsReleased: number; sourcesCleared: number }> {
  const now = new Date().toISOString()

  // Collect appointment IDs from payments + invoice_items before clearing links
  const appointmentIds = new Set<string>()

  const { data: linkedPayments } = await supabase
    .from('payments')
    .select('id, appointment_id')
    .eq('invoice_id', invoiceId)

  for (const p of linkedPayments || []) {
    if (p.appointment_id) appointmentIds.add(p.appointment_id)
  }

  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('appointment_id')
    .eq('invoice_id', invoiceId)
    .not('appointment_id', 'is', null)

  for (const item of invoiceItems || []) {
    if (item.appointment_id) appointmentIds.add(item.appointment_id)
  }

  const { data: releasedPayments, error: paymentError } = await supabase
    .from('payments')
    .update({
      invoice_id: null,
      payment_status: 'pending',
      updated_at: now,
    })
    .eq('invoice_id', invoiceId)
    .in('payment_status', ['invoice', 'invoiced', 'pending', 'open', 'processing', 'failed'])
    .select('id')

  if (paymentError) {
    console.error('[release-invoice-payments] Failed to reset payments:', paymentError.message)
    throw paymentError
  }

  let appointmentsReleased = 0
  if (appointmentIds.size > 0) {
    const { data: releasedAppointments, error: appointmentError } = await supabase
      .from('appointments')
      .update({ status: 'confirmed', updated_at: now })
      .in('id', Array.from(appointmentIds))
      .eq('status', 'verrechnet')
      .select('id')

    if (appointmentError) {
      console.error('[release-invoice-payments] Failed to reset appointments:', appointmentError.message)
      throw appointmentError
    }
    appointmentsReleased = releasedAppointments?.length || 0
  }

  let sourcesCleared = 0
  for (const table of SOURCE_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .update({ invoice_id: null })
      .eq('invoice_id', invoiceId)
      .select('id')

    if (error) {
      console.warn(`[release-invoice-payments] Could not clear invoice_id on ${table}:`, error.message)
      continue
    }
    sourcesCleared += data?.length || 0
  }

  return {
    paymentsReleased: releasedPayments?.length || 0,
    appointmentsReleased,
    sourcesCleared,
  }
}
