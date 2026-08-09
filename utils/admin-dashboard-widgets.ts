// Shared admin dashboard widget registry + layout helpers

export type DashboardWidgetId =
  | 'revenue_month'
  | 'week'
  | 'pending'
  | 'hours'
  | 'courses'
  | 'revenue_chart'
  | 'pending_list'
  | 'quick_actions'
  | 'activities'
  | 'credits'
  | 'cancellations'

export type DashboardWidgetZone = 'kpi' | 'mid' | 'actions' | 'bottom'

export interface DashboardWidgetDef {
  id: DashboardWidgetId
  label: string
  zone: DashboardWidgetZone
  defaultOn: boolean
}

export const DASHBOARD_WIDGETS: DashboardWidgetDef[] = [
  { id: 'revenue_month', label: 'Umsatz (Monat)', zone: 'kpi', defaultOn: true },
  { id: 'week', label: 'Woche', zone: 'kpi', defaultOn: true },
  { id: 'pending', label: 'Ausstehend', zone: 'kpi', defaultOn: true },
  { id: 'hours', label: 'Stunden heute', zone: 'kpi', defaultOn: true },
  { id: 'courses', label: 'Kurse', zone: 'kpi', defaultOn: true },
  { id: 'revenue_chart', label: 'Umsatz-Verlauf', zone: 'mid', defaultOn: true },
  { id: 'pending_list', label: 'Ausstehend (Liste)', zone: 'mid', defaultOn: true },
  { id: 'quick_actions', label: 'Schnellzugriff', zone: 'actions', defaultOn: true },
  { id: 'activities', label: 'Letzte Aktivitäten', zone: 'bottom', defaultOn: true },
  { id: 'credits', label: 'Guthaben', zone: 'bottom', defaultOn: true },
  { id: 'cancellations', label: 'Absagen', zone: 'bottom', defaultOn: true },
]

export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetId[] = DASHBOARD_WIDGETS
  .filter(w => w.defaultOn)
  .map(w => w.id)

const VALID = new Set(DASHBOARD_WIDGETS.map(w => w.id))

/** Normalize saved layout: keep known ids, drop dupes, optionally append missing defaults. */
export function normalizeDashboardLayout(
  input: unknown,
  opts?: { fillMissingDefaults?: boolean },
): DashboardWidgetId[] {
  const fill = opts?.fillMissingDefaults !== false
  const raw = Array.isArray(input) ? input : []
  const seen = new Set<string>()
  const out: DashboardWidgetId[] = []

  for (const id of raw) {
    if (typeof id !== 'string' || !VALID.has(id as DashboardWidgetId) || seen.has(id)) continue
    seen.add(id)
    out.push(id as DashboardWidgetId)
  }

  if (fill) {
    for (const id of DEFAULT_DASHBOARD_LAYOUT) {
      if (!seen.has(id)) {
        seen.add(id)
        out.push(id)
      }
    }
  }

  return out.length ? out : [...DEFAULT_DASHBOARD_LAYOUT]
}

export function widgetDef(id: DashboardWidgetId): DashboardWidgetDef | undefined {
  return DASHBOARD_WIDGETS.find(w => w.id === id)
}
