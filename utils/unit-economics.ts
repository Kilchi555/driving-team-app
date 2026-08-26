export type EconomicsCategory = string

export type EconomicsResource = {
  code: string
  label: string
  quantity: number
}

export type ResourceRate = {
  resource_code: string
  fixed_monthly_chf: number
  variable_per_hour_chf: number
  valid_from: string
}

export type EconomicsLine = {
  code: string
  label: string
  match_codes: string[]
  resource_code: string | null
  idle_resource_code: string | null
  expected_hours: number
  target_hours_per_month: number | null
  campaign_pattern: string
  cac_override: number | null
}

export type CampaignPattern = {
  category: string
  pattern: string
}

export type UnitEconomicsSettings = {
  labor_brutto_per_hour_chf: number
  employer_load: number
  pensum_hours_100: number
  cac_safety_factor: number
  /** Miete, Sekretariat, Treuhänder — fliesst in den CAC-Deckel, nicht in DB I. */
  overhead_monthly_chf: number
  /** 0.10 = 10 % Gewinnziel vom erwarteten Umsatz pro Neukunde. */
  profit_margin_target: number
  /** Wenn gesetzt: Büroanteil = overhead / diese Zahl. Sonst aus Soll-Stunden. */
  expected_new_clients_per_month: number | null
  /** Leer = Branchen-Preset bzw. alle produktiven Event-Typen. */
  new_customer_event_codes: string[]
  resources: EconomicsResource[]
  rates: ResourceRate[]
  lines: EconomicsLine[]
}

export type CatalogKind = 'category' | 'event_type'

export type CatalogItem = {
  code: string
  name: string
  kind?: CatalogKind
  parent_code?: string | null
}

/** Internal calendar codes that never get their own cost line. */
export const ECONOMICS_SKIP_EVENT_CODES = new Set([
  'vacation',
  'meeting',
  'staff_meeting',
  'admin',
  'maintenance',
  'training',
  'break',
])

const CATEGORY_PRICED_EVENT_CODES = new Set(['lesson', 'exam', 'theory', 'consultation'])

export function isAssignableEventType(code: string, businessType: string): boolean {
  if (!code || ECONOMICS_SKIP_EVENT_CODES.has(code)) return false
  if (businessType === 'driving_school' && CATEGORY_PRICED_EVENT_CODES.has(code)) return false
  return true
}

export function isCatalogMain(item: CatalogItem): boolean {
  return item.kind === 'event_type' || !item.parent_code
}

export function categoryFamilyCodes(item: CatalogItem, catalog: CatalogItem[]): string[] {
  if (item.kind === 'event_type') return [item.code]
  const root = item.parent_code || item.code
  return [
    root,
    ...catalog.filter(c => c.kind !== 'event_type' && c.parent_code === root).map(c => c.code),
  ]
}

export function expandFamilyCodes(codes: string[], catalog: CatalogItem[]): string[] {
  const out = new Set(codes)
  for (const code of codes) {
    for (const child of catalog.filter(c => c.parent_code === code)) out.add(child.code)
  }
  return [...out]
}

/** Saved lines often only store the main code (B). Children like B Automatik must still count. */
export function withExpandedMatchCodes(
  settings: UnitEconomicsSettings,
  catalog: CatalogItem[],
): UnitEconomicsSettings {
  if (!catalog.length) return settings
  return {
    ...settings,
    lines: settings.lines.map(line => ({
      ...line,
      match_codes: expandFamilyCodes(line.match_codes, catalog),
    })),
  }
}

export function buildEconomicsCatalog(input: {
  businessType: string
  categories: Array<{
    id?: string | number | null
    code?: string | null
    name?: string | null
    parent_category_id?: string | number | null
    parent_code?: string | null
  }>
  eventTypes: Array<{ code?: string | null; name?: string | null }>
}): {
  items: CatalogItem[]
  pricing_mode: 'per_category' | 'per_event_type' | 'mixed'
} {
  const raw = input.categories.map(c => ({
    id: c.id,
    parent_category_id: c.parent_category_id,
    parent_code: c.parent_code ? String(c.parent_code) : null,
    code: String(c.code || '').trim(),
    name: String(c.name || c.code || '').trim(),
  })).filter(c => c.code)
  const byId = new Map(raw.filter(c => c.id != null).map(c => [String(c.id), c]))
  const categories: CatalogItem[] = raw.map(c => {
    const parent = c.parent_code
      || (c.parent_category_id != null ? byId.get(String(c.parent_category_id))?.code : null)
      || null
    return {
      kind: 'category' as const,
      code: c.code,
      name: c.name,
      parent_code: parent && parent !== c.code ? parent : null,
    }
  })
  const eventTypes: CatalogItem[] = input.eventTypes
    .map(e => ({ kind: 'event_type' as const, code: String(e.code || '').trim(), name: String(e.name || e.code || '').trim() }))
    .filter(e => isAssignableEventType(e.code, input.businessType))
  const items = [...categories, ...eventTypes]
  const pricing_mode = categories.length && eventTypes.length
    ? 'mixed'
    : eventTypes.length
      ? 'per_event_type'
      : 'per_category'
  return { items, pricing_mode }
}

const DEFAULT_CAMPAIGN_PATTERNS: CampaignPattern[] = [
  { category: 'LKW', pattern: 'lkw|lastwagen|c1|\\bce\\b|kat\\.?\\s*c' },
  { category: 'Boot', pattern: 'boot|schiff|motorboot' },
]

export const DRIVING_SCHOOL_TEMPLATE: UnitEconomicsSettings = {
  labor_brutto_per_hour_chf: 56,
  employer_load: 0.16,
  pensum_hours_100: 135,
  cac_safety_factor: 0.4,
  overhead_monthly_chf: 0,
  profit_margin_target: 0,
  expected_new_clients_per_month: null,
  new_customer_event_codes: [],
  resources: [
    { code: 'car', label: 'Auto', quantity: 3 },
    { code: 'boat', label: 'Boot', quantity: 1 },
    { code: 'lkw', label: 'Lastwagen', quantity: 1 },
  ],
  rates: [
    { resource_code: 'car', fixed_monthly_chf: 1300, variable_per_hour_chf: 3.5, valid_from: '2026-01-01' },
    { resource_code: 'boat', fixed_monthly_chf: 1300, variable_per_hour_chf: 3.5, valid_from: '2026-01-01' },
    { resource_code: 'boat', fixed_monthly_chf: 300, variable_per_hour_chf: 3.5, valid_from: '2026-09-01' },
    { resource_code: 'lkw', fixed_monthly_chf: 4000, variable_per_hour_chf: 13, valid_from: '2026-01-01' },
    { resource_code: 'lkw', fixed_monthly_chf: 1000, variable_per_hour_chf: 13, valid_from: '2026-11-01' },
  ],
  lines: [
    {
      code: 'B',
      label: 'Personenwagen (B)',
      match_codes: ['B'],
      resource_code: 'car',
      idle_resource_code: null,
      expected_hours: 12,
      target_hours_per_month: null,
      campaign_pattern: '',
      cac_override: null,
    },
    {
      code: 'Boot',
      label: 'Boot',
      match_codes: ['Boot', 'Motorboot'],
      resource_code: 'boat',
      idle_resource_code: 'car',
      expected_hours: 11,
      target_hours_per_month: 67.5,
      campaign_pattern: 'boot|schiff|motorboot',
      cac_override: null,
    },
    {
      code: 'LKW',
      label: 'Lastwagen',
      match_codes: ['C', 'C1', 'C1/D1', 'CE', 'D', 'D1'],
      resource_code: 'lkw',
      idle_resource_code: 'car',
      expected_hours: 9,
      target_hours_per_month: 54,
      campaign_pattern: 'lkw|lastwagen|c1|\\bce\\b|kat\\.?\\s*c',
      cac_override: null,
    },
  ],
}

function num(value: unknown, fallback: number, min?: number, max?: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  if (min != null && n < min) return fallback
  if (max != null && n > max) return fallback
  return n
}

function dateOnly(value: unknown): string | null {
  const raw = String(value || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  return raw
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'item'
}

function parseResource(row: unknown): EconomicsResource | null {
  if (!row || typeof row !== 'object') return null
  const item = row as Record<string, unknown>
  const code = slug(String(item.code || item.label || ''))
  if (!code) return null
  return {
    code,
    label: String(item.label || code).slice(0, 60),
    quantity: Math.round(num(item.quantity, 1, 1, 50)),
  }
}

function parseRate(row: unknown): ResourceRate | null {
  if (!row || typeof row !== 'object') return null
  const item = row as Record<string, unknown>
  const resource = slug(String(item.resource_code || item.vehicle || ''))
  const validFrom = dateOnly(item.valid_from)
  if (!resource || !validFrom) return null
  return {
    resource_code: resource,
    fixed_monthly_chf: num(item.fixed_monthly_chf, 0, 0, 50_000),
    variable_per_hour_chf: num(item.variable_per_hour_chf, 0, 0, 500),
    valid_from: validFrom,
  }
}

function parseLine(row: unknown): EconomicsLine | null {
  if (!row || typeof row !== 'object') return null
  const item = row as Record<string, unknown>
  const code = String(item.code || '').trim().slice(0, 40)
  if (!code) return null
  const match = Array.isArray(item.match_codes)
    ? item.match_codes.map(v => String(v || '').trim()).filter(Boolean)
    : []
  return {
    code,
    label: String(item.label || code).slice(0, 80),
    match_codes: match.length ? match : [code],
    resource_code: item.resource_code ? slug(String(item.resource_code)) : null,
    idle_resource_code: item.idle_resource_code ? slug(String(item.idle_resource_code)) : null,
    expected_hours: num(item.expected_hours, 10, 1, 80),
    target_hours_per_month: item.target_hours_per_month == null || item.target_hours_per_month === ''
      ? null
      : num(item.target_hours_per_month, 0, 0, 400) || null,
    campaign_pattern: String(item.campaign_pattern || '').trim().slice(0, 80),
    cac_override: item.cac_override == null || item.cac_override === ''
      ? null
      : Math.round(num(item.cac_override, 0, 0, 2000)) || null,
  }
}

function migrateLegacy(src: Record<string, unknown>): Partial<UnitEconomicsSettings> {
  const rates = Array.isArray(src.rates) ? src.rates.map(parseRate).filter(Boolean) as ResourceRate[] : []
  if (!rates.length || Array.isArray(src.resources) || Array.isArray(src.lines)) return {}
  const hours = src.expected_lesson_hours && typeof src.expected_lesson_hours === 'object'
    ? src.expected_lesson_hours as Record<string, unknown>
    : {}
  const target = src.target_hours_per_month && typeof src.target_hours_per_month === 'object'
    ? src.target_hours_per_month as Record<string, unknown>
    : {}
  const override = src.cac_override && typeof src.cac_override === 'object'
    ? src.cac_override as Record<string, unknown>
    : {}
  const patterns = Array.isArray(src.campaign_patterns) ? src.campaign_patterns as CampaignPattern[] : DEFAULT_CAMPAIGN_PATTERNS
  const template = structuredClone(DRIVING_SCHOOL_TEMPLATE)
  template.resources = template.resources.map(r =>
    r.code === 'car' ? { ...r, quantity: Math.round(num(src.car_count, r.quantity, 1, 50)) } : r,
  )
  template.rates = rates.length ? rates : template.rates
  template.lines = template.lines.map((line) => ({
    ...line,
    expected_hours: num(hours[line.code], line.expected_hours, 1, 80),
    target_hours_per_month: target[line.code] == null ? line.target_hours_per_month : num(target[line.code], 0, 0, 400) || null,
    cac_override: override[line.code] == null ? null : Math.round(num(override[line.code], 0, 0, 2000)) || null,
    campaign_pattern: patterns.find(p => p.category === line.code)?.pattern || line.campaign_pattern,
  }))
  return template
}

export function parseUnitEconomicsSettings(raw: unknown): UnitEconomicsSettings {
  const src = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const migrated = migrateLegacy(src)
  const resources = Array.isArray(src.resources)
    ? src.resources.map(parseResource).filter(Boolean) as EconomicsResource[]
    : migrated.resources ?? []
  const rates = Array.isArray(src.rates)
    ? src.rates.map(parseRate).filter(Boolean) as ResourceRate[]
    : migrated.rates ?? []
  const lines = Array.isArray(src.lines)
    ? src.lines.map(parseLine).filter(Boolean) as EconomicsLine[]
    : migrated.lines ?? []

  const tenantCodes = Array.isArray(src.new_customer_event_codes)
    ? src.new_customer_event_codes.map(v => String(v || '').trim()).filter(Boolean)
    : []

  return {
    labor_brutto_per_hour_chf: num(src.labor_brutto_per_hour_chf, 56, 1, 200),
    employer_load: num(src.employer_load, 0.16, 0, 0.5),
    pensum_hours_100: num(src.pensum_hours_100, 135, 20, 300),
    cac_safety_factor: num(src.cac_safety_factor, 0.4, 0.1, 1),
    overhead_monthly_chf: num(src.overhead_monthly_chf, 0, 0, 500_000),
    profit_margin_target: num(src.profit_margin_target, 0, 0, 0.5),
    expected_new_clients_per_month: src.expected_new_clients_per_month == null || src.expected_new_clients_per_month === ''
      ? null
      : Math.round(num(src.expected_new_clients_per_month, 0, 0, 2000)) || null,
    new_customer_event_codes: tenantCodes,
    resources,
    rates,
    lines,
  }
}

export function hasCostRates(settings: UnitEconomicsSettings): boolean {
  return settings.lines.length > 0
}

export function laborCostPerHour(settings: UnitEconomicsSettings): number {
  return settings.labor_brutto_per_hour_chf * (1 + settings.employer_load)
}

export function campaignPatternsFromSettings(settings: UnitEconomicsSettings): CampaignPattern[] {
  return settings.lines
    .filter(l => l.campaign_pattern)
    .map(l => ({ category: l.code, pattern: l.campaign_pattern }))
}

/** Unmatched ad names land here — the line without a pattern, else the first line. */
export function defaultEconomicsCategory(settings: UnitEconomicsSettings): string {
  return settings.lines.find(l => !l.campaign_pattern)?.code
    || settings.lines[0]?.code
    || 'other'
}

/** Office cost per new client. 0 if overhead or volume is missing — do not invent a split. */
export function overheadPerClientChf(settings: UnitEconomicsSettings): number {
  const overhead = settings.overhead_monthly_chf || 0
  if (overhead <= 0) return 0
  if (settings.expected_new_clients_per_month && settings.expected_new_clients_per_month > 0) {
    return overhead / settings.expected_new_clients_per_month
  }
  const fromTargets = settings.lines.reduce((sum, line) => {
    if (line.target_hours_per_month && line.expected_hours > 0) {
      return sum + line.target_hours_per_month / line.expected_hours
    }
    return sum
  }, 0)
  return fromTargets > 0 ? overhead / fromTargets : 0
}

export function pickResourceRate(
  rates: ResourceRate[],
  resourceCode: string,
  asOf: string,
): ResourceRate | null {
  const eligible = rates
    .filter(r => r.resource_code === resourceCode && r.valid_from <= asOf)
    .sort((a, b) => a.valid_from.localeCompare(b.valid_from))
  return eligible.at(-1) ?? null
}

/** @deprecated use pickResourceRate */
export const pickVehicleRate = pickResourceRate

export function upcomingRateDates(rates: ResourceRate[], asOf: string): string[] {
  return [...new Set(rates.map(r => r.valid_from))]
    .filter(d => d > asOf)
    .sort()
}

export function classifyAppointmentType(
  type: string | null | undefined,
  lines: EconomicsLine[],
  eventTypeCode?: string | null,
): string | 'other' {
  const typeVal = String(type || '').trim()
  const eventVal = String(eventTypeCode || '').trim()
  if (typeVal) {
    for (const line of lines) {
      if (line.match_codes.includes(typeVal)) return line.code
    }
  }
  if (eventVal) {
    for (const line of lines) {
      if (line.match_codes.includes(eventVal)) return line.code
    }
  }
  return 'other'
}

export function inferCampaignCategory(
  campaignName: string,
  patterns: CampaignPattern[] = DEFAULT_CAMPAIGN_PATTERNS,
  fallback = 'other',
): string {
  const list = patterns?.length ? patterns : []
  const name = campaignName || ''
  for (const row of list) {
    if (!row.pattern) continue
    try {
      if (new RegExp(row.pattern, 'i').test(name)) return row.category
    } catch {
      continue
    }
  }
  return list.find(row => !row.pattern)?.category || fallback
}

export type StaffMixHours = {
  staff_id: string
  hours: Record<string, number>
}

export function allocateResourceFixed(params: {
  staff: StaffMixHours[]
  lines: EconomicsLine[]
  resource_fixed_period: Record<string, number>
  resource_quantity: Record<string, number>
}): Record<string, number> {
  const allocated: Record<string, number> = {}
  for (const line of params.lines) allocated[line.code] = 0

  const resourceCodes = Object.keys(params.resource_fixed_period)
  for (const resource of resourceCodes) {
    const totalFixed = params.resource_fixed_period[resource] || 0
    const quantity = Math.max(1, params.resource_quantity[resource] || 1)
    const useLines = params.lines.filter(l => l.resource_code === resource)
    const idleLines = params.lines.filter(l => l.idle_resource_code === resource)
    if (!useLines.length && !idleLines.length) continue

    if (!idleLines.length) {
      const useHours = useLines.reduce((s, l) => s + params.staff.reduce((a, st) => a + (st.hours[l.code] || 0), 0), 0)
      for (const line of useLines) {
        const h = params.staff.reduce((a, st) => a + (st.hours[line.code] || 0), 0)
        allocated[line.code] += useHours > 0 ? totalFixed * (h / useHours) : totalFixed / useLines.length
      }
      continue
    }

    const unit = totalFixed / quantity
    const mixed = params.staff
      .map((s) => {
        const useH = useLines.reduce((n, l) => n + (s.hours[l.code] || 0), 0)
        const idleH = idleLines.reduce((n, l) => n + (s.hours[l.code] || 0), 0)
        return { ...s, useH, idleH, total: useH + idleH }
      })
      .filter(s => s.useH > 0 && s.idleH > 0 && s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, quantity)

    for (const s of mixed) {
      for (const line of [...useLines, ...idleLines]) {
        allocated[line.code] += unit * ((s.hours[line.code] || 0) / s.total)
      }
    }
    const pool = Math.max(0, quantity - mixed.length) * unit
    const useHours = useLines.reduce((s, l) => s + params.staff.reduce((a, st) => a + (st.hours[l.code] || 0), 0), 0)
    for (const line of useLines) {
      const h = params.staff.reduce((a, st) => a + (st.hours[line.code] || 0), 0)
      allocated[line.code] += useHours > 0 ? pool * (h / useHours) : pool / useLines.length
    }
  }
  return allocated
}

/** @deprecated */
export function allocateVehicleFixed(params: {
  staff: Array<{ staff_id: string; B: number; BE: number; Boot: number; LKW: number }>
  car_count: number
  car_fixed_period_chf: number
  boat_fixed_period_chf: number
  lkw_fixed_period_chf: number
}): Record<string, number> {
  return allocateResourceFixed({
    staff: params.staff.map(s => ({
      staff_id: s.staff_id,
      hours: { B: s.B + s.BE, Boot: s.Boot, LKW: s.LKW },
    })),
    lines: DRIVING_SCHOOL_TEMPLATE.lines,
    resource_fixed_period: {
      car: params.car_fixed_period_chf,
      boat: params.boat_fixed_period_chf,
      lkw: params.lkw_fixed_period_chf,
    },
    resource_quantity: { car: params.car_count, boat: 1, lkw: 1 },
  })
}

export type CategoryLineInput = {
  hours: number
  theory_hours: number
  revenue_chf: number
  variable_per_hour_chf: number
  fixed_chf: number
  labor_per_hour_chf: number
  period_months: number
}

export type CategoryLine = {
  hours: number
  theory_hours: number
  revenue_chf: number
  labor_chf: number
  variable_chf: number
  fixed_chf: number
  cost_chf: number
  db_chf: number
  cost_per_hour_chf: number | null
  revenue_per_hour_chf: number | null
  db_per_hour_chf: number | null
  break_even_hours_per_month: number | null
}

export function buildCategoryLine(input: CategoryLineInput): CategoryLine {
  const hours = input.hours
  const labor = (hours + input.theory_hours) * input.labor_per_hour_chf
  const variable = hours * input.variable_per_hour_chf
  const cost = labor + variable + input.fixed_chf
  const db = input.revenue_chf - cost
  const revenuePerHour = hours > 0 ? input.revenue_chf / hours : null
  const costPerHour = hours > 0 ? (cost - input.theory_hours * input.labor_per_hour_chf) / hours : null
  const dbPerHour = hours > 0 ? db / hours : null
  const months = input.period_months > 0 ? input.period_months : 1
  const contrib = (revenuePerHour ?? 0) - input.labor_per_hour_chf - input.variable_per_hour_chf
  const fixedMonthly = input.fixed_chf / months + (input.theory_hours * input.labor_per_hour_chf) / months
  const breakEven = contrib > 0 ? fixedMonthly / contrib : null
  return {
    hours,
    theory_hours: input.theory_hours,
    revenue_chf: input.revenue_chf,
    labor_chf: labor,
    variable_chf: variable,
    fixed_chf: input.fixed_chf,
    cost_chf: cost,
    db_chf: db,
    cost_per_hour_chf: costPerHour,
    revenue_per_hour_chf: revenuePerHour,
    db_per_hour_chf: dbPerHour,
    break_even_hours_per_month: breakEven,
  }
}

export function suggestedMaxCac(params: {
  db_per_hour_chf: number | null
  expected_hours: number
  safety_factor: number
  override?: number | null
  incremental_db_per_hour_chf?: number | null
  overhead_per_client_chf?: number
  revenue_per_client_chf?: number
  profit_margin_target?: number
}): { max_cac_chf: number | null; source: 'formula' | 'override' | 'negative' } {
  if (params.override != null && params.override > 0) {
    return { max_cac_chf: Math.round(params.override), source: 'override' }
  }
  const useContribution = (params.overhead_per_client_chf || 0) > 0 || (params.profit_margin_target || 0) > 0
  if (useContribution) {
    const inc = params.incremental_db_per_hour_chf ?? params.db_per_hour_chf
    if (inc == null || inc <= 0) {
      return { max_cac_chf: null, source: 'negative' }
    }
    const leftover = inc * params.expected_hours
      - (params.overhead_per_client_chf || 0)
      - (params.revenue_per_client_chf || 0) * (params.profit_margin_target || 0)
    if (leftover <= 0) {
      return { max_cac_chf: null, source: 'negative' }
    }
    return {
      max_cac_chf: Math.max(0, Math.round(leftover * params.safety_factor)),
      source: 'formula',
    }
  }
  if (params.db_per_hour_chf == null || params.db_per_hour_chf <= 0) {
    return { max_cac_chf: null, source: 'negative' }
  }
  return {
    max_cac_chf: Math.max(0, Math.round(params.db_per_hour_chf * params.expected_hours * params.safety_factor)),
    source: 'formula',
  }
}

export function incrementalDbPerHour(revenuePerHour: number | null, laborPerHour: number, variablePerHour: number): number | null {
  if (revenuePerHour == null) return null
  return revenuePerHour - laborPerHour - variablePerHour
}

/** Expected contribution from a new customer — not the first lesson, not Max-CAC. */
export function expectedNewCustomerDbChf(params: {
  incremental_db_per_hour_chf: number | null
  db_per_hour_chf: number | null
  expected_hours: number
}): number | null {
  const perHour = params.incremental_db_per_hour_chf ?? params.db_per_hour_chf
  if (perHour == null || perHour <= 0 || !(params.expected_hours > 0)) return null
  return Number((perHour * params.expected_hours).toFixed(2))
}

export function periodMonthsFromDays(days: number): number {
  return days / 30.4375
}

function extraLine(item: CatalogItem, expectedHours: number, catalog: CatalogItem[] = []): EconomicsLine {
  return {
    code: item.code,
    label: item.name || item.code,
    match_codes: categoryFamilyCodes(item, catalog),
    resource_code: null,
    idle_resource_code: null,
    expected_hours: expectedHours,
    target_hours_per_month: null,
    campaign_pattern: item.code.toLowerCase(),
    cac_override: null,
  }
}

export function suggestEconomicsSetup(input: {
  businessType: string
  categories: CatalogItem[]
  eventTypes?: CatalogItem[]
}): UnitEconomicsSettings {
  const eventTypes = (input.eventTypes ?? []).filter(e => isAssignableEventType(e.code, input.businessType))
  const catalog = [...input.categories, ...eventTypes]
  if (input.businessType === 'driving_school') {
    const codes = new Set(input.categories.map(c => c.code))
    const template = structuredClone(DRIVING_SCHOOL_TEMPLATE)
    template.lines = template.lines
      .map(line => ({
        ...line,
        match_codes: expandFamilyCodes(line.match_codes, input.categories)
          .filter(code => codes.has(code) || !input.categories.length),
      }))
      .filter(line => line.match_codes.length > 0 || !input.categories.length)
    const leftovers = [
      ...input.categories.filter(c => isCatalogMain(c) && !template.lines.some(l => l.match_codes.includes(c.code))),
      ...eventTypes.filter(e => !template.lines.some(l => l.match_codes.includes(e.code))),
    ]
    for (const extra of leftovers) template.lines.push(extraLine(extra, 10, catalog))
    return template
  }

  const mains = eventTypes.length
    ? [...eventTypes, ...input.categories.filter(c => isCatalogMain(c) && !eventTypes.some(e => e.code === c.code))]
    : input.categories.filter(isCatalogMain)
  return {
    labor_brutto_per_hour_chf: 56,
    employer_load: 0.16,
    pensum_hours_100: 160,
    cac_safety_factor: 0.4,
    overhead_monthly_chf: 0,
    profit_margin_target: 0,
    expected_new_clients_per_month: null,
    new_customer_event_codes: [],
    resources: [],
    rates: [],
    lines: mains.map(item => extraLine(item, 8, catalog)),
  }
}

export function emptyHoursMap(lines: EconomicsLine[]): Record<string, number> {
  return Object.fromEntries(lines.map(l => [l.code, 0]))
}

export function countByEconomicsLine(
  rows: Array<{ type?: string | null; event_type_code?: string | null }>,
  lines: EconomicsLine[],
): Array<{ code: string; label: string; count: number }> {
  if (!lines.length) {
    const raw = new Map<string, number>()
    for (const row of rows) {
      const key = String(row.type || row.event_type_code || 'Weitere').trim() || 'Weitere'
      raw.set(key, (raw.get(key) || 0) + 1)
    }
    return [...raw.entries()].map(([code, count]) => ({ code, label: code, count }))
  }
  const counts = new Map<string, { code: string; label: string; count: number }>()
  for (const line of lines) counts.set(line.code, { code: line.code, label: line.label, count: 0 })
  let other = 0
  for (const row of rows) {
    const code = classifyAppointmentType(row.type, lines, row.event_type_code)
    const hit = counts.get(code)
    if (hit) hit.count += 1
    else other += 1
  }
  const out = [...counts.values()].filter(row => row.count > 0)
  if (other > 0) out.push({ code: 'other', label: 'Weitere', count: other })
  return out
}

const MONTH_LABELS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export type YearMonthWindow = {
  key: string
  year: number
  month: number
  label: string
  short_label: string
  from: string
  to: string
  days: number
  is_future: boolean
}

export function yearMonthWindows(asOf: string): YearMonthWindow[] {
  const year = Number(asOf.slice(0, 4))
  const currentMonth = Number(asOf.slice(5, 7))
  if (!year || !currentMonth) return []
  const out: YearMonthWindow[] = []
  for (let month = 1; month <= 12; month++) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
    const isFuture = from > asOf
    const to = isFuture ? monthEnd : (month === currentMonth ? asOf : monthEnd)
    const days = Math.round(
      (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000,
    ) + 1
    out.push({
      key: from.slice(0, 7),
      year,
      month,
      label: `${MONTH_LABELS_DE[month - 1]} ${year}`,
      short_label: MONTH_LABELS_DE[month - 1],
      from,
      to,
      days: isFuture ? last : days,
      is_future: isFuture,
    })
  }
  return out
}
