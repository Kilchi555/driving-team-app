/**
 * Course category session template normalize / validate / derive.
 *
 * Source of truth for category session shape: session_structure.sessions[].
 * session_count / total_duration_hours are derived compatibility fields.
 * hours_per_session is initializer/seed only (not per-session SoT).
 */

export const COURSE_CATEGORY_SESSION_TEMPLATE_VERSION = 1
export const MIN_CATEGORY_SESSIONS = 1
export const MAX_CATEGORY_SESSIONS = 10
export const MIN_SESSION_DURATION_HOURS = 0.5
export const MAX_SESSION_DURATION_HOURS = 12
export const SESSION_DURATION_STEP_HOURS = 0.5
/**
 * Product max total = MAX_CATEGORY_SESSIONS × MAX_SESSION_DURATION_HOURS (10 × 12 = 120).
 * Matches DECIMAL(5,2) after migration (was DECIMAL(4,2) / 99.99 before flexible templates).
 */
export const MAX_TOTAL_DURATION_HOURS =
  MAX_CATEGORY_SESSIONS * MAX_SESSION_DURATION_HOURS
export const DEFAULT_SEED_HOURS_PER_SESSION = 8

export type CategorySessionTemplateEntry = {
  duration_hours: number
}

export type CategorySessionStructure = {
  version: number
  flexible: true
  description: string
  sessions: CategorySessionTemplateEntry[]
}

export type CategorySessionTemplateInput = {
  session_structure?: unknown
  session_count?: unknown
  hours_per_session?: unknown
  total_duration_hours?: unknown
}

export type CategorySessionTemplateDerived = {
  session_structure: CategorySessionStructure
  session_count: number
  total_duration_hours: number
  /** Last initializer / seed value — NOT per-session SoT when unequal. */
  hours_per_session: number
}

export class CategorySessionTemplateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CategorySessionTemplateError'
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100
}

function isMultipleOfStep(value: number, step: number): boolean {
  const scaled = value / step
  return Math.abs(scaled - Math.round(scaled)) < 1e-9
}

export function formatCategorySessionDescription(durations: number[]): string {
  if (!durations.length) return 'Dauer nicht definiert'
  return durations.map((h) => `${roundHours(h)}h`).join(' + ')
}

export function formatCategorySessionSummary(
  sessions: CategorySessionTemplateEntry[],
): string {
  if (!sessions.length) return 'Dauer nicht definiert'
  const durations = sessions.map((s) => roundHours(s.duration_hours))
  const total = roundHours(durations.reduce((sum, h) => sum + h, 0))
  const allEqual = durations.every((h) => h === durations[0])
  if (allEqual) {
    if (durations.length === 1) return `${durations[0]}h (1 Termin)`
    return `${durations.length} × ${durations[0]}h (${total}h total)`
  }
  return `${formatCategorySessionDescription(durations)} (${total}h)`
}

function coercePositiveNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

function coerceSessionCount(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n)) return fallback
  const rounded = Math.round(n)
  if (rounded < MIN_CATEGORY_SESSIONS) return fallback
  return rounded
}

function parseDurationHours(raw: unknown, label: string): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  if (!Number.isFinite(n)) {
    throw new CategorySessionTemplateError(`Ungültige Dauer bei ${label}`)
  }
  if (n <= 0) {
    throw new CategorySessionTemplateError(`Dauer bei ${label} muss grösser als 0 sein`)
  }
  if (n > MAX_SESSION_DURATION_HOURS) {
    throw new CategorySessionTemplateError(
      `Dauer bei ${label} darf maximal ${MAX_SESSION_DURATION_HOURS}h sein`,
    )
  }
  if (!isMultipleOfStep(n, SESSION_DURATION_STEP_HOURS)) {
    throw new CategorySessionTemplateError(
      `Dauer bei ${label} muss in ${SESSION_DURATION_STEP_HOURS}h-Schritten angegeben werden`,
    )
  }
  return roundHours(n)
}

/** Compatibility / initializer seed — same limits as a single session duration. */
function parseSeedHoursPerSession(raw: unknown, fallback: number): number {
  if (raw === undefined || raw === null || raw === '') {
    return parseDurationHours(fallback, 'Dauer pro Termin (Initial)')
  }
  return parseDurationHours(raw, 'Dauer pro Termin (Initial)')
}

function validateSessionsArray(sessions: CategorySessionTemplateEntry[]): CategorySessionTemplateEntry[] {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    throw new CategorySessionTemplateError('Mindestens ein Termin ist erforderlich')
  }
  if (sessions.length > MAX_CATEGORY_SESSIONS) {
    throw new CategorySessionTemplateError(`Maximal ${MAX_CATEGORY_SESSIONS} Termine erlaubt`)
  }
  return sessions.map((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new CategorySessionTemplateError(`Ungültiger Termineintrag bei Position ${index + 1}`)
    }
    return { duration_hours: parseDurationHours(entry.duration_hours, `Termin ${index + 1}`) }
  })
}

/**
 * Read-only normalize: never mutates DB rows.
 * Legacy `{ flexible, description }` without sessions[] → synthesize from count × hours.
 */
export function normalizeCategorySessionTemplate(
  input: CategorySessionTemplateInput,
): CategorySessionTemplateDerived {
  const seedHours = coercePositiveNumber(input.hours_per_session, DEFAULT_SEED_HOURS_PER_SESSION)
  const legacyCount = coerceSessionCount(input.session_count, MIN_CATEGORY_SESSIONS)

  let rawSessions: unknown
  if (isPlainObject(input.session_structure) && 'sessions' in input.session_structure) {
    rawSessions = input.session_structure.sessions
  }

  let sessions: CategorySessionTemplateEntry[]
  if (Array.isArray(rawSessions) && rawSessions.length > 0) {
    sessions = validateSessionsArray(
      rawSessions.map((entry) => {
        if (!isPlainObject(entry)) {
          throw new CategorySessionTemplateError('Ungültiges Session-Template')
        }
        return { duration_hours: entry.duration_hours as number }
      }),
    )
  } else {
    const count = Math.min(Math.max(legacyCount, MIN_CATEGORY_SESSIONS), MAX_CATEGORY_SESSIONS)
    const duration = parseDurationHours(seedHours, 'Dauer pro Termin (Initial)')
    sessions = Array.from({ length: count }, () => ({ duration_hours: duration }))
  }

  const session_count = sessions.length
  const total_duration_hours = roundHours(
    sessions.reduce((sum, s) => sum + s.duration_hours, 0),
  )
  if (total_duration_hours > MAX_TOTAL_DURATION_HOURS) {
    throw new CategorySessionTemplateError(
      `Gesamtdauer darf maximal ${MAX_TOTAL_DURATION_HOURS}h betragen`,
    )
  }

  // Seed/compat only — never SoT when sessions[] is present, but must still be valid.
  const hours_per_session = parseSeedHoursPerSession(
    input.hours_per_session,
    sessions[0]?.duration_hours ?? DEFAULT_SEED_HOURS_PER_SESSION,
  )

  const session_structure: CategorySessionStructure = {
    version: COURSE_CATEGORY_SESSION_TEMPLATE_VERSION,
    flexible: true,
    description: formatCategorySessionDescription(sessions.map((s) => s.duration_hours)),
    sessions,
  }

  return {
    session_structure,
    session_count,
    total_duration_hours,
    hours_per_session,
  }
}

/** Build equal-length template from initializer (N × hours). */
export function buildUniformCategorySessionTemplate(
  sessionCount: number,
  hoursPerSession: number,
): CategorySessionTemplateDerived {
  return normalizeCategorySessionTemplate({
    session_count: sessionCount,
    hours_per_session: hoursPerSession,
    session_structure: { flexible: true, sessions: [] },
  })
}

/**
 * True when the current template differs from a uniform N × hours initializer result.
 * Used to require explicit confirm before reset.
 */
export function isCustomizedRelativeToInitializer(
  sessions: CategorySessionTemplateEntry[],
  sessionCount: number,
  hoursPerSession: number,
): boolean {
  if (!sessions.length) return false
  const uniform = buildUniformCategorySessionTemplate(sessionCount, hoursPerSession).session_structure.sessions
  if (sessions.length !== uniform.length) return true
  return sessions.some((s, i) => roundHours(s.duration_hours) !== roundHours(uniform[i].duration_hours))
}
