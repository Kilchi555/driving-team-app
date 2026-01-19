/**
 * CASH Course Enrollment API
 * 
 * For cash-on-site payments (Einsiedeln area)
 * 1. Validates SARI data
 * 2. Creates CONFIRMED enrollment (no payment needed)
 * 3. Immediately enrolls in SARI (if sari_managed)
 * 4. Sends confirmation email
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

    logger.debug('💵 Cash enrollment request:', { courseId, tenantId })

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
        statusMessage: 'You are already enrolled in this course'
      })
    }

    // 8. Create CONFIRMED enrollment (no payment needed)
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
        status: 'confirmed',
        payment_method: 'cash_on_site',
        enrolled_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
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

    logger.info('✅ Confirmed enrollment created:', enrollment.id)

    // 9. Immediately sync to SARI (if managed)
    if (course.sari_managed && course.sari_course_id && faberidClean) {
      try {
        const sariCourseIdMatch = String(course.sari_course_id).match(/(\d+)/)
        const numericSariCourseId = sariCourseIdMatch ? parseInt(sariCourseIdMatch[1]) : null

        if (numericSariCourseId) {
          await sari.enrollStudent(numericSariCourseId, faberidClean, birthdate)
          logger.info(`✅ Synced enrollment to SARI: ${numericSariCourseId}`)
        }
      } catch (error: any) {
        logger.warn('⚠️ SARI enrollment sync failed (non-critical):', error.message)
      }
    }

    // 10. Send confirmation email
    try {
      await $fetch('/api/emails/send-course-enrollment-confirmation', {
        method: 'POST',
        body: {
          enrollmentId: enrollment.id,
          paymentMethod: 'cash'
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

