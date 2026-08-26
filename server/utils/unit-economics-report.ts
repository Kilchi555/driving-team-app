import type { SupabaseClient } from '@supabase/supabase-js'
import {
  allocateResourceFixed,
  buildCategoryLine,
  buildEconomicsCatalog,
  classifyAppointmentType,
  emptyHoursMap,
  incrementalDbPerHour,
  laborCostPerHour,
  overheadPerClientChf,
  periodMonthsFromDays,
  pickResourceRate,
  suggestedMaxCac,
  upcomingRateDates,
  withExpandedMatchCodes,
  yearMonthWindows,
  ECONOMICS_SKIP_EVENT_CODES,
  type CatalogItem,
  type CategoryLine,
  type EconomicsLine,
  type StaffMixHours,
  type UnitEconomicsSettings,
} from '~/utils/unit-economics'

const PAID = ['paid', 'completed', 'partially_paid', 'partial']
const NON_PRODUCTIVE = ECONOMICS_SKIP_EVENT_CODES

type AppointmentRow = {
  id: string
  staff_id: string | null
  user_id: string | null
  type: string | null
  event_type_code: string | null
  duration_minutes: number | null
  start_time: string
  end_time: string | null
  status: string | null
}

type PaymentRow = {
  appointment_id: string | null
  lesson_price_rappen: number | null
  payment_status: string | null
  paid_at: string | null
  created_at: string | null
}

function appointmentHours(row: AppointmentRow): number {
  if (row.duration_minutes != null && Number.isFinite(Number(row.duration_minutes))) {
    return Number(row.duration_minutes) / 60
  }
  if (row.start_time && row.end_time) {
    const ms = new Date(row.end_time).getTime() - new Date(row.start_time).getTime()
    return Number.isFinite(ms) && ms > 0 ? ms / 3_600_000 : 0
  }
  return 0
}

function isTheory(code: string | null): boolean {
  return code === 'theory'
}

function isProductive(code: string | null): boolean {
  return !NON_PRODUCTIVE.has(code || '')
}

function paymentsForAppointments(
  payments: PaymentRow[],
  appointmentIds: Set<string>,
  fromDay: string,
  toDay: string,
): PaymentRow[] {
  return payments.filter((p) => {
    if (p.appointment_id) return appointmentIds.has(p.appointment_id)
    const day = (p.paid_at || p.created_at || '').slice(0, 10)
    return day >= fromDay && day <= toDay
  })
}

async function fetchPaged<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const page = 1000
  const rows: T[] = []
  for (let from = 0; ; from += page) {
    const { data, error } = await build(from, from + page - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < page) break
  }
  return rows
}

type AppointmentRef = { type: string | null; event_type_code: string | null }

function summarizeWindow(
  appointments: AppointmentRow[],
  payments: PaymentRow[],
  typeByAppointment: Map<string, AppointmentRef>,
  lines: EconomicsLine[],
): {
  hours: Record<string, number>
  theoryHours: Record<string, number>
  students: Record<string, number>
  revenue: Record<string, number>
  staff: StaffMixHours[]
} {
  const hours = emptyHoursMap(lines)
  const theoryHours = emptyHoursMap(lines)
  const students = Object.fromEntries(lines.map(l => [l.code, new Set<string>()])) as Record<string, Set<string>>
  const staffMap = new Map<string, StaffMixHours>()

  for (const row of appointments) {
    const cat = classifyAppointmentType(row.type, lines, row.event_type_code)
    if (cat === 'other' || !hours.hasOwnProperty(cat)) continue
    if (!isProductive(row.event_type_code)) continue

    const h = appointmentHours(row)
    if (isTheory(row.event_type_code)) theoryHours[cat] += h
    else {
      hours[cat] += h
      if (row.user_id) students[cat].add(row.user_id)
    }

    if (!isTheory(row.event_type_code) && row.staff_id) {
      const current = staffMap.get(row.staff_id) ?? { staff_id: row.staff_id, hours: emptyHoursMap(lines) }
      current.hours[cat] = (current.hours[cat] || 0) + h
      staffMap.set(row.staff_id, current)
    }
  }

  const revenue = emptyHoursMap(lines)
  for (const pay of payments) {
    if (!PAID.includes(String(pay.payment_status || ''))) continue
    const ref = pay.appointment_id ? typeByAppointment.get(pay.appointment_id) : null
    const cat = classifyAppointmentType(ref?.type, lines, ref?.event_type_code)
    if (cat === 'other' || !revenue.hasOwnProperty(cat)) continue
    revenue[cat] += (Number(pay.lesson_price_rappen) || 0) / 100
  }

  return {
    hours,
    theoryHours,
    students: Object.fromEntries(lines.map(l => [l.code, students[l.code].size])),
    revenue,
    staff: [...staffMap.values()],
  }
}

function resourceQuantity(settings: UnitEconomicsSettings): Record<string, number> {
  return Object.fromEntries(settings.resources.map(r => [r.code, r.quantity]))
}

function resourceFixedPeriod(
  settings: UnitEconomicsSettings,
  asOf: string,
  months: number,
): Record<string, number> {
  return Object.fromEntries(settings.resources.map((resource) => {
    const rate = pickResourceRate(settings.rates, resource.code, asOf)
    return [resource.code, (rate?.fixed_monthly_chf ?? 0) * months * resource.quantity]
  }))
}

function linesForAsOf(params: {
  settings: UnitEconomicsSettings
  asOf: string
  periodDays: number
  hours: Record<string, number>
  theoryHours: Record<string, number>
  revenue: Record<string, number>
  staff: StaffMixHours[]
}): Record<string, CategoryLine> {
  const months = periodMonthsFromDays(params.periodDays)
  const labor = laborCostPerHour(params.settings)
  const allocated = allocateResourceFixed({
    staff: params.staff,
    lines: params.settings.lines,
    resource_fixed_period: resourceFixedPeriod(params.settings, params.asOf, months),
    resource_quantity: resourceQuantity(params.settings),
  })

  const out: Record<string, CategoryLine> = {}
  for (const line of params.settings.lines) {
    const rate = line.resource_code
      ? pickResourceRate(params.settings.rates, line.resource_code, params.asOf)
      : null
    out[line.code] = buildCategoryLine({
      hours: params.hours[line.code] || 0,
      theory_hours: params.theoryHours[line.code] || 0,
      revenue_chf: params.revenue[line.code] || 0,
      variable_per_hour_chf: rate?.variable_per_hour_chf ?? 0,
      fixed_chf: allocated[line.code] || 0,
      labor_per_hour_chf: labor,
      period_months: months,
    })
  }
  return out
}

function scaleHours(
  hours: Record<string, number>,
  fromDays: number,
  lines: EconomicsLine[],
  useTarget: boolean,
): { hours: Record<string, number>; days: number } {
  const monthHours = emptyHoursMap(lines)
  for (const line of lines) {
    const trailingMonthly = fromDays > 0 ? (hours[line.code] || 0) * (30.4375 / fromDays) : 0
    monthHours[line.code] = useTarget && line.target_hours_per_month != null
      ? line.target_hours_per_month
      : trailingMonthly
  }
  return { hours: monthHours, days: 30.4375 }
}

export type DerivedCac = {
  category: string
  max_cac_chf: number | null
  source: 'formula' | 'override' | 'negative'
  db_per_hour_chf: number | null
  incremental_db_per_hour_chf: number | null
}

function derivedCacs(
  settings: UnitEconomicsSettings,
  lines: Record<string, CategoryLine>,
): Record<string, DerivedCac> {
  const labor = laborCostPerHour(settings)
  const overhead = overheadPerClientChf(settings)
  const out: Record<string, DerivedCac> = {}
  for (const line of settings.lines) {
    const rate = line.resource_code
      ? pickResourceRate(settings.rates, line.resource_code, '9999-12-31')
      : null
    const incremental = incrementalDbPerHour(
      lines[line.code]?.revenue_per_hour_chf ?? null,
      labor,
      rate?.variable_per_hour_chf ?? 0,
    )
    const revenuePerClient = (lines[line.code]?.revenue_per_hour_chf ?? 0) * line.expected_hours
    const suggested = suggestedMaxCac({
      db_per_hour_chf: lines[line.code]?.db_per_hour_chf ?? null,
      expected_hours: line.expected_hours,
      safety_factor: settings.cac_safety_factor,
      override: line.cac_override,
      incremental_db_per_hour_chf: incremental,
      overhead_per_client_chf: overhead,
      revenue_per_client_chf: revenuePerClient || undefined,
      profit_margin_target: settings.profit_margin_target,
    })
    out[line.code] = {
      category: line.code,
      max_cac_chf: suggested.max_cac_chf,
      source: suggested.source,
      db_per_hour_chf: lines[line.code]?.db_per_hour_chf ?? null,
      incremental_db_per_hour_chf: incremental,
    }
  }
  return out
}

export function guardrailCacMap(
  derived: Record<string, DerivedCac>,
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const [cat, row] of Object.entries(derived)) {
    if (row.max_cac_chf != null) map[cat] = row.max_cac_chf
  }
  return map
}

async function catalogItemsForTenant(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<CatalogItem[]> {
  const { data } = await supabase
    .from('categories')
    .select('id, code, name, parent_category_id')
    .eq('tenant_id', tenantId)
  return buildEconomicsCatalog({
    businessType: 'generic',
    categories: data ?? [],
    eventTypes: [],
  }).items
}

export async function buildUnitEconomicsReport(params: {
  supabase: SupabaseClient
  tenantId: string
  settings: UnitEconomicsSettings
  asOf?: string
  catalog?: CatalogItem[]
}): Promise<{
  as_of: string
  windows: Record<'d30' | 'd90', {
    days: number
    from: string
    to: string
    hours: Record<string, number>
    students: Record<string, number>
    lines: Record<string, CategoryLine>
  }>
  forecast: Array<{
    as_of: string
    label: string
    scenario: 'trailing_30' | 'trailing_90' | 'target'
    lines: Record<string, CategoryLine>
  }>
  year: {
    year: number
    months: Array<{
      key: string
      label: string
      short_label: string
      from: string
      to: string
      days: number
      is_future: boolean
      hours: Record<string, number>
      students: Record<string, number>
      lines: Record<string, CategoryLine>
    }>
  }
  derived_max_cac: Record<string, DerivedCac>
  labor_per_hour_chf: number
}> {
  const catalog = params.catalog?.length
    ? params.catalog
    : await catalogItemsForTenant(params.supabase, params.tenantId)
  const settings = withExpandedMatchCodes(params.settings, catalog)
  const asOf = params.asOf || new Date().toISOString().slice(0, 10)
  const end = new Date(`${asOf}T23:59:59`)
  const start90 = new Date(end)
  start90.setDate(start90.getDate() - 90)
  const start30 = new Date(end)
  start30.setDate(start30.getDate() - 30)
  const yearStart = `${asOf.slice(0, 4)}-01-01`
  const fromYear = `${yearStart}T00:00:00`
  const from90 = start90.toISOString()
  const from30 = start30.toISOString()
  const to = end.toISOString()
  const fetchFrom = fromYear < from90 ? fromYear : from90

  const [appointments, payments] = await Promise.all([
    fetchPaged<AppointmentRow>((from, toIdx) =>
      params.supabase
        .from('appointments')
        .select('id, staff_id, user_id, type, event_type_code, duration_minutes, start_time, end_time, status')
        .eq('tenant_id', params.tenantId)
        .is('deleted_at', null)
        .gte('start_time', fetchFrom)
        .lte('start_time', to)
        .range(from, toIdx)
        .then(r => ({ data: r.data as AppointmentRow[] | null, error: r.error })),
    ),
    fetchPaged<PaymentRow>((from, toIdx) =>
      params.supabase
        .from('payments')
        .select('appointment_id, lesson_price_rappen, payment_status, paid_at, created_at')
        .eq('tenant_id', params.tenantId)
        .or(`paid_at.gte.${fetchFrom.slice(0, 10)},created_at.gte.${fetchFrom}`)
        .range(from, toIdx)
        .then(r => ({ data: r.data as PaymentRow[] | null, error: r.error })),
    ),
  ])

  const active = appointments.filter(a => !['cancelled', 'canceled', 'no_show'].includes(String(a.status || '')))
  const typeByAppointment = new Map(active.map(a => [a.id, { type: a.type, event_type_code: a.event_type_code }]))
  const in30 = active.filter(a => a.start_time >= from30)
  const ids90 = new Set(active.map(a => a.id))
  const ids30 = new Set(in30.map(a => a.id))
  const payments90 = paymentsForAppointments(payments, ids90, from90.slice(0, 10), asOf)
  const payments30 = paymentsForAppointments(payments, ids30, from30.slice(0, 10), asOf)

  const sum90 = summarizeWindow(active, payments90, typeByAppointment, settings.lines)
  const sum30 = summarizeWindow(in30, payments30, typeByAppointment, settings.lines)

  const lines90 = linesForAsOf({
    settings,
    asOf,
    periodDays: 90,
    hours: sum90.hours,
    theoryHours: sum90.theoryHours,
    revenue: sum90.revenue,
    staff: sum90.staff,
  })
  const lines30 = linesForAsOf({
    settings,
    asOf,
    periodDays: 30,
    hours: sum30.hours,
    theoryHours: sum30.theoryHours,
    revenue: sum30.revenue,
    staff: sum30.staff,
  })

  const futureDates = upcomingRateDates(settings.rates, asOf)
  const forecastAsOf = [asOf, ...futureDates].slice(0, 4)
  const forecast: Array<{
    as_of: string
    label: string
    scenario: 'trailing_30' | 'trailing_90' | 'target'
    lines: Record<string, CategoryLine>
  }> = []

  for (const date of forecastAsOf) {
    const label = date === asOf ? 'Heute' : `ab ${date}`
    forecast.push({
      as_of: date,
      label: `${label} · letzte 90 Tage`,
      scenario: 'trailing_90',
      lines: linesForAsOf({
        settings,
        asOf: date,
        periodDays: 90,
        hours: sum90.hours,
        theoryHours: sum90.theoryHours,
        revenue: sum90.revenue,
        staff: sum90.staff,
      }),
    })
    forecast.push({
      as_of: date,
      label: `${label} · letzte 30 Tage`,
      scenario: 'trailing_30',
      lines: linesForAsOf({
        settings,
        asOf: date,
        periodDays: 30,
        hours: sum30.hours,
        theoryHours: sum30.theoryHours,
        revenue: sum30.revenue,
        staff: sum30.staff,
      }),
    })
    const target = scaleHours(sum90.hours, 90, settings.lines, true)
    const targetTheory = scaleHours(sum90.theoryHours, 90, settings.lines, false)
    const targetRevenue = emptyHoursMap(settings.lines)
    for (const line of settings.lines) {
      const rph = lines90[line.code]?.revenue_per_hour_chf ?? 0
      targetRevenue[line.code] = target.hours[line.code] * rph
    }
    forecast.push({
      as_of: date,
      label: `${label} · Soll-Pensum`,
      scenario: 'target',
      lines: linesForAsOf({
        settings,
        asOf: date,
        periodDays: target.days,
        hours: target.hours,
        theoryHours: targetTheory.hours,
        revenue: targetRevenue,
        staff: sum90.staff,
      }),
    })
  }

  return {
    as_of: asOf,
    windows: {
      d30: {
        days: 30,
        from: from30.slice(0, 10),
        to: asOf,
        hours: sum30.hours,
        students: sum30.students,
        lines: lines30,
      },
      d90: {
        days: 90,
        from: from90.slice(0, 10),
        to: asOf,
        hours: sum90.hours,
        students: sum90.students,
        lines: lines90,
      },
    },
    forecast,
    year: {
      year: Number(asOf.slice(0, 4)),
      months: yearMonthWindows(asOf).map((month) => {
        if (month.is_future) {
          return {
            key: month.key,
            label: month.label,
            short_label: month.short_label,
            from: month.from,
            to: month.to,
            days: month.days,
            is_future: true,
            hours: emptyHoursMap(settings.lines),
            students: emptyHoursMap(settings.lines),
            lines: Object.fromEntries(settings.lines.map(l => [l.code, buildCategoryLine({
              hours: 0,
              theory_hours: 0,
              revenue_chf: 0,
              variable_per_hour_chf: 0,
              fixed_chf: 0,
              labor_per_hour_chf: 0,
              period_months: 1,
            })])),
          }
        }
        const monthFrom = `${month.from}T00:00:00`
        const monthTo = `${month.to}T23:59:59`
        const monthAppointments = active.filter(a => a.start_time >= monthFrom && a.start_time <= monthTo)
        const monthPayments = paymentsForAppointments(
          payments,
          new Set(monthAppointments.map(a => a.id)),
          month.from,
          month.to,
        )
        const sum = summarizeWindow(monthAppointments, monthPayments, typeByAppointment, settings.lines)
        return {
          key: month.key,
          label: month.label,
          short_label: month.short_label,
          from: month.from,
          to: month.to,
          days: month.days,
          is_future: false,
          hours: sum.hours,
          students: sum.students,
          lines: linesForAsOf({
            settings,
            asOf: month.to,
            periodDays: month.days,
            hours: sum.hours,
            theoryHours: sum.theoryHours,
            revenue: sum.revenue,
            staff: sum.staff,
          }),
        }
      }),
    },
    derived_max_cac: derivedCacs(settings, lines90),
    labor_per_hour_chf: laborCostPerHour(settings),
  }
}
