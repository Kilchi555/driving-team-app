import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import logger from '~/utils/logger'

/**
 * GET /api/staff/get-all-exam-locations
 * Returns ALL global exam locations (tenant_id = null).
 * Used in StaffSettings to show all available locations the staff can enable.
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    const { data: locations, error } = await supabase
      .from('locations')
      .select('*')
      .is('tenant_id', null)
      .eq('location_type', 'exam')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      logger.error('❌ Error fetching all exam locations:', error)
      throw createError({ statusCode: 500, message: 'Failed to fetch exam locations' })
    }

    return { success: true, data: locations || [] }

  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: error.message || 'Failed to fetch exam locations' })
  }
})
