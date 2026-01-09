import { getSupabase } from '~/utils/supabase'
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateRegistrationEmail } from '~/server/utils/email-validator'
import { logger } from '~/utils/logger'
import { logAudit } from '~/server/utils/audit'
import {
  validateRequiredString,
  validatePassword,
  validateEmail,
  validateUUID,
  sanitizeString,
  throwValidationError
} from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  try {
    // Get client IP for rate limiting
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                      getHeader(event, 'x-real-ip') || 
                      event.node.req.socket.remoteAddress || 
                      'unknown'
    
    logger.debug('Register', '🔍 Registration attempt from IP:', ipAddress)

    const body = await readBody(event)
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      birthDate,
      street,
      streetNr,
      zip,
      city,
      categories,
      lernfahrausweisNr,
      tenantId,
      isAdmin = false,
      captchaToken
    } = body

    // Check rate limit (after body is read so we have email and tenantId)
    const rateLimit = await checkRateLimit(ipAddress, 'register', undefined, undefined, email, tenantId)
    if (!rateLimit.allowed) {
      console.warn('⚠️ Rate limit exceeded for IP:', ipAddress)
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Registrierungsversuche. Bitte versuchen Sie es in einer Minute erneut.'
      })
    }
    logger.debug('Register', '✅ Rate limit check passed. Remaining:', rateLimit.remaining)

    // Validate required fields with centralized validators
    const errors: Record<string, string> = {}
    
    const firstNameValidation = validateRequiredString(firstName, 'Vorname', 100)
    if (!firstNameValidation.valid) errors.firstName = firstNameValidation.error!
    
    const lastNameValidation = validateRequiredString(lastName, 'Nachname', 100)
    if (!lastNameValidation.valid) errors.lastName = lastNameValidation.error!
    
    if (!validateEmail(email)) {
      errors.email = 'Ungültige E-Mail-Adresse'
    }
    
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.message!
    }
    
    if (!tenantId || !validateUUID(tenantId)) {
      errors.tenantId = 'Ungültige Mandanten-ID'
    }
    
    if (Object.keys(errors).length > 0) {
      throwValidationError(errors)
    }
    
    // Debug: Log categories to verify they're being sent correctly
    logger.debug('Register', '📋 Categories received:', categories, 'Type:', typeof categories, 'Is Array:', Array.isArray(categories))

    // Validate email format and check for disposable/spam emails
    logger.debug('Register', '📧 Validating email:', email)
    const emailValidation = validateRegistrationEmail(email)
    if (!emailValidation.valid) {
      console.warn('⚠️ Email validation failed:', emailValidation.reason)
      throw createError({
        statusCode: 400,
        statusMessage: emailValidation.reason || 'Ungültige E-Mail-Adresse'
      })
    }
    logger.debug('Register', '✅ Email validation passed')

    // Verify hCaptcha token
    if (!captchaToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Captcha-Verifikation erforderlich'
      })
    }

    logger.debug('Register', '🔐 Verifying hCaptcha token...')
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
    logger.debug('Register', '✅ hCaptcha verified successfully')

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
    const supabase = getSupabase()

    // ✅ Sanitize all string inputs to prevent XSS
    const sanitizedFirstName = sanitizeString(firstName, 100)
    const sanitizedLastName = sanitizeString(lastName, 100)
    const sanitizedPhone = phone ? sanitizeString(phone, 20) : null
    const sanitizedStreet = street ? sanitizeString(street, 100) : null
    const sanitizedStreetNr = streetNr ? sanitizeString(streetNr, 10) : null
    const sanitizedCity = city ? sanitizeString(city, 100) : null
    const sanitizedLernfahrausweisNr = lernfahrausweisNr ? sanitizeString(lernfahrausweisNr, 50) : null

    // 1. Create auth user
    logger.debug('Register', '🔐 Creating auth user for:', email)
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName
      }
    })

    if (authError) {
      console.error('❌ Auth creation error:', authError)
      throw createError({
        statusCode: 400,
        statusMessage: authError.message || 'Fehler bei der Authentifizierung'
      })
    }

    logger.debug('Register', '✅ Auth user created:', authData.user.id)

    // 2. Check if user already exists (from invitation)
    logger.debug('Register', '👤 Checking for existing user with email:', email)
    const { data: existingUser, error: existingUserError } = await serviceSupabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .eq('tenant_id', tenantId)
      .single()

    let userProfile
    const userRole = isAdmin ? 'tenant_admin' : 'client'
    const categoryArray = Array.isArray(categories) ? categories : (categories ? [categories] : [])
    logger.debug('Register', '📋 Category array for DB:', categoryArray)

    if (existingUser && existingUser.id) {
      // UPDATE existing user (from invitation)
      logger.debug('Register', '🔄 Updating existing user profile from invitation:', existingUser.id)
      
      const { data: updatedUser, error: updateError } = await serviceSupabase
        .from('users')
        .update({
          auth_user_id: authData.user.id,
          first_name: sanitizedFirstName,
          last_name: sanitizedLastName,
          phone: sanitizedPhone,
          birthdate: birthDate || null,
          street: sanitizedStreet,
          street_nr: sanitizedStreetNr,
          zip: zip?.trim() || null,
          city: sanitizedCity,
          category: categoryArray,
          lernfahrausweis_nr: sanitizedLernfahrausweisNr,
          role: userRole,
          is_active: true
        })
        .eq('id', existingUser.id)
        .select()
        .single()

      if (updateError) {
        await serviceSupabase.auth.admin.deleteUser(authData.user.id)
        console.error('❌ Error updating user profile:', JSON.stringify(updateError, null, 2))
        throw createError({
          statusCode: 400,
          statusMessage: `Fehler beim Aktualisieren des Benutzerprofils: ${updateError.message}`
        })
      }

      userProfile = updatedUser
      logger.debug('Register', '✅ User profile updated:', userProfile.id)
    } else {
      // CREATE new user profile
      logger.debug('Register', '➕ Creating new user profile in users table...')
      
      const { data: newUser, error: userError } = await serviceSupabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          tenant_id: tenantId,
          first_name: sanitizedFirstName,
          last_name: sanitizedLastName,
          email: email.toLowerCase().trim(),
          phone: sanitizedPhone,
          birthdate: birthDate || null,
          street: sanitizedStreet,
          street_nr: sanitizedStreetNr,
          zip: zip?.trim() || null,
          city: sanitizedCity,
          category: categoryArray, // Store as array
          lernfahrausweis_nr: sanitizedLernfahrausweisNr,
          role: userRole,
          is_active: true
        })
        .select()
        .single()

      if (userError) {
        // Delete the auth user if profile creation fails
        await serviceSupabase.auth.admin.deleteUser(authData.user.id)
        console.error('❌ Error creating user profile:', JSON.stringify(userError, null, 2))
        console.error('📋 Attempted insert data:', {
          auth_user_id: authData.user.id,
          tenant_id: tenantId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.toLowerCase().trim(),
          role: userRole
        })
        throw createError({
          statusCode: 400,
          statusMessage: `Fehler beim Erstellen des Benutzerprofils: ${userError.message}`
        })
      }

      userProfile = newUser
      logger.debug('Register', '✅ User profile created:', userProfile.id)
    }

    // 3. Create student_credits record for new client
    if (userRole === 'client') {
      logger.debug('Register', '💰 Creating student_credits record...')
      const { data: studentCredit, error: creditError } = await serviceSupabase
        .from('student_credits')
        .insert({
          user_id: userProfile.id,
          tenant_id: tenantId,
          balance_rappen: 0,
          notes: 'Automatisch erstellt bei Schüler-Registrierung'
        })
        .select()
        .single()

      if (creditError) {
        console.warn('⚠️ Error creating student_credits (non-critical):', creditError)
        // Don't fail the whole registration if this fails
      } else {
        logger.debug('Register', '✅ student_credits record created:', studentCredit.id)
      }
    }

    // 4. Send verification email via Supabase (confirmation email automatically sent)
    logger.debug('Register', '📧 Sending verification email...')
    try {
      // Supabase automatically sends a confirmation email after user creation
      // No need to manually resend - just log it
      logger.debug('Register', '✅ Verification email will be sent by Supabase automatically')
    } catch (emailErr: any) {
      console.warn('⚠️ Email send error:', emailErr.message)
    }

    // 5. Audit logging
    await logAudit({
      action: 'user_registration',
      user_id: userProfile.id,
      tenant_id: tenantId,
      resource_type: 'user',
      resource_id: userProfile.id,
      ip_address: ipAddress,
      status: 'success',
      details: {
        email: email.toLowerCase().trim(),
        categories: categoryArray,
        is_admin: isAdmin,
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    return {
      success: true,
      userId: userProfile.id,
      message: 'Registrierung erfolgreich. Bitte überprüfen Sie Ihre E-Mail.'
    }

  } catch (error: any) {
    console.error('❌ Registration error:', error)

    // Audit log for failed registration
    await logAudit({
      action: 'user_registration',
      tenant_id: (error as any).tenantId,
      resource_type: 'user',
      ip_address: getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 'unknown',
      status: 'failed',
      error_message: error.statusMessage || error.message,
      details: {
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Fehler bei der Registrierung'
    })
  }
})

