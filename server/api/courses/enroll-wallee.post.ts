/**
 * WALLEE Course Enrollment API
 * 
 * Step 1 of course enrollment flow:
 * 1. Validates SARI data
 * 2. Creates pending course_registrations entry
 * 3. Calls /api/payments/process-public for payment
 * 
 * Rate Limiting: 5 attempts per IP per minute (prevent SARI brute-force)
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { SARIClient } from '~/utils/sariClient'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { validateLicense } from '~/server/utils/license-validation'
import { createRateLimitMiddleware } from '~/server/middleware/rate-limiting'

// Rate limiting: 5 attempts per IP per minute
const rateLimiter = createRateLimitMiddleware({
  maxAttempts: 5,
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (event) => {
    // Get IP address
    const forwarded = event.headers['x-forwarded-for']
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    const realIp = event.headers['x-real-ip']
    if (realIp) {
      return realIp
    }
    return event.node.req.socket?.remoteAddress || 'unknown'
  }
})

const handler = defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      courseId, 
      faberid, 
      birthdate, 
      tenantId,
      email,
      phone,
      customSessions // Optional: for flexible session selection
    } = body

    logger.debug('📝 Wallee enrollment request:', { courseId, tenantId, hasCustomSessions: !!customSessions })

    // 1. Validate inputs
    if (!courseId || !faberid || !birthdate || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    const supabase = getSupabaseAdmin()

    // 2. Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*, course_sessions(*)')
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
      .single()

    if (courseError || !course) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Course not found'
      })
    }

    // 3. Get SARI credentials
    let sariSecrets
    try {
      sariSecrets = await getTenantSecretsSecure(
        tenantId,
        ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
        'COURSE_ENROLLMENT_WALLEE'
      )
    } catch (secretsErr: any) {
      logger.error('❌ Failed to load SARI credentials:', secretsErr.message)
      throw createError({
        statusCode: 500,
        statusMessage: 'SARI not configured for this tenant'
      })
    }

    // 4. Validate with SARI
    const sari = new SARIClient({
      environment: 'production',
      clientId: sariSecrets.SARI_CLIENT_ID,
      clientSecret: sariSecrets.SARI_CLIENT_SECRET,
      username: sariSecrets.SARI_USERNAME || '',
      password: sariSecrets.SARI_PASSWORD || ''
    })
    const faberidClean = faberid.replace(/\./g, '')
    
    let customerData: any
    try {
      customerData = await sari.getCustomer(faberidClean, birthdate)
      logger.debug('✅ SARI customer validated:', customerData.firstname)
    } catch (error: any) {
      logger.error('❌ SARI validation failed:', error.message)
      
      // Provide specific error messages for common validation failures
      let userMessage = 'SARI Validierung fehlgeschlagen'
      
      if (error.message?.includes('MISMATCH_BIRTHDATE_FABERID') || 
          error.message?.includes('mismatch') ||
          error.message?.includes('Ausweisnummer') ||
          error.message?.includes('Geburtsdatum')) {
        userMessage = 'Die Ausweisnummer und/oder das Geburtsdatum stimmen nicht überein. Bitte überprüfen Sie Ihre Eingaben.'
      } else if (error.message?.includes('NOT_FOUND') || 
                 error.message?.includes('nicht gefunden')) {
        userMessage = 'Die Ausweisnummer wurde nicht gefunden. Bitte überprüfen Sie die Eingabe.'
      } else if (error.message?.includes('LICENSE_EXPIRED')) {
        userMessage = 'Ihr Führerschein für diese Kategorie ist abgelaufen.'
      }
      
      throw createError({
        statusCode: 400,
        statusMessage: userMessage
      })
    }

    // 5. Validate license requirements
    try {
      validateLicense(course, customerData)
    } catch (error: any) {
      logger.error('❌ License validation failed:', error.statusMessage || error.message)
      // ✅ Re-throw the H3Error as-is (it already has proper statusCode and statusMessage)
      throw error
    }

    // 5b. Validate custom sessions chronological order
    if (customSessions && typeof customSessions === 'object') {
      const positions = Object.keys(customSessions)
        .map(p => parseInt(p))
        .sort((a, b) => a - b)
      
      logger.info('🔍 Validating custom sessions order:', {
        hasCustomSessions: true,
        customPositions: positions,
        totalCustomSessions: Object.keys(customSessions).length
      })
      
      // Get original session dates from course_sessions
      const sortedOriginalSessions = (course.course_sessions || [])
        .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
      
      logger.info('📅 Total sessions in course:', sortedOriginalSessions.length)
      
      // Group by date to get position-date mapping (position 1 = first day, etc.)
      const dateByPosition: Record<number, string> = {}
      let pos = 0
      let currentDate = ''
      for (const session of sortedOriginalSessions) {
        const sessionDate = session.start_time.split('T')[0]
        if (sessionDate !== currentDate) {
          currentDate = sessionDate
          pos++ // Increment BEFORE storing, so first day = position 1
          dateByPosition[pos] = sessionDate
        }
      }
      
      logger.info('📅 Original positions (should match session count):', { 
        dateByPosition, 
        maxPosition: Math.max(...Object.keys(dateByPosition).map(Number)) 
      })
      logger.debug('🔄 Custom sessions details:', customSessions)
      
      // Build effective dates (custom overrides original)
      const effectiveDates: { position: number; date: string }[] = []
      const allPositions = [...new Set([...Object.keys(dateByPosition).map(Number), ...positions])]
        .sort((a, b) => a - b)
      
      logger.info('🔢 All positions to check:', allPositions)
      
      for (const position of allPositions) {
        const customSession = customSessions[position.toString()]
        const effectiveDate = customSession?.date || dateByPosition[position]
        if (effectiveDate) {
          effectiveDates.push({ position, date: effectiveDate })
        }
      }
      
      logger.info('📊 Effective dates for validation:', effectiveDates.map(e => `Teil ${e.position}: ${e.date}`))
      
      // Check chronological order
      for (let i = 1; i < effectiveDates.length; i++) {
        const prev = effectiveDates[i - 1]
        const curr = effectiveDates[i]
        
        if (curr.date <= prev.date) {
          logger.error(`❌ Session order invalid: Teil ${curr.position} (${curr.date}) is before/same as Teil ${prev.position} (${prev.date})`)
          throw createError({
            statusCode: 400,
            statusMessage: `Ungültige Session-Reihenfolge: Teil ${curr.position} muss nach Teil ${prev.position} absolviert werden. Bitte passen Sie die Termine an.`
          })
        }
      }
      
      logger.info('✅ Custom sessions order validated')
    }

    // 6. Validate SARI enrollment is possible (before payment!)
    // This does a TEST enrollment to check for deadline violations, course full, etc.
    if (course.sari_managed && course.sari_course_id) {
      try {
        logger.info(`🔍 Validating SARI enrollment possibility for course ${course.sari_course_id}`)
        
        // Build the list of ALL session IDs to validate (original + custom swaps)
        const sariCourseIdParts = course.sari_course_id.split('_')
        let allSessionIds = sariCourseIdParts.slice(1).filter((id: string) => id && !isNaN(parseInt(id)))
        
        // Apply custom session swaps if any
        if (customSessions && typeof customSessions === 'object') {
          logger.info('🔄 Applying custom sessions for validation:', Object.keys(customSessions))
          
          for (const [position, customData] of Object.entries(customSessions)) {
            const custom = customData as any
            const originalIds = custom?.originalSariIds || []
            const newIds = custom?.sariSessionIds || (custom?.sariSessionId ? [custom.sariSessionId] : [])
            
            if (originalIds.length > 0 && newIds.length > 0) {
              // Replace original IDs with new IDs
              for (let i = 0; i < originalIds.length && i < newIds.length; i++) {
                const idx = allSessionIds.findIndex((id: string) => id === originalIds[i] || id === originalIds[i].toString())
                if (idx >= 0) {
                  allSessionIds[idx] = newIds[i]
                }
              }
            } else if (newIds.length > 0) {
              // Legacy: position-based replacement
              const posNum = parseInt(position)
              if (posNum > 0 && posNum <= allSessionIds.length) {
                allSessionIds[posNum - 1] = newIds[0]
              }
            }
          }
        }
        
        logger.info(`🎯 Validating ${allSessionIds.length} sessions: ${allSessionIds.join(', ')}`)
        
        // Do TEST enrollment for ALL sessions to catch deadline violations
        const validationResult = await sari.validateAllSessions(allSessionIds, faberidClean, birthdate)
        
        if (!validationResult.canEnroll) {
          throw createError({
            statusCode: 400,
            statusMessage: validationResult.reason || 'SARI enrollment not possible'
          })
        }
        
        logger.info(`✅ SARI enrollment validation passed for all ${allSessionIds.length} sessions`)
      } catch (error: any) {
        if (error.statusCode) throw error
        logger.error('❌ SARI enrollment check failed:', error.message)
        throw createError({
          statusCode: 400,
          statusMessage: error.message || 'Could not verify course availability'
        })
      }
    }

    // 7. Check for duplicate enrollment by FABERID
    const { data: existingEnrollment } = await supabase
      .from('course_registrations')
      .select('id')
      .eq('course_id', courseId)
      .eq('sari_faberid', faberidClean)
      .in('status', ['confirmed', 'pending'])
      .maybeSingle()

    if (existingEnrollment) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.'
      })
    }

    // 7b. Also check by email to give clear feedback
    const finalEmail = email || customerData.email
    const finalPhone = phone || customerData.phone || ''

    const { data: existingByEmail } = await supabase
      .from('course_registrations')
      .select('id')
      .eq('course_id', courseId)
      .eq('email', finalEmail)
      .in('status', ['confirmed', 'pending'])
      .maybeSingle()

    if (existingByEmail) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Diese E-Mail-Adresse ist bereits für diesen Kurs angemeldet.'
      })
    }

    // 8. Create or find Guest User
    logger.debug('🔍 Looking for existing user with email:', finalEmail)
    
    let guestUserId: string
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', finalEmail)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (existingUser) {
      guestUserId = existingUser.id
      logger.debug('✅ Found existing user:', guestUserId)
    } else {
      // Create new guest user (no auth_user_id)
      logger.debug('👤 Creating guest user...')
      
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          first_name: customerData.firstname,
          last_name: customerData.lastname,
          email: finalEmail,
          phone: finalPhone,
          tenant_id: tenantId,
          role: 'student',
          is_active: true,
          is_guest: true, // Mark as guest
          auth_user_id: null // No auth account
        })
        .select('id')
        .single()

      if (userError || !newUser) {
        logger.error('❌ Failed to create guest user:', userError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Guest user could not be created'
        })
      }

      guestUserId = newUser.id
      logger.info('✅ Guest user created:', guestUserId)
    }

    // 9. Create pending enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_registrations')
      .insert({
        course_id: courseId,
        tenant_id: tenantId,
        user_id: guestUserId, // ✅ NOW HAS USER_ID!
        first_name: customerData.firstname,
        last_name: customerData.lastname,
        email: finalEmail,
        phone: finalPhone,
        sari_faberid: faberidClean, // Store for deduplication
        status: 'pending',
        payment_status: 'pending',
        custom_sessions: customSessions || null // Store custom session selections
      })
      .select('id')
      .single()

    if (enrollmentError || !enrollment) {
      logger.error('❌ Failed to create enrollment:', enrollmentError)
      
      // Provide clearer error messages
      if (enrollmentError?.message?.includes('duplicate key')) {
        if (enrollmentError.message.includes('course_id_email_key')) {
          throw createError({
            statusCode: 409,
            statusMessage: 'Diese E-Mail-Adresse ist bereits für diesen Kurs angemeldet.'
          })
        }
        if (enrollmentError.message.includes('course_id_sari_faberid')) {
          throw createError({
            statusCode: 409,
            statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.'
          })
        }
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: 'Anmeldung konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.'
      })
    }

    logger.info('✅ Pending enrollment created:', enrollment.id)

    // 9. Call payment processor
    const priceChf = course.price_per_participant_rappen / 100
    
    try {
      const paymentResponse = await $fetch('/api/payments/process-public', {
        method: 'POST',
        body: {
          enrollmentId: enrollment.id,
          amount: course.price_per_participant_rappen,
          currency: 'CHF',
          customerEmail: finalEmail,
          customerName: `${customerData.firstname} ${customerData.lastname}`,
          courseId: courseId,
          tenantId: tenantId,
          metadata: {
            sari_faberid: faberidClean,
            sari_birthdate: birthdate, // Store for SARI enrollment after payment
            course_name: course.name,
            course_location: course.description
          }
        }
      }) as any

      if (paymentResponse.success && paymentResponse.paymentUrl) {
        logger.info('✅ Payment URL generated, redirecting...')
        return {
          success: true,
          enrollmentId: enrollment.id,
          paymentUrl: paymentResponse.paymentUrl
        }
      } else {
        throw new Error('No payment URL received')
      }
    } catch (error: any) {
      logger.error('❌ Payment processing failed:', error.message)
      
      // Cancel the enrollment if payment setup fails
      await supabase
        .from('course_registrations')
        .update({ status: 'cancelled' })
        .eq('id', enrollment.id)
      
      throw createError({
        statusCode: 500,
        statusMessage: error.message || 'Payment processing failed'
      })
    }

  } catch (error: any) {
    logger.error('❌ Wallee enrollment error:', error)
    
    // ✅ If it's already an H3Error with statusCode, let it pass through as-is
    if (error?.statusCode && (error?.statusMessage || error?.message)) {
      throw error
    }
    
    // Otherwise, wrap in a generic error
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'Enrollment failed'
    })
  }
})

export default defineEventHandler(async (event) => {
  // Apply rate limiting first
  await rateLimiter(event)
  // Then handle the request
  return handler(event)
})

