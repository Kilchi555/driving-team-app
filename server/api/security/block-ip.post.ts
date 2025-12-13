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
        statusMessage: 'Only super_admin users can block IPs'
      })
    }

    // Read request body
    const { ipAddress } = await readBody(event)

    if (!ipAddress) {
      throw createError({
        statusCode: 400,
        statusMessage: 'IP address is required'
      })
    }

    // Validate IP address format
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    const ipv6Regex = /^([\da-f]{0,4}:){2,7}[\da-f]{0,4}$/i
    
    if (!ipv4Regex.test(ipAddress) && !ipv6Regex.test(ipAddress)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid IP address format'
      })
    }

    logger.debug('🚫 Blocking IP address:', ipAddress)

    // Create or update blocked IP entry
    const { error: blockError } = await adminSupabase
      .from('blocked_ip_addresses')
      .upsert({
        ip_address: ipAddress,
        blocked_at: new Date().toISOString(),
        blocked_by: user.id,
        reason: 'Brute force detection'
      }, {
        onConflict: 'ip_address'
      })

    if (blockError) {
      console.error('❌ Error blocking IP:', blockError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to block IP address'
      })
    }

    logger.debug('✅ IP address blocked successfully:', ipAddress)

    return {
      success: true,
      message: `IP address ${ipAddress} has been blocked`
    }

  } catch (error: any) {
    console.error('Error in block-ip endpoint:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to block IP address'
    })
  }
})

