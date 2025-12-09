// server/api/appointments/resend-confirmation.post.ts
// Resets failed payment and sends confirmation email again

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId } = body

    if (!appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'appointmentId is required'
      })
    }

    const supabase = getSupabaseAdmin()

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        users:user_id (
          email,
          first_name,
          last_name
        ),
        staff:staff_id (
          first_name,
          last_name
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    // Generate new confirmation token if needed
    const confirmationToken = appointment.confirmation_token || crypto.randomUUID()
    
    if (!appointment.confirmation_token) {
      // Update appointment with new token
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          confirmation_token: confirmationToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)

      if (updateError) throw updateError
    }

    // TODO: Send confirmation email
    // For now, just return success - email can be sent manually
    logger.debug('✅ Appointment reset, confirmation email should be sent to:', appointment.users?.email)
    logger.debug('📧 Confirmation link:', `/confirm/${confirmationToken}`)

    return {
      success: true,
      confirmationToken,
      confirmationLink: `/confirm/${confirmationToken}`,
      message: 'Appointment reset successfully. Confirmation email should be sent manually.'
    }

  } catch (error: any) {
    console.error('❌ Error resending confirmation:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to resend confirmation'
    })
  }
})

