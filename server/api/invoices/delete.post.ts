import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { requireAdminProfile } from '~/server/utils/auth'
import { mapSupabaseError } from '~/server/utils/supabase-error'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Staff/admin only — clients must not destroy receivables
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])

  const body = await readBody(event)
  const { invoice_id } = body

  if (!invoice_id) {
    throw createError({ statusCode: 400, message: 'Missing invoice_id' })
  }

  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoice_id)
      .eq('tenant_id', profile.tenant_id)

    if (error) throw mapSupabaseError(error)

    return { success: true }
  } catch (err: any) {
    console.error('Error deleting invoice:', err)
    if (err?.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message })
  }
})
