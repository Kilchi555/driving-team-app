/**
 * Cron Job: Cleanup Expired Reservations
 * Runs every hour via Vercel Cron
 * Deletes reservations (reserved appointments) older than 5 minutes
 * 
 * Security:
 * ✅ Layer 1: Auth - Vercel CRON_SECRET verification
 * ✅ Layer 2: Rate Limiting - Prevents re-trigger within 30 seconds
 * ✅ Layer 3: Audit Logging - Logs every execution
 * ✅ Layer 7: Error Handling - Detailed error messages
 */

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { verifyCronToken, checkCronRateLimit, logCronExecution } from '~/server/utils/cron'

export default defineEventHandler(async (event) => {
  const startTime = new Date()
  let deletedCount = 0
  
  try {
    // Layer 1: Authentication - Verify Vercel Cron token
    if (!verifyCronToken(event)) {
      logger.error('🚨 Unauthorized cron request to cleanup-expired-reservations')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Invalid cron token'
      })
    }
    
    const supabase = getSupabaseAdmin()
    
    // Layer 2: Rate Limiting - Prevent re-trigger
    const canRun = await checkCronRateLimit(supabase, 'cleanup-expired-reservations', 30)
    if (!canRun) {
      logger.warn('⏱️ Rate limited: cleanup-expired-reservations ran too recently')
      
      await logCronExecution(supabase, 'cleanup-expired-reservations', 'success', {
        startedAt: startTime,
        completedAt: new Date(),
        errorMessage: 'Skipped due to rate limit'
      })
      
      return {
        success: false,
        reason: 'rate_limited',
        message: 'Skipped - ran too recently'
      }
    }
    
    // Calculate the cutoff time: 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    logger.debug('🧹 Cleaning up expired reservations created before:', fiveMinutesAgo)
    
    // Delete all 'reserved' appointments that were created more than 5 minutes ago
    const { data: deletedReservations, error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('status', 'reserved')
      .lt('created_at', fiveMinutesAgo)
      .select()
    
    if (deleteError) {
      const errorMsg = `Error deleting expired reservations: ${deleteError.message}`
      logger.error(`❌ ${errorMsg}`)
      
      // Layer 3: Audit Logging - Log failure
      await logCronExecution(supabase, 'cleanup-expired-reservations', 'failed', {
        startedAt: startTime,
        completedAt: new Date(),
        errorMessage: errorMsg
      })
      
      throw createError({
        statusCode: 500,
        statusMessage: errorMsg
      })
    }
    
    deletedCount = deletedReservations?.length || 0
    logger.debug(`✅ Cleaned up ${deletedCount} expired reservations`)
    
    // Layer 3: Audit Logging - Log success
    await logCronExecution(supabase, 'cleanup-expired-reservations', 'success', {
      deletedCount,
      startedAt: startTime,
      completedAt: new Date()
    })
    
    return {
      success: true,
      deletedCount,
      runtime_ms: new Date().getTime() - startTime.getTime()
    }
    
  } catch (error: any) {
    logger.error(`❌ Error in cleanup-expired-reservations cron: ${error.message}`)
    
    // Log the error if we have supabase access
    try {
      const supabase = getSupabaseAdmin()
      await logCronExecution(supabase, 'cleanup-expired-reservations', 'failed', {
        startedAt: startTime,
        completedAt: new Date(),
        errorMessage: error.message || 'Unknown error'
      })
    } catch (logError) {
      logger.error('❌ Failed to log cron error:', logError)
    }
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})

