// server/api/onboarding/terms.get.ts
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logger } from '~/utils/logger'
import { logAudit } from '~/server/utils/audit'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  let token: string | undefined
  let tenantId: string | undefined
  
  try {
    token = getQuery(event).token as string | undefined

    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token ist erforderlich'
      })
    }

    // ============ LAYER 1: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      `onboarding_terms:${token}`,
      20, // 20 requests per hour per token
      3600 * 1000
    )
    if (!rateLimitResult.allowed) {
      logger.warn('❌ Rate limit exceeded for terms:', token.substring(0, 8))
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
      .select('id, tenant_id, onboarding_token_expires, onboarding_status')
      .eq('onboarding_token', token)
      .single()

    if (userError || !user) {
      logger.warn('❌ Invalid token for terms:', token.substring(0, 8))
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

    tenantId = user.tenant_id

    // Try tenant-specific policies table first
    let terms: string | null = null
    if (tenantId) {
      const { data } = await supabase
        .from('policies')
        .select('content')
        .eq('tenant_id', tenantId)
        .eq('type', 'terms')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      terms = (data as any)?.content || null
      logger.debug('✅ Loaded tenant terms:', terms ? 'found' : 'not found')
    }

    // Fallback to default terms
    if (!terms) {
      const { data } = await supabase
        .from('policies')
        .select('content')
        .is('tenant_id', null)
        .eq('type', 'terms')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      terms = (data as any)?.content || null
    }

    // Last fallback placeholder
    if (!terms) {
      terms = 'Bitte bestätige die Allgemeinen Geschäftsbedingungen deiner Fahrschule.'
    }

    // ============ LAYER 4: AUDIT LOGGING ============
    await logAudit({
      action: 'onboarding_terms_loaded',
      user_id: user.id,
      tenant_id: tenantId,
      resource_type: 'terms',
      status: 'success',
      details: {
        token_prefix: token.substring(0, 8),
        terms_length: terms.length,
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    return { terms }
  } catch (error: any) {
    logger.error('❌ Error loading terms:', error.message)
    
    // Audit log for failed request
    await logAudit({
      action: 'onboarding_terms_loaded',
      tenant_id: tenantId,
      resource_type: 'terms',
      status: 'failed',
      error_message: error.statusMessage || error.message,
      details: {
        token_prefix: token ? token.substring(0, 8) : 'N/A',
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))
    
    // Return error with proper status code
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Fehler beim Laden der AGB'
    })
  }
})


