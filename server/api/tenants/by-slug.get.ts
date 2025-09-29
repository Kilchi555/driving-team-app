// server/api/tenants/by-slug.get.ts
// Public endpoint to fetch a single tenant by slug with full branding fields (bypasses RLS using service role if available)
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = (query.slug as string | undefined)?.toString()

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  try {
    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl
    const supabaseServiceKey = config.supabaseServiceRoleKey
    const supabaseAnonKey = config.public.supabaseAnonKey

    if (!supabaseUrl) {
      throw createError({ statusCode: 500, statusMessage: 'Supabase URL configuration missing' })
    }

    // Prefer service role to bypass RLS, fallback to anon
    const supabaseKey = supabaseServiceKey || supabaseAnonKey
    if (!supabaseKey) {
      throw createError({ statusCode: 500, statusMessage: 'Supabase key configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data, error } = await supabase
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
      .maybeSingle()

    if (error) {
      console.error('Tenants by-slug DB error:', error)
      throw createError({ statusCode: 500, statusMessage: `Database error: ${error.message}` })
    }

    if (!data || data.is_active === false) {
      return { success: true, data: null }
    }

    return { success: true, data }
  } catch (err: any) {
    console.error('API Error (by-slug):', err)
    throw createError({ statusCode: err.statusCode || 500, statusMessage: err.statusMessage || 'Failed to load tenant' })
  }
})


