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
import { getWalleeSDKConfig } from '~/server/utils/wallee-config'

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
    if (!enrollmentId || !amount || !currency || !customerEmail || !customerName || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: enrollmentId, amount, currency, customerEmail, customerName, tenantId'
      })
    }

    if (amount <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Amount must be greater than 0'
      })
    }

    const supabase = getSupabaseAdmin()

    // 2. Verify enrollment exists and is pending
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_registrations')
      .select('id, course_id, tenant_id, status, payment_status, first_name, last_name, email, phone, courses!inner(*), tenants(slug)')
      .eq('id', enrollmentId)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .single()

    if (enrollmentError || !enrollment) {
      logger.warn('❌ Enrollment not found or not pending:', { enrollmentId, tenantId })
      throw createError({
        statusCode: 404,
        statusMessage: 'Enrollment not found or not in pending status'
      })
    }

    // Now that enrollment is loaded, set tenantSlug
    tenantSlug = enrollment.tenants?.slug || 'driving-team'

    // 3. Get Wallee config for tenant
    let walleeConfig: any
    let apiSecret: string | null = null
    
    try {
      // Load from tenants table (where they're currently stored)
      const { data: tenant } = await supabase
        .from('tenants')
        .select('wallee_space_id, wallee_user_id, wallee_secret_key')
        .eq('id', tenantId)
        .single()

      if (!tenant?.wallee_space_id) {
        logger.error('❌ Wallee configuration not found for tenant:', tenantId)
        throw createError({
          statusCode: 500,
          statusMessage: 'Wallee not configured for this tenant'
        })
      }

      walleeConfig = {
        spaceId: parseInt(tenant.wallee_space_id),
        userId: parseInt(tenant.wallee_user_id || '1')
      }
      apiSecret = tenant.wallee_secret_key
      
      logger.debug('✅ Wallee config loaded from tenants table:', { 
        spaceId: walleeConfig.spaceId,
        userId: walleeConfig.userId
      })
    } catch (error: any) {
      if (error.statusCode) throw error
      logger.error('❌ Failed to load Wallee config:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Payment configuration error'
      })
    }

    // 4. Ensure we have API secret
    if (!apiSecret) {
      apiSecret = process.env.WALLEE_API_KEY
    }

    if (!apiSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Wallee API key not configured'
      })
    }

    // 5. Create Wallee API client config (same as process.post.ts)
    const config = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, apiSecret)
    const transactionService = new Wallee.api.TransactionService(config)
    const firstName = customerName.split(' ')[0]
    const lastName = customerName.split(' ').slice(1).join(' ') || customerName
    const course = enrollment.courses
    
    let merchantRef = `${firstName.charAt(0)}. ${lastName}`
    if (course?.name) {
      merchantRef += ` | ${course.name.replace(/[^\x20-\x7E]/g, '')}`  // Remove non-ASCII (Umlaute, etc)
    }
    if (course?.description) {
      // Extract location from description (e.g., "Herrengasse 17, 8853 Lachen SZ" → "Lachen")
      const locationMatch = course.description.match(/(\b[A-Z][a-z]+\b)(?:\s|,|$)/)
      if (locationMatch) {
        merchantRef += ` | ${locationMatch[1]}`
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
    
    // Enforce max length (Wallee limit is typically 100-200 chars, be safe with 80)
    const maxRefLength = 80 - 39 // Leave room for " [UUID]"
    if (merchantRef.length > maxRefLength) {
      merchantRef = merchantRef.substring(0, maxRefLength - 3) + '...'
    }
    merchantRef += ` [${enrollmentId}]`

    logger.debug('📝 Merchant reference:', merchantRef)

    // 8. Create Wallee transaction
    const transactionCreate = new Wallee.model.TransactionCreate()
    transactionCreate.spaceViewId = null
    transactionCreate.currency = currency
    transactionCreate.lineItems = [
      {
        name: course?.name || 'Course Enrollment',
        sku: courseId,
        quantity: 1,
        amountIncludingTax: amount / 100, // Convert from rappen to CHF
        type: Wallee.model.LineItemType.PRODUCT,
        uniqueId: 'item-1',
        taxRate: 0
      }
    ]
    transactionCreate.autoConfirmEnabled = true
    transactionCreate.deviceSessionIdentifier = metadata.device_fingerprint || null
    transactionCreate.successUrl = `${baseUrl}/customer/courses/${tenantSlug}?success=true&enrollmentId=${enrollmentId}`
    transactionCreate.failedUrl = `${baseUrl}/customer/courses/${tenantSlug}?failed=true&enrollmentId=${enrollmentId}`
    transactionCreate.cancelledUrl = `${baseUrl}/customer/courses/${tenantSlug}?cancelled=true&enrollmentId=${enrollmentId}`
    transactionCreate.invoiceMerchantReference = merchantRef
    transactionCreate.shippingAddress = null
    transactionCreate.billingAddress = null
    transactionCreate.customerEmailAddress = customerEmail
    transactionCreate.customersPresence = Wallee.model.CustomersPresence.PRESENT
    transactionCreate.chargeRetryEnabled = true
    transactionCreate.language = 'de_CH'
    transactionCreate.merchantReference = merchantRef
    transactionCreate.metaData = {
      enrollmentId: enrollmentId,
      courseId: courseId,
      tenantId: tenantId,
      ...metadata
    }

    logger.debug('🔄 Creating Wallee transaction:', {
      spaceId: walleeConfig.spaceId,
      amount: amount / 100,
      currency,
      merchant: merchantRef,
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
        statusCode: walleeError?.statusCode,
        fullError: JSON.stringify(walleeError, null, 2).substring(0, 500)
      })
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
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create Wallee transaction'
      })
    }

    logger.info('✅ Wallee transaction created:', transactionId)

    // 9. Get payment page URL
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

    // 10. Create Payment record in payments table
    logger.debug('💾 Creating payment record in database...')
    
    // Get the actual user_id from the enrollment (enrollment has user_id from guest user creation)
    const { data: enrollmentUser } = await supabase
      .from('course_registrations')
      .select('user_id')
      .eq('id', enrollmentId)
      .single()
    
    const actualUserId = enrollmentUser?.user_id || null
    
    // Build payment record - only include columns that exist in the table
    const paymentInsertData: any = {
      user_id: actualUserId,
      appointment_id: null, // No appointment for course registrations
      payment_method: 'wallee',
      payment_status: 'pending',
      total_amount_rappen: amount,
      currency: currency,
      description: `Course: ${metadata?.course_name || 'Unknown'}`,
      wallee_transaction_id: transactionId.toString(),
      tenant_id: tenantId,
      metadata: {
        enrollment_id: enrollmentId,
        course_id: courseId,
        ...metadata // Include sari_faberid, sari_birthdate, etc.
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: paymentRecord, error: paymentCreateError } = await supabase
      .from('payments')
      .insert(paymentInsertData)
      .select('id')
      .single()

    if (paymentCreateError) {
      logger.warn('⚠️ Could not create payment record:', paymentCreateError)
      // Non-critical - continue anyway (webhook will handle it)
    } else if (paymentRecord) {
      logger.info('✅ Payment record created:', paymentRecord.id)
    }

    // 11. Update enrollment with payment info
    // Only update if we successfully created a payment record (payment_id must be UUID)
    if (paymentRecord?.id) {
      const { error: updateError } = await supabase
        .from('course_registrations')
        .update({
          payment_status: 'pending',
          payment_id: paymentRecord.id // Use the UUID of the created payment record
        })
        .eq('id', enrollmentId)

      if (updateError) {
        logger.warn('⚠️ Could not update enrollment with payment ID:', updateError)
        // Non-critical - continue anyway
      } else {
        logger.debug('✅ Enrollment updated with payment_id')
      }
    } else {
      // No payment record created, just update status
      await supabase
        .from('course_registrations')
        .update({ payment_status: 'pending' })
        .eq('id', enrollmentId)
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

