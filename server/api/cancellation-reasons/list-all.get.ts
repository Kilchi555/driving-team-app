import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()

    // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
    // a raw Bearer-only check that would 401 whenever the client's access
    // token had just expired.
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      logger.warn('❌ Auth failed for cancellation reasons')
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const userProfile = authUser.db_user_id
      ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id }
      : null

    if (!userProfile) {
      logger.warn('❌ User profile not found')
      throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    const { data, error } = await supabase
      .from('cancellation_reasons')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)
      .order('sort_order', { ascending: true })

    if (error) {
      logger.error('❌ DB error fetching all cancellation reasons:', error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch' })
    }

    logger.debug('✅ Fetched all cancellation reasons:', data?.length || 0)
    return { success: true, data: data || [] }
  } catch (err: any) {
    if (err.statusCode) throw err
    logger.error('❌ Unexpected error:', err.message)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
