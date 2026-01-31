import { defineEventHandler, readBody, createError, getHeader } from 'h3'
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
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile || userProfile.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Only admins can delete' })
  }

  const body = await readBody(event)
  const { id } = body

  const { error } = await supabase
    .from('cancellation_reasons')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', userProfile.tenant_id)

  if (error) throw createError({ statusCode: 500, message: 'Failed to delete' })

  return { success: true }
})
