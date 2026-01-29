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
    const { staffId, newDurations } = body

    if (!staffId || !newDurations || !Array.isArray(newDurations)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters'
      })
    }

    // Validate all durations are positive numbers
    if (!newDurations.every((d: any) => typeof d === 'number' && d > 0)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'All durations must be positive numbers'
      })
    }

    const supabase = getSupabaseAdmin()

    // Update staff settings with new durations (as JSON array)
    const durationsJson = JSON.stringify(newDurations.sort((a: number, b: number) => a - b))
    
    const { error: upsertError } = await supabase
      .from('staff_settings')
      .upsert({
        staff_id: staffId,
        preferred_durations: durationsJson,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'staff_id'
      })

    if (upsertError) {
      logger.error('Error upserting staff durations:', upsertError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update durations'
      })
    }

    logger.debug('✅ Staff durations updated:', durationsJson)

    return {
      success: true,
      durations: newDurations.sort((a: number, b: number) => a - b),
      message: 'Durations updated successfully'
    }

  } catch (error: any) {
    logger.error('Error updating durations:', error)
    throw error
  }
})
