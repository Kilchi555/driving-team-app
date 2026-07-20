/**
 * GET /api/customer/get-cancellation-reasons
 *
 * Fetch cancellation reasons for the customer's tenant
 * 3-Layer: Auth → Business Logic → DB Query
 *
 * Security: Auth required, tenant isolation, rate limiting
 */

import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW = 60 * 1000

const checkRateLimit = (key: string): boolean => {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT) {
    return false
  }

  entry.count++
  return true
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    const clientIP = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(`cancellation_reasons_${clientIP}`)) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests'
      })
    }

    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const supabase = getSupabaseAdmin()

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const tenantId = userProfile.tenant_id

    const { data: reasons, error: queryError } = await supabase
      .from('cancellation_reasons')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (queryError) {
      logger.error('❌ Error fetching cancellation reasons:', queryError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch cancellation reasons'
      })
    }

    const duration = Date.now() - startTime
    logger.debug(`✅ Cancellation reasons fetched (${duration}ms): ${reasons?.length || 0}`)

    return {
      success: true,
      reasons: reasons || [],
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime

    if (error.statusCode) {
      logger.warn(`⚠️ Cancellation reasons error (${duration}ms):`, error.statusMessage)
      throw error
    }

    logger.error(`❌ Unexpected error (${duration}ms):`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch cancellation reasons'
    })
  }
})
