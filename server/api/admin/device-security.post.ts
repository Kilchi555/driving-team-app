import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { STAFF_ADMIN_ROLES } from '~/server/utils/require-staff-or-internal'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    const { action, userId, macAddress, userAgent, ipAddress } = body

    if (!userId || !action) {
      throw createError({ statusCode: 400, statusMessage: 'action and userId are required' })
    }

    const role = authUser.role || ''
    const isPrivileged = (STAFF_ADMIN_ROLES as readonly string[]).includes(role)
    const callerDbId = authUser.db_user_id || authUser.profile?.id

    if (!isPrivileged && callerDbId !== userId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden – can only manage your own devices'
      })
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceKey) {
      throw createError({ statusCode: 500, statusMessage: 'SUPABASE_SERVICE_ROLE_KEY not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (isPrivileged && role !== 'super_admin') {
      const { data: target } = await supabase
        .from('users')
        .select('id, tenant_id')
        .eq('id', userId)
        .maybeSingle()
      if (!target || target.tenant_id !== authUser.tenant_id) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
      }
    }

    if (action === 'register_device') {
      const { data, error } = await supabase
        .from('user_devices')
        .insert({
          user_id: userId,
          mac_address: macAddress,
          user_agent: userAgent,
          ip_address: ipAddress,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          is_trusted: false,
          device_name: `Device ${new Date().toLocaleDateString()}`
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        message: 'Device registered',
        device: data,
        requiresVerification: true
      }
    }

    if (action === 'check_device') {
      const { data: devices, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('mac_address', macAddress)
        .single()

      if (error && error.code !== 'PGRST116') {
        return { success: false, error: error.message }
      }

      if (!devices) {
        return {
          success: true,
          isKnownDevice: false,
          requiresRegistration: true,
          message: 'Unknown device detected'
        }
      }

      await supabase
        .from('user_devices')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', devices.id)

      return {
        success: true,
        isKnownDevice: true,
        isTrusted: devices.is_trusted,
        device: devices,
        message: devices.is_trusted ? 'Trusted device' : 'Device requires verification'
      }
    }

    if (action === 'trust_device') {
      const { data, error } = await supabase
        .from('user_devices')
        .update({
          is_trusted: true,
          trusted_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('mac_address', macAddress)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        message: 'Device marked as trusted',
        device: data
      }
    }

    return {
      success: false,
      error: 'Invalid action. Use: register_device, check_device, or trust_device'
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Error in device security:', error)
    return {
      success: false,
      error: error.message
    }
  }
})
