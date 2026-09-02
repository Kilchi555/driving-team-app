// server/api/admin/remove-user-device.post.ts
// Authenticated user may delete only their own devices.
// Ownership is taken from the session (auth.users id), never from the client body.

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    const deviceId = typeof body?.deviceId === 'string' ? body.deviceId.trim() : ''

    if (!deviceId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Device ID is required',
      })
    }

    // user_devices.user_id stores auth.users.id (see DeviceManager.vue load path)
    const ownerAuthUserId = authUser.id as string

    // If client sends userId, it must match the session — ignore foreign IDs
    if (body?.userId && body.userId !== ownerAuthUserId && body.userId !== authUser.db_user_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden – cannot delete another user\'s device',
      })
    }

    const supabase = getSupabaseAdmin()

    logger.debug('Removing device:', deviceId, 'for auth user:', ownerAuthUserId)

    const { data, error } = await supabase
      .from('user_devices')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', ownerAuthUserId)
      .select()

    if (error) {
      console.error('Error removing device:', error)
      throw createError({
        statusCode: 500,
        statusMessage: error.message || 'Failed to remove device',
      })
    }

    if (!data || data.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Device not found',
      })
    }

    return {
      success: true,
      message: 'Device removed successfully',
      data,
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Error in remove-user-device API:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'Failed to remove device',
    })
  }
})
