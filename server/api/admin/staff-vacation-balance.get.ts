/**
 * GET /api/admin/staff-vacation-balance
 * Lightweight endpoint: returns vacation balance + adjusted overtime balance for a staff member.
 * Accessible to admin AND staff (staff can only query their own balance).
 * Query params:
 *   staffId – the staff member's user ID (required for admins; staff get their own)
 *   year    – 4-digit year (default: current year)
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getYearlyWorkingDaysBreakdown } from '~/server/utils/swiss-holidays'
import { FULLTIME_HOURS_DEFAULT, HR_CATEGORY, KEY_FULLTIME } from '~/server/api/admin/hr-settings.get'
import { ferienDayCredit } from '~/server/utils/staff-hours-counting'

const TIMEZONE = 'Europe/Zurich'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
  // a raw Bearer-only check that would 401 whenever the client's access
  // token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // Resolve the calling user (already resolved by getAuthenticatedUser)
  const callerData = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id, role: authUser.role }
    : null

  if (!callerData?.tenant_id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const query = getQuery(event)
  const year = parseInt(query.year as string) || new Date().getFullYear()

  // Determine which staff to query
  let staffId: string
  if (callerData.role === 'admin') {
    staffId = (query.staffId as string) || callerData.id
  } else {
    // Staff can only see their own balance
    staffId = callerData.id
  }

  const tenantId = callerData.tenant_id

  // Load staff record
  const { data: staffUser } = await supabase
    .from('users')
    .select('id, salary_type, weekly_contracted_hours, vacation_entitlement_days, tenant_id')
    .eq('id', staffId)
    .eq('tenant_id', tenantId)
    .single()

  if (!staffUser) throw createError({ statusCode: 404, statusMessage: 'Staff not found' })

  const salaryType: string = staffUser.salary_type || 'hourly'
  const isMonthly = salaryType === 'monthly'
  const weeklyHours: number = staffUser.weekly_contracted_hours || 0
  const dailyHours = weeklyHours > 0 ? weeklyHours / 5 : 0
  const entitlementDays: number = staffUser.vacation_entitlement_days ?? 20
  const entitlementHours = entitlementDays * dailyHours

  // Count planned Ferien days (Mo–Fr) for entitlement — exclude Vaterschaft; support half days
  const { data: vacationApts } = await supabase
    .from('appointments')
    .select('start_time, title, event_type_code, duration_minutes')
    .eq('tenant_id', tenantId)
    .eq('staff_id', staffId)
    .eq('event_type_code', 'vacation')
    .neq('status', 'cancelled')
    .gte('start_time', `${year}-01-01`)
    .lte('start_time', `${year}-12-31`)

  const usedVacDayCredits = new Map<string, number>()
  ;(vacationApts || []).forEach((apt: any) => {
    const credit = ferienDayCredit(apt)
    if (credit <= 0) return
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date(apt.start_time))
    usedVacDayCredits.set(dateStr, Math.max(usedVacDayCredits.get(dateStr) || 0, credit))
  })
  const totalPlannedVacDays = Math.round([...usedVacDayCredits.values()].reduce((s, c) => s + c, 0) * 10) / 10
  const totalPlannedVacHours = totalPlannedVacDays * dailyHours
  const vacation_balance_hours = Math.round((entitlementHours - totalPlannedVacHours) * 100) / 100
  const vacation_balance_days = dailyHours > 0
    ? Math.round((vacation_balance_hours / dailyHours) * 10) / 10
    : null

  // Load monthly hours records for this year to compute current overtime balance
  const { data: records } = await supabase
    .from('staff_monthly_hours')
    .select('month, actual_hours, vacation_hours, sick_hours, admin_hours, target_hours')
    .eq('staff_id', staffId)
    .eq('tenant_id', tenantId)
    .eq('year', year)

  // Load carry-over
  const { data: carryOverRec } = await supabase
    .from('staff_year_carry_over')
    .select('carry_over_hours')
    .eq('staff_id', staffId)
    .eq('tenant_id', tenantId)
    .eq('year', year)
    .maybeSingle()
  const carryOver: number = carryOverRec ? parseFloat(carryOverRec.carry_over_hours) : 0

  // Load vacation appointments per month to correctly credit vacation_hours
  const vacDaysByMonth: Record<number, number> = {}
  usedVacDayCredits.forEach((credit, dateStr) => {
    const month = parseInt(dateStr.slice(5, 7))
    vacDaysByMonth[month] = (vacDaysByMonth[month] || 0) + credit
  })

  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1
  let running = carryOver
  ;(records || [])
    .filter((r: any) => !(year === curYear && r.month >= curMonth) && !(year > curYear))
    .sort((a: any, b: any) => a.month - b.month)
    .forEach((r: any) => {
      const plannedVacDays = vacDaysByMonth[r.month] ?? 0
      const plannedVacHours = plannedVacDays * dailyHours
      const stored_vacation = parseFloat(r.vacation_hours ?? 0) || 0
      const vacation_hours = Math.max(plannedVacHours, stored_vacation)
      const overtime = parseFloat(r.actual_hours) + vacation_hours
        + parseFloat(r.sick_hours ?? 0) + parseFloat(r.admin_hours ?? 0)
        - parseFloat(r.target_hours)
      running += overtime
    })

  const current_balance = Math.round(running * 100) / 100
  const vacation_overshoot = Math.min(0, vacation_balance_hours)
  const adjusted_balance = Math.round((current_balance + vacation_overshoot) * 100) / 100

  // Total capacity to absorb additional vacation:
  // remaining vacation entitlement PLUS any positive overtime (both can be used for vacation)
  const overtime_available = Math.max(0, adjusted_balance)
  const total_vacation_capacity_hours = Math.max(0, vacation_balance_hours) + overtime_available
  const total_vacation_capacity_days = dailyHours > 0
    ? Math.round((total_vacation_capacity_hours / dailyHours) * 10) / 10
    : null

  return {
    success: true,
    year,
    staff_id: staffId,
    salary_type: salaryType,
    is_monthly_salary: isMonthly,
    daily_hours: Math.round(dailyHours * 100) / 100,
    weekly_contracted_hours: weeklyHours,
    vacation_entitlement_days: entitlementDays,
    vacation_balance_hours,
    vacation_balance_days,
    current_balance,
    adjusted_balance,
    // For hourly staff: unlimited capacity (vacation only blocks the calendar)
    total_vacation_capacity_hours: isMonthly ? total_vacation_capacity_hours : Infinity,
    total_vacation_capacity_days: isMonthly ? total_vacation_capacity_days : null,
  }
})
