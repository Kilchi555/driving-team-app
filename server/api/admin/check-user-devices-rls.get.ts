import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key not configured.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    logger.debug('Checking user_devices table RLS policies...')

    // Check if table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_devices')

    if (tableError) {
      return {
        success: false,
        error: 'Error checking table existence',
        details: tableError
      }
    }

    if (!tableExists || tableExists.length === 0) {
      return {
        success: false,
        error: 'user_devices table does not exist'
      }
    }

    // Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'user_devices')

    if (policiesError) {
      return {
        success: false,
        error: 'Error checking RLS policies',
        details: policiesError
      }
    }

    // Check if RLS is enabled
    const { data: rlsEnabled, error: rlsError } = await supabase
      .from('pg_class')
      .select('relrowsecurity')
      .eq('relname', 'user_devices')

    return {
      success: true,
      tableExists: true,
      rlsEnabled: rlsEnabled?.[0]?.relrowsecurity || false,
      policies: policies || [],
      policyCount: policies?.length || 0
    }

  } catch (error: any) {
    console.error('Error checking user_devices RLS:', error)
    return {
      success: false,
      error: error.message
    }
  }
})




