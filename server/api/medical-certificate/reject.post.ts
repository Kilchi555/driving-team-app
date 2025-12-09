// server/api/medical-certificate/reject.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId, notes } = body

    if (!appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'appointmentId is required'
      })
    }

    if (!notes || notes.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Rejection reason (notes) is required'
      })
    }

    // Get current user (admin)
    const currentUser = event.context.user
    if (!currentUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const supabase = getSupabaseAdmin()
    const now = new Date()

    logger.debug('❌ Rejecting medical certificate for appointment:', appointmentId)

    // Get appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    if (appointment.medical_certificate_status !== 'uploaded') {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid status: ${appointment.medical_certificate_status}. Must be 'uploaded'.`
      })
    }

    // Update appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        medical_certificate_status: 'rejected',
        medical_certificate_reviewed_by: currentUser.id,
        medical_certificate_reviewed_at: toLocalTimeString(now),
        medical_certificate_notes: notes
        // Keep original cancellation_charge_percentage (e.g. 100%)
      })
      .eq('id', appointmentId)

    if (updateError) {
      console.error('❌ Error updating appointment:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update appointment: ${updateError.message}`
      })
    }

    logger.debug('✅ Medical certificate rejected')

    // TODO: Send notification to customer
    // await sendEmailNotification({
    //   to: customer.email,
    //   subject: 'Arztzeugnis abgelehnt',
    //   template: 'medical_certificate_rejected',
    //   data: {
    //     customerName: customer.first_name,
    //     appointmentDate: appointment.start_time,
    //     rejectionReason: notes
    //   }
    // })

    return {
      success: true,
      message: 'Arztzeugnis abgelehnt',
      notes
    }

  } catch (error: any) {
    console.error('❌ Medical certificate rejection error:', error)
    throw error
  }
})

