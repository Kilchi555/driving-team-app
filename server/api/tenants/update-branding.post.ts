// API route for updating tenant branding with service role permissions
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { tenantId, updateData } = body

    if (!tenantId || !updateData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing tenantId or updateData'
      })
    }

    // Get service role key from runtime config
    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl
    const serviceRoleKey = config.supabaseServiceRoleKey

    if (!serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Service role key not configured'
      })
    }

    // Create service role client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('🔧 Service role update for tenant:', tenantId)
    console.log('📝 Update data:', updateData)

    // Perform update with service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('❌ Service role update error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Database update failed: ${error.message}`
      })
    }

    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found or no changes made'
      })
    }

    console.log('✅ Service role update successful:', data.name)
    return data

  } catch (error) {
    console.error('❌ API Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})





















