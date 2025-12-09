/**
 * API Endpoint: Cancel Slot Reservation
 * Löscht eine Reservierung aus booking_reservations
 */

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { reservation_id } = body

    logger.debug('🗑️ Cancelling reservation:', reservation_id)

    if (!reservation_id) {
      throw createError({
        statusCode: 400,
        message: 'Missing reservation_id'
      })
    }

    const supabase = getSupabaseAdmin()

    // Delete from booking_reservations
    const { error: deleteError } = await supabase
      .from('booking_reservations')
      .delete()
      .eq('id', reservation_id)

    if (deleteError) {
      console.error('❌ Error deleting reservation:', deleteError)
      throw createError({
        statusCode: 500,
        message: `Fehler beim Löschen der Reservierung: ${deleteError.message}`
      })
    }

    logger.debug('✅ Booking reservation cancelled:', reservation_id)

    return {
      success: true
    }

  } catch (error: any) {
    console.error('❌ Error in cancel-reservation:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error'
    })
  }
})
