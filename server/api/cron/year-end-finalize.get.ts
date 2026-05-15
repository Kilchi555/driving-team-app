/**
 * GET /api/cron/year-end-finalize
 *
 * Runs on January 15th at 03:00.
 * Final recalculation of December for all tenants, then writes the
 * year-end carry-over balance into staff_year_carry_over for the new year.
 *
 * This is the authoritative "books are closed" operation for the previous year.
 */
import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { recalculateStaffHoursForTenant } from '~/server/services/staff-hours-calculator'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const secret = event.node.req.headers.authorization?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - invalid CRON_SECRET' })
  }

  const now = new Date()
  const prevYear = now.getFullYear() - 1
  const supabase = getSupabaseAdmin()

  // Load all tenants with monthly-salary staff
  const { data: monthlyStaff } = await supabase
    .from('users')
    .select('tenant_id, id')
    .eq('role', 'staff')
    .eq('salary_type', 'monthly')

  const tenantIds = [...new Set((monthlyStaff || []).map((u: any) => u.tenant_id))]
  logger.debug(`📅 Year-end finalize for ${prevYear}: ${tenantIds.length} tenants`)

  let totalUpdated = 0
  let carryOversWritten = 0

  for (const tenantId of tenantIds) {
    try {
      // 1. Final recalculation of all completed months of previous year (Jan–Dec)
      const { updated } = await recalculateStaffHoursForTenant(
        supabase, tenantId, prevYear,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      )
      totalUpdated += updated

      // 2. Read December saldo for each monthly-salary staff and write carry-over
      const staffIds = (monthlyStaff || [])
        .filter((u: any) => u.tenant_id === tenantId)
        .map((u: any) => u.id)

      // Load staff details (for vacation entitlement + weekly hours)
      const { data: staffDetails } = await supabase
        .from('users')
        .select('id, weekly_contracted_hours, vacation_entitlement_days')
        .in('id', staffIds)

      const staffDetailMap: Record<string, any> = {}
      ;(staffDetails || []).forEach((s: any) => { staffDetailMap[s.id] = s })

      // Load all vacation appointments for prevYear to compute used vacation days
      const TIMEZONE = 'Europe/Zurich'
      const { data: vacApts } = await supabase
        .from('appointments')
        .select('staff_id, start_time')
        .eq('tenant_id', tenantId)
        .eq('event_type_code', 'vacation')
        .neq('status', 'cancelled')
        .gte('start_time', `${prevYear}-01-01`)
        .lte('start_time', `${prevYear}-12-31`)
        .in('staff_id', staffIds)

      // Count distinct Mon–Fri vacation days per staff
      const vacDaysByStaff: Record<string, Set<string>> = {}
      ;(vacApts || []).forEach((apt: any) => {
        const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date(apt.start_time))
        const weekday = new Date(dateStr + 'T12:00:00').getDay()
        if (weekday < 1 || weekday > 5) return
        if (!vacDaysByStaff[apt.staff_id]) vacDaysByStaff[apt.staff_id] = new Set()
        vacDaysByStaff[apt.staff_id].add(dateStr)
      })

      const { data: decRecords } = await supabase
        .from('staff_monthly_hours')
        .select('staff_id, cumulative_overtime')
        .eq('tenant_id', tenantId)
        .eq('year', prevYear)
        .eq('month', 12)
        .in('staff_id', staffIds)

      // Max vacation carry-over: 5 days (CH convention)
      const VACATION_CARRY_OVER_MAX = 5

      for (const rec of decRecords || []) {
        const carryOver = parseFloat(rec.cumulative_overtime ?? 0)
        const staffInfo = staffDetailMap[rec.staff_id]
        const entitlementDays = staffInfo?.vacation_entitlement_days ?? 20
        const usedVacDays = vacDaysByStaff[rec.staff_id]?.size ?? 0
        const remainingVacDays = entitlementDays - usedVacDays
        // Cap carry-over at VACATION_CARRY_OVER_MAX (min 0)
        const vacCarryOver = Math.min(Math.max(0, remainingVacDays), VACATION_CARRY_OVER_MAX)

        const { error } = await supabase
          .from('staff_year_carry_over')
          .upsert(
            {
              staff_id: rec.staff_id,
              tenant_id: tenantId,
              year: prevYear + 1,
              carry_over_hours: Math.round(carryOver * 100) / 100,
              vacation_carry_over_days: vacCarryOver,
              vacation_carry_over_max: VACATION_CARRY_OVER_MAX,
              notes: `Auto-finalized on ${now.toISOString().split('T')[0]}`,
              updated_at: now.toISOString(),
            },
            { onConflict: 'tenant_id,staff_id,year', ignoreDuplicates: false }
          )
        if (error) {
          logger.error(`❌ Failed to write carry-over for staff ${rec.staff_id}:`, error.message)
        } else {
          carryOversWritten++
          logger.debug(`↪ Carry-over ${prevYear + 1}: ${carryOver}h overtime, ${vacCarryOver}d vacation for staff ${rec.staff_id}`)
        }
      }
    } catch (err: any) {
      logger.error(`❌ Error finalizing tenant ${tenantId}:`, err.message)
    }
  }

  logger.debug(`✅ Year-end finalize complete: ${totalUpdated} records updated, ${carryOversWritten} carry-overs written`)
  return {
    success: true,
    prevYear,
    tenantsProcessed: tenantIds.length,
    recordsUpdated: totalUpdated,
    carryOversWritten,
  }
})
