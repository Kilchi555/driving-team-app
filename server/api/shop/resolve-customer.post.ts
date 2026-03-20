// server/api/shop/resolve-customer.post.ts
// Resolves or creates a guest customer based on tenant + email
// Core logic: find existing user (login or guest) or create new guest
// No authentication required — supports guest checkout

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sanitizeString, validateEmail } from '~/server/utils/validators'
import { logger } from '~/utils/logger'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body || typeof body !== 'object') {
      throw createError({ statusCode: 400, message: 'Invalid request body' })
    }

    const { tenant_id: tenantId, email } = body

    // Validate inputs
    if (!tenantId || !email) {
      throw createError({ statusCode: 400, message: 'Missing tenant_id or email' })
    }

    if (!validateEmail(email).valid) {
      throw createError({ statusCode: 400, message: 'Invalid email format' })
    }

    const normalizedEmail = sanitizeString(email, 255).toLowerCase().trim()
    const sanitizedTenantId = sanitizeString(tenantId, 64)

    const supabase = getSupabaseAdmin()

    // Check if tenant exists and is active
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, is_active')
      .eq('id', sanitizedTenantId)
      .maybeSingle()

    if (tenantError || !tenant || tenant.is_active === false) {
      throw createError({ statusCode: 400, message: 'Invalid or inactive tenant' })
    }

    // Look up existing user by tenant + email
    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('id, auth_user_id, first_name, last_name, phone, street, street_nr, zip, city')
      .eq('tenant_id', sanitizedTenantId)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (lookupError && lookupError.code !== 'PGRST116') {
      logger.error('❌ User lookup failed:', lookupError)
      throw createError({ statusCode: 500, message: 'Database error during lookup' })
    }

    // User exists
    if (existingUser) {
      const userType = existingUser.auth_user_id ? 'login' : 'guest'
      logger.debug(`✅ Existing user found: ${userType} (${existingUser.id})`)

      return {
        customer: {
          id: existingUser.id,
          type: userType,
          isNew: false,
          email: normalizedEmail,
          firstName: existingUser.first_name || '',
          lastName: existingUser.last_name || '',
          phone: existingUser.phone || '',
          street: existingUser.street || '',
          streetNumber: existingUser.street_nr || '',
          zip: existingUser.zip || '',
          city: existingUser.city || ''
        },
        metadata: {
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }

    // Create new guest user
    const userId = crypto.randomUUID()
    const magicLinkToken = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        auth_user_id: null,
        tenant_id: sanitizedTenantId,
        email: normalizedEmail,
        first_name: '',
        last_name: '',
        phone: '',
        street: null,
        street_nr: null,
        zip: null,
        city: null,
        role: 'client',
        is_active: false,
        onboarding_status: 'pending',
        onboarding_token: magicLinkToken,
        onboarding_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })

    if (insertError) {
      // Handle race condition: another request created the same user
      if (insertError.code === '23505') {
        logger.debug('ℹ️ User already created by concurrent request, retrying lookup...')
        const { data: retryUser, error: retryError } = await supabase
          .from('users')
          .select('id, auth_user_id, first_name, last_name')
          .eq('tenant_id', sanitizedTenantId)
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (retryError || !retryUser) {
          throw createError({ statusCode: 500, message: 'Failed to resolve concurrent user creation' })
        }

        return {
          customer: {
            id: retryUser.id,
            type: 'guest',
            isNew: false,
            email: normalizedEmail,
            firstName: retryUser.first_name || '',
            lastName: retryUser.last_name || ''
          },
          metadata: {
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        }
      }

      logger.error('❌ Failed to create guest user:', insertError)
      throw createError({ statusCode: 500, message: 'Failed to create guest user' })
    }

    logger.debug(`✅ New guest user created: ${userId}`)

    return {
      customer: {
        id: userId,
        type: 'guest',
        isNew: true,
        email: normalizedEmail,
        firstName: '',
        lastName: '',
        phone: '',
        street: '',
        streetNumber: '',
        zip: '',
        city: ''
      },
      metadata: {
        magicLinkToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ resolve-customer error:', error)
    throw createError({ statusCode: 500, message: 'Internal server error' })
  }
})
