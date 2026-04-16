// server/api/invoices/save-settings.post.ts
// Saves QR-invoice and invoice numbering settings to the tenants table.

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: staffUser } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!staffUser || !['admin', 'tenant_admin'].includes(staffUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)

  const { error } = await supabase
    .from('tenants')
    .update({
      qr_iban: body.qr_iban?.trim() || null,
      invoice_number_prefix: body.invoice_number_prefix?.trim() || 'RE',
      invoice_street: body.invoice_street?.trim() || null,
      invoice_street_nr: body.invoice_street_nr?.trim() || null,
      invoice_zip: body.invoice_zip?.trim() || null,
      invoice_city: body.invoice_city?.trim() || null,
    })
    .eq('id', staffUser.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})
