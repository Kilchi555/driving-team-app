import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'superadmin'])
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('accounting_entries')
    .select('id, type, amount_rappen, description, entry_date, receipt_url, receipt_filename, approval_status, created_at, submitted_by_user_id')
    .eq('tenant_id', profile.tenant_id)
    .eq('approval_status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Fetch submitter names separately to avoid RLS issues on users table
  const entries = data ?? []
  const userIds = [...new Set(entries.map(e => e.submitted_by_user_id).filter(Boolean))]
  let userMap: Record<string, { first_name: string; last_name: string; email: string }> = {}

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u
  }

  return {
    success: true,
    data: entries.map(e => ({
      ...e,
      submitter: e.submitted_by_user_id ? (userMap[e.submitted_by_user_id] ?? null) : null,
    })),
  }
})
