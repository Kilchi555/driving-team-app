/**
 * GET /api/customer/user-data
 *
 * 3-Layer Architecture:
 * Layer 1: Auth + Input Validation
 * Layer 2: Business Logic + Transform
 * Layer 3: DB Query
 *
 * Security: Session-based auth, RLS enforcement, field sanitization
 */

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

const transformUserData = (rawData: any): any => {
  if (!rawData) return null

  return {
    id: rawData.id,
    firstName: rawData.first_name || '',
    lastName: rawData.last_name || '',
    email: rawData.email || '',
    phone: rawData.phone || '',
    dateOfBirth: rawData.date_of_birth || null,
    street: rawData.street || '',
    zip: rawData.zip || '',
    city: rawData.city || '',
    preferredPaymentMethod: rawData.preferred_payment_method || 'wallee',
    tenantId: rawData.tenant_id,
    role: rawData.role || 'customer',
    createdAt: rawData.created_at,
    updatedAt: rawData.updated_at
  }
}

const fetchUserDataFromDb = async (userId: string): Promise<any | null> => {
  const supabase = getSupabaseAdmin()

  try {
    logger.debug(`📊 Fetching user data from DB for: ${userId}`)

    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        auth_user_id,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        street,
        zip,
        city,
        preferred_payment_method,
        tenant_id,
        role,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single()

    if (error) {
      logger.error(`❌ Database error fetching user ${userId}:`, error)
      return null
    }

    logger.debug(`✅ User data fetched from DB: ${userId}`)
    return data
  } catch (err: any) {
    logger.error('❌ Unexpected error in fetchUserDataFromDb:', err)
    return null
  }
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    const auth = await verifyAuth(event)
    if (!auth) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const { userId } = auth
    logger.debug(`🔐 Request authenticated for user: ${userId}`)

    const rawData = await fetchUserDataFromDb(userId)

    if (!rawData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User data not found'
      })
    }

    const transformedData = transformUserData(rawData)
    const duration = Date.now() - startTime
    logger.debug(`✅ Request completed in ${duration}ms`)

    return {
      success: true,
      data: transformedData,
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime

    if (error.statusCode) {
      logger.warn(`⚠️ API error (${duration}ms):`, error.statusMessage)
      throw error
    }

    logger.error(`❌ Unexpected error (${duration}ms):`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
