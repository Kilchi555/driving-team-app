// server/api/booking/submit-proposal.post.ts
// Submit a booking proposal when no slots are available

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      tenant_id,
      category_code,
      duration_minutes,
      location_id,
      staff_id,
      preferred_time_slots, // Array of { day_of_week: 0-6, start_time: "HH:MM", end_time: "HH:MM" }
      first_name,
      last_name,
      email,
      phone,
      notes
    } = body

    // Validate required fields
    if (!tenant_id || !category_code || !duration_minutes || !location_id || !staff_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: tenant_id, category_code, duration_minutes, location_id, staff_id'
      })
    }

    if (!Array.isArray(preferred_time_slots) || preferred_time_slots.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least one preferred time slot is required'
      })
    }

    // Validate time slots format
    const validTimeSlots = preferred_time_slots.every((slot: any) => {
      return (
        typeof slot.day_of_week === 'number' &&
        slot.day_of_week >= 0 &&
        slot.day_of_week <= 6 &&
        typeof slot.start_time === 'string' &&
        typeof slot.end_time === 'string' &&
        /^\d{2}:\d{2}$/.test(slot.start_time) &&
        /^\d{2}:\d{2}$/.test(slot.end_time)
      )
    })

    if (!validTimeSlots) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid time slot format. Expected { day_of_week: 0-6, start_time: "HH:MM", end_time: "HH:MM" }'
      })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Create the proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('booking_proposals')
      .insert({
        tenant_id,
        category_code,
        duration_minutes,
        location_id,
        staff_id,
        preferred_time_slots,
        first_name,
        last_name,
        email,
        phone,
        notes,
        status: 'pending'
      })
      .select()
      .single()

    if (proposalError) {
      console.error('❌ Error creating proposal:', proposalError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create booking proposal'
      })
    }

    console.log('✅ Booking proposal created:', proposal.id)

    // TODO: Send email to tenant + staff notifying them of the new proposal
    // TODO: Send confirmation email to customer

    return {
      success: true,
      proposal_id: proposal.id,
      message: 'Booking proposal submitted successfully. You will be contacted soon.'
    }

  } catch (err: any) {
    console.error('❌ Error in submit-proposal:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to submit proposal'
    })
  }
})
