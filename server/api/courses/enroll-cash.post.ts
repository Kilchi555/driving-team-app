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
import { validateLicense } from '~/server/utils/license-validation'
import { createRateLimitMiddleware } from '~/server/middleware/rate-limiting'
import { findExistingUserByContact, findStaffOrAdminByEmail, findStaffOrAdminByPhone } from '~/server/utils/user-matching'
import { normalizePhoneNumber } from '~/server/utils/sms'
import { upsertMarketingLeadSafe, categoriesFromCourse } from '~/server/utils/upsert-marketing-lead'
import { sha256Hex } from '~/server/utils/meta-capi'
import { reportBindingCourseConversionSafely } from '~/server/utils/binding-booking-conversion'
import { resolveMarketingAttribution } from '~/server/utils/resolve-marketing-attribution'
import { resolveNonWalleeEnrollmentMethod } from '~/server/utils/course-enrollment-payment-method'
import { payableAfterSourceDiscount } from '~/server/utils/discount-amount'
import { escapeLikePattern } from '~/server/utils/sql-helpers'
import {
  computeCourseInvoiceTotals,
  createEnrollmentPayment,
  createIndividualCourseInvoice,
} from '~/server/utils/course-enrollment-billing'
import { getTenantDefaultVatRate } from '~/server/utils/invoice-vat'
import { normalizeEnrollmentEmail } from '~/server/utils/normalize-enrollment-email'
import { internalSecretHeaders } from '~/server/utils/require-staff-or-internal'
import { throwIfCourseCapacityExceeded } from '~/server/utils/course-capacity'
import {
  assertCustomSessionsForTenant,
  loadPublicCourseForEnrollment,
} from '~/server/utils/course-custom-sessions'
import { publicCourseSessionPrincipalId } from '~/server/utils/fulfill-course-wallee-payment'

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

function enrollmentNetRappen(course: any, isPartial: boolean, isIndividualSess: boolean, individualSessionNumber: unknown): number {
  if (isIndividualSess) {
    const tgt = (course.course_sessions || []).find(
      (s: any) => s.session_number === individualSessionNumber && s.allow_individual_booking
    )
    return tgt?.individual_price_rappen ?? course.price_per_participant_rappen ?? 0
  }
  const partialPriceRappen: number = course.course_category?.partial_price_rappen ?? 0
  if (isPartial && !course.is_partial_only && partialPriceRappen > 0) return partialPriceRappen
  return course.price_per_participant_rappen ?? 0
}

/**
 * Same tenant-scoped code lookup as enroll-wallee. The client-supplied
 * discount amount is never an input.
 */
async function resolveServerDiscountRappen(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  discountCode: unknown,
  baseRappen: number,
): Promise<number> {
  if (typeof discountCode !== 'string' || !discountCode.trim()) return 0
  try {
    const escapedDiscountCode = escapeLikePattern(discountCode.trim())
    const { data: voucherData } = await supabase
      .from('voucher_codes')
      .select('*')
      .ilike('code', escapedDiscountCode)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle()

    let discountRow: any = voucherData
    let unitSource: 'voucher_code' | 'gift_card' | 'discount' | null = voucherData ? 'voucher_code' : null

    if (!discountRow) {
      const { data: giftCard } = await supabase
        .from('vouchers')
        .select('*')
        .ilike('code', escapedDiscountCode)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle()
      if (giftCard && !giftCard.redeemed_at) {
        discountRow = { ...giftCard, discount_type: 'fixed', discount_value: giftCard.amount_rappen, is_gift_card: true }
        unitSource = 'gift_card'
      }
    }

    if (!discountRow) {
      const { data: discountData } = await supabase
        .from('discounts')
        .select('*')
        .ilike('code', escapedDiscountCode)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle()
      if (discountData) {
        discountRow = discountData
        unitSource = 'discount'
      }
    }

    if (!discountRow || !unitSource) return 0
    const validUntil = discountRow.valid_until ? new Date(discountRow.valid_until) : null
    if (validUntil && new Date() > validUntil) return 0
    const payable = payableAfterSourceDiscount({
      baseRappen,
      source: unitSource,
      discountType: discountRow.discount_type,
      discountValue: Number(discountRow.discount_value || 0),
      maxDiscountRappen: discountRow.max_discount_rappen,
    })
    return payable.discountRappen
  } catch (discountErr: any) {
    logger.warn('⚠️ Discount validation failed (non-critical):', discountErr.message)
    return 0
  }
}

async function rollbackNewInvoiceEnrollment(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  registrationId: string,
  createdGuestUserId: string | null,
) {
  await supabase.from('payments').delete().eq('course_registration_id', registrationId).eq('tenant_id', tenantId)
  await supabase.from('course_registrations').delete().eq('id', registrationId).eq('tenant_id', tenantId)
  if (createdGuestUserId) {
    await supabase.from('users').delete().eq('id', createdGuestUserId).eq('tenant_id', tenantId).is('auth_user_id', null)
  }
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
      discountCode,
      discountAmountRappen: _discountAmountRappen, // client hint; never used for the amount
    } = body
    void _discountAmountRappen

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

    // Partial / individual flags stay outside the SARI block. Price is the
    // course net; the client cannot choose it.
    const isPartial = !!(isPartialEnrollment || course.is_partial_only)
    const isIndividualSess =
      isPartial && typeof individualSessionNumber === 'number' && individualSessionNumber > 0
    const netRappen = enrollmentNetRappen(course, isPartial, isIndividualSess, individualSessionNumber)
    const discountRappen = finalPaymentMethod === 'invoice'
      ? await resolveServerDiscountRappen(supabase, tenantId, discountCode, netRappen)
      : 0

    const sendEnrollmentConfirmation = async (registrationId: string, totalAmountChf: number, method: 'invoice' | 'cash') => {
      try {
        await $fetch('/api/emails/send-course-enrollment-confirmation', {
          method: 'POST',
          headers: internalSecretHeaders(),
          body: {
            courseRegistrationId: registrationId,
            paymentMethod: method,
            totalAmount: totalAmountChf,
          }
        })
        logger.info(`📧 Confirmation email sent for ${registrationId}`)
      } catch (error: any) {
        logger.warn('⚠️ Email send failed (non-critical):', error.message)
      }
    }

    const billInvoiceEnrollment = async (registrationId: string, userId: string, participant: {
      first_name?: string | null
      last_name?: string | null
      email?: string | null
      street?: string | null
      street_nr?: string | null
      zip?: string | null
      city?: string | null
    }) => {
      const vatRate = await getTenantDefaultVatRate(supabase, tenantId)
      const totals = computeCourseInvoiceTotals(netRappen, discountRappen, vatRate)
      const pay = await createEnrollmentPayment({
        tenantId,
        adminUserId: null,
        userId,
        enrollmentId: registrationId,
        courseId: course.id,
        courseName: course.name,
        amountRappen: totals.netRappen,
        payableTotalRappen: totals.totalAmountRappen,
        paymentOption: 'invoice',
      })
      if (!pay?.paymentId) {
        throw createError({ statusCode: 500, statusMessage: 'Payment konnte nicht erstellt werden' })
      }
      const invoice = await createIndividualCourseInvoice({
        tenantId,
        adminUserId: null,
        userId,
        enrollmentId: registrationId,
        paymentId: pay.paymentId,
        courseName: course.name,
        amountRappen: totals.netRappen,
        discountRappen: totals.discountRappen,
        participant,
        sendEmail: true,
      })
      return { paymentId: pay.paymentId, ...invoice }
    }

    const completeExistingInvoiceEnrollment = async (registrationId: string) => {
      const { data: existing } = await supabase
        .from('course_registrations')
        .select('id, user_id, invoice_id, first_name, last_name, email, street, street_nr, zip, city')
        .eq('id', registrationId)
        .eq('tenant_id', tenantId)
        .eq('course_id', course.id)
        .maybeSingle()

      if (!existing) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Diese E-Mail-Adresse ist bereits für diesen Kurs angemeldet.',
        })
      }

      let totalAmountRappen: number
      if (existing.invoice_id) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('id, total_amount_rappen')
          .eq('id', existing.invoice_id)
          .eq('tenant_id', tenantId)
          .maybeSingle()
        if (!invoice) {
          throw createError({ statusCode: 500, statusMessage: 'Bestehende Rechnung konnte nicht geladen werden.' })
        }
        totalAmountRappen = Number(invoice.total_amount_rappen) || 0
      } else {
        if (!existing.user_id) {
          throw createError({
            statusCode: 409,
            statusMessage: 'Diese E-Mail oder Telefonnummer gehört bereits zu einem Kunden. Bitte melde dich an. Die Anmeldung wurde nicht verknüpft.',
          })
        }
        const billed = await billInvoiceEnrollment(existing.id, existing.user_id, existing)
        totalAmountRappen = billed.totalAmountRappen
      }

      await sendEnrollmentConfirmation(existing.id, totalAmountRappen / 100, 'invoice')
      return {
        success: true,
        enrollmentId: existing.id,
        message: 'Anmeldung bestätigt! Die Rechnung wurde erstellt.',
      }
    }

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
          const enrollmentCheck = await sari.canEnrollInCourse(course.sari_course_id, faberidClean)
          if (!enrollmentCheck.canEnroll) {
            throw createError({ statusCode: 400, statusMessage: enrollmentCheck.reason || 'SARI enrollment not possible' })
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

    // 7. Duplicate check (SARI: by faberid; non-SARI: by email)
    if (course.sari_managed && faberidClean) {
      const { data: existingEnrollment } = await supabase
        .from('course_registrations')
        .select('id')
        .eq('course_id', courseId)
        .eq('sari_faberid', faberidClean)
        .in('status', ['confirmed', 'pending'])
        .maybeSingle()

      if (existingEnrollment) {
        if (finalPaymentMethod === 'invoice') {
          return await completeExistingInvoiceEnrollment(existingEnrollment.id)
        }
        throw createError({ statusCode: 409, statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.' })
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
        if (finalPaymentMethod === 'invoice') {
          return await completeExistingInvoiceEnrollment(existingByEmail.id)
        }
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
    let createdGuestUserId: string | null = null

    if (!guestUserId) {
      const existingUser = await findExistingUserByContact(supabase, {
        email: finalEmail,
        phone: finalPhone,
        tenantId,
        roles: ['client'],
      })

      if (existingUser) {
        logger.debug('ℹ️ Contact matches existing customer (discovery only; not attaching):', existingUser.id)
        if (finalPaymentMethod === 'invoice') {
          throw createError({
            statusCode: 409,
            statusMessage: 'Diese E-Mail oder Telefonnummer gehört bereits zu einem Kunden. Bitte melde dich an. Die Anmeldung wurde nicht verknüpft.',
          })
        }
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
            // Unique contact collision: do not attach the existing row.
            if (finalPaymentMethod === 'invoice') {
              throw createError({
                statusCode: 409,
                statusMessage: 'Diese E-Mail oder Telefonnummer gehört bereits zu einem Kunden. Bitte melde dich an. Die Anmeldung wurde nicht verknüpft.',
              })
            }
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
          createdGuestUserId = newUser.id
          logger.info('✅ Guest user created:', guestUserId)
        }
      }
    }

    if (finalPaymentMethod === 'invoice' && !guestUserId) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Diese E-Mail oder Telefonnummer gehört bereits zu einem Kunden. Bitte melde dich an. Die Anmeldung wurde nicht verknüpft.',
      })
    }

    // Flags above stay outside the SARI block so non-SARI enrollments can read them.

    // 9. SARI sync FIRST (before DB save) - if managed
    // Enroll in ALL sessions (GROUP_2159157_2159158_2159159 → [2159157, 2159158, 2159159])
    if (course.sari_managed && course.sari_course_id && faberidClean) {
      // Extract ALL session IDs from the group
      const sariCourseIdParts = String(course.sari_course_id).split('_')
      let sariSessionIds = sariCourseIdParts.slice(1).filter((id: string) => id && !isNaN(parseInt(id)))

      // For partial enrollment, only keep session IDs from partial_start_position onwards.
      // Session IDs are ordered, so we resolve position from course_sessions by date grouping.

      // Validate: partial enrollment is blocked only when a category IS linked and explicitly
      // disallows it. Courses without a category have no restriction.
      if (isPartial && !course.is_partial_only && !isIndividualSess && course.course_category && !course.course_category.allow_partial_enrollment) {
        throw createError({ statusCode: 400, statusMessage: 'Teilbuchung ist für diesen Kurs nicht erlaubt.' })
      }

      if (isIndividualSess) {
        // Individual session booking: only enroll in the specific session
        const targetSess = (course.course_sessions || []).find(
          (s: any) => s.session_number === individualSessionNumber && s.allow_individual_booking
        )
        if (targetSess?.sari_session_id) {
          sariSessionIds = [String(targetSess.sari_session_id)]
        } else if (sariSessionIds.length >= individualSessionNumber) {
          sariSessionIds = [sariSessionIds[individualSessionNumber - 1]]
        }
        logger.info(`🎯 Individual session ${individualSessionNumber}: enrolling in ${sariSessionIds.join(',')}`)
      } else {
      const dbStartPos: number = course.course_category?.partial_start_position ?? 3

      if (isPartial && dbStartPos > 1 && course.course_sessions?.length > 0) {
        const startPos = dbStartPos
        const sortedSessions = [...course.course_sessions].sort((a: any, b: any) =>
          a.start_time.localeCompare(b.start_time)
        )
        // Map date → position
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
      } // end else (not individual session)
      
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
        sari_synced: course.sari_managed ? true : null,
        sari_synced_at: course.sari_managed ? new Date().toISOString() : null,
        notes: marketingSessionId ? `marketing_session_id:${marketingSessionId}` : null,
        vehicle_id: vehicleId || null,
      })
      .select('id')
      .single()

    if (enrollmentError || !enrollment) {
      throwIfCourseCapacityExceeded(enrollmentError)
      logger.error('❌ Failed to create enrollment:', enrollmentError)

      if (finalPaymentMethod === 'invoice' && enrollmentError?.message?.includes('duplicate key')) {
        let existingId: string | null = null
        if (finalEmail) {
          const { data: byEmail } = await supabase
            .from('course_registrations')
            .select('id')
            .eq('course_id', course.id)
            .eq('tenant_id', tenantId)
            .eq('email', finalEmail)
            .maybeSingle()
          existingId = byEmail?.id || null
        }
        if (!existingId && faberidClean) {
          const { data: byFaber } = await supabase
            .from('course_registrations')
            .select('id')
            .eq('course_id', course.id)
            .eq('tenant_id', tenantId)
            .eq('sari_faberid', faberidClean)
            .maybeSingle()
          existingId = byFaber?.id || null
        }
        if (existingId) return await completeExistingInvoiceEnrollment(existingId)
      }
      
      // Provide clearer error messages
      if (enrollmentError?.message?.includes('duplicate key')) {
        if (
          enrollmentError.message.includes('course_id_email_key') ||
          enrollmentError.message.includes('unique_email')
        ) {
          throw createError({
            statusCode: 409,
            statusMessage: 'Diese E-Mail-Adresse ist bereits für diesen Kurs angemeldet.'
          })
        }
        if (
          enrollmentError.message.includes('course_id_sari_faberid') ||
          enrollmentError.message.includes('unique_faberid')
        ) {
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

    let chargedTotalRappen = netRappen
    if (finalPaymentMethod === 'invoice') {
      if (!guestUserId) {
        await rollbackNewInvoiceEnrollment(supabase, tenantId, enrollment.id, createdGuestUserId)
        throw createError({
          statusCode: 409,
          statusMessage: 'Diese E-Mail oder Telefonnummer gehört bereits zu einem Kunden. Bitte melde dich an. Die Anmeldung wurde nicht verknüpft.',
        })
      }
      try {
        const billed = await billInvoiceEnrollment(enrollment.id, guestUserId, {
          first_name: customerData.firstname,
          last_name: customerData.lastname,
          email: finalEmail,
          street: customerData.street || customerData.address || null,
          street_nr: customerData.streetNr || null,
          zip: customerData.zip || null,
          city: customerData.city || null,
        })
        chargedTotalRappen = billed.totalAmountRappen
      } catch (billErr: any) {
        logger.error('❌ Invoice billing failed:', billErr?.message || billErr)
        try {
          await rollbackNewInvoiceEnrollment(supabase, tenantId, enrollment.id, createdGuestUserId)
        } catch (rollbackErr: any) {
          logger.error('❌ Invoice enrollment rollback failed:', rollbackErr?.message || rollbackErr)
        }
        if (billErr?.statusCode === 409) throw billErr
        throw createError({
          statusCode: 500,
          statusMessage: 'Rechnung konnte nicht erstellt werden.',
        })
      }
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

    const quotedTotalRappen = finalPaymentMethod === 'invoice' ? chargedTotalRappen : netRappen

    // Confirmation is sent only after invoice rows exist. A mail failure keeps them.
    await sendEnrollmentConfirmation(
      enrollment.id,
      quotedTotalRappen / 100,
      finalPaymentMethod === 'invoice' ? 'invoice' : 'cash',
    )

    try {
      const attrRow = await resolveMarketingAttribution(supabase, marketingSessionId, marketingAttribution)
      const hashedEmail = finalEmail ? await sha256Hex(finalEmail.trim().toLowerCase()) : null
      const normalizedPhone = (finalPhone || phone || '').replace(/\s+/g, '').replace(/^00/, '+')
      const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null
      const valueChf = quotedTotalRappen / 100

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
      message: finalPaymentMethod === 'invoice'
        ? 'Anmeldung bestätigt! Die Rechnung wurde erstellt.'
        : 'Anmeldung bestätigt! Bitte bringen Sie den Betrag in bar zum ersten Kurstag mit.'
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

