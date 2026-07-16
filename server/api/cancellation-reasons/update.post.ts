import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

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
    throw createError({ statusCode: 403, message: 'Only admins can update' })
  }

  const body = await readBody(event)
  const { id, ...updates } = body

  const { data, error } = await supabase
    .from('cancellation_reasons')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', userProfile.tenant_id)
    .select()
    .single()

  if (error) {
    logger.error('❌ DB error updating cancellation reason:', error)
    if (error.code === '23505') {
      throw createError({
        statusCode: 409,
        message: 'Ein Absage-Grund mit diesem Code existiert für diesen Mandanten bereits.',
        data: { code: '23505' }
      })
    }
    throw createError({ statusCode: 500, message: 'Failed to update', data: { code: error.code } })
  }

  return { success: true, data }
})
