import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user: authUser } } = await supabase.auth.getUser(token)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) throw createError({ statusCode: 403, message: 'User profile not found' })

  const { data, error } = await supabase
    .from('cancellation_reasons')
    .select('*')
    .eq('is_active', true)
    .eq('tenant_id', userProfile.tenant_id)
    .order('sort_order', { ascending: true })

  if (error) throw createError({ statusCode: 500, message: 'Failed to fetch' })

  return { success: true, data: data || [] }
})
