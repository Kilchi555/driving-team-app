import { defineEventHandler, readBody, createError } from 'h3'
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

  const { invoice_id, updates } = await readBody(event)

  if (!invoice_id || !updates) {
    throw createError({ statusCode: 400, statusMessage: 'Missing invoice_id or updates' })
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', invoice_id)
    .eq('tenant_id', staffUser.tenant_id)
    .select()
    .single()

  if (error || !invoice) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to update invoice' })
  }

  const { data: fullInvoice } = await supabase
    .from('invoices_with_details')
    .select('*')
    .eq('id', invoice_id)
    .single()

  return { success: true, data: fullInvoice }
})
