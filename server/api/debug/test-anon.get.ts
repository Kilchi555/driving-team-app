import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return {
        success: false,
        error: 'Missing environment variables'
      }
    }

    // Test with anon key
    const anonClient = createClient(supabaseUrl, anonKey)
    
    // Test 1: Try to get auth session (should work with anon key)
    const { data: session, error: sessionError } = await anonClient.auth.getSession()
    
    if (sessionError) {
      return {
        success: false,
        error: 'Failed to get session with anon key',
        sessionError: {
          status: sessionError.status,
          message: sessionError.message,
          name: sessionError.name
        }
      }
    }

    // Test 2: Try to query a table (should work with anon key)
    const { data: tenants, error: tenantsError } = await anonClient
      .from('tenants')
      .select('id, name')
      .limit(1)
    
    if (tenantsError) {
      return {
        success: false,
        error: 'Failed to query tenants with anon key',
        tenantsError: {
          status: tenantsError.status,
          message: tenantsError.message,
          name: tenantsError.name
        },
        session: session
      }
    }

    return {
      success: true,
      message: 'Anon key works correctly',
      session: session,
      tenants: tenants
    }

  } catch (err: any) {
    return {
      success: false,
      error: 'Unexpected error',
      details: err.message
    }
  }
})
