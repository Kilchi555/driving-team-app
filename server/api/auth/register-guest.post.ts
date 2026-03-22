/**
 * Public API: Register a guest user for shop checkout
 * Creates both auth user and user profile via service role
 * 
 * POST /api/auth/register-guest
 * Body: { email, password, tenantId }
 * Returns: { userId, email }
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      street, 
      streetNumber, 
      zip, 
      city, 
      tenantId 
    } = body

    // Validate required fields
    if (!email || !password || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: email, password, tenantId'
      })
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email format'
      })
    }

    // Validate password length
    if (password.length < 12) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password must be at least 12 characters long'
      })
    }

    // Rate limiting - max 5 registrations per email per hour
    const rateLimitKey = `register_guest_${email.toLowerCase()}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 5, 3600)
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many registration attempts. Please try again later.',
        data: { retryAfter: rateLimitResult.retryAfter * 1000 }
      })
    }

    // Use service role to create auth user and profile
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    logger.debug('👤 Creating auth user for email:', email)
    
    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName || '',
        last_name: lastName || ''
      }
    })

    if (authError) {
      logger.warn('⚠️ Auth user creation error:', { error: authError.message, email })
      
      let userMessage = 'Account creation failed'
      if (authError.message.includes('already registered')) {
        userMessage = 'This email address is already registered. Please login instead.'
      } else if (authError.message.includes('password')) {
        userMessage = 'Password does not meet security requirements'
      }
      
      throw createError({
        statusCode: 400,
        statusMessage: userMessage
      })
    }

    logger.debug('✅ Auth user created:', { id: authData.user.id, email })

    // 2. Create user profile in database with service role
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email: email.toLowerCase(),
        role: 'client',
        first_name: firstName || '',
        last_name: lastName || '',
        phone: phone || '',
        street: street || '',
        street_nr: streetNumber || '',
        zip: zip || '',
        city: city || '',
        tenant_id: tenantId,
        is_active: true,
        onboarding_status: 'completed',
        accepted_terms_at: new Date().toISOString()
      })
      .select('id, email')
      .single()

    if (profileError) {
      logger.error('❌ User profile creation error:', { error: profileError.message, userId: authData.user.id })
      
      // Clean up auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        logger.debug('🧹 Cleaned up orphaned auth user')
      } catch (cleanupErr) {
        logger.warn('⚠️ Could not clean up auth user:', cleanupErr)
      }
      
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to create user profile. Please try again.'
      })
    }

    logger.debug('✅ User profile created successfully:', { id: profileData.id })

    return {
      success: true,
      userId: profileData.id,
      email: profileData.email,
      message: 'Registration successful'
    }

  } catch (error: any) {
    logger.error('❌ Guest registration error:', { 
      message: error.message,
      statusCode: error.statusCode 
    })
    
    // Re-throw if already an HTTP error
    if (error.statusCode) throw error
    
    // Otherwise wrap in 500 error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Registration failed. Please try again.'
    })
  }
})
