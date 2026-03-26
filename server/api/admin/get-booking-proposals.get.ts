import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const tenantId = authUser.tenant_id
    const dbUserId = authUser.db_user_id
    const role = authUser.role

    if (!tenantId || !dbUserId || !role) {
      throw createError({ statusCode: 403, statusMessage: 'User profile incomplete' })
    }

    if (!['staff', 'admin', 'tenant_admin', 'super_admin'].includes(role)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Insufficient permissions' })
    }

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('booking_proposals')
      .select(`
        id,
        category_code,
        duration_minutes,
        preferred_time_slots,
        first_name,
        last_name,
        email,
        phone,
        notes,
        status,
        created_at,
        street,
        house_number,
        postal_code,
        city,
        location:locations(id, name),
        staff:users!staff_id(id, first_name, last_name)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // Staff should only see their own assigned proposals.
    if (role === 'staff') {
      query = query.eq('staff_id', dbUserId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('❌ Error fetching booking proposals:', error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch booking proposals' })
    }

    return {
      success: true,
      data: data || []
    }
  } catch (error: any) {
    logger.error('❌ Error in get-booking-proposals API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
