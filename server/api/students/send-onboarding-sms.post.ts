// server/api/students/send-onboarding-sms.post.ts
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { sendSMS } from '~/server/utils/sms'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined

  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      await logAudit({
        action: 'send_onboarding_sms',
        status: 'failed',
        error_message: 'Authentication required',
        ip_address: ipAddress
      })
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = getSupabaseAdmin()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      await logAudit({
        action: 'send_onboarding_sms',
        status: 'failed',
        error_message: 'Invalid or expired token',
        ip_address: ipAddress
      })
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired token'
      })
    }

    authenticatedUserId = user.id

    // ============ LAYER 2: AUTHORIZATION ============
    const { data: requestingUser, error: reqUserError } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id, auth_user_id')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (reqUserError || !requestingUser) {
      await logAudit({
        user_id: authenticatedUserId,
        action: 'send_onboarding_sms',
        status: 'failed',
        error_message: 'User profile not found',
        ip_address: ipAddress
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    tenantId = requestingUser.tenant_id

    // Only admin/staff can send onboarding SMS
    if (!['admin', 'staff', 'tenant_admin', 'superadmin'].includes(requestingUser.role)) {
      await logAudit({
        user_id: authenticatedUserId,
        action: 'send_onboarding_sms',
        status: 'failed',
        error_message: 'Insufficient permissions',
        ip_address: ipAddress
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions'
      })
    }

    // ============ LAYER 3: RATE LIMITING ============
    const rateLimitKey = `send_onboarding_sms:${authenticatedUserId}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 3600 * 1000) // 20 per hour
    if (!rateLimitResult.allowed) {
      await logAudit({
        user_id: authenticatedUserId,
        action: 'send_onboarding_sms',
        status: 'failed',
        error_message: 'Rate limit exceeded',
        ip_address: ipAddress
      })
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again later.'
      })
    }

    // ============ LAYER 4: INPUT VALIDATION ============
    const body = await readBody(event)
    const { phone, firstName, onboardingToken } = body

    if (!phone || !firstName || !onboardingToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: phone, firstName, onboardingToken'
      })
    }

    // Validate types
    if (typeof phone !== 'string' || typeof firstName !== 'string' || typeof onboardingToken !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid field types'
      })
    }

    // Sanitize inputs
    const sanitizedFirstName = firstName.trim().substring(0, 100)
    if (!sanitizedFirstName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid firstName'
      })
    }

    // Validate UUID format for token
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(onboardingToken)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid onboarding token format'
      })
    }

    // ============ LAYER 5: TOKEN VALIDATION & TENANT ISOLATION ============
    const { data: onboardingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, onboarding_token, onboarding_token_expires, first_name, phone')
      .eq('onboarding_token', onboardingToken)
      .eq('onboarding_status', 'pending')
      .single()

    if (userError || !onboardingUser) {
      await logAudit({
        user_id: authenticatedUserId,
        action: 'send_onboarding_sms',
        status: 'failed',
        error_message: 'Invalid or expired onboarding token',
        ip_address: ipAddress
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid or expired onboarding token'
      })
    }

    // ✅ TENANT ISOLATION: Ensure token belongs to requesting user's tenant
    if (onboardingUser.tenant_id !== tenantId) {
      await logAudit({
        user_id: authenticatedUserId,
        action: 'send_onboarding_sms',
        status: 'failed',
        error_message: 'Cross-tenant access attempt',
        ip_address: ipAddress,
        details: {
          token_tenant_id: onboardingUser.tenant_id,
          requesting_tenant_id: tenantId
        }
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'Invalid token'
      })
    }

    // ============ LAYER 6: TOKEN EXPIRATION CHECK ============
    const expiresAt = new Date(onboardingUser.onboarding_token_expires)
    if (expiresAt < new Date()) {
      await logAudit({
        user_id: authenticatedUserId,
        action: 'send_onboarding_sms',
        status: 'failed',
        error_message: 'Onboarding token expired',
        ip_address: ipAddress
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Onboarding token has expired'
      })
    }

    // Format phone number (ensure +41 format)
    const formattedPhone = formatSwissPhoneNumber(phone)

    // Build onboarding link (force public domain)
    const onboardingLink = `https://simy.ch/onboarding/${onboardingToken}`

    // ============ LAYER 7: LOAD TENANT DATA ============
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, slug, twilio_from_sender')
      .eq('id', tenantId)
      .single()

    let tenantName = tenant?.twilio_from_sender || tenant?.name || 'Driving Team'
    let tenantSlug = tenant?.slug || ''

    // SMS Message with onboarding link and login link
    const loginLink = tenantSlug ? `https://simy.ch/${tenantSlug}` : 'https://simy.ch/login'
    const message = `Hallo ${sanitizedFirstName}! Willkommen bei ${tenantName}. Vervollständige deine Registrierung: ${onboardingLink} (Link 30 Tage gültig). Nach der Registrierung kannst du dich über folgenden Link anmelden: ${loginLink}`

    logger.debug('📱 Sending onboarding SMS:', {
      to: formattedPhone.substring(0, 6) + '****',
      firstName: sanitizedFirstName,
      senderName: tenantName
    })

    // ============ LAYER 8: SEND SMS ============
    let smsResult
    try {
      smsResult = await sendSMS({
        to: formattedPhone,
        message: message,
        senderName: tenantName
      })
    } catch (smsError: any) {
      logger.error('OnboardingSMS', '❌ SMS sending failed:', {
        error: smsError.message,
        errorCode: smsError.code
      })
      await logAudit({
        user_id: authenticatedUserId,
        action: 'send_onboarding_sms',
        status: 'failed',
        error_message: `SMS sending failed: ${smsError.message}`,
        ip_address: ipAddress
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to send SMS'
      })
    }

    logger.debug('✅ Onboarding SMS sent successfully')

    // ============ LAYER 9: LOG SMS & AUDIT ============
    try {
      await supabaseAdmin
        .from('sms_logs')
        .insert({
          to_phone: formattedPhone,
          message: message,
          twilio_sid: smsResult?.messageSid || `onboarding_${Date.now()}`,
          status: 'sent',
          sent_at: new Date().toISOString(),
          purpose: 'student_onboarding'
        })
    } catch (logError) {
      logger.warn('⚠️ Failed to log SMS:', logError)
    }

    await logAudit({
      user_id: authenticatedUserId,
      action: 'send_onboarding_sms',
      resource_type: 'user',
      resource_id: onboardingUser.id,
      status: 'success',
      ip_address: ipAddress,
      details: {
        tenant_id: tenantId,
        phone_masked: formattedPhone.substring(0, 6) + '****',
        duration_ms: Date.now() - startTime
      }
    })

    return {
      success: true,
      message: 'SMS sent successfully',
      phone: formattedPhone.substring(0, 6) + '****' // Masked phone
    }

  } catch (error: any) {
    logger.error('❌ Error in send-onboarding-sms:', error)

    const errorMessage = error.statusMessage || error.message || 'Internal server error'
    const statusCode = error.statusCode || 500

    await logAudit({
      user_id: authenticatedUserId,
      action: 'send_onboarding_sms',
      status: 'error',
      error_message: errorMessage,
      ip_address: ipAddress
    })

    throw createError({
      statusCode,
      statusMessage: errorMessage
    })
  }
})

// Helper: Format Swiss phone number
function formatSwissPhoneNumber(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // If starts with 0, replace with +41
  if (cleaned.startsWith('0')) {
    cleaned = '+41' + cleaned.substring(1)
  }

  // If starts with 41, add +
  if (cleaned.startsWith('41') && !cleaned.startsWith('+41')) {
    cleaned = '+' + cleaned
  }

  // If no prefix, add +41
  if (!cleaned.startsWith('+')) {
    cleaned = '+41' + cleaned
  }

  return cleaned
}

/**
 * SECURITY LAYERS IMPLEMENTED:
 *
 * Layer 1: AUTHENTICATION ✅
 *   - JWT token validation via Supabase
 *   - Bearer token extraction
 *
 * Layer 2: AUTHORIZATION ✅
 *   - Only admin/staff/tenant_admin/superadmin can send SMS
 *   - Role-based access control
 *
 * Layer 3: RATE LIMITING ✅
 *   - Max 20 requests per hour per user
 *   - Prevents SMS flooding/abuse
 *
 * Layer 4: INPUT VALIDATION ✅
 *   - All fields required (phone, firstName, onboardingToken)
 *   - Type checking (string validation)
 *   - Input sanitization (firstName limited to 100 chars)
 *   - UUID format validation for token
 *
 * Layer 5: TOKEN VALIDATION & TENANT ISOLATION ✅
 *   - Token must exist and be valid
 *   - User must be in pending onboarding status
 *   - Token's tenant_id must match requesting user's tenant_id
 *   - Prevents cross-tenant access
 *
 * Layer 6: TOKEN EXPIRATION CHECK ✅
 *   - Validates token hasn't expired
 *   - Returns error for expired tokens
 *
 * Layer 7: TENANT DATA LOADING ✅
 *   - Loads tenant-specific SMS sender name
 *   - Loads tenant slug for login link
 *
 * Layer 8: SMS SENDING ✅
 *   - Proper error handling
 *   - No sensitive data in responses
 *
 * Layer 9: AUDIT LOGGING & SMS LOGGING ✅
 *   - Logs all SMS sends to database
 *   - Logs who initiated the request
 *   - Logs IP address
 *   - Logs success/failure
 *   - Masks phone numbers in logs
 *
 * Layer 10: RESPONSE SECURITY ✅
 *   - Phone numbers masked with asterisks
 *   - No token or onboardingLink returned
 *   - No sensitive data in response
 */
