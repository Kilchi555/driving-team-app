// server/api/onboarding/reglements.get.ts
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { type, tenantId, token } = query as Record<string, string>

    // ✅ LAYER 1: Input Validation
    if (!type || !tenantId || !token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters: type, tenantId, token'
      })
    }

    // Validate type and normalize it
    const typeMapping: Record<string, string> = {
      'nutzungsbedingungen': 'nutzungsbedingungen',
      'agb': 'nutzungsbedingungen', // Map 'agb' to 'nutzungsbedingungen'
      'datenschutzerklaerung': 'datenschutzerklaerung',
      'datenschutz': 'datenschutzerklaerung' // Map 'datenschutz' to 'datenschutzerklaerung'
    }
    
    const normalizedType = typeMapping[type]
    if (!normalizedType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid reglement type'
      })
    }

    // ✅ LAYER 2: Rate Limiting (20 requests per hour per token)
    const rateLimitKey = `onboarding_reglements:${token}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 3600 * 1000)
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again later.'
      })
    }

    // ✅ LAYER 3: Token Validation - get user and verify they belong to this tenant
    const supabaseAdmin = getSupabaseAdmin()
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, onboarding_status, onboarding_token_expires')
      .eq('onboarding_token', token)
      .eq('onboarding_status', 'pending')
      .single()

    if (userError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired onboarding token'
      })
    }

    // ✅ LAYER 4: Token Expiration Check
    const expiresAt = new Date(user.onboarding_token_expires)
    if (expiresAt < new Date()) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Onboarding token has expired'
      })
    }

    // ✅ LAYER 5: Tenant Isolation - verify token's tenant matches requested tenant
    if (user.tenant_id !== tenantId) {
      logger.warn('⚠️ Tenant mismatch attempt:', {
        tokenTenant: user.tenant_id,
        requestedTenant: tenantId,
        userId: user.id
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'Tenant mismatch'
      })
    }

    // ✅ LAYER 6: Fetch Regulations
    // Try tenant-specific first, then fall back to global
    const { data: regulations, error } = await supabaseAdmin
      .from('tenant_reglements')
      .select('id, type, title, content, is_active, created_at')
      .eq('type', normalizedType)
      .eq('is_active', true)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('tenant_id', { ascending: false })
      .limit(1)

    if (error) {
      logger.error('❌ Error fetching regulations:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch regulations'
      })
    }

    if (!regulations || regulations.length === 0) {
      logger.warn('⚠️ No regulations found for:', { type, tenantId })
      throw createError({
        statusCode: 404,
        statusMessage: 'Regulations not found'
      })
    }

    // ✅ LAYER 7: Audit Logging
    logger.debug('✅ Reglement fetched successfully:', {
      userId: user.id,
      tenantId: tenantId,
      requestedType: type,
      normalizedType: normalizedType,
      regulationId: regulations[0].id
    })

    return {
      success: true,
      data: regulations[0]
    }
  } catch (error: any) {
    logger.error('❌ Onboarding reglements API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch regulations'
    })
  }
})

