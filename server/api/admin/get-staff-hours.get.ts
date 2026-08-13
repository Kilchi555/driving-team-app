import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getMonthlyDailyHours } from '~/server/utils/swiss-holidays'
import { logger } from '~/utils/logger'
import { zurichYearMonth, shouldCountAppointment } from '~/server/utils/staff-hours-counting'

const TIMEZONE = 'Europe/Zurich'
const MONTH_KEYS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const PAGE_SIZE = 1000

/** Returns the 0-based month index of a UTC timestamp, interpreted in Europe/Zurich. */
function zurichMonthIndex(isoString: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { month: '2-digit', timeZone: TIMEZONE }).format(new Date(isoString))
  ) - 1
}

async function fetchAllRows(buildPage: (from: number, to: number) => Promise<{ data: any[] | null }>) {
  const all: any[] = []
  let from = 0
  const maxRows = PAGE_SIZE * 50
  while (from < maxRows) {
    const { data: page } = await buildPage(from, from + PAGE_SIZE - 1)
    if (!page || page.length === 0) break
    all.push(...page)
    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

/** Hourly staff: worked hours only. Monthly staff: worked + contracted vacation days. */
function addLiveMonthHours(
  hoursByMonth: Record<string, number>,
  staff: { salary_type?: string | null; weekly_contracted_hours?: number | null },
  apts: any[],
  includeMonth: (month1: number) => boolean
) {
  const isMonthly = staff.salary_type === 'monthly'
  const dailyHours = isMonthly ? getMonthlyDailyHours(staff.weekly_contracted_hours || 0) : 0
  const vacCredits: Record<number, Map<string, number>> = {}

  for (const apt of apts) {
    if (!apt.start_time || !shouldCountAppointment(apt)) continue
    const mIdx = zurichMonthIndex(apt.start_time)
    const month1 = mIdx + 1
    if (!includeMonth(month1)) continue
    const mKey = MONTH_KEYS[mIdx]
    if (!mKey) continue

    if (apt.event_type_code === 'vacation') {
      if (!isMonthly || !dailyHours) continue
      if (apt.status === 'cancelled') continue
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date(apt.start_time))
      const weekday = new Date(dateStr + 'T12:00:00').getDay()
      if (weekday < 1 || weekday > 5) continue
      const duration = apt.duration_minutes ?? 0
      const credit = duration > 0 && duration <= 420 ? 0.5 : 1
      if (!vacCredits[month1]) vacCredits[month1] = new Map()
      const prev = vacCredits[month1].get(dateStr) || 0
      vacCredits[month1].set(dateStr, Math.max(prev, credit))
      continue
    }

    hoursByMonth[mKey] += (apt.duration_minutes || 0) / 60
  }

  Object.entries(vacCredits).forEach(([monthStr, days]) => {
    const mKey = MONTH_KEYS[Number(monthStr) - 1]
    if (!mKey) return
    const credit = [...days.values()].reduce((s, c) => s + c, 0)
    hoursByMonth[mKey] += credit * dailyHours
  })

  MONTH_KEYS.forEach((key, i) => {
    if (includeMonth(i + 1)) {
      hoursByMonth[key] = Math.round(hoursByMonth[key] * 100) / 100
    }
  })
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const startDate = query.startDate as string
    const endDate = query.endDate as string

    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized - No valid session' })
    }

    const supabase = getSupabaseAdmin()

    // Resolve tenant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userData?.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'User has no tenant assigned' })
    }

    const tenantId = userData.tenant_id

    // Tenant business type
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to load tenant data' })
    }

    // ── 1. Driving-school licence categories (dynamic, only for driving_school) ──
    let availableCategories: { code: string; name: string }[] = []
    if (tenantData?.business_type === 'driving_school') {
      const { data: categories } = await supabase
        .from('categories')
        .select('code, name')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('code')
      availableCategories = categories || []
    }

    // ── 2. All active event types for this tenant (dynamic columns) ─────────────
    const { data: eventTypesData } = await supabase
      .from('event_types')
      .select('code, name, emoji')
      .eq('is_active', true)
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true })

    const availableEventTypes: { code: string; name: string; emoji: string }[] = eventTypesData || []

    // ── 3. All staff for this tenant ─────────────────────────────────────────────
    const { data: staffData, error: staffError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, salary_type, weekly_contracted_hours, employment_percentage, fulltime_weekly_hours_override')
      .eq('role', 'staff')
      .eq('tenant_id', tenantId)

    if (staffError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to load staff data' })
    }

    const staffIds = (staffData || []).map((s: any) => s.id)

    // ── 4. Load ALL appointments (incl. cancelled + payments) ──────────────────
    let allApts: any[] = []

    if (staffIds.length > 0) {
      allApts = await fetchAllRows((from, to) =>
        supabase
          .from('appointments')
          .select('id, staff_id, start_time, duration_minutes, event_type_code, type, status, payments(payment_status)')
          .in('staff_id', staffIds)
          .eq('tenant_id', tenantId)
          .gte('start_time', startDate)
          .lt('start_time', endDate)
          .neq('status', 'deleted')
          .order('start_time', { ascending: true })
          .range(from, to)
      )
      logger.debug(`📊 Loaded ${allApts.length} appointments`)
    }

    const aptsByStaff: Record<string, any[]> = {}
    staffIds.forEach((id: string) => { aptsByStaff[id] = [] })
    allApts.forEach((a: any) => { aptsByStaff[a.staff_id]?.push(a) })

    // ── 5. Aggregate per-staff statistics ────────────────────────────────────────
    const staffWithHours = (staffData || []).map((staff: any) => {
      const apts = aptsByStaff[staff.id] || []
      const isMonthly = staff.salary_type === 'monthly'
      const cancelled = apts.filter((a: any) => a.status === 'cancelled')
      const freeCancels = cancelled.filter((a: any) => !shouldCountAppointment(a))
      const worked = apts.filter((a: any) =>
        shouldCountAppointment(a) && a.event_type_code !== 'vacation'
      )

      const totalHours = worked.reduce((s: number, a: any) => s + (a.duration_minutes || 0), 0) / 60

      // Licence-category stats (driving_school only)
      const categoryStats: Record<string, { count: number; hours: number }> = {}
      availableCategories.forEach((cat) => { categoryStats[cat.code] = { count: 0, hours: 0 } })

      // Event-type stats — dynamic, all known types initialised to 0
      const eventTypeStats: Record<string, number> = {}
      availableEventTypes.forEach((et) => { eventTypeStats[et.code] = 0 })

      let vacationHours = 0

      apts.forEach((a: any) => {
        const hours = (a.duration_minutes || 0) / 60
        const etCode = a.event_type_code || ''
        const catCode = a.type || ''

        if (etCode === 'vacation') {
          if (isMonthly && a.status !== 'cancelled') vacationHours += hours
          return
        }

        if (!shouldCountAppointment(a)) return

        if (categoryStats[catCode]) {
          categoryStats[catCode].count++
          categoryStats[catCode].hours += hours
        }

        if (etCode in eventTypeStats) {
          eventTypeStats[etCode] += hours
        } else if (etCode) {
          eventTypeStats[etCode] = (eventTypeStats[etCode] || 0) + hours
        }
      })

      // Round all event-type values
      Object.keys(eventTypeStats).forEach((k) => {
        eventTypeStats[k] = Math.round(eventTypeStats[k] * 100) / 100
      })

      const cancelledHours = freeCancels.reduce((s: number, a: any) => s + (a.duration_minutes || 0), 0) / 60
      const lastApt = apts.length > 0
        ? apts.slice().sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]
        : null

      return {
        ...staff,
        appointment_count: worked.length,
        total_hours: Math.round(totalHours * 100) / 100,
        vacation_hours: Math.round(vacationHours * 100) / 100,
        average_hours: worked.length > 0 ? totalHours / worked.length : 0,
        last_appointment: lastApt?.start_time || null,
        cancelled_count: freeCancels.length,
        cancelled_hours: Math.round(cancelledHours * 100) / 100,
        category_stats: categoryStats,
        event_type_stats: eventTypeStats,
      }
    })

    // ── 6. Monthly breakdown — read from staff_monthly_hours table ───────────────
    // Extract the year from startDate for the table lookup
    const year = new Date(startDate).getFullYear()

    const { data: monthlyRecords } = await supabase
      .from('staff_monthly_hours')
      .select('staff_id, month, actual_hours, vacation_hours')
      .in('staff_id', staffIds)
      .eq('tenant_id', tenantId)
      .eq('year', year)

    // Build lookup: staffId → monthKey → hours (actual + vacation = total)
    const staffMonthlyHours: Record<string, Record<string, number>> = {}

    staffWithHours.forEach((staff: any) => {
      const monthlyHours: Record<string, number> = {}
      MONTH_KEYS.forEach((m) => { monthlyHours[m] = 0 })
      staffMonthlyHours[staff.id] = monthlyHours
    })

    if ((monthlyRecords || []).length > 0) {
      // Completed months from pre-computed table.
      // Hourly: actual only. Monthly: actual + contracted vacation hours.
      const staffById: Record<string, any> = {}
      staffWithHours.forEach((s: any) => { staffById[s.id] = s })

      ;(monthlyRecords || []).forEach((r: any) => {
        const mKey = MONTH_KEYS[r.month - 1]
        if (!mKey || !staffMonthlyHours[r.staff_id]) return
        const actual = parseFloat(r.actual_hours) || 0
        const vacation = staffById[r.staff_id]?.salary_type === 'monthly'
          ? (parseFloat(r.vacation_hours) || 0)
          : 0
        staffMonthlyHours[r.staff_id][mKey] = Math.round((actual + vacation) * 100) / 100
      })

      const nowZ = zurichYearMonth()
      const isOpenMonth = (month1: number) =>
        year > nowZ.year || (year === nowZ.year && month1 >= nowZ.month)

      staffWithHours.forEach((staff: any) => {
        MONTH_KEYS.forEach((key, i) => {
          if (isOpenMonth(i + 1)) staffMonthlyHours[staff.id][key] = 0
        })
        addLiveMonthHours(
          staffMonthlyHours[staff.id],
          staff,
          aptsByStaff[staff.id] || [],
          isOpenMonth
        )
      })
    } else {
      // Fallback: aggregate live from appointments (used until first recalculate)
      logger.debug('⚠️ No staff_monthly_hours records found, falling back to live aggregation')
      staffWithHours.forEach((staff: any) => {
        addLiveMonthHours(
          staffMonthlyHours[staff.id],
          staff,
          aptsByStaff[staff.id] || [],
          () => true
        )
      })
    }

    // Expose whether data came from the pre-computed table (so frontend can show a "refresh" hint)
    const monthlyHoursFromCache = (monthlyRecords || []).length > 0

    // ── 7. Summary ───────────────────────────────────────────────────────────────
    const activeStaff = staffWithHours.filter((s: any) => s.appointment_count > 0).length
    const totalHours = staffWithHours.reduce((s: number, st: any) => s + st.total_hours, 0)
    const totalAppointments = staffWithHours.reduce((s: number, st: any) => s + st.appointment_count, 0)

    logger.debug('✅ Staff hours loaded:', staffWithHours.length, 'staff members')

    return {
      success: true,
      staffWithHours,
      staffMonthlyHours,
      monthlyHoursFromCache,
      availableCategories,
      availableEventTypes,
      summary: {
        activeStaff,
        totalHours,
        averageHours: activeStaff > 0 ? totalHours / activeStaff : 0,
        totalAppointments,
      },
    }
  } catch (error: any) {
    logger.error('❌ Error in get-staff-hours API:', error.message)
    throw error
  }
})
