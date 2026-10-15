import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { releaseInvoicePayments } from '~/server/utils/release-invoice-payments'
import { decideInvoiceUpdate } from '~/server/utils/invoice-update-allowlist'

const INVOICE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  if (!staffUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const invoiceId = body?.invoice_id
  const updates = body?.updates

  if (!invoiceId || updates == null) {
    throw createError({ statusCode: 400, statusMessage: 'Missing invoice_id or updates' })
  }

  if (typeof invoiceId !== 'string' || !INVOICE_ID_PATTERN.test(invoiceId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid invoice ID format' })
  }

  const decision = decideInvoiceUpdate(updates, new Date().toISOString())
  if (!decision.ok) {
    throw createError({ statusCode: decision.statusCode, statusMessage: decision.statusMessage })
  }

  const { data: existingInvoice, error: existingError } = await supabase
    .from('invoices')
    .select('id, tenant_id')
    .eq('id', invoiceId)
    .maybeSingle()

  if (existingError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update invoice' })
  }

  if (!existingInvoice) {
    throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
  }

  if (existingInvoice.tenant_id !== staffUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .update(decision.payload)
    .eq('id', invoiceId)
    .eq('tenant_id', staffUser.tenant_id)
    .select()
    .single()

  if (error || !invoice) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to update invoice' })
  }

  // Storno: Zahlungen und Quellen wieder als offen / nicht verrechnet freigeben.
  // Only after the status write succeeds, and only for the cancel action.
  if (decision.payload.status === 'cancelled') {
    try {
      await releaseInvoicePayments(supabase, invoiceId)
    } catch (releaseError: unknown) {
      const releaseMessage = releaseError instanceof Error ? releaseError.message : 'unknown error'
      console.error('[invoices/update] Failed to release payments after cancel:', releaseMessage)
      throw createError({
        statusCode: 500,
        statusMessage: 'Rechnung storniert, aber Zahlungen konnten nicht freigegeben werden',
      })
    }
  }

  const { data: fullInvoice } = await supabase
    .from('invoices_with_details')
    .select('*')
    .eq('id', invoiceId)
    .eq('tenant_id', staffUser.tenant_id)
    .single()

  return { success: true, data: fullInvoice }
})
