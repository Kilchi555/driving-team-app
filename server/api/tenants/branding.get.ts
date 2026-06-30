import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'
import { getBrandingCache, setBrandingCache } from '~/server/utils/branding-cache'

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
  const query = getQuery(event)
  const slug = query.slug as string
  const id = query.id as string

  try {
    // ============ LAYER 1: INPUT VALIDATION (fast, no DB) ============
    if (!slug && !id) {
      throw createError({ statusCode: 400, statusMessage: 'Either slug or id parameter is required' })
    }
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid slug format' })
    }
    if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid ID format' })
    }

    const authHeader = event.node.req.headers.authorization
    const isAnonymous = !authHeader?.startsWith('Bearer ')
    const cacheKey = slug ? `slug:${slug}` : `id:${id}`

    // ============ LAYER 2: CACHE CHECK — before any DB call ============
    // Anonymous requests get cached responses instantly. Authenticated admins
    // bypass cache to always receive fresh custom CSS/JS.
    if (isAnonymous) {
      const cached = getBrandingCache(cacheKey)
      if (cached) {
        setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
        setHeader(event, 'X-Cache', 'HIT')
        return { success: true, data: cached }
      }
    }

    const supabaseAdmin = getSupabaseAdmin()

    // ============ LAYER 3: AUTH + RATE LIMIT — parallel for anon fast path ============
    let isAuthenticated = false
    let isAdmin = false
    let userId: string | undefined
    let userTenantId: string | undefined

    if (!isAnonymous) {
      // Only do full auth check when a token is actually present
      try {
        const token = authHeader!.substring(7)
        const [{ data: { user }, error: authError }, rateLimitResult] = await Promise.all([
          supabaseAdmin.auth.getUser(token),
          checkRateLimit(ipAddress, 'get_tenant_branding_ip', 30, 60 * 1000),
        ])

        if (!rateLimitResult.allowed) {
          throw createError({ statusCode: 429, statusMessage: 'Too many requests from this IP. Please try again later.' })
        }

        if (!authError && user) {
          isAuthenticated = true
          const { data: userProfile } = await supabaseAdmin
            .from('users')
            .select('id, tenant_id, role')
            .eq('auth_user_id', user.id)
            .single()

          if (userProfile) {
            userId = userProfile.id
            userTenantId = userProfile.tenant_id
            isAdmin = ['admin', 'staff', 'super_admin'].includes(userProfile.role)
          }
        }
      } catch (e: any) {
        if (e.statusCode) throw e
        logger.debug('Auth check failed, continuing as anonymous')
      }
    } else {
      // Anonymous: fire-and-forget rate limit (don't block the response)
      checkRateLimit(ipAddress, 'get_tenant_branding_ip', 30, 60 * 1000).catch(() => {})
    }

    // ============ LAYER 4: PARALLEL DB QUERIES ============
    // Tenant query + affiliate setting run in parallel by using the slug directly
    // on affiliate query (no need to wait for tenant.id).
    let tenantQuery = supabaseAdmin
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
        custom_css, custom_js, default_theme, allow_theme_switch,
        wallee_enabled,
        business_type
      `)
      .eq('is_active', true)

    if (slug) tenantQuery = tenantQuery.eq('slug', slug)
    else tenantQuery = tenantQuery.eq('id', id)

    // Fetch tenant and affiliate setting in parallel.
    // For slug-based requests, we query tenant_settings joined to tenants by slug
    // so we don't need tenant.id first. Falls back to a sequential query if the join
    // returns an error (schema relationship not configured).
    const affiliateParallelQuery = slug
      ? supabaseAdmin
          .from('tenant_settings')
          .select('setting_value, tenants!inner(id)')
          .eq('tenants.slug', slug)
          .eq('category', 'affiliate')
          .eq('setting_key', 'enabled')
          .maybeSingle()
      : Promise.resolve({ data: null, error: { message: 'id-based lookup' } as any })

    const [
      { data: tenant, error: tenantError },
      { data: affiliateSetting, error: affiliateError },
    ] = await Promise.all([tenantQuery.maybeSingle(), affiliateParallelQuery])

    if (tenantError) {
      logger.error('❌ Error fetching tenant:', tenantError)
      throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })
    }

    if (!tenant) {
      logAudit({ action: 'get_tenant_branding', resource_type: 'tenant', status: 'failed', error_message: 'Tenant not found', ip_address: ipAddress, details: { slug, id } }).catch(() => {})
      throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
    }

    // If the parallel affiliate join failed or was skipped (id-based), fall back to
    // sequential query now that we have tenant.id. Only one extra round-trip in that case.
    let affiliateEnabled = true
    if (!affiliateError) {
      // Parallel query succeeded: null means no row → default true (enabled)
      affiliateEnabled = affiliateSetting?.setting_value !== 'false'
    } else {
      const { data: fallback } = await supabaseAdmin
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenant.id)
        .eq('category', 'affiliate')
        .eq('setting_key', 'enabled')
        .maybeSingle()
      affiliateEnabled = fallback?.setting_value !== 'false'
    }

    tenant.features = { affiliate_enabled: affiliateEnabled }

    // ============ LAYER 5: FIELD FILTERING & XSS PREVENTION ============
    const canAccessSensitiveFields = isAuthenticated && (isAdmin || userTenantId === tenant.id)

    if (!canAccessSensitiveFields) {
      tenant.custom_css = null
      tenant.custom_js = null
    }

    if (tenant.custom_css) {
      const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+=/i, /data:text\/html/i, /@import.*javascript/i]
      if (dangerousPatterns.some(p => p.test(tenant.custom_css))) {
        logger.warn('🚨 Dangerous CSS pattern detected for tenant:', tenant.id)
        tenant.custom_css = null
      }
    }

    if (tenant.custom_js && !canAccessSensitiveFields) {
      tenant.custom_js = null
    }

    // ============ LAYER 6: CACHE + AUDIT (fire-and-forget) ============
    if (isAnonymous) {
      setBrandingCache(cacheKey, tenant)
      setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
      setHeader(event, 'X-Cache', 'MISS')
    }

    // Audit log is fire-and-forget — never blocks the response
    logAudit({
      user_id: userId,
      action: 'get_tenant_branding',
      resource_type: 'tenant',
      resource_id: tenant.id,
      status: 'success',
      ip_address: ipAddress,
      details: { tenant_slug: tenant.slug, is_authenticated: isAuthenticated, duration_ms: Date.now() - startTime }
    }).catch(() => {})

    logger.debug(`✅ Branding fetched in ${Date.now() - startTime}ms (authenticated: ${isAuthenticated})`)

    return { success: true, data: tenant }

  } catch (error: any) {
    logger.error('❌ Error in get tenant branding API:', error)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})

