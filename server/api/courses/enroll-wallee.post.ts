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
      firstName,            // Non-SARI courses: provided instead of faberid/birthdate
      lastName,             // Non-SARI courses: provided instead of faberid/birthdate
      street,               // Non-SARI courses: address
      streetNr,             // Non-SARI courses: house number
      zip,                  // Non-SARI courses: postal code
      city,                 // Non-SARI courses: city
      licenseNumber,        // Non-SARI courses: driver's license number
      tenantId,
      email,
      phone,
      customSessions,       // Optional: for flexible session selection
      referralCode,         // Optional: affiliate referral code
      discountCode,         // Optional: discount/voucher code
      discountAmountRappen, // Optional: client-computed discount (re-validated server-side)
      isPartialEnrollment,  // True when customer books only Teil-3
      partialStartPosition, // Which session position to start from (e.g. 3)
      marketingSessionId,   // Optional: analytics session ID from drivingteam.ch for attribution
      vehicleId,            // Optional: selected rental vehicle
    } = body

    logger.debug('📝 Wallee enrollment request:', { courseId, tenantId, hasCustomSessions: !!customSessions, isPartialEnrollment })

    // 1. Validate inputs — faberid/birthdate only required for SARI-managed courses (checked after course load)
    if (!courseId || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    const supabase = getSupabaseAdmin()

    // 2. Get course details + tenant feature flags in parallel.
    //    Tenant flags gate this entire flow: course-booking feature must be
    //    enabled AND Wallee onboarding must be active before an online payment
    //    can be initiated. This guard mirrors the UI but cannot be bypassed.
    const [courseResult, tenantResult, courseSettingResult] = await Promise.all([
      supabase
        .from('courses')
        .select('*, course_sessions(*), course_category:course_categories(allow_partial_enrollment, partial_start_position, partial_price_rappen)')
        .eq('id', courseId)
        .eq('tenant_id', tenantId)
        .single(),
      supabase
        .from('tenants')
        .select('wallee_enabled, wallee_onboarding_status, is_active')
        .eq('id', tenantId)
        .single(),
      supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenantId)
        .eq('setting_key', 'courses_enabled')
        .maybeSingle()
    ])

    const { data: course, error: courseError } = courseResult

    if (courseError || !course) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Course not found'
      })
    }

    const tenant = tenantResult.data
    if (!tenant || tenant.is_active === false) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant nicht verfügbar'
      })
    }

    const coursesEnabled = (courseSettingResult.data?.setting_value as any)?.enabled !== false
    if (!coursesEnabled) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Kursbuchung ist für diese Fahrschule aktuell nicht aktiviert.'
      })
    }

    // If an admin has explicitly marked this course as cash-only, the
    // Wallee endpoint must refuse — clients should call `enroll-cash`
    // instead. Block early so we don't accidentally create Wallee
    // transactions for cash courses.
    const explicitMethod = (course as any).payment_method as string | null | undefined
    if (explicitMethod === 'CASH_ON_SITE') {
      logger.warn('🚫 Wallee enrollment blocked: course is admin-marked cash-only', { courseId, tenantId })
      throw createError({
        statusCode: 400,
        statusMessage: 'Dieser Kurs ist auf Barzahlung vor Ort eingestellt. Bitte verwende die Barzahlungs-Anmeldung.'
      })
    }

    // Note: tenant.wallee_enabled is enforced LATER in the flow, only when a
    // Wallee payment is actually required. Users whose credit balance covers
    // the full enrollment must be allowed to proceed even when Wallee is off.

    // 2b. Validate partial enrollment: blocked only if a category is linked AND that category
    // explicitly disables partial enrollment. Courses without a category have no restriction.
    if (isPartialEnrollment && !course.is_partial_only) {
      if (course.course_category && !course.course_category.allow_partial_enrollment) {
        throw createError({ statusCode: 400, statusMessage: 'Teilbuchung ist für diesen Kurs nicht erlaubt.' })
      }
    }

    // 3 & 4. SARI credential loading + customer validation (only for SARI-managed courses)
    let sari: any = null
    let faberidClean = ''
    let customerData: any

    if (course.sari_managed) {
      if (!faberid || !birthdate) {
        throw createError({ statusCode: 400, statusMessage: 'Faber-ID und Geburtsdatum erforderlich' })
      }

      let sariSecrets
      try {
        sariSecrets = await getTenantSecretsSecure(
          tenantId,
          ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
          'COURSE_ENROLLMENT_WALLEE'
        )
      } catch (secretsErr: any) {
        logger.error('❌ Failed to load SARI credentials:', secretsErr.message)
        throw createError({ statusCode: 500, statusMessage: 'SARI not configured for this tenant' })
      }

      sari = new SARIClient({
        environment: 'production',
        clientId: sariSecrets.SARI_CLIENT_ID,
        clientSecret: sariSecrets.SARI_CLIENT_SECRET,
        username: sariSecrets.SARI_USERNAME || '',
        password: sariSecrets.SARI_PASSWORD || ''
      })
      faberidClean = faberid.replace(/\./g, '')

      try {
        customerData = await sari.getCustomer(faberidClean, birthdate)
        logger.debug('✅ SARI customer validated:', customerData.firstname)
      } catch (error: any) {
        logger.error('❌ SARI validation failed:', error.message)
        let userMessage = 'SARI Validierung fehlgeschlagen'
        if (error.message?.includes('MISMATCH_BIRTHDATE_FABERID') || error.message?.includes('mismatch') ||
            error.message?.includes('Ausweisnummer') || error.message?.includes('Geburtsdatum')) {
          userMessage = 'Die Ausweisnummer und/oder das Geburtsdatum stimmen nicht überein. Bitte überprüfen Sie Ihre Eingaben.'
        } else if (error.message?.includes('NOT_FOUND') || error.message?.includes('nicht gefunden')) {
          userMessage = 'Die Ausweisnummer wurde nicht gefunden. Bitte überprüfen Sie die Eingabe.'
        } else if (error.message?.includes('LICENSE_EXPIRED')) {
          userMessage = 'Ihr Führerschein für diese Kategorie ist abgelaufen.'
        }
        throw createError({ statusCode: 400, statusMessage: userMessage })
      }

      // 5a. Validate license requirements (SARI only)
      try {
        validateLicense(course, customerData)
      } catch (error: any) {
        logger.error('❌ License validation failed:', error.statusMessage || error.message)
        throw error
      }
    } else {
      // Non-SARI course: use provided name directly
      if (!firstName || !lastName) {
        throw createError({ statusCode: 400, statusMessage: 'Vor- und Nachname erforderlich' })
      }
      customerData = { firstname: firstName.trim(), lastname: lastName.trim(), email, phone, street, streetNr, zip, city, licenseNumber, birthdate }
      logger.debug('✅ Non-SARI enrollment, customer:', `${firstName} ${lastName}`)
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
    // For partial enrollments we only validate the sessions the customer will actually attend.
    if (course.sari_managed && course.sari_course_id) {
      try {
        logger.info(`🔍 Validating SARI enrollment possibility for course ${course.sari_course_id}`)
        
        // Build the base list of session IDs
        const sariCourseIdParts = course.sari_course_id.split('_')
        let allSessionIds = sariCourseIdParts.slice(1).filter((id: string) => id && !isNaN(parseInt(id)))

        // ── Partial-enrollment session filtering ─────────────────────────────
        // For is_partial_only courses the sessions stored in sari_course_id ARE
        // already the partial subset — no further filtering needed.
        // For full courses with optional partial booking we keep only sessions
        // from partial_start_position onward (same logic as cash/webhook).
        const isPartial = !!(isPartialEnrollment || course.is_partial_only)
        if (isPartial && !course.is_partial_only && course.course_sessions?.length > 0) {
          const dbStartPos: number = course.course_category?.partial_start_position ?? 3
          if (dbStartPos > 1) {
            const sortedSessions = [...course.course_sessions].sort((a: any, b: any) =>
              a.start_time.localeCompare(b.start_time)
            )
            let pos = 0
            let lastDate = ''
            const sessionPosMap: Record<string, number> = {}
            for (const s of sortedSessions) {
              const d = s.start_time.split('T')[0]
              if (d !== lastDate) { pos++; lastDate = d }
              if (s.sari_session_id) sessionPosMap[String(s.sari_session_id)] = pos
            }
            // Only filter IDs that are mapped; unknown IDs are left in (safe fallback)
            allSessionIds = allSessionIds.filter(id => {
              const p = sessionPosMap[String(id)]
              return p === undefined || p >= dbStartPos
            })
            logger.info(`🎯 Partial validation: keeping ${allSessionIds.length} session(s) from position ${dbStartPos}`)
          }
        }
        
        // Apply custom session swaps if any
        if (customSessions && typeof customSessions === 'object') {
          logger.info('🔄 Applying custom sessions for validation:', Object.keys(customSessions))
          
          for (const [position, customData] of Object.entries(customSessions)) {
            const custom = customData as any
            const originalIds = custom?.originalSariIds || []
            const newIds = custom?.sariSessionIds || (custom?.sariSessionId ? [custom.sariSessionId] : [])
            
            if (originalIds.length > 0 && newIds.length > 0) {
              for (let i = 0; i < originalIds.length && i < newIds.length; i++) {
                const idx = allSessionIds.findIndex((id: string) => id === originalIds[i] || id === originalIds[i].toString())
                if (idx >= 0) allSessionIds[idx] = newIds[i]
              }
            } else if (newIds.length > 0) {
              const posNum = parseInt(position)
              if (posNum > 0 && posNum <= allSessionIds.length) {
                allSessionIds[posNum - 1] = newIds[0]
              }
            }
          }
        }
        
        logger.info(`🎯 Validating ${allSessionIds.length} sessions: ${allSessionIds.join(', ')}`)
        
        const validationResult = await sari.validateAllSessions(allSessionIds, faberidClean, birthdate)
        
        if (!validationResult.canEnroll) {
          throw createError({
            statusCode: 400,
            statusMessage: validationResult.reason || 'SARI enrollment not possible'
          })
        }
        
        logger.info(`✅ SARI enrollment validation passed for ${allSessionIds.length} sessions`)
      } catch (error: any) {
        if (error.statusCode) throw error
        logger.error('❌ SARI enrollment check failed:', error.message)
        throw createError({
          statusCode: 400,
          statusMessage: error.message || 'Could not verify course availability'
        })
      }
    }

    // 7. Check for duplicate enrollment by FABERID (SARI only) or email (non-SARI)
    if (course.sari_managed && faberidClean) {
      const { data: existingEnrollment } = await supabase
        .from('course_registrations')
        .select('id')
        .eq('course_id', courseId)
        .eq('sari_faberid', faberidClean)
        .in('status', ['confirmed', 'enrolled'])
        .maybeSingle()

      if (existingEnrollment) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.'
        })
      }
    }

    // 7b. Also check by email to give clear feedback
    const finalEmail = email || customerData.email
    const finalPhone = phone || customerData.phone || ''

    const { data: existingByEmail } = await supabase
      .from('course_registrations')
      .select('id')
      .eq('course_id', courseId)
      .eq('email', finalEmail)
      .in('status', ['confirmed', 'enrolled'])
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
      // ⚠️ DON'T CREATE USER HERE ANYMORE!
      // User will be created by webhook after payment confirmation
      logger.debug('👤 No existing user, will be created after payment confirmation')
      guestUserId = null as any // Placeholder
    }

    // ⚠️ REMOVED: Create pending enrollment
    // This was the source of race conditions and orphaned records!
    // Enrollment will ONLY be created when payment is confirmed in webhook
    
    logger.info('ℹ️ Skipping enrollment creation - will be done by webhook after payment')

    // 8b. Re-validate discount code server-side (if provided)
    // Effective price: use partial_price_rappen when this is a partial/partial-only enrollment,
    // fall back to full price when no partial price is configured.
    const isPartialOrder = !!(isPartialEnrollment || course.is_partial_only)
    const partialPriceRappen: number = course.course_category?.partial_price_rappen ?? 0
    const effectiveBasePrice: number = (isPartialOrder && partialPriceRappen > 0)
      ? partialPriceRappen
      : course.price_per_participant_rappen

    let validatedDiscountAmount = 0
    let validatedDiscountCode: string | null = null

    if (discountCode) {
      try {
        const { data: voucherData } = await supabase
          .from('voucher_codes')
          .select('*')
          .ilike('code', discountCode)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .maybeSingle()

        let discountRow: any = voucherData

        if (!discountRow) {
          const { data: giftCard } = await supabase
            .from('vouchers')
            .select('*')
            .ilike('code', discountCode)
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .maybeSingle()
          if (giftCard && !giftCard.redeemed_at) {
            discountRow = { ...giftCard, discount_type: 'fixed', discount_value: giftCard.amount_rappen, is_gift_card: true }
          }
        }

        if (!discountRow) {
          const { data: discountData } = await supabase
            .from('discounts')
            .select('*')
            .ilike('code', discountCode)
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .maybeSingle()
          if (discountData) discountRow = discountData
        }

        if (discountRow) {
          const now = new Date()
          const validUntil = discountRow.valid_until ? new Date(discountRow.valid_until) : null
          if (!validUntil || now <= validUntil) {
            if (discountRow.discount_type === 'percentage') {
              validatedDiscountAmount = Math.round((effectiveBasePrice * discountRow.discount_value) / 100)
              if (discountRow.max_discount_rappen) {
                validatedDiscountAmount = Math.min(validatedDiscountAmount, discountRow.max_discount_rappen)
              }
            } else if (discountRow.discount_type === 'fixed') {
              validatedDiscountAmount = discountRow.discount_value || 0
            }
            validatedDiscountAmount = Math.min(validatedDiscountAmount, effectiveBasePrice)
            validatedDiscountCode = discountCode
          }
        }
      } catch (discountErr: any) {
        logger.warn('⚠️ Discount validation failed (non-critical):', discountErr.message)
      }
    }

    // 9. Check if logged-in user has enough credit to bypass Wallee entirely
    const finalAmount = Math.max(0, effectiveBasePrice - validatedDiscountAmount)

    if (guestUserId && finalAmount > 0) {
      const { data: creditData } = await supabase
        .from('student_credits')
        .select('id, balance_rappen')
        .eq('user_id', guestUserId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      const availableCredit = creditData?.balance_rappen ?? 0

      if (availableCredit >= finalAmount) {
        logger.info(`💳 Covering course enrollment fully with credit (CHF ${(finalAmount / 100).toFixed(2)})`)

        // Deduct credit
        const newBalance = availableCredit - finalAmount
        await supabase.from('student_credits').update({ balance_rappen: newBalance, updated_at: new Date().toISOString() }).eq('id', creditData!.id)

        // Log credit transaction
        await supabase.from('credit_transactions').insert({
          user_id: guestUserId,
          tenant_id: tenantId,
          transaction_type: 'payment',
          amount_rappen: -finalAmount,
          balance_before_rappen: availableCredit,
          balance_after_rappen: newBalance,
          payment_method: 'credit',
          reference_type: 'course',
          notes: `Guthaben für Kurs verwendet: ${course.name}`,
          status: 'completed',
          created_at: new Date().toISOString()
        })

        // Enroll in SARI (per-session, partial-subset aware)
        try {
          const sariCourseIdParts = String(course.sari_course_id || '').split('_')
          let creditSariSessionIds = sariCourseIdParts.slice(1).filter((id: string) => id && !isNaN(parseInt(id)))

          // Apply same partial filtering as main path
          if (isPartialOrder && !course.is_partial_only && course.course_sessions?.length > 0) {
            const dbStartPos: number = course.course_category?.partial_start_position ?? 3
            if (dbStartPos > 1) {
              const sortedSessions = [...course.course_sessions].sort((a: any, b: any) =>
                a.start_time.localeCompare(b.start_time)
              )
              let pos = 0; let lastDate = ''
              const sessionPosMap: Record<string, number> = {}
              for (const s of sortedSessions) {
                const d = s.start_time.split('T')[0]
                if (d !== lastDate) { pos++; lastDate = d }
                if (s.sari_session_id) sessionPosMap[String(s.sari_session_id)] = pos
              }
              creditSariSessionIds = creditSariSessionIds.filter(id => {
                const p = sessionPosMap[String(id)]
                return p === undefined || p >= dbStartPos
              })
            }
          }

          for (const sessionId of creditSariSessionIds) {
            try {
              await sari.enrollStudent(parseInt(sessionId), faberidClean, birthdate)
              logger.debug(`✅ SARI session ${sessionId} enrolled (credit path)`)
            } catch (sErr: any) {
              if (sErr.message?.includes('ALREADY_ENROLLED') || sErr.message?.includes('PERSON_ALREADY_ADDED')) {
                logger.debug(`⏭️ Session ${sessionId}: Already enrolled (OK)`)
              } else {
                logger.warn(`⚠️ SARI session ${sessionId} failed (credit path, non-fatal):`, sErr.message)
              }
            }
          }
          logger.info(`✅ SARI enrollment done (credit path, ${creditSariSessionIds.length} sessions)`)
        } catch (sariErr: any) {
          logger.warn('⚠️ SARI enrollment failed (credit path, non-fatal):', sariErr.message)
        }

        // Create confirmed registration directly
        await supabase.from('course_registrations').insert({
          course_id: courseId,
          tenant_id: tenantId,
          user_id: guestUserId,
          first_name: customerData.firstname,
          last_name: customerData.lastname,
          sari_faberid: faberidClean || null,
          amount_paid_rappen: finalAmount,
          discount_applied_rappen: validatedDiscountAmount,
          discount_code: validatedDiscountCode,
          email: finalEmail,
          phone: finalPhone,
          street: customerData.street || customerData.address || null,
          street_nr: customerData.streetNr || null,
          zip: customerData.zip || null,
          city: customerData.city || null,
          birthdate: customerData.birthdate || birthdate || null,
          license_number: customerData.licenseNumber || null,
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'credit',
          custom_sessions: customSessions || null,
          is_partial_enrollment: isPartialOrder,
          registration_date: new Date().toISOString(),
          registered_at: new Date().toISOString(),
          sari_synced: course.sari_managed ? true : null,
          sari_synced_at: course.sari_managed ? new Date().toISOString() : null,
          vehicle_id: vehicleId || null,
          created_at: new Date().toISOString(),
        })

        logger.info('✅ Course registration created (credit payment)')
        return { success: true, paidWithCredit: true }
      }
    }

    // 9.5 At this point Wallee will actually be invoked. Enforce
    //     tenant.wallee_enabled HERE (after the credit-bypass paths have
    //     completed). This keeps credit-only enrollments possible even when
    //     online payments are disabled, while still preventing direct
    //     Wallee transactions on tenants that have not activated online
    //     payments yet.
    if (!tenant.wallee_enabled) {
      logger.warn('🚫 Wallee enrollment blocked: tenant has not activated online payments', { tenantId, courseId })
      throw createError({
        statusCode: 402,
        statusMessage: 'Online-Zahlung ist für diese Fahrschule aktuell nicht aktiviert. Bitte kontaktiere die Fahrschule direkt für die Anmeldung.'
      })
    }

    // 10. Call payment processor (WITH VALIDATION DATA, NOT ENROLLMENT ID)
    // finalAmount already reflects partial pricing and discounts.
    const priceChf = finalAmount / 100
    
    try {
      const paymentResponse = await $fetch('/api/payments/process-public', {
        method: 'POST',
        body: {
          courseId: courseId,
          amount: finalAmount,
          currency: 'CHF',
          customerEmail: finalEmail,
          customerName: `${customerData.firstname} ${customerData.lastname}`,
          tenantId: tenantId,
          ...(guestUserId ? { userId: guestUserId } : {}),
          metadata: {
            courseId: courseId,
            sari_faberid: faberidClean || null,
            sari_birthdate: birthdate || null,
            course_name: course.name,
            course_location: course.description,
            firstname: customerData.firstname,
            lastname: customerData.lastname,
            // SARI returns `address` (full street string); non-SARI provides `street` + `streetNr`
            street: customerData.street || customerData.address || null,
            street_nr: customerData.streetNr || null,
            zip: customerData.zip || null,
            city: customerData.city || null,
            birthdate: customerData.birthdate || birthdate || null,
            license_number: customerData.licenseNumber || null,
            email: finalEmail,
            phone: finalPhone,
            custom_sessions: customSessions || null,
            referral_code: referralCode || null,
            is_partial_enrollment: isPartialOrder,
            partial_start_position: course.course_category?.partial_start_position ?? 3,
            discount_code: validatedDiscountCode,
            discount_amount_rappen: validatedDiscountAmount,
            original_price_rappen: course.price_per_participant_rappen,
            marketing_session_id: marketingSessionId || null,
            vehicle_id: vehicleId || null,
            ...(course.sari_managed && faberidClean ? {
              sari_validation_data: {
                license: customerData.license,
                birthdate: customerData.birthdate,
                faberid: faberidClean
              }
            } : {})
          }
        }
      }) as any

      if (paymentResponse.success && paymentResponse.paymentUrl) {
        logger.info('✅ Payment URL generated (registration will be created after payment)')
        return {
          success: true,
          // ⚠️ REMOVED: enrollmentId (doesn't exist until payment confirmed)
          paymentUrl: paymentResponse.paymentUrl,
          // ✅ NEW: Let frontend know to expect creation after payment
          message: 'Please complete payment to finalize your enrollment'
        }
      } else {
        throw new Error('No payment URL received')
      }
    } catch (error: any) {
      logger.error('❌ Payment processing failed:', error.message)
      
      // ⚠️ REMOVED: Cancel enrollment (doesn't exist anymore!)
      // No cleanup needed since we didn't create anything in DB
      
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

