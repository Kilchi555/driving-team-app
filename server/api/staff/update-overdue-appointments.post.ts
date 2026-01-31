import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/update-overdue-appointments
 * 
 * Secure API to mark overdue appointments
 * Moves appointments with passed due date to 'overdue' status
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Validation of appointment status
 *   4. Audit Logging
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ 1. AUTHENTIFIZIERUNG
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    // Get user from users table to get tenant_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    const tenantId = user.tenant_id

    // ✅ 2. GET OVERDUE APPOINTMENTS (start_time < now AND status != completed/overdue/cancelled)
    const now = new Date().toISOString()
    
    const { data: overdueAppointments, error: selectError } = await supabase
      .from('appointments')
      .select('id')
      .eq('tenant_id', tenantId)
      .lt('start_time', now)
      .not('status', 'in', '(completed,overdue,cancelled)')

    if (selectError) {
      logger.error('❌ Error fetching overdue appointments:', selectError)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch overdue appointments'
      })
    }

    if (!overdueAppointments || overdueAppointments.length === 0) {
      logger.debug('ℹ️ No overdue appointments found')
      return {
        success: true,
        data: [],
        message: 'No overdue appointments'
      }
    }

    const overdueIds = overdueAppointments.map((apt: any) => apt.id)

    // ✅ 3. UPDATE OVERDUE APPOINTMENTS
    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .in('id', overdueIds)
      .select()

    if (updateError) {
      logger.error('❌ Error updating overdue appointments:', updateError)
      throw createError({
        statusCode: 500,
        message: 'Failed to update appointments'
      })
    }

    // ✅ 4. AUDIT LOGGING
    logger.debug('✅ Overdue appointments updated:', {
      userId: user.id,
      tenantId,
      count: updated?.length || 0
    })

    return {
      success: true,
      data: updated || [],
      message: `Marked ${updated?.length || 0} appointments as overdue`
    }

  } catch (error: any) {
    logger.error('❌ Error in update-overdue-appointments API:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to update overdue appointments'
    })
  }
})
