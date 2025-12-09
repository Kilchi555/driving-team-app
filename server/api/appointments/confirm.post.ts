// server/api/appointments/confirm.post.ts
// Confirm an appointment after successful payment

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

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
    
    const supabase = getSupabaseAdmin()
    
    console.log('📝 Confirming appointment:', body.appointmentId)
    
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'confirmed', // ✅ FIXED: Should be 'confirmed', not 'scheduled'
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

