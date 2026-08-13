/**
 * Swiss national holidays calculator.
 * Covers the most commonly observed public holidays across Switzerland.
 *
 * Fixed national holidays (federal law):
 *   - January 1  (Neujahrstag)
 *   - August 1   (Nationalfeiertag)
 *
 * Widely observed in most cantons (used for working-day calculation):
 *   - January 2    (Berchtoldstag – most cantons except GE, JU, NE, VS)
 *   - Good Friday  (Karfreitag)
 *   - Easter Monday (Ostermontag)
 *   - Ascension Thursday (Auffahrt / Christi Himmelfahrt)
 *   - Whit Monday  (Pfingstmontag)
 *   - December 25  (Weihnachtstag)
 *   - December 26  (Stephanstag)
 *
 * For a driving-school context (national scope, not canton-specific) we include
 * all of the above as it gives the most conservative (fewest) working-day count,
 * which is fair when computing salary targets.
 */

/** Returns the date of Easter Sunday for the given year (Gregorian algorithm). */
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1 // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

/** Returns the set of Swiss public holidays for the given year as ISO date strings (YYYY-MM-DD). */
export function getSwissHolidays(year: number): Set<string> {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const addDays = (d: Date, n: number): Date => {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
  }

  const easter = easterSunday(year)

  const holidays = new Set<string>([
    // Fixed
    fmt(new Date(year, 0, 1)),   // Neujahrstag
    fmt(new Date(year, 0, 2)),   // Berchtoldstag
    fmt(new Date(year, 7, 1)),   // Nationalfeiertag
    fmt(new Date(year, 11, 25)), // Weihnachtstag
    fmt(new Date(year, 11, 26)), // Stephanstag

    // Easter-based moveable feasts
    fmt(addDays(easter, -2)),    // Karfreitag (Good Friday)
    fmt(addDays(easter, 1)),     // Ostermontag (Easter Monday)
    fmt(addDays(easter, 39)),    // Auffahrt (Ascension, 39 days after Easter)
    fmt(addDays(easter, 50)),    // Pfingstmontag (Whit Monday, 50 days after Easter)
  ])

  return holidays
}

/**
 * Returns the number of working days (Monday–Friday, excluding Swiss public holidays)
 * in the given month.
 *
 * @param year  4-digit year
 * @param month 1-indexed month (1 = January, 12 = December)
 */
export function getWorkingDaysInMonth(year: number, month: number): number {
  const holidays = getSwissHolidays(year)
  const daysInMonth = new Date(year, month, 0).getDate()
  let workingDays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    const dow = date.getDay() // 0 = Sunday, 6 = Saturday
    if (dow === 0 || dow === 6) continue // weekend
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (holidays.has(iso)) continue // public holiday
    workingDays++
  }

  return workingDays
}

/** 100% instructor week that the 6.5h working day belongs to. */
export const MONTHLY_SOLL_WEEKLY_REFERENCE = 33.75
/** Working-day length at 100% (33.75h/week). Part-time scales with weekly hours. */
export const MONTHLY_SOLL_DAILY_HOURS = 6.5

function roundHours2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Daily Soll/vacation hours for monthly-salary staff. 33.75h/week → 6.5h/day. */
export function getMonthlyDailyHours(weeklyContractedHours: number): number {
  if (weeklyContractedHours <= 0) return 0
  return weeklyContractedHours * (MONTHLY_SOLL_DAILY_HOURS / MONTHLY_SOLL_WEEKLY_REFERENCE)
}

/**
 * Monthly Soll: Arbeitstage × 6.5h, scaled by contracted week / 33.75.
 * 33.75h/week → 6.5h per working day (not weekly/5 = 6.75h).
 */
export function getMonthlyTargetHours(year: number, month: number, weeklyContractedHours: number): number {
  const workingDays = getWorkingDaysInMonth(year, month)
  return roundHours2(workingDays * getMonthlyDailyHours(weeklyContractedHours))
}

/**
 * Keep a stored Soll when it is a genuine override (or a previous pensum).
 * Auto-calculated values from the old weekly/5 formula are migrated.
 */
export function resolveMonthlyTargetHours(
  year: number,
  month: number,
  weeklyContractedHours: number,
  storedTarget: number | null | undefined,
): number {
  const computed = getMonthlyTargetHours(year, month, weeklyContractedHours)
  if (storedTarget == null || Number.isNaN(storedTarget)) return computed

  const stored = roundHours2(storedTarget)
  const legacyDaily = weeklyContractedHours / 5
  const legacyCalendar = roundHours2(getWorkingDaysInMonth(year, month) * legacyDaily)
  if (Math.abs(stored - legacyCalendar) < 0.015) return computed
  return stored
}

/**
 * Returns a full-year breakdown of working days and target hours per month.
 */
export function getYearlyWorkingDaysBreakdown(year: number, weeklyContractedHours: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const workingDays = getWorkingDaysInMonth(year, month)
    const targetHours = getMonthlyTargetHours(year, month, weeklyContractedHours)
    return { month, workingDays, targetHours }
  })
}
