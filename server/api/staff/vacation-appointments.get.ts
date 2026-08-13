/**
 * GET /api/staff/vacation-appointments
 * Returns vacation appointments for the current staff member.
 * Query params:
 *   year – 4-digit year (default: current year)
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getMonthlyDailyHours } from '~/server/utils/swiss-holidays'
import { ferienDayCredit } from '~/server/utils/staff-hours-counting'

const TIMEZONE = 'Europe/Zurich'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()
  // Uses the shared cookie + refresh-token fallback (not just a bare Bearer
  // header check) so a merely-expired-but-recoverable access token doesn't
  // 401 here while other endpoints on the same page recover fine.
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { data: staffUser } = await supabase
    .from('users')
    .select('id, tenant_id, salary_type, weekly_contracted_hours, vacation_entitlement_days')
    .eq('auth_user_id', user.id)
    .single()

  if (!staffUser) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const query = getQuery(event)
  const year = parseInt(query.year as string) || new Date().getFullYear()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, start_time, end_time, status, title, event_type_code, duration_minutes')
    .eq('staff_id', staffUser.id)
    .eq('tenant_id', staffUser.tenant_id)
    .eq('event_type_code', 'vacation')
    .neq('status', 'cancelled')
    .gte('start_time', `${year}-01-01`)
    .lte('start_time', `${year}-12-31`)
    .order('start_time', { ascending: true })

  // Sum Ferien day credits (full=1, half=0.5; Mo–Fr only; not Vaterschaft)
  const vacDayCredits = new Map<string, number>()
  ;(appointments || []).forEach((apt: any) => {
    const credit = ferienDayCredit(apt)
    if (credit <= 0) return
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date(apt.start_time))
    vacDayCredits.set(dateStr, Math.max(vacDayCredits.get(dateStr) || 0, credit))
  })

  const weeklyHours: number = staffUser.weekly_contracted_hours || 0
  const dailyHours = staffUser.salary_type === 'monthly'
    ? getMonthlyDailyHours(weeklyHours)
    : (weeklyHours > 0 ? weeklyHours / 5 : 0)
  const entitlementDays: number = Number(staffUser.vacation_entitlement_days ?? 20)
  const usedDays = Math.round([...vacDayCredits.values()].reduce((s, c) => s + c, 0) * 10) / 10
  const remainingDays = Math.round((entitlementDays - usedDays) * 10) / 10

  // Group consecutive days into periods for display
  const sortedDates = Array.from(vacDayCredits.keys()).sort()
  const periods: { from: string; to: string; days: number }[] = []
  let periodStart = ''
  let periodEnd = ''
  let prevDate = ''

  const pushPeriod = () => {
    if (periodStart) {
      let days = 0
      let cur = periodStart
      while (cur <= periodEnd) {
        days += vacDayCredits.get(cur) || 0
        const d = new Date(cur + 'T12:00:00')
        d.setDate(d.getDate() + 1)
        cur = d.toISOString().slice(0, 10)
      }
      periods.push({ from: periodStart, to: periodEnd, days: Math.round(days * 10) / 10 })
    }
  }

  for (const dateStr of sortedDates) {
    if (!periodStart) {
      periodStart = dateStr
      periodEnd = dateStr
    } else {
      // Check if this date is the next working day after prevDate
      const prev = new Date(prevDate + 'T12:00:00')
      prev.setDate(prev.getDate() + 1)
      let next = prev.toISOString().slice(0, 10)
      // Skip weekends
      while (new Date(next + 'T12:00:00').getDay() === 0 || new Date(next + 'T12:00:00').getDay() === 6) {
        const d = new Date(next + 'T12:00:00')
        d.setDate(d.getDate() + 1)
        next = d.toISOString().slice(0, 10)
      }
      if (dateStr === next) {
        periodEnd = dateStr
      } else {
        pushPeriod()
        periodStart = dateStr
        periodEnd = dateStr
      }
    }
    prevDate = dateStr
  }
  pushPeriod()

  return {
    success: true,
    year,
    salary_type: staffUser.salary_type,
    is_monthly_salary: staffUser.salary_type === 'monthly',
    vacation_entitlement_days: entitlementDays,
    used_vacation_days: usedDays,
    remaining_vacation_days: remainingDays,
    daily_hours: Math.round(dailyHours * 100) / 100,
    periods,
  }
})
