/**
 * API Endpoint: Create Appointment from Booking
 * Erstellt einen Termin und das zugehörige Payment
 */

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

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

    logger.debug('📝 Creating appointment:', body)

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
        logger.debug('✅ Booking reservation deleted:', reservation_id)
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

    logger.debug('✅ Appointment created:', appointment.id)

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
          
          logger.debug(`👤 Adding staff ${staff_id} to customer ${user_id}'s assigned_staff_ids`, {
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
            logger.debug('✅ Staff added to customer assigned_staff_ids')
          }
        } else {
          logger.debug(`ℹ️ Staff ${staff_id} already in customer's assigned_staff_ids`)
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
      // ✅ WICHTIG: Prüfe ob Admin Fee bereits bezahlt UND NICHT erstattet wurde
      // Admin Fee wird NICHT erneut berechnet wenn:
      // 1. Kunde hat schon eine Admin Fee bezahlt UND
      // 2. Der zugehörige Termin wurde NICHT storniert ODER
      // 3. Der Termin wurde kostenpflichtig storniert (< 24h)
      
      const { data: adminFeePayments } = await supabase
        .from('payments')
        .select(`
          id,
          payment_status,
          admin_fee_rappen,
          appointments!inner (
            id,
            status,
            deleted_at,
            cancellation_charge_percentage
          )
        `)
        .eq('user_id', user_id)
        .eq('tenant_id', tenant_id)
        .eq('event_type_code', event_type_code || 'lesson')
        .gt('admin_fee_rappen', 0)
      
      let hasValidAdminFeePayment = false
      
      if (adminFeePayments && adminFeePayments.length > 0) {
        // Prüfe jeden Admin Fee Payment
        for (const payment of adminFeePayments) {
          const appointment = Array.isArray(payment.appointments)
            ? payment.appointments[0]
            : payment.appointments
          
          // ✅ Admin Fee ist noch gültig wenn:
          if (!appointment.deleted_at) {
            // 1. Termin wurde NICHT storniert → Fee ist gültig!
            logger.debug('✅ Admin fee still valid - appointment not cancelled')
            hasValidAdminFeePayment = true
            break
          } else if (appointment.deleted_at && appointment.cancellation_charge_percentage > 0) {
            // 2. Termin wurde KOSTENPFLICHTIG storniert → Fee bleibt bei Kunde!
            logger.debug('✅ Admin fee still valid - appointment cancelled but with charge (< 24h)')
            hasValidAdminFeePayment = true
            break
          } else if (appointment.deleted_at && appointment.cancellation_charge_percentage === 0) {
            // 3. Termin wurde KOSTENLOS storniert → Fee sollte erstattet sein
            //    → Admin Fee kann erneut berechnet werden!
            logger.debug('ℹ️ Admin fee was refunded (appointment cancelled for free, > 24h)')
            // Weiter zur nächsten Payment oder berechne neue Fee
          }
        }
      }
      
      if (hasValidAdminFeePayment) {
        logger.debug('ℹ️ Customer has already paid admin fee (still valid) - no admin fee for this appointment')
        adminFee = 0
      } else {
        // Zähle, wie viele Termine der Kunde bereits hat (für diesen event_type_code)
        // Berücksichtige: pending_confirmation, confirmed, completed
        // WICHTIG: Zähle NUR nicht-stornierte Termine
        const { count: existingAppointmentsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user_id)
          .eq('tenant_id', tenant_id)
          .eq('event_type_code', event_type_code || 'lesson')
          .in('status', ['pending_confirmation', 'confirmed', 'completed'])
          .is('deleted_at', null)  // Nur nicht-gelöschte Termine
        
        const appointmentNumber = (existingAppointmentsCount || 0) + 1 // +1 for current appointment being created
        
        logger.debug('💰 Admin fee check:', {
          eventTypeCode: event_type_code || 'lesson',
          existingAppointments: existingAppointmentsCount,
          appointmentNumber,
          defaultFeeRappen: eventType.default_fee_rappen,
          hasValidAdminFeePayment,
          willChargeAdminFee: appointmentNumber === 2
        })
        
        // Admin Fee nur beim 2. Termin
        if (appointmentNumber === 2) {
          adminFee = eventType.default_fee_rappen
          logger.debug('✅ Admin fee will be charged (2nd appointment):', adminFee / 100, 'CHF')
        } else {
          logger.debug('ℹ️ No admin fee (appointment #' + appointmentNumber + ')')
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

      // Load tenant's cancellation policy to determine payment scheduling threshold
      const { data: cancellationPolicy } = await supabase
        .from('cancellation_policies')
        .select(`
          *,
          rules:cancellation_rules(*)
        `)
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .limit(1)
        .single()

      // ✅ CRITICAL: Cancellation policy MUST be configured
      if (!cancellationPolicy?.rules || !Array.isArray(cancellationPolicy.rules) || cancellationPolicy.rules.length === 0) {
        const errorMsg = 'Keine Stornierungsrichtlinie konfiguriert. Bitte kontaktieren Sie den Administrator.'
        logger.error('❌ Cancellation policy not found or invalid for tenant:', tenant_id, {
          policy: cancellationPolicy,
        })
        throw new Error(errorMsg)
      }

      // Find the threshold for free cancellation (rule with charge_percentage = 0)
      const freeRule = cancellationPolicy.rules.find((rule: any) => rule.charge_percentage === 0)
      
      if (!freeRule) {
        const errorMsg = 'Keine kostenloses Stornierungsregel in der Policy konfiguriert. Bitte kontaktieren Sie den Administrator.'
        logger.error('❌ No free cancellation rule found in policy:', cancellationPolicy.id)
        throw new Error(errorMsg)
      }
      
      const hoursBeforeCancellationFree = freeRule.hours_before_appointment
      logger.debug('✅ Loaded free cancellation threshold from policy:', hoursBeforeCancellationFree, 'hours')

      // ✅ Berechne scheduled_authorization_date (X Stunden vor Termin, based on policy)
      const appointmentDate = new Date(start_time)
      const now = new Date()
      const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      let scheduledAuthorizationDate = null
      
      // Nur setzen, wenn Termin >= hoursBeforeCancellationFree entfernt ist (sonst sofort autorisieren)
      if (hoursUntilAppointment >= hoursBeforeCancellationFree) {
        scheduledAuthorizationDate = new Date(appointmentDate)
        scheduledAuthorizationDate.setHours(scheduledAuthorizationDate.getHours() - hoursBeforeCancellationFree)
        // Runde auf die nächste volle Stunde auf
        if (scheduledAuthorizationDate.getMinutes() > 0 || scheduledAuthorizationDate.getSeconds() > 0) {
          scheduledAuthorizationDate.setHours(scheduledAuthorizationDate.getHours() + 1)
        }
        scheduledAuthorizationDate.setMinutes(0)
        scheduledAuthorizationDate.setSeconds(0)
        scheduledAuthorizationDate.setMilliseconds(0)
      } else {
        // Termin < hoursBeforeCancellationFree: sofort autorisieren
        logger.debug(`⚡ Appointment < ${hoursBeforeCancellationFree}h away - will authorize immediately`)
        scheduledAuthorizationDate = new Date()
        scheduledAuthorizationDate.setSeconds(0)
        scheduledAuthorizationDate.setMilliseconds(0)
      }

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
          scheduled_authorization_date: scheduledAuthorizationDate ? scheduledAuthorizationDate.toISOString() : null,
          scheduled_payment_date: null,  // Not used anymore, authorization will handle charging
          created_by: user_id
        })
        .select()
        .single()

      if (paymentError) {
        console.error('Error creating payment:', paymentError)
        // Don't fail the whole request, just log the error
      } else {
        paymentId = payment.id
        logger.debug('✅ Payment created:', payment.id)
        
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
          logger.debug('✅ Payment items created:', paymentItems.length)
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

