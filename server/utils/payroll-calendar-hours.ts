import { getMonthlyDailyHours } from '~/server/utils/swiss-holidays'
import {
  STAFF_HOURS_TIMEZONE,
  appointmentHours,
  shouldCountAppointment,
  zurichMonth,
  zurichYear,
} from '~/server/utils/staff-hours-counting'

export type CalendarHourRow = {
  staff_id: string
  actual_hours: number
  vacation_hours: number
  vacation_days: number
}

type CountableApt = {
  staff_id: string
  start_time?: string | null
  duration_minutes?: number | null
  event_type_code?: string | null
  status?: string | null
  payments?: Array<{ payment_status: string }> | null
}

export function summarizeStaffMonthHours(
  appointments: CountableApt[],
  staffId: string,
  year: number,
  month: number,
  weeklyContractedHours = 0,
): CalendarHourRow {
  const vacationCredits = new Map<string, number>()
  let actual = 0

  for (const apt of appointments) {
    if (apt.staff_id !== staffId || !apt.start_time) continue
    if (zurichYear(apt.start_time) !== year || zurichMonth(apt.start_time) !== month) continue
    if (!shouldCountAppointment({ status: apt.status || '', payments: apt.payments })) continue

    if (apt.event_type_code === 'vacation') {
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: STAFF_HOURS_TIMEZONE }).format(new Date(apt.start_time))
      const weekday = new Date(`${dateStr}T12:00:00`).getDay()
      if (weekday < 1 || weekday > 5) continue
      const duration = apt.duration_minutes ?? 0
      const credit = duration > 0 && duration <= 420 ? 0.5 : 1
      vacationCredits.set(dateStr, Math.max(vacationCredits.get(dateStr) || 0, credit))
      continue
    }
    actual += appointmentHours(apt)
  }

  const vacation_days = [...vacationCredits.values()].reduce((s, c) => s + c, 0)
  const daily = getMonthlyDailyHours(weeklyContractedHours)
  const vacation_hours = daily > 0 ? vacation_days * daily : 0

  return {
    staff_id: staffId,
    actual_hours: Math.round(actual * 100) / 100,
    vacation_hours: Math.round(vacation_hours * 100) / 100,
    vacation_days: Math.round(vacation_days * 10) / 10,
  }
}

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1) - 24 * 60 * 60 * 1000)
  const end = new Date(Date.UTC(year, month, 2))
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  }
}

export async function loadPayrollCalendarHours(
  supabase: { from: (table: string) => any },
  tenantId: string,
  year: number,
  month: number,
  staffIds: string[],
): Promise<Map<string, CalendarHourRow>> {
  const result = new Map<string, CalendarHourRow>()
  if (!staffIds.length) return result

  const { data: staffRows } = await supabase
    .from('users')
    .select('id, weekly_contracted_hours')
    .eq('tenant_id', tenantId)
    .in('id', staffIds)
  const weeklyById = new Map((staffRows ?? []).map((s: { id: string; weekly_contracted_hours: number | null }) => [
    s.id,
    s.weekly_contracted_hours ?? 0,
  ]))

  const { from, to } = monthRange(year, month)
  const apts: CountableApt[] = []
  const pageSize = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('appointments')
      .select('staff_id, start_time, duration_minutes, event_type_code, status, payments(payment_status)')
      .eq('tenant_id', tenantId)
      .in('staff_id', staffIds)
      .gte('start_time', from)
      .lt('start_time', to)
      .neq('status', 'deleted')
      .order('start_time', { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    apts.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }

  for (const id of staffIds) {
    result.set(id, summarizeStaffMonthHours(apts, id, year, month, weeklyById.get(id) ?? 0))
  }
  return result
}
