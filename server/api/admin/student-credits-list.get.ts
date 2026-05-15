import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      email,
      is_active,
      created_at,
      student_credits (
        balance_rappen,
        updated_at
      )
    `)
    .eq('role', 'client')
    .eq('tenant_id', profile.tenant_id)
    .order('first_name')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data || []
})
