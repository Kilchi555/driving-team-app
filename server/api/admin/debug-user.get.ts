import { defineEventHandler, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const userId = query.userId as string

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return { error: 'Missing config' }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all users from public.users table
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, auth_user_id, first_name, last_name, email')
      .limit(10)

    // Get all devices
    const { data: allDevices, error: devicesError } = await supabase
      .from('user_devices')
      .select('id, user_id, mac_address, device_name')
      .limit(10)

    return {
      success: true,
      requestedUserId: userId,
      allUsers: allUsers || [],
      usersError: usersError?.message,
      allDevices: allDevices || [],
      devicesError: devicesError?.message
    }
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})




