import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key not configured.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user_devices table exists and get sample data
    const { data: devices, error } = await supabase
      .from('user_devices')
      .select('*')
      .limit(10)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      }
    }

    // Get table info
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_devices')

    return {
      success: true,
      tableExists: tableInfo && tableInfo.length > 0,
      deviceCount: devices?.length || 0,
      devices: devices,
      tableInfo: tableInfo
    }

  } catch (error: any) {
    console.error('Error testing device storage:', error)
    return {
      success: false,
      error: error.message
    }
  }
})


