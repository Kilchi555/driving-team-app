import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import z from 'zod'

/**
 * Secure API to fetch authenticated user's profile
 * 
 * Security:
 * - ✅ Requires authentication (Bearer token)
 * - ✅ Returns only authenticated user's data
 * - ✅ Tenant isolation (only user's tenant)
 * - ✅ Rate limiting per user
 * - ✅ Audit logging
 */
export default defineEventHandler(async (event) => {
  try {
    // 1. Extract and validate auth token
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('🔒 get-user-profile: Missing or invalid auth header')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.slice(7)

    // 2. Verify token and get user
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      logger.warn('🔒 get-user-profile: Invalid token', { error: authError?.message })
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token'
      })
    }

    // 3. Rate limiting per user (10 requests per minute)
    const cacheKey = `rate:profile:${user.id}`
    const count = await checkRateLimit(event, cacheKey, 10, 60_000)
    if (count === null) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests'
      })
    }

    // 4. Fetch user profile from users table (all needed fields for customer dashboard)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        auth_user_id,
        tenant_id,
        first_name,
        last_name,
        email,
        phone,
        birthdate,
        street,
        street_nr,
        zip,
        city,
        category,
        role,
        preferred_payment_method,
        preferred_duration,
        preferred_location_id,
        assigned_staff_id,
        assigned_staff_ids,
        lernfahrausweis_nr,
        faberid,
        sari_faberid,
        sari_birthdate,
        language,
        onboarding_status,
        created_at
      `)
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) {
      logger.error('🔒 get-user-profile: Error fetching profile', {
        userId: user.id,
        error: profileError.message
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch profile'
      })
    }

    if (!userProfile) {
      logger.warn('🔒 get-user-profile: Profile not found', { userId: user.id })
      throw createError({
        statusCode: 404,
        statusMessage: 'Profile not found'
      })
    }

    // 5. Audit log
    logger.info('✅ get-user-profile: User profile fetched', {
      userId: user.id,
      tenantId: userProfile.tenant_id
    })

    return {
      success: true,
      data: userProfile
    }
  } catch (err: any) {
    logger.error('❌ get-user-profile: Error', {
      statusCode: err.statusCode,
      message: err.message
    })
    throw err
  }
})

/**
 * Simple rate limit check using in-memory storage
 * For production, use Redis or similar
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(event: any, key: string, limit: number, windowMs: number): number | null {
  const now = Date.now()
  const entry = requestCounts.get(key)

  if (!entry || now > entry.resetTime) {
    // New window or expired
    requestCounts.set(key, { count: 1, resetTime: now + windowMs })
    return 1
  }

  entry.count++
  if (entry.count > limit) {
    return null // Rate limit exceeded
  }

  return entry.count
}

