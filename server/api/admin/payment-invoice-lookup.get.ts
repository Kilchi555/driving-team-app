import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const query = getQuery(event)
  const appointmentId = query.appointment_id as string | undefined
  const invoiceNumber = query.invoice_number as string | undefined

  if (!appointmentId && !invoiceNumber) {
    throw createError({ statusCode: 400, statusMessage: 'Missing appointment_id or invoice_number' })
  }

  if (appointmentId) {
    // Look up payment for appointment
    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, invoice_number, appointment_id')
      .eq('appointment_id', appointmentId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return { success: true, payment: payment || null }
  }

  if (invoiceNumber) {
    // Verify the invoice belongs to this tenant via payment
    const { data: paymentCheck } = await supabase
      .from('payments')
      .select('id, appointment_id')
      .eq('invoice_number', invoiceNumber)
      .single()

    if (!paymentCheck) {
      throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
    }

    // Verify appointment belongs to tenant
    const { data: apptCheck } = await supabase
      .from('appointments')
      .select('id, tenant_id')
      .eq('id', paymentCheck.appointment_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!apptCheck) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    // Load invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_number', invoiceNumber)
      .single()

    if (invoiceError || !invoice) {
      throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
    }

    return { success: true, invoice }
  }
})
