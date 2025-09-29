// server/api/tenants/public.get.ts
// Öffentliche API zum Laden der verfügbaren Tenants (ohne RLS)
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl
    const supabaseServiceKey = config.supabaseServiceRoleKey
    const supabaseAnonKey = config.public.supabaseAnonKey
    
    if (!supabaseUrl) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Supabase URL configuration missing'
      })
    }

    // Verwende Service Role Key wenn verfügbar, sonst Anon Key
    const supabaseKey = supabaseServiceKey || supabaseAnonKey
    
    if (!supabaseKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Supabase key configuration missing'
      })
    }

    // Client erstellen (Admin wenn Service Key, sonst Standard)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Öffentliche Tenant-Daten laden
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        contact_email,
        contact_phone,
        address,
        business_type,
        primary_color,
        secondary_color,
        logo_square_url,
        logo_wide_url,
        is_active,
        is_trial,
        subscription_plan,
        subscription_status
      `)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Database error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Database error: ${error.message}`
      })
    }

    return {
      success: true,
      data: tenants || [],
      count: tenants?.length || 0
    }

  } catch (error: any) {
    console.error('API Error:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to load tenants'
    })
  }
})
