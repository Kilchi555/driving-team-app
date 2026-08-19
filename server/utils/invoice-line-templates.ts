import { filterLeafCategories } from '~/server/utils/category-groups'
import { resolveEventTypeLabel, type Terminology } from '~/server/utils/tenant-terminology'
import type { InvoiceLineTemplate } from '~/utils/invoice-line-templates'
import {
  formatCourseSessionLine,
  formatCourseSessionsDescription,
  sortCourseSessionsByStart,
} from '~/utils/format-course-sessions'

export type {
  InvoiceLineTemplate,
  InvoiceLineTemplateGroup,
  InvoiceLineTemplateKind,
} from '~/utils/invoice-line-templates'
export { filterInvoiceLineTemplates, groupInvoiceLineTemplates } from '~/utils/invoice-line-templates'

/** Event types that are typically not billed on invoices. */
export const UNBILLED_EVENT_TYPE_CODES = new Set([
  'break',
  'staff_meeting',
  'meeting',
  'maintenance',
  'admin',
])

export interface InvoiceLineTemplateCategory {
  id: string | number
  code: string
  name?: string | null
  parent_category_id?: string | number | null
  is_active?: boolean | null
}

export interface InvoiceLineTemplateRule {
  category_code?: string | null
  event_type_code?: string | null
  rule_type?: string | null
  price_per_minute_rappen?: number | null
  base_duration_minutes?: number | null
  theory_price_per_minute_rappen?: number | null
  theory_base_duration_minutes?: number | null
  consultation_price_per_minute_rappen?: number | null
  consultation_base_duration_minutes?: number | null
}

export interface InvoiceLineTemplateEventType {
  code: string
  name?: string | null
  default_duration_minutes?: number | null
  default_price_rappen?: number | null
  is_active?: boolean | null
}

export interface InvoiceLineTemplateCourseCategory {
  id: string
  name?: string | null
  default_price_rappen?: number | null
  is_active?: boolean | null
}

export interface InvoiceLineTemplateCourseSession {
  session_number?: number | null
  start_time?: string | null
  end_time?: string | null
  individual_price_rappen?: number | null
  allow_individual_booking?: boolean | null
}

export interface InvoiceLineTemplateCourse {
  id: string
  name?: string | null
  description?: string | null
  course_start_date?: string | null
  price_per_participant_rappen?: number | null
  course_category_id?: string | null
  course_category?: { name?: string | null; default_price_rappen?: number | null } | null
  sessions?: InvoiceLineTemplateCourseSession[] | null
  course_sessions?: InvoiceLineTemplateCourseSession[] | null
  is_active?: boolean | null
  status?: string | null
}

export interface InvoiceLineTemplateProduct {
  id: string
  name?: string | null
  description?: string | null
  price_rappen?: number | null
  is_active?: boolean | null
}

export interface BuildInvoiceLineTemplatesInput {
  terms?: Pick<Terminology, 'appointment'> | null
  categories?: InvoiceLineTemplateCategory[]
  pricingRules?: InvoiceLineTemplateRule[]
  eventTypes?: InvoiceLineTemplateEventType[]
  courseCategories?: InvoiceLineTemplateCourseCategory[]
  courses?: InvoiceLineTemplateCourse[]
  products?: InvoiceLineTemplateProduct[]
}

function minutesLabel(minutes: number): string {
  return `${minutes} Min`
}

function categoryLabel(cat: InvoiceLineTemplateCategory): string {
  const name = String(cat.name || '').trim()
  const code = String(cat.code || '').trim()
  if (name && code && name !== code) return `${name}`
  return name || code || 'Kategorie'
}

function ruleMinutes(rule: InvoiceLineTemplateRule | undefined, fallback: number): number {
  const n = Number(rule?.base_duration_minutes)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function rulePpm(rule: InvoiceLineTemplateRule | undefined): number {
  return Number(rule?.price_per_minute_rappen) || 0
}

/**
 * List price for a configured block (e.g. 45-min Theorie).
 * Prices are stored as CHF-per-block / minutes (often 85 / 45 = 188.8889 Rp.).
 * Older rows were truncated to 188 → 188×45 = 84.60. The category admin shows
 * Math.round(ppm/100 * minutes) so those still appear as CHF 85.— match that.
 */
function priceFromPpm(ppm: number, minutes: number): number {
  if (!ppm || !minutes) return 0
  return Math.round((ppm / 100) * minutes) * 100
}

function rulesForCategory(rules: InvoiceLineTemplateRule[], code: string): InvoiceLineTemplateRule[] {
  return rules.filter((r) => String(r.category_code || '') === code)
}

function findRule(
  rules: InvoiceLineTemplateRule[],
  type: string,
  opts?: { categoryCode?: string; eventTypeCode?: string },
): InvoiceLineTemplateRule | undefined {
  return rules.find((r) => {
    if (String(r.rule_type || '') !== type) return false
    if (opts?.categoryCode && String(r.category_code || '') !== opts.categoryCode) return false
    if (opts?.eventTypeCode && String(r.event_type_code || '') !== opts.eventTypeCode) return false
    return true
  })
}

function eventKey(code: string): string {
  return String(code || '').toLowerCase()
}

/** Only lesson-like types may use the category base_price. Calendar types (Ferien, Sonstiges, …) must have their own rule. */
function isLessonPricedEvent(code: string): boolean {
  const key = eventKey(code)
  return key === 'lesson' || key === 'practical' || key === 'fahrstunde' || key.endsWith('_lesson')
}

function isTheoryEvent(code: string): boolean {
  const key = eventKey(code)
  return key === 'theory' || key.includes('theor')
}

function isConsultationEvent(code: string): boolean {
  const key = eventKey(code)
  return key === 'consultation' || key.includes('consult') || key.includes('berat')
}

function pricedOrNull(rappen: number, minutes: number): { rappen: number; minutes: number } | null {
  if (!rappen || rappen <= 0) return null
  return { rappen, minutes }
}

function servicePrice(
  rules: InvoiceLineTemplateRule[],
  categoryCode: string | null,
  eventCode: string,
  eventDuration: number | null,
): { rappen: number; minutes: number } | null {
  const catRules = categoryCode ? rulesForCategory(rules, categoryCode) : rules
  const base = categoryCode
    ? findRule(catRules, 'base_price', { categoryCode })
    : findRule(rules, 'base_price')
  const theory = categoryCode
    ? findRule(catRules, 'theory', { categoryCode })
    : findRule(rules, 'theory')
  const consultation = categoryCode
    ? findRule(catRules, 'consultation', { categoryCode })
    : findRule(rules, 'consultation')
  const eventPrice = findRule(rules, 'event_price', {
    ...(categoryCode ? { categoryCode } : {}),
    eventTypeCode: eventCode,
  }) || findRule(rules, 'event_price', { eventTypeCode: eventCode })

  // Dedicated event_price always wins — but only for this event type.
  if (eventPrice) {
    const minutes = eventDuration || ruleMinutes(eventPrice, 45)
    return pricedOrNull(priceFromPpm(rulePpm(eventPrice), minutes), minutes)
  }

  if (isTheoryEvent(eventCode)) {
    const source = theory || (base?.theory_price_per_minute_rappen ? base : undefined)
    if (!source && !base?.theory_price_per_minute_rappen) return null
    const minutes = eventDuration
      || Number(source?.theory_base_duration_minutes)
      || ruleMinutes(theory, 45)
    const ppm = Number(source?.theory_price_per_minute_rappen) || rulePpm(theory)
    if (!ppm && !theory) return null
    return pricedOrNull(priceFromPpm(ppm, minutes), minutes)
  }

  if (isConsultationEvent(eventCode)) {
    const source = consultation || (base?.consultation_price_per_minute_rappen != null ? base : undefined)
    if (!source && base?.consultation_price_per_minute_rappen == null) return null
    const minutes = eventDuration
      || Number(source?.consultation_base_duration_minutes)
      || ruleMinutes(consultation, 45)
    const ppm = source?.consultation_price_per_minute_rappen != null
      ? Number(source.consultation_price_per_minute_rappen)
      : rulePpm(consultation)
    return pricedOrNull(priceFromPpm(ppm, minutes), minutes)
  }

  if (isLessonPricedEvent(eventCode) && base) {
    const minutes = eventDuration || ruleMinutes(base, 45)
    return pricedOrNull(priceFromPpm(rulePpm(base), minutes), minutes)
  }

  return null
}

function formatCourseDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function buildInvoiceLineTemplates(input: BuildInvoiceLineTemplatesInput): InvoiceLineTemplate[] {
  const terms = input.terms
  const templates: InvoiceLineTemplate[] = []
  const seen = new Set<string>()

  const push = (row: InvoiceLineTemplate) => {
    if (seen.has(row.id)) return
    seen.add(row.id)
    templates.push(row)
  }

  const categories = (input.categories || []).filter((c) => c?.code && c.is_active !== false)
  const leafs = filterLeafCategories(categories)
  const rules = input.pricingRules || []
  const eventTypes = (input.eventTypes || []).filter((e) => e?.code && e.is_active !== false)

  const billableEvents = eventTypes.filter((e) => !UNBILLED_EVENT_TYPE_CODES.has(String(e.code).toLowerCase()))
  const defaultEvents: InvoiceLineTemplateEventType[] = billableEvents.length
    ? billableEvents
    : [
        { code: 'lesson', name: terms?.appointment || 'Fahrstunde', default_duration_minutes: 45 },
        { code: 'theory', name: 'Theorieunterricht', default_duration_minutes: 45 },
        { code: 'consultation', name: 'Beratung', default_duration_minutes: 45 },
      ]

  for (const cat of leafs) {
    for (const ev of defaultEvents) {
      const priced = servicePrice(
        rules,
        cat.code,
        ev.code,
        ev.default_duration_minutes != null ? Number(ev.default_duration_minutes) : null,
      )
      if (!priced || priced.rappen <= 0) continue
      const eventLabel = resolveEventTypeLabel(ev.code, terms || undefined, { dbName: ev.name })
      push({
        id: `service:${ev.code}:${cat.code}`,
        kind: 'service',
        group: 'Dienstleistungen',
        name: `${eventLabel} · ${categoryLabel(cat)}`,
        description: minutesLabel(priced.minutes),
        price_rappen: priced.rappen,
      })
    }
  }

  // Event-price rules without a category (e.g. coaching session/package)
  for (const rule of rules) {
    if (String(rule.rule_type || '') !== 'event_price') continue
    if (rule.category_code) continue
    const code = String(rule.event_type_code || '').trim()
    if (!code || UNBILLED_EVENT_TYPE_CODES.has(code.toLowerCase())) continue
    const ev = eventTypes.find((e) => e.code === code)
    const minutes = ev?.default_duration_minutes || ruleMinutes(rule, 45)
    const rappen = priceFromPpm(rulePpm(rule), Number(minutes))
    if (rappen <= 0) continue
    const eventLabel = resolveEventTypeLabel(code, terms || undefined, { dbName: ev?.name })
    push({
      id: `service:${code}:_`,
      kind: 'service',
      group: 'Dienstleistungen',
      name: eventLabel,
      description: minutesLabel(Number(minutes)),
      price_rappen: rappen,
    })
  }

  // Event types with a stored fix price (Event-Typen → default_price_rappen)
  for (const ev of eventTypes) {
    const rappen = Number(ev.default_price_rappen) || 0
    if (rappen <= 0) continue
    const eventLabel = resolveEventTypeLabel(ev.code, terms || undefined, { dbName: ev.name })
    const asCourse = /course|kurs|vku|nothelfer/i.test(`${ev.code} ${ev.name || ''}`)
    push({
      id: `event-price:${ev.code}`,
      kind: asCourse ? 'course' : 'service',
      group: asCourse ? 'Kurse' : 'Dienstleistungen',
      name: eventLabel,
      description: ev.default_duration_minutes
        ? minutesLabel(Number(ev.default_duration_minutes))
        : 'Fixpreis',
      price_rappen: rappen,
    })
  }

  const categoryPriceById = new Map(
    (input.courseCategories || []).map((cc) => [String(cc.id), Number(cc.default_price_rappen) || 0]),
  )

  for (const cc of input.courseCategories || []) {
    if (!cc?.id || cc.is_active === false) continue
    const name = String(cc.name || '').trim()
    const rappen = Number(cc.default_price_rappen) || 0
    if (!name || rappen <= 0) continue
    push({
      id: `course-type:${cc.id}`,
      kind: 'course',
      group: 'Kurse',
      name,
      description: 'Kursart · Fixpreis',
      price_rappen: rappen,
    })
  }

  const courses = (input.courses || [])
    .filter((c) => c?.id && c.is_active !== false && String(c.status || '') !== 'cancelled')
    .slice(0, 40)

  for (const course of courses) {
    const name = String(course.name || '').trim()
    if (!name) continue
    const cat = Array.isArray(course.course_category) ? course.course_category[0] : course.course_category
    const rappen = Number(course.price_per_participant_rappen)
      || Number(cat?.default_price_rappen)
      || categoryPriceById.get(String(course.course_category_id || ''))
      || 0
    if (rappen <= 0) continue
    const rawSessions = course.sessions || course.course_sessions || []
    const sessions = rawSessions
      .filter((s) => s?.start_time)
      .map((s) => ({
        session_number: s.session_number,
        start_time: String(s.start_time),
        end_time: s.end_time,
      }))
    const sessionDetails = formatCourseSessionsDescription(sessions)
    const first = sortCourseSessionsByStart(sessions)[0]
    const when = formatCourseDate(course.course_start_date)
    const subtitle = first
      ? `${sessions.length} ${sessions.length === 1 ? 'Teil' : 'Teile'} · ${formatCourseSessionLine({ ...first, session_number: 1 }, 0)}`
      : ([when, cat?.name || course.description].filter(Boolean).join(' · ') || 'Kurs')
    push({
      id: `course:${course.id}`,
      kind: 'course',
      group: 'Kurse',
      name,
      description: subtitle,
      details: sessionDetails || undefined,
      price_rappen: rappen,
    })
  }

  for (const product of input.products || []) {
    if (!product?.id || product.is_active === false) continue
    const name = String(product.name || '').trim()
    if (!name) continue
    push({
      id: `product:${product.id}`,
      kind: 'product',
      group: 'Produkte',
      name,
      description: product.description || undefined,
      price_rappen: Number(product.price_rappen) || 0,
      product_id: product.id,
    })
  }

  return templates
}
