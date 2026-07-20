/**
 * POST /api/admin/staff-monthly-hours
 *
 * action = 'recalculate'
 *   Aggregates appointment hours for all (or a specific) staff member and
 *   upserts records into staff_monthly_hours.
 *   Works for BOTH salary types:
 *     - monthly: also calculates target_hours, overtime, cumulative_overtime
 *     - hourly:  stores actual_hours/vacation_hours; target/overtime left at 0
 *
 * action = 'set_target'
 *   Manually overrides target_hours for a specific staff / year / month.
 *
 * action = 'set_sick'
 *   Manually sets sick_hours for a specific staff / year / month.
 *   sick_hours count toward working time (like vacation) and thus affect overtime.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { recalculateStaffHoursForTenant } from '~/server/services/staff-hours-calculator'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const supabase = getSupabaseAdmin()
    const body = await readBody(event)

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!userData?.tenant_id) throw createError({ statusCode: 403, statusMessage: 'No tenant' })
    if (userData.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Admin only' })

    const tenantId = userData.tenant_id
    const { action, year, month, staffId } = body

    // ── set_target ──────────────────────────────────────────────────────────────
    if (action === 'set_target') {
      const { target_hours } = body
      if (!staffId || !year || !month || target_hours == null) {
        throw createError({ statusCode: 400, statusMessage: 'Missing fields for set_target' })
      }
      const { error } = await supabase
        .from('staff_monthly_hours')
        .upsert(
          { staff_id: staffId, tenant_id: tenantId, year, month, target_hours },
          { onConflict: 'tenant_id,staff_id,year,month', ignoreDuplicates: false }
        )
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true }
    }

    // ── set_sick ─────────────────────────────────────────────────────────────────
    if (action === 'set_sick') {
      const { sick_hours } = body
      if (!staffId || !year || !month || sick_hours == null) {
        throw createError({ statusCode: 400, statusMessage: 'Missing fields for set_sick' })
      }
      const { error } = await supabase
        .from('staff_monthly_hours')
        .upsert(
          { staff_id: staffId, tenant_id: tenantId, year, month, sick_hours },
          { onConflict: 'tenant_id,staff_id,year,month', ignoreDuplicates: false }
        )
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true }
    }

    // ── set_admin ─────────────────────────────────────────────────────────────
    if (action === 'set_admin') {
      const { admin_hours } = body
      if (!staffId || !year || !month || admin_hours == null) {
        throw createError({ statusCode: 400, statusMessage: 'Missing fields for set_admin' })
      }
      const { error } = await supabase
        .from('staff_monthly_hours')
        .upsert(
          { staff_id: staffId, tenant_id: tenantId, year, month, admin_hours },
          { onConflict: 'tenant_id,staff_id,year,month', ignoreDuplicates: false }
        )
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true }
    }

    // ── set_carry_over ────────────────────────────────────────────────────────
    if (action === 'set_carry_over') {
      const { carry_over_hours, notes } = body
      if (!staffId || !year || carry_over_hours == null) {
        throw createError({ statusCode: 400, statusMessage: 'staffId, year and carry_over_hours are required' })
      }
      const { error } = await supabase
        .from('staff_year_carry_over')
        .upsert(
          {
            staff_id: staffId,
            tenant_id: tenantId,
            year,
            carry_over_hours: parseFloat(carry_over_hours),
            notes: notes ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,staff_id,year', ignoreDuplicates: false }
        )
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true }
    }

    // ── delete_before ────────────────────────────────────────────────────────
    // Removes all staff_monthly_hours records before a given month (for new hires).
    if (action === 'delete_before') {
      const { beforeMonth } = body
      if (!staffId || !year || !beforeMonth) {
        throw createError({ statusCode: 400, statusMessage: 'staffId, year and beforeMonth are required' })
      }
      const { error } = await supabase
        .from('staff_monthly_hours')
        .delete()
        .eq('staff_id', staffId)
        .eq('tenant_id', tenantId)
        .eq('year', year)
        .lt('month', beforeMonth)
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true }
    }

    // ── recalculate ─────────────────────────────────────────────────────────────
    if (action === 'recalculate') {
      if (!year) throw createError({ statusCode: 400, statusMessage: 'year is required' })

      // Accept either a single `month`, an array `months`, or default to full year
      let monthsToProcess: number[]
      if (Array.isArray(body.months) && body.months.length > 0) {
        monthsToProcess = body.months
      } else if (month) {
        monthsToProcess = [month]
      } else {
        monthsToProcess = Array.from({ length: 12 }, (_, i) => i + 1)
      }

      const { updated } = await recalculateStaffHoursForTenant(
        supabase, tenantId, year, monthsToProcess, staffId, body.forceTargetRecalc === true
      )

      logger.debug(`✅ Recalculated ${updated} monthly-hour records for year ${year}`)
      return { success: true, updated }
    }

    throw createError({ statusCode: 400, statusMessage: 'Unknown action' })
  } catch (error: any) {
    logger.error('❌ Error in staff-monthly-hours POST:', error.message)
    throw error
  }
})
