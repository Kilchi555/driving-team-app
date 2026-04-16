// server/api/staff/register.post.ts
// ✅ SECURITY HARDENED: Rate limiting, XSS protection, audit logging
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { sanitizeString, validateBasicPassword, validateEmail } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  try {
    // ✅ LAYER 1: Get client IP for rate limiting
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                      getHeader(event, 'x-real-ip') || 
                      event.node.req.socket.remoteAddress || 
                      'unknown'

    const body = await readBody(event)
    const { 
      invitationToken,
      email, 
      firstName, 
      lastName, 
      phone,
      birthdate,
      street,
      streetNr,
      zip,
      city,
      password,
      selectedCategories,
      // New fields
      lernfahrausweis_nr,
      instructor_since_year,
      language,
      acceptedTerms,
      // Working hours: [{ day_of_week: 1, start_time: '07:00', end_time: '18:00' }, ...]
      workingHours,
      // Location assignments: array of location IDs
      selectedLocationIds,
      selectedExamLocationIds
    } = body

    logger.debug('📝 Staff registration request:', { email, firstName, lastName, ipAddress })

    // ✅ LAYER 2: Rate limiting (5 registrations per hour per IP)
    const rateLimit = await checkRateLimit(ipAddress, 'staff_register', 5, 3600, email)
    if (!rateLimit.allowed) {
      logger.warn('⚠️ Rate limit exceeded for staff registration:', ipAddress)
      throw createError({
        statusCode: 429,
        statusMessage: `Zu viele Registrierungsversuche. Bitte versuchen Sie es in ${rateLimit.retryAfter} Sekunden erneut.`
      })
    }
    logger.debug('✅ Rate limit check passed. Remaining:', rateLimit.remaining)

    // ✅ LAYER 3: Validate required fields
    if (!invitationToken || !email || !firstName || !lastName || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Pflichtfelder fehlen'
      })
    }

    // ✅ LAYER 4: Email validation (format + disposable check)
    if (!validateEmail(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültige E-Mail-Adresse'
      })
    }

    const { validateRegistrationEmail } = await import('~/server/utils/email-validator')
    const emailValidation = validateRegistrationEmail(email)
    if (!emailValidation.valid) {
      logger.warn('⚠️ Email validation failed for staff registration:', emailValidation.reason)
      throw createError({
        statusCode: 400,
        statusMessage: emailValidation.reason || 'Ungültige E-Mail-Adresse'
      })
    }
    logger.debug('✅ Disposable email check passed')

    // ✅ LAYER 5: Password validation
    const passwordValidation = validateBasicPassword(password)
    if (!passwordValidation.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: passwordValidation.message || 'Passwort erfüllt nicht die Anforderungen (min. 12 Zeichen, Groß-/Kleinbuchstaben, Zahlen)'
      })
    }

    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl
    const serviceRoleKey = config.supabaseServiceRoleKey

    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    // Create service role client
    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Verify invitation token
    const { data: invitation, error: inviteError } = await serviceSupabase
      .from('staff_invitations')
      .select('*')
      .eq('invitation_token', invitationToken)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      console.error('❌ Invalid invitation:', inviteError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültige oder abgelaufene Einladung'
      })
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Diese Einladung ist abgelaufen'
      })
    }

    logger.debug('✅ Invitation verified:', invitation.id)

    // ✅ LAYER 6: XSS Protection - Sanitize all string inputs
    const sanitizedFirstName = sanitizeString(firstName, 100)
    const sanitizedLastName = sanitizeString(lastName, 100)
    const sanitizedPhone = phone ? sanitizeString(phone, 20) : null
    const sanitizedStreet = street ? sanitizeString(street, 100) : null
    const sanitizedStreetNr = streetNr ? sanitizeString(streetNr, 10) : null
    const sanitizedCity = city ? sanitizeString(city, 100) : null

    // ✅ LAYER 7: Check for duplicate email BEFORE creating auth user
    const { data: existingUser } = await serviceSupabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('tenant_id', invitation.tenant_id)
      .single()

    if (existingUser) {
      logger.warn('⚠️ Duplicate email detected for staff registration:', email)
      throw createError({
        statusCode: 409,
        statusMessage: 'Diese E-Mail-Adresse ist bereits registriert.'
      })
    }

    // 2. Create Supabase Auth user
    logger.debug('🔐 Creating auth user for staff:', email)
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName
      }
    })

    if (authError) {
      console.error('❌ Auth creation error:', authError)
      
      // Translate common Supabase auth errors to German
      let errorMessage = 'Fehler beim Erstellen des Accounts'
      if (authError.message.includes('already been registered') || authError.message.includes('User already registered')) {
        errorMessage = 'Diese E-Mail-Adresse ist bereits registriert. Bitte verwenden Sie eine andere E-Mail oder kontaktieren Sie Ihren Administrator.'
      } else if (authError.message.includes('Invalid email')) {
        errorMessage = 'Ungültige E-Mail-Adresse'
      } else if (authError.message.includes('Password')) {
        errorMessage = 'Das Passwort erfüllt nicht die Anforderungen'
      }
      
      throw createError({
        statusCode: 400,
        statusMessage: errorMessage
      })
    }

    if (!authData.user) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Auth user wurde nicht erstellt'
      })
    }

    logger.debug('✅ Auth user created:', authData.user.id)

    // 3. Create user profile in database with sanitized inputs
    const { data: newUser, error: profileError } = await serviceSupabase
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email: email.toLowerCase().trim(),
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName,
        phone: sanitizedPhone,
        role: 'staff',
        tenant_id: invitation.tenant_id,
        is_active: true,
        birthdate: birthdate || null,
        street: sanitizedStreet,
        street_nr: sanitizedStreetNr,
        zip: zip || null,
        city: sanitizedCity,
        lernfahrausweis_nr: lernfahrausweis_nr ? sanitizeString(lernfahrausweis_nr, 50) : null,
        instructor_since_year: instructor_since_year ? parseInt(instructor_since_year) || null : null,
        language: language || 'de',
        accepted_terms_at: acceptedTerms ? new Date().toISOString() : null
      })
      .select('id')
      .single()

    if (profileError) {
      console.error('❌ Profile creation error:', profileError)
      // Try to clean up auth user
      await serviceSupabase.auth.admin.deleteUser(authData.user.id)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Erstellen des Profils'
      })
    }

    logger.debug('✅ User profile created:', newUser.id)

    // 4. Store categories if provided
    if (selectedCategories && selectedCategories.length > 0) {
      try {
        const categoryInserts = selectedCategories.map((code: string) => ({
          user_id: newUser.id,
          category_code: code,
          tenant_id: invitation.tenant_id
        }))
        
        await serviceSupabase
          .from('staff_categories')
          .insert(categoryInserts)
        
        logger.debug('✅ Categories stored:', selectedCategories.length)
      } catch (catErr) {
        console.warn('⚠️ Categories storage failed (non-fatal):', catErr)
      }
    }

    // 5. Setup working hours (service role)
    if (Array.isArray(workingHours) && workingHours.length > 0) {
      try {
        const whInserts = workingHours
          .filter((wh: any) => wh.day_of_week && wh.start_time && wh.end_time)
          .map((wh: any) => ({
            staff_id: newUser.id,
            tenant_id: invitation.tenant_id,
            day_of_week: parseInt(wh.day_of_week),
            start_time: wh.start_time,
            end_time: wh.end_time,
            is_active: true,
            timezone: 'Europe/Zurich'
          }))
        if (whInserts.length > 0) {
          await serviceSupabase.from('staff_working_hours').insert(whInserts)
          logger.debug('✅ Working hours stored:', whInserts.length)
        }
      } catch (whErr) {
        console.warn('⚠️ Working hours storage failed (non-fatal):', whErr)
      }
    }

    // 6. Assign standard locations (Treffpunkte)
    if (Array.isArray(selectedLocationIds) && selectedLocationIds.length > 0) {
      for (const locId of selectedLocationIds) {
        try {
          const { data: loc } = await serviceSupabase
            .from('locations').select('staff_ids').eq('id', locId).single()
          if (loc) {
            const current: string[] = Array.isArray(loc.staff_ids) ? loc.staff_ids : []
            if (!current.includes(newUser.id)) {
              await serviceSupabase.from('locations')
                .update({ staff_ids: [...current, newUser.id] })
                .eq('id', locId)
            }
          }
        } catch (locErr) {
          console.warn('⚠️ Location assignment failed (non-fatal):', locErr)
        }
      }
      logger.debug('✅ Standard locations assigned:', selectedLocationIds.length)
    }

    // 7. Assign exam locations (Prüfungsorte)
    if (Array.isArray(selectedExamLocationIds) && selectedExamLocationIds.length > 0) {
      for (const locId of selectedExamLocationIds) {
        try {
          const { data: loc } = await serviceSupabase
            .from('locations').select('staff_ids').eq('id', locId).single()
          if (loc) {
            const current: string[] = Array.isArray(loc.staff_ids) ? loc.staff_ids : []
            if (!current.includes(newUser.id)) {
              await serviceSupabase.from('locations')
                .update({ staff_ids: [...current, newUser.id] })
                .eq('id', locId)
            }
          }
        } catch (locErr) {
          console.warn('⚠️ Exam location assignment failed (non-fatal):', locErr)
        }
      }
      logger.debug('✅ Exam locations assigned:', selectedExamLocationIds.length)
    }

    // 8. Mark invitation as accepted
    await serviceSupabase
      .from('staff_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    logger.debug('✅ Invitation marked as accepted')

    // ✅ LAYER 8: Audit logging - Success
    await logAudit({
      action: 'staff_registration',
      user_id: newUser.id,
      tenant_id: invitation.tenant_id,
      resource_type: 'user',
      resource_id: newUser.id,
      ip_address: ipAddress,
      status: 'success',
      details: {
        email: email.toLowerCase().trim(),
        invitation_id: invitation.id,
        categories: selectedCategories || [],
        invited_by: invitation.invited_by,
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    // Get tenant slug for redirect
    const { data: tenantData } = await serviceSupabase
      .from('tenants').select('slug').eq('id', invitation.tenant_id).single()

    return {
      success: true,
      userId: newUser.id,
      tenantSlug: tenantData?.slug || null,
      message: 'Registrierung erfolgreich'
    }

  } catch (error: any) {
    console.error('❌ Staff registration error:', error)

    // ✅ LAYER 8: Audit logging - Failure
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    await logAudit({
      action: 'staff_registration',
      tenant_id: (error as any).tenant_id,
      resource_type: 'user',
      ip_address: ipAddress,
      status: 'failed',
      error_message: error.statusMessage || error.message,
      details: {
        email: (error as any).email,
        invitation_token: (error as any).invitationToken?.substring(0, 10) + '...',
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Registrierung fehlgeschlagen'
    })
  }
})

