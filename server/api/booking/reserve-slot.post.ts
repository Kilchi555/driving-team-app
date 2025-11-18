/**
 * API Endpoint: Reserve Appointment Slot
 * Reserviert einen Termin für 5 Minuten
 */

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      user_id,
      staff_id,
      start_time,
      end_time,
      duration_minutes,
      category_code,
      location_id,
      tenant_id
    } = body

    console.log('🔄 Reserving slot:', { user_id, staff_id, start_time })

    // Validierung
    if (!user_id || !staff_id || !start_time || !end_time || !tenant_id) {
      console.error('❌ Missing required fields:', { user_id, staff_id, start_time, end_time, tenant_id })
      throw createError({
        statusCode: 400,
        message: 'Missing required fields'
      })
    }
    
    // Validiere dass user_id ein gültiger UUID ist
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user_id)) {
      console.error('❌ Invalid user_id format:', user_id)
      throw createError({
        statusCode: 400,
        message: 'Invalid user_id - must be a valid UUID'
      })
    }

    const supabase = getSupabaseAdmin()

    // 1. Prüfe ob der Slot noch frei ist (nur 'reserved' status)
    const startTime = new Date(start_time).toISOString()
    const endTime = new Date(end_time).toISOString()
    
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('staff_id', staff_id)
      .eq('status', 'reserved')
      .lt('end_time', endTime)
      .gt('start_time', startTime)

    if (checkError) {
      console.error('❌ Error checking appointments:', checkError)
      throw createError({
        statusCode: 500,
        message: `Fehler beim Prüfen der Verfügbarkeit: ${checkError.message}`
      })
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return {
        success: false,
        message: 'Der Termin wurde leider soeben vergeben. Versuchen Sie es mit einem anderen Termin.'
      }
    }

    // 2. Erstelle Reservierung
    const { data: reservation, error: reservationError } = await supabase
      .from('appointments')
      .insert({
        user_id,
        staff_id,
        location_id,
        start_time,
        end_time,
        duration_minutes,
        type: category_code || 'lesson',
        event_type_code: 'lesson',
        status: 'reserved', // Provisorischer Status
        tenant_id,
        title: `${category_code} - Reserviert`
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

    console.log('✅ Slot reserved:', reservation.id)

    return {
      success: true,
      reservation_id: reservation.id,
      reserved_until: new Date(Date.now() + 5 * 60 * 1000).toISOString()
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

