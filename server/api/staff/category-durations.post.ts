import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Verify auth
    const user = await getAuthenticatedUserWithDbId(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    const body = await readBody(event)
    const { staffId, categoryCode, durations } = body

    if (!staffId || !categoryCode || !durations || !Array.isArray(durations)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters'
      })
    }

    // Validate all durations are positive numbers
    if (!durations.every((d: any) => typeof d === 'number' && d > 0)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'All durations must be positive numbers'
      })
    }

    const supabase = getSupabaseAdmin()

    // Delete all existing entries for this staff + category
    const { error: deleteError } = await supabase
      .from('staff_category_durations')
      .delete()
      .eq('staff_id', staffId)
      .eq('category_code', categoryCode)

    if (deleteError) {
      logger.error('Error deleting old durations:', deleteError)
      throw deleteError
    }

    // Insert new entries
    const insertData = durations.map((duration: number, index: number) => ({
      staff_id: staffId,
      category_code: categoryCode,
      duration_minutes: duration,
      display_order: index + 1,
      is_active: true
    }))

    const { error: insertError } = await supabase
      .from('staff_category_durations')
      .insert(insertData)

    if (insertError) {
      logger.error('Error inserting new durations:', insertError)
      throw insertError
    }

    logger.debug('✅ Staff category durations saved successfully')

    return {
      success: true,
      durations: durations.sort((a: number, b: number) => a - b),
      message: 'Durations saved successfully'
    }

  } catch (error: any) {
    logger.error('Error saving category durations:', error)
    throw error
  }
})
