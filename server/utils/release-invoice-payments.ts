import type { SupabaseClient } from '@supabase/supabase-js'

const SOURCE_TABLES = ['course_registrations', 'room_bookings', 'vehicle_bookings'] as const

/**
 * When an invoice is cancelled, reverse the “verrechnet” stamp:
 * - payments: clear invoice_id and set status back to pending (not completed/refunded)
 * - course/room/vehicle rows: clear invoice_id so they reappear as open items
 */
export async function releaseInvoicePayments(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<{ paymentsReleased: number; sourcesCleared: number }> {
  const now = new Date().toISOString()

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
    sourcesCleared,
  }
}
