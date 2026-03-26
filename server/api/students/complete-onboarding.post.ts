// server/api/students/complete-onboarding.post.ts
// ✅ SECURITY HARDENED: Token validation, rate limiting, input validation, audit logging
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { sanitizeString } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    logger.debug('📝 Complete onboarding request received')
    
    const { token, firstName, lastName, phone, password, email, birthdate, categories, category, street, street_nr, zip, city, documentUrls } = body

    // ✅ LAYER 1: Validate required fields
    if (!token || !password || !email) {
      logger.warn('⚠️ Complete onboarding: Missing required fields', { 
        token: !!token, 
        password: !!password, 
        email: !!email 
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: token, password, and email are required'
      })
    }

    // ✅ LAYER 2: Input validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      logger.warn('⚠️ Complete onboarding: Invalid email format', { email })
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email format'
      })
    }

    if (password && password.length < 12) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Passwort muss mindestens 12 Zeichen lang sein'
      })
    }
    
    if (password && !/[A-Z]/.test(password)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Passwort muss mindestens einen Großbuchstaben enthalten'
      })
    }
    
    if (password && !/[a-z]/.test(password)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Passwort muss mindestens einen Kleinbuchstaben enthalten'
      })
    }
    
    if (password && !/[0-9]/.test(password)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Passwort muss mindestens eine Zahl enthalten'
      })
    }

    if (firstName && firstName.length > 100) {
      throw createError({
        statusCode: 400,
        statusMessage: 'First name is too long'
      })
    }

    if (lastName && lastName.length > 100) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Last name is too long'
      })
    }

    // ✅ LAYER 3: Rate limiting (max 5 completions per token per hour)
    const rateLimitKey = `complete_onboarding_${token.substring(0, 20)}`
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      5, // max 5 attempts
      3600 // per hour
    )

    if (!rateLimitResult.allowed) {
      logger.warn('⚠️ Complete onboarding: Rate limit exceeded', { 
        token: token.substring(0, 10) + '...',
        retryAfter: rateLimitResult.retryAfter 
      })
      throw createError({
        statusCode: 429,
        statusMessage: `Too many attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        data: { retryAfter: rateLimitResult.retryAfter * 1000 }
      })
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ✅ LAYER 4: Find user by token and validate
    logger.debug('🔍 Looking for user with token...')
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('onboarding_token', token)
      .eq('onboarding_status', 'pending')
      .single()

    if (userError) {
      logger.warn('⚠️ Complete onboarding: User lookup error', { error: userError.message })
      throw createError({
        statusCode: 400,
        statusMessage: `User lookup failed: ${userError.message}`
      })
    }

    if (!user) {
      logger.warn('⚠️ Complete onboarding: User not found with token')
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid or expired token'
      })
    }

    logger.debug('✅ Found user:', { id: user.id, email: user.email, tenant_id: user.tenant_id })

    // ✅ LAYER 5: Check token expiration
    const expiresAt = new Date(user.onboarding_token_expires)
    if (expiresAt < new Date()) {
      logger.warn('⚠️ Complete onboarding: Token expired', { userId: user.id })
      throw createError({
        statusCode: 400,
        statusMessage: 'Token has expired'
      })
    }

    // ✅ LAYER 6: Create Auth User
    logger.debug('👤 Creating auth user for email:', email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Mark email as confirmed
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (authError) {
      logger.warn('⚠️ Complete onboarding: Auth user creation error', { error: authError.message })
      
      // Provide user-friendly error messages
      let userMessage = 'Fehler beim Erstellen des Benutzerkontos'
      if (authError.message.includes('already registered')) {
        userMessage = 'Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich direkt an.'
      } else if (authError.message.includes('password')) {
        userMessage = 'Das Passwort entspricht nicht den Anforderungen. Bitte wähle ein stärkeres Passwort.'
      } else if (authError.message.includes('email')) {
        userMessage = 'Die E-Mail-Adresse ist ungültig. Bitte überprüfe deine Eingabe.'
      }
      
      throw createError({
        statusCode: 400,
        statusMessage: userMessage
      })
    }

    logger.debug('✅ Auth user created:', { id: authData.user.id, email: authData.user.email })

    // ✅ LAYER 7: Update user record with all data
    // Ensure category stored as array - support both old (category) and new (categories) format
    const categoryValue = Array.isArray(categories) ? categories : 
                         Array.isArray(category) ? category : 
                         (category ? [category] : [])

    // ✅ Sanitize all string inputs to prevent XSS
    const sanitizedFirstName = sanitizeString(firstName, 100)
    const sanitizedLastName = sanitizeString(lastName, 100)
    const sanitizedPhone = phone ? sanitizeString(phone, 20) : null
    const sanitizedStreet = street ? sanitizeString(street, 100) : null
    const sanitizedStreetNr = street_nr ? sanitizeString(street_nr, 10) : null
    const sanitizedCity = city ? sanitizeString(city, 100) : null

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        auth_user_id: authData.user.id,
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName,
        phone: sanitizedPhone,
        email: email,
        birthdate: birthdate,
        category: categoryValue,
        street: sanitizedStreet,
        street_nr: sanitizedStreetNr,
        zip: zip,
        city: sanitizedCity,
        is_active: true,
        onboarding_status: 'completed',
        onboarding_completed_at: new Date().toISOString(),
        onboarding_token: null, // Invalidate token
        onboarding_token_expires: null,
        accepted_terms_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      logger.error('❌ Complete onboarding: User update error', { error: updateError.message, userId: user.id })
      
      // Provide user-friendly error messages
      let userMessage = 'Fehler beim Speichern der Profildaten'
      if (updateError.message.includes('duplicate')) {
        userMessage = 'Ein Benutzer mit diesen Daten existiert bereits.'
      } else if (updateError.message.includes('constraint')) {
        userMessage = 'Die eingegebenen Daten sind ungültig. Bitte überprüfe deine Angaben.'
      }
      
      throw createError({
        statusCode: 400,
        statusMessage: userMessage
      })
    }

    logger.debug('✅ User profile updated successfully')

    // ✅ LAYER 7b: Convert affiliate lead if this user came via an affiliate link
    try {
      // Match by pending_user_id (set in submit-lead) — more reliable than phone matching
      const { data: pendingLead } = await supabaseAdmin
        .from('affiliate_leads')
        .select('id, affiliate_code_id, affiliate_user_id')
        .eq('pending_user_id', user.id)
        .neq('status', 'converted')
        .maybeSingle()

      if (pendingLead) {
        // Mark lead as converted
        await supabaseAdmin
          .from('affiliate_leads')
          .update({
            status: 'converted',
            converted_user_id: user.id,
            converted_at: new Date().toISOString(),
          })
          .eq('id', pendingLead.id)

        // Create affiliate_referral if not already existing
        if (pendingLead.affiliate_code_id && pendingLead.affiliate_user_id
            && pendingLead.affiliate_user_id !== user.id) {
          const { data: existingReferral } = await supabaseAdmin
            .from('affiliate_referrals')
            .select('id')
            .eq('referred_user_id', user.id)
            .eq('tenant_id', user.tenant_id)
            .maybeSingle()

          if (!existingReferral) {
            await supabaseAdmin.from('affiliate_referrals').insert({
              tenant_id: user.tenant_id,
              affiliate_code_id: pendingLead.affiliate_code_id,
              affiliate_user_id: pendingLead.affiliate_user_id,
              referred_user_id: user.id,
              status: 'pending',
            })
            logger.debug('✅ Affiliate referral created for lead:', pendingLead.id)
          }
        }

        logger.debug('✅ Affiliate lead converted:', pendingLead.id)
      }
    } catch (leadErr: any) {
      // Non-critical — log but don't fail onboarding
      logger.warn('⚠️ Affiliate lead conversion failed (non-critical):', leadErr.message)
    }

    // ✅ LAYER 8: Update auth user display name
    logger.debug('🔐 Updating auth user display name...')
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
      user_metadata: {
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName
      }
    })
    
    if (authUpdateError) {
      logger.warn('⚠️ Auth user update warning (non-critical):', authUpdateError)
    } else {
      logger.debug('✅ Auth user display name updated')
    }

    logger.debug('💰 Creating student_credits record...')
    const { data: studentCredit, error: creditError } = await supabaseAdmin
      .from('student_credits')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!studentCredit) {
      const { error: createCreditError } = await supabaseAdmin
        .from('student_credits')
        .insert({
          user_id: user.id,
          tenant_id: user.tenant_id,
          balance_rappen: 0,
          notes: 'Automatisch erstellt bei Schüler-Onboarding'
        })

      if (createCreditError) {
        logger.warn('⚠️ Error creating student_credits (non-critical):', createCreditError)
      } else {
        logger.debug('✅ student_credits record created')
      }
    } else {
      logger.debug('ℹ️ student_credits already exists for user:', user.id)
    }

    // ✅ LAYER 9: Send pending payment reminders
    try {
      logger.debug('📧 Checking for pending payment reminders...')
      
      const { data: pendingPayments, error: paymentsError } = await supabaseAdmin
        .from('payments')
        .select('id, tenant_id')
        .eq('user_id', user.id)
        .eq('payment_status', 'pending')
        .is('first_reminder_sent_at', null)
      
      if (paymentsError) {
        logger.warn('⚠️ Error checking pending payments:', paymentsError)
      } else if (pendingPayments && pendingPayments.length > 0) {
        logger.debug(`📧 Found ${pendingPayments.length} pending payment(s) without reminder`)
        
        for (const payment of pendingPayments) {
          try {
            await $fetch('/api/reminders/send-payment-confirmation', {
              method: 'POST',
              body: {
                paymentId: payment.id,
                userId: user.id,
                tenantId: payment.tenant_id
              }
            })
            
            logger.debug(`✅ First reminder sent for payment ${payment.id}`)
          } catch (reminderError: any) {
            logger.warn(`⚠️ Error sending reminder for payment ${payment.id}:`, reminderError)
          }
        }
      }
    } catch (reminderCheckError) {
      logger.warn('⚠️ Error in reminder check (non-critical):', reminderCheckError)
    }

    // ✅ LAYER 10: Audit logging
    await logAudit({
      action: 'onboarding_completed',
      user_id: user.id,
      tenant_id: user.tenant_id,
      resource_type: 'user_onboarding',
      resource_id: user.id,
      status: 'success',
      details: {
        email: email,
        categories: categoryValue,
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    logger.debug('✅ Onboarding completed successfully for user:', user.id)

    return {
      success: true,
      message: 'Onboarding completed successfully',
      userId: user.id,
      authUserId: authData.user.id,
      tenant_slug: (await supabaseAdmin
        .from('tenants')
        .select('slug')
        .eq('id', user.tenant_id)
        .single()
      ).data?.slug
    }

  } catch (error: any) {
    logger.error('❌ Complete onboarding error:', { 
      message: error.message, 
      statusCode: error.statusCode 
    })
    
    const statusCode = error.statusCode || 500
    const statusMessage = error.statusMessage || 'Onboarding completion failed'
    
    throw createError({
      statusCode,
      statusMessage,
      data: error.data
    })
  }
})

