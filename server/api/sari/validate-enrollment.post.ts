import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient } from '~/utils/sariClient'

/**
 * Validate if a student can be enrolled in a SARI course BEFORE payment
 * This prevents the customer from paying if enrollment will fail
 * Called during the enrollment process, before payment
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { faberid, birthdate, courseId, tenantId } = body

  if (!faberid || !birthdate || !courseId || !tenantId) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: faberid, birthdate, courseId, tenantId'
    })
  }

  const supabase = getSupabaseAdmin()

  try {
    // Get course details including SARI course ID
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('sari_course_id, sari_managed')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      throw createError({
        statusCode: 404,
        message: 'Course not found'
      })
    }

    if (!course.sari_managed || !course.sari_course_id) {
      throw createError({
        statusCode: 400,
        message: 'This is not a SARI-managed course'
      })
    }

    // Get tenant's SARI configuration
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('sari_client_id, sari_client_secret, sari_username, sari_password, sari_environment')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      throw createError({
        statusCode: 404,
        message: 'Tenant not found or SARI not configured'
      })
    }

    if (!tenant.sari_client_id || !tenant.sari_client_secret) {
      throw createError({
        statusCode: 400,
        message: 'SARI credentials not configured for this tenant'
      })
    }

    // Create SARI client
    const sari = new SARIClient({
      environment: tenant.sari_environment || 'production',
      clientId: tenant.sari_client_id,
      clientSecret: tenant.sari_client_secret,
      username: tenant.sari_username || '',
      password: tenant.sari_password || ''
    })

    console.log('🧪 Pre-enrollment validation with SARI:', {
      faberid,
      birthdate,
      courseId: course.sari_course_id
    })

    // Try to get customer data - this will validate FABERID + birthdate match
    const customer = await sari.getCustomer(faberid, birthdate)
    console.log('✅ Customer validation passed:', customer.firstname, customer.lastname)

    // Try to actually enroll in SARI (this will catch scheduling conflicts, course full, etc.)
    console.log('📝 Attempting to enroll in SARI...')
    const courseIdAsNumber = parseInt(course.sari_course_id.split('_')[1], 10)
    await sari.enrollStudent(courseIdAsNumber, faberid, birthdate)
    console.log('✅ SARI enrollment successful!')

    // All validations passed - customer can proceed to payment
    return {
      success: true,
      message: 'Enrollment validation successful',
      customer: {
        first_name: customer.firstname,
        last_name: customer.lastname,
        birthdate: customer.birthdate
      }
    }
  } catch (error: any) {
    console.error('❌ Pre-enrollment validation error:', error.message)

    // Map SARI errors to user-friendly messages
    if (error.message?.includes('MISMATCH_BIRTHDATE_FABERID')) {
      return {
        success: false,
        message: 'Ausweisnummer und/oder Geburtsdatum sind falsch. Bitte überprüfen Sie Ihre Eingaben.',
        error_code: 'MISMATCH_BIRTHDATE_FABERID'
      }
    }

    if (error.message?.includes('NOT_FOUND')) {
      return {
        success: false,
        message: 'Ausweisnummer nicht gefunden. Bitte überprüfen Sie die Eingabe.',
        error_code: 'NOT_FOUND'
      }
    }

    if (error.message?.includes('LICENSE_EXPIRED')) {
      return {
        success: false,
        message: 'Ihr Führerschein für diese Kategorie ist abgelaufen.',
        error_code: 'LICENSE_EXPIRED'
      }
    }

    if (error.message?.includes('ALREADY_ENROLLED')) {
      return {
        success: false,
        message: 'Sie sind bereits in diesem Kurs angemeldet.',
        error_code: 'ALREADY_ENROLLED'
      }
    }

    if (error.message?.includes('SCHEDULING_CONFLICT')) {
      return {
        success: false,
        message: 'Sie sind zu dieser Zeit bereits in einem anderen Kurs angemeldet.',
        error_code: 'SCHEDULING_CONFLICT'
      }
    }

    if (error.message?.includes('COURSE_NOT_SAME_DATE')) {
      return {
        success: false,
        message: 'Sie sind zu dieser Zeit bereits in einem anderen Kurs angemeldet.',
        error_code: 'COURSE_NOT_SAME_DATE'
      }
    }

    if (error.message?.includes('COURSE_FULL')) {
      return {
        success: false,
        message: 'Der Kurs ist ausgebucht.',
        error_code: 'COURSE_FULL'
      }
    }

    if (error.message?.includes('COURSE_IN_PAST')) {
      return {
        success: false,
        message: 'Der Kurs hat bereits stattgefunden.',
        error_code: 'COURSE_IN_PAST'
      }
    }

    if (error.message?.includes('PREREQUISITE_NOT_MET')) {
      return {
        success: false,
        message: 'Sie erfüllen die Voraussetzungen für diesen Kurs nicht.',
        error_code: 'PREREQUISITE_NOT_MET'
      }
    }

    throw createError({
      statusCode: 500,
      message: `Validierungsfehler: ${error.message}`
    })
  }
})

