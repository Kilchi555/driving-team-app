import { defineEventHandler, createError } from 'h3'
import { requireAdminOnly } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminOnly(event)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('accountant_grants')
    .select('id, email, access, invited_at, accepted_at, revoked_at, user_id')
    .eq('tenant_id', profile.tenant_id)
    .is('revoked_at', null)
    .order('invited_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data: data ?? [] }
})
