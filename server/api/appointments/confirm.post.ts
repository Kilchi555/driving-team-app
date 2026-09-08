// server/api/appointments/confirm.post.ts
// Confirm an appointment

import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

interface ConfirmAppointmentRequest {
  appointmentId: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<ConfirmAppointmentRequest>(event)
    
    if (!body.appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'appointmentId is required'
      })
    }
    
    // LAYER 1: AUTHENTICATE USER
    const authenticatedUser = await getAuthenticatedUser(event)
    if (!authenticatedUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const supabase = getSupabaseAdmin()

    // LAYER 2: GET AUTHENTICATED USER FROM USERS TABLE
    const { data: requestingUser, error: userLookupError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authenticatedUser.id)
      .single()

    if (userLookupError || !requestingUser) {
      console.error('❌ User not found in users table:', userLookupError)
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // LAYER 3: LOAD APPOINTMENT
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

    // LAYER 4: AUTHORIZATION CHECK
    // Customer can only confirm their own appointment
    if (appointment.user_id !== requestingUser.id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Not authorized to confirm this appointment'
      })
    }
    
    console.log('📝 Confirming appointment:', body.appointmentId)
    
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', body.appointmentId)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error confirming appointment:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to confirm appointment: ${error.message}`
      })
    }
    
    console.log('✅ Appointment confirmed:', data.id)

    try {
      const { reportBindingAppointmentConversionSafely, hashCustomerIdentifiers } = await import(
        '~/server/utils/binding-booking-conversion'
      )
      const hashed = await hashCustomerIdentifiers({ email: (appointment as any).email, phone: (appointment as any).phone })
      const { data: student } = await supabase
        .from('users')
        .select('email, phone')
        .eq('id', appointment.user_id)
        .maybeSingle()
      const studentHash = student
        ? await hashCustomerIdentifiers({ email: student.email, phone: student.phone })
        : hashed
      await reportBindingAppointmentConversionSafely({
        supabase,
        appointmentId: data.id,
        userId: appointment.user_id,
        tenantId: appointment.tenant_id,
        status: 'confirmed',
        previousStatus: appointment.status,
        eventTypeCode: appointment.event_type_code,
        categoryCode: appointment.type,
        gclid: appointment.gclid,
        gbraid: appointment.gbraid,
        wbraid: appointment.wbraid,
        fbclid: appointment.fbclid,
        fbc: appointment.fbc,
        fbp: appointment.fbp,
        conversionValueChf: (appointment.original_price_rappen || 0) / 100,
        hashedEmail: studentHash.hashedEmail,
        hashedPhone: studentHash.hashedPhone,
      })
    } catch (convErr: any) {
      console.warn('⚠️ Binding booking conversion failed (non-critical):', convErr?.message ?? convErr)
    }
    
    return {
      success: true,
      appointment: data
    }
  } catch (error: any) {
    console.error('❌ Confirm appointment error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message
    })
  }
})

