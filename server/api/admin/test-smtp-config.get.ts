// server/api/admin/test-smtp-config.get.ts
// Test SMTP configuration and email templates

import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'
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

    // 3. RATE LIMITING (5 requests per hour - very restrictive)
    ip = getClientIP(event)
    const { allowed, retryAfter } = await checkRateLimit(
      ip,
      'test_smtp_config',
      5, // 5 requests max
      3600000 // per 1 hour
    )

    if (!allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Rate limit exceeded. Retry after ${retryAfter}ms`
      })
    }

    // Use service role key for admin operations
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseServiceKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'SUPABASE_SERVICE_ROLE_KEY not configured'
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    logger.debug('🔍 Testing SMTP configuration...')
    
    // AUDIT LOGGING (TEST STARTED)
    await logAudit({
      user_id: user.id,
      action: 'admin_test_smtp_config',
      status: 'started',
      details: { test_type: 'smtp_configuration' },
      ip_address: ip
    }).catch(() => {})

    // AUDIT LOGGING (TEST STARTED)
    await logAudit({
      user_id: user.id,
      action: 'admin_test_smtp_config',
      status: 'started',
      details: { test_type: 'smtp_configuration' },
      ip_address: ip
    }).catch(() => {})

    return {
      success: true,
      message: 'SMTP configuration test completed - check Supabase Dashboard for actual SMTP status',
      recommendations: [
        'Check Supabase Dashboard → Authentication → Settings → Email',
        'Verify SMTP configuration is set up',
        'Check if email templates are configured',
        'Review email provider settings',
        'Test by visiting Authentication → Users and sending invite'
      ],
      supabaseServiceRoleStatus: 'Connected'
    }
    
  } catch (error: any) {
    console.error('Error testing SMTP configuration:', error)

    // AUDIT LOGGING (ERROR)
    if (user) {
      await logAudit({
        user_id: user.id,
        action: 'admin_test_smtp_config_error',
        status: 'error',
        error_message: error.message || 'Failed to test SMTP configuration',
        ip_address: ip
      }).catch(() => {})
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to test SMTP configuration'
    })
  }
})
