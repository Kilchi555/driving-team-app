// server/api/onboarding/categories.get.ts
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const token = getQuery(event).token as string | undefined

    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token ist erforderlich'
      })
    }

    // ============ LAYER 1: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      `onboarding_categories:${token}`,
      20, // 20 requests per hour per token
      3600 * 1000
    )
    if (!rateLimitResult.allowed) {
      logger.warn('❌ Rate limit exceeded for categories:', token.substring(0, 8))
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
      })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ============ LAYER 2: TOKEN VALIDATION ============
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('tenant_id, onboarding_token_expires, onboarding_status')
      .eq('onboarding_token', token)
      .single()

    if (userError || !user) {
      logger.warn('❌ Invalid token for categories:', token.substring(0, 8))
      throw createError({
        statusCode: 401,
        statusMessage: 'Ungültiger oder abgelaufener Token'
      })
    }

    // ============ LAYER 3: TOKEN EXPIRY CHECK ============
    if (user.onboarding_status !== 'pending') {
      logger.warn('❌ Token already used:', token.substring(0, 8))
      throw createError({
        statusCode: 403,
        statusMessage: 'Dieser Onboarding-Link wurde bereits verwendet'
      })
    }

    const expiresAt = new Date(user.onboarding_token_expires)
    if (expiresAt < new Date()) {
      logger.warn('❌ Token expired:', token.substring(0, 8))
      throw createError({
        statusCode: 403,
        statusMessage: 'Dieser Onboarding-Link ist abgelaufen'
      })
    }

    const tenantId = user.tenant_id

    // Try tenant-specific categories first
    let categories: any[] = []
    if (tenantId) {
      const { data } = await supabase
        .from('categories')
        .select('id, code, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name')
      categories = data || []
      logger.debug('✅ Loaded tenant categories:', categories.length)
    }

    // Fallback to defaults if empty
    if (!categories || categories.length === 0) {
      const { data } = await supabase
        .from('categories')
        .select('id, code, name')
        .is('tenant_id', null)
        .eq('is_active', true)
        .order('name')
      categories = data || []
    }

    // Last fallback hardcoded minimal set
    if (!categories || categories.length === 0) {
      categories = [
        { code: 'B', name: 'B - Auto' },
        { code: 'A1', name: 'A1 - Motorrad 125cc' },
        { code: 'A', name: 'A - Motorrad' },
        { code: 'BE', name: 'BE - Anhänger' }
      ]
    }

    return { categories }
  } catch (error: any) {
    logger.error('❌ Error loading categories:', error.message)
    
    // Return error with proper status code
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Fehler beim Laden der Kategorien'
    })
  }
})


