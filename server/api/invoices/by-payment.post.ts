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
      billing_street, billing_street_number, billing_zip, billing_city, billing_country,
      subtotal_rappen, vat_rate, vat_amount_rappen, discount_amount_rappen,
      total_amount_rappen, status, payment_status, paid_at, notes,
      invoice_items (
        id, product_name, product_description,
        appointment_id, appointment_date, appointment_duration_minutes,
        quantity, unit_price_rappen, total_price_rappen
      )
    `)
    .eq('id', payment.invoice_id)
    .single()

  if (error || !invoice) {
    throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  }

  // Appointment start_times direkt aus appointments laden (invoice_items.appointment_date
  // enthält bei alten Rechnungen nur Mitternacht UTC — start_time ist die korrekte Quelle)
  const appointmentIds = (invoice.invoice_items as any[])
    .map((i: any) => i.appointment_id)
    .filter(Boolean)

  let appointmentStartTimes: Record<string, string> = {}
  let appointmentEventTypes: Record<string, { event_type_code: string | null, type: string | null }> = {}
  if (appointmentIds.length > 0) {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, start_time, event_type_code, type')
      .in('id', appointmentIds)
    if (appointments) {
      for (const apt of appointments) {
        appointmentStartTimes[apt.id] = apt.start_time
        appointmentEventTypes[apt.id] = { event_type_code: apt.event_type_code, type: apt.type }
      }
    }
  }

  const eventTypeMap: Record<string, string> = {
    lesson: 'Fahrstunde', exam: 'Prüfung', theory: 'Theorieunterricht', vku: 'VKU', haltbar: 'Haltbarkeitsprüfung'
  }

  // start_time und event type in invoice_items einbetten
  const enrichedItems = (invoice.invoice_items as any[]).map((item: any) => {
    const aptData = item.appointment_id ? appointmentEventTypes[item.appointment_id] : null
    const eventTypeCode = aptData?.event_type_code
    const eventLabel = eventTypeCode ? (eventTypeMap[eventTypeCode] || eventTypeCode) : null
    const category = aptData?.type ? `Kat. ${aptData.type}` : null
    return {
      ...item,
      appointment_start_time: item.appointment_id ? (appointmentStartTimes[item.appointment_id] || null) : null,
      product_name: eventLabel || item.product_name,
      product_description: category || item.product_description,
    }
  })

  return { invoice: { ...invoice, invoice_items: enrichedItems } }
})
