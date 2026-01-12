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
    
    logger.debug('🔐 Login attempt from IP:', ipAddress)
    
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
        logger.debug('🚫 Blocked IP detected:', ipAddress)
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
      throwValidationError(errors)
    }
    
    // Verify hCaptcha token if provided
    if (captchaToken) {
      logger.debug('🔐 Verifying hCaptcha token...')
      const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY
      if (!hcaptchaSecret) {
        console.error('❌ HCAPTCHA_SECRET_KEY not configured')
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
        console.warn('⚠️ hCaptcha verification failed:', captchaData['error-codes'])
        throw createError({
          statusCode: 400,
          statusMessage: 'Captcha-Verifikation fehlgeschlagen. Bitte versuchen Sie es erneut.'
        })
      }
      logger.debug('✅ hCaptcha verified successfully')
    }
    
    // Remember Me: Adjust session duration
    // Default: 1 hour (3600 seconds)
    // Remember Me: 7 days (604800 seconds)
    const sessionDuration = rememberMe ? 604800 : 3600
    logger.debug('🔐 Session duration:', rememberMe ? '7 days' : '1 hour')
    
    // Apply rate limiting (max 10 attempts per minute) - AFTER parsing email
    const rateLimit = await checkRateLimit(ipAddress, 'login', undefined, undefined, email.toLowerCase().trim(), tenantId)
    if (!rateLimit.allowed) {
      console.warn('⚠️ Login rate limit exceeded for IP:', ipAddress)
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Anmeldeversuche. Bitte versuchen Sie es in einigen Minuten erneut.',
        data: {
          retryAfter: rateLimit.reset // milliseconds until retry is allowed
        }
      })
    }
    logger.debug('✅ Rate limit check passed. Remaining attempts:', rateLimit.remaining)

    // ✅ TENANT VALIDATION: If tenantId provided, validate user belongs to that tenant
    if (tenantId) {
      logger.debug('🏢 Tenant-specific login, validating user belongs to tenant:', tenantId)
      
      try {
        const { data: user, error: userError } = await adminSupabase
          .from('users')
          .select('id, tenant_id')
          .eq('email', email.toLowerCase().trim())
          .eq('is_active', true)
          .single()
        
        if (userError || !user) {
          // User doesn't exist or is inactive
          logger.debug('❌ User not found or inactive')
          
          // Record failed login attempt
          try {
            await adminSupabase.rpc('record_failed_login', {
              p_email: email.toLowerCase().trim(),
              p_ip_address: ipAddress,
              p_tenant_id: tenantId
            })
          } catch (recordError: any) {
            console.warn('⚠️ Failed to record failed login:', recordError.message)
          }
          
          throw createError({
            statusCode: 401,
            statusMessage: 'Ungültige Anmeldedaten'  // Generic error - no user enumeration
          })
        }
        
        if (user.tenant_id !== tenantId) {
          // User belongs to different tenant
          logger.debug('❌ User belongs to different tenant:', user.tenant_id, '!==', tenantId)
          
          // Record failed login attempt
          try {
            await adminSupabase.rpc('record_failed_login', {
              p_email: email.toLowerCase().trim(),
              p_ip_address: ipAddress,
              p_tenant_id: tenantId
            })
          } catch (recordError: any) {
            console.warn('⚠️ Failed to record failed login:', recordError.message)
          }
          
          throw createError({
            statusCode: 401,
            statusMessage: 'Ungültige Anmeldedaten'  // Generic error - no tenant enumeration
          })
        }
        
        logger.debug('✅ User belongs to tenant, proceeding with login')
      } catch (tenantError: any) {
        // If it's already a createError, rethrow it
        if (tenantError.statusCode) {
          throw tenantError
        }
        // Otherwise log and throw generic error
        console.error('❌ Tenant validation error:', tenantError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Anmeldung fehlgeschlagen'
        })
      }
    }

    // Check login security status
    try {
      const { data: securityStatus, error: secError } = await adminSupabase
        .rpc('check_login_security_status', {
          p_email: email.toLowerCase().trim(),
          p_ip_address: ipAddress,
          p_tenant_id: tenantId
        })

      if (secError) {
        console.warn('⚠️ Failed to check security status:', secError)
      } else if (securityStatus && securityStatus.length > 0) {
        const status = securityStatus[0]
        
        if (!status.allowed) {
          logger.debug('🚫 Login blocked by security policy:', status.reason)
          throw createError({
            statusCode: 403,
            statusMessage: status.reason || 'Anmeldung ist derzeit nicht möglich.'
          })
        }

        if (status.mfa_required) {
          logger.debug('🔐 MFA required for user:', email.substring(0, 3) + '***')
          return {
            success: false,
            requiresMFA: true,
            message: 'Multi-Faktor-Authentifizierung erforderlich. Bitte verwenden Sie Ihre MFA-Methode.',
            email: email.toLowerCase().trim()
          }
        }
      }
    } catch (secError: any) {
      console.warn('⚠️ Security check error:', secError.message)
      // Don't block login if security check fails - log and continue
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
      logger.debug('❌ Login failed for email:', email.substring(0, 3) + '***')
      
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
              logger.debug('🚫 IP blocked due to suspicious activity:', ipAddress)
            } catch (blockError) {
              console.warn('⚠️ Failed to block IP:', blockError)
            }
          }
          
          // If account should be locked
          if (updateResult.lock_account) {
            throw createError({
              statusCode: 423,
              statusMessage: 'Ihr Account wurde temporär gesperrt aufgrund zu vieler fehlgeschlagener Anmeldeversuche. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.'
            })
          }

          // If MFA is required
          if (updateResult.require_mfa) {
            return {
              success: false,
              requiresMFA: true,
              message: 'Multi-Faktor-Authentifizierung erforderlich. Bitte verwenden Sie Ihre MFA-Methode.',
              email: email.toLowerCase().trim()
            }
          }
        }
      } catch (secError: any) {
        if (secError.statusCode) {
          throw secError
        }
        console.warn('⚠️ Failed to record failed login:', secError.message)
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

    logger.debug('✅ Login successful for user:', data.user.id)

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
    logger.debug('✅ Session cookies set (httpOnly, secure, sameSite)')

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
        const { getGeoLocation, isSuspiciousLocation } = await import('~/server/utils/geolocation')
        const geoData = await getGeoLocation(clientIp)
        
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

    // Return session data
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: sessionDuration, // Use custom session duration
        expires_at: Math.floor(Date.now() / 1000) + sessionDuration // Unix timestamp
      },
      rememberMe // Pass back to frontend
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

