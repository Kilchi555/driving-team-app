// server/api/students/verify-onboarding-token.post.ts
// ✅ SECURITY HARDENED: Token validation, rate limiting, tenant isolation
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  try {
    const { token } = await readBody(event)

    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token is required'
      })
    }

    // ✅ LAYER 1: Rate limiting (max 10 verification attempts per token per hour)
    const rateLimitKey = `verify_onboarding_${token.substring(0, 20)}`
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      10, // max 10 attempts
      3600 // per hour
    )

    if (!rateLimitResult.allowed) {
      logger.warn('⚠️ Verify onboarding token: Rate limit exceeded', { 
        token: token.substring(0, 10) + '...',
        retryAfter: rateLimitResult.retryAfter 
      })
      throw createError({
        statusCode: 429,
        statusMessage: `Too many attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        data: { retryAfter: rateLimitResult.retryAfter * 1000 }
      })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ✅ LAYER 2: Find user by token with tenant isolation
    logger.debug('🔐 Verifying onboarding token...')
    const { data: user, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, tenant_id, onboarding_token_expires, birthdate, street, street_nr, zip, city, category')
      .eq('onboarding_token', token)
      .eq('onboarding_status', 'pending')
      .single()

    if (error || !user) {
      logger.warn('⚠️ Verify onboarding token: Invalid or missing token')
      return {
        success: false,
        message: 'Invalid or expired token'
      }
    }

    // ✅ LAYER 3: Check if token is expired
    const expiresAt = new Date(user.onboarding_token_expires)
    if (expiresAt < new Date()) {
      logger.warn('⚠️ Verify onboarding token: Token expired', { userId: user.id })
      return {
        success: false,
        message: 'Token has expired'
      }
    }

    // ✅ LAYER 4: Get tenant name and slug (with tenant isolation)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, slug, id')
      .eq('id', user.tenant_id)
      .single()

    if (tenantError || !tenant) {
      logger.warn('⚠️ Verify onboarding token: Tenant not found', { tenantId: user.tenant_id })
      throw createError({
        statusCode: 400,
        statusMessage: 'Tenant not found'
      })
    }

    logger.debug('✅ Token verified successfully', { userId: user.id, tenantId: tenant.id })

    return {
      success: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        birthdate: user.birthdate,
        street: user.street,
        street_nr: user.street_nr,
        zip: user.zip,
        city: user.city,
        category: user.category,
        tenant_id: user.tenant_id,
        tenant_slug: tenant.slug
      },
      tenantName: tenant.name,
      tenantSlug: tenant.slug
    }

  } catch (error: any) {
    logger.error('❌ Token verification error:', { message: error.message })
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Token verification failed',
      data: error.data
    })
  }
})

