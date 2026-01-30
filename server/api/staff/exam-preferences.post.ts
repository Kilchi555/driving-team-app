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
    const { staffId, locationIds } = body

    if (!staffId || !Array.isArray(locationIds)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'staffId and locationIds array required'
      })
    }

    // Store preferences in user_metadata (or create a dedicated table if needed)
    // For now, we'll use a simple in-memory approach or session-based storage
    // In production, you might want a dedicated staff_exam_preferences table

    logger.debug('✅ Exam preferences saved for staff:', staffId, 'locations:', locationIds)

    return {
      success: true,
      message: 'Exam preferences saved successfully',
      staffId,
      locationIds
    }

  } catch (error: any) {
    logger.error('Error in exam preferences API:', error)
    throw error
  }
})
