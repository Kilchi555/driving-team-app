/** Weekly working-hours template stored on tenants.working_days_template */
export interface WorkingDaysTemplate {
  days: number[]
  start_time: string
  end_time: string
  schedule: Record<number, { start: string; end: string }>
}

/**
 * Hardcoded fallbacks when business_type_presets.defaults has no
 * working_days_template yet. Kept in sync with the seed/migration in
 * sql_migrations/20260730_business_type_working_hours.sql.
 */
const WORKING_DAYS_FALLBACKS: Record<string, WorkingDaysTemplate> = {
  driving_school: {
    days: [1, 2, 3, 4, 5, 6],
    start_time: '07:00',
    end_time: '19:00',
    schedule: {
      1: { start: '07:00', end: '19:00' },
      2: { start: '07:00', end: '19:00' },
      3: { start: '07:00', end: '19:00' },
      4: { start: '07:00', end: '19:00' },
      5: { start: '07:00', end: '19:00' },
      6: { start: '08:00', end: '16:00' },
    },
  },
  mental_coach: {
    days: [1, 2, 3, 4, 5],
    start_time: '08:00',
    end_time: '18:00',
    schedule: {
      1: { start: '08:00', end: '18:00' },
      2: { start: '08:00', end: '18:00' },
      3: { start: '08:00', end: '18:00' },
      4: { start: '08:00', end: '18:00' },
      5: { start: '08:00', end: '18:00' },
    },
  },
  consulting: {
    days: [1, 2, 3, 4, 5],
    start_time: '09:00',
    end_time: '17:00',
    schedule: {
      1: { start: '09:00', end: '17:00' },
      2: { start: '09:00', end: '17:00' },
      3: { start: '09:00', end: '17:00' },
      4: { start: '09:00', end: '17:00' },
      5: { start: '09:00', end: '17:00' },
    },
  },
}

function isValidWorkingDaysTemplate(value: unknown): value is WorkingDaysTemplate {
  if (!value || typeof value !== 'object') return false
  const v = value as WorkingDaysTemplate
  return Array.isArray(v.days) && typeof v.start_time === 'string' && typeof v.end_time === 'string' && !!v.schedule
}

/**
 * Pure lookup — safe for client + server. Prefers an explicit template
 * (e.g. from business_type_presets.defaults), else branch fallback, else
 * driving_school.
 */
export function getWorkingDaysTemplateDefaults(
  businessType?: string | null,
  fromPreset?: unknown
): WorkingDaysTemplate {
  if (isValidWorkingDaysTemplate(fromPreset)) {
    return JSON.parse(JSON.stringify(fromPreset))
  }
  const key = businessType && WORKING_DAYS_FALLBACKS[businessType] ? businessType : 'driving_school'
  return JSON.parse(JSON.stringify(WORKING_DAYS_FALLBACKS[key]))
}

/** Convert a WorkingDaysTemplate into the staff-register form shape. */
export function workingDaysTemplateToForm(
  tpl: WorkingDaysTemplate
): Record<number, { active: boolean; start: string; end: string }> {
  const result: Record<number, { active: boolean; start: string; end: string }> = {}
  for (let d = 1; d <= 7; d++) {
    const daySchedule = tpl.schedule?.[d]
    result[d] = {
      active: tpl.days.includes(d),
      start: daySchedule?.start ?? tpl.start_time ?? '09:00',
      end: daySchedule?.end ?? tpl.end_time ?? '17:00',
    }
  }
  return result
}
