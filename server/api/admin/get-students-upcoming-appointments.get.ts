import { defineEventHandler, createError } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    if (!['staff', 'admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('appointments')
      .select('user_id')
      .eq('tenant_id', userProfile.tenant_id)
      .is('deleted_at', null)
      .in('status', ['scheduled', 'confirmed'])
      .gt('start_time', now)

    if (error) {
      logger.error('❌ Error fetching upcoming appointments:', error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch appointments' })
    }

    // Return deduplicated list of user_ids that have at least one upcoming appointment
    const userIds = [...new Set((data || []).map((a: any) => a.user_id))]

    return { success: true, data: userIds }
  } catch (error: any) {
    logger.error('❌ get-students-upcoming-appointments:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
