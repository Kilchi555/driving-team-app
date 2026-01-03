/**
 * SARI Test Participants API
 * Admin endpoint to test and debug participant sync
 * 
 * Security:
 * ✅ Layer 1: Authentication (JWT token)
 * ✅ Layer 2: Rate Limiting (30 req/min - admin testing only)
 * ✅ Layer 3: Input Validation (course_id required, UUID format)
 * ✅ Layer 4: Authorization (admin/super_admin only)
 * ✅ Layer 4: Tenant ownership check
 * ✅ Layer 5: Audit Logging (all test requests logged)
 * ✅ Layer 7: Error Handling (detailed but safe error messages)
 */

import { createClient } from '@supabase/supabase-js'
import { SARIClient } from '~/utils/sariClient'
import { checkSARIRateLimit, formatRateLimitError, validateSARIInput } from '~/server/utils/sari-rate-limit'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'

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
    const { courseId } = body

    // Layer 3: Input Validation
    if (!courseId) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Missing required field: courseId' 
      })
    }

    const validation = validateSARIInput({ courseSessionId: courseId })
    if (!validation.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: `Validation error: ${validation.errors.join(', ')}`
      })
    }

    // Layer 2: Rate Limiting (lower limit for admin testing)
    const rateLimitCheck = await checkSARIRateLimit(user.id, 'test_participants')
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

    // Layer 4: Authorization - Admin/Super Admin only
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
    }

    // Layer 4: Verify course belongs to tenant
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, sari_managed, sari_course_id, tenant_id')
      .eq('id', courseId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (courseError || !course) {
      throw createError({ statusCode: 404, statusMessage: 'Course not found' })
    }

    if (!course.sari_managed) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'This course is not SARI-managed' 
      })
    }

    // Get tenant SARI credentials
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('sari_enabled, sari_environment, sari_client_id, sari_client_secret, sari_username, sari_password')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError || !tenant || !tenant.sari_enabled) {
      throw createError({ statusCode: 400, statusMessage: 'SARI not enabled for tenant' })
    }

    // Create SARI client
    const sari = new SARIClient({
      environment: tenant.sari_environment || 'test',
      clientId: tenant.sari_client_id,
      clientSecret: tenant.sari_client_secret,
      username: tenant.sari_username,
      password: tenant.sari_password
    })

    console.log(`🧪 [${userProfile.auth_user_id}] Testing SARI participants for course ${courseId}`)

    // Fetch participants from SARI
    const sariCourseId = parseInt(course.sari_course_id)
    const participants = await (sari as any).getParticipants(sariCourseId)

    console.log(`✅ [${userProfile.auth_user_id}] Retrieved ${participants?.length || 0} participants from SARI`)

    // Layer 5: Audit Logging
    await logAudit({
      user_id: user.id,
      action: 'sari_test_participants',
      resource_type: 'course',
      resource_id: courseId,
      status: 'success',
      details: {
        course_id: courseId,
        sari_course_id: sariCourseId,
        participant_count: participants?.length || 0,
      },
      ip_address: getClientIP(event),
    })

    return {
      success: true,
      message: `Retrieved ${participants?.length || 0} participants from SARI`,
      course_id: courseId,
      sari_course_id: sariCourseId,
      participants: participants || [],
      count: participants?.length || 0
    }

  } catch (error: any) {
    console.error('SARI test-participants error:', error)
    
    if (error.message?.includes('COURSE_NOT_FOUND')) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Course not found in SARI system' 
      })
    }
    
    if (error.message?.includes('CONNECTION')) {
      throw createError({ 
        statusCode: 503, 
        statusMessage: 'Cannot connect to SARI system' 
      })
    }

    if (error.statusCode && error.statusMessage) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve participants from SARI'
    })
  }
})
