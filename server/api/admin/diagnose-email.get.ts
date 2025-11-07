// server/api/admin/diagnose-email.get.ts
// Diagnose email delivery issues

import { defineEventHandler } from 'h3'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    
    console.log('🔍 Diagnosing email delivery issues...')
    
    // Test with a real email signup to see what happens
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'
    
    console.log('📧 Testing with email:', testEmail)
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:3000/login',
        data: {
          test_signup: true,
          timestamp: new Date().toISOString()
        }
      }
    })
    
    console.log('📧 Signup result:', { signupData, signupError })
    
    if (signupError) {
      return {
        success: false,
        message: 'Signup failed',
        error: signupError.message,
        details: signupError,
        recommendations: [
          'Check Supabase Dashboard → Authentication → Settings',
          'Verify email templates are configured',
          'Check if SMTP is properly set up',
          'Verify email confirmation is enabled'
        ]
      }
    }
    
    // Check the user status
    const user = signupData.user
    const session = signupData.session
    
    return {
      success: true,
      message: 'Signup successful - checking email delivery',
      testEmail: testEmail,
      userStatus: {
        id: user?.id,
        email: user?.email,
        emailConfirmed: user?.email_confirmed_at ? 'Yes' : 'No',
        confirmationSent: user?.email_confirmed_at ? 'Already confirmed' : 'Confirmation should be sent',
        createdAt: user?.created_at
      },
      session: session ? 'User is logged in' : 'No session (email confirmation required)',
      nextSteps: [
        'Check the email inbox for confirmation email',
        'If no email arrives, check Supabase Dashboard → Authentication → Users',
        'Verify email templates in Supabase Dashboard',
        'Check spam folder'
      ],
      supabaseSettings: {
        emailConfirmationRequired: !session,
        redirectUrl: 'http://localhost:3000/login',
        userMetadata: user?.user_metadata
      }
    }
    
  } catch (error: any) {
    console.error('Error diagnosing email:', error)
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
})




