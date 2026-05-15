/**
 * Shared recalculation logic for the staff_monthly_hours table.
 * Used by both the admin POST endpoint and the nightly cron job.
 *
 * Appointment counting rules:
 *  - Not cancelled → always count
 *  - Cancelled + has a payment that is NOT cancelled/refunded/failed → count
 *    (customer was still charged, e.g. no-show fee)
 *  - Cancelled + no payment OR payment cancelled/refunded → do NOT count
 */
import { getMonthlyTargetHours } from '~/server/utils/swiss-holidays'
import { logger } from '~/utils/logger'

const TIMEZONE = 'Europe/Zurich'

/** payment_status values that mean "the appointment was effectively not paid for" */
const VOID_PAYMENT_STATUSES = new Set(['cancelled', 'canceled', 'refunded', 'failed'])

/** UTC ISO string → calendar month in Zurich (1-based). */
function zurichMonth(isoString: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { month: '2-digit', timeZone: TIMEZONE }).format(new Date(isoString))
  )
}

/**
 * Returns true when an appointment should be counted toward a staff member's
 * actual working hours.
 */
function shouldCountAppointment(apt: {
  status: string
  payments?: Array<{ payment_status: string }>
}): boolean {
  if (apt.status !== 'cancelled') return true
  // Cancelled appointment: count only if a payment was collected (not voided)
  const payments = apt.payments || []
  return payments.some((p) => !VOID_PAYMENT_STATUSES.has(p.payment_status))
}

/**
 * Recalculates staff_monthly_hours rows for a given tenant, year and subset of
 * months.  Pass all 12 months to recalculate the full year.
 *
 * NOTE: Appointments are fetched in paginated batches of 1 000 rows so there
 * is no artificial row cap regardless of how many appointments a tenant has.
 */
export async function recalculateStaffHoursForTenant(
  supabase: any,
  tenantId: string,
  year: number,
  monthsToProcess: number[],
  staffId?: string,
  forceTargetRecalc = false
): Promise<{ updated: number }> {
  // ── 1. Determine which staff members to process ──────────────────────────
  let staffToProcess: Array<{ id: string; weekly_contracted_hours: number | null; salary_type: string | null; vacation_entitlement_days: number | null }> = []

  if (staffId) {
    const { data } = await supabase
      .from('users')
      .select('id, weekly_contracted_hours, salary_type, vacation_entitlement_days')
      .eq('id', staffId)
      .eq('tenant_id', tenantId)
      .single()
    if (data) staffToProcess = [data]
  } else {
    const { data } = await supabase
      .from('users')
      .select('id, weekly_contracted_hours, salary_type, vacation_entitlement_days')
      .eq('role', 'staff')
      .eq('tenant_id', tenantId)
    staffToProcess = data || []
  }

  if (staffToProcess.length === 0) return { updated: 0 }

  // ── 2. Load appointments for the relevant date range ─────────────────────
  const staffIds = staffToProcess.map((s) => s.id)
  const minMonth = Math.min(...monthsToProcess)
  const maxMonth = Math.max(...monthsToProcess)

  // rangeStart = first day of earliest month, rangeEnd = first day after latest month
  const rangeStart = `${year}-${String(minMonth).padStart(2, '0')}-01`
  const rangeEnd = new Date(year, maxMonth, 1).toISOString().split('T')[0] // month is 0-indexed

  // Paginate in batches of 1000 to avoid Supabase's default row cap.
  const allApts: any[] = []
  const PAGE_SIZE = 1000
  let from = 0
  while (true) {
    const { data: page, error: pageErr } = await supabase
      .from('appointments')
      .select('staff_id, start_time, duration_minutes, event_type_code, status, payments(payment_status)')
      .in('staff_id', staffIds)
      .eq('tenant_id', tenantId)
      .gte('start_time', rangeStart)
      .lt('start_time', rangeEnd)
      .order('start_time', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (pageErr) {
      logger.error('❌ Error fetching appointments page:', pageErr.message)
      break
    }
    if (!page || page.length === 0) break
    allApts.push(...page)
    if (page.length < PAGE_SIZE) break // last page
    from += PAGE_SIZE
  }

  // ── 3. Aggregate hours per staff per month ────────────────────────────────
  // vacation_days: set of distinct calendar dates (Zurich) with vacation appointments
  const grouped: Record<string, Record<number, { actual: number; vacation_days: Set<string> }>> = {}
  staffIds.forEach((id) => {
    grouped[id] = {}
    monthsToProcess.forEach((m) => { grouped[id][m] = { actual: 0, vacation_days: new Set() } })
  })

  ;(allApts || []).forEach((apt: any) => {
    if (!apt.start_time) return
    if (!shouldCountAppointment(apt)) return
    const m = zurichMonth(apt.start_time)
    if (!monthsToProcess.includes(m)) return
    if (!grouped[apt.staff_id]) return
    if (!grouped[apt.staff_id][m]) grouped[apt.staff_id][m] = { actual: 0, vacation_days: new Set() }
    if (apt.event_type_code === 'vacation') {
      // Count only Mon–Fri as vacation days (standard 5-day week for entitlement).
      // Saturday appointments are created to block the calendar but don't count.
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date(apt.start_time))
      const weekday = new Date(dateStr + 'T12:00:00').getDay() // 0=Sun, 6=Sat
      if (weekday >= 1 && weekday <= 5) {
        grouped[apt.staff_id][m].vacation_days.add(dateStr)
      }
    } else {
      const hours = (apt.duration_minutes || 0) / 60
      grouped[apt.staff_id][m].actual += hours
    }
  })

  // ── 4. Build upsert rows ──────────────────────────────────────────────────
  const results: any[] = []

  // Never create records for months that haven't started yet – they have no
  // actual hours and would produce false negative overtime/saldo values.
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-based

  for (const staff of staffToProcess) {
    const isMonthly = staff.salary_type === 'monthly'
    const weeklyHours = staff.weekly_contracted_hours || 0

    // For monthly-salary staff: determine the earliest month with an existing record.
    // Months before this are treated as "not employed yet" and skipped (no record created).
    // The admin's "Speichern mit gilt ab" creates the initial record; the cron then continues.
    let firstEmploymentMonth: number | null = null
    if (isMonthly) {
      const { data: firstRecord } = await supabase
        .from('staff_monthly_hours')
        .select('month')
        .eq('staff_id', staff.id)
        .eq('tenant_id', tenantId)
        .eq('year', year)
        .order('month', { ascending: true })
        .limit(1)
        .maybeSingle()
      firstEmploymentMonth = firstRecord?.month ?? null
    }

    for (const m of monthsToProcess) {
      // Skip current and future months – only completed months have reliable data.
      if (year > currentYear || (year === currentYear && m >= currentMonth)) continue

      const monthData = grouped[staff.id]?.[m] ?? { actual: 0, vacation_days: new Set<string>() }
      const actual = monthData.actual
      // For monthly-salary staff: vacation = number of distinct vacation days × daily contracted hours
      // For hourly staff: vacation stays 0 (no target hours system)
      const dailyHours = isMonthly && weeklyHours > 0 ? weeklyHours / 5 : 0
      const vacationDays = monthData.vacation_days.size
      const vacation = isMonthly ? vacationDays * dailyHours : 0

      // Monthly salary: respect manually set target override, otherwise calculate
      let targetHours = 0
      if (isMonthly) {
        const { data: existing } = await supabase
          .from('staff_monthly_hours')
          .select('target_hours')
          .eq('staff_id', staff.id)
          .eq('tenant_id', tenantId)
          .eq('year', year)
          .eq('month', m)
          .maybeSingle()

        // Skip months before the first employment month UNLESS:
        //   - forceTargetRecalc is set (admin explicitly chose this month range), OR
        //   - actual hours exist (appointments were booked, so they must be employed)
        const hasActuals = actual > 0 || vacationDays > 0
        const isBeforeEmployment = firstEmploymentMonth !== null && m < firstEmploymentMonth
        if (!existing && isBeforeEmployment && !forceTargetRecalc && !hasActuals) continue
        // Also skip if staff has no employment record at all in this year (brand-new staff
        // without any saved month) – wait for admin to set "gilt ab" first.
        if (!existing && firstEmploymentMonth === null && !forceTargetRecalc && !hasActuals) continue

        // Only use stored target_hours as admin override if it was intentionally set.
        // forceTargetRecalc = true skips the stored value (e.g. on employment % change).
        const storedTarget = existing?.target_hours != null ? parseFloat(existing.target_hours) : null
        targetHours = (!forceTargetRecalc && storedTarget != null)
          ? storedTarget
          : getMonthlyTargetHours(year, m, weeklyHours)
      }

      results.push({
        staff_id: staff.id,
        tenant_id: tenantId,
        year,
        month: m,
        target_hours: Math.round(targetHours * 100) / 100,
        actual_hours: Math.round(actual * 100) / 100,
        vacation_hours: Math.round(vacation * 100) / 100,
        cumulative_overtime: 0, // recalculated below for monthly staff
      })
    }

    // ── 5. Cumulative overtime (monthly salary staff only) ────────────────
    if (isMonthly) {
      // Load carry-over from previous year (Jahresvortrag)
      const { data: carryOverRecord } = await supabase
        .from('staff_year_carry_over')
        .select('carry_over_hours')
        .eq('staff_id', staff.id)
        .eq('tenant_id', tenantId)
        .eq('year', year)
        .maybeSingle()
      const carryOver = carryOverRecord ? parseFloat(carryOverRecord.carry_over_hours) : 0

      // Load the full year from DB so running total is correct across all months
      const { data: allYearRecords } = await supabase
        .from('staff_monthly_hours')
        .select('month, target_hours, actual_hours, vacation_hours, sick_hours, admin_hours')
        .eq('staff_id', staff.id)
        .eq('tenant_id', tenantId)
        .eq('year', year)
        .order('month', { ascending: true })

      // Merge: DB records as base, newly computed months override
      const mergedByMonth: Record<number, any> = {}
      ;(allYearRecords || []).forEach((r: any) => { mergedByMonth[r.month] = r })
      results
        .filter((r) => r.staff_id === staff.id)
        .forEach((r) => { mergedByMonth[r.month] = r })

      let running = carryOver
      for (let m2 = 1; m2 <= 12; m2++) {
        const rec = mergedByMonth[m2]
        if (!rec) continue
        running += parseFloat(rec.actual_hours) + parseFloat(rec.vacation_hours) + parseFloat(rec.sick_hours ?? 0) + parseFloat(rec.admin_hours ?? 0) - parseFloat(rec.target_hours)
        const idx = results.findIndex((r) => r.staff_id === staff.id && r.month === m2)
        if (idx !== -1) results[idx].cumulative_overtime = Math.round(running * 100) / 100
      }

      // ── Auto-write next year's carry-over if December was just processed ──
      // When the cron runs on January 1st and completes December, the final
      // running value becomes the opening balance for the new year.
      const processedDecember = monthsToProcess.includes(12) && mergedByMonth[12]
      if (processedDecember && year < currentYear) {
        await supabase
          .from('staff_year_carry_over')
          .upsert(
            {
              staff_id: staff.id,
              tenant_id: tenantId,
              year: year + 1,
              carry_over_hours: Math.round(running * 100) / 100,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id,staff_id,year', ignoreDuplicates: false }
          )
        logger.debug(`↪ Auto-set carry-over ${year + 1} = ${running.toFixed(2)}h for staff ${staff.id}`)
      }
    }
  }

  // ── 6. Upsert ─────────────────────────────────────────────────────────────
  if (results.length > 0) {
    const { error: upsertError } = await supabase
      .from('staff_monthly_hours')
      .upsert(results, { onConflict: 'tenant_id,staff_id,year,month', ignoreDuplicates: false })
    if (upsertError) throw new Error(upsertError.message)
  }

  // ── 7. Delete stale current/future-month records ─────────────────────────
  // Remove records for the current and future months – they are incomplete
  // and would distort the cumulative saldo.
  if (year === currentYear) {
    await supabase
      .from('staff_monthly_hours')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('year', year)
      .gte('month', currentMonth)
      .in('staff_id', staffToProcess.map((s) => s.id))
  }

  logger.debug(
    `✅ Recalculated ${results.length} monthly-hour records for tenant ${tenantId}, year ${year}, months [${monthsToProcess.join(',')}]`
  )
  return { updated: results.length }
}
