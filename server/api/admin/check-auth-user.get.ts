import { defineEventHandler, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const userId = query.userId as string

    if (!userId) {
      return {
        success: false,
        error: 'userId parameter required'
      }
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key not configured.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    
    // Check if user exists in public.users
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', userId)
      .single()

    // Check if user has any devices
    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)

    return {
      success: true,
      userId: userId,
      authUser: authUser?.user || null,
      authError: authError?.message || null,
      publicUser: publicUser || null,
      publicError: publicError?.message || null,
      devices: devices || [],
      devicesError: devicesError?.message || null
    }
    
  } catch (error: any) {
    console.error('Error checking auth user:', error)
    return {
      success: false,
      error: error.message
    }
  }
})



