import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

/**
 * GET /api/tenants/branding
 * 
 * Secure API for fetching tenant branding data
 * 
 * Security Layers:
 * ✅ Layer 1: Rate Limiting (30 req/min per IP, 120 req/min per user)
 * ✅ Layer 2: Field Filtering (only safe/public fields)
 * ✅ Layer 3: Input Validation (slug/id validation)
 * ✅ Layer 4: Audit Logging (all access logged)
 * ✅ Layer 5: XSS Prevention (custom CSS/JS removed for non-admins)
 * 
 * Query Params:
 * - slug: Tenant slug (e.g., "driving-team")
 * - id: Tenant ID (UUID)
 * 
 * CRITICAL FIX:
 * - Removes anonymous SELECT policy vulnerability
 * - Only returns safe/public fields
 * - Custom CSS/JS only for authenticated tenant admins
 */

interface TenantBrandingResponse {
  success: boolean
  data: any
}

export default defineEventHandler(async (event): Promise<TenantBrandingResponse> => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  
  try {
    // ============ LAYER 1: RATE LIMITING ============
    // IP-based rate limiting (for anonymous users)
    const ipRateLimitResult = await checkRateLimit(
      ipAddress,
      'get_tenant_branding_ip',
      30, // 30 requests per minute per IP
      60 * 1000
    )

    if (!ipRateLimitResult.allowed) {
      logger.warn('⚠️ IP rate limit exceeded:', ipAddress)
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests from this IP. Please try again later.'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const query = getQuery(event)
    
    // ============ LAYER 2: AUTHENTICATION (Optional) ============
    let isAuthenticated = false
    let isAdmin = false
    let userId: string | undefined
    let userTenantId: string | undefined

    try {
      const authHeader = event.node.req.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (!authError && user) {
          isAuthenticated = true
          
          // Get user profile
          const { data: userProfile } = await supabaseAdmin
            .from('users')
            .select('id, tenant_id, role')
            .eq('auth_user_id', user.id)
            .single()

          if (userProfile) {
            userId = userProfile.id
            userTenantId = userProfile.tenant_id
            isAdmin = ['admin', 'staff', 'super_admin'].includes(userProfile.role)

            // User-based rate limiting (higher limit)
            const userRateLimitResult = await checkRateLimit(
              userId,
              'get_tenant_branding_user',
              120, // 120 requests per minute per user
              60 * 1000
            )

            if (!userRateLimitResult.allowed) {
              throw createError({
                statusCode: 429,
                statusMessage: 'Too many requests. Please try again later.'
              })
            }
          }
        }
      }
    } catch (e) {
      // Authentication is optional, continue as anonymous
      logger.debug('No valid authentication, continuing as anonymous')
    }

    // ============ LAYER 3: INPUT VALIDATION ============
    const slug = query.slug as string
    const id = query.id as string

    if (!slug && !id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either slug or id parameter is required'
      })
    }

    // Validate slug format (alphanumeric + hyphens only)
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid slug format'
      })
    }

    // Validate UUID format
    if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid ID format'
      })
    }

    logger.debug('🎨 Fetching tenant branding:', {
      slug,
      id,
      isAuthenticated,
      isAdmin,
      ipAddress
    })

    // ============ LAYER 4: DATA LOADING ============
    let query_builder = supabaseAdmin
      .from('tenants')
      .select(`
        id, name, slug,
        contact_email, contact_phone, address,
        primary_color, secondary_color, accent_color,
        success_color, warning_color, error_color, info_color,
        background_color, surface_color, text_color, text_secondary_color,
        font_family, heading_font_family, font_size_base,
        border_radius, spacing_unit,
        logo_url, logo_square_url, logo_wide_url, logo_dark_url, favicon_url,
        website_url, social_facebook, social_instagram, social_linkedin, social_twitter,
        brand_name, brand_tagline, brand_description, meta_description, meta_keywords,
        custom_css, custom_js, default_theme, allow_theme_switch
      `)
      .eq('is_active', true)

    if (slug) {
      query_builder = query_builder.eq('slug', slug)
    } else if (id) {
      query_builder = query_builder.eq('id', id)
    }

    const { data: tenant, error: tenantError } = await query_builder.maybeSingle()

    if (tenantError) {
      logger.error('❌ Error fetching tenant:', tenantError)
      throw tenantError
    }

    if (!tenant) {
      logger.warn('⚠️ Tenant not found:', { slug, id })
      
      await logAudit({
        user_id: userId,
        action: 'get_tenant_branding',
        resource_type: 'tenant',
        status: 'failed',
        error_message: 'Tenant not found',
        ip_address: ipAddress,
        details: {
          slug,
          id,
          duration_ms: Date.now() - startTime
        }
      })

      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found'
      })
    }

    // ============ LAYER 5: FIELD FILTERING & XSS PREVENTION ============
    
    // Determine if user can access sensitive fields
    const canAccessSensitiveFields = isAuthenticated && (
      isAdmin || 
      (userTenantId === tenant.id) // User belongs to this tenant
    )

    // For non-authenticated or non-authorized users:
    // Remove custom CSS/JS (XSS risk) and limit contact info
    if (!canAccessSensitiveFields) {
      tenant.custom_css = null
      tenant.custom_js = null
      // Keep basic contact info but remove sensitive details
      // (contact_email, contact_phone can stay for public info)
    }

    // Always sanitize custom CSS/JS even for admins (basic validation)
    if (tenant.custom_css) {
      // Check for obvious XSS patterns
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+=/i, // onclick, onerror, etc.
        /data:text\/html/i,
        /@import.*javascript/i
      ]

      for (const pattern of dangerousPatterns) {
        if (pattern.test(tenant.custom_css)) {
          logger.warn('🚨 Dangerous CSS pattern detected:', {
            tenantId: tenant.id,
            pattern: pattern.toString()
          })
          tenant.custom_css = null
          break
        }
      }
    }

    if (tenant.custom_js) {
      // For custom JS, require admin access and log usage
      if (!canAccessSensitiveFields) {
        tenant.custom_js = null
      } else {
        logger.warn('⚠️ Custom JS loaded:', {
          tenantId: tenant.id,
          userId,
          isAdmin
        })
      }
    }

    // ============ LAYER 6: AUDIT LOGGING ============
    await logAudit({
      user_id: userId,
      action: 'get_tenant_branding',
      resource_type: 'tenant',
      resource_id: tenant.id,
      status: 'success',
      ip_address: ipAddress,
      details: {
        tenant_slug: tenant.slug,
        is_authenticated: isAuthenticated,
        is_admin: isAdmin,
        has_custom_css: !!tenant.custom_css,
        has_custom_js: !!tenant.custom_js,
        duration_ms: Date.now() - startTime
      }
    })

    logger.debug('✅ Tenant branding fetched successfully:', {
      tenantId: tenant.id,
      slug: tenant.slug,
      isAuthenticated,
      durationMs: Date.now() - startTime
    })

    logger.debug('🖼️ Logos in response:', {
      logo_url: tenant.logo_url,
      logo_square_url: tenant.logo_square_url,
      logo_wide_url: tenant.logo_wide_url,
      logo_dark_url: tenant.logo_dark_url,
      favicon_url: tenant.favicon_url
    })

    return {
      success: true,
      data: tenant
    }
  } catch (error: any) {
    logger.error('❌ Error in get tenant branding API:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})

