/**
 * GET /api/admin/staff-monthly-hours
 * Returns monthly hours records for all monthly-salary staff of the current tenant.
 * Query params:
 *   year   – 4-digit year (required)
 *   staffId – filter to a single staff member (optional)
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getMonthlyTargetHours, getYearlyWorkingDaysBreakdown } from '~/server/utils/swiss-holidays'
import { FULLTIME_HOURS_DEFAULT, HR_CATEGORY, KEY_FULLTIME } from '~/server/api/admin/hr-settings.get'
import { logger } from '~/utils/logger'

async function getAuthenticatedUser(event: any) {
  try {
    const supabase = getSupabaseAdmin()
    const authHeader = event.node.req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const supabase = getSupabaseAdmin()
    const query = getQuery(event)
    const year = parseInt(query.year as string) || new Date().getFullYear()
    const staffIdFilter = query.staffId as string | undefined

    // Resolve tenant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id, role, admin_level')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userData?.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'User has no tenant assigned' })
    }

    if (!['admin', 'staff'].includes(userData.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const tenantId = userData.tenant_id

    // Load tenant's fulltime reference hours (for deriving pensum % per month)
    const { data: hrSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', HR_CATEGORY)
      .eq('setting_key', KEY_FULLTIME)
      .maybeSingle()
    const fulltimeWeeklyHours: number = hrSetting?.setting_value
      ? parseFloat(hrSetting.setting_value)
      : FULLTIME_HOURS_DEFAULT

    // Load all monthly-salary staff for this tenant
    let staffQuery = supabase
      .from('users')
      .select('id, first_name, last_name, email, salary_type, weekly_contracted_hours, vacation_entitlement_days')
      .eq('role', 'staff')
      .eq('tenant_id', tenantId)
      .eq('salary_type', 'monthly')

    if (staffIdFilter) staffQuery = staffQuery.eq('id', staffIdFilter)

    const { data: staffList, error: staffError } = await staffQuery
    if (staffError) throw createError({ statusCode: 500, statusMessage: 'Failed to load staff' })

    // Load existing monthly-hours records for this year
    const { data: monthlyRecords, error: recordsError } = await supabase
      .from('staff_monthly_hours')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('year', year)
      .in('staff_id', (staffList || []).map((s: any) => s.id))

    if (recordsError) throw createError({ statusCode: 500, statusMessage: 'Failed to load monthly hours' })

    // Load ALL vacation appointments for this year (past + future) for all staff
    const TIMEZONE = 'Europe/Zurich'
    const { data: allVacationApts } = await supabase
      .from('appointments')
      .select('staff_id, start_time')
      .eq('tenant_id', tenantId)
      .eq('event_type_code', 'vacation')
      .neq('status', 'cancelled')
      .gte('start_time', `${year}-01-01`)
      .lte('start_time', `${year}-12-31`)
      .in('staff_id', (staffList || []).map((s: any) => s.id))

    // Build: staffId -> month -> Set<dateStr> (only Mon–Fri)
    const vacDaysByStaffMonth: Record<string, Record<number, Set<string>>> = {}
    ;(allVacationApts || []).forEach((apt: any) => {
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date(apt.start_time))
      const weekday = new Date(dateStr + 'T12:00:00').getDay()
      if (weekday < 1 || weekday > 5) return
      const month = parseInt(dateStr.slice(5, 7))
      if (!vacDaysByStaffMonth[apt.staff_id]) vacDaysByStaffMonth[apt.staff_id] = {}
      if (!vacDaysByStaffMonth[apt.staff_id][month]) vacDaysByStaffMonth[apt.staff_id][month] = new Set()
      vacDaysByStaffMonth[apt.staff_id][month].add(dateStr)
    })

    // Load year carry-over for all staff at once
    const { data: carryOverRecords } = await supabase
      .from('staff_year_carry_over')
      .select('staff_id, carry_over_hours, vacation_carry_over_days')
      .eq('tenant_id', tenantId)
      .eq('year', year)
      .in('staff_id', (staffList || []).map((s: any) => s.id))

    const carryOverMap: Record<string, number> = {}
    const vacCarryOverMap: Record<string, number> = {}
    ;(carryOverRecords || []).forEach((r: any) => {
      carryOverMap[r.staff_id] = parseFloat(r.carry_over_hours)
      vacCarryOverMap[r.staff_id] = r.vacation_carry_over_days ? parseFloat(r.vacation_carry_over_days) : 0
    })

    // Build a lookup: staffId -> month -> record
    const recordsMap: Record<string, Record<number, any>> = {}
    ;(monthlyRecords || []).forEach((r: any) => {
      if (!recordsMap[r.staff_id]) recordsMap[r.staff_id] = {}
      recordsMap[r.staff_id][r.month] = r
    })

    // Assemble response: per staff, per month, with target hours auto-calculated if no record exists
    const result = (staffList || []).map((staff: any) => {
      const weeklyHours = staff.weekly_contracted_hours || 0
      const dailyHours = weeklyHours > 0 ? weeklyHours / 5 : 0
      const yearBreakdown = getYearlyWorkingDaysBreakdown(year, weeklyHours)
      const carryOver = carryOverMap[staff.id] ?? 0
      const vacCarryOver = vacCarryOverMap[staff.id] ?? 0
      const staffVacByMonth = vacDaysByStaffMonth[staff.id] ?? {}

      // Build months array first without cumulative, then compute running total
      const monthsRaw = yearBreakdown.map(({ month, workingDays }) => {
        const record = recordsMap[staff.id]?.[month]
        // Planned vacation from appointments (includes future months)
        const plannedVacDays = staffVacByMonth[month]?.size ?? 0
        const plannedVacHours = Math.round(plannedVacDays * dailyHours * 100) / 100

        // Months without a record: show "–" for hours but show planned vacation if any
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
            pensum_pct: null as number | null,
            _overtime_for_cumulative: 0,
            cumulative_overtime: null as number | null,
            record_id: null,
            is_current_or_past: month <= new Date().getMonth() + 1 || year < new Date().getFullYear(),
            has_record: false,
          }
        }
        const actual_hours = parseFloat(record.actual_hours)
        const stored_vacation = parseFloat(record.vacation_hours ?? 0) || 0
        const vacation_hours = Math.max(plannedVacHours, stored_vacation)
        const sick_hours = parseFloat(record.sick_hours ?? 0) || 0
        const admin_hours = parseFloat(record.admin_hours ?? 0) || 0
        const target_hours = parseFloat(record.target_hours)
        const overtime_hours = actual_hours + vacation_hours + sick_hours + admin_hours - target_hours
        const fulltime_target = getMonthlyTargetHours(year, month, fulltimeWeeklyHours)
        const pensum_pct = fulltime_target > 0
          ? Math.round((target_hours / fulltime_target) * 100 * 10) / 10
          : null
        return {
          month,
          working_days: workingDays,
          target_hours,
          actual_hours,
          vacation_hours,
          sick_hours,
          admin_hours,
          overtime_hours,
          pensum_pct,
          _overtime_for_cumulative: overtime_hours,
          cumulative_overtime: null as number | null,
          record_id: record.id || null,
          is_current_or_past: month <= new Date().getMonth() + 1 || year < new Date().getFullYear(),
          has_record: true,
        }
      })

      // Compute cumulative overtime as running sum (only for past/current months with a DB record)
      const nowGet = new Date()
      const curYear = nowGet.getFullYear()
      const curMonth = nowGet.getMonth() + 1
      let running = carryOver // start from carry-over
      const months = monthsRaw.map((m) => {
        const isFuture = year > curYear || (year === curYear && m.month >= curMonth)
        if (m.has_record && !isFuture) {
          running += m._overtime_for_cumulative
          return { ...m, cumulative_overtime: Math.round(running * 100) / 100 }
        }
        return { ...m, cumulative_overtime: isFuture ? null : null }
      }).map(({ _overtime_for_cumulative, has_record, ...rest }) => rest)

      // year_total only covers completed months (those with a DB record = past months)
      const completedMonths = months.filter(m => m.cumulative_overtime !== null)

      // Ferien-Saldo: Jahresguthaben (inkl. Vortrag Vorjahr) minus alle geplanten Ferientage
      const entitlementDays = (staff.vacation_entitlement_days ?? 20) + vacCarryOver
      const entitlementHours = entitlementDays * dailyHours
      const totalPlannedVacDays = Object.values(staffVacByMonth).reduce((s: number, set: any) => s + set.size, 0)
      const totalPlannedVacHours = totalPlannedVacDays * dailyHours
      const vacation_balance_hours = Math.round((entitlementHours - totalPlannedVacHours) * 100) / 100
      const vacation_balance_days = dailyHours > 0
        ? Math.round((vacation_balance_hours / dailyHours) * 10) / 10
        : null

      // Bereinigter Saldo: Ferien-Überschuss wird vom Überstunden-Konto abgezogen.
      const current_balance = completedMonths.length > 0
        ? completedMonths[completedMonths.length - 1].cumulative_overtime
        : carryOver
      const vacation_overshoot = Math.min(0, vacation_balance_hours)
      const adjusted_balance = current_balance !== null
        ? Math.round((current_balance + vacation_overshoot) * 100) / 100
        : null

      return {
        staff_id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        weekly_contracted_hours: weeklyHours,
        vacation_entitlement_days: entitlementDays, // includes carry-over
        vacation_carry_over_days: vacCarryOver,
        vacation_balance_hours,
        vacation_balance_days,
        carry_over_hours: carryOver,
        adjusted_balance,
        months,
        year_total: {
          target_hours: completedMonths.reduce((s, m) => s + (m.target_hours ?? 0), 0),
          actual_hours: completedMonths.reduce((s, m) => s + (m.actual_hours ?? 0), 0),
          vacation_hours: completedMonths.reduce((s, m) => s + (m.vacation_hours ?? 0), 0),
          sick_hours: completedMonths.reduce((s, m) => s + (m.sick_hours ?? 0), 0),
          admin_hours: completedMonths.reduce((s, m) => s + (m.admin_hours ?? 0), 0),
        },
      }
    })

    return { success: true, year, staff: result }
  } catch (error: any) {
    logger.error('❌ Error in staff-monthly-hours GET:', error.message)
    throw error
  }
})
