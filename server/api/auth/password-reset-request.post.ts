import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateRegistrationEmail } from '~/server/utils/email-validator'
import { logger } from '~/utils/logger'
import { sendSMS } from '~/server/utils/sms'
import { validateRequiredString, throwValidationError } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  try {
    // Get client IP for rate limiting
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                      getHeader(event, 'x-real-ip') || 
                      event.node.req.socket.remoteAddress || 
                      'unknown'
    
    logger.debug('🔐 Password reset request from IP:', ipAddress)
    
    // Parse body first for validation and rate limiting
    const body = await readBody(event)
    const { contact, method, tenantId } = body

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
      console.warn('⚠️ Password reset rate limit exceeded for IP:', ipAddress)
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Versuche. Bitte versuchen Sie es später erneut.'
      })
    }
    logger.debug('✅ Rate limit check passed. Remaining:', rateLimit.remaining)

    // Normalize method: 'phone' -> 'sms'
    const normalizedMethod = method === 'phone' ? 'sms' : method

    // Validate email format if method is email
    if (method === 'email') {
      const emailValidation = validateRegistrationEmail(contact)
      if (!emailValidation.valid) {
        console.warn('⚠️ Email validation failed:', emailValidation.reason)
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
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Find user by email or phone
    logger.debug(`🔍 Looking up user by ${method}:`, contact)
    
    let user = null
    let userError = null
    
    if (method === 'email') {
      // Email should be unique - use .single()
      const { data, error } = await serviceSupabase
        .from('users')
        .select('id, auth_user_id, email, phone, tenant_id')
        .eq('email', contact.toLowerCase().trim())
        .eq('is_active', true)
        .single()
      
      user = data
      userError = error
    } else {
      // ✅ FIX: Phone might not be unique! Use .limit(1) to get first match
      const { data, error } = await serviceSupabase
        .from('users')
        .select('id, auth_user_id, email, phone, tenant_id')
        .eq('phone', contact)
        .eq('is_active', true)
        .order('created_at', { ascending: false })  // Get most recent user
        .limit(1)
      
      if (!error && data && data.length > 0) {
        user = data[0]
        userError = null
      } else {
        userError = error
      }
    }

    // If phone number not found, try with different formatting
    if ((userError || !user) && method === 'sms') {
      logger.debug(`⚠️ Phone not found with exact format, trying normalized format...`)
      
      // Remove all non-digit characters except leading +
      const normalizedPhone = contact.replace(/[^\d+]/g, '')
      logger.debug(`🔍 Trying normalized phone:`, normalizedPhone)
      
      // ✅ FIX: Use .limit(1) instead of .single() to handle multiple matches gracefully
      const { data: phoneUsers, error: phoneError } = await serviceSupabase
        .from('users')
        .select('id, auth_user_id, email, phone, tenant_id')
        .eq('phone', normalizedPhone)
        .eq('is_active', true)
        .limit(1)
      
      if (!phoneError && phoneUsers && phoneUsers.length > 0) {
        user = phoneUsers[0]
        userError = null
        logger.debug(`✅ Found user with normalized phone format`)
      } else {
        logger.debug(`ℹ️ No active user found with phone: ${normalizedPhone}`)
      }
    }

    if (userError || !user) {
      // Don't reveal if user exists (security)
      logger.debug(`ℹ️ No user found for ${method}: ${contact}`)
      logger.debug(`User lookup error:`, userError?.message)
      // Still return success to prevent user enumeration
      return { success: true, message: 'Falls ein Account mit diesen Angaben existiert, erhalten Sie einen Magic Link.' }
    }

    logger.debug('✅ User found:', user.id)
    
    // Load tenant slug if user has tenant_id
    let tenantSlug: string | null = null
    if (user.tenant_id) {
      const { data: tenant, error: tenantError } = await serviceSupabase
        .from('tenants')
        .select('slug')
        .eq('id', user.tenant_id)
        .single()
      
      if (!tenantError && tenant?.slug) {
        tenantSlug = tenant.slug
        logger.debug('🏢 Found tenant slug:', tenantSlug)
      }
    }

    // Generate secure random token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    logger.debug('🔐 Creating password reset token...')
    
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
      console.error('❌ Failed to create reset token:', insertError)
      console.error('❌ Insert error details:', {
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

    logger.debug('✅ Reset token created')

    // Build reset link with tenant slug if available
    const protocol = getHeader(event, 'x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const host = getHeader(event, 'host') || 'localhost:3000'
    const tenantParam = tenantSlug ? `&tenant=${tenantSlug}` : ''
    const resetLink = `${protocol}://${host}/password-reset?token=${token}${tenantParam}`

    // Track if sending failed
    let sendingFailed = false
    let failureReason = ''

    // Send magic link via email or SMS
    if (normalizedMethod === 'email') {
      logger.debug('📧 Sending password reset email to:', user.email)
      
      try {
        const emailHtml = `
          <h2>Passwort zurücksetzen</h2>
          <p>Hallo ${user.email?.split('@')[0]},</p>
          <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den Link unten, um Ihr Passwort zu ändern:</p>
          <p>
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Passwort zurücksetzen
            </a>
          </p>
          <p>Dieser Link ist 1 Stunde lang gültig.</p>
          <p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
          <p>Beste Grüße<br>Ihr Team</p>
        `
        
        const emailText = `Passwort zurücksetzen\n\nHallo,\n\nSie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Öffnen Sie bitte diesen Link:\n\n${resetLink}\n\nDieser Link ist 1 Stunde lang gültig.\n\nFalls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.`
        
        // Use service role for edge function invocation
        const { data: emailResult, error: emailError } = await serviceSupabase.functions.invoke('send-email', {
          body: {
            to: user.email,
            subject: 'Passwort zurücksetzen',
            html: emailHtml,
            body: emailText
          },
          method: 'POST'
        })
        
        if (emailError) {
          console.error('❌ Email sending via send-email failed:', emailError)
          throw emailError
        }
        
        logger.debug('✅ Password reset email sent successfully')
      } catch (emailError: any) {
        console.error('❌ Email sending failed:', emailError)
        console.error('❌ Email error details:', {
          message: emailError?.message,
          cause: emailError?.cause,
          status: emailError?.status,
          data: emailError?.data
        })
        // Don't fail the whole process - token is created, email just failed
        logger.debug('⚠️ Continuing despite email error - token still valid')
        sendingFailed = true
        failureReason = 'email_send_failed'
      }
    } else if (normalizedMethod === 'sms') {
      logger.debug('📱 Sending password reset SMS to:', user.phone)
      
      try {
        const smsMessage = `Ihr Passwort-Reset-Link: ${resetLink}. Dieser Link ist 1 Stunde gültig.`
        
        // Load tenant SMS sender name
        let tenantName = ''
        try {
          const { data: tenantData } = await serviceSupabase
            .from('tenants')
            .select('name, twilio_from_sender')
            .eq('id', user.tenant_id)
            .single()
          
          if (tenantData?.twilio_from_sender) {
            tenantName = tenantData.twilio_from_sender
            logger.debug('📱 Using twilio_from_sender:', tenantName)
          } else if (tenantData?.name) {
            tenantName = tenantData.name
            logger.debug('📱 Fallback to tenant name:', tenantName)
          }
        } catch (tenantError) {
          logger.warn('⚠️ Could not load tenant name:', tenantError)
        }
        
        // Use local sendSMS function with Alphanumeric Sender ID support
        const smsResult = await sendSMS({
          to: user.phone!,
          message: smsMessage,
          senderName: tenantName
        })
        
        logger.debug('✅ Password reset SMS sent successfully:', smsResult)
      } catch (smsError: any) {
        console.error('❌ SMS sending failed:', smsError)
        console.error('❌ SMS error details:', {
          message: smsError?.message,
          cause: smsError?.cause,
          status: smsError?.status
        })
        // Don't fail the whole process - token is created, SMS just failed
        logger.debug('⚠️ Continuing despite SMS error - token still valid')
        sendingFailed = true
        failureReason = 'sms_send_failed'
      }
    }

    logger.debug('✅ Password reset link sent successfully')

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
      logger.debug('⚠️ Returning success with warning due to:', failureReason)
    }

    return response

  } catch (error: any) {
    console.error('❌ Password reset request error:', error)
    console.error('❌ Error details:', {
      message: error?.message,
      status: error?.status,
      statusCode: error?.statusCode,
      statusMessage: error?.statusMessage,
      stack: error?.stack
    })
    throw error
  }
})

