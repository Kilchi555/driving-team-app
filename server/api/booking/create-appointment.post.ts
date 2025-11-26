/**
 * API Endpoint: Create Appointment from Booking
 * Erstellt einen Termin und das zugehörige Payment
 */

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      user_id,
      staff_id,
      location_id,
      custom_location_address,
      custom_location_name,
      start_time,
      end_time,
      duration_minutes,
      type,
      event_type_code,
      status,
      tenant_id,
      reservation_id // Optional: booking_reservations ID
    } = body

    console.log('📝 Creating appointment:', body)

    // Validierung
    if (!user_id || !staff_id || !start_time || !end_time || !type || !tenant_id) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields'
      })
    }

    const supabase = getSupabaseAdmin()

    // 0. Falls reservation_id vorhanden: lösche die Reservierung
    if (reservation_id) {
      const { error: deleteReservationError } = await supabase
        .from('booking_reservations')
        .delete()
        .eq('id', reservation_id)

      if (deleteReservationError) {
        console.warn('⚠️ Could not delete booking reservation:', deleteReservationError)
        // Nicht kritisch, fahre fort
      } else {
        console.log('✅ Booking reservation deleted:', reservation_id)
      }
    }

    // 1. Erstelle Appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        user_id,
        staff_id,
        location_id,
        custom_location_address,
        custom_location_name,
        start_time,
        end_time,
        duration_minutes,
        type,
        event_type_code: event_type_code || 'lesson',
        status: status || 'pending_confirmation',
        tenant_id,
        title: `${type} - ${custom_location_address || 'Standort'}`,
        description: `Appointment for ${type} at ${custom_location_address || 'standard location'}`,
        confirmation_token: generateConfirmationToken()
      })
      .select()
      .single()

    if (appointmentError) {
      console.error('❌ Error creating appointment:', appointmentError)
      console.error('❌ Error details:', {
        message: appointmentError.message,
        code: appointmentError.code,
        details: appointmentError.details
      })
      throw createError({
        statusCode: 500,
        message: `Fehler beim Erstellen des Termins: ${appointmentError.message}`
      })
    }

    console.log('✅ Appointment created:', appointment.id)

    // 1b. Auto-assign staff to customer on first appointment with this staff
    try {
      const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('assigned_staff_ids')
        .eq('id', user_id)
        .single()

      if (userFetchError) {
        console.warn('⚠️ Could not fetch user assigned_staff_ids:', userFetchError)
      } else if (userData) {
        const currentStaffIds = userData.assigned_staff_ids || []
        
        // Check if staff is already assigned
        if (!currentStaffIds.includes(staff_id)) {
          // Add staff to the array
          const updatedStaffIds = [...currentStaffIds, staff_id]
          
          console.log(`👤 Adding staff ${staff_id} to customer ${user_id}'s assigned_staff_ids`, {
            before: currentStaffIds,
            after: updatedStaffIds
          })
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ assigned_staff_ids: updatedStaffIds })
            .eq('id', user_id)
          
          if (updateError) {
            console.warn('⚠️ Could not update assigned_staff_ids:', updateError)
          } else {
            console.log('✅ Staff added to customer assigned_staff_ids')
          }
        } else {
          console.log(`ℹ️ Staff ${staff_id} already in customer's assigned_staff_ids`)
        }
      }
    } catch (error: any) {
      console.error('❌ Error in auto-assign staff:', error.message)
    }

    // 2. Lade Preis-Informationen
    const { data: eventType } = await supabase
      .from('event_types')
      .select('default_price_rappen, default_fee_rappen, require_payment')
      .eq('code', event_type_code || 'lesson')
      .eq('tenant_id', tenant_id)
      .single()

    const requiresPayment = eventType?.require_payment !== false
    const lessonPrice = eventType?.default_price_rappen || 9500 // Default: CHF 95
    
    // ✅ Admin Fee nur beim 2. Termin des Kunden berechnen (einmal pro Kategorie)
    let adminFee = 0
    
    if (eventType?.default_fee_rappen && eventType.default_fee_rappen > 0) {
      // Prüfe, ob der Kunde jemals eine Admin Fee für diesen event_type bezahlt hat
      // (unabhängig davon, ob Termine storniert wurden)
      const { data: previousAdminFeePayments } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', user_id)
        .eq('tenant_id', tenant_id)
        .gt('admin_fee_rappen', 0)
        .limit(1)
      
      const hasAlreadyPaidAdminFee = previousAdminFeePayments && previousAdminFeePayments.length > 0
      
      if (hasAlreadyPaidAdminFee) {
        console.log('ℹ️ Customer has already paid admin fee before - no admin fee for this appointment')
        adminFee = 0
      } else {
        // Zähle, wie viele Termine der Kunde bereits hat (für diesen event_type_code)
        // Berücksichtige: pending_confirmation, confirmed, completed
        const { count: existingAppointmentsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user_id)
          .eq('tenant_id', tenant_id)
          .eq('event_type_code', event_type_code || 'lesson')
          .in('status', ['pending_confirmation', 'confirmed', 'completed'])
        
        const appointmentNumber = (existingAppointmentsCount || 0) + 1 // +1 for current appointment
        
        console.log('💰 Admin fee check:', {
          eventTypeCode: event_type_code || 'lesson',
          existingAppointments: existingAppointmentsCount,
          appointmentNumber,
          defaultFeeRappen: eventType.default_fee_rappen,
          hasAlreadyPaidAdminFee,
          willChargeAdminFee: appointmentNumber === 2
        })
        
        // Admin Fee nur beim 2. Termin
        if (appointmentNumber === 2) {
          adminFee = eventType.default_fee_rappen
          console.log('✅ Admin fee will be charged (2nd appointment):', adminFee / 100, 'CHF')
        } else {
          console.log('ℹ️ No admin fee (appointment #' + appointmentNumber + ')')
        }
      }
    }

    // 3. Erstelle Payment (falls erforderlich)
    let paymentId = null

    if (requiresPayment) {
      // Lade Tenant Settings für automatische Zahlung
      const { data: paymentSettings } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenant_id)
        .eq('setting_key', 'payment_settings')
        .single()

      const settings = paymentSettings?.setting_value || {}
      const automaticPaymentEnabled = settings.automatic_payment_enabled !== false
      const hoursBeforePayment = settings.automatic_payment_hours_before || 24

      // Berechne scheduled_payment_date
      const appointmentDate = new Date(start_time)
      const scheduledPaymentDate = new Date(appointmentDate)
      scheduledPaymentDate.setHours(scheduledPaymentDate.getHours() - hoursBeforePayment)
      // Runde auf die nächste volle Stunde auf (Cron läuft zur vollen Stunde)
      // Wenn nicht genau auf der vollen Stunde, dann aufrunden
      if (scheduledPaymentDate.getMinutes() > 0 || scheduledPaymentDate.getSeconds() > 0) {
        scheduledPaymentDate.setHours(scheduledPaymentDate.getHours() + 1)
      }
      scheduledPaymentDate.setMinutes(0)
      scheduledPaymentDate.setSeconds(0)
      scheduledPaymentDate.setMilliseconds(0)

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          appointment_id: appointment.id,
          user_id,
          staff_id,
          tenant_id,
          lesson_price_rappen: lessonPrice,
          admin_fee_rappen: adminFee,
          total_amount_rappen: lessonPrice + adminFee,
          payment_method: 'wallee',
          payment_status: 'pending',
          currency: 'CHF',
          description: `Payment for appointment: ${type}`,
          scheduled_payment_date: automaticPaymentEnabled ? scheduledPaymentDate.toISOString() : null,
          created_by: user_id
        })
        .select()
        .single()

      if (paymentError) {
        console.error('Error creating payment:', paymentError)
        // Don't fail the whole request, just log the error
      } else {
        paymentId = payment.id
        console.log('✅ Payment created:', payment.id)
        
        // ✅ Erstelle payment_items für dieses Payment
        const paymentItems = []
        
        // Fahrlektion als Item
        paymentItems.push({
          payment_id: payment.id,
          item_type: 'service',
          item_name: type || 'Fahrlektion',
          quantity: 1,
          unit_price_rappen: lessonPrice,
          total_price_rappen: lessonPrice,
          description: `${duration_minutes || 45} Minuten`
        })
        
        // Admin Fee als Item (falls vorhanden)
        if (adminFee > 0) {
          paymentItems.push({
            payment_id: payment.id,
            item_type: 'service',
            item_name: 'Verwaltungsgebühr',
            quantity: 1,
            unit_price_rappen: adminFee,
            total_price_rappen: adminFee,
            description: null
          })
        }
        
        // Items in DB speichern
        const { error: itemsError } = await supabase
          .from('payment_items')
          .insert(paymentItems)
        
        if (itemsError) {
          console.error('Error creating payment items:', itemsError)
        } else {
          console.log('✅ Payment items created:', paymentItems.length)
        }
      }
    }

    // 4. Sende Bestätigungs-Email (optional, kann später implementiert werden)
    // TODO: Send confirmation email with token

    return {
      success: true,
      appointment_id: appointment.id,
      payment_id: paymentId,
      confirmation_token: appointment.confirmation_token
    }

  } catch (error: any) {
    console.error('❌ Error in create-appointment:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error'
    })
  }
})

// Generate random confirmation token
function generateConfirmationToken(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

