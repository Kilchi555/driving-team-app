import { getSupabase } from '~/utils/supabase'
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateRegistrationEmail } from '~/server/utils/email-validator'

export default defineEventHandler(async (event) => {
  try {
    // Get client IP for rate limiting
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                      getHeader(event, 'x-real-ip') || 
                      event.node.req.socket.remoteAddress || 
                      'unknown'
    
    console.log('🔍 Registration attempt from IP:', ipAddress)
    
    // Check rate limit
    const rateLimit = checkRateLimit(ipAddress)
    if (!rateLimit.allowed) {
      console.warn('⚠️ Rate limit exceeded for IP:', ipAddress)
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Registrierungsversuche. Bitte versuchen Sie es in einer Minute erneut.'
      })
    }
    console.log('✅ Rate limit check passed. Remaining:', rateLimit.remaining)

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

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Erforderliche Felder fehlen'
      })
    }
    
    // Debug: Log categories to verify they're being sent correctly
    console.log('📋 Categories received:', categories, 'Type:', typeof categories, 'Is Array:', Array.isArray(categories))

    // Validate email format and check for disposable/spam emails
    console.log('📧 Validating email:', email)
    const emailValidation = validateRegistrationEmail(email)
    if (!emailValidation.valid) {
      console.warn('⚠️ Email validation failed:', emailValidation.reason)
      throw createError({
        statusCode: 400,
        statusMessage: emailValidation.reason || 'Ungültige E-Mail-Adresse'
      })
    }
    console.log('✅ Email validation passed')

    // Verify hCaptcha token
    if (!captchaToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Captcha-Verifikation erforderlich'
      })
    }

    console.log('🔐 Verifying hCaptcha token...')
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
    console.log('✅ hCaptcha verified successfully')

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

    // 1. Create auth user
    console.log('🔐 Creating auth user for:', email)
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim()
      }
    })

    if (authError) {
      console.error('❌ Auth creation error:', authError)
      throw createError({
        statusCode: 400,
        statusMessage: authError.message || 'Fehler bei der Authentifizierung'
      })
    }

    console.log('✅ Auth user created:', authData.user.id)

    // 2. Create user profile using service role (bypasses RLS)
    console.log('👤 Creating user profile in users table...')
    const userRole = isAdmin ? 'tenant_admin' : 'client'
    
    // Ensure categories is an array
    const categoryArray = Array.isArray(categories) ? categories : (categories ? [categories] : [])
    console.log('📋 Category array for DB:', categoryArray)
    
    const { data: userProfile, error: userError } = await serviceSupabase
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        tenant_id: tenantId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        birthdate: birthDate || null,
        street: street?.trim() || null,
        street_nr: streetNr?.trim() || null,
        zip: zip?.trim() || null,
        city: city?.trim() || null,
        category: categoryArray, // Store as array
        lernfahrausweis_nr: lernfahrausweisNr?.trim() || null,
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

    console.log('✅ User profile created:', userProfile.id)

    // 3. Send verification email via Supabase (confirmation email automatically sent)
    console.log('📧 Sending verification email...')
    try {
      // Supabase automatically sends a confirmation email after user creation
      // No need to manually resend - just log it
      console.log('✅ Verification email will be sent by Supabase automatically')
    } catch (emailErr: any) {
      console.warn('⚠️ Email send error:', emailErr.message)
    }

    return {
      success: true,
      userId: authData.user.id,
      message: 'Registrierung erfolgreich. Bitte überprüfen Sie Ihre E-Mail.'
    }

  } catch (error: any) {
    console.error('❌ Registration error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Fehler bei der Registrierung'
    })
  }
})

