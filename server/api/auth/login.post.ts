import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logger } from '~/utils/logger'
import { validateEmail, throwValidationError } from '~/server/utils/validators'

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
    const { email, password, tenantId } = await readBody(event)

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

    // Log successful login
    if (serviceRoleKey) {
      try {
        await adminSupabase
          .from('login_attempts')
          .insert({
            email: email.toLowerCase().trim(),
            ip_address: ipAddress,
            success: true,
            user_id: data.user.id,
            attempted_at: new Date().toISOString()
          })
          .throwOnError()
      } catch (logError: any) {
        console.warn('⚠️ Failed to log successful login:', logError.message)
      }
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
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at
      }
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

