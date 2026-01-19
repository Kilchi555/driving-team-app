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
      .select('*, courses(*), tenants(id)')
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

    // 3. Get Wallee config for tenant
    let walleeConfig: any
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('wallee_space_id, wallee_account_id')
        .eq('id', tenantId)
        .single()

      if (!tenant?.wallee_space_id) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Wallee not configured for this tenant'
        })
      }

      walleeConfig = {
        spaceId: parseInt(tenant.wallee_space_id),
        userId: parseInt(tenant.wallee_account_id || '0')
      }
    } catch (error: any) {
      logger.error('❌ Failed to load Wallee config:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Payment configuration error'
      })
    }

    // 4. Get API secret from environment (fallback) or tenant_secrets
    let apiSecret = process.env.WALLEE_API_KEY
    if (!apiSecret) {
      const { data: secrets } = await supabase
        .from('tenant_secrets')
        .select('secret_value')
        .eq('tenant_id', tenantId)
        .eq('secret_type', 'WALLEE_API_KEY')
        .single()
      
      apiSecret = secrets?.secret_value
    }

    if (!apiSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Wallee API key not configured'
      })
    }

    // 5. Initialize Wallee SDK
    let Wallee: any
    try {
      Wallee = await import('wallee')
      Wallee = Wallee.default || Wallee
    } catch (error) {
      logger.error('❌ Wallee SDK import failed:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Payment service unavailable'
      })
    }

    // 6. Create Wallee API client
    const config = new Wallee.ApiClient({
      userId: walleeConfig.userId,
      authentications: {
        'oauth2': {
          accessToken: apiSecret
        }
      }
    })

    // 7. Build merchant reference with enrollment ID
    const firstName = customerName.split(' ')[0]
    const lastName = customerName.split(' ').slice(1).join(' ') || customerName
    const course = enrollment.courses
    
    let merchantRef = `${firstName} ${lastName}`
    if (course?.name) {
      merchantRef += ` | ${course.name.replace(/[^\x20-\x7E]/g, '')}`
    }
    
    const maxRefLength = 100 - 39 // 36 for UUID + 3 for " []"
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
        type: Wallee.model.LineItemType.PRODUCT
      }
    ]
    transactionCreate.autoConfirmEnabled = true
    transactionCreate.deviceSessionIdentifier = metadata.device_fingerprint || null
    transactionCreate.successUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/customer/courses/enrollment-success?enrollmentId=${enrollmentId}`
    transactionCreate.failedUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/customer/courses/enrollment-failed?enrollmentId=${enrollmentId}`
    transactionCreate.cancelledUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/customer/courses/enrollment-cancelled?enrollmentId=${enrollmentId}`
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
      merchant: merchantRef
    })

    // Create transaction service
    const transactionService = new Wallee.api.TransactionService(config)
    const transaction = await transactionService.create(
      walleeConfig.spaceId,
      transactionCreate
    )

    if (!transaction || !transaction.id) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create Wallee transaction'
      })
    }

    logger.info('✅ Wallee transaction created:', transaction.id)

    // 9. Get payment page URL
    const paymentPageService = new Wallee.api.TransactionPaymentPageService(config)
    const pageUrl = await paymentPageService.paymentPageUrl(
      walleeConfig.spaceId,
      transaction.id
    )

    if (!pageUrl) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate payment page URL'
      })
    }

    logger.info('✅ Payment page URL generated')

    // 10. Update enrollment with transaction ID in metadata
    const { error: updateError } = await supabase
      .from('course_registrations')
      .update({
        metadata: {
          ...enrollment.metadata,
          wallee_transaction_id: transaction.id,
          payment_initiated_at: new Date().toISOString()
        }
      })
      .eq('id', enrollmentId)

    if (updateError) {
      logger.warn('⚠️ Could not update enrollment with transaction ID:', updateError)
      // Non-critical - continue anyway
    }

    return {
      success: true,
      transactionId: transaction.id,
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

