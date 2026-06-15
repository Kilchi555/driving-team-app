import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'superadmin'])
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('accounting_entries')
    .select(`
      id, type, amount_rappen, description, entry_date,
      receipt_url, receipt_filename, approval_status, created_at, notes,
      submitter:submitted_by_user_id(id, first_name, last_name, email)
    `)
    .eq('tenant_id', profile.tenant_id)
    .eq('approval_status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data: data ?? [] }
})
