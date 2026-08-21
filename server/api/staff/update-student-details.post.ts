import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import { normalizePhoneNumber } from '~/server/utils/sms'
import {
  duplicateEmailMessage,
  duplicatePhoneMessage,
  messageForUniqueConstraint
} from '~/server/utils/student-contact-conflict'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/update-student-details
 * 
 * Update student details (name, email, phone, address, etc.)
 * Only accessible by staff/admin
 */

const CONFLICT_USER_FIELDS = 'id, first_name, last_name, is_active, deleted_at, onboarding_status'

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
      first_name,
      last_name,
      email,
      phone,
      category,
      birthdate,
      street,
      street_nr,
      zip,
      city,
      profession
    } = body

    if (!user_id) {
      logger.warn('❌ user_id missing from request')
      throw createError({
        statusCode: 400,
        statusMessage: 'Kunde konnte nicht zugeordnet werden'
      })
    }

    if (first_name !== undefined && !String(first_name).trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Vorname darf nicht leer sein'
      })
    }

    if (last_name !== undefined && !String(last_name).trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nachname darf nicht leer sein'
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
        statusMessage: 'Kunde nicht gefunden'
      })
    }

    if (!student) {
      logger.warn('❌ Student not found')
      throw createError({
        statusCode: 404,
        statusMessage: 'Kunde nicht gefunden'
      })
    }

    if (student.tenant_id !== userProfile.tenant_id) {
      logger.warn('❌ Student not in same tenant:', { studentTenant: student.tenant_id, staffTenant: userProfile.tenant_id })
      throw createError({
        statusCode: 403,
        statusMessage: 'Dieser Kunde gehört nicht zu eurer Fahrschule'
      })
    }
    
    logger.debug('✅ Student verified in same tenant')

    // ✅ Update student
    const updateData: any = {}

    if (first_name !== undefined) updateData.first_name = String(first_name).trim()
    if (last_name !== undefined) updateData.last_name = String(last_name).trim()

    if (email !== undefined) {
      const nextEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
      updateData.email = nextEmail || null

      if (updateData.email) {
        const { data: existingByEmail } = await supabaseAdmin
          .from('users')
          .select(CONFLICT_USER_FIELDS)
          .eq('tenant_id', userProfile.tenant_id)
          .ilike('email', updateData.email)
          .neq('id', user_id)
          .maybeSingle()

        if (existingByEmail) {
          throw createError({
            statusCode: 409,
            statusMessage: duplicateEmailMessage(existingByEmail)
          })
        }
      }
    }

    if (phone !== undefined) {
      const phoneRaw = typeof phone === 'string' ? phone.trim() : ''
      if (!phoneRaw) {
        updateData.phone = null
      } else {
        const normalized = normalizePhoneNumber(phoneRaw)
        if (!normalized) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Bitte eine gültige Telefonnummer eingeben (z. B. +41 76 338 02 89).'
          })
        }
        updateData.phone = normalized

        const { data: existingByPhone } = await supabaseAdmin
          .from('users')
          .select(CONFLICT_USER_FIELDS)
          .eq('tenant_id', userProfile.tenant_id)
          .eq('phone', normalized)
          .neq('id', user_id)
          .maybeSingle()

        if (existingByPhone) {
          throw createError({
            statusCode: 409,
            statusMessage: duplicatePhoneMessage(existingByPhone)
          })
        }
      }
    }

    if (category !== undefined) updateData.category = category
    // Empty string is invalid for Postgres date columns — store null instead
    if (birthdate !== undefined) {
      updateData.birthdate = typeof birthdate === 'string' && birthdate.trim() !== ''
        ? birthdate.trim()
        : null
    }
    if (street !== undefined) updateData.street = street
    if (street_nr !== undefined) updateData.street_nr = street_nr
    if (zip !== undefined) updateData.zip = zip
    if (city !== undefined) updateData.city = city
    if (profession !== undefined) updateData.profession = profession

    logger.debug('📝 Update data:', updateData)

    const { error: updateError, data: updated } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user_id)
      .select('id, first_name, last_name, email, phone, category, birthdate, street, street_nr, zip, city, profession')

    if (updateError) {
      logger.error('❌ Error updating student:', updateError)
      const uniqueMessage = messageForUniqueConstraint(updateError.message || '')
      throw createError({
        statusCode: uniqueMessage ? 409 : 500,
        statusMessage: uniqueMessage || 'Die Angaben konnten nicht gespeichert werden. Bitte erneut versuchen.'
      })
    }

    logger.debug('✅ Student details updated successfully:', { user_id, updated })

    return {
      success: true,
      message: 'Angaben gespeichert',
      data: updated?.[0] || null
    }

  } catch (error: any) {
    logger.error('❌ Staff update-student-details error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Die Angaben konnten nicht gespeichert werden. Bitte erneut versuchen.'
    })
  }
})
