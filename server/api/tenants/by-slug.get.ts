/**
 * API endpoint to fetch tenant branding by slug
 * Bypasses RLS using service role to allow public access to tenant branding
 * Used on login/register pages where user is not authenticated
 */

import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const { slug } = getQuery(event)

    logger.debug('📡 /api/tenants/by-slug called with query:', { slug })

    if (!slug || typeof slug !== 'string') {
      console.error('❌ Invalid slug parameter:', slug)
      throw createError({
        statusCode: 400,
        statusMessage: 'Slug parameter is required'
      })
    }

    logger.debug('🔍 Fetching tenant branding for slug:', slug)

    // Create service role client to bypass RLS
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Fetch tenant by slug
    const { data, error } = await serviceSupabase
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
        is_active
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('❌ Error fetching tenant:', error)
      throw createError({
        statusCode: 404,
        statusMessage: `Tenant with slug '${slug}' not found`
      })
    }

    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: `Tenant with slug '${slug}' not found`
      })
    }

    logger.debug('✅ Tenant found:', data.name)

    return {
      success: true,
      data: data
    }

  } catch (error: any) {
    console.error('❌ Error in tenant by-slug endpoint:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
