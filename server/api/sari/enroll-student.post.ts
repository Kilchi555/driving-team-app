/**
 * SARI Enroll Student API
 * Registers a student for a SARI course (VKU/PGS)
 * 
 * Security:
 * ✅ Layer 1: Authentication (JWT token)
 * ✅ Layer 2: Rate Limiting (60 req/min per user)
 * ✅ Layer 3: Input Validation (UUID format, required fields)
 * ✅ Layer 3: Input Sanitization (trim, case normalization)
 * ✅ Layer 4: Authorization (admin/staff, tenant ownership)
 * ✅ Layer 5: Audit Logging (all enrollment actions logged)
 * ✅ Layer 7: Error Handling (no credential leakage)
 */

import { createClient } from '@supabase/supabase-js'
import { SARIClient } from '~/utils/sariClient'
import { checkSARIRateLimit, formatRateLimitError, validateSARIInput, sanitizeSARIInput } from '~/server/utils/sari-rate-limit'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Layer 1: Authentication - Verify JWT token
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    // Create Supabase client with user's token
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw createError({ statusCode: 500, statusMessage: 'Configuration error' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }

    // Get request body
    const body = await readBody(event)
    const raw = { courseSessionId: body.courseSessionId, studentId: body.studentId }

    // Layer 3: Input Validation - Check required fields and format
    if (!raw.courseSessionId || !raw.studentId) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Missing required fields: courseSessionId, studentId' 
      })
    }

    const validation = validateSARIInput(raw)
    if (!validation.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: `Validation error: ${validation.errors.join(', ')}`
      })
    }

    // Layer 3: Input Sanitization
    const { courseSessionId, studentId } = sanitizeSARIInput(raw)

    // Layer 2: Rate Limiting - Check if user is within limits
    const rateLimitCheck = await checkSARIRateLimit(user.id, 'enroll_student')
    if (!rateLimitCheck.allowed) {
      throw createError(formatRateLimitError(rateLimitCheck.retryAfter || 60000))
    }

    // Get user profile for tenant_id and role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, role, auth_user_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    // Layer 4: Authorization - Check if user has permission
    if (!['admin', 'staff', 'super_admin'].includes(userProfile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
    }

    // Layer 4: Ownership check - Verify student belongs to user's tenant
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, faberid, birthdate, first_name, last_name, tenant_id')
      .eq('id', studentId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (studentError || !student) {
      throw createError({ statusCode: 404, statusMessage: 'Student not found' })
    }

    if (!student.faberid) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Student has no Ausweisnummer (faberid). Please add it in the student profile.' 
      })
    }

    if (!student.birthdate) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Student has no birthdate. Please add it in the student profile.' 
      })
    }

    // Get course session with SARI course ID
    const { data: session, error: sessionError } = await supabase
      .from('course_sessions')
      .select(`
        id,
        course_id,
        course:courses(
          id,
          sari_course_id,
          sari_managed,
          tenant_id
        )
      `)
      .eq('id', courseSessionId)
      .single()

    if (sessionError || !session) {
      throw createError({ statusCode: 404, statusMessage: 'Course session not found' })
    }

    const course = session.course as any
    
    if (!course?.sari_managed) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'This course is not managed by SARI' 
      })
    }

    // For SARI, we need the individual session's SARI ID
    const { data: sariSession, error: sariSessionError } = await supabase
      .from('course_sessions')
      .select('sari_session_id')
      .eq('id', courseSessionId)
      .single()

    if (sariSessionError || !sariSession?.sari_session_id) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Course session has no SARI ID. Cannot enroll via SARI.' 
      })
    }

    const sariCourseId = parseInt(sariSession.sari_session_id)

    // Get tenant SARI settings and check if enabled
    const { data: tenantSettings, error: tenantError } = await supabase
      .from('tenants')
      .select('sari_enabled, sari_environment')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError || !tenantSettings) {
      throw createError({ statusCode: 500, statusMessage: 'Tenant configuration not found' })
    }

    if (!tenantSettings.sari_enabled) {
      throw createError({ statusCode: 400, statusMessage: 'SARI integration is not enabled for this tenant' })
    }

    // ✅ Load SARI credentials securely from tenant_secrets
    let sariSecrets
    try {
      sariSecrets = await getTenantSecretsSecure(
        userProfile.tenant_id,
        ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
        'SARI_ENROLLMENT'
      )
    } catch (secretsErr: any) {
      logger.error('❌ Failed to load SARI credentials:', secretsErr.message)
      throw createError({
        statusCode: 500,
        statusMessage: 'SARI credentials not properly configured'
      })
    }

    // Create SARI client (don't expose credentials in error messages)
    const sariClient = new SARIClient({
      environment: tenantSettings.sari_environment || 'test',
      clientId: sariSecrets.SARI_CLIENT_ID,
      clientSecret: sariSecrets.SARI_CLIENT_SECRET,
      username: sariSecrets.SARI_USERNAME,
      password: sariSecrets.SARI_PASSWORD
    })

    // Format birthdate as YYYY-MM-DD
    const birthdate = new Date(student.birthdate).toISOString().split('T')[0]

    // Enroll student in SARI
    console.log(`📝 [${userProfile.auth_user_id}] Enrolling student ${student.id} in SARI course ${sariCourseId}`)
    
    await sariClient.enrollStudent(sariCourseId, student.faberid, birthdate)

    console.log(`✅ [${userProfile.auth_user_id}] Successfully enrolled student in SARI course ${sariCourseId}`)

    // Get full customer data from SARI for enriched registration (TIER 1 enhancement)
    let sariCustomerData = null
    try {
      sariCustomerData = await sariClient.getCustomer(student.faberid, birthdate)
      console.log(`📥 Retrieved full SARI customer data for ${student.faberid}`)
    } catch (err: any) {
      console.warn(`⚠️ Could not fetch full SARI customer data: ${err.message}`)
    }

    // Create local course registration with enriched SARI data (TIER 1 enhancement)
    const registrationData: any = {
      // Core linking
      course_id: course.id,
      user_id: studentId,
      tenant_id: userProfile.tenant_id,
      
      // Status
      status: 'confirmed',
      payment_status: 'paid',
      
      // TIER 1: Personal Data from SARI/Student
      first_name: student.first_name,
      last_name: student.last_name,
      sari_faberid: student.faberid,
      email: sariCustomerData?.email || null,
      phone: sariCustomerData?.phone || null,
      street: sariCustomerData?.address || null,
      zip: sariCustomerData?.zip || null,
      city: sariCustomerData?.city || null,
      
      // TIER 1: Full SARI Audit Trail
      sari_data: sariCustomerData ? {
        faberid: sariCustomerData.faberid,
        firstname: sariCustomerData.firstname,
        lastname: sariCustomerData.lastname,
        birthdate: sariCustomerData.birthdate,
        email: sariCustomerData.email,
        phone: sariCustomerData.phone,
        address: sariCustomerData.address,
        zip: sariCustomerData.zip,
        city: sariCustomerData.city,
        syncedAt: new Date().toISOString(),
        syncSource: 'MANUAL_ENROLLMENT'
      } : null,
      
      // TIER 1: License/Qualification Data
      sari_licenses: sariCustomerData?.licenses && sariCustomerData.licenses.length > 0 ? {
        licenses: sariCustomerData.licenses.map((license: any) => ({
          type: license.type || 'UNKNOWN',
          issued_date: license.date_issued,
          issued_by: license.country || 'CH',
          is_valid: license.valid !== false
        })),
        licenses_count: sariCustomerData.licenses.length,
        synced_at: new Date().toISOString()
      } : null,
      
      // Metadata
      sari_synced: true,
      sari_synced_at: new Date().toISOString(),
      registered_by: user.id,
      notes: `Manually enrolled by admin on ${new Date().toLocaleDateString('de-CH')} | SARI ID: ${student.faberid}`
    }

    const { data: registration, error: regError } = await supabase
      .from('course_registrations')
      .insert(registrationData)
      .select()
      .single()

    if (regError) {
      console.error('Failed to create local registration:', regError)
    }

    // Layer 5: Audit Logging - Log successful enrollment
    await logAudit({
      user_id: user.id,
      action: 'sari_enroll_student',
      resource_type: 'course_registration',
      resource_id: registration?.id,
      status: 'success',
      details: {
        student_id: studentId,
        course_id: course.id,
        sari_course_id: sariCourseId,
      },
      ip_address: getClientIP(event),
    })

    return {
      success: true,
      message: `Student ${student.first_name} ${student.last_name} enrolled in SARI course`,
      sariCourseId,
      registrationId: registration?.id
    }

  } catch (error: any) {
    console.error('SARI enroll-student error:', error)
    
    // Handle specific SARI errors (don't leak internals)
    if (error.message?.includes('PERSON_ALREADY_ADDED')) {
      throw createError({ 
        statusCode: 409, 
        statusMessage: 'Student is already enrolled in this course' 
      })
    }
    
    if (error.message?.includes('PERSON_NOT_FOUND')) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Student not found in SARI system. Please verify the Ausweisnummer.' 
      })
    }
    
    if (error.message?.includes('COURSE_NOT_FOUND')) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Course not found in SARI system' 
      })
    }
    
    if (error.message?.includes('LICENSE_EXPIRED')) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Student license has expired for this course category' 
      })
    }

    // Don't leak implementation details
    if (error.statusCode && error.statusMessage) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to enroll student in SARI course'
    })
  }
})
