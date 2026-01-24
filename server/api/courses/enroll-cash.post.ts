/**
 * CASH Course Enrollment API
 * 
 * For cash-on-site payments (Einsiedeln area)
 * 1. Validates SARI data
 * 2. Creates CONFIRMED enrollment (no payment needed)
 * 3. Immediately enrolls in SARI (if sari_managed)
 * 4. Sends confirmation email
 * 
 * Rate Limiting: 5 attempts per IP per minute (prevent SARI brute-force)
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { SARIClient } from '~/utils/sariClient'
import { getSARICredentialsSecure } from '~/server/utils/sari-credentials-secure'
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
      customSessions // Support for swapped sessions
    } = body

    logger.debug('💵 Cash enrollment request:', { courseId, tenantId, hasCustomSessions: !!customSessions })

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

    // 2b. IMPORTANT: Check if cash payment is allowed (only for Einsiedeln!)
    // Cash enrollment is ONLY allowed for Einsiedeln courses
    // All other locations MUST use Wallee payment
    const courseLocation = course.description?.toLowerCase() || ''
    const isEinsiedeln = courseLocation.includes('einsiedeln') || courseLocation.includes('einsiedeln')
    
    if (!isEinsiedeln) {
      logger.warn('❌ Cash payment attempted for non-Einsiedeln course:', {
        courseId,
        location: course.description
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Cash-on-site payment is only available for Einsiedeln courses. Please use online payment.'
      })
    }

    // 3. Get SARI credentials
    const credentials = await getSARICredentialsSecure(tenantId, 'COURSE_ENROLLMENT_CASH')
    if (!credentials) {
      throw createError({
        statusCode: 500,
        statusMessage: 'SARI not configured for this tenant'
      })
    }

    // 4. Validate with SARI
    const sari = new SARIClient(credentials)
    const faberidClean = faberid.replace(/\./g, '')
    
    let customerData: any
    try {
      customerData = await sari.getCustomer(faberidClean, birthdate)
      logger.debug('✅ SARI customer validated:', customerData.firstname)
    } catch (error: any) {
      logger.error('❌ SARI validation failed:', error.message)
      throw createError({
        statusCode: 400,
        statusMessage: error.message || 'SARI validation failed'
      })
    }

    // 5. Validate license requirements
    try {
      validateLicense(course, customerData)
    } catch (error: any) {
      logger.error('❌ License validation failed:', error.message)
      throw error
    }

    // 6. Validate SARI enrollment is possible (before confirming!)
    if (course.sari_managed && course.sari_course_id) {
      try {
        logger.info(`🔍 Validating SARI enrollment possibility for course ${course.sari_course_id}`)
        
        const enrollmentCheck = await sari.canEnrollInCourse(course.sari_course_id, faberidClean)
        
        if (!enrollmentCheck.canEnroll) {
          throw createError({
            statusCode: 400,
            statusMessage: enrollmentCheck.reason || 'SARI enrollment not possible'
          })
        }
        
        logger.info(`✅ SARI enrollment validation passed`)
      } catch (error: any) {
        if (error.statusCode) throw error
        logger.error('❌ SARI enrollment check failed:', error.message)
        throw createError({
          statusCode: 400,
          statusMessage: 'Could not verify course availability'
        })
      }
    }

    // 7. Check for duplicate enrollment
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

    // 8. Create or find Guest User (same as Wallee flow)
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

    // 9. SARI sync FIRST (before DB save) - if managed
    // Enroll in ALL sessions (GROUP_2159157_2159158_2159159 → [2159157, 2159158, 2159159])
    if (course.sari_managed && course.sari_course_id && faberidClean) {
      // Extract ALL session IDs from the group
      const sariCourseIdParts = String(course.sari_course_id).split('_')
      let sariSessionIds = sariCourseIdParts.slice(1).filter((id: string) => id && !isNaN(parseInt(id)))
      
      if (sariSessionIds.length === 0) {
        logger.error('❌ Invalid SARI course ID format:', course.sari_course_id)
        throw createError({
          statusCode: 400,
          statusMessage: 'Ungültiges Kursformat. Bitte kontaktieren Sie uns.'
        })
      }
      
      // Apply custom sessions if any were selected (same logic as Wallee webhook)
      if (customSessions && typeof customSessions === 'object') {
        logger.info('🔄 Applying custom sessions for SARI enrollment:', customSessions)
        
        for (const [position, customData] of Object.entries(customSessions)) {
          const custom = customData as any
          
          // Get original IDs to replace and new IDs
          const originalIds = custom?.originalSariIds || []
          const newIds = custom?.sariSessionIds || (custom?.sariSessionId ? [custom.sariSessionId] : [])
          
          logger.debug(`📍 Position ${position}: originalIds=${originalIds.join(',')}, newIds=${newIds.join(',')}`)
          
          if (originalIds.length > 0 && newIds.length > 0) {
            // Replace each original ID with corresponding new ID
            for (let i = 0; i < originalIds.length && i < newIds.length; i++) {
              const origId = originalIds[i]
              const newId = newIds[i]
              
              const idx = sariSessionIds.findIndex((id: string) => id === origId || id === origId.toString())
              if (idx >= 0) {
                logger.debug(`📝 Replacing session ID ${sariSessionIds[idx]} → ${newId} at index ${idx}`)
                sariSessionIds[idx] = newId
              } else {
                logger.warn(`⚠️ Original session ID ${origId} not found in course sessions`)
              }
            }
          } else if (newIds.length > 0 && originalIds.length === 0) {
            // Legacy fallback: Position-based replacement
            logger.warn('⚠️ Using legacy position-based replacement (no originalSariIds)')
            
            // Group sessions by date to understand position mapping
            const courseSessions = course.course_sessions || []
            const sessionsPerPosition: number[] = []
            
            if (courseSessions.length > 0) {
              const byDate: Map<string, number> = new Map()
              for (const session of courseSessions) {
                const date = session.start_time.split('T')[0]
                byDate.set(date, (byDate.get(date) || 0) + 1)
              }
              for (const count of byDate.values()) {
                sessionsPerPosition.push(count)
              }
            } else if (sariSessionIds.length === 4) {
              sessionsPerPosition.push(2, 2) // Assume VKU pattern
            } else {
              sessionsPerPosition.push(...Array(sariSessionIds.length).fill(1))
            }
            
            const posNum = parseInt(position)
            let startIdx = 0
            for (let p = 0; p < posNum - 1 && p < sessionsPerPosition.length; p++) {
              startIdx += sessionsPerPosition[p]
            }
            
            for (let i = 0; i < newIds.length && (startIdx + i) < sariSessionIds.length; i++) {
              logger.debug(`📝 Legacy replacing session at index ${startIdx + i}: ${sariSessionIds[startIdx + i]} → ${newIds[i]}`)
              sariSessionIds[startIdx + i] = newIds[i]
            }
          }
        }
      }
      
      logger.info(`🎯 Enrolling in SARI for ${sariSessionIds.length} sessions: ${sariSessionIds.join(', ')}`)
      
      // Enroll in ALL sessions
      let successCount = 0
      let errorCount = 0
      let lastError: any = null
      
      for (const sessionId of sariSessionIds) {
        try {
          logger.debug(`📝 Enrolling in session ${sessionId}...`)
          await sari.enrollStudent(parseInt(sessionId), faberidClean, birthdate)
          successCount++
          logger.debug(`✅ Session ${sessionId} enrolled`)
        } catch (error: any) {
          const errorMessage = error.message || ''
          
          // If already enrolled, that's OK - count as success
          if (errorMessage.includes('ALREADY_ENROLLED') || errorMessage.includes('PERSON_ALREADY_ADDED')) {
            logger.debug(`⏭️ Session ${sessionId}: Already enrolled (OK)`)
            successCount++
          } else {
            lastError = error
            errorCount++
            logger.warn(`⚠️ Session ${sessionId} enrollment failed:`, errorMessage)
          }
        }
      }
      
      logger.info(`✅ SARI enrollment: ${successCount}/${sariSessionIds.length} sessions successful${errorCount > 0 ? `, ${errorCount} errors` : ''}`)
      
      // If ALL sessions failed, throw error with the last error message
      if (successCount === 0 && lastError) {
        const errorMessage = lastError.message || ''
        
        if (errorMessage.includes('DEADLINE_VIOLATED') || errorMessage.includes('deadline')) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Anmeldungsfrist abgelaufen. Der Kurs nimmt keine neuen Anmeldungen mehr an.'
          })
        } else if (errorMessage.includes('CAPACITY') || errorMessage.includes('capacity') || errorMessage.includes('full')) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Der Kurs ist leider voll besetzt.'
          })
        } else if (errorMessage.includes('INVALID_PERSON') || errorMessage.includes('invalid') || errorMessage.includes('not found')) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Lernfahrausweis nicht gefunden oder ungültig.'
          })
        } else {
          throw createError({
            statusCode: 400,
            statusMessage: 'SARI-Anmeldung fehlgeschlagen. Bitte versuchen Sie es später erneut.'
          })
        }
      }
    }

    // 10. Create CONFIRMED enrollment (only after SARI check passed)
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
        sari_faberid: faberidClean,
        status: 'confirmed',
        payment_status: 'paid', // Cash-on-site is always "paid"
        payment_method: 'cash_on_site',
        // Store custom sessions if any were selected
        custom_sessions: customSessions || null,
        // Mark as SARI synced (enrollment happened before DB save)
        sari_synced: course.sari_managed ? true : null,
        sari_synced_at: course.sari_managed ? new Date().toISOString() : null
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

    logger.info('✅ Confirmed enrollment created:', enrollment.id)

    // 11. Send confirmation email
    try {
      await $fetch('/api/emails/send-course-enrollment-confirmation', {
        method: 'POST',
        body: {
          courseRegistrationId: enrollment.id,
          paymentMethod: 'cash',
          totalAmount: course.price_per_participant_rappen / 100 // In CHF
        }
      })
      logger.info(`📧 Confirmation email sent to ${finalEmail}`)
    } catch (error: any) {
      logger.warn('⚠️ Email send failed (non-critical):', error.message)
    }

    return {
      success: true,
      enrollmentId: enrollment.id,
      message: 'Anmeldung bestätigt! Bitte bringen Sie den Betrag in bar zum ersten Kurstag mit.'
    }

  } catch (error: any) {
    logger.error('❌ Cash enrollment error:', error)
    
    if (error.statusCode || error.statusMessage) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Enrollment failed'
    })
  }
})

export default defineEventHandler(async (event) => {
  // Apply rate limiting first
  await rateLimiter(event)
  // Then handle the request
  return handler(event)
})

