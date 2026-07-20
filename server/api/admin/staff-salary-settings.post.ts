/**
 * POST /api/admin/staff-salary-settings
 * Update salary_type and weekly_contracted_hours for a staff member.
 * Body: { staffId: string, salary_type: 'hourly' | 'monthly', weekly_contracted_hours?: number }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const supabase = getSupabaseAdmin()
    const body = await readBody(event)
    const { staffId, salary_type, weekly_contracted_hours, employment_percentage, fulltime_weekly_hours_override, vacation_entitlement_days } = body

    if (!staffId || !salary_type) {
      throw createError({ statusCode: 400, statusMessage: 'staffId and salary_type required' })
    }

    if (!['hourly', 'monthly'].includes(salary_type)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid salary_type' })
    }

    // Verify caller is admin for the same tenant
    const { data: callerData } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!callerData?.tenant_id || callerData.role !== 'admin') {
      throw createError({ statusCode: 403, statusMessage: 'Admin only' })
    }

    // Verify the target staff belongs to same tenant
    const { data: staffData } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('id', staffId)
      .eq('tenant_id', callerData.tenant_id)
      .eq('role', 'staff')
      .single()

    if (!staffData) {
      throw createError({ statusCode: 404, statusMessage: 'Staff not found in your tenant' })
    }

    const updatePayload: Record<string, any> = { salary_type }
    if (salary_type === 'monthly') {
      if (employment_percentage != null) {
        updatePayload.employment_percentage = parseFloat(employment_percentage)
      } else {
        updatePayload.employment_percentage = null
      }
      if (weekly_contracted_hours != null) {
        updatePayload.weekly_contracted_hours = parseFloat(weekly_contracted_hours)
      }
      // Per-staff fulltime reference override (null = use tenant default)
      updatePayload.fulltime_weekly_hours_override =
        fulltime_weekly_hours_override != null
          ? parseFloat(fulltime_weekly_hours_override)
          : null
      // Vacation entitlement in days per year
      if (vacation_entitlement_days != null) {
        updatePayload.vacation_entitlement_days = parseInt(vacation_entitlement_days)
      }
    } else if (salary_type === 'hourly') {
      updatePayload.weekly_contracted_hours = null
      updatePayload.employment_percentage = null
      updatePayload.fulltime_weekly_hours_override = null
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', staffId)

    if (updateError) throw createError({ statusCode: 500, statusMessage: updateError.message })

    logger.debug(`✅ Updated salary settings for staff ${staffId}: ${salary_type}`)
    return { success: true }
  } catch (error: any) {
    logger.error('❌ Error in staff-salary-settings:', error.message)
    throw error
  }
})
