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

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { Wallee } from 'wallee'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      enrollmentId, 
      amount, 
      currency,
      customerEmail, 
      customerName,
      courseId,
      tenantId,
      metadata = {}
    } = body

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
    const baseUrl = host ? `${protocol}://${host}` : (process.env.PUBLIC_URL || 'https://www.simy.ch')
    
    logger.info(`Payment redirect: host=${host}, forwardedHost=${forwardedHost}, regularHost=${regularHost}, baseUrl=${baseUrl}`)
    let tenantSlug = 'driving-team' // Default

    // 1. Validate inputs
    // ✅ CHANGED: enrollmentId is now optional (will be created in webhook)
    // For backward compatibility, we still accept enrollmentId
    if (!amount || !currency || !customerEmail || !customerName || !tenantId || !courseId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: amount, currency, customerEmail, customerName, tenantId, courseId'
      })
    }

    if (amount <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Amount must be greater than 0'
      })
    }

    const supabase = getSupabaseAdmin()

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
    tenantSlug = enrollment.tenants?.slug || 'driving-team'

    // 3. Get Wallee config for tenant
    let walleeConfig: any
    
    try {
      // ✅ Load Wallee config from Vercel environment variables (same as process.post.ts)
      walleeConfig = getWalleeConfigForTenant(tenantId)
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
    
    // Get the actual user_id from the enrollment (enrollment has user_id from guest user creation)
    const { data: enrollmentUser } = await supabase
      .from('course_registrations')
      .select('user_id')
      .eq('id', enrollmentId)
      .single()
    
    const actualUserId = enrollmentUser?.user_id || null
    
    // Build payment record - only include columns that exist in the table
    // ✅ IMPORTANT: Only store primitive values in metadata to avoid circular references
    const paymentInsertData: any = {
      user_id: actualUserId,
      appointment_id: null, // No appointment for course registrations
      course_registration_id: enrollmentId, // Link to course registration
      payment_method: 'wallee',
      payment_status: 'pending',
      total_amount_rappen: amount,
      currency: currency,
      description: `Course: ${metadata?.course_name || 'Unknown'}`,
      // wallee_transaction_id will be set AFTER Wallee transaction is created
      tenant_id: tenantId,
      metadata: {
        enrollment_id: enrollmentId,
        course_id: courseId,
        course_name: metadata?.course_name || null,
        course_location: metadata?.course_location || null,
        course_start_date: typeof enrollment.courses?.course_start_date === 'string' 
          ? enrollment.courses.course_start_date 
          : null, // Only store string date, not complex object
        sari_faberid: metadata?.sari_faberid || null,
        sari_birthdate: metadata?.sari_birthdate || null,
        // ✅ ADDED: Customer data needed by webhook to create registration and guest user
        firstname: metadata?.firstname || firstName || '',
        lastname: metadata?.lastname || lastName || '',
        email: customerEmail,
        phone: metadata?.phone || '',
        // ✅ ADDED: Custom sessions for flexible session selection
        custom_sessions: metadata?.custom_sessions || null
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
    
    // Build clean merchant reference: "payment-{paymentId} | FirstName LastName | CourseName | Location | Date"
    // ✅ CRITICAL: Include payment ID as fallback for webhook search!
    // ✅ CRITICAL: Remove all non-printable ASCII characters for Wallee compatibility
    // Wallee accepts: 0x20-0x7E (printable ASCII) + TAB (0x09)
    const sanitizeWallee = (str: string) => str.replace(/[^\x09\x20-\x7E]/g, '')
    
    let merchantRef = `payment-${paymentRecord.id}`
    merchantRef += ` | ${sanitizeWallee(firstName)} ${sanitizeWallee(lastName)}`
    if (course?.name) {
      merchantRef += ` | ${sanitizeWallee(course.name)}`
    }
    if (course?.description) {
      // Extract location from description (e.g., "Herrengasse 17, 8853 Lachen SZ" → "Lachen")
      const locationMatch = course.description.match(/(\b[A-Z][a-z]+\b)(?:\s|,|$)/)
      if (locationMatch) {
        merchantRef += ` | ${sanitizeWallee(locationMatch[1])}`
      }
    }
    
    // Add first session date if available
    if (course?.course_sessions && course.course_sessions.length > 0) {
      const firstSessionDate = course.course_sessions[0].start_time
      if (firstSessionDate) {
        const dateObj = new Date(firstSessionDate)
        const dateStr = dateObj.toLocaleDateString('de-CH').replace(/\./g, '-') // "20-01-2026" format
        merchantRef += ` | ${dateStr}`
      }
    }
    
    // Enforce max length (Wallee limit is 100 chars for merchant reference)
    // ✅ Reserve space for "payment-{uuid} | " prefix (about 45 chars)
    const maxMerchantRefLength = 100
    if (merchantRef.length > maxMerchantRefLength) {
      merchantRef = merchantRef.substring(0, maxMerchantRefLength - 3) + '...'
    }
    
    logger.debug('📝 Merchant reference:', merchantRef)

    // 8. Create Wallee transaction - use object literal like process.post.ts (proven to work)
    const successParam = enrollmentId ? `&enrollmentId=${enrollmentId}` : ''
    const transactionCreate: Wallee.model.TransactionCreate = {
      lineItems: [
        {
          name: course?.name || 'Course Enrollment',
          sku: courseId,
          quantity: 1,
          amountIncludingTax: amount / 100, // Convert from rappen to CHF
          type: Wallee.model.LineItemType.PRODUCT,
          uniqueId: 'item-1',
          taxRate: 0
        }
      ],
      spaceViewId: null,
      currency: currency,
      autoConfirmationEnabled: true,
      chargeRetryEnabled: false,
      customersEmailAddress: customerEmail,
      shippingAddress: null,
      billingAddress: null,
      deviceSessionIdentifier: null,
      merchantReference: merchantRef,
      successUrl: `${baseUrl}/customer/courses/${tenantSlug}?success=true${successParam}`,
      failedUrl: `${baseUrl}/customer/courses/${tenantSlug}?failed=true${successParam}`
    }

    logger.debug('📝 Final merchant reference for Wallee:', transactionCreate.merchantReference)

    // ✅ STEP 3: Create Wallee transaction
    logger.debug('🔄 Creating Wallee transaction:', {
      spaceId: walleeConfig.spaceId,
      amount: amount / 100,
      currency,
      merchant: transactionCreate.merchantReference,
      lineItems: transactionCreate.lineItems
    })

    // Create transaction
    let transaction
    try {
      transaction = await transactionService.create(
        walleeConfig.spaceId,
        transactionCreate
      )
    } catch (walleeError: any) {
      logger.error('❌ Wallee API error creating transaction:', {
        message: walleeError?.message,
        body: walleeError?.body,
        statusCode: walleeError?.statusCode
        // ❌ REMOVED: fullError: JSON.stringify(...) - causes circular reference error
      })
      
      // Clean up: Delete the payment record we just created
      await supabase.from('payments').delete().eq('id', paymentRecord.id)
      
      throw walleeError
    }

    // Extract the actual transaction from the SDK response wrapper
    // The SDK returns { response, body } where body is the Transaction object
    const actualTransaction = transaction?.body || transaction
    const transactionId = actualTransaction?.id

    logger.debug('🔍 Wallee response - extracted transaction:', {
      transactionId: transactionId,
      state: actualTransaction?.state,
      hasBody: !!transaction?.body,
      allKeys: actualTransaction ? Object.keys(actualTransaction).slice(0, 20) : 'null'
    })

    if (!transactionId) {
      logger.error('❌ Invalid transaction response from Wallee:', {
        transaction: JSON.stringify(actualTransaction, null, 2).substring(0, 500),
        hasBody: !!transaction?.body
      })
      
      // Clean up: Delete the payment record we just created
      await supabase.from('payments').delete().eq('id', paymentRecord.id)
      
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create Wallee transaction'
      })
    }

    logger.info('✅ Wallee transaction created:', transactionId)

    // ✅ STEP 4: Update Payment with wallee_transaction_id (CRITICAL - retry 3x)
    let updateSuccess = false
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          wallee_transaction_id: transactionId.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.id)

      if (!updateError) {
        updateSuccess = true
        logger.debug(`✅ wallee_transaction_id saved on attempt ${attempt}`)
        break
      }
      
      logger.warn(`⚠️ Attempt ${attempt}/3 to save wallee_transaction_id failed:`, updateError.message)
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, attempt * 100))
      }
    }

    if (!updateSuccess) {
      logger.error('🚨 CRITICAL: Failed to save wallee_transaction_id after 3 attempts!', {
        paymentId: paymentRecord.id,
        transactionId: transactionId.toString()
      })
      // IMPORTANT: Don't throw - webhook will use merchantReference fallback (payment-{paymentId})
      // The merchantReference now includes the payment ID, so the webhook can find it
      logger.info('✅ Fallback: Webhook will use merchantReference pattern to find this payment')
    }

    // ✅ STEP 5: Get payment page URL
    const paymentPageService = new Wallee.api.TransactionPaymentPageService(config)
    const pageUrlResponse = await paymentPageService.paymentPageUrl(
      walleeConfig.spaceId,
      transactionId
    )

    // Extract the URL from the SDK response wrapper
    // The SDK returns { response, body } where body is the URL string
    const pageUrl = pageUrlResponse?.body || pageUrlResponse

    if (!pageUrl) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate payment page URL'
      })
    }

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
      throw error
    }
    
    throw createError({
      statusCode: error.status || 500,
      statusMessage: error.message || 'Payment processing failed'
    })
  }
})

