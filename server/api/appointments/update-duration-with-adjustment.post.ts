// server/api/appointments/update-duration-with-adjustment.post.ts
// Update appointment duration and automatically handle price adjustments

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { applyPriceAdjustment, type AdjustmentParams } from '~/server/utils/appointment-price-adjustment'
import { sendAdjustmentNotificationEmail } from '~/server/utils/send-adjustment-notification'

interface UpdateDurationRequest {
  appointmentId: string
  newDurationMinutes: number
  reason?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<UpdateDurationRequest>(event)
    const { appointmentId, newDurationMinutes, reason } = body

    // Validation
    if (!appointmentId || !newDurationMinutes) {
      throw createError({
        statusCode: 400,
        statusMessage: 'appointmentId and newDurationMinutes are required'
      })
    }

    if (newDurationMinutes <= 0 || newDurationMinutes > 600) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid duration: must be between 1 and 600 minutes'
      })
    }

    const supabase = getSupabaseAdmin()

    // Get current user (staff making the change)
    const authHeader = event.node.req.headers.authorization
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Extract user ID from auth header or session
    // For now, we'll need to get it from the appointment's staff_id or pass it in the body
    // TODO: Implement proper auth check

    logger.debug('AppointmentUpdate', 'Updating appointment duration:', {
      appointmentId,
      newDurationMinutes
    })

    // 1. Load appointment to check if it was already paid
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, user_id, staff_id, duration_minutes, status, lesson_price_rappen, original_price_rappen')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    const oldDuration = appointment.duration_minutes

    // Check if duration actually changed
    if (oldDuration === newDurationMinutes) {
      return {
        success: true,
        message: 'Duration unchanged',
        adjustment: null
      }
    }

    logger.debug('AppointmentUpdate', 'Current appointment:', {
      duration: oldDuration,
      status: appointment.status,
      hasOriginalPrice: !!appointment.original_price_rappen
    })

    // 2. Check if appointment was already paid (has original_price_rappen or completed/confirmed status)
    const wasPaid = !!appointment.original_price_rappen || 
                    appointment.status === 'completed' || 
                    appointment.status === 'confirmed'

    let adjustmentResult = null

    if (wasPaid) {
      logger.debug('AppointmentUpdate', 'Appointment was paid - applying price adjustment')
      
      // Apply price adjustment (updates credits automatically)
      adjustmentResult = await applyPriceAdjustment({
        appointmentId,
        newDurationMinutes,
        adjustedBy: appointment.staff_id, // Use staff_id from appointment
        reason
      })

      if (adjustmentResult.error) {
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to apply price adjustment: ${adjustmentResult.error}`
        })
      }

      logger.debug('AppointmentUpdate', 'Price adjustment applied:', adjustmentResult)
    } else {
      logger.debug('AppointmentUpdate', 'Appointment not yet paid - no price adjustment needed')
    }

    // 3. Update appointment duration
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        duration_minutes: newDurationMinutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (updateError) {
      logger.error('AppointmentUpdate', 'Failed to update appointment:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update appointment duration'
      })
    }

    logger.debug('AppointmentUpdate', 'Appointment duration updated successfully')

    // 4. If adjustment was applied, send notification email
    if (adjustmentResult && adjustmentResult.appliedToCredits) {
      try {
        await sendAdjustmentNotificationEmail({
          userId: appointment.user_id,
          appointmentId,
          adjustment: adjustmentResult,
          oldDuration,
          newDuration: newDurationMinutes
        })
        logger.debug('AppointmentUpdate', 'Notification email sent successfully')
      } catch (emailError) {
        // Don't fail the whole operation if email fails
        logger.error('AppointmentUpdate', 'Failed to send notification email:', emailError)
      }
    }

    return {
      success: true,
      message: 'Appointment duration updated successfully',
      oldDuration,
      newDuration: newDurationMinutes,
      adjustment: wasPaid ? {
        type: adjustmentResult?.adjustmentType,
        amount: adjustmentResult?.adjustmentAmount,
        oldPrice: adjustmentResult?.oldPrice,
        newPrice: adjustmentResult?.newPrice,
        appliedToCredits: adjustmentResult?.appliedToCredits
      } : null
    }
  } catch (error: any) {
    logger.error('AppointmentUpdate', 'Error updating appointment duration:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})

