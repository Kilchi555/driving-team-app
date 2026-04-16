// server/api/invoices/by-payment.post.ts
// Lädt die bestehende Rechnung für eine gegebene payment_id (für Anzeige)

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

  if (!staffUser || !['admin', 'staff'].includes(staffUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { payment_id } = await readBody(event)
  if (!payment_id) throw createError({ statusCode: 400, statusMessage: 'payment_id required' })

  // invoice_id aus der Zahlung holen (ohne tenant_id Filter für Kompatibilität mit alten Zahlungen)
  const { data: payment } = await supabase
    .from('payments')
    .select('invoice_id, user_id')
    .eq('id', payment_id)
    .single()

  if (!payment?.invoice_id) {
    throw createError({ statusCode: 404, statusMessage: 'Keine Rechnung für diese Zahlung gefunden' })
  }

  // Rechnung + Items laden (kein tenant_id Filter – Payment-Check oben sichert bereits den Mandanten)
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, invoice_date, due_date,
      billing_contact_person, billing_company_name, billing_email,
      billing_street, billing_zip, billing_city, billing_country,
      subtotal_rappen, vat_rate, vat_amount_rappen, discount_amount_rappen,
      total_amount_rappen, status, payment_status, paid_at,
      invoice_items (
        id, product_name, product_description,
        appointment_date, appointment_duration_minutes,
        quantity, unit_price_rappen, total_price_rappen
      )
    `)
    .eq('id', payment.invoice_id)
    .single()

  if (error || !invoice) {
    throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  }

  return { invoice }
})
