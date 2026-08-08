import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { STAFF_ADMIN_ROLES } from '~/server/utils/require-staff-or-internal'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    const { deviceId, userId, isTrusted } = body

    if (!deviceId || !userId || isTrusted === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Device ID, User ID, and isTrusted are required'
      })
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

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw createError({ statusCode: 500, statusMessage: 'Supabase not configured' })
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

    logger.debug('Updating device:', deviceId, 'for user:', userId, 'isTrusted:', isTrusted)

    const { data, error } = await supabase
      .from('user_devices')
      .update({
        is_trusted: isTrusted,
        trusted_at: isTrusted ? new Date().toISOString() : null,
        last_seen: new Date().toISOString()
      })
      .eq('id', deviceId)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('Error updating device:', error)
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return {
      success: true,
      message: 'Device updated successfully',
      data: data
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Error in update-user-device API:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update device'
    })
  }
})
