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
      notes,
      created_by_user_id
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

    // Validate customer contact information (required only if NOT created by a logged-in user)
    // If user is logged in, these fields are optional
    const isLoggedInUser = !!created_by_user_id
    
    if (!isLoggedInUser) {
      // For anonymous users, all contact fields are required
      if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !phone?.trim()) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Missing required customer information: first_name, last_name, email, phone'
        })
      }

      // Validate email format
      const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/
      if (!emailRegex.test(email)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid email address format'
        })
      }

      // Validate phone format (Swiss format: +41 XX XXX XX XX or 0XX XXX XX XX)
      const phoneRegex = /^(?:\+41|0)\d{2}(?:\s?\d{3}){2}(?:\s?\d{2})$/
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid phone number format (e.g. +41 79 123 45 67 or 079 123 45 67)'
        })
      }
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || '' // Use ANON key for public endpoint only!
    )

    // ⚠️ TODO: Implement robust rate limiting here to prevent spamming
    // (e.g., based on IP address, email, or a captcha)

    // 1. Validate tenant_id
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found or invalid tenant_id'
      })
    }

    // 2. Validate location_id (exists and belongs to tenant)
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id, name, available_categories, staff_ids') // Also fetch staff_ids for validation
      .eq('id', location_id)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .single()

    if (locationError || !location) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Location not found or invalid for this tenant'
      })
    }

    // Check if location supports the category
    if (!location.available_categories.includes(category_code)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Location does not support category: ${category_code}`
      })
    }

    // 3. Validate staff_id is assigned to this location (via location.staff_ids)
    // We don't need to read the users table - the foreign key constraint will validate the staff exists
    if (!location.staff_ids.includes(staff_id)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Selected staff is not assigned to location: ${location.name}`
      })
    }

    // 4. Validate email and phone formats
    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (email && !emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email address format'
      })
    }

    // Basic phone number validation (e.g., Swiss format +41 XX XXX XX XX or 0XX XXX XX XX)
    // This regex is simplified, consider a more robust library if needed
    const phoneRegex = /^(?:\+41|0)\d{2}(?:\s?\d{3}){2}(?:\s?\d{2})$/;
    if (phone && !phoneRegex.test(phone.replace(/\s/g, ''))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid phone number format (e.g. +41 79 123 45 67 or 079 123 45 67)'
      })
    }

    // Create the proposal using Anon Key (respects RLS policies for the booking_proposals table)
    const { data: proposal, error: proposalError } = await supabase
      .from('booking_proposals')
      .insert({
        tenant_id,
        category_code,
        duration_minutes,
        location_id,
        staff_id,
        preferred_time_slots,
        first_name: first_name?.trim() || null,
        last_name: last_name?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
        created_by_user_id: created_by_user_id || null,
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

    // Send emails to customer and staff
    try {
      const internalApiSecret = process.env.NUXT_INTERNAL_API_SECRET
      if (!internalApiSecret) {
        console.error('❌ NUXT_INTERNAL_API_SECRET is not configured. Skipping email sending.')
      } else {
        await fetch(`${process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/emails/send-booking-proposal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Api-Secret': internalApiSecret // Send internal secret header
          },
          body: JSON.stringify({
            proposalId: proposal.id,
            tenant_id: tenant_id
          })
        })
        console.log('✅ Booking proposal emails sent')
      }
    } catch (emailErr: any) {
      console.warn('⚠️ Failed to send booking proposal emails:', emailErr.message)
      // Don't fail the proposal creation if email fails
    }

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
