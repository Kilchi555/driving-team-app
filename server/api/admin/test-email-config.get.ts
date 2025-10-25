// server/api/admin/test-email-config.get.ts
// Test Supabase email configuration

import { defineEventHandler } from 'h3'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    
    // Test 1: Check if we can access auth settings
    console.log('🔍 Testing Supabase email configuration...')
    
    // Test 2: Try to get current auth settings (this might not work with anon key)
    try {
      const { data: authSettings, error: authError } = await supabase.auth.getSession()
      console.log('📧 Auth session check:', { authSettings, authError })
    } catch (e) {
      console.log('📧 Auth session check failed (expected with anon key):', e)
    }
    
    // Test 3: Check if we can send a test email (this will fail if not configured)
    try {
      const { data: testEmail, error: testError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123',
        options: {
          emailRedirectTo: 'http://localhost:3000/login'
        }
      })
      
      console.log('📧 Test email signup result:', { testEmail, testError })
      
      return {
        success: true,
        message: 'Email configuration test completed',
        results: {
          authSession: 'Checked (expected to fail with anon key)',
          testSignup: testError ? `Failed: ${testError.message}` : 'Success (but test user created)',
          recommendation: testError?.message?.includes('email') ? 
            'Email configuration needs to be set up in Supabase Dashboard' : 
            'Email configuration appears to be working'
        }
      }
    } catch (e: any) {
      console.log('📧 Test email failed:', e)
      
      return {
        success: false,
        message: 'Email configuration test failed',
        error: e.message,
        recommendation: 'Check Supabase Dashboard → Authentication → Settings → Email'
      }
    }
    
  } catch (error: any) {
    console.error('Error testing email configuration:', error)
    return {
      success: false,
      error: error.message
    }
  }
})
