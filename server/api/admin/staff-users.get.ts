import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .eq('tenant_id', profile.tenant_id)
    .in('role', ['staff', 'admin'])
    .eq('is_active', true)
    .order('first_name')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, data: data || [] }
})
