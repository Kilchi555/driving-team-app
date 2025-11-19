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
    
    // Generate a temporary user ID for unauthenticated users
    // This ensures we can track and prevent multiple simultaneous reservations
    if (!userId) {
      // For guests, we'll still create a temporary UUID-like identifier
      // We can't use actual UUID generation without a proper library, so we'll
      // use a hash-based approach with tenant_id and session data
      const crypto = await import('crypto')
      userId = crypto.randomUUID?.() || `guest-${tenant_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      console.log('ℹ️ Generated temporary user ID for guest:', userId.substring(0, 20) + '...')
    }

    const startTime = new Date(start_time).toISOString()
    const endTime = new Date(end_time).toISOString()
    
    // 1. Delete any existing 'reserved' appointments for this user (only 1 reservation per user at a time)
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'reserved')
    
    if (deleteError) {
      console.warn('⚠️ Could not delete old reservations:', deleteError)
      // Don't throw - continue anyway
    } else {
      console.log('✅ Old reservations cleaned up for user:', userId.substring(0, 20) + '...')
    }

    // 2. Prüfe ob der Slot noch frei ist (keine 'reserved' oder andere Termine)
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('staff_id', staff_id)
      .in('status', ['reserved', 'scheduled', 'confirmed', 'pending_confirmation'])
      .lte('start_time', endTime)
      .gte('end_time', startTime)

    if (checkError) {
      console.error('❌ Error checking appointments:', checkError)
      throw createError({
        statusCode: 500,
        message: `Fehler beim Prüfen der Verfügbarkeit: ${checkError.message}`
      })
    }

    if (existingAppointments && existingAppointments.length > 0) {
      console.log('⚠️ Slot is taken:', { existingCount: existingAppointments.length })
      return {
        success: false,
        message: 'Der Termin wurde leider soeben vergeben. Versuchen Sie es mit einem anderen Termin.'
      }
    }

    // 3. Erstelle Reservierung (für alle User - authenticated und guest)
    const { data: reservation, error: reservationError } = await supabase
      .from('appointments')
      .insert({
        user_id: userId,
        staff_id,
        location_id,
        start_time: startTime,
        end_time: endTime,
        duration_minutes,
        type: category_code || 'lesson',
        event_type_code: 'lesson',
        status: 'reserved', // Provisorischer Status
        tenant_id,
        title: `${category_code} - Reserviert`,
        description: 'Temporäre Reservierung - wird nach 5 Minuten gelöscht'
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
    console.log('✅ Slot reserved:', reservationId)

    return {
      success: true,
      reservation_id: reservationId,
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

