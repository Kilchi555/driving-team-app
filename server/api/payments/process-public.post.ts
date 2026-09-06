/**
 * Public Wallee Payment Processing API
 * 
 * Handles course enrollment payments for unauthenticated users.
 * This is a public endpoint with security layers:
 * - Rate limiting by IP + device fingerprint
 * - Input validation
 * - CSRF protection (if needed)
 * 
 * Flow:
 * 1. CourseEnrollmentModal calls this after SARI validation
 * 2. Creates/updates course_registrations entry with status='pending'
 * 3. Creates Wallee transaction
 * 4. Returns paymentUrl for redirect
 * 5. Webhook updates status to 'confirmed' after payment
 */

import { logger } from '~/utils/logger'
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { Wallee } from 'wallee'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { z } from 'zod'
import { mapSupabaseError } from '~/server/utils/supabase-error'
import { logFallbackUsed } from '~/server/utils/log-fallback'
import { buildWalleeTaxedLineItem, loadCheckoutVat } from '~/server/utils/wallee-line-item'
import { resolveAppointmentDiscount } from '~/server/utils/resolve-appointment-discount'
import { lockCheckoutBenefits, releaseCheckoutBenefits } from '~/server/utils/checkout-benefits'

const ProcessPublicPaymentSchema = z.object({
  enrollmentId:  z.string().uuid().optional(),
  amount:        z.number().positive().max(1000000),
  currency:      z.enum(['CHF', 'EUR', 'USD']),
  customerEmail: z.string().email().max(254),
  customerName:  z.string().min(1).max(200).trim(),
  courseId:      z.string().uuid(),
  tenantId:      z.string().uuid(),
  userId:        z.string().uuid().optional(), // existing user – set immediately so payment is never orphaned
  metadata:      z.record(z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const rawBody = await readBody(event)
    const parseResult = ProcessPublicPaymentSchema.safeParse(rawBody)
    if (!parseResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      })
    }
    const { 
      enrollmentId, 
      currency,
      customerEmail, 
      customerName,
      courseId,
      tenantId,
      userId: _passedUserId,
      metadata = {}
    } = parseResult.data
    // Amount is recomputed server-side below; keep a mutable binding
    let amount = parseResult.data.amount

    logger.debug('💳 Public payment process request:', {
      enrollmentId,
      amount,
      customerEmail,
      courseId,
      tenantId
    })

    // Get base URL for redirects - auto-detect from request
    // Use x-forwarded-host first (Vercel), then host header, then fallback
    const forwardedHost = event.headers['x-forwarded-host'] as string
    const regularHost = event.headers['host'] as string
    const host = forwardedHost || regularHost || ''
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = host ? `${protocol}://${host}` : (process.env.PUBLIC_URL || 'https://app.simy.ch')
    
    logger.info(`Payment redirect: host=${host}, forwardedHost=${forwardedHost}, regularHost=${regularHost}, baseUrl=${baseUrl}`)
    let tenantSlug: string | null = null

    const supabase = getSupabaseAdmin()

    // 1.5 Gate by tenant flags: even if a malicious client calls this endpoint
    //     directly (bypassing the modal), online payments must be blocked when
    //     the tenant has not activated Wallee or has been deactivated.
    const { data: tenantFlags, error: tenantFlagsError } = await supabase
      .from('tenants')
      .select('wallee_enabled, is_active')
      .eq('id', tenantId)
      .single()

    if (tenantFlagsError || !tenantFlags || tenantFlags.is_active === false) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant nicht verfügbar'
      })
    }

    if (!tenantFlags.wallee_enabled) {
      logger.warn('🚫 Public payment blocked: wallee not enabled', { tenantId, courseId })
      throw createError({
        statusCode: 402,
        statusMessage: 'Online-Zahlung ist für dieses Unternehmen aktuell nicht aktiviert. Bitte kontaktiere das Unternehmen direkt.'
      })
    }

    // 2. Verify enrollment exists and is pending (if enrollmentId provided for backward compat)
    let enrollment: any = null
    if (enrollmentId) {
      const { data: existingEnrollment, error: enrollmentError } = await supabase
        .from('course_registrations')
        .select('id, course_id, tenant_id, status, payment_status, first_name, last_name, email, phone, courses!inner(*), tenants(slug)')
        .eq('id', enrollmentId)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .single()

      if (enrollmentError || !existingEnrollment) {
        logger.warn('❌ Enrollment not found or not pending:', { enrollmentId, tenantId })
        throw createError({
          statusCode: 404,
          statusMessage: 'Enrollment not found or not in pending status'
        })
      }
      
      enrollment = existingEnrollment
    } else {
      // ✅ NEW: For new flow, just get course + tenant info
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, name, tenant_id, tenants(slug)')
        .eq('id', courseId)
        .eq('tenant_id', tenantId)
        .single()
      
      if (courseError || !course) {
        logger.warn('❌ Course not found:', { courseId, tenantId })
        throw createError({
          statusCode: 404,
          statusMessage: 'Course not found'
        })
      }
      
      enrollment = {
        id: undefined, // Will be created in webhook
        course_id: courseId,
        tenant_id: tenantId,
        courses: { ...course, id: courseId },
        tenants: { slug: course.tenants?.slug },
        first_name: customerName.split(' ')[0],
        last_name: customerName.split(' ').slice(1).join(' ') || '',
        email: customerEmail,
        phone: metadata?.phone
      }
    }

    // Now that enrollment is loaded, set tenantSlug
    tenantSlug = enrollment.tenants?.slug || null
    if (!tenantSlug) {
      // ✅ Kein Tenant-Rätselraten: ohne echten Slug würde der Wallee-Redirect
      // nach der Zahlung auf die falsche (driving-team-)Kursseite führen.
      logger.error('❌ Kein Tenant-Slug für Public-Payment-Redirect gefunden, Zahlung wird abgebrochen', { tenantId, courseId, enrollmentId })
      await logFallbackUsed({
        source: 'tenant-slug',
        message: `Public-Zahlung abgebrochen: kein Tenant-Slug für Tenant ${tenantId} gefunden.`,
        tenantId,
        level: 'error',
        details: { context: 'process-public.post', courseId, enrollmentId }
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Zahlung konnte nicht gestartet werden, da das Unternehmen nicht eindeutig ermittelt werden konnte. Bitte versuche es erneut oder kontaktiere den Support.'
      })
    }

    // 2.6 Recompute payable amount from DB — never trust client amount for Wallee charge
    {
      const { data: pricedCourse, error: priceErr } = await supabase
        .from('courses')
        .select(`
          id,
          price_per_participant_rappen,
          is_partial_only,
          course_category:course_categories (
            partial_price_rappen
          ),
          course_sessions (
            session_number,
            allow_individual_booking,
            individual_price_rappen
          )
        `)
        .eq('id', courseId)
        .eq('tenant_id', tenantId)
        .single()

      if (priceErr || !pricedCourse) {
        throw createError({ statusCode: 404, statusMessage: 'Course not found for pricing' })
      }

      const individualSessionNumber = metadata?.individual_session_number ?? null
      const isPartialEnrollment = !!metadata?.is_partial_enrollment
      let effectiveBasePrice = Number(pricedCourse.price_per_participant_rappen || 0)

      if (individualSessionNumber != null) {
        const sessions = Array.isArray(pricedCourse.course_sessions) ? pricedCourse.course_sessions : []
        const targetSession = sessions.find(
          (s: any) => s.session_number === individualSessionNumber && s.allow_individual_booking
        )
        if (targetSession?.individual_price_rappen) {
          effectiveBasePrice = Number(targetSession.individual_price_rappen)
        }
      } else if (isPartialEnrollment && !pricedCourse.is_partial_only) {
        const partialPrice = Number((pricedCourse.course_category as any)?.partial_price_rappen || 0)
        if (partialPrice > 0) effectiveBasePrice = partialPrice
      }

      let discountAmount = 0
      const discountCode = typeof metadata?.discount_code === 'string' ? metadata.discount_code.trim() : ''
      if (discountCode) {
        const resolved = await resolveAppointmentDiscount({
          supabase,
          tenantId,
          code: discountCode,
          lessonAmountRappen: effectiveBasePrice,
          capAtRappen: effectiveBasePrice,
          channel: 'course',
          userId: null,
        })
        discountAmount = resolved.amountRappen
      }

      const serverAmount = Math.max(0, effectiveBasePrice - discountAmount)
      if (!(serverAmount > 0)) {
        throw createError({ statusCode: 400, statusMessage: 'Berechneter Kurspreis ist ungültig' })
      }
      if (Math.abs(serverAmount - amount) > 1) {
        logger.warn('🚫 process-public: client amount mismatch, using server amount', {
          clientAmount: amount,
          serverAmount,
          courseId,
          tenantId,
          discountCode: discountCode || null
        })
      }
      // Override client amount for all downstream inserts / Wallee line items
      amount = serverAmount
      if (metadata && typeof metadata === 'object') {
        ;(metadata as any).discount_amount_rappen = discountAmount
        ;(metadata as any).original_price_rappen = effectiveBasePrice
      }
    }

    // 3. Get Wallee config for tenant
    let walleeConfig: any
    
    try {
      // ✅ Load Wallee config from Vercel environment variables (same as process.post.ts)
      walleeConfig = await getWalleeConfigForTenant(tenantId)
      logger.debug('✅ Wallee config loaded:', { 
        spaceId: walleeConfig.spaceId,
        userId: walleeConfig.userId,
        hasSecret: !!walleeConfig.apiSecret
      })
    } catch (error: any) {
      logger.error('❌ Failed to load Wallee config:', error.message)
      throw createError({
        statusCode: 500,
        statusMessage: 'Wallee not configured for this tenant'
      })
    }

    // 5. Create Wallee API client config (same as process.post.ts)
    const config = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
    const transactionService = new Wallee.api.TransactionService(config)
    const firstName = customerName.split(' ')[0]
    const lastName = customerName.split(' ').slice(1).join(' ') || customerName
    const course = enrollment.courses
    
    // ✅ STEP 0: Create Payment record FIRST - so we have the ID for merchantReference fallback
    logger.debug('💾 Creating payment record in database FIRST...')
    
    // Never bind user_id from the client. Enrollment or webhook owns identity.
    let actualUserId: string | null = null
    if (enrollmentId) {
      const { data: enrollmentUser } = await supabase
        .from('course_registrations')
        .select('user_id')
        .eq('id', enrollmentId)
        .single()
      actualUserId = enrollmentUser?.user_id || null
    }
    
    // Build payment record - only include columns that exist in the table
    // ✅ IMPORTANT: Only store primitive values in metadata to avoid circular references
    const resolvedCourseName =
      (typeof metadata?.course_name === 'string' && metadata.course_name.trim()) ||
      (typeof course?.name === 'string' && course.name.trim()) ||
      null
    const checkoutVat = await loadCheckoutVat(supabase, tenantId, amount)
    const paymentInsertData: any = {
      user_id: actualUserId,
      appointment_id: null, // No appointment for course registrations
      course_registration_id: enrollmentId, // Link to course registration
      payment_method: 'wallee',
      payment_status: 'pending',
      total_amount_rappen: amount,
      discount_amount_rappen: Number(metadata?.discount_amount_rappen) || 0,
      currency: currency,
      description: resolvedCourseName || 'Kursanmeldung',
      // wallee_transaction_id will be set AFTER Wallee transaction is created
      tenant_id: tenantId,
      metadata: {
        enrollment_id: enrollmentId,
        course_id: courseId,
        course_name: resolvedCourseName,
        course_location: metadata?.course_location || null,
        course_start_date: typeof enrollment.courses?.course_start_date === 'string' 
          ? enrollment.courses.course_start_date 
          : null,
        sari_faberid: metadata?.sari_faberid || null,
        sari_birthdate: metadata?.sari_birthdate || null,
        // Customer identity — needed by webhook to create registration + guest user
        firstname: metadata?.firstname || firstName || '',
        lastname: metadata?.lastname || lastName || '',
        email: customerEmail,
        phone: metadata?.phone || '',
        // Address — needed by webhook for registration record
        street: metadata?.street || null,
        street_nr: metadata?.street_nr || null,
        zip: metadata?.zip || null,
        city: metadata?.city || null,
        birthdate: metadata?.birthdate || metadata?.sari_birthdate || null,
        license_number: metadata?.license_number || null,
        // Session & enrollment config — needed by webhook for SARI enrollment + DB record
        custom_sessions: metadata?.custom_sessions || null,
        is_partial_enrollment: metadata?.is_partial_enrollment ? true : false,
        partial_start_position: metadata?.partial_start_position ?? null,
        partial_start_session: metadata?.partial_start_session ?? null,
        individual_session_number: metadata?.individual_session_number ?? null,
        // Discount — needed by webhook for discount record + registration
        discount_code: metadata?.discount_code || null,
        discount_amount_rappen: metadata?.discount_amount_rappen || 0,
        original_price_rappen: metadata?.original_price_rappen || null,
        vat_rate: checkoutVat.vatRate,
        vat_amount_rappen: checkoutVat.vatAmountRappen,
        // Attribution
        referral_code: metadata?.referral_code || null,
        marketing_session_id: metadata?.marketing_session_id || null,
        // Resource assignment
        vehicle_id: metadata?.vehicle_id || null,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: paymentRecord, error: paymentCreateError } = await supabase
      .from('payments')
      .insert(paymentInsertData)
      .select('id')
      .single()

    if (paymentCreateError || !paymentRecord) {
      logger.error('❌ Could not create payment record:', paymentCreateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create payment record'
      })
    }
    
    logger.debug('✅ Payment record created:', paymentRecord.id)

    const checkoutDiscountCode = typeof metadata?.discount_code === 'string' ? metadata.discount_code : null
    if (checkoutDiscountCode && tenantId) {
      const locked = await lockCheckoutBenefits({
        supabase,
        tenantId,
        paymentId: paymentRecord.id,
        code: checkoutDiscountCode,
      })
      if (!locked.ok) {
        await releaseCheckoutBenefits({
          supabase,
          tenantId,
          paymentId: paymentRecord.id,
          metadata: { discount_code: checkoutDiscountCode, discount_usage_claimed: false },
        })
        await supabase.from('payments').delete().eq('id', paymentRecord.id)
        throw createError({
          statusCode: 409,
          statusMessage: locked.reason || 'Dieser Code kann gerade nicht verwendet werden',
        })
      }
    }
    
    const successParam = enrollmentId ? `&enrollmentId=${enrollmentId}` : ''
    const { livePaymentCheckoutDeps, runPaymentCheckoutCreate } = await import('~/server/utils/wallee-checkout-claim')
    const checkout = await runPaymentCheckoutCreate(
      { paymentId: paymentRecord.id, tenantId },
      livePaymentCheckoutDeps(async ({ merchantReference }) => {
        const created = await transactionService.create(walleeConfig.spaceId, {
          lineItems: [
            {
              ...buildWalleeTaxedLineItem({
                name: course?.name || 'Course Enrollment',
                amountIncludingTaxChf: amount / 100,
                vatRatePercent: checkoutVat.vatRate,
                sku: courseId,
              }),
              type: Wallee.model.LineItemType.PRODUCT,
            }
          ],
          spaceViewId: null,
          currency,
          autoConfirmationEnabled: true,
          chargeRetryEnabled: false,
          customersEmailAddress: customerEmail,
          customerId: `dt-${tenantId}-${customerEmail.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
          merchantReference,
          successUrl: `${baseUrl}/customer/courses/${tenantSlug}?success=true${successParam}`,
          failedUrl: `${baseUrl}/customer/courses/${tenantSlug}?failed=true${successParam}`
        })
        const actualTransaction = (created as any)?.body || created
        if (!actualTransaction?.id) {
          throw createError({ statusCode: 502, statusMessage: 'Failed to create Wallee transaction' })
        }
        return {
          id: String(actualTransaction.id),
          paymentPageUrl: actualTransaction.paymentPageUrl || actualTransaction.paymentPageEndpoint || null,
          spaceId: walleeConfig.spaceId,
        }
      })
    )
    const transactionId = checkout.transactionId
    const pageUrl = checkout.paymentUrl

    logger.info('✅ Payment page URL generated')

    // ✅ STEP 6: Update enrollment with payment info (only if enrollmentId was provided)
    if (enrollmentId) {
      const { error: enrollmentUpdateError } = await supabase
        .from('course_registrations')
        .update({
          payment_status: 'pending',
          payment_id: paymentRecord.id // Use the UUID of the created payment record
        })
        .eq('id', enrollmentId)

      if (enrollmentUpdateError) {
        logger.warn('⚠️ Could not update enrollment with payment ID:', enrollmentUpdateError)
        // Non-critical - continue anyway
      } else {
        logger.debug('✅ Enrollment updated with payment_id')
      }
    } else {
      logger.debug('ℹ️ Skipping enrollment update as no enrollmentId was provided (new flow)')
    }

    return {
      success: true,
      transactionId: transactionId,
      paymentUrl: pageUrl,
      enrollmentId: enrollmentId
    }

  } catch (error: any) {
    logger.error('❌ Payment processing error:', error)
    
    // Return H3 errors as-is, wrap others
    if (error.statusCode || error.statusMessage) {
      throw mapSupabaseError(error)
    }
    
    throw createError({
      statusCode: error.status || 500,
      statusMessage: error.message || 'Payment processing failed'
    })
  }
})

