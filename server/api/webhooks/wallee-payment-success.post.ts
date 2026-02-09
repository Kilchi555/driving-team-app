/**
 * Wallee Webhook: Payment Success Handler
 * 
 * PURPOSE:
 * When a payment succeeds, create the actual appointment and link it to the reserved slots.
 * 
 * TRIGGERED BY:
 * - Wallee webhook when payment_state = COMPLETED
 * - We look for reserved slots with matching metadata
 * - Create appointment and mark slots as booked
 * 
 * USAGE:
 * POST /api/webhooks/wallee-payment-success
 * (Called by Wallee, not by frontend)
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { toLocalTimeString } from '~/utils/dateUtils'
import { logAudit } from '~/server/utils/audit'

interface WalleePaymentSuccessRequest {
  paymentId: string
  slotId: string
  sessionId: string
  userId: string
  tenantId: string
  appointmentType: string
  notes?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as WalleePaymentSuccessRequest
    const { paymentId, slotId, sessionId, userId, tenantId, appointmentType, notes } = body

    logger.debug('💳 Wallee Payment Success Webhook called', {
      paymentId,
      slotId,
      userId,
      tenantId
    })

    if (!paymentId || !slotId || !userId || !tenantId || !appointmentType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()
    const nowLocal = toLocalTimeString(new Date())

    // ============ STEP 1: Get the reserved slot ============
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('id', slotId)
      .eq('reserved_by_session', sessionId)
      .single()

    if (slotError || !slot) {
      logger.warn('⚠️ Slot not found or not reserved by this session:', { slotId, sessionId })
      throw createError({
        statusCode: 404,
        statusMessage: 'Slot not found or reservation expired'
      })
    }

    // ============ STEP 2: Create the appointment ============
    const appointmentData = {
      tenant_id: tenantId,
      user_id: userId,
      staff_id: slot.staff_id,
      location_id: slot.location_id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      duration_minutes: slot.duration_minutes,
      status: 'booked',
      type: appointmentType,
      notes: notes || null,
      created_at: nowLocal,
      updated_at: nowLocal
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select('*')
      .single()

    if (appointmentError) {
      logger.error('❌ Error creating appointment after payment:', appointmentError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create appointment'
      })
    }

    logger.debug('✅ Appointment created after payment:', appointment.id)

    // ============ STEP 3: Update all reserved slots - link to appointment ============
    const slotEnd = new Date(slot.end_time)
    
    // Find all slots reserved by this session (overlapping)
    const { data: overlappingSlots, error: overlapError } = await supabase
      .from('availability_slots')
      .select('id')
      .eq('reserved_by_session', sessionId)
      .eq('tenant_id', tenantId)
      .eq('staff_id', slot.staff_id)
      .eq('location_id', slot.location_id)
      .lt('start_time', slotEnd.toISOString())
      .gt('end_time', slot.start_time)

    if (overlapError) {
      logger.error('❌ Error querying overlapping slots:', overlapError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update slots'
      })
    }

    const slotIdsToUpdate = overlappingSlots ? overlappingSlots.map(s => s.id) : [slotId]

    logger.debug(`📌 Updating ${slotIdsToUpdate.length} slots with appointment_id`, {
      appointment_id: appointment.id,
      slot_count: slotIdsToUpdate.length
    })

    // Mark all overlapping slots with appointment_id, clear reservation
    const { error: updateError } = await supabase
      .from('availability_slots')
      .update({
        appointment_id: appointment.id,
        reserved_by_session: null,
        reserved_until: null,
        updated_at: now
      })
      .in('id', slotIdsToUpdate)

    if (updateError) {
      logger.error('❌ Error updating slots with appointment:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to link slots to appointment'
      })
    }

    logger.debug(`✅ Updated ${slotIdsToUpdate.length} slots with appointment_id`)

    // ============ STEP 4: Audit logging ============
    await logAudit({
      user_id: userId,
      tenant_id: tenantId,
      action: 'appointment_created_after_payment',
      resource_type: 'appointment',
      resource_id: appointment.id,
      status: 'success',
      details: {
        payment_id: paymentId,
        slot_id: slotId,
        session_id: sessionId,
        slot_count_updated: slotIdsToUpdate.length,
        start_time: appointment.start_time,
        end_time: appointment.end_time
      }
    })

    return {
      success: true,
      appointment_id: appointment.id,
      slots_updated: slotIdsToUpdate.length,
      message: 'Appointment created and slots linked successfully'
    }

  } catch (error: any) {
    logger.error('❌ Wallee payment success webhook error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process payment success'
    })
  }
})
