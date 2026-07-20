import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { mapSupabaseError } from '~/server/utils/supabase-error'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Verify user is super_admin. Bearer header with HTTP-only-cookie
    // fallback + token refresh, instead of a raw Bearer-only check that
    // would 401 whenever the client's access token had just expired.
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }
    if (authUser.role !== 'super_admin') {
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
        blocked_by: authUser.id,
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
      throw mapSupabaseError(error)
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to block IP address'
    })
  }
})

