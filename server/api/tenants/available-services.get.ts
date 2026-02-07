import { defineEventHandler, getQuery, createError } from 'h3'
import { logger } from '~/utils/logger'

/**
 * GET /api/tenants/available-services?slug=driving-team
 * 
 * Get available services for a tenant (public endpoint, no auth required)
 * Used by service selection page before registration
 */
export default defineEventHandler(async (event) => {
  try {
    const { slug } = getQuery(event)

    if (!slug || typeof slug !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Slug parameter is required'
      })
    }

    logger.debug('🔍 [AVAILABLE-SERVICES] Getting services for slug:', slug)

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Get tenant ID from slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('slug', slug)
      .single()

    if (tenantError || !tenant) {
      logger.warn('⚠️ [AVAILABLE-SERVICES] Tenant not found for slug:', slug)
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found'
      })
    }

    logger.debug('✅ [AVAILABLE-SERVICES] Tenant found:', tenant.name)

    // Get pricing rules for this tenant to determine available services
    const { data: pricingRules, error: pricingError } = await supabase
      .from('pricing_rules')
      .select('rule_type')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)

    if (pricingError) {
      logger.warn('⚠️ [AVAILABLE-SERVICES] Failed to load pricing rules:', pricingError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load pricing rules'
      })
    }

    // Extract unique service types from pricing rules
    const uniqueServiceTypes = [...new Set(pricingRules?.map(r => r.rule_type) || [])]
    logger.debug('🔍 [AVAILABLE-SERVICES] Unique service types:', uniqueServiceTypes)

    // Map rule_types to service identifiers
    const services: string[] = []
    if (uniqueServiceTypes.includes('base_price')) {
      services.push('fahrlektion')
    }
    if (uniqueServiceTypes.includes('theory')) {
      services.push('theorie')
    }
    if (uniqueServiceTypes.includes('consultation')) {
      services.push('beratung')
    }

    logger.debug('✅ [AVAILABLE-SERVICES] Available services:', services)

    return services
  } catch (error: any) {
    logger.error('❌ [AVAILABLE-SERVICES] Error:', error.message || error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get available services'
    })
  }
})
