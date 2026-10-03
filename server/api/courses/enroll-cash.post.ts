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
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { SARIClient } from '~/utils/sariClient'
import { getSARICredentialsSecure } from '~/server/utils/sari-credentials-secure'
import {
  isConfirmedSariEnrollDuplicate,
  isSameConfirmedEnrollment,
  parsePositiveSariSessionId,
  persistConfirmedEnrollmentSnapshots,
  recordConfirmedSariMembershipWithRetry,
  resumeExistingConfirmedEnrollment,
  SARI_MEMBERSHIP_SOURCE,
  setRegistrationSariSynced,
  strictSariIdsFromGroup,
  uniqueLocalCourseSessionId,
} from '~/server/utils/registration-sari-membership'
import { validateLicense } from '~/server/utils/license-validation'
import { createRateLimitMiddleware } from '~/server/middleware/rate-limiting'
import { findExistingUserByContact, findStaffOrAdminByEmail, findStaffOrAdminByPhone } from '~/server/utils/user-matching'
import { normalizePhoneNumber } from '~/server/utils/sms'
import { upsertMarketingLeadSafe, categoriesFromCourse } from '~/server/utils/upsert-marketing-lead'
import { sha256Hex } from '~/server/utils/meta-capi'
import { reportBindingCourseConversionSafely } from '~/server/utils/binding-booking-conversion'
import { resolveMarketingAttribution } from '~/server/utils/resolve-marketing-attribution'
import { resolveNonWalleeEnrollmentMethod } from '~/server/utils/course-enrollment-payment-method'
import { normalizeEnrollmentEmail } from '~/server/utils/normalize-enrollment-email'
import { internalSecretHeaders } from '~/server/utils/require-staff-or-internal'
import { throwIfCourseCapacityExceeded } from '~/server/utils/course-capacity'
import {
  assertCustomSessionsForTenant,
  loadPublicCourseForEnrollment,
} from '~/server/utils/course-custom-sessions'
import { publicCourseSessionPrincipalId } from '~/server/utils/fulfill-course-wallee-payment'
import {
  publicCourseEnrollmentMessage,
  resolvePublicEnrollmentPriceRappen,
  runPublicCourseInvoiceBilling,
  toPublicBillingResponse,
  type PublicCourseBillingResult,
} from '~/server/utils/public-course-invoice'

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

type CashRegistrationRow = {
  id: string
  tenant_id: string
  course_id: string
  sari_faberid: string | null
  status: string
  payment_method: string | null
}

function resolveCashSariSessionIds(args: {
  course: any
  isPartial: boolean
  isIndividualSess: boolean
  individualSessionNumber?: number
  customSessions: unknown
}): string[] {
  let sariSessionIds = strictSariIdsFromGroup(args.course.sari_course_id).map(String)
  const { course, isPartial, isIndividualSess, individualSessionNumber, customSessions } = args

  if (isPartial && !course.is_partial_only && !isIndividualSess && course.course_category && !course.course_category.allow_partial_enrollment) {
    throw createError({ statusCode: 400, statusMessage: 'Teilbuchung ist für diesen Kurs nicht erlaubt.' })
  }

  if (isIndividualSess) {
    const targetSess = (course.course_sessions || []).find(
      (s: any) => s.session_number === individualSessionNumber && s.allow_individual_booking
    )
    const individualSariId = parsePositiveSariSessionId(targetSess?.sari_session_id)
    if (individualSariId != null) {
      sariSessionIds = [String(individualSariId)]
    } else if (sariSessionIds.length >= (individualSessionNumber || 0)) {
      sariSessionIds = [sariSessionIds[(individualSessionNumber || 1) - 1]]
    }
    logger.info(`🎯 Individual session ${individualSessionNumber}: enrolling in ${sariSessionIds.join(',')}`)
  } else {
    const dbStartPos: number = course.course_category?.partial_start_position ?? 3
    if (isPartial && dbStartPos > 1 && course.course_sessions?.length > 0) {
      const startPos = dbStartPos
      const sortedSessions = [...course.course_sessions].sort((a: any, b: any) =>
        a.start_time.localeCompare(b.start_time)
      )
      let pos = 0
      let lastDate = ''
      const sessionPosMap: Record<string, number> = {}
      for (const s of sortedSessions) {
        const d = s.start_time.split('T')[0]
        if (d !== lastDate) { pos++; lastDate = d }
        if (s.sari_session_id) sessionPosMap[s.sari_session_id] = pos
      }
      sariSessionIds = sariSessionIds.filter(id => {
        const p = sessionPosMap[id]
        return p === undefined || p >= startPos
      })
      logger.info(`🎯 Partial enrollment: keeping ${sariSessionIds.length} session(s) from position ${startPos}`)
    }
  }

  if (customSessions && typeof customSessions === 'object') {
    logger.info('🔄 Applying custom sessions for SARI enrollment:', customSessions)
    for (const [position, customData] of Object.entries(customSessions)) {
      const custom = customData as any
      const originalIds = custom?.originalSariIds || []
      const newIds = custom?.sariSessionIds || (custom?.sariSessionId ? [custom.sariSessionId] : [])
      logger.debug(`📍 Position ${position}: originalIds=${originalIds.join(',')}, newIds=${newIds.join(',')}`)
      if (originalIds.length > 0 && newIds.length > 0) {
        for (let i = 0; i < originalIds.length && i < newIds.length; i++) {
          const origId = originalIds[i]
          const newId = newIds[i]
          const strictNewId = parsePositiveSariSessionId(newId)
          const idx = sariSessionIds.findIndex((id: string) => id === origId || id === String(origId))
          if (idx >= 0 && strictNewId != null) {
            logger.debug(`📝 Replacing session ID ${sariSessionIds[idx]} → ${strictNewId} at index ${idx}`)
            sariSessionIds[idx] = String(strictNewId)
          } else {
            logger.warn(`⚠️ Original session ID ${origId} not found in course sessions`)
          }
        }
      } else if (newIds.length > 0 && originalIds.length === 0) {
        logger.warn('⚠️ Using legacy position-based replacement (no originalSariIds)')
        const courseSessions = course.course_sessions || []
        const sessionsPerPosition: number[] = []
        if (courseSessions.length > 0) {
          const byDate: Map<string, number> = new Map()
          for (const session of courseSessions) {
            const date = session.start_time.split('T')[0]
            byDate.set(date, (byDate.get(date) || 0) + 1)
          }
          for (const count of byDate.values()) sessionsPerPosition.push(count)
        } else if (sariSessionIds.length === 4) {
          sessionsPerPosition.push(2, 2)
        } else {
          sessionsPerPosition.push(...Array(sariSessionIds.length).fill(1))
        }
        const posNum = parseInt(position)
        let startIdx = 0
        for (let p = 0; p < posNum - 1 && p < sessionsPerPosition.length; p++) {
          startIdx += sessionsPerPosition[p]
        }
        for (let i = 0; i < newIds.length && (startIdx + i) < sariSessionIds.length; i++) {
          const strictNewId = parsePositiveSariSessionId(newIds[i])
          if (strictNewId == null) continue
          logger.debug(`📝 Legacy replacing session at index ${startIdx + i}: ${sariSessionIds[startIdx + i]} → ${strictNewId}`)
          sariSessionIds[startIdx + i] = String(strictNewId)
        }
      }
    }
  }

  return sariSessionIds
}

async function loadCashFaberRegistrations(
  supabase: any,
  tenantId: string,
  courseId: string,
  faberid: string,
): Promise<CashRegistrationRow[]> {
  const { data, error } = await supabase
    .from('course_registrations')
    .select('id, tenant_id, course_id, sari_faberid, status, payment_method')
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)
    .eq('sari_faberid', faberid)
    .in('status', ['confirmed', 'pending'])
    .is('deleted_at', null)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Anmeldung konnte nicht geprüft werden.' })
  }
  return (data || []) as CashRegistrationRow[]
}

function cashSessionsFromIds(course: any, tenantId: string, sessionIds: string[]) {
  return sessionIds.flatMap((id) => {
    const sariSessionId = parsePositiveSariSessionId(id)
    if (sariSessionId == null) return []
    return [{
      sariSessionId,
      courseSessionId: uniqueLocalCourseSessionId(course.course_sessions, sariSessionId, tenantId),
    }]
  })
}

const handler = defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      courseId, 
      faberid, 
      birthdate, 
      firstName,            // Non-SARI courses
      lastName,             // Non-SARI courses
      street,               // Non-SARI courses: address
      streetNr,             // Non-SARI courses: house number
      zip,                  // Non-SARI courses: postal code
      city,                 // Non-SARI courses: city
      licenseNumber,        // Non-SARI courses: driver's license number
      tenantId: requestedTenantId,
      email,
      phone,
      customSessions: requestedCustomSessions,
      isPartialEnrollment,
      partialStartPosition,
      individualSessionNumber,  // Set when booking a single allow_individual_booking session
      marketingSessionId,   // Optional: analytics session ID from drivingteam.ch for attribution
      marketingAttribution, // Optional: client-side gclid/UTM blob
      vehicleId,            // Optional: selected rental vehicle
      paymentMethod: _requestedPaymentMethod, // accepted for back-compat; course.payment_method wins
    } = body

    logger.debug('💵 Cash enrollment request:', { courseId, requestedTenantId, hasCustomSessions: !!requestedCustomSessions, isPartialEnrollment })

    // 1. Validate inputs — tenant is derived from the public course, not trusted from the client.
    if (!courseId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    const supabase = getSupabaseAdmin()

    const course = await loadPublicCourseForEnrollment(supabase, courseId, requestedTenantId)
    const tenantId = course.tenant_id

    const { sanitized: customSessions } = await assertCustomSessionsForTenant({
      supabase,
      tenantId,
      customSessions: requestedCustomSessions,
      requirePublic: true,
      enrollmentCourseId: course.id,
    })

    const { data: tenant } = await supabase
      .from('tenants')
      .select('wallee_enabled, is_active')
      .eq('id', tenantId)
      .single()
    if (!tenant || tenant.is_active === false) {
      throw createError({ statusCode: 404, statusMessage: 'Tenant nicht verfügbar' })
    }

    // 2b. This endpoint handles two "no upfront online payment" methods:
    // cash-on-site and invoice. Which one is actually used is resolved below;
    // both are gated so a spoofed request can't dodge Wallee for a course
    // that requires it.
    //
    // Invoice is only allowed when BOTH are true:
    //   a) The course's `payment_method` column is explicitly set to 'INVOICE'.
    //   b) The tenant has enabled invoice payments tenant-wide
    //      (tenant_settings.payment.payment_settings.invoice_payments_enabled).
    //
    // Cash-on-site is allowed in three cases:
    //   a) The course's `payment_method` column is explicitly set to
    //      'CASH_ON_SITE' by an admin (highest priority).
    //   b) The course's city is Einsiedeln (historical default).
    //   c) The tenant has not activated Wallee at all — in that case cash
    //      is the only option we can offer, so we accept it for every city.
    // This mirrors `getCoursePaymentMethod` on the client.
    const explicitMethod = (course as any).payment_method as string | null | undefined
    const explicitCity = (course as any).city as string | null | undefined
    const isEinsiedeln = explicitCity
      ? explicitCity.toLowerCase() === 'einsiedeln'
      : (course.description?.toLowerCase() || '').includes('einsiedeln')
    const adminAllowedCash = explicitMethod === 'CASH_ON_SITE'

    let adminAllowedInvoice = false
    if (explicitMethod === 'INVOICE') {
      const { data: paymentSettingRow } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenantId)
        .eq('category', 'payment')
        .eq('setting_key', 'payment_settings')
        .maybeSingle()
      const tenantPaymentSettings = paymentSettingRow?.setting_value
        ? (typeof paymentSettingRow.setting_value === 'string' ? JSON.parse(paymentSettingRow.setting_value) : paymentSettingRow.setting_value)
        : {}
      adminAllowedInvoice = tenantPaymentSettings.invoice_payments_enabled === true
    }

    if (!adminAllowedCash && !adminAllowedInvoice && !isEinsiedeln && tenant.wallee_enabled) {
      logger.warn('❌ Cash/invoice payment attempted for course without override on Wallee-enabled tenant:', {
        courseId,
        city: explicitCity,
        location: course.description,
        payment_method: explicitMethod
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Cash-on-site payment is not enabled for this course. Please use online payment.'
      })
    }

    // Course column is source of truth. Do not default invoice courses to cash
    // (that sent "bitte bar mitbringen" confirmation emails).
    const finalPaymentMethod = resolveNonWalleeEnrollmentMethod({
      coursePaymentMethod: explicitMethod,
      invoiceEnabled: adminAllowedInvoice,
    })

    // 3 & 4. SARI credential loading + validation (only for SARI-managed courses)
    let sari: any = null
    let faberidClean = ''
    let customerData: any

    if (course.sari_managed) {
      if (!faberid || !birthdate) {
        throw createError({ statusCode: 400, statusMessage: 'Faber-ID und Geburtsdatum erforderlich' })
      }
      const credentials = await getSARICredentialsSecure(tenantId, 'COURSE_ENROLLMENT_CASH')
      if (!credentials) {
        throw createError({ statusCode: 500, statusMessage: 'SARI not configured for this tenant' })
      }
      sari = new SARIClient(credentials)
      faberidClean = faberid.replace(/\./g, '')

      try {
        customerData = await sari.getCustomer(faberidClean, birthdate)
        logger.debug('✅ SARI customer validated:', customerData.firstname)
      } catch (error: any) {
        logger.error('❌ SARI validation failed:', error.message)
        throw createError({ statusCode: 400, statusMessage: error.message || 'SARI validation failed' })
      }

      // 5a. License validation
      try {
        validateLicense(course, customerData)
      } catch (error: any) {
        logger.error('❌ License validation failed:', error.message)
        throw error
      }

      // 6. SARI enrollment possibility check
      if (course.sari_course_id) {
        try {
          const probeIds = strictSariIdsFromGroup(course.sari_course_id)
          if (probeIds.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'Ungültiges Kursformat. Bitte kontaktieren Sie uns.' })
          }
          for (const probeId of probeIds) {
            const enrollmentCheck = await sari.canEnrollInCourse(probeId, faberidClean)
            const alreadyOnSession = (enrollmentCheck.reason || '').includes('bereits')
            if (!enrollmentCheck.canEnroll && !alreadyOnSession) {
              throw createError({ statusCode: 400, statusMessage: enrollmentCheck.reason || 'SARI enrollment not possible' })
            }
          }
        } catch (error: any) {
          if (error.statusCode) throw error
          throw createError({ statusCode: 400, statusMessage: 'Could not verify course availability' })
        }
      }
    } else {
      // Non-SARI course
      if (!firstName || !lastName) {
        throw createError({ statusCode: 400, statusMessage: 'Vor- und Nachname erforderlich' })
      }
      customerData = { firstname: firstName.trim(), lastname: lastName.trim(), email, phone, street, streetNr, zip, city, licenseNumber, birthdate }
      logger.debug('✅ Non-SARI cash enrollment:', `${firstName} ${lastName}`)
    }

    const isPartial = !!(isPartialEnrollment || course.is_partial_only)
    const isIndividualSess =
      isPartial && typeof individualSessionNumber === 'number' && individualSessionNumber > 0

    // 7. Duplicate check (SARI: by faberid; non-SARI: by email).
    // A confirmed same-tenant/course/Faber row with a missing snapshot is repaired
    // from this attempt's strict session ids, then the duplicate response is returned.
    if (course.sari_managed && faberidClean) {
      const existingRows = await loadCashFaberRegistrations(supabase, tenantId, courseId, faberidClean)
      if (existingRows.length > 1) {
        throw createError({ statusCode: 409, statusMessage: 'Die bestehende Anmeldung ist nicht eindeutig.' })
      }
      const existingEnrollment = existingRows[0]
      if (existingEnrollment && !course.sari_course_id) {
        throw createError({ statusCode: 409, statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.' })
      }
      if (existingEnrollment && !isSameConfirmedEnrollment(existingEnrollment, {
        tenantId,
        courseId,
        faberid: faberidClean,
      })) {
        throw createError({ statusCode: 409, statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.' })
      }
      if (existingEnrollment && course.sari_course_id) {
        const sessionIds = resolveCashSariSessionIds({
          course,
          isPartial,
          isIndividualSess,
          individualSessionNumber,
          customSessions,
        })
        if (sessionIds.length === 0) {
          throw createError({ statusCode: 400, statusMessage: 'Ungültiges Kursformat. Bitte kontaktieren Sie uns.' })
        }
        await resumeExistingConfirmedEnrollment({
          supabase,
          sari,
          tenantId,
          courseId,
          registration: existingEnrollment,
          faberid: faberidClean,
          birthdate,
          sessions: cashSessionsFromIds(course, tenantId, sessionIds),
          source: SARI_MEMBERSHIP_SOURCE.cashEnrollment,
          duplicateStatusMessage: 'Sie sind bereits für diesen Kurs angemeldet.',
        })
      }
    }

    // 7b. Also check by email (skip blank — '' would collide with other no-email enrollments)
    const finalEmail = normalizeEnrollmentEmail(email || customerData.email)
    const finalPhone = phone || customerData.phone || ''

    if (finalEmail) {
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
    }

    // 8. Identity: session principal if tenant-valid; else new guest only when
    // contact is unused. Matching an existing customer is discovery, not attach.
    logger.debug('🔍 Looking for existing user with email/phone:', { finalEmail, finalPhone })

    // Staff/admin autofill must fail before we match any customer by phone.
    if (finalEmail) {
      const staffHit = await findStaffOrAdminByEmail(supabase, { email: finalEmail, tenantId })
      if (staffHit) {
        throw createError({
          statusCode: 400,
          statusMessage:
            'Diese E-Mail gehört einem Mitarbeiterkonto. Bitte die E-Mail der Kursteilnehmerin / des Kursteilnehmers verwenden.',
        })
      }
    }
    if (finalPhone) {
      const staffPhoneHit = await findStaffOrAdminByPhone(supabase, { phone: finalPhone, tenantId })
      if (staffPhoneHit) {
        throw createError({
          statusCode: 400,
          statusMessage:
            'Diese Telefonnummer gehört einem Mitarbeiterkonto. Bitte die Telefonnummer der Kursteilnehmerin / des Kursteilnehmers verwenden.',
        })
      }
    }

    const sessionUser = await getAuthenticatedUserWithDbId(event)
    const sessionPrincipalId = publicCourseSessionPrincipalId(sessionUser, tenantId)
    if (sessionUser?.id && !sessionPrincipalId) {
      logger.warn('⚠️ Ignoring non-customer or cross-tenant session on public cash enroll', {
        sessionTenantId: sessionUser.tenant_id,
        courseTenantId: tenantId,
        role: sessionUser.role,
      })
    }

    let guestUserId: string | null = sessionPrincipalId

    if (!guestUserId) {
      const existingUser = await findExistingUserByContact(supabase, {
        email: finalEmail,
        phone: finalPhone,
        tenantId,
        roles: ['client'],
      })

      if (existingUser) {
        logger.debug('ℹ️ Contact matches existing customer (discovery only; not attaching):', existingUser.id)
        guestUserId = null
      } else {
        logger.debug('👤 Creating guest user...')

        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            first_name: customerData.firstname,
            last_name: customerData.lastname,
            email: finalEmail,
            phone: normalizePhoneNumber(finalPhone) || finalPhone,
            tenant_id: tenantId,
            role: 'client',
            is_active: true,
            auth_user_id: null // No auth account — guest user identified by null auth_user_id
          })
          .select('id')
          .single()

        if (userError || !newUser) {
          logger.error('❌ Failed to create guest user:', userError)
          if (userError?.code === '23505') {
            // Unique contact collision: do not attach the existing row; continue unlinked.
            guestUserId = null
          } else {
            const msg = userError?.message || ''
            if (msg.includes('users_phone_tenant_unique') || msg.includes('phone')) {
              throw createError({
                statusCode: 400,
                statusMessage:
                  'Diese Telefonnummer ist bereits registriert. Bitte die Telefonnummer der Kursteilnehmerin / des Kursteilnehmers verwenden.',
              })
            }
            if (msg.includes('users_email_tenant_unique') || msg.includes('email')) {
              throw createError({
                statusCode: 400,
                statusMessage:
                  'Diese E-Mail ist bereits registriert. Bitte eine andere E-Mail verwenden oder den bestehenden Kunden anmelden.',
              })
            }
            throw createError({
              statusCode: 500,
              statusMessage: 'Guest user could not be created'
            })
          }
        } else {
          guestUserId = newUser.id
          logger.info('✅ Guest user created:', guestUserId)
        }
      }
    }

    // Flags are computed before the duplicate check so a retry can repair snapshots
    // without creating a second registration. They stay in this scope for the insert.
    const confirmedSariSessions: Array<{ sariSessionId: number; courseSessionId: string | null }> = []
    let sariErrorCount = 0

    // 9. SARI sync FIRST (before DB save) - if managed
    // Enroll in ALL sessions (GROUP_2159157_2159158_2159159 → [2159157, 2159158, 2159159])
    if (course.sari_managed && course.sari_course_id && faberidClean) {
      const sariSessionIds = resolveCashSariSessionIds({
        course,
        isPartial,
        isIndividualSess,
        individualSessionNumber,
        customSessions,
      })

      if (sariSessionIds.length === 0) {
        logger.error('❌ Invalid SARI course ID format:', course.sari_course_id)
        throw createError({
          statusCode: 400,
          statusMessage: 'Ungültiges Kursformat. Bitte kontaktieren Sie uns.'
        })
      }

      logger.info(`🎯 Enrolling in SARI for ${sariSessionIds.length} sessions: ${sariSessionIds.join(', ')}`)
      
      // Enroll in ALL sessions. Membership rows are written only for ids SARI confirmed,
      // and only after the registration row exists.
      let successCount = 0
      let lastError: any = null

      for (const sessionId of sariSessionIds) {
        const numericId = parsePositiveSariSessionId(sessionId)
        if (numericId == null) {
          sariErrorCount++
          continue
        }
        try {
          logger.debug(`📝 Enrolling in session ${sessionId}...`)
          await sari.enrollStudent(numericId, faberidClean, birthdate)
          successCount++
          confirmedSariSessions.push({
            sariSessionId: numericId,
            courseSessionId: uniqueLocalCourseSessionId(course.course_sessions, numericId, tenantId),
          })
          logger.debug(`✅ Session ${sessionId} enrolled`)
        } catch (error: any) {
          const errorMessage = error.message || ''
          
          // If already enrolled, that's OK - count as success
          if (isConfirmedSariEnrollDuplicate(errorMessage)) {
            logger.debug(`⏭️ Session ${sessionId}: Already enrolled (OK)`)
            successCount++
            confirmedSariSessions.push({
              sariSessionId: numericId,
              courseSessionId: uniqueLocalCourseSessionId(course.course_sessions, numericId, tenantId),
            })
          } else {
            lastError = error
            sariErrorCount++
            logger.warn(`⚠️ Session ${sessionId} enrollment failed:`, errorMessage)
          }
        }
      }
      
      logger.info(`✅ SARI enrollment: ${successCount}/${sariSessionIds.length} sessions successful${sariErrorCount > 0 ? `, ${sariErrorCount} errors` : ''}`)
      
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
        user_id: guestUserId,
        first_name: customerData.firstname,
        last_name: customerData.lastname,
        email: finalEmail,
        phone: finalPhone,
        sari_faberid: faberidClean || null,
        // SARI returns `address` (full string); non-SARI provides `street` + `streetNr`
        street: customerData.street || customerData.address || null,
        street_nr: customerData.streetNr || null,
        zip: customerData.zip || null,
        city: customerData.city || null,
        birthdate: customerData.birthdate || birthdate || null,
        license_number: customerData.licenseNumber || null,
        status: 'confirmed',
        payment_status: 'pending',
        payment_method: finalPaymentMethod,
        amount_paid_rappen: 0,
        registration_date: new Date().toISOString(),
        registered_at: new Date().toISOString(),
        custom_sessions: customSessions || null,
        is_partial_enrollment: !!(isPartialEnrollment || course.is_partial_only),
        individual_session_number: (typeof individualSessionNumber === 'number' && individualSessionNumber > 0) ? individualSessionNumber : null,
        partial_start_session: (!isIndividualSess && (isPartialEnrollment || course.is_partial_only)) ? (course.course_category?.partial_start_position ?? 3) : null,
        sari_synced: false,
        sari_synced_at: null,
        notes: marketingSessionId ? `marketing_session_id:${marketingSessionId}` : null,
        vehicle_id: vehicleId || null,
      })
      .select('id')
      .single()

    if (enrollmentError || !enrollment) {
      throwIfCourseCapacityExceeded(enrollmentError)
      logger.error('❌ Failed to create enrollment:', enrollmentError)
      
      // Provide clearer error messages
      if (enrollmentError?.message?.includes('duplicate key')) {
        if (
          faberidClean
          && (
            enrollmentError.message.includes('course_id_sari_faberid')
            || enrollmentError.message.includes('unique_faberid')
          )
        ) {
          const raced = await loadCashFaberRegistrations(supabase, tenantId, courseId, faberidClean)
          if (raced.length === 1 && isSameConfirmedEnrollment(raced[0], {
            tenantId,
            courseId,
            faberid: faberidClean,
          })) {
            await persistConfirmedEnrollmentSnapshots({
              supabase,
              tenantId,
              registrationId: raced[0].id,
              sessions: confirmedSariSessions,
              source: SARI_MEMBERSHIP_SOURCE.cashEnrollment,
              markSynced: sariErrorCount === 0 && confirmedSariSessions.length > 0,
            })
          }
          throw createError({
            statusCode: 409,
            statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.'
          })
        }
        if (
          enrollmentError.message.includes('course_id_email_key') ||
          enrollmentError.message.includes('unique_email')
        ) {
          throw createError({
            statusCode: 409,
            statusMessage: 'Diese E-Mail-Adresse ist bereits für diesen Kurs angemeldet.'
          })
        }
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: 'Anmeldung konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.'
      })
    }

    logger.info('✅ Confirmed enrollment created:', enrollment.id)

    for (const confirmed of confirmedSariSessions) {
      await recordConfirmedSariMembershipWithRetry({
        supabase,
        tenantId,
        registrationId: enrollment.id,
        sariSessionId: confirmed.sariSessionId,
        courseSessionId: confirmed.courseSessionId,
        source: SARI_MEMBERSHIP_SOURCE.cashEnrollment,
      })
    }
    if (course.sari_managed && confirmedSariSessions.length > 0 && sariErrorCount === 0) {
      await setRegistrationSariSynced(supabase, tenantId, enrollment.id, true)
    }

    upsertMarketingLeadSafe({
      tenantId,
      email: finalEmail,
      firstName: customerData?.firstname || firstName,
      lastName: customerData?.lastname || lastName,
      phone: finalPhone || phone,
      categories: categoriesFromCourse(course),
      tags: ['client', 'course'],
      source: 'course_enroll',
      sourceLabel: course?.name ? `Kurs: ${course.name}` : 'Kursanmeldung',
    })

    // ── Vehicle bookings for each session (if vehicle selected) ──────────────
    // For partial/individual enrollments only create bookings for the sessions the customer booked.
    if (vehicleId && course.course_sessions?.length) {
      try {
        const isPartialOrd = !!(isPartialEnrollment || course.is_partial_only)
        const isIndivSess = isPartialOrd && typeof individualSessionNumber === 'number' && individualSessionNumber > 0
        let sessionsForVehicle = course.course_sessions

        if (isIndivSess) {
          sessionsForVehicle = course.course_sessions.filter((s: any) => s.session_number === individualSessionNumber)
        } else if (isPartialOrd && !course.is_partial_only) {
          const dbStartPos: number = course.course_category?.partial_start_position ?? 3
          if (dbStartPos > 1) {
            const sortedAll = [...course.course_sessions].sort((a: any, b: any) =>
              a.start_time.localeCompare(b.start_time)
            )
            let pos = 0; let lastDate = ''
            const posMap = new Map<string, number>()
            for (const s of sortedAll) {
              const d = s.start_time.split('T')[0]
              if (d !== lastDate) { pos++; lastDate = d }
              posMap.set(s.id, pos)
            }
            sessionsForVehicle = course.course_sessions.filter((s: any) => (posMap.get(s.id) ?? 0) >= dbStartPos)
          }
        }

        const vBookings = sessionsForVehicle.map((s: any) => ({
          vehicle_id: vehicleId,
          tenant_id: tenantId,
          course_id: courseId,
          course_session_id: s.id,
          start_time: s.start_time,
          end_time: s.end_time,
          purpose: 'course',
          status: 'confirmed',
          booked_by: guestUserId || null,
        }))
        const { error: vErr } = await supabase.from('vehicle_bookings').insert(vBookings)
        if (vErr) logger.warn('⚠️ vehicle_bookings insert failed (non-fatal):', vErr.message)
        else logger.info(`✅ ${vBookings.length} vehicle_bookings created for course`)
      } catch (vE: any) {
        logger.warn('⚠️ vehicle_bookings creation failed (non-fatal):', vE.message)
      }
    }

    // ✅ AFFILIATE REWARD HOOK – trigger for cash course enrollment
    if (guestUserId) {
      let courseCategory: string | null = course.category || null
      $fetch('/api/affiliate/process-reward', {
        method: 'POST',
        headers: { 'x-internal-secret': process.env.CRON_SECRET || '' },
        body: {
          course_registration_id: enrollment.id,
          course_id: course.id,
          user_id: guestUserId,
          tenant_id: tenantId,
          driving_category: courseCategory,
        }
      }).catch((err: any) => {
        logger.warn('⚠️ Affiliate reward hook failed (non-fatal):', err?.message)
      })
    }

    const effectivePrice = resolvePublicEnrollmentPriceRappen({
      pricePerParticipantRappen: course.price_per_participant_rappen ?? null,
      isPartialOnly: !!course.is_partial_only,
      isPartialEnrollment: !!isPartialEnrollment,
      individualSessionNumber: typeof individualSessionNumber === 'number' ? individualSessionNumber : null,
      partialPriceRappen: course.course_category?.partial_price_rappen ?? null,
      sessions: course.course_sessions || [],
    })

    let billing: PublicCourseBillingResult | null = null
    if (finalPaymentMethod === 'invoice') {
      try {
        billing = await runPublicCourseInvoiceBilling({
          supabase,
          registrationId: enrollment.id,
        })
      } catch (billingError: any) {
        logger.error('public course invoice billing failed after enrollment', billingError?.message || billingError)
        billing = { status: 'failed', reason: 'billing_error', emailed: false }
      }
    }

    const quotedRappen = (billing?.status === 'sent' || billing?.status === 'created') && billing.grossRappen != null
      ? billing.grossRappen
      : effectivePrice

    // 11. Send confirmation email
    try {
      await $fetch('/api/emails/send-course-enrollment-confirmation', {
        method: 'POST',
        headers: internalSecretHeaders(),
        body: {
          courseRegistrationId: enrollment.id,
          paymentMethod: finalPaymentMethod === 'invoice' ? 'invoice' : 'cash',
          totalAmount: quotedRappen / 100, // In CHF
          ...(finalPaymentMethod === 'invoice'
            ? { invoiceNotice: billing?.status === 'sent' ? 'sent' : billing?.status === 'created' ? 'created' : 'none' }
            : {}),
        }
      })
      logger.info(`📧 Confirmation email sent to ${finalEmail}`)
    } catch (error: any) {
      logger.warn('⚠️ Email send failed (non-critical):', error.message)
    }

    try {
      const attrRow = await resolveMarketingAttribution(supabase, marketingSessionId, marketingAttribution)
      const hashedEmail = finalEmail ? await sha256Hex(finalEmail.trim().toLowerCase()) : null
      const normalizedPhone = (finalPhone || phone || '').replace(/\s+/g, '').replace(/^00/, '+')
      const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null
      const valueChf = effectivePrice / 100

      await reportBindingCourseConversionSafely({
        supabase,
        registrationId: enrollment.id,
        userId: guestUserId,
        tenantId,
        status: 'confirmed',
        gclid: attrRow?.gclid ?? null,
        gbraid: attrRow?.gbraid ?? null,
        wbraid: attrRow?.wbraid ?? null,
        fbclid: attrRow?.fbclid ?? null,
        fbc: attrRow?.fbc ?? null,
        fbp: attrRow?.fbp ?? null,
        conversionValueChf: valueChf,
        hashedEmail,
        hashedPhone,
      })
    } catch (err: any) {
      logger.warn('⚠️ Meta/Google Ads conversion upload failed for cash enrollment (non-critical):', err?.message ?? err)
    }

    return {
      success: true,
      enrollmentId: enrollment.id,
      message: publicCourseEnrollmentMessage(
        finalPaymentMethod === 'invoice' ? 'invoice' : 'cash',
        billing,
      ),
      ...(billing ? { billing: toPublicBillingResponse(billing) } : {}),
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

