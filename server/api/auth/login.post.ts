import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Get client IP for rate limiting
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                      getHeader(event, 'x-real-ip') || 
                      event.node.req.socket.remoteAddress || 
                      'unknown'
    
    logger.debug('🔐 Login attempt from IP:', ipAddress)
    
    // Get Supabase client
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase credentials')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }
    
    // Check if IP is blocked
    if (supabaseUrl && serviceRoleKey) {
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
      
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
    }
    
    // Apply rate limiting (max 10 attempts per minute)
    const rateLimit = checkRateLimit(ipAddress, 'login')
    if (!rateLimit.allowed) {
      console.warn('⚠️ Login rate limit exceeded for IP:', ipAddress)
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Anmeldeversuche. Bitte versuchen Sie es in einigen Minuten erneut.'
      })
    }
    logger.debug('✅ Rate limit check passed. Remaining attempts:', rateLimit.remaining)

    // Parse request body
    const { email, password } = await readBody(event)

    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'E-Mail und Passwort erforderlich'
      })
    }

    // Validate email format
    if (!email.includes('@') || email.length < 5) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültige E-Mail-Adresse'
      })
    }

    // Use anon client for login (as frontend would)
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    logger.debug('🔑 Attempting login for email:', email.substring(0, 3) + '***')

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password
    })

    if (error) {
      logger.debug('❌ Login failed for email:', email.substring(0, 3) + '***')
      
      // Log failed attempt for security monitoring
      if (serviceRoleKey) {
        try {
          const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
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

    logger.debug('✅ Passwort verified for user:', data.user.id)

    // 3. Check if user has MFA enabled
    let mfaRequired = false
    let userPasskeys: any[] = []

    if (serviceRoleKey) {
      try {
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

        // Check MFA status
        const { data: userProfile, error: userError } = await adminSupabase
          .from('users')
          .select('id, mfa_enabled, mfa_required')
          .eq('auth_user_id', data.user.id)
          .single()

        if (userProfile) {
          mfaRequired = userProfile.mfa_enabled || userProfile.mfa_required

          // If MFA is required, get list of passkeys
          if (mfaRequired) {
            const { data: credentials, error: credError } = await adminSupabase
              .from('webauthn_credentials')
              .select('id, device_name, created_at, last_used_at')
              .eq('user_id', userProfile.id)
              .eq('is_active', true)

            if (!credError && credentials) {
              userPasskeys = credentials
            }

            logger.debug(`🔐 MFA required for user ${data.user.id}. Passkeys: ${userPasskeys.length}`)
          }
        }
      } catch (mfaCheckError: any) {
        logger.warn('⚠️ Error checking MFA status:', mfaCheckError.message)
        // Continue anyway - if we can't check, we skip MFA
      }
    }

    // 4. If MFA is required, return interim response asking for MFA verification
    if (mfaRequired) {
      logger.debug(`⏳ Returning MFA challenge for user ${data.user.id}`)

      return {
        success: false,
        requiresMfa: true,
        mfaOptions: {
          hasPasskeys: userPasskeys.length > 0,
          passkeys: userPasskeys.map((p: any) => ({
            id: p.id,
            device_name: p.device_name,
            last_used_at: p.last_used_at
          })),
          canUseSmsCode: true,
          canUseEmailCode: true
        },
        tempSessionToken: data.session?.access_token,
        user: {
          id: data.user.id,
          email: data.user.email
        }
      }
    }

    // 5. Log successful login (no MFA required)
    if (serviceRoleKey) {
      try {
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
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

    logger.debug('✅ Login successful for user (no MFA):', data.user.id)

    // Return session data
    return {
      success: true,
      requiresMfa: false,
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
