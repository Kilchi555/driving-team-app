import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { checkProgressiveRateLimitWithHistory } from '~/server/utils/progressive-rate-limiter'
import { logger } from '~/utils/logger'
import { validateEmail, throwValidationError } from '~/server/utils/validators'
import { setAuthCookies } from '~/server/utils/cookies'

// Helper function to extract device name from User-Agent
function getDeviceNameFromUserAgent(userAgent: string): string {
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    return 'Mobile Device'
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    return 'Tablet'
  } else if (userAgent.includes('Chrome')) {
    return 'Chrome Browser'
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox Browser'
  } else if (userAgent.includes('Safari')) {
    return 'Safari Browser'
  } else if (userAgent.includes('Edge')) {
    return 'Edge Browser'
  } else {
    return 'Unknown Device'
  }
}

export default defineEventHandler(async (event) => {
  try {
    // Get client IP for rate limiting
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                      getHeader(event, 'x-real-ip') || 
                      event.node.req.socket.remoteAddress || 
                      'unknown'
    
    logger.info('🔐 [LOGIN] New login attempt', {
      ip: ipAddress,
      timestamp: new Date().toISOString()
    })
    
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
    
    // Check if IP is blocked
    try {
      const { data: blockedIp, error } = await adminSupabase
        .from('blocked_ip_addresses')
        .select('id')
        .eq('ip_address', ipAddress)
        .is('unblocked_at', null)
        .single()
      
      if (blockedIp && !error) {
        logger.warn('🚫 [LOGIN] Blocked IP attempted login', {
          ip: ipAddress,
          timestamp: new Date().toISOString()
        })
        throw createError({
          statusCode: 429,
          statusMessage: 'Diese IP-Adresse wurde blockiert. Bitte kontaktieren Sie den Support.'
        })
      }
    } catch (checkError: any) {
      if (checkError.statusCode === 429) {
        throw checkError
      }
      // Ignore "no rows returned" error - just means IP is not blocked
    }
    
    // Parse request body FIRST
    const { email, password, tenantId, rememberMe, captchaToken } = await readBody(event)

    logger.debug('📧 [LOGIN] Parsing credentials', {
      email: email?.substring(0, 3) + '***',
      hasPassword: !!password,
      tenantId: tenantId || 'none',
      hasCaptcha: !!captchaToken
    })

    // Validate input
    const errors: Record<string, string> = {}
    
    if (!email || !email.trim()) {
      errors.email = 'E-Mail ist erforderlich'
    } else if (!validateEmail(email)) {
      errors.email = 'Ungültige E-Mail-Adresse'
    }
    
    if (!password) {
      errors.password = 'Passwort ist erforderlich'
    } else if (password.length < 1) {
      errors.password = 'Passwort kann nicht leer sein'
    } else if (password.length > 500) {
      errors.password = 'Passwort darf maximal 500 Zeichen lang sein'
    }
    
    if (Object.keys(errors).length > 0) {
      logger.warn('❌ [LOGIN] Validation failed', {
        email: email?.substring(0, 3) + '***',
        errors: Object.keys(errors),
        ip: ipAddress
      })
      throwValidationError(errors)
    }
    
    // Verify hCaptcha token if provided
    if (captchaToken) {
      logger.debug('🔐 [LOGIN] Verifying hCaptcha token...')
      const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY
      if (!hcaptchaSecret) {
        logger.error('❌ [LOGIN] HCAPTCHA_SECRET_KEY not configured')
        throw createError({
          statusCode: 500,
          statusMessage: 'Server configuration error'
        })
      }

      const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          secret: hcaptchaSecret,
          response: captchaToken
        }).toString()
      })

      const captchaData = await captchaResponse.json()
      if (!captchaData.success) {
        logger.warn('⚠️ [LOGIN] Captcha verification failed', {
          email: email?.substring(0, 3) + '***',
          errors: captchaData['error-codes'],
          ip: ipAddress
        })
        throw createError({
          statusCode: 400,
          statusMessage: 'Captcha-Verifikation fehlgeschlagen. Bitte versuchen Sie es erneut.'
        })
      }
      logger.debug('✅ [LOGIN] Captcha verified successfully')
    }
    
    // Remember Me: Adjust session duration
    // Default: 1 hour (3600 seconds)
    // Remember Me: 7 days (604800 seconds)
    const sessionDuration = rememberMe ? 604800 : 3600
    logger.debug('🔐 [LOGIN] Session duration:', rememberMe ? '7 days' : '1 hour')
    
    // Apply rate limiting (max 10 attempts per minute) - AFTER parsing email
    const rateLimit = await checkRateLimit(ipAddress, 'login', undefined, undefined, email.toLowerCase().trim(), tenantId)
    if (!rateLimit.allowed) {
      logger.warn('🚫 [LOGIN] Rate limit exceeded', {
        email: email?.substring(0, 3) + '***',
        ip: ipAddress,
        remaining: rateLimit.remaining,
        resetTime: rateLimit.reset
      })
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Anmeldeversuche. Bitte versuchen Sie es in einigen Minuten erneut.',
        data: {
          retryAfter: rateLimit.reset // milliseconds until retry is allowed
        }
      })
    }
    logger.debug('✅ [LOGIN] Rate limit check passed', {
      email: email?.substring(0, 3) + '***',
      remaining: rateLimit.remaining
    })

    // ✅ TENANT VALIDATION: If tenantId provided, log it but don't block login
    // NOTE: Tenant validation should happen AFTER successful auth, not before
    // Blocking before auth prevents users from logging in if their DB record is incorrect
    if (tenantId) {
      logger.info('🏢 [LOGIN] Tenant-specific login attempt', {
        email: email?.substring(0, 3) + '***',
        tenantId,
        ip: ipAddress,
        note: 'Tenant validation deferred to after auth success'
      })
    }

    // Use anon client for login (as frontend would)
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const supabase = createClient(supabaseUrl, supabaseAnonKey!)

    logger.debug('🔑 Attempting login for email:', email.substring(0, 3) + '***')

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password
    })

    if (error) {
      logger.warn('❌ [LOGIN] Login failed - invalid credentials', {
        email: email?.substring(0, 3) + '***',
        ip: ipAddress,
        tenantId: tenantId || 'none'
      })
      
      // Record failed login and check if MFA/lockout needed
      try {
        const { data: securityUpdate, error: secUpdateError } = await adminSupabase
          .rpc('record_failed_login', {
            p_email: email.toLowerCase().trim(),
            p_ip_address: ipAddress,
            p_tenant_id: tenantId
          })

        if (!secUpdateError && securityUpdate && securityUpdate.length > 0) {
          const updateResult = securityUpdate[0]
          
          // If we should block this IP, insert a blocked_ip record
          if (updateResult.should_block_ip) {
            try {
              await adminSupabase
                .from('blocked_ip_addresses')
                .insert({
                  ip_address: ipAddress,
                  reason: 'Too many failed login attempts across multiple accounts',
                  blocked_at: new Date().toISOString()
                })
                .throwOnError()
              logger.warn('🚫 [LOGIN] IP blocked due to suspicious activity', {
                ip: ipAddress,
                reason: 'Multiple failed attempts',
                severity: 'HIGH'
              })
            } catch (blockError) {
              logger.warn('⚠️ [LOGIN] Failed to block IP:', blockError)
            }
          }
          
          // If account should be locked
          if (updateResult.lock_account) {
            logger.warn('🔒 [LOGIN] Account locked due to failed attempts', {
              email: email?.substring(0, 3) + '***',
              ip: ipAddress,
              severity: 'HIGH'
            })
            throw createError({
              statusCode: 423,
              statusMessage: 'Ihr Account wurde temporär gesperrt aufgrund zu vieler fehlgeschlagener Anmeldeversuche. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.'
            })
          }

          // If MFA is required - but only AFTER successful authentication!
          // If credentials are wrong, we should never return requiresMFA
          // This check happens in the error block, so just log and continue to throw 401
          if (updateResult.require_mfa) {
            logger.warn('⚠️ [LOGIN] MFA would be required but credentials are invalid', {
              email: email?.substring(0, 3) + '***',
              ip: ipAddress
            })
            // Don't return - credentials are wrong, so throw 401 error
          }
        }
      } catch (secError: any) {
        if (secError.statusCode) {
          throw secError
        }
        logger.warn('⚠️ [LOGIN] Failed to record failed login:', secError.message)
      }
      
      // Log failed attempt for security monitoring
      try {
        await adminSupabase
          .from('login_attempts')
          .insert({
            email: email.toLowerCase().trim(),
            ip_address: ipAddress,
            success: false,
            error_message: error.message,
            attempted_at: new Date().toISOString()
          })
          .throwOnError()
      } catch (logError: any) {
        console.warn('⚠️ Failed to log login attempt:', logError.message)
      }

      throw createError({
        statusCode: 401,
        statusMessage: error.message || 'Anmeldung fehlgeschlagen'
      })
    }

    if (!data.user || !data.session) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Anmeldung fehlgeschlagen'
      })
    }

    logger.info('✅ [LOGIN] Successful login', {
      email: email?.substring(0, 3) + '***',
      userId: data.user.id,
      ip: ipAddress,
      tenantId: tenantId || 'none',
      rememberMe,
      timestamp: new Date().toISOString()
    })

    // Get user agent and IP for device verification
    const userAgent = getHeader(event, 'user-agent') || 'Unknown'
    const clientIp = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                     getHeader(event, 'x-real-ip') || 
                     event.node.req.socket.remoteAddress || 
                     'unknown'

    // Set httpOnly cookies for session (secure, XSS-protected)
    setAuthCookies(event, data.session.access_token, data.session.refresh_token, {
      rememberMe,
      maxAge: sessionDuration
    })
    logger.debug('🍪 [LOGIN] Session cookies set (httpOnly, secure, sameSite)')

    // Queue device verification email (run in background, don't block response)
    // Generate simple MAC-like fingerprint from user agent hash
    let userAgentHash = ''
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(userAgent)
      const hashArray = Array.from(data)
      userAgentHash = hashArray
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 16)
    } catch (hashError) {
      logger.warn('⚠️ Failed to generate user agent hash:', hashError)
      userAgentHash = 'unknown'
    }

    // Try to send device verification email (best effort, non-blocking)
    // This runs asynchronously without waiting
    (async () => {
      try {
        logger.debug('📱 Checking device and sending verification email if new...')
        
        // Get geolocation for IP
        const { getIPLocation, isSuspiciousLocation } = await import('~/server/utils/geolocation')
        const geoData = await getIPLocation(clientIp)
        
        // Check if device is already known
        const { data: existingDevice } = await adminSupabase
          .from('user_devices')
          .select('id, is_trusted, latitude, longitude, last_seen')
          .eq('user_id', data.user.id)
          .eq('mac_address', userAgentHash)
          .single()

        if (existingDevice) {
          logger.debug('✅ Known device - updating last_seen')
          
          // Check for suspicious location
          let suspiciousLogin = false
          if (geoData && existingDevice.latitude && existingDevice.longitude) {
            const suspicionCheck = isSuspiciousLocation(
              existingDevice.latitude,
              existingDevice.longitude,
              new Date(existingDevice.last_seen),
              geoData.latitude,
              geoData.longitude
            )
            
            if (suspicionCheck.suspicious) {
              logger.warn('🚨 SUSPICIOUS LOGIN DETECTED:', suspicionCheck.reason)
              suspiciousLogin = true
            }
          }
          
          // Update last_seen and geo data
          await adminSupabase
            .from('user_devices')
            .update({ 
              last_seen: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...(geoData && {
                country: geoData.country,
                country_code: geoData.countryCode,
                region: geoData.region,
                city: geoData.city,
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                timezone: geoData.timezone,
                isp: geoData.isp
              })
            })
            .eq('id', existingDevice.id)
          
          // If suspicious, send warning email even though device is known
          if (suspiciousLogin) {
            // TODO: Send suspicious login email
            logger.warn('⚠️ Suspicious login - would send warning email')
          }
          
          return
        }

        // New device - register and send email
        logger.debug('🆕 New device detected - registering and sending verification email')

        // Register device with geolocation
        const { data: newDevice } = await adminSupabase
          .from('user_devices')
          .insert({
            user_id: data.user.id,
            mac_address: userAgentHash,
            device_name: getDeviceNameFromUserAgent(userAgent),
            user_agent: userAgent,
            ip_address: clientIp,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            is_trusted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...(geoData && {
              country: geoData.country,
              country_code: geoData.countryCode,
              region: geoData.region,
              city: geoData.city,
              latitude: geoData.latitude,
              longitude: geoData.longitude,
              timezone: geoData.timezone,
              isp: geoData.isp
            })
          })
          .select()
          .single()

        if (!newDevice) {
          logger.warn('⚠️ Could not register new device')
          return
        }

        // Get user email - use the email from the login data
        const userEmail = data.user.email
        if (!userEmail) {
          logger.warn('⚠️ No email found in user data')
          return
        }

        // Get user details from public.users table for first_name and tenant
        const { data: userData } = await adminSupabase
          .from('users')
          .select('first_name, tenant_id')
          .eq('email', userEmail)
          .single()

        const firstName = userData?.first_name || 'dort'

        // Get tenant name
        let tenantName = 'Simy'
        if (userData.tenant_id) {
          const { data: tenantData } = await adminSupabase
            .from('tenants')
            .select('name')
            .eq('id', userData.tenant_id)
            .single()
          if (tenantData?.name) {
            tenantName = tenantData.name
          }
        }

        // Send email using sendEmail utility
        const { sendEmail } = await import('~/server/utils/email')
        
        const deviceName = getDeviceNameFromUserAgent(userAgent)
        
        // Format time in Swiss timezone (or user's timezone if available)
        const timezone = geoData?.timezone || 'Europe/Zurich'
        const loginTime = new Date().toLocaleString('de-CH', { 
          timeZone: timezone,
          dateStyle: 'long',
          timeStyle: 'short'
        })
        
        const location = geoData 
          ? `${geoData.city || 'Unbekannt'}, ${geoData.country || 'Unbekannt'}`
          : 'Unbekannt'

        // Create mailto link with pre-filled content for suspicious login report
        const reportBody = encodeURIComponent(
          `VERDÄCHTIGE ANMELDUNG MELDEN\n\n` +
          `Ich habe diese Anmeldung NICHT durchgeführt:\n\n` +
          `Gerät: ${deviceName}\n` +
          `Zeit: ${loginTime}\n` +
          `Standort: ${location}\n` +
          `IP-Adresse: ${clientIp}\n` +
          `${geoData?.isp ? `Internet Anbieter: ${geoData.isp}\n` : ''}` +
          `\n` +
          `Bitte sperren Sie meinen Account sofort.`
        )
        const mailtoLink = `mailto:info@simy.ch?subject=VERDÄCHTIGE ANMELDUNG&body=${reportBody}`

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Neues Gerät erkannt</h2>
            <p>Hallo ${firstName},</p>
            <p>Wir haben eine erfolgreiche Anmeldung von einem neuen Gerät in Ihrem Account erkannt.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0 0 10px 0;"><strong>Anmeldungsdetails:</strong></p>
              <p style="margin: 5px 0;"><strong>Gerät:</strong> ${deviceName}</p>
              <p style="margin: 5px 0;"><strong>Zeit:</strong> ${loginTime}</p>
              <p style="margin: 5px 0;"><strong>Standort:</strong> ${location}</p>
              <p style="margin: 5px 0;"><strong>IP-Adresse:</strong> ${clientIp}</p>
              ${geoData?.isp ? `<p style="margin: 5px 0;"><strong>Internet Anbieter:</strong> ${geoData.isp}</p>` : ''}
            </div>
            
            <p style="color: #27ae60; font-weight: bold;">✓ Falls Sie das waren:</p>
            <p style="margin: 10px 0;">Sie können diese E-Mail einfach ignorieren. Das Gerät ist jetzt gespeichert.</p>
            
            <p style="color: #e74c3c; font-weight: bold;">✗ Falls Sie das NICHT waren:</p>
            <p style="margin: 10px 0;">Ihr Account könnte kompromittiert sein. Bitte kontaktieren Sie uns sofort:</p>
            <p style="margin: 15px 0;">
              <a href="${mailtoLink}" style="background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                Verdächtige Anmeldung melden
              </a>
            </p>
            <p style="color: #6b7280; font-size: 13px;">
              Oder direkt an: <a href="${mailtoLink}" style="color: #2563eb;">info@simy.ch</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Dies ist eine automatische Sicherheitsmitteilung von ${tenantName}. Bitte antworten Sie nicht auf diese E-Mail.
            </p>
          </div>
        `

        const emailText = `
Neues Gerät erkannt

Hallo ${userData.first_name},

Wir haben eine erfolgreiche Anmeldung von einem neuen Gerät in Ihrem Account erkannt.

ANMELDUNGSDETAILS:
- Gerät: ${deviceName}
- Zeit: ${loginTime}
- Standort: ${location}
- IP-Adresse: ${clientIp}${geoData?.isp ? `\n- Internet Anbieter: ${geoData.isp}` : ''}

FALLS SIE DAS WAREN:
Sie können diese E-Mail einfach ignorieren. Das Gerät ist jetzt gespeichert.

FALLS SIE DAS NICHT WAREN:
Ihr Account könnte kompromittiert sein. Bitte kontaktieren Sie uns sofort:
Email: info@simy.ch

---
Dies ist eine automatische Sicherheitsmitteilung von ${tenantName}.
        `

        await sendEmail({
          to: userEmail,
          subject: `${tenantName} - Anmeldung von neuem Gerät`,
          html: emailHtml,
          text: emailText
        })

        logger.debug('✅ Device verification email sent successfully')
      } catch (deviceError: any) {
        logger.warn('⚠️ Device verification failed (non-blocking):', deviceError?.message)
        // Don't fail login if device verification fails
      }
    })().catch((err: any) => {
      logger.warn('⚠️ Async device verification error:', err)
    })

    // Reset failed login attempts on successful login
    try {
      await adminSupabase
        .rpc('reset_failed_login_attempts', {
          p_user_id: data.user.id
        })
        .throwOnError()
      logger.debug('✅ Failed login attempts reset for user:', data.user.id)
    } catch (resetError: any) {
      console.warn('⚠️ Failed to reset login attempts:', resetError.message)
      // Don't fail the login for this
    }

    // Fetch user profile from database (needed for frontend state)
    let userProfile = null
    try {
      const { data: profileData, error: profileError } = await adminSupabase
        .from('users')
        .select('id, email, role, first_name, last_name, phone, tenant_id, is_active, preferred_payment_method, password_strength_version')
        .eq('auth_user_id', data.user.id)
        .eq('is_active', true)
        .single()
      
      if (!profileError && profileData) {
        userProfile = profileData
        logger.debug('✅ User profile loaded:', profileData.email)
        
        // ✅ NEW: If password meets new strength requirements, auto-upgrade version
        const hasUppercase = /[A-Z]/.test(password)
        const hasLowercase = /[a-z]/.test(password)
        const hasNumbers = /[0-9]/.test(password)
        const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        const isLongEnough = password.length >= 12
        
        const meetsStrictRequirements = hasUppercase && hasLowercase && hasNumbers && hasSpecialChars && isLongEnough
        
        if (meetsStrictRequirements && (!profileData.password_strength_version || profileData.password_strength_version < 2)) {
          logger.info('🚀 [LOGIN] Auto-upgrading password strength version to 2 (password meets all requirements)', {
            userId: data.user.id,
            email: email?.substring(0, 3) + '***'
          })
          
          try {
            await adminSupabase
              .from('users')
              .update({ password_strength_version: 2 })
              .eq('auth_user_id', data.user.id)
            
            // Update the profile object for frontend
            userProfile.password_strength_version = 2
          } catch (upgradeError: any) {
            logger.warn('⚠️ [LOGIN] Failed to auto-upgrade password version:', upgradeError.message)
            // Don't fail login for this
          }
        }
      }
    } catch (profileFetchError: any) {
      console.warn('⚠️ Failed to fetch user profile:', profileFetchError.message)
    }

    // Return user data including tokens for client-side Supabase session
    // Tokens are ALSO in HTTP-Only cookies for server-side API calls
    // We return them here so the client Supabase can make direct queries
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata
      },
      // User profile from database (for frontend state)
      profile: userProfile,
      // Session info WITH tokens for client Supabase
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: sessionDuration,
        expires_at: Math.floor(Date.now() / 1000) + sessionDuration
      },
      rememberMe
    }

  } catch (error: any) {
    console.error('Login error:', error)
    
    // Return error response (createError handles the rest)
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
    })
  }
})
