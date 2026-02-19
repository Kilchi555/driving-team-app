import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateRegistrationEmail } from '~/server/utils/email-validator'
import { sendSMS } from '~/server/utils/sms'
import { validateRequiredString, throwValidationError } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  try {
    // Get client IP for rate limiting
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                      getHeader(event, 'x-real-ip') || 
                      event.node.req.socket.remoteAddress || 
                      'unknown'
    
    console.log('[PasswordReset] Request received from IP:', ipAddress)
    
    // Parse body first for validation and rate limiting
    const body = await readBody(event)
    const { contact, method, tenantId } = body

    console.log('[PasswordReset] Request params:', { method, tenantId, contactProvided: !!contact })

    // Validate input
    const errors: Record<string, string> = {}
    
    const contactValidation = validateRequiredString(contact, 'E-Mail oder Telefonnummer', 255)
    if (!contactValidation.valid) {
      errors.contact = contactValidation.error!
    }
    
    if (!method || !['email', 'phone', 'sms'].includes(String(method).toLowerCase())) {
      errors.method = 'Methode muss "email" oder "phone" sein'
    }
    
    if (Object.keys(errors).length > 0) {
      throwValidationError(errors)
    }
    
    // Apply rate limiting (max 5 attempts per 15 minutes)
    const rateLimit = await checkRateLimit(ipAddress, 'password_reset', 5, 15 * 60 * 1000, contact, tenantId)
    if (!rateLimit.allowed) {
      console.warn('[PasswordReset] ⚠️ Rate limit exceeded for IP:', ipAddress)
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Versuche. Bitte versuchen Sie es später erneut.'
      })
    }
    console.log('[PasswordReset] Rate limit check passed. Remaining:', rateLimit.remaining)

    // Normalize method: 'phone' -> 'sms'
    const normalizedMethod = method === 'phone' ? 'sms' : method

    // Validate email format if method is email
    if (method === 'email') {
      const emailValidation = validateRegistrationEmail(contact)
      if (!emailValidation.valid) {
        console.warn('[PasswordReset] ⚠️ Email validation failed:', emailValidation.reason)
        throw createError({
          statusCode: 400,
          statusMessage: 'Ungültige E-Mail-Adresse'
        })
      }
    }

    // Create service role client to bypass RLS
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('[PasswordReset] ❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Find user by email or phone
    console.log(`[PasswordReset] Looking up user by ${method}:`, method === 'email' ? contact : '[phone redacted]')
    
    let user = null
    let userError = null
    
    if (method === 'email') {
      const { data, error } = await serviceSupabase
        .from('users')
        .select('id, auth_user_id, email, phone, tenant_id')
        .eq('email', contact.toLowerCase().trim())
        .eq('is_active', true)
        .single()
      
      user = data
      userError = error
      console.log('[PasswordReset] Email lookup result:', { found: !!data, error: error?.code || error?.message || null })
    } else {
      const { data, error } = await serviceSupabase
        .from('users')
        .select('id, auth_user_id, email, phone, tenant_id')
        .eq('phone', contact)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (!error && data && data.length > 0) {
        user = data[0]
        userError = null
        console.log('[PasswordReset] Phone lookup result: found', data.length, 'user(s)')
      } else {
        userError = error
        console.log('[PasswordReset] Phone lookup result:', { found: false, error: error?.code || error?.message || null })
      }
    }

    // If phone number not found, try with different formatting
    if ((userError || !user) && method === 'sms') {
      console.log('[PasswordReset] Phone not found with exact format, trying normalized format...')
      
      const normalizedPhone = contact.replace(/[^\d+]/g, '')
      console.log('[PasswordReset] Trying normalized phone format (digits only, +41 preserved)')
      
      const { data: phoneUsers, error: phoneError } = await serviceSupabase
        .from('users')
        .select('id, auth_user_id, email, phone, tenant_id')
        .eq('phone', normalizedPhone)
        .eq('is_active', true)
        .limit(1)
      
      if (!phoneError && phoneUsers && phoneUsers.length > 0) {
        user = phoneUsers[0]
        userError = null
        console.log('[PasswordReset] Found user with normalized phone format')
      } else {
        console.log('[PasswordReset] No user found with normalized phone format either')
      }
    }

    if (userError || !user) {
      // Don't reveal if user exists (security) - but log it server-side
      console.log(`[PasswordReset] No active user found for ${method} — returning generic success (security)`)
      console.log('[PasswordReset] DB error if any:', userError?.code || userError?.message || 'none')
      // Still return success to prevent user enumeration
      return { success: true, message: 'Falls ein Account mit diesen Angaben existiert, erhalten Sie einen Magic Link.' }
    }

    console.log('[PasswordReset] ✅ User found:', { userId: user.id, hasTenantId: !!user.tenant_id })
    
    // Load tenant info
    let tenantSlug: string | null = null
    let tenantName: string | null = null
    let tenantFromSender: string | null = null

    // Use tenantId from request if provided, otherwise fall back to user's tenant_id
    const resolvedTenantId = tenantId || user.tenant_id

    if (resolvedTenantId) {
      const { data: tenant, error: tenantError } = await serviceSupabase
        .from('tenants')
        .select('slug, name, twilio_from_sender, contact_email')
        .eq('id', resolvedTenantId)
        .single()
      
      if (!tenantError && tenant) {
        tenantSlug = tenant.slug
        tenantName = tenant.name
        tenantFromSender = tenant.twilio_from_sender || tenant.name
        console.log('[PasswordReset] Tenant resolved:', { slug: tenantSlug, name: tenantName })
      } else {
        console.warn('[PasswordReset] ⚠️ Could not load tenant:', tenantError?.message || 'Not found', 'tenantId:', resolvedTenantId)
      }
    } else {
      console.warn('[PasswordReset] ⚠️ No tenantId provided and user has no tenant_id')
    }

    // Generate secure random token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    console.log('[PasswordReset] Creating password reset token in DB...')
    
    const { error: insertError } = await serviceSupabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        email: user.email,
        phone: user.phone,
        token,
        reset_method: normalizedMethod,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: getHeader(event, 'user-agent')
      })

    if (insertError) {
      console.error('[PasswordReset] ❌ Failed to create reset token:', {
        message: insertError?.message,
        details: insertError?.details,
        hint: insertError?.hint,
        code: insertError?.code
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Erstellen des Reset-Links: ' + (insertError?.message || 'Unbekannter Fehler')
      })
    }

    console.log('[PasswordReset] ✅ Reset token created in DB, expires:', expiresAt.toISOString())

    // Build reset link
    const protocol = getHeader(event, 'x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const host = getHeader(event, 'host') || 'localhost:3000'
    const tenantParam = tenantSlug ? `&tenant=${tenantSlug}` : ''
    const resetLink = `${protocol}://${host}/password-reset?token=${token}${tenantParam}`

    console.log('[PasswordReset] Reset link built:', { protocol, host, hasTenantParam: !!tenantSlug })

    // Track if sending failed
    let sendingFailed = false
    let failureReason = ''

    // Send magic link via email or SMS
    if (normalizedMethod === 'email') {
      console.log('[PasswordReset] Sending password reset email via Resend to:', user.email)
      
      try {
        const resendApiKey = process.env.RESEND_API_KEY
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'

        if (!resendApiKey) {
          console.error('[PasswordReset] ❌ RESEND_API_KEY not configured!')
          throw new Error('RESEND_API_KEY not configured')
        }

        console.log('[PasswordReset] Resend API key configured:', resendApiKey.substring(0, 8) + '...')

        const { Resend } = await import('resend')
        const resend = new Resend(resendApiKey)

        const displayName = tenantName || 'Driving Team'

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Passwort zurücksetzen</h2>
            <p>Hallo ${user.email?.split('@')[0]},</p>
            <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts bei <strong>${displayName}</strong> gestellt.</p>
            <p>Klicken Sie auf den Button unten, um Ihr Passwort zu ändern:</p>
            <p style="margin: 24px 0;">
              <a href="${resetLink}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Passwort zurücksetzen
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">Dieser Link ist 1 Stunde lang gültig.</p>
            <p style="color: #6b7280; font-size: 14px;">Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
              <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
            </p>
          </div>
        `
        
        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: `${displayName} <${fromEmail}>`,
          to: user.email!,
          subject: 'Passwort zurücksetzen',
          html: emailHtml
        })
        
        if (emailError) {
          console.error('[PasswordReset] ❌ Resend API returned error:', {
            name: emailError.name,
            message: emailError.message
          })
          throw emailError
        }
        
        console.log('[PasswordReset] ✅ Password reset email sent successfully via Resend. Email ID:', emailResult?.id)
      } catch (emailError: any) {
        console.error('[PasswordReset] ❌ Email sending failed:', {
          message: emailError?.message,
          cause: emailError?.cause,
          status: emailError?.status,
          statusCode: emailError?.statusCode,
          data: emailError?.data,
          name: emailError?.name
        })
        sendingFailed = true
        failureReason = 'email_send_failed'
      }
    } else if (normalizedMethod === 'sms') {
      console.log('[PasswordReset] Sending password reset SMS to phone (redacted)')
      
      try {
        const smsMessage = `Ihr Passwort-Reset-Link: ${resetLink}. Dieser Link ist 1 Stunde gültig.`
        
        const smsResult = await sendSMS({
          to: user.phone!,
          message: smsMessage,
          senderName: tenantFromSender || undefined
        })
        
        console.log('[PasswordReset] ✅ Password reset SMS sent successfully:', smsResult)
      } catch (smsError: any) {
        console.error('[PasswordReset] ❌ SMS sending failed:', {
          message: smsError?.message,
          cause: smsError?.cause,
          status: smsError?.status
        })
        sendingFailed = true
        failureReason = 'sms_send_failed'
      }
    }

    if (sendingFailed) {
      console.warn('[PasswordReset] ⚠️ Sending failed. Reason:', failureReason, '— Token was created but message not delivered.')
    } else {
      console.log('[PasswordReset] ✅ Password reset flow completed successfully for method:', normalizedMethod)
    }

    // Return success but include warning if sending failed
    const response: any = {
      success: true,
      message: method === 'email' 
        ? 'Wenn ein Benutzer mit diesen Angaben existiert, wird ihm ein Magic Link gesendet. Bitte überprüfen Sie Ihren Posteingang.'
        : 'Wenn ein Benutzer mit diesen Angaben existiert, wird ihm ein Magic Link gesendet. Bitte überprüfen Sie Ihre SMS.'
    }

    if (sendingFailed) {
      response.warning = true
      response.message = method === 'email'
        ? 'Der Reset-Link wurde erstellt, aber die E-Mail konnte nicht gesendet werden. Bitte kontaktieren Sie den Support oder versuchen Sie es mit einer anderen Methode.'
        : 'Der Reset-Link wurde erstellt, aber die SMS konnte nicht gesendet werden. Bitte versuchen Sie es mit E-Mail oder kontaktieren Sie den Support.'
    }

    return response

  } catch (error: any) {
    console.error('[PasswordReset] ❌ Unhandled error in password reset request:', {
      message: error?.message,
      status: error?.status,
      statusCode: error?.statusCode,
      statusMessage: error?.statusMessage,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n')
    })
    throw error
  }
})
