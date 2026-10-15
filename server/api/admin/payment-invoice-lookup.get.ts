import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const query = getQuery(event)
  const appointmentId = typeof query.appointment_id === 'string' ? query.appointment_id : ''
  const invoiceNumber = typeof query.invoice_number === 'string' ? query.invoice_number.trim() : ''

  if (!appointmentId && !invoiceNumber) {
    throw createError({ statusCode: 400, statusMessage: 'Missing appointment_id or invoice_number' })
  }

  if (appointmentId) {
    if (!UUID_RE.test(appointmentId)) {
      throw createError({ statusCode: 400, statusMessage: 'Missing appointment_id or invoice_number' })
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, invoice_number, appointment_id')
      .eq('appointment_id', appointmentId)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (error) {
      throw createError({ statusCode: 500, statusMessage: 'Invoice lookup failed' })
    }

    return { success: true, payment: payment || null }
  }

  // invoice_number is unique per tenant, not globally.
  const { data: paymentCheck, error: paymentError } = await supabase
    .from('payments')
    .select('id, appointment_id')
    .eq('invoice_number', invoiceNumber)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (paymentError) {
    throw createError({ statusCode: 500, statusMessage: 'Invoice lookup failed' })
  }

  if (!paymentCheck) {
    throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
  }

  const { data: apptCheck, error: apptError } = await supabase
    .from('appointments')
    .select('id, tenant_id')
    .eq('id', paymentCheck.appointment_id)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (apptError) {
    throw createError({ statusCode: 500, statusMessage: 'Invoice lookup failed' })
  }

  if (!apptCheck) {
    throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_number', invoiceNumber)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (invoiceError) {
    throw createError({ statusCode: 500, statusMessage: 'Invoice lookup failed' })
  }

  if (!invoice) {
    throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
  }

  return { success: true, invoice }
})
