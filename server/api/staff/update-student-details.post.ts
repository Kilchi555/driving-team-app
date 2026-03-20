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
    // ✅ AUTHENTICATION
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // ✅ Get admin client
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // ✅ Verify staff access
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile || !['staff', 'admin'].includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Not authorized - staff/admin only'
      })
    }

    // ✅ Parse request body
    const body = await readBody(event)
    const {
      user_id,
      email,
      phone,
      category,
      birthdate,
      faberid,
      street,
      street_nr,
      zip,
      city,
      invoice_address
    } = body

    if (!user_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'user_id is required'
      })
    }

    // ✅ Verify student belongs to same tenant
    const { data: student, error: studentError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('id', user_id)
      .single()

    if (studentError || !student || student.tenant_id !== userProfile.tenant_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Student not found or not in your tenant'
      })
    }

    // ✅ Update student
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (category !== undefined) updateData.category = category
    if (birthdate !== undefined) updateData.birthdate = birthdate
    if (faberid !== undefined) updateData.faberid = faberid
    if (street !== undefined) updateData.street = street
    if (street_nr !== undefined) updateData.street_nr = street_nr
    if (zip !== undefined) updateData.zip = zip
    if (city !== undefined) updateData.city = city
    if (invoice_address !== undefined) updateData.invoice_address = invoice_address

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user_id)

    if (updateError) {
      logger.error('Error updating student:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update student details'
      })
    }

    logger.debug('✅ Student details updated:', { user_id, ...updateData })

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
