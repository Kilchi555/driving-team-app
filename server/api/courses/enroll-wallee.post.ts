/**
 * WALLEE Course Enrollment API
 * 
 * Step 1 of course enrollment flow:
 * 1. Validates SARI data
 * 2. Creates pending course_registrations entry
 * 3. Calls /api/payments/process-public for payment
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { SARIClient } from '~/utils/sariClient'
import { getSARICredentialsSecure } from '~/server/utils/sari-credentials-secure'
import { validateLicense } from '~/server/utils/license-validation'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      courseId, 
      faberid, 
      birthdate, 
      tenantId,
      email,
      phone
    } = body

    logger.debug('📝 Wallee enrollment request:', { courseId, tenantId })

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
    const credentials = await getSARICredentialsSecure(tenantId, 'COURSE_ENROLLMENT_WALLEE')
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

    // 6. Validate SARI enrollment is possible (before payment!)
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
        statusMessage: 'You are already enrolled in this course'
      })
    }

    // 8. Create pending enrollment
    const finalEmail = email || customerData.email
    const finalPhone = phone || customerData.phone || ''

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_registrations')
      .insert({
        course_id: courseId,
        tenant_id: tenantId,
        first_name: customerData.firstname,
        last_name: customerData.lastname,
        email: finalEmail,
        phone: finalPhone,
        sari_faberid: faberidClean,
        street: customerData.address || '',
        zip: customerData.zip || '',
        city: customerData.city || '',
        status: 'pending',
        payment_method: 'online',
        enrolled_at: new Date().toISOString(),
        sari_data: customerData,
        sari_licenses: customerData.licenses || []
      })
      .select('id')
      .single()

    if (enrollmentError || !enrollment) {
      logger.error('❌ Failed to create enrollment:', enrollmentError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create enrollment'
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
    
    if (error.statusCode || error.statusMessage) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Enrollment failed'
    })
  }
})

