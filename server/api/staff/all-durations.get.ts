import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const staffId = query.staffId as string

    // Verify auth
    const user = await getAuthenticatedUserWithDbId(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    if (!staffId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing staffId parameter'
      })
    }

    const supabase = getSupabaseAdmin()

    // Load all durations for staff (for settings)
    const { data, error: fetchError } = await supabase
      .from('staff_category_durations')
      .select(`
        category_code,
        duration_minutes,
        display_order,
        categories (name)
      `)
      .eq('staff_id', staffId)
      .eq('is_active', true)
      .order('category_code')
      .order('display_order')

    if (fetchError) {
      logger.error('Error fetching all durations:', fetchError)
      throw fetchError
    }

    // Group by category
    const groupedDurations = data?.reduce((acc: any, item: any) => {
      if (!acc[item.category_code]) {
        acc[item.category_code] = {
          categoryCode: item.category_code,
          categoryName: item.categories?.name || item.category_code,
          durations: []
        }
      }
      acc[item.category_code].durations.push(item.duration_minutes)
      return acc
    }, {}) || {}

    return { durations: Object.values(groupedDurations) }

  } catch (error: any) {
    logger.error('Error loading all staff durations:', error)
    throw error
  }
})
