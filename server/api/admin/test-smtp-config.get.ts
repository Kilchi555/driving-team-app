// server/api/admin/test-smtp-config.get.ts
// Test SMTP configuration and email templates

import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Use service role key for admin operations
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseServiceKey) {
      return {
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY not configured',
        message: 'Service role key is required for admin operations'
      }
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('🔍 Testing SMTP configuration...')
    
    // Test 1: Try to send a test email invitation
    const testEmail = `test-${Date.now()}@example.com`
    
    console.log('📧 Testing email invitation with:', testEmail)
    
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      testEmail,
      {
        data: {
          first_name: 'Test',
          last_name: 'User',
          tenant_name: 'Driving Team',
          tenant_id: 'test-tenant-id',
          test_invitation: true
        }
      }
    )
    
    if (inviteError) {
      return {
        success: false,
        message: 'Email invitation failed',
        error: inviteError.message,
        details: inviteError,
        recommendations: [
          'Check Supabase Dashboard → Authentication → Settings → Email',
          'Verify SMTP configuration is set up',
          'Check if email templates are configured',
          'Verify email confirmation is enabled'
        ]
      }
    }
    
    return {
      success: true,
      message: 'Email invitation sent successfully',
      testEmail: testEmail,
      inviteData: {
        userId: inviteData.user?.id,
        email: inviteData.user?.email,
        emailConfirmed: inviteData.user?.email_confirmed_at ? 'Yes' : 'No',
        createdAt: inviteData.user?.created_at
      },
      nextSteps: [
        'Check the email inbox for invitation email',
        'If no email arrives, check Supabase Dashboard → Authentication → Users',
        'Verify email templates in Supabase Dashboard',
        'Check spam folder'
      ],
      supabaseSettings: {
        emailConfirmationRequired: !inviteData.user?.email_confirmed_at,
        userMetadata: inviteData.user?.user_metadata
      }
    }
    
  } catch (error: any) {
    console.error('Error testing SMTP configuration:', error)
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
})
