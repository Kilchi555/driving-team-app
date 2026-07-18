import { getSupabaseAdmin } from '~/utils/supabase'
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { logger } from '~/utils/logger'
import { sendSMS } from '~/server/utils/sms'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { sanitizeString } from '~/server/utils/validators'
import { getPlanById } from '~/utils/planFeatures'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  try {
    // ✅ LAYER 1: Get client IP for audit logging
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                      getHeader(event, 'x-real-ip') || 
                      event.node.req.socket.remoteAddress || 
                      'unknown'

    const body = await readBody(event)
    const { firstName, phone, sendVia } = body

    // Validate required fields
    if (!firstName || !phone) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Vorname und Telefonnummer sind erforderlich'
      })
    }

    // Get current user and tenant
    const supabase = getSupabaseAdmin()
    
    // Get auth token from header
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    // Extract token from "Bearer <token>"
    const authToken = authHeader.replace('Bearer ', '')
    
    // Get user info from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token'
      })
    }

    logger.debug('✅ User authenticated:', user.email, 'User ID:', user.id)

    // ✅ LAYER 3: Rate limiting (10 invitations per hour per admin user)
    const rateLimit = await checkRateLimit(user.id, 'staff_invite', 10, 3600)
    if (!rateLimit.allowed) {
      logger.warn('⚠️ Rate limit exceeded for staff invitation:', user.email)
      throw createError({
        statusCode: 429,
        statusMessage: `Zu viele Einladungen. Bitte warten Sie ${rateLimit.retryAfter} Sekunden.`
      })
    }
    logger.debug('✅ Rate limit check passed. Remaining:', rateLimit.remaining)

    // Create service role client to bypass RLS
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }
    
    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user's tenant_id using service role
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    logger.debug('👤 User profile query result:', { userProfile, profileError })

    if (profileError || !userProfile?.tenant_id) {
      console.error('❌ Profile error:', profileError)
      console.error('❌ User profile data:', userProfile)
      throw createError({
        statusCode: 403,
        statusMessage: `Kein Tenant gefunden für User: ${user.email}`
      })
    }

    logger.debug('✅ User profile found:', userProfile)

    // Check if user is admin
    if (userProfile.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Nur Admins können Einladungen versenden'
      })
    }

    // ✅ SEAT LIMIT CHECK: Verify tenant has room for another staff member
    const { data: tenantSub } = await serviceSupabase
      .from('tenants')
      .select('subscription_plan, addon_seats, is_trial')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantSub) {
      const plan = tenantSub.subscription_plan || 'trial'
      const planDef = getPlanById(plan)
      // Trial gets 3 seats (enough to test multi-staff), paid plans use their definition
      const includedSeats = plan === 'trial' ? 3 : (planDef?.includedSeats ?? null)

      if (includedSeats !== null) {
        const totalAllowedSeats = includedSeats + (tenantSub.addon_seats || 0)

        // Count active staff + admins
        const { count: activeStaff } = await serviceSupabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id)
          .in('role', ['staff', 'admin'])
          .eq('is_active', true)

        // Count pending invitations (they'll use a seat once accepted)
        const { count: pendingInvites } = await serviceSupabase
          .from('staff_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id)
          .eq('status', 'pending')

        const usedSeats = (activeStaff || 0) + (pendingInvites || 0)

        if (usedSeats >= totalAllowedSeats) {
          throw createError({
            statusCode: 402,
            statusMessage: `Seat-Limit erreicht (${usedSeats}/${totalAllowedSeats}). Bitte buchen Sie einen zusätzlichen Fahrlehrer-Seat unter /upgrade.`
          })
        }
      }
    }

    // ✅ LAYER 4: XSS Protection - Sanitize all string inputs
    const sanitizedFirstName = sanitizeString(firstName, 100)
    const sanitizedPhone = sanitizeString(phone, 20)

    // Check: existiert bereits eine offene Einladung für diese Telefonnummer?
    const { data: existingInvite } = await serviceSupabase
      .from('staff_invitations')
      .select('id, status')
      .eq('phone', sanitizedPhone)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingInvite) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Für diese Telefonnummer existiert bereits eine offene Einladung.'
      })
    }

    // Generate invitation token
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days expiration

    logger.debug('🎫 Creating invitation with token:', token.substring(0, 10) + '...')

    // Placeholder email & last_name – instructor fills in real data via onboarding link
    const placeholderEmail = `pending_${token.slice(0, 16)}@invite.simy.ch`

    // Create invitation in database using service role to bypass RLS
    const { data: invitation, error: inviteError } = await serviceSupabase
      .from('staff_invitations')
      .insert({
        tenant_id: userProfile.tenant_id,
        first_name: sanitizedFirstName,
        last_name: '',
        email: placeholderEmail,
        phone: sanitizedPhone,
        invitation_token: token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (inviteError) {
      console.error('❌ Error creating invitation:', inviteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Erstellen der Einladung'
      })
    }

    logger.debug('✅ Invitation created:', invitation.id)

    // ✅ LAYER 5: Audit logging - Invitation created
    await logAudit({
      action: 'staff_invitation_created',
      user_id: user.id,
      tenant_id: userProfile.tenant_id,
      resource_type: 'staff_invitation',
      resource_id: invitation.id,
      ip_address: ipAddress,
      status: 'success',
      details: {
        invited_phone: sanitizedPhone,
        invited_name: sanitizedFirstName,
        send_via: sendVia || 'sms',
        expires_at: expiresAt.toISOString(),
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    // Generate invitation link
    // Priority: 1. Environment variable, 2. Production domain (simy.ch), 3. Request host
    const envBase = process.env.NUXT_PUBLIC_BASE_URL || process.env.BASE_URL
    const forwardedHost = getHeader(event, 'x-forwarded-host')
    const host = forwardedHost || getHeader(event, 'host')
    const proto = getHeader(event, 'x-forwarded-proto') || 'https'
    
    // Prefer production URL over localhost
    let baseUrl: string
    if (envBase) {
      baseUrl = envBase
    } else if (host && !host.includes('localhost')) {
      // Use request host only if it's NOT localhost
      baseUrl = `${proto}://${host}`
    } else {
      // Default to production domain
      baseUrl = 'https://app.simy.ch'
    }
    
    const inviteLink = `${baseUrl}/register/staff?token=${token}`

    // Get tenant info for branding using service role
    const { data: tenant } = await serviceSupabase
      .from('tenants')
      .select('name, contact_email, twilio_from_sender, slug')
      .eq('id', userProfile.tenant_id)
      .single()

    const tenantName = tenant?.name || 'Ihre Fahrschule'
    const smsSenderName = tenant?.twilio_from_sender || tenantName
    const loginLink = tenant?.slug ? `${baseUrl}/${tenant.slug}` : baseUrl

    // Send invitation via SMS
    logger.debug(`📱 Sending SMS to ${sanitizedPhone} with link: ${inviteLink}`)

    try {
      const smsMessage = `Hallo ${sanitizedFirstName}! Sie wurden als Fahrlehrer bei ${tenantName} eingeladen. Registrierung: ${inviteLink}\nLogin nach Registrierung: ${loginLink}`

      const smsResult = await sendSMS({
        to: sanitizedPhone,
        message: smsMessage,
        senderName: smsSenderName
      })

      logger.debug('✅ SMS sent via Twilio:', smsResult)

      await serviceSupabase
        .from('sms_logs')
        .insert({
          to_phone: sanitizedPhone,
          message: smsMessage,
          twilio_sid: smsResult?.messageSid || 'unknown',
          status: 'sent',
          sent_at: new Date().toISOString(),
          tenant_id: userProfile.tenant_id
        })

      return {
        success: true,
        sentVia: 'sms',
        phone: sanitizedPhone,
        inviteLink,
        smsId: smsResult?.messageSid,
        message: 'Einladung per SMS gesendet'
      }

    } catch (smsError: any) {
      console.error('❌ SMS sending failed:', smsError)
      return {
        success: true,
        sentVia: 'sms_failed',
        phone: sanitizedPhone,
        inviteLink,
        message: 'Einladung erstellt, aber SMS konnte nicht gesendet werden. Link: ' + inviteLink
      }
    }

  } catch (error: any) {
    console.error('Error in staff invitation:', error)

    // ✅ LAYER 5: Audit logging - Failure
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    await logAudit({
      action: 'staff_invitation_created',
      tenant_id: (error as any).tenant_id,
      resource_type: 'staff_invitation',
      ip_address: ipAddress,
      status: 'failed',
      error_message: error.statusMessage || error.message,
      details: {
        invited_email: (error as any).email,
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Interner Serverfehler'
    })
  }
})

// Helper function to generate a cryptographically secure random token
function generateToken(): string {
  // Use Web Crypto API for cryptographically secure randomness (ESM compatible)
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  // Convert to base64url (URL-safe)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

