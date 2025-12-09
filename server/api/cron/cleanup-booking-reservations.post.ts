/**
 * Cron Job: Clean up expired booking reservations
 * Runs every minute to delete reservations older than 5 minutes
 */

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()

    logger.debug('🧹 Cleaning up expired booking reservations...')

    // Lösche alle abgelaufenen Reservierungen
    const { data: deletedReservations, error: deleteError } = await supabase
      .from('booking_reservations')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select()

    if (deleteError) {
      console.error('❌ Error deleting expired reservations:', deleteError)
      throw createError({
        statusCode: 500,
        message: `Error cleaning up reservations: ${deleteError.message}`
      })
    }

    const deletedCount = deletedReservations?.length || 0
    logger.debug(`✅ Cleaned up ${deletedCount} expired booking reservations`)

    return {
      success: true,
      deleted_count: deletedCount
    }

  } catch (error: any) {
    console.error('❌ Error in cleanup-booking-reservations cron:', error)
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error'
    })
  }
})

