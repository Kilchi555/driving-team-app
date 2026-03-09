// server/api/booking/submit-general-inquiry.post.ts
// Submit a general inquiry or specific lesson request
// - General inquiry: only contact info + message (category_code, location_id, duration_minutes are NULL)
// - Specific request: contact info + message + category + location + duration (but NO time slots)

import { defineEventHandler, readBody, createError, getRequestHeader, getRequestIP } from 'h3'
import { createClient } from '@supabase/supabase-js'

// Simple in-memory rate limiter: max 3 submissions per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

function checkRateLimit(ip: string): void {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_MAX) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again in a few minutes.'
      })
    }
    entry.count++
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  }

  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now >= val.resetAt) rateLimitMap.delete(key)
    }
  }
}

export default defineEventHandler(async (event) => {
  try {
    // Rate limiting by IP
    const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
    checkRateLimit(ip)

    const body = await readBody(event)
    const {
      tenant_id,
      category_code,
      duration_minutes,
      location_id,
      staff_id,
      first_name,
      last_name,
      email,
      phone,
      notes,
      created_by_user_id,
      preferred_time_slots = [] // Empty for general inquiries
    } = body

    // Validate required fields
    if (!tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tenant_id is required'
      })
    }

    // Validate customer contact information
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !phone?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required customer information: first_name, last_name, email, phone'
      })
    }

    // String length limits to prevent abuse
    if (first_name.trim().length > 100) throw createError({ statusCode: 400, statusMessage: 'First name too long (max 100 chars)' })
    if (last_name.trim().length > 100) throw createError({ statusCode: 400, statusMessage: 'Last name too long (max 100 chars)' })
    if (email.trim().length > 254) throw createError({ statusCode: 400, statusMessage: 'Email too long (max 254 chars)' })
    if (phone.trim().length > 30) throw createError({ statusCode: 400, statusMessage: 'Phone too long (max 30 chars)' })
    if (notes && notes.trim().length > 1000) throw createError({ statusCode: 400, statusMessage: 'Message too long (max 1000 chars)' })

    // Validate email format
    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/
    if (!emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email address format'
      })
    }

    // Validate phone format (Swiss format: +41 XX XXX XX XX or 0XX XXX XX XX)
    const phoneRegex = /^(?:\+41|0)\d{2}(?:\d{3})\d{2}(?:\d{2})$/
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid phone number format (e.g. +41 79 123 45 67 or 079 123 45 67)'
      })
    }

    if (!notes?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Message (notes) is required'
      })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    )

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

    // 2. If this is a specific request (category_code provided), validate location and category
    if (category_code && location_id) {
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id, name, available_categories, staff_ids')
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
    }

    // 3. Create the inquiry as a booking_proposal
    // For general inquiries: category_code, location_id, duration_minutes, staff_id all NULL
    // For specific requests: all fields filled
    const { data: proposal, error: proposalError } = await supabase
      .from('booking_proposals')
      .insert({
        tenant_id,
        category_code: category_code || null,
        duration_minutes: duration_minutes || null,
        location_id: location_id || null,
        staff_id: staff_id || null,
        preferred_time_slots: preferred_time_slots.length > 0 ? preferred_time_slots : [],
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        created_by_user_id: created_by_user_id || null,
        status: 'pending'
      })
      .select()
      .single()

    if (proposalError) {
      console.error('❌ Error creating inquiry:', proposalError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create inquiry'
      })
    }

    console.log('✅ General inquiry created:', proposal.id)

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
            'X-Internal-Api-Secret': internalApiSecret
          },
          body: JSON.stringify({
            proposalId: proposal.id,
            tenant_id: tenant_id
          })
        })
        console.log('✅ Inquiry emails sent')
      }
    } catch (emailErr: any) {
      console.warn('⚠️ Failed to send inquiry emails:', emailErr.message)
      // Don't fail the inquiry creation if email fails
    }

    return {
      success: true,
      proposal_id: proposal.id,
      message: category_code
        ? 'Fahrstundenanfrage eingereicht. Wir melden uns bald bei dir.'
        : 'Danke für deine Anfrage. Wir melden uns in Kürze.'
    }
  } catch (err: any) {
    console.error('❌ Error in submit-general-inquiry:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to submit inquiry'
    })
  }
})
