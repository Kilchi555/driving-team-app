import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { userId, deviceFingerprint, userAgent, deviceName } = body

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key not configured.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create a test device
    const { data, error } = await supabase
      .from('user_devices')
      .insert({
        user_id: userId,
        mac_address: deviceFingerprint,
        user_agent: userAgent,
        ip_address: '127.0.0.1',
        device_name: deviceName,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_trusted: false
      })
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      }
    }

    return {
      success: true,
      device: data
    }

  } catch (error: any) {
    console.error('Error creating test device:', error)
    return {
      success: false,
      error: error.message
    }
  }
})


