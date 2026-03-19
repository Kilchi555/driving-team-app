import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * GET /api/staff/get-exam-locations
 * Returns exam locations where the current staff member is in staff_ids.
 * Used in ExamLocationSelector when creating appointments.
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    const staffId = user.id

    // Load all global exam locations
    const { data: allExamLocations, error } = await supabase
      .from('locations')
      .select('*')
      .is('tenant_id', null)
      .eq('location_type', 'exam')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      logger.error('❌ Error fetching exam locations:', error)
      throw createError({ statusCode: 500, message: 'Failed to fetch exam locations' })
    }

    // Return only locations where this staff member is in staff_ids
    const staffLocations = (allExamLocations || []).filter(loc => {
      const staffIds = loc.staff_ids || []
      if (!Array.isArray(staffIds) || staffIds.length === 0) return false
      return staffIds.includes(staffId)
    })

    logger.debug('✅ Exam locations for staff:', {
      staffId,
      total: allExamLocations?.length || 0,
      forThisStaff: staffLocations.length
    })

    return { success: true, data: staffLocations }

  } catch (error: any) {
    logger.error('❌ Error in get-exam-locations API:', error.message)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: error.message || 'Failed to fetch exam locations' })
  }
})
