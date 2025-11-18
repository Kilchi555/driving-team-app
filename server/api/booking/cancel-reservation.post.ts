/**
 * API Endpoint: Cancel Slot Reservation
 * Löscht eine Reservierung
 */

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { reservation_id } = body

    console.log('🗑️ Cancelling reservation:', reservation_id)

    if (!reservation_id) {
      throw createError({
        statusCode: 400,
        message: 'Missing reservation_id'
      })
    }

    const supabase = getSupabaseAdmin()

    // Lösche die Reservierung
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', reservation_id)
      .eq('status', 'reserved')

    if (deleteError) {
      console.error('❌ Error deleting reservation:', deleteError)
      throw createError({
        statusCode: 500,
        message: `Fehler beim Löschen der Reservierung: ${deleteError.message}`
      })
    }

    console.log('✅ Reservation cancelled:', reservation_id)

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

