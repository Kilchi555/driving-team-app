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
      throw createError({
        statusCode: 400,
        message: 'Missing required fields'
      })
    }

    const supabase = getSupabaseAdmin()

    // 1. Prüfe ob der Slot noch frei ist
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('staff_id', staff_id)
      .eq('status', 'reserved')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Nur letzte 5 Min
      .overlaps('start_time', 'end_time', {
        start_time: new Date(start_time).toISOString(),
        end_time: new Date(end_time).toISOString()
      })

    if (checkError) {
      console.error('❌ Error checking appointments:', checkError)
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
        title: `${category_code} - Reserviert`,
        created_at: new Date().toISOString()
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
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error'
    })
  }
})

