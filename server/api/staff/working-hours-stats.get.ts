/**
 * GET /api/staff/working-hours-stats
 *
 * Live Terminstunden for the staff settings cards.
 * Uses the same counting rules as staff_monthly_hours (Europe/Zurich,
 * vacation excluded from worked but reported separately,
 * cancelled counted only with non-void payment,
 * duration default 0, round to 0.01h).
 *
 * Current month is included as live worked/planned — that is intentional for
 * the cards only; the Soll/Ist detail view still omits incomplete months.
 */
import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getMonthlyTargetHours } from '~/server/utils/swiss-holidays'
import { logger } from '~/utils/logger'
import {
  STAFF_HOURS_TIMEZONE,
  addMonths,
  appointmentHours,
  isVacationAppointment,
  monthStartDate,
  roundHours,
  shouldCountAppointment,
  zurichMonth,
  zurichYear,
  zurichYearMonth,
} from '~/server/utils/staff-hours-counting'

type MonthCancellations = {
  total: number
  charged: number
  chargedHours: number
}

type MonthBucket = {
  year: number
  month: number
  worked: number
  planned: number
  vacationDays: Set<string>
  cancellations: MonthCancellations
}

function emptyCancellations(): MonthCancellations {
  return { total: 0, charged: 0, chargedHours: 0 }
}

function emptyBucket(year: number, month: number): MonthBucket {
  return {
    year,
    month,
    worked: 0,
    planned: 0,
    vacationDays: new Set(),
    cancellations: emptyCancellations(),
  }
}

function monthKey(year: number, month: number): string {
  return `${year}-${month}`
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()
    const user = await getAuthenticatedUser(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const { data: staffUser, error: staffError } = await supabase
      .from('users')
      .select('id, tenant_id, weekly_contracted_hours, salary_type')
      .eq('auth_user_id', user.id)
      .single()

    if (staffError || !staffUser) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    const { id: staffId, tenant_id: tenantId } = staffUser
    const weeklyHours = staffUser.weekly_contracted_hours || 0
    const dailyHours = weeklyHours > 0 ? weeklyHours / 5 : 0
    // Monatssoll (Zielstunden) macht nur für Monatslohn-Mitarbeitende Sinn –
    // bei Stundenlohn gibt es kein Soll/Ist-Konto.
    const isMonthlySalary = staffUser.salary_type === 'monthly' && weeklyHours > 0
    const now = new Date()
    const { year: currentYear, month: currentMonth } = zurichYearMonth(now)

    const threeMonthsAgo = addMonths(currentYear, currentMonth, -3)
    const twoMonthsAgo = addMonths(currentYear, currentMonth, -2)
    const previousMonth = addMonths(currentYear, currentMonth, -1)
    const nextMonth = addMonths(currentYear, currentMonth, 1)
    // Exclusive end = first day of month after next
    const rangeEndExclusive = addMonths(currentYear, currentMonth, 2)

    const buckets: Record<string, MonthBucket> = {
      [monthKey(threeMonthsAgo.year, threeMonthsAgo.month)]: emptyBucket(threeMonthsAgo.year, threeMonthsAgo.month),
      [monthKey(twoMonthsAgo.year, twoMonthsAgo.month)]: emptyBucket(twoMonthsAgo.year, twoMonthsAgo.month),
      [monthKey(previousMonth.year, previousMonth.month)]: emptyBucket(previousMonth.year, previousMonth.month),
      [monthKey(currentYear, currentMonth)]: emptyBucket(currentYear, currentMonth),
      [monthKey(nextMonth.year, nextMonth.month)]: emptyBucket(nextMonth.year, nextMonth.month),
    }

    const rangeStart = monthStartDate(threeMonthsAgo.year, threeMonthsAgo.month)
    const rangeEnd = monthStartDate(rangeEndExclusive.year, rangeEndExclusive.month)

    const allApts: Array<{
      start_time: string
      duration_minutes: number | null
      event_type_code: string | null
      status: string
      payments: Array<{ payment_status: string }> | null
    }> = []

    const PAGE_SIZE = 1000
    let from = 0
    while (true) {
      const { data: page, error: pageErr } = await supabase
        .from('appointments')
        .select('start_time, duration_minutes, event_type_code, status, payments(payment_status)')
        .eq('staff_id', staffId)
        .eq('tenant_id', tenantId)
        .gte('start_time', rangeStart)
        .lt('start_time', rangeEnd)
        .order('start_time', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (pageErr) {
        logger.error('❌ working-hours-stats: appointment fetch failed:', pageErr.message)
        throw createError({ statusCode: 500, statusMessage: 'Failed to load appointments' })
      }
      if (!page || page.length === 0) break
      allApts.push(...page)
      if (page.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    for (const apt of allApts) {
      if (!apt.start_time) continue

      const y = zurichYear(apt.start_time)
      const m = zurichMonth(apt.start_time)
      const key = monthKey(y, m)
      const bucket = buckets[key]
      if (!bucket) continue

      // Vacation: count Mon–Fri days (same as payroll calculator); never in worked.
      if (isVacationAppointment(apt)) {
        if (apt.status === 'cancelled') continue
        const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: STAFF_HOURS_TIMEZONE }).format(
          new Date(apt.start_time)
        )
        const weekday = new Date(dateStr + 'T12:00:00').getDay()
        if (weekday >= 1 && weekday <= 5) bucket.vacationDays.add(dateStr)
        continue
      }

      const isPast = new Date(apt.start_time) < now
      const hours = appointmentHours(apt)

      if (apt.status === 'cancelled') {
        if (!isPast) continue
        bucket.cancellations.total += 1
        if (shouldCountAppointment(apt)) {
          bucket.cancellations.charged += 1
          bucket.cancellations.chargedHours += hours
          bucket.worked += hours
        }
        continue
      }

      if (isPast) bucket.worked += hours
      else bucket.planned += hours
    }

    const finalize = (b: MonthBucket) => {
      const vacationDays = b.vacationDays.size
      const vacationHours = roundHours(vacationDays * dailyHours)
      return {
        worked: roundHours(b.worked),
        planned: roundHours(b.planned),
        targetHours: isMonthlySalary ? roundHours(getMonthlyTargetHours(b.year, b.month, weeklyHours)) : 0,
        vacationDays,
        vacationHours,
        cancellations: {
          total: b.cancellations.total,
          charged: b.cancellations.charged,
          chargedHours: roundHours(b.cancellations.chargedHours),
        },
      }
    }

    const current = buckets[monthKey(currentYear, currentMonth)]
    const next = buckets[monthKey(nextMonth.year, nextMonth.month)]
    const prev = buckets[monthKey(previousMonth.year, previousMonth.month)]
    const twoAgo = buckets[monthKey(twoMonthsAgo.year, twoMonthsAgo.month)]
    const threeAgo = buckets[monthKey(threeMonthsAgo.year, threeMonthsAgo.month)]

    return {
      currentMonth: finalize(current),
      nextMonth: {
        planned: roundHours(next.planned),
        targetHours: isMonthlySalary ? roundHours(getMonthlyTargetHours(next.year, next.month, weeklyHours)) : 0,
        vacationDays: next.vacationDays.size,
        vacationHours: roundHours(next.vacationDays.size * dailyHours),
      },
      previousMonth: finalize(prev),
      twoMonthsAgo: finalize(twoAgo),
      threeMonthsAgo: finalize(threeAgo),
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    logger.error('❌ working-hours-stats unexpected error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load working hours stats' })
  }
})
