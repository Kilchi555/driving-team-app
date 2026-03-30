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
        .select('id, auth_user_id, email, phone, tenant_id, first_name, onboarding_token, onboarding_token_expires')
        .eq('email', contact.toLowerCase().trim())
        .eq('is_active', true)
        .single()
      
      user = data
      userError = error
      console.log('[PasswordReset] Email lookup result:', { found: !!data, error: error?.code || error?.message || null })
    } else {
      const { data, error } = await serviceSupabase
        .from('users')
        .select('id, auth_user_id, email, phone, tenant_id, first_name, onboarding_token, onboarding_token_expires')
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
        .select('id, auth_user_id, email, phone, tenant_id, first_name, onboarding_token, onboarding_token_expires')
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
      console.log(`[PasswordReset] No active user found for ${method}`)
      console.log('[PasswordReset] DB error if any:', userError?.code || userError?.message || 'none')
      return { success: false, code: 'NOT_FOUND', method }
    }

    console.log('[PasswordReset] ✅ User found:', { userId: user.id, hasTenantId: !!user.tenant_id })
    
    // Pending user: no auth account exists — create one automatically, then proceed with reset
    if (!user.auth_user_id) {
      console.log('[PasswordReset] User has no auth_user_id (pending) — creating auth user automatically')

      if (!user.email) {
        console.warn('[PasswordReset] ⚠️ Cannot create auth user: no email on record')
        return { success: false, code: 'NO_EMAIL', method }
      }

      try {
        const { data: newAuthUser, error: createError } = await serviceSupabase.auth.admin.createUser({
          email: user.email,
          email_confirm: true,
        })

        if (createError || !newAuthUser?.user?.id) {
          console.error('[PasswordReset] ❌ Failed to create auth user:', createError?.message)
          // Fallback: re-send onboarding SMS if possible
          if (user.phone && user.onboarding_token) {
            let token = user.onboarding_token
            const expires = user.onboarding_token_expires ? new Date(user.onboarding_token_expires) : null
            if (!expires || expires < new Date()) {
              const { v4: uuidv4 } = await import('uuid')
              token = uuidv4()
              const newExpires = new Date()
              newExpires.setDate(newExpires.getDate() + 30)
              await serviceSupabase.from('users').update({ onboarding_token: token, onboarding_token_expires: newExpires.toISOString() }).eq('id', user.id)
            }
            const baseUrl = process.env.NUXT_PUBLIC_APP_URL || 'https://simy.ch'
            const tenantSlugFallback = tenantId ? (await serviceSupabase.from('tenants').select('slug').eq('id', tenantId).single()).data?.slug : ''
            const onboardingUrl = `${baseUrl}/onboarding/${token}`
            const loginLink = tenantSlugFallback ? `https://simy.ch/${tenantSlugFallback}` : 'https://simy.ch/login'
            const smsMessage = `Bitte vervollständige zuerst deine Registrierung:\n\n${onboardingUrl}\n\nDanach kannst du dich hier anmelden:\n${loginLink}`
            try { await sendSMS({ to: user.phone, message: smsMessage }) } catch { /* ignore */ }
          }
          return { success: true, code: 'ACCOUNT_PENDING', hasSms: !!(user.phone && user.onboarding_token) }
        }

        // Link the new auth user to the existing public.users record
        const { error: updateError } = await serviceSupabase
          .from('users')
          .update({ auth_user_id: newAuthUser.user.id })
          .eq('id', user.id)

        if (updateError) {
          console.error('[PasswordReset] ❌ Failed to link auth user to public.users:', updateError.message)
          return { success: true, code: 'ACCOUNT_PENDING', hasSms: false }
        }

        // Patch the user object so the rest of the flow proceeds normally
        user = { ...user, auth_user_id: newAuthUser.user.id }
        console.log('[PasswordReset] ✅ Auth user created and linked:', newAuthUser.user.id)
      } catch (err: any) {
        console.error('[PasswordReset] ❌ Unexpected error creating auth user:', err.message)
        return { success: true, code: 'ACCOUNT_PENDING', hasSms: false }
      }
    }
    
    let tenantSlug: string | null = null
    let tenantName: string | null = null
    let tenantFromSender: string | null = null
    let tenantPrimaryColor = '#2563eb'
    let tenantLogoUrl: string | null = null
    let tenantContactEmail: string | null = null

    // Use tenantId from request if provided, otherwise fall back to user's tenant_id
    const resolvedTenantId = tenantId || user.tenant_id

    if (resolvedTenantId) {
      const { data: tenant, error: tenantError } = await serviceSupabase
        .from('tenants')
        .select('slug, name, twilio_from_sender, contact_email, primary_color, logo_wide_url, logo_url, logo_square_url')
        .eq('id', resolvedTenantId)
        .single()
      
      if (!tenantError && tenant) {
        tenantSlug = tenant.slug
        tenantName = tenant.name
        tenantFromSender = tenant.twilio_from_sender || tenant.name
        tenantPrimaryColor = tenant.primary_color || tenantPrimaryColor
        tenantLogoUrl = tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
        tenantContactEmail = tenant.contact_email || null
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
        const greeting = user.first_name ? `Hallo ${user.first_name}` : `Hallo`
        const logoImgTag = tenantLogoUrl
          ? `<img src="${tenantLogoUrl}" alt="${displayName}" style="height:40px;max-width:200px;object-fit:contain;display:block;margin:0 auto;">`
          : `<div style="width:40px;height:40px;border-radius:10px;background:${tenantPrimaryColor};color:white;font-size:20px;font-weight:700;line-height:40px;text-align:center;margin:0 auto;">${displayName.charAt(0).toUpperCase()}</div>`

        const emailHtml = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:32px 10px;">

      <!-- Logo above card -->
      <div style="margin-bottom:20px;text-align:center;">
        ${logoImgTag}
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

        <!-- Colored header -->
        <tr>
          <td style="background:linear-gradient(135deg,${tenantPrimaryColor} 0%,${tenantPrimaryColor}cc 100%);padding:32px 32px 28px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;">
              <!-- Lock icon -->
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:white;">Passwort zurücksetzen</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">${displayName}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">${greeting},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den Button unten, um ein neues Passwort zu wählen.
            </p>

            <!-- CTA Button -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${resetLink}"
                     style="display:inline-block;padding:14px 36px;background:${tenantPrimaryColor};color:white;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.2px;">
                    🔐 Passwort zurücksetzen
                  </a>
                </td>
              </tr>
            </table>

            <!-- Info box -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px;border-left:4px solid ${tenantPrimaryColor};">
              <tr><td style="padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#374151;">
                  ⏱ Dieser Link ist <strong>1 Stunde gültig</strong>. Danach musst du einen neuen Link anfordern.
                </p>
              </td></tr>
            </table>

            <!-- Security note -->
            <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">
              Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert.
            </p>

            <!-- Fallback link -->
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Button funktioniert nicht? Kopiere diesen Link in deinen Browser:<br>
              <a href="${resetLink}" style="color:${tenantPrimaryColor};word-break:break-all;font-size:12px;">${resetLink}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f3f4f6;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              ${displayName}${tenantContactEmail ? ` · <a href="mailto:${tenantContactEmail}" style="color:#9ca3af;">${tenantContactEmail}</a>` : ''}
            </p>
            <p style="margin:4px 0 0;font-size:11px;color:#d1d5db;">Diese E-Mail wurde automatisch generiert.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
        
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
