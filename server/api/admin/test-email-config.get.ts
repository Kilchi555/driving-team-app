// server/api/admin/test-email-config.get.ts
// Test Supabase email configuration

import { defineEventHandler } from 'h3'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

export default defineEventHandler(async (event) => {
  let user: any = null
  let ip: string = ''
  
  try {
    // 1. AUTHENTICATION
    user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    // 2. AUTHORIZATION (Super Admin only)
    if (user.role !== 'super_admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Super Admin role required'
      })
    }

    // 3. RATE LIMITING (5 requests per hour - very restrictive for test)
    ip = getClientIP(event)
    const { allowed, retryAfter } = await checkRateLimit(
      ip,
      'test_email_config',
      5, // 5 requests max
      3600000 // per 1 hour
    )

    if (!allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Rate limit exceeded. Retry after ${retryAfter}ms`
      })
    }

    logger.debug('🔍 Testing Supabase email configuration...')
    
    const supabase = getSupabase()
    
    // Test 1: Check if we can access auth settings
    logger.debug('📧 Auth session check...')
    
    try {
      const { data: authSettings, error: authError } = await supabase.auth.getSession()
      logger.debug('📧 Auth session check result:', { hasSession: !!authSettings?.session, error: authError })
    } catch (e) {
      logger.debug('📧 Auth session check failed (expected):', e)
    }
    
    // AUDIT LOGGING (TEST COMPLETED)
    await logAudit({
      user_id: user.id,
      action: 'admin_test_email_config',
      status: 'success',
      details: { test_type: 'email_configuration' },
      ip_address: ip
    }).catch(() => {})

    return {
      success: true,
      message: 'Email configuration test completed - check Supabase Dashboard for actual email status',
      recommendations: [
        'Check Supabase Dashboard → Authentication → Settings → Email',
        'Verify SMTP configuration is set up',
        'Check if email templates are configured',
        'Review email provider settings'
      ]
    }
    
  } catch (error: any) {
    console.error('Error testing email configuration:', error)

    // AUDIT LOGGING (ERROR)
    if (user) {
      await logAudit({
        user_id: user.id,
        action: 'admin_test_email_config_error',
        status: 'error',
        error_message: error.message || 'Failed to test email configuration',
        ip_address: ip
      }).catch(() => {})
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to test email configuration'
    })
  }
})
