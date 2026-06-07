import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

/**
 * POST /api/tenants/branding
 * 
 * Secure API for updating tenant branding
 * 
 * Security Layers:
 * ✅ Layer 1: Authentication (user must be logged in)
 * ✅ Layer 2: Authorization (admin/staff or tenant owner only)
 * ✅ Layer 3: Rate Limiting (10 req/min per user)
 * ✅ Layer 4: Input Validation & Sanitization
 * ✅ Layer 5: Tenant Isolation (can only update own tenant)
 * ✅ Layer 6: XSS Prevention (CSS/JS validation)
 * ✅ Layer 7: Audit Logging (all changes logged)
 */

interface UpdateBrandingRequest {
  tenantId: string
  updateData: any
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      logger.warn('⚠️ User profile not found:', authUser.id)
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    const userId = userProfile.id

    // ============ LAYER 2: AUTHORIZATION ============
    const allowedRoles = ['admin', 'staff', 'super_admin']
    const isSystemAdmin = allowedRoles.includes(userProfile.role)

    // ============ LAYER 3: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      userId,
      'update_tenant_branding',
      10, // 10 requests per minute (strict for updates)
      60 * 1000
    )

    if (!rateLimitResult.allowed) {
      logger.warn('⚠️ Rate limit exceeded:', {
        userId,
        operation: 'update_tenant_branding'
      })
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again later.'
      })
    }

    // ============ LAYER 4: READ & VALIDATE INPUT ============
    const body = await readBody(event) as UpdateBrandingRequest
    const { tenantId, updateData } = body

    if (!tenantId || !updateData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: tenantId, updateData'
      })
    }

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid tenant ID format'
      })
    }

    // ============ LAYER 5: TENANT ISOLATION ============
    // Check if user can update this tenant
    if (!isSystemAdmin && userProfile.tenant_id !== tenantId) {
      logger.warn('⚠️ Unauthorized update attempt:', {
        userId,
        userTenantId: userProfile.tenant_id,
        targetTenantId: tenantId
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: You can only update your own tenant'
      })
    }

    // Verify tenant exists and is active
    const { data: existingTenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, is_active')
      .eq('id', tenantId)
      .single()

    if (tenantError || !existingTenant) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found'
      })
    }

    if (!existingTenant.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Cannot update inactive tenant'
      })
    }

    logger.debug('🎨 Updating tenant branding:', {
      tenantId,
      userId,
      isSystemAdmin
    })

    // ============ LAYER 6: XSS PREVENTION & SANITIZATION ============
    
    // Validate and sanitize custom CSS
    if (updateData.custom_css !== undefined) {
      if (updateData.custom_css && typeof updateData.custom_css === 'string') {
        // Check for dangerous patterns
        const dangerousCssPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+=/i, // onclick, onerror, etc.
          /data:text\/html/i,
          /@import.*javascript/i,
          /expression\(/i, // IE CSS expressions
          /behavior:/i, // IE behaviors
          /-moz-binding:/i, // XBL bindings
        ]

        for (const pattern of dangerousCssPatterns) {
          if (pattern.test(updateData.custom_css)) {
            logger.error('🚨 Dangerous CSS pattern detected and blocked:', {
              tenantId,
              userId,
              pattern: pattern.toString()
            })
            throw createError({
              statusCode: 400,
              statusMessage: `Dangerous CSS pattern detected: ${pattern.toString()}. Custom CSS rejected for security reasons.`
            })
          }
        }

        // Limit CSS size (prevent DoS)
        if (updateData.custom_css.length > 50000) { // 50KB limit
          throw createError({
            statusCode: 400,
            statusMessage: 'Custom CSS is too large (max 50KB)'
          })
        }

        logger.warn('⚠️ Custom CSS being updated:', {
          tenantId,
          userId,
          size: updateData.custom_css.length
        })
      }
    }

    // Validate and sanitize custom JS
    if (updateData.custom_js !== undefined) {
      if (updateData.custom_js && typeof updateData.custom_js === 'string') {
        // Custom JS is HIGH RISK - only allow for system admins
        if (!isSystemAdmin) {
          logger.error('🚨 Non-admin attempted to set custom JS:', {
            userId,
            role: userProfile.role
          })
          throw createError({
            statusCode: 403,
            statusMessage: 'Only system administrators can set custom JavaScript'
          })
        }

        // Check for obvious malicious patterns
        const dangerousJsPatterns = [
          /eval\(/i,
          /Function\(/i,
          /setTimeout.*\(/i,
          /setInterval.*\(/i,
          /document\.write/i,
          /innerHTML/i,
          /outerHTML/i,
        ]

        for (const pattern of dangerousJsPatterns) {
          if (pattern.test(updateData.custom_js)) {
            logger.error('🚨 Dangerous JS pattern detected:', {
              tenantId,
              userId,
              pattern: pattern.toString()
            })
            throw createError({
              statusCode: 400,
              statusMessage: `Dangerous JavaScript pattern detected: ${pattern.toString()}. Custom JS rejected for security reasons.`
            })
          }
        }

        // Limit JS size
        if (updateData.custom_js.length > 20000) { // 20KB limit
          throw createError({
            statusCode: 400,
            statusMessage: 'Custom JavaScript is too large (max 20KB)'
          })
        }

        logger.warn('🚨 Custom JS being updated (HIGH RISK):', {
          tenantId,
          userId,
          size: updateData.custom_js.length
        })
      }
    }

    // Sanitize color values
    const colorFields = [
      'primary_color', 'secondary_color', 'accent_color',
      'success_color', 'warning_color', 'error_color', 'info_color',
      'background_color', 'surface_color', 'text_color', 'text_secondary_color'
    ]

    for (const field of colorFields) {
      if (updateData[field] !== undefined) {
        // Validate hex color format or rgba/rgb
        const colorRegex = /^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgba?\([^)]+\))$/
        if (updateData[field] && !colorRegex.test(updateData[field])) {
          throw createError({
            statusCode: 400,
            statusMessage: `Invalid color format for ${field}`
          })
        }
      }
    }

    // Validate numeric fields
    if (updateData.font_size_base !== undefined) {
      const fontSize = parseInt(updateData.font_size_base)
      if (isNaN(fontSize) || fontSize < 10 || fontSize > 24) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Font size must be between 10 and 24'
        })
      }
    }

    if (updateData.border_radius !== undefined) {
      const borderRadius = parseInt(updateData.border_radius)
      if (isNaN(borderRadius) || borderRadius < 0 || borderRadius > 50) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Border radius must be between 0 and 50'
        })
      }
    }

    if (updateData.spacing_unit !== undefined) {
      const spacingUnit = parseInt(updateData.spacing_unit)
      if (isNaN(spacingUnit) || spacingUnit < 1 || spacingUnit > 20) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Spacing unit must be between 1 and 20'
        })
      }
    }

    // ============ LAYER 7: FIELD WHITELIST ============
    // Only allow specific branding-related fields to be updated.
    // Critical fields (slug, is_active, subscription_*, wallee_*, created_*) are blocked.
    const ALLOWED_FIELDS = new Set([
      // Visual branding
      'logo_url', 'logo_dark_url', 'logo_square_url', 'logo_wide_url', 'favicon_url',
      'primary_color', 'secondary_color', 'accent_color',
      'success_color', 'warning_color', 'error_color', 'info_color',
      'background_color', 'surface_color', 'text_color', 'text_secondary_color',
      'font_size_base', 'border_radius', 'spacing_unit',
      'font_family', 'font_family_heading',
      // Brand identity
      'brand_name', 'tagline', 'description',
      // Contact (tenant's own — they can update)
      'contact_email', 'contact_phone', 'address',
      'street', 'street_nr', 'zip', 'city', 'country',
      // Messaging
      'twilio_from_sender',
      // Social / web
      'website_url', 'instagram_url', 'facebook_url', 'tiktok_url', 'youtube_url',
      // SEO
      'seo_title', 'seo_description', 'seo_keywords',
      // Custom code (already validated above)
      'custom_css', 'custom_js'
    ])

    const sanitizedUpdate: Record<string, any> = {}
    const blockedFields: string[] = []

    for (const [key, value] of Object.entries(updateData)) {
      if (ALLOWED_FIELDS.has(key)) {
        sanitizedUpdate[key] = value
      } else if (key !== 'updated_at') {
        blockedFields.push(key)
      }
    }

    if (blockedFields.length > 0) {
      logger.warn('🚨 Blocked attempt to update protected fields:', {
        tenantId,
        userId,
        blockedFields
      })
    }

    if (Object.keys(sanitizedUpdate).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid fields to update'
      })
    }

    sanitizedUpdate.updated_at = new Date().toISOString()

    // ============ LAYER 8: UPDATE DATABASE ============
    const { data: updatedTenant, error: updateError } = await supabaseAdmin
      .from('tenants')
      .update(sanitizedUpdate)
      .eq('id', tenantId)
      .select()
      .single()

    if (updateError) {
      logger.error('❌ Database update failed:', updateError)
      throw updateError
    }

    if (!updatedTenant) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Update failed - no rows affected'
      })
    }

    // ============ LAYER 8: AUDIT LOGGING ============
    await logAudit({
      user_id: userId,
      tenant_id: tenantId,
      action: 'update_tenant_branding',
      resource_type: 'tenant',
      resource_id: tenantId,
      status: 'success',
      ip_address: ipAddress,
      details: {
        updated_fields: Object.keys(sanitizedUpdate),
        blocked_fields: blockedFields,
        has_custom_css: !!sanitizedUpdate.custom_css,
        has_custom_js: !!sanitizedUpdate.custom_js,
        is_system_admin: isSystemAdmin,
        duration_ms: Date.now() - startTime
      }
    })

    logger.debug('✅ Tenant branding updated successfully:', {
      tenantId,
      userId,
      updatedFields: Object.keys(sanitizedUpdate).length,
      durationMs: Date.now() - startTime
    })

    return {
      success: true,
      data: updatedTenant
    }
  } catch (error: any) {
    logger.error('❌ Error in update tenant branding API:', error)

    await logAudit({
      user_id: error.userId,
      tenant_id: error.tenantId,
      action: 'update_tenant_branding',
      resource_type: 'tenant',
      status: 'failed',
      error_message: error.statusMessage || error.message,
      ip_address: ipAddress,
      details: {
        duration_ms: Date.now() - startTime
      }
    })

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})

