/**
 * API Endpoint: Reserve Appointment Slot
 * Reserviert einen Termin für 5 Minuten
 */

import { getSupabaseAdmin } from '~/utils/supabase'

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

    console.log('🔄 Reserving slot:', { staff_id, start_time })

    // Validierung
    if (!staff_id || !start_time || !end_time || !tenant_id) {
      console.error('❌ Missing required fields:', { staff_id, start_time, end_time, tenant_id })
      throw createError({
        statusCode: 400,
        message: 'Missing required fields'
      })
    }

    const supabase = getSupabaseAdmin()
    
    // Get user from auth header
    const authToken = getHeader(event, 'authorization')?.replace('Bearer ', '')
    let userId: string | null = null
    
    if (authToken) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(authToken)
        if (!authError && user?.id) {
          userId = user.id
          console.log('✅ User authenticated:', userId)
        }
      } catch (err) {
        console.log('⚠️ Could not get authenticated user:', err)
      }
    }
    
    // If no authenticated user, generate a temporary session ID
    // This allows unauthenticated users to reserve slots
    if (!userId) {
      // Generate a temporary UUID-like ID for this session
      userId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      console.log('ℹ️ No auth user, using session ID:', userId)
    }

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
        user_id: userId,
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
        description: 'Temporäre Reservierung - wird nach 5 Minuten gelöscht' // Required field
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

