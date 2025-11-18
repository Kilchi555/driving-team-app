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

    // Check if reservation_id is a valid UUID (looks like session-* ID means no DB entry needed)
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservation_id)
    
    if (isValidUUID) {
      // Only delete if it's a real UUID - session-based IDs don't have DB entries
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

      console.log('✅ Reservation cancelled (real UUID):', reservation_id)
    } else {
      // Session-based ID - no DB entry to delete
      console.log('ℹ️ Session-based reservation ID - no DB entry to delete:', reservation_id)
    }

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

