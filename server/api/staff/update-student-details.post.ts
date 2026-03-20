import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/update-student-details
 * 
 * Update student details (email, phone, address, etc.)
 * Only accessible by staff/admin
 */

export default defineEventHandler(async (event) => {
  try {
    logger.debug('🔍 Starting update-student-details...')
    
    // ✅ AUTHENTICATION
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      logger.warn('❌ No authenticated user found')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }
    logger.debug('✅ Auth user:', authUser.id)

    // ✅ Get admin client
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // ✅ Verify staff access
    logger.debug('🔍 Checking staff access for auth_user_id:', authUser.id)
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError) {
      logger.error('❌ Error fetching user profile:', userError)
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    if (!userProfile) {
      logger.warn('❌ User profile not found')
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    if (!['staff', 'admin'].includes(userProfile.role)) {
      logger.warn('❌ User role is not staff/admin:', userProfile.role)
      throw createError({
        statusCode: 403,
        statusMessage: 'Not authorized - staff/admin only'
      })
    }
    
    logger.debug('✅ Staff user verified:', { userId: userProfile.id, role: userProfile.role, tenantId: userProfile.tenant_id })

    // ✅ Parse request body
    const body = await readBody(event)
    logger.debug('📝 Request body:', body)
    
    const {
      user_id,
      email,
      phone,
      category,
      birthdate,
      street,
      street_nr,
      zip,
      city
    } = body

    if (!user_id) {
      logger.warn('❌ user_id missing from request')
      throw createError({
        statusCode: 400,
        statusMessage: 'user_id is required'
      })
    }

    // ✅ Verify student belongs to same tenant
    logger.debug('🔍 Checking student access for user_id:', user_id)
    const { data: student, error: studentError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('id', user_id)
      .single()

    if (studentError) {
      logger.error('❌ Error fetching student:', studentError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Student not found'
      })
    }

    if (!student) {
      logger.warn('❌ Student not found')
      throw createError({
        statusCode: 404,
        statusMessage: 'Student not found'
      })
    }

    if (student.tenant_id !== userProfile.tenant_id) {
      logger.warn('❌ Student not in same tenant:', { studentTenant: student.tenant_id, staffTenant: userProfile.tenant_id })
      throw createError({
        statusCode: 403,
        statusMessage: 'Student not in your tenant'
      })
    }
    
    logger.debug('✅ Student verified in same tenant')

    // ✅ Update student
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (category !== undefined) updateData.category = category
    if (birthdate !== undefined) updateData.birthdate = birthdate
    if (street !== undefined) updateData.street = street
    if (street_nr !== undefined) updateData.street_nr = street_nr
    if (zip !== undefined) updateData.zip = zip
    if (city !== undefined) updateData.city = city

    logger.debug('📝 Update data:', updateData)

    const { error: updateError, data: updated } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user_id)
      .select()

    if (updateError) {
      logger.error('❌ Error updating student:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update student details: ' + updateError.message
      })
    }

    logger.debug('✅ Student details updated successfully:', { user_id, updated })

    return {
      success: true,
      message: 'Student details updated successfully'
    }

  } catch (error: any) {
    logger.error('❌ Staff update-student-details error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update student details'
    })
  }
})
