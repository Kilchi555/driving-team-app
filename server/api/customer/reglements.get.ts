// server/api/customer/reglements.get.ts
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { type } = query as Record<string, string>

    // ✅ LAYER 1: Input Validation
    if (!type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameter: type'
      })
    }

    // Validate type
    const validTypes = ['nutzungsbedingungen', 'datenschutzerklaerung', 'datenschutz', 'agb', 'haftung', 'rueckerstattung']
    if (!validTypes.includes(type)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid reglement type'
      })
    }

    // ✅ LAYER 2: Authentication Check
    const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    // Verify auth token
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid authentication token'
      })
    }

    // ✅ LAYER 3: Get user profile and tenant
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, is_active')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const tenantId = userProfile.tenant_id

    // ✅ LAYER 4: Rate Limiting (50 requests per hour per user)
    const rateLimitKey = `customer_reglements:${userProfile.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 50, 3600 * 1000)
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again later.'
      })
    }

    // ✅ LAYER 5: Fetch Regulations
    // Try tenant-specific first, then fall back to global
    const { data: regulations, error } = await supabaseAdmin
      .from('tenant_reglements')
      .select('id, type, title, content, additional_content, is_active, updated_at')
      .eq('type', type)
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

    const regulation = regulations[0]

    // ✅ LAYER 6: Load sections if tenant reglement exists
    let sections: any[] = []
    if (regulation.additional_content) {
      const { data: sectionsData } = await supabaseAdmin
        .from('reglement_sections')
        .select('section_title, section_content, display_order')
        .eq('reglement_id', regulation.id)
        .eq('is_active', true)
        .order('display_order')

      sections = sectionsData || []
    }

    // ✅ LAYER 7: Load Tenant Data for Placeholder Replacement
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('name, address, contact_email, contact_phone, website_url')
      .eq('id', tenantId)
      .single()

    // ✅ LAYER 8: Audit Logging
    logger.debug('✅ Reglement fetched successfully:', {
      userId: userProfile.id,
      tenantId: tenantId,
      type: type,
      regulationId: regulation.id
    })

    return {
      success: true,
      data: {
        ...regulation,
        sections: sections
      },
      tenant: {
        name: tenantData?.name || '',
        address: tenantData?.address || '',
        email: tenantData?.contact_email || '',
        phone: tenantData?.contact_phone || '',
        website: tenantData?.website_url || ''
      }
    }
  } catch (error: any) {
    logger.error('❌ Customer reglements API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch regulations'
    })
  }
})

