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
    const { action, transactionId, notes } = body

    if (!action || !transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters'
      })
    }

    const supabase = getSupabaseAdmin()

    if (action === 'update-notes') {
      if (!notes) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Notes field required'
        })
      }

      // Update notes for cash transaction
      const { error: updateError } = await supabase
        .from('cash_transactions')
        .update({ notes })
        .eq('id', transactionId)

      if (updateError) {
        logger.error('Error updating cash transaction notes:', updateError)
        throw updateError
      }

      logger.debug('✅ Cash transaction notes updated:', transactionId)

      return {
        success: true,
        message: 'Notes updated successfully',
        transactionId,
        notes
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid action'
    })

  } catch (error: any) {
    logger.error('Error in cash transactions API:', error)
    throw error
  }
})
