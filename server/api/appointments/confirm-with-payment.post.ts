// server/api/appointments/confirm-with-payment.post.ts
// Confirm appointment and handle payment settings securely (via API, not direct DB query)

import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

interface ConfirmAppointmentWithPaymentRequest {
  appointmentId: string
}

interface PaymentSettingsType {
  automatic_payment_enabled?: boolean
  automatic_payment_hours_before?: number
  automatic_authorization_hours_before?: number
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<ConfirmAppointmentWithPaymentRequest>(event)

    if (!body.appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'appointmentId is required'
      })
    }

    // ============ LAYER 1: AUTHENTICATE USER ============
    const authenticatedUser = await getAuthenticatedUser(event)
    if (!authenticatedUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const supabase = getSupabaseAdmin()

    // ============ LAYER 2: GET AUTHENTICATED USER FROM USERS TABLE ============
    // Convert Auth UID to public.users.id
    const { data: requestingUser, error: userLookupError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authenticatedUser.id)
      .single()

    if (userLookupError || !requestingUser) {
      console.error('❌ User not found in users table:', userLookupError)
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // ============ LAYER 3: LOAD APPOINTMENT ============
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', body.appointmentId)
      .eq('tenant_id', requestingUser.tenant_id)
      .single()

    if (appointmentError || !appointment) {
      console.error('❌ Appointment not found:', appointmentError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    // ============ LAYER 4: AUTHORIZATION CHECK ============
    // Customer can only confirm their own appointment
    if (appointment.user_id !== requestingUser.id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Not authorized to confirm this appointment'
      })
    }

    // ============ LAYER 5: LOAD PAYMENT SETTINGS ============
    // userData already fetched above as requestingUser, get tenant_id from it
    const userData = requestingUser

    let automaticPaymentEnabled = false
    let automaticPaymentHoursBefore = 24
    let automaticAuthorizationHoursBefore = 120 // max 120h for Wallee

    try {
      const { data: paymentSettings } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', userData.tenant_id)
        .eq('category', 'payment')
        .eq('setting_key', 'payment_settings')
        .maybeSingle()

      if (paymentSettings?.setting_value) {
        const settings: PaymentSettingsType = typeof paymentSettings.setting_value === 'string'
          ? JSON.parse(paymentSettings.setting_value)
          : paymentSettings.setting_value

        automaticPaymentEnabled = !!settings?.automatic_payment_enabled
        automaticPaymentHoursBefore = Number(settings?.automatic_payment_hours_before) || 24
        const authHours = Number(settings?.automatic_authorization_hours_before) || 120
        automaticAuthorizationHoursBefore = Math.min(authHours, 120)

        console.log('✅ Payment settings loaded:', {
          automatic_payment_enabled: automaticPaymentEnabled,
          automatic_payment_hours_before: automaticPaymentHoursBefore,
          automatic_authorization_hours_before: automaticAuthorizationHoursBefore
        })
      }
    } catch (e) {
      console.warn('⚠️ Error loading payment settings:', e)
      // Continue without automatic payment settings
    }

    // ============ LAYER 5: LOAD DEFAULT PAYMENT METHOD ============
    let defaultMethodId: string | null = null
    if (automaticPaymentEnabled) {
      const { data: method } = await supabase
        .from('customer_payment_methods')
        .select('id')
        .eq('user_id', appointment.user_id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      defaultMethodId = method?.id || null

      console.log('💳 Default payment method:', {
        hasMethod: !!defaultMethodId,
        methodId: defaultMethodId
      })
    }

    // ============ LAYER 6: LOAD PAYMENT RECORD ============
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('appointment_id', appointment.id)
      .single()

    if (paymentError || !payment) {
      console.warn('⚠️ No payment found for appointment:', appointment.id)
      // Continue without payment - just confirm appointment
    }

    // ============ LAYER 7: CALCULATE TIMING ============
    const startDate = new Date(appointment.start_time)
    const now = new Date()
    const diffMs = startDate.getTime() - now.getTime()
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))

    const hasToken = automaticPaymentEnabled && !!defaultMethodId
    const shouldProcessImmediately = hasToken && diffHours < automaticPaymentHoursBefore
    const canScheduleAutomatic = hasToken && diffHours >= automaticPaymentHoursBefore

    console.log('🔍 Automatic payment decision:', {
      automaticPaymentEnabled,
      hasToken,
      diffHours,
      automaticPaymentHoursBefore,
      shouldProcessImmediately,
      canScheduleAutomatic
    })

    // ============ LAYER 8: UPDATE PAYMENT IF EXISTS ============
    if (payment && hasToken) {
      // Calculate scheduled dates
      const scheduledPayDate = new Date(startDate.getTime() - automaticPaymentHoursBefore * 60 * 60 * 1000)
      const authDueDate = new Date(startDate.getTime() - automaticAuthorizationHoursBefore * 60 * 60 * 1000)

      // Round to next full hour
      const roundToNextFullHour = (date: Date) => {
        const rounded = new Date(date)
        if (rounded.getMinutes() > 0 || rounded.getSeconds() > 0) {
          rounded.setHours(rounded.getHours() + 1)
        }
        rounded.setMinutes(0)
        rounded.setSeconds(0)
        rounded.setMilliseconds(0)
        return rounded
      }

      const roundedPayDate = roundToNextFullHour(scheduledPayDate)
      const roundedAuthDate = roundToNextFullHour(authDueDate)
      const shouldAuthorizeNow = shouldProcessImmediately || now >= roundedAuthDate

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          automatic_payment_consent: true,
          automatic_payment_consent_at: new Date().toISOString(),
          scheduled_payment_date: shouldProcessImmediately ? null : roundedPayDate.toISOString(),
          scheduled_authorization_date: shouldAuthorizeNow ? new Date().toISOString() : roundedAuthDate.toISOString(),
          payment_method_id: defaultMethodId,
          payment_method: 'wallee',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) {
        console.warn('⚠️ Error updating payment:', updateError)
        // Continue - don't fail the appointment confirmation
      } else {
        console.log('✅ Payment updated with automatic payment settings')
      }
    }

    // ============ LAYER 9: CONFIRM APPOINTMENT ============
    const { data: confirmedAppointment, error: confirmError } = await supabase
      .from('appointments')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', body.appointmentId)
      .select()
      .single()

    if (confirmError) {
      console.error('❌ Error confirming appointment:', confirmError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to confirm appointment: ${confirmError.message}`
      })
    }

    console.log('✅ Appointment confirmed:', body.appointmentId)

    return {
      success: true,
      appointment: confirmedAppointment,
      payment: payment || null,
      automaticPaymentSettings: {
        enabled: automaticPaymentEnabled,
        hasToken,
        shouldProcessImmediately,
        canScheduleAutomatic
      }
    }
  } catch (error: any) {
    console.error('❌ Confirm appointment with payment error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message
    })
  }
})

