import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()

    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) {
      logger.warn('❌ Auth failed for cancellation reasons')
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      logger.warn('❌ User profile not found')
      throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    const { data, error } = await supabase
      .from('cancellation_reasons')
      .select('*')
      .eq('is_active', true)
      .eq('tenant_id', userProfile.tenant_id)
      .order('sort_order', { ascending: true })

    if (error) {
      logger.error('❌ DB error fetching cancellation reasons:', error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch' })
    }

    logger.debug('✅ Fetched active cancellation reasons:', data?.length || 0)
    return { success: true, data: data || [] }
  } catch (err: any) {
    if (err.statusCode) throw err
    logger.error('❌ Unexpected error:', err.message)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
