import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['staff', 'admin', 'superadmin'])
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('accounting_entries')
    .select('id, type, amount_rappen, description, entry_date, receipt_url, receipt_filename, approval_status, rejection_reason, created_at')
    .eq('tenant_id', profile.tenant_id)
    .eq('submitted_by_user_id', profile.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data: data ?? [] }
})
