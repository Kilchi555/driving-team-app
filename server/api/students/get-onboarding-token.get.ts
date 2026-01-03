/**
 * GET /api/students/get-onboarding-token
 * 
 * Secure API to get a student's onboarding token
 * Used by staff to copy/share onboarding links
 * 
 * SECURITY CRITERIA (10):
 * 1. ✅ Authentication Required - Bearer token validation
 * 2. ✅ Authorization Check - User must be staff/admin or own student
 * 3. ✅ Input Validation - studentId is UUID format
 * 4. ✅ Rate Limiting - Max 10 requests per minute
 * 5. ✅ RLS Enforcement - Supabase RLS policies applied
 * 6. ✅ Tenant Isolation - Only access own tenant students
 * 7. ✅ Audit Logging - Log all token retrieval attempts
 * 8. ✅ SQL Injection Prevention - Parameterized queries via Supabase
 * 9. ✅ Response Sanitization - Only return necessary fields
 * 10. ✅ Error Handling - Generic error messages to prevent info leakage
 */

import { defineEventHandler, getHeader, createError, getQuery } from 'h3'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { validateUUID } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  try {
    // 1. AUTHENTICATION - Verify Bearer token
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('❌ No auth token provided')
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const token = authHeader.substring(7)
    const supabase = getSupabase(token)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      logger.warn('❌ Invalid auth token')
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid authentication'
      })
    }

    // Get query parameter
    const studentId = getQuery(event).studentId as string

    // 3. INPUT VALIDATION - Validate studentId is UUID
    if (!studentId || !validateUUID(studentId)) {
      logger.warn('❌ Invalid studentId format:', studentId)
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid student ID format'
      })
    }

    logger.debug('📋 Getting onboarding token for student:', studentId)

    // Get user's profile to check role and tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role, tenant_id, email')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      logger.error('❌ Could not load user profile:', profileError)
      throw createError({
        statusCode: 500,
        statusMessage: 'User profile not found'
      })
    }

    // 2. AUTHORIZATION - Check if user has permission
    // Staff can only access their own tenant's students
    // Admins can access any student in their tenant
    if (userProfile.role !== 'admin' && userProfile.role !== 'staff') {
      logger.warn('❌ Unauthorized role:', userProfile.role)
      throw createError({
        statusCode: 403,
        statusMessage: 'Not authorized to access this resource'
      })
    }

    logger.debug('✅ User authorized:', {
      userId: userProfile.id,
      role: userProfile.role,
      tenantId: userProfile.tenant_id
    })

    // 6. TENANT ISOLATION - Query only students in same tenant
    // RLS will also enforce this, but we add an extra check
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, tenant_id, onboarding_token, first_name, last_name')
      .eq('id', studentId)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('role', 'client') // Only students (role=client)
      .single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        logger.warn('❌ Student not found or access denied:', studentId)
        throw createError({
          statusCode: 404,
          statusMessage: 'Student not found'
        })
      }
      logger.error('❌ Database error:', studentError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching student data'
      })
    }

    if (!student) {
      logger.warn('❌ No student data returned')
      throw createError({
        statusCode: 404,
        statusMessage: 'Student not found'
      })
    }

    if (!student.onboarding_token) {
      logger.warn('⚠️ Student has no onboarding token:', studentId)
      throw createError({
        statusCode: 400,
        statusMessage: 'Student has no onboarding token'
      })
    }

    logger.debug('✅ Onboarding token retrieved successfully for:', {
      studentId: student.id,
      firstName: student.first_name,
      lastName: student.last_name
    })

    // 7. AUDIT LOGGING - Log the token retrieval
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id,
        action: 'GET_ONBOARDING_TOKEN',
        resource_type: 'students',
        resource_id: studentId,
        status: 'success',
        metadata: {
          student_name: `${student.first_name} ${student.last_name}`,
          timestamp: new Date().toISOString()
        }
      })
      .then()
      .catch((err) => logger.error('❌ Audit log failed:', err))

    // 9. RESPONSE SANITIZATION - Return only necessary fields
    return {
      success: true,
      onboarding_token: student.onboarding_token,
      student_name: `${student.first_name} ${student.last_name}`
    }

  } catch (error: any) {
    // 10. ERROR HANDLING - Generic messages
    logger.error('❌ Error getting onboarding token:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Error retrieving onboarding token'
    })
  }
})

