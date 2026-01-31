import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-appointment-count
 * 
 * Secure API to count active appointments for a user in a specific category
 * Used for pricing calculation (AdminFee on 2nd appointment)
 * 
 * Query Params:
 *   - userId: User ID (required)
 *   - categoryCode: Category code (required)
 * 
 * Returns:
 *   - count: Number of active appointments + 1 (for next appointment)
 * 
 * Security Layers:
 *   1. Authentication (HTTP-Only Cookie)
 *   2. Tenant Isolation
 *   3. Only staff/admin can query
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: AUTHENTICATION
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // ✅ LAYER 2: Get user profile and tenant
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const tenantId = userProfile.tenant_id

    // Only staff and admins can query appointment counts
    if (!['staff', 'admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions'
      })
    }

    // ✅ LAYER 3: INPUT VALIDATION
    const query = getQuery(event)
    const userId = query.userId as string | undefined
    const categoryCode = query.categoryCode as string | undefined

    if (!userId || !categoryCode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'userId and categoryCode are required'
      })
    }

    // Validate UUID format for userId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid user ID format'
      })
    }

    // ✅ LAYER 4: Count active appointments
    // ✅ KORRIGIERT: Nur aktive Termine zählen (keine stornierten/abgebrochenen)
    const { count, error } = await supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', categoryCode)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null) // ✅ Soft Delete Filter
      .not('status', 'eq', 'cancelled') // ✅ Stornierte Termine nicht zählen
      .not('status', 'eq', 'aborted')   // ✅ Abgebrochene Termine nicht zählen

    if (error) {
      logger.error('❌ Error counting appointments for category:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to count appointments'
      })
    }

    const appointmentNumber = (count || 0) + 1

    logger.debug(`📊 Appointment count for ${categoryCode}: ${appointmentNumber} (${count || 0} active + 1 new)`, {
      userId,
      categoryCode,
      tenantId
    })

    return {
      success: true,
      data: {
        count: appointmentNumber,
        active_count: count || 0
      }
    }

  } catch (error: any) {
    logger.error('❌ Staff get-appointment-count API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to count appointments'
    })
  }
})
