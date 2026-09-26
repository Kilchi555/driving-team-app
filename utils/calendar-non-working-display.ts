/**
 * Display state for calendar non-working blocks.
 * An exception-load failure must not be rendered as an open day.
 */
import {
  civilDayOfWeek,
  nonWorkingSpans,
  resolveEffectiveWorkingHours,
  type EffectiveException,
  type EffectiveWeeklyHour,
} from '~/utils/effective-working-hours'

export interface DisplaySpan {
  date: string
  start: string
  end: string
}

export function graySpansForCivilDates(
  dates: string[],
  weeklyHours: EffectiveWeeklyHour[],
  exceptionsByDate: ReadonlyMap<string, EffectiveException | null | undefined>,
): DisplaySpan[] {
  const spans: DisplaySpan[] = []
  for (const date of dates) {
    const dayOfWeek = civilDayOfWeek(date)
    const effective = resolveEffectiveWorkingHours({
      civilDate: date,
      dayOfWeek,
      weeklyHours,
      exception: exceptionsByDate.get(date) ?? null,
    })
    for (const span of nonWorkingSpans(effective)) {
      spans.push({ date, start: span.start, end: span.end })
    }
  }
  return spans
}

/** Visual closed day when hours are unknown. Not stored as a successful schedule. */
export function failClosedSpans(dates: string[]): DisplaySpan[] {
  return dates.map((date) => ({ date, start: '00:00', end: '23:59' }))
}

export interface NonWorkingDisplayState<T> {
  lastSuccessful: T[] | null
  display: T[]
  showError: boolean
  usingFailClosed: boolean
}

export function decideNonWorkingDisplay<T>(
  lastSuccessful: T[] | null,
  outcome: { ok: true; blocks: T[] } | { ok: false },
  failClosed: T[],
): NonWorkingDisplayState<T> {
  if (outcome.ok) {
    return {
      lastSuccessful: outcome.blocks,
      display: outcome.blocks,
      showError: false,
      usingFailClosed: false,
    }
  }
  if (lastSuccessful !== null) {
    return {
      lastSuccessful,
      display: lastSuccessful,
      showError: true,
      usingFailClosed: false,
    }
  }
  return {
    lastSuccessful: null,
    display: failClosed,
    showError: true,
    usingFailClosed: true,
  }
}

export interface ReloadGate {
  busy: boolean
  queuedForce: boolean
}

/**
 * A forced reload that arrives while a load is in flight is queued.
 * It is not dropped after a short wait.
 */
export function requestCalendarReload(
  gate: ReloadGate,
  forceReload: boolean,
): { gate: ReloadGate; start: boolean } {
  if (gate.busy) {
    return {
      gate: {
        busy: true,
        queuedForce: forceReload ? true : gate.queuedForce,
      },
      start: false,
    }
  }
  return {
    gate: { busy: true, queuedForce: false },
    start: true,
  }
}

export function finishCalendarReload(gate: ReloadGate): { gate: ReloadGate; startForce: boolean } {
  if (!gate.queuedForce) {
    return { gate: { busy: false, queuedForce: false }, startForce: false }
  }
  return { gate: { busy: false, queuedForce: false }, startForce: true }
}
