/** Schedule helpers for recurring marketing campaigns (Europe/Zurich). */

const TZ = 'Europe/Zurich'
const WEEKDAY_TO_ISO: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
}

export type ScheduleFrequency = 'daily' | 'weekly'

export interface CampaignSchedule {
  frequency: ScheduleFrequency
  /** ISO weekday 1=Mon … 7=Sun — required for weekly */
  dayOfWeek?: number | null
  /** Hour 0–23 in Europe/Zurich */
  hour: number
}

export interface ZurichParts {
  year: string
  month: string
  day: string
  hour: number
  isoDow: number
}

export function getZurichParts(date: Date = new Date()): ZurichParts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    weekday: 'short',
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]))
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: Number(parts.hour === '24' ? '0' : parts.hour),
    isoDow: WEEKDAY_TO_ISO[parts.weekday] ?? 1,
  }
}

/** Convert a Zurich local civil datetime to a UTC Date. */
export function zurichLocalToUtc(year: string, month: string, day: string, hour: number): Date {
  // Start near CET (UTC+1), then refine against Intl until Zurich wall-clock matches
  let guess = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour - 1, 0, 0))
  for (let i = 0; i < 48; i++) {
    const p = getZurichParts(guess)
    if (p.year === year && p.month === month && p.day === day && p.hour === hour) return guess
    const dayDelta =
      Date.UTC(Number(year), Number(month) - 1, Number(day)) -
      Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day))
    const hourDelta = hour - p.hour
    guess = new Date(guess.getTime() + dayDelta + hourDelta * 3_600_000)
  }
  return guess
}

export function computeNextRunAt(schedule: CampaignSchedule, after: Date = new Date()): Date {
  const hour = Math.max(0, Math.min(23, schedule.hour ?? 9))

  for (let dayOffset = 0; dayOffset <= 16; dayOffset++) {
    const probe = new Date(after.getTime() + dayOffset * 86_400_000)
    const p = getZurichParts(probe)
    if (schedule.frequency === 'weekly') {
      const dow = schedule.dayOfWeek ?? 1
      if (p.isoDow !== dow) continue
    }
    const utc = zurichLocalToUtc(p.year, p.month, p.day, hour)
    if (utc.getTime() > after.getTime()) return utc
  }

  // Fallback: +7 days at hour
  const p = getZurichParts(new Date(after.getTime() + 7 * 86_400_000))
  return zurichLocalToUtc(p.year, p.month, p.day, hour)
}

/** True if this campaign should fire in the current Zurich hour (and not already today). */
export function isScheduleDueNow(campaign: {
  schedule_enabled?: boolean | null
  schedule_frequency?: string | null
  schedule_day_of_week?: number | null
  schedule_hour?: number | null
  last_run_at?: string | null
}, now: Date = new Date()): boolean {
  if (!campaign.schedule_enabled) return false
  const freq = campaign.schedule_frequency
  if (freq !== 'daily' && freq !== 'weekly') return false

  const z = getZurichParts(now)
  if ((campaign.schedule_hour ?? 9) !== z.hour) return false
  if (freq === 'weekly' && (campaign.schedule_day_of_week ?? 1) !== z.isoDow) return false

  if (campaign.last_run_at) {
    const last = getZurichParts(new Date(campaign.last_run_at))
    if (last.year === z.year && last.month === z.month && last.day === z.day) return false
  }

  return true
}

export const SCHEDULE_DAY_LABELS: Record<number, string> = {
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag',
  7: 'Sonntag',
}
