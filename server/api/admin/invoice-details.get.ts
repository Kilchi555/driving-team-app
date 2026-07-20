import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  // ✅ Auth check — uses the shared helper (Bearer header with HTTP-only-cookie
  // fallback + refresh), same as the rest of the admin API. The previous
  // Bearer-only check here meant this endpoint silently 401'd (caught and
  // swallowed by the frontend) whenever the client's access token had just
  // expired and hadn't been refreshed yet, leaving "Kundeninformationen" and
  // the rest of this response blank in the UI even though the underlying
  // data existed.
  const userData = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  // ✅ Get query params
  const query = getQuery(event)
  const invoiceNumber = query.invoice_number as string
  const invoiceId = query.invoice_id as string
  let userId = query.user_id as string

  if (!invoiceNumber && !userId && !invoiceId) {
    throw createError({ statusCode: 400, message: 'invoice_number, invoice_id or user_id required' })
  }

  try {
    const result: any = {
      payments: [],
      customerData: null,
      appointmentDetails: null,
      eventTypeName: null,
      totalExcludingCancelled: 0
    }

    // Resolve user_id from invoice when only invoice_id/number was provided
    if (!userId && (invoiceId || invoiceNumber)) {
      let invoiceQuery = supabase
        .from('invoices')
        .select('id, user_id, invoice_number')
        .eq('tenant_id', userData.tenant_id)

      if (invoiceId) invoiceQuery = invoiceQuery.eq('id', invoiceId)
      else invoiceQuery = invoiceQuery.eq('invoice_number', invoiceNumber)

      const { data: invoiceRow } = await invoiceQuery.maybeSingle()
      if (invoiceRow?.user_id) {
        userId = invoiceRow.user_id
      }
      if (!invoiceNumber && invoiceRow?.invoice_number) {
        // allow payments lookup below
        ;(query as any)._resolvedInvoiceNumber = invoiceRow.invoice_number
      }
    }

    const resolvedInvoiceNumber = invoiceNumber || (query as any)._resolvedInvoiceNumber

    // ✅ Load all payments for this invoice (including deleted)
    if (resolvedInvoiceNumber) {
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_number', resolvedInvoiceNumber)
        .eq('tenant_id', userData.tenant_id)
        .order('created_at', { ascending: true })

      if (!paymentsError && payments) {
        result.payments = payments
        result.totalExcludingCancelled = payments
          .filter((p: any) => !p.deleted_at)
          .reduce((sum: number, p: any) => sum + (p.total_amount_rappen || 0), 0)
      }
    }

    // ✅ Load latest payment by user_id for detailed data
    if (userId) {
      const { data: latestPayment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', userData.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!paymentError && latestPayment) {
        result.latestPayment = latestPayment

        // Load appointment details if available
        if (latestPayment.appointment_id) {
          const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select('start_time, event_type_code, type')
            .eq('id', latestPayment.appointment_id)
            .single()

          if (!aptError && appointment) {
            result.appointmentDetails = appointment

            // Load event type name
            if (appointment.event_type_code) {
              const { data: eventType } = await supabase
                .from('event_types')
                .select('name')
                .eq('code', appointment.event_type_code)
                .eq('tenant_id', userData.tenant_id)
                .maybeSingle()

              if (eventType) {
                result.eventTypeName = eventType.name
              }
            }
          }
        }
      }

      // Load customer data — independent of whether a payment record exists,
      // e.g. invoices created directly in the admin area without a linked payment.
      // Do not require tenant_id match on users: soft-moved/shared profiles can
      // still be the invoice's customer; tenant scope is enforced via the invoice.
      const { data: customer, error: customerError } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone, street, street_nr, zip, city')
        .eq('id', userId)
        .maybeSingle()

      if (!customerError && customer) {
        result.customerData = customer
      }
    }

    return result
  } catch (error: any) {
    console.error('Error loading invoice details:', error)
    throw createError({ statusCode: 500, message: 'Failed to load invoice details' })
  }
})
