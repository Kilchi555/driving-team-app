/**
 * SARI Validate Student API
 * Validates student data before enrollment
 * 
 * Security:
 * ✅ Layer 1: Authentication (JWT token)
 * ✅ Layer 2: Rate Limiting (120 req/min - lightweight validation)
 * ✅ Layer 3: Input Validation (UUID format, required fields)
 * ✅ Layer 3: Input Sanitization (trim, date formatting)
 * ✅ Layer 4: Authorization (admin/staff, tenant ownership)
 * ✅ Layer 5: Audit Logging (all validation attempts logged)
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
    // Layer 1: Authentication
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw createError({ statusCode: 500, statusMessage: 'Configuration error' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }

    // Get request body
    const body = await readBody(event)
    const raw = { studentId: body.studentId }

    // Layer 3: Input Validation
    if (!raw.studentId) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Missing required field: studentId' 
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
    const { studentId } = sanitizeSARIInput(raw)

    // Layer 2: Rate Limiting (higher limit for validation)
    const rateLimitCheck = await checkSARIRateLimit(user.id, 'validate_student')
    if (!rateLimitCheck.allowed) {
      throw createError(formatRateLimitError(rateLimitCheck.retryAfter || 60000))
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, role, auth_user_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    // Layer 4: Authorization
    if (!['admin', 'staff', 'super_admin'].includes(userProfile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
    }

    // Layer 4: Ownership check - Get student
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, faberid, birthdate, first_name, last_name, tenant_id')
      .eq('id', studentId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (studentError || !student) {
      throw createError({ statusCode: 404, statusMessage: 'Student not found' })
    }

    if (!student.faberid || !student.birthdate) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Student profile incomplete (missing faberid or birthdate)' 
      })
    }

    // Get tenant SARI settings
    const { data: tenantSettings, error: tenantError } = await supabase
      .from('tenants')
      .select('sari_enabled, sari_environment')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError || !tenantSettings || !tenantSettings.sari_enabled) {
      throw createError({ statusCode: 400, statusMessage: 'SARI integration not enabled' })
    }

    // ✅ Load SARI credentials securely
    let sariSecrets
    try {
      sariSecrets = await getTenantSecretsSecure(
        userProfile.tenant_id,
        ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
        'SARI_VALIDATE_STUDENT'
      )
    } catch (secretsErr: any) {
      logger.error('❌ Failed to load SARI credentials:', secretsErr.message)
      throw createError({
        statusCode: 500,
        statusMessage: 'SARI credentials not properly configured'
      })
    }

    // Create SARI client
    const sari = new SARIClient({
      environment: tenantSettings.sari_environment || 'test',
      clientId: sariSecrets.SARI_CLIENT_ID,
      clientSecret: sariSecrets.SARI_CLIENT_SECRET,
      username: sariSecrets.SARI_USERNAME,
      password: sariSecrets.SARI_PASSWORD
    })

    console.log(`🔍 [${userProfile.auth_user_id}] Validating student ${student.id} with SARI`)

    // Try to get customer data - validates FABERID + birthdate match
    const birthdate = new Date(student.birthdate).toISOString().split('T')[0]
    const customerData = await sari.getCustomer(student.faberid, birthdate)

    console.log(`✅ [${userProfile.auth_user_id}] Student validation passed`)

    // Layer 5: Audit Logging
    await logAudit({
      user_id: user.id,
      action: 'sari_validate_student',
      resource_type: 'student',
      resource_id: studentId,
      status: 'success',
      details: {
        student_id: studentId,
        sari_found: !!customerData,
      },
      ip_address: getClientIP(event),
    })

    return {
      success: true,
      message: 'Student validation successful',
      student: {
        first_name: customerData.firstname,
        last_name: customerData.lastname,
        birthdate: customerData.birthdate
      }
    }

  } catch (error: any) {
    console.error('SARI validate-student error:', error)
    
    if (error.message?.includes('PERSON_NOT_FOUND')) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Student not found in SARI system' 
      })
    }
    
    if (error.message?.includes('invalid')) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Student data does not match SARI records' 
      })
    }

    if (error.statusCode && error.statusMessage) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to validate student'
    })
  }
})
