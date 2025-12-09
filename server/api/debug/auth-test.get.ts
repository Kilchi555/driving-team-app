import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        success: false,
        error: 'Missing environment variables',
        supabaseUrl: !!supabaseUrl,
        serviceRoleKey: !!serviceRoleKey
      }
    }

    // Test Service Role Key by creating admin client
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Test 1: Try to list users (this should work with service role)
    logger.debug('🔍 Testing auth admin listUsers...')
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers()
    
    if (listError) {
      return {
        success: false,
        error: 'Failed to list users',
        listError: {
          status: listError.status,
          message: listError.message,
          name: listError.name
        }
      }
    }

    // Test 2: Try to get auth settings
    logger.debug('🔍 Testing auth settings...')
    const { data: settings, error: settingsError } = await adminClient.auth.admin.getSettings()
    
    if (settingsError) {
      return {
        success: false,
        error: 'Failed to get auth settings',
        settingsError: {
          status: settingsError.status,
          message: settingsError.message,
          name: settingsError.name
        },
        usersCount: users?.users?.length || 0
      }
    }

    // Test 3: Try to create a test user (and immediately delete it)
    logger.debug('🔍 Testing user creation...')
    const testEmail = `test-${Date.now()}@example.com`
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'testpassword123',
      email_confirm: true
    })

    if (createError) {
      return {
        success: false,
        error: 'Failed to create test user',
        createError: {
          status: createError.status,
          message: createError.message,
          name: createError.name
        },
        usersCount: users?.users?.length || 0,
        settings: settings
      }
    }

    // Clean up: Delete the test user
    if (createData.user) {
      logger.debug('🧹 Cleaning up test user...')
      await adminClient.auth.admin.deleteUser(createData.user.id)
    }

    return {
      success: true,
      message: 'All auth tests passed',
      usersCount: users?.users?.length || 0,
      settings: settings,
      testUserCreated: true
    }

  } catch (err: any) {
    console.error('❌ Auth test error:', err)
    return {
      success: false,
      error: 'Unexpected error',
      details: err.message,
      stack: err.stack
    }
  }
})
