// server/api/auth/check-registration-risk.post.ts
// Check if IP address has suspicious registration activity
import { defineEventHandler, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Get client IP
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                      getHeader(event, 'x-real-ip') || 
                      event.node.req.socket.remoteAddress || 
                      'unknown'

    if (ipAddress === 'unknown') {
      return { requiresCaptcha: false, reason: 'unknown_ip' }
    }

    const supabase = getSupabaseAdmin()

    // Check audit logs for recent registrations from this IP
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: recentRegistrations, error } = await supabase
      .from('audit_logs')
      .select('id, created_at')
      .eq('action', 'user_registration')
      .eq('ip_address', ipAddress)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })

    if (error) {
      logger.warn('⚠️ Error checking registration risk:', error)
      // On error, require captcha to be safe
      return { requiresCaptcha: true, reason: 'error_checking' }
    }

    // If 1 or more registrations in last 24h → suspicious
    const registrationCount = recentRegistrations?.length || 0
    const requiresCaptcha = registrationCount >= 1

    logger.debug('🔍 Registration risk check:', {
      ip: ipAddress.substring(0, 10) + '...',
      count: registrationCount,
      requiresCaptcha
    })

    return {
      requiresCaptcha,
      reason: requiresCaptcha ? 'multiple_from_ip' : 'first_registration',
      count: registrationCount
    }

  } catch (error: any) {
    logger.error('❌ Registration risk check error:', error)
    // On error, require captcha to be safe
    return { requiresCaptcha: true, reason: 'error' }
  }
})

