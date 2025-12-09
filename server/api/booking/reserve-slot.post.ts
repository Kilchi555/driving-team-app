/**
 * API Endpoint: Reserve Appointment Slot
 * Reserviert einen Termin für 5 Minuten in der booking_reservations Tabelle
 */

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      staff_id,
      start_time,
      end_time,
      duration_minutes,
      category_code,
      location_id,
      tenant_id
    } = body

    logger.debug('🔄 Reserving slot:', { staff_id, start_time })

    // Validierung
    if (!staff_id || !start_time || !end_time || !tenant_id) {
      console.error('❌ Missing required fields:', { staff_id, start_time, end_time, tenant_id })
      throw createError({
        statusCode: 400,
        message: 'Missing required fields'
      })
    }

    const supabase = getSupabaseAdmin()
    
    const startTime = new Date(start_time).toISOString()
    const endTime = new Date(end_time).toISOString()

    // Calculate expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    logger.debug('📅 Reservation times:', { startTime, endTime, expiresAt })

    // Reserviere den Slot in booking_reservations (nicht in appointments!)
    const { data: reservation, error: reservationError } = await supabase
      .from('booking_reservations')
      .insert({
        staff_id,
        location_id,
        start_time: startTime,
        end_time: endTime,
        duration_minutes,
        category_code: category_code || 'lesson',
        tenant_id,
        expires_at: expiresAt,
        status: 'reserved'
      })
      .select()
      .single()

    if (reservationError) {
      console.error('❌ Error creating reservation:', reservationError)
      throw createError({
        statusCode: 500,
        message: `Reservierung fehlgeschlagen: ${reservationError.message}`
      })
    }

    const reservationId = reservation.id
    logger.debug('✅ Slot reserved in booking_reservations:', reservationId)

    return {
      success: true,
      reservation_id: reservationId,
      reserved_until: expiresAt
    }

  } catch (error: any) {
    console.error('❌ Error in reserve-slot:', error)
    console.error('❌ Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack?.substring(0, 500)
    })
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error'
    })
  }
})
