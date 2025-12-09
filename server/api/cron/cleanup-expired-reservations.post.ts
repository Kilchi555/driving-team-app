/**
 * Cron Job: Cleanup Expired Reservations
 * Löscht Reservierungen die älter als 5 Minuten sind
 * 
 * Runs every hour via Vercel Cron (instead of every minute to save resources)
 * Since reservations are only 5 minutes valid, hourly cleanup is sufficient
 */

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  // Verify Cron Secret if needed (for security)
  const authHeader = getHeader(event, 'authorization')
  
  try {
    const supabase = getSupabaseAdmin()
    
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
      console.error('❌ Error deleting expired reservations:', deleteError)
      return {
        success: false,
        error: deleteError.message,
        deletedCount: 0
      }
    }
    
    const deletedCount = deletedReservations?.length || 0
    logger.debug(`✅ Cleaned up ${deletedCount} expired reservations`)
    
    return {
      success: true,
      deletedCount,
      timestamp: new Date().toISOString()
    }
    
  } catch (error: any) {
    console.error('❌ Error in cleanup-expired-reservations cron:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

