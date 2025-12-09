import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { deviceId, userId } = body

    if (!deviceId || !userId) {
      return {
        success: false,
        error: 'Device ID and User ID are required'
      }
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key not configured.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    logger.debug('Removing device:', deviceId, 'for user:', userId)

    // Delete device using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('user_devices')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', userId) // Extra security check
      .select()

    if (error) {
      console.error('Error removing device:', error)
      return {
        success: false,
        error: error.message,
        details: error
      }
    }

    return {
      success: true,
      message: 'Device removed successfully',
      data: data
    }

  } catch (error: any) {
    console.error('Error in remove-user-device API:', error)
    return {
      success: false,
      error: error.message
    }
  }
})




