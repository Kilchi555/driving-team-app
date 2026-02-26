import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * ✅ GET /api/staff/check-admin-fee-paid
 * 
 * Secure API to check if admin fee has already been paid for a user in a category
 * Used for pricing calculation
 * 
 * Query Params:
 *   - userId: User ID (required)
 *   - categoryCode: Category code (required)
 * 
 * Returns:
 *   - hasPaid: boolean indicating if admin fee was already paid for this category
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

    // Only staff and admins can query
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

    // ✅ LAYER 4: Check if admin fee was already paid for this category
    // Strategy: JOIN payments with appointments to get category, filter by active payment status
    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select('id, admin_fee_rappen, payment_status, metadata, appointment_id, appointments!inner(type)')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .gt('admin_fee_rappen', 0)
      .in('payment_status', ['pending', 'completed'])

    if (error) {
      logger.error('❌ Error checking admin fee payments:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check admin fee payments'
      })
    }

    // Filter by category: use appointment.type (reliable) OR metadata.category (fallback)
    const paymentsWithAdminFee = (payments || []).filter((payment: any) => {
      const appointmentCategory = payment.appointments?.type
      if (appointmentCategory === categoryCode) return true

      // Fallback: check metadata for newer payments that have it set
      let metadataObj: any = {}
      try {
        if (typeof payment.metadata === 'string') {
          metadataObj = JSON.parse(payment.metadata)
        } else if (typeof payment.metadata === 'object' && payment.metadata != null) {
          metadataObj = payment.metadata
        }
      } catch (_e) { /* ignore */ }
      return metadataObj?.category === categoryCode
    })

    const hasPaid = paymentsWithAdminFee.length > 0

    logger.debug(`📊 Admin fee check: ${hasPaid ? 'Already paid' : 'Not yet paid'}`, {
      userId,
      categoryCode,
      totalPaymentsWithFee: (payments || []).length,
      matchingCategory: paymentsWithAdminFee.length
    })

    return {
      success: true,
      data: {
        hasPaid: hasPaid
      }
    }

  } catch (error: any) {
    logger.error('❌ Staff check-admin-fee-paid API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to check admin fee payments'
    })
  }
})
