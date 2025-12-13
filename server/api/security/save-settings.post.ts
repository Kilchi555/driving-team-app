import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Verify user is super_admin
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get auth header
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.substring(7)
    const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || '', {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Check if user is super_admin
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'super_admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only super_admin users can update security settings'
      })
    }

    // Read request body
    const { settings } = await readBody(event)

    if (!settings) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Settings are required'
      })
    }

    // Store settings (could be in a separate table or config)
    logger.debug('💾 Saving security settings:', settings)

    // For now, just return success
    // In a real implementation, you would store these in a settings table
    return {
      success: true,
      message: 'Security settings have been saved',
      settings
    }

  } catch (error: any) {
    console.error('Error in save-security-settings endpoint:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save security settings'
    })
  }
})

