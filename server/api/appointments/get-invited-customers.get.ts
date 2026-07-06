import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { appointment_id } = getQuery(event) as { appointment_id?: string }
  if (!appointment_id) throw createError({ statusCode: 400, statusMessage: 'appointment_id required' })

  const supabase = getSupabaseAdmin()

  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!userProfile) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const { data, error } = await supabase
    .from('invited_customers')
    .select('id, first_name, last_name, phone, email, notes, status, created_at')
    .eq('appointment_id', appointment_id)
    .order('created_at')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, customers: data || [] }
})
