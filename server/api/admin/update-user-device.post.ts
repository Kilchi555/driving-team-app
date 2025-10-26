import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { deviceId, userId, isTrusted } = body

    if (!deviceId || !userId || isTrusted === undefined) {
      return {
        success: false,
        error: 'Device ID, User ID, and isTrusted are required'
      }
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key not configured.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Updating device:', deviceId, 'for user:', userId, 'isTrusted:', isTrusted)

    // Update device using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('user_devices')
      .update({ 
        is_trusted: isTrusted,
        trusted_at: isTrusted ? new Date().toISOString() : null,
        last_seen: new Date().toISOString()
      })
      .eq('id', deviceId)
      .eq('user_id', userId) // Extra security check
      .select()

    if (error) {
      console.error('Error updating device:', error)
      return {
        success: false,
        error: error.message,
        details: error
      }
    }

    return {
      success: true,
      message: 'Device updated successfully',
      data: data
    }

  } catch (error: any) {
    console.error('Error in update-user-device API:', error)
    return {
      success: false,
      error: error.message
    }
  }
})



