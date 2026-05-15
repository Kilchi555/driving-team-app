/**
 * GET /api/staff/monthly-hours
 * Returns the staff member's own monthly hours records.
 * Query params:
 *   year – 4-digit year (default: current year)
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getYearlyWorkingDaysBreakdown } from '~/server/utils/swiss-holidays'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()
    const authHeader = event.node.req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const query = getQuery(event)
    const year = parseInt(query.year as string) || new Date().getFullYear()

    // Get staff user record
    const { data: staffUser, error: staffError } = await supabase
      .from('users')
      .select('id, tenant_id, salary_type, weekly_contracted_hours, vacation_entitlement_days')
      .eq('auth_user_id', user.id)
      .single()

    if (staffError || !staffUser) throw createError({ statusCode: 404, statusMessage: 'User not found' })

    const { id: staffId, tenant_id: tenantId, salary_type, weekly_contracted_hours, vacation_entitlement_days } = staffUser

    // Load monthly hours records for this year
    const { data: records, error: recordsError } = await supabase
      .from('staff_monthly_hours')
      .select('*')
      .eq('staff_id', staffId)
      .eq('tenant_id', tenantId)
      .eq('year', year)
      .order('month', { ascending: true })

    if (recordsError) throw createError({ statusCode: 500, statusMessage: 'Failed to load records' })

    // Load ALL vacation appointments for this year (past + future) to show planned vacation
    const vacationRangeStart = `${year}-01-01`
    const vacationRangeEnd = `${year}-12-31`
    const { data: vacationApts } = await supabase
      .from('appointments')
      .select('start_time')
      .eq('staff_id', staffId)
      .eq('tenant_id', tenantId)
      .eq('event_type_code', 'vacation')
      .neq('status', 'cancelled')
      .gte('start_time', vacationRangeStart)
      .lte('start_time', vacationRangeEnd)

    // Count distinct Mon–Fri vacation days per month (including future)
    const TIMEZONE = 'Europe/Zurich'
    const vacationDaysByMonth: Record<number, Set<string>> = {}
    ;(vacationApts || []).forEach((apt: any) => {
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date(apt.start_time))
      const weekday = new Date(dateStr + 'T12:00:00').getDay()
      if (weekday < 1 || weekday > 5) return // only Mon–Fri
      const month = parseInt(dateStr.slice(5, 7))
      if (!vacationDaysByMonth[month]) vacationDaysByMonth[month] = new Set()
      vacationDaysByMonth[month].add(dateStr)
    })

    // Load carry-over for this year
    const { data: carryOverRec } = await supabase
      .from('staff_year_carry_over')
      .select('carry_over_hours, vacation_carry_over_days')
      .eq('staff_id', staffId)
      .eq('tenant_id', tenantId)
      .eq('year', year)
      .maybeSingle()
    const carryOver = carryOverRec ? parseFloat(carryOverRec.carry_over_hours) : 0
    const vacationCarryOverDays: number = carryOverRec?.vacation_carry_over_days
      ? parseFloat(carryOverRec.vacation_carry_over_days)
      : 0

    const weeklyHours = weekly_contracted_hours || 0
    const dailyHours = weeklyHours > 0 ? weeklyHours / 5 : 0
    const yearBreakdown = getYearlyWorkingDaysBreakdown(year, weeklyHours)
    const recordsMap: Record<number, any> = {}
    ;(records || []).forEach((r: any) => { recordsMap[r.month] = r })

    const months = yearBreakdown.map(({ month, workingDays }) => {
      const record = recordsMap[month]
      // Planned vacation from appointments (includes future months)
      const plannedVacDays = vacationDaysByMonth[month]?.size ?? 0
      const plannedVacHours = Math.round(plannedVacDays * dailyHours * 100) / 100

      // Months without a record represent "not employed" – show "–" for hours,
      // but show planned vacation if any exists.
      if (!record) {
        return {
          month,
          working_days: workingDays,
          target_hours: null as number | null,
          actual_hours: null as number | null,
          vacation_hours: plannedVacHours > 0 ? plannedVacHours : null as number | null,
          sick_hours: null as number | null,
          admin_hours: null as number | null,
          overtime_hours: null as number | null,
          _overtime_for_running: 0,
          has_record: false,
        }
      }
      const actual_hours = parseFloat(record.actual_hours)
      // Always prefer appointments-based count (always current, reflects deletions immediately).
      // Fall back to stored value only if no appointment data exists (legacy data).
      const stored_vacation = parseFloat(record.vacation_hours)
      const vacation_hours = plannedVacDays > 0 ? plannedVacHours : stored_vacation
      const sick_hours = parseFloat(record.sick_hours ?? 0)
      const admin_hours = parseFloat(record.admin_hours ?? 0)
      const target_hours = parseFloat(record.target_hours)
      const overtime_hours = actual_hours + vacation_hours + sick_hours + admin_hours - target_hours
      return {
        month,
        working_days: workingDays,
        target_hours,
        actual_hours,
        vacation_hours,
        sick_hours,
        admin_hours,
        overtime_hours,
        _overtime_for_running: overtime_hours,
        has_record: true,
      }
    })

    // Compute cumulative saldo on the fly (only for past/current months with a record)
    const nowStaff = new Date()
    const curYearStaff = nowStaff.getFullYear()
    const curMonthStaff = nowStaff.getMonth() + 1
    let running = carryOver // start from carry-over (Jahresvortrag)
    const monthsWithCumulative = months.map((m) => {
      const isFuture = year > curYearStaff || (year === curYearStaff && m.month >= curMonthStaff)
      if (m.has_record && !isFuture) {
        running += m._overtime_for_running
        const cumulative_overtime = Math.round(running * 100) / 100
        const { _overtime_for_running, has_record, ...rest } = m
        return { ...rest, cumulative_overtime }
      }
      const { _overtime_for_running, has_record, ...rest } = m
      return { ...rest, cumulative_overtime: null }
    })

    // Latest cumulative saldo
    const current_balance = running

    // Ferien-Saldo: Jahresguthaben (inkl. Vortrag Vorjahr) minus alle geplanten Ferientage
    const entitlementDays = (vacation_entitlement_days ?? 20) + vacationCarryOverDays
    const entitlementHours = entitlementDays * dailyHours
    const totalPlannedVacDays = Object.values(vacationDaysByMonth).reduce((s, set) => s + set.size, 0)
    const totalPlannedVacHours = totalPlannedVacDays * dailyHours
    const vacation_balance_hours = Math.round((entitlementHours - totalPlannedVacHours) * 100) / 100
    const vacation_balance_days = dailyHours > 0
      ? Math.round((vacation_balance_hours / dailyHours) * 10) / 10
      : null

    // Bereinigter Saldo: Ferien-Überschuss wird vom Überstunden-Konto abgezogen.
    // Wer mehr Ferien nimmt als berechtigt, zieht das aus der Überzeit.
    const vacation_overshoot = Math.min(0, vacation_balance_hours) // 0 oder negativ
    const adjusted_balance = Math.round((current_balance + vacation_overshoot) * 100) / 100

    return {
      success: true,
      salary_type,
      weekly_contracted_hours: weeklyHours,
      vacation_entitlement_days: entitlementDays, // includes carry-over
      vacation_carry_over_days: vacationCarryOverDays,
      vacation_balance_hours,
      vacation_balance_days,
      carry_over_hours: carryOver,
      year,
      months: monthsWithCumulative,
      current_balance: Math.round(current_balance * 100) / 100,
      adjusted_balance,
    }
  } catch (error: any) {
    logger.error('❌ Error in staff/monthly-hours GET:', error.message)
    throw error
  }
})
