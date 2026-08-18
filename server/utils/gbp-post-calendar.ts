import { createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  requireAnthropicApiKey,
  generateGbpAiText,
  extractGbpPlaceName,
  adaptKeywordsForGbpLocation,
} from '~/server/utils/gbp-automation'
import { getGbpAutomationSettings, resolveGbpLocation } from '~/server/utils/gbp'

export type GbpPostCalendarStatus = 'planned' | 'published' | 'skipped' | 'failed'
export type GbpPostTopicType = 'STANDARD' | 'EVENT' | 'OFFER'

export interface GbpPostCalendarRow {
  id: string
  tenant_id: string
  location_id: string
  year: number
  planned_for: string
  theme_title: string
  theme_angle: string | null
  summary: string
  topic_type: GbpPostTopicType
  status: GbpPostCalendarStatus
  queue_priority: number
  media_urls: string[]
  gbp_post_name: string | null
  error_message: string | null
  published_at: string | null
}

/** Weekday slots in JS getUTCDay() for N posts/week — Tue, and Fri / Mon / Thu extras. */
const WEEKDAY_SLOTS: Record<number, number[]> = {
  1: [2],
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
}

export function normalizePostsPerWeek(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 1
  return Math.min(4, Math.max(1, Math.round(n)))
}

/** Build planned_for timestamps for the next `months` months (default 12). 08:15 UTC. */
export function buildCalendarSlotDates(params: {
  from?: Date
  months?: number
  postsPerWeek: number
}): Date[] {
  const perWeek = normalizePostsPerWeek(params.postsPerWeek)
  const weekdays = WEEKDAY_SLOTS[perWeek] || WEEKDAY_SLOTS[1]
  const start = params.from ? new Date(params.from) : new Date()
  start.setUTCHours(8, 15, 0, 0)
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + (params.months ?? 12))

  const dates: Date[] = []
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 8, 15, 0, 0))
  // Walk day by day
  while (cursor < end) {
    if (cursor > start && weekdays.includes(cursor.getUTCDay())) {
      dates.push(new Date(cursor))
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

function parseJsonArray(raw: string): any[] {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const text = fenced?.[1]?.trim() || trimmed
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('Simy AI lieferte keinen Kalender (JSON)')
  const parsed = JSON.parse(text.slice(start, end + 1))
  if (!Array.isArray(parsed)) throw new Error('Simy-AI-Kalender ist kein Array')
  return parsed
}

const WEEKDAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function formatSlotDe(d: Date): string {
  return `${WEEKDAYS_DE[d.getUTCDay()]}, ${d.getUTCDate()}. ${MONTHS_DE[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function monthSeasonRules(month: number): string {
  const rules: Record<number, string> = {
    0: 'Januar: Neujahr, Vorsätze, Start. KEIN Advent, KEIN Weihnachten, KEIN Jahresrückblick.',
    1: 'Februar: Winter, Fasnacht möglich. KEIN Ostern, KEIN Neujahr.',
    2: 'März: Frühlingsbeginn, Ostern nur wenn das Datum passt. KEIN Sommer.',
    3: 'April: Frühling, Ostern nur in der Osterwoche. KEIN Sommerferien.',
    4: 'Mai: Auffahrt/Pfingsten möglich, Prüfungssaison. KEIN Weihnachten.',
    5: 'Juni: Frühsommer, Prüfungen. KEIN 1. August, KEIN Herbst.',
    6: 'Juli: Sommerferien. KEIN Weihnachten, KEIN Jahresende.',
    7: 'August: 1. August / Sommerende. KEIN Advent, KEIN Jahresrückblick.',
    8: 'September: Schulstart, Herbstbeginn. KEIN Weihnachten, KEIN Neujahr.',
    9: 'Oktober: Herbst, Prüfungsvorbereitung. KEIN Advent, KEIN Weihnachten, KEIN Jahresrückblick, KEIN Neujahr, keine Jahreszahl der Zukunft als «jetzt».',
    10: 'November: Spätherbst, Prüfungen. Advent nur in der letzten Novemberwoche. KEIN Weihnachten, KEIN Jahresrückblick, KEIN Neujahr, KEIN «Jahresbeginn 20xx».',
    11: 'Dezember: Advent, Vorweihnachten. Jahresrückblick/Jahresende nur in der letzten Dezemberwoche. KEIN «Januar» oder «Neujahr» vor dem 28.12.',
  }
  return rules[month] || ''
}

function groupSlotsByMonth(dates: Date[]): Array<{ year: number; month: number; label: string; dates: Date[] }> {
  const groups: Array<{ year: number; month: number; label: string; dates: Date[] }> = []
  for (const d of dates) {
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth()
    const last = groups[groups.length - 1]
    if (last && last.year === year && last.month === month) {
      last.dates.push(d)
    } else {
      groups.push({
        year,
        month,
        label: `${MONTHS_DE[month]} ${year}`,
        dates: [d],
      })
    }
  }
  return groups
}

function normalizeThemeRow(row: any, fallback: string): { theme: string; angle: string; topicType: GbpPostTopicType } {
  const topic = String(row?.topicType || row?.topic_type || 'STANDARD').toUpperCase()
  const topicType: GbpPostTopicType =
    topic === 'EVENT' || topic === 'OFFER' ? topic : 'STANDARD'
  return {
    theme: String(row?.theme || row?.theme_title || fallback).slice(0, 120),
    angle: String(row?.angle || row?.theme_angle || '').slice(0, 280),
    topicType,
  }
}

async function loadTenantContext(tenantId: string, locationId: string) {
  const supabase = getSupabaseAdmin()
  const loc = await resolveGbpLocation(tenantId, locationId)
  const settings = await getGbpAutomationSettings(tenantId, loc.id)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name, brand_tagline, brand_description, business_type, website_url, selected_categories, address, invoice_city')
    .eq('id', tenantId)
    .single()

  const { getTerminologyDefaults } = await import('~/composables/useTerminology')
  const terms = getTerminologyDefaults(tenant?.business_type)
  const place = extractGbpPlaceName(loc.title)
  const keywords = adaptKeywordsForGbpLocation(settings.keywords ?? [], loc.title)

  return { loc, settings, tenant, terms, place, keywords }
}

/**
 * AI yearly theme list (compact). Copy is filled separately so HTTP timeouts stay sane.
 */
export async function generateCalendarThemes(params: {
  tenantName: string
  businessNoun: string
  clientsPlural: string
  appointmentPlural: string
  locationTitle: string
  place: string | null
  keywords: string[]
  brandVoice: string | null
  brandTagline: string | null
  brandDescription: string | null
  categories: unknown
  slotDates: Date[]
  onProgress?: (info: { monthLabel: string; current: number; total: number }) => void | Promise<void>
}): Promise<Array<{ theme: string; angle: string; topicType: GbpPostTopicType }>> {
  const apiKey = requireAnthropicApiKey()
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })
  const cats = Array.isArray(params.categories)
    ? params.categories.map(String).join(', ')
    : (params.categories ? String(params.categories) : '')

  const groups = groupSlotsByMonth(params.slotDates)
  const all: Array<{ theme: string; angle: string; topicType: GbpPostTopicType }> = []
  const usedTitles: string[] = []

  for (let g = 0; g < groups.length; g++) {
    const group = groups[g]
    await params.onProgress?.({
      monthLabel: group.label,
      current: g + 1,
      total: groups.length,
    })

    const previous = usedTitles.slice(-16).map(t => `- ${t}`).join('\n')
    const prompt = `Du planst Google-Business-Profile Updates (Posts, NICHT Fotogalerie) für GENAU diesen Monat.
Marke: "${params.tenantName}" (${params.businessNoun} Schweiz)
Standort (verbindlich): ${params.locationTitle}
Ortsname Local SEO: ${params.place || 'aus Titel ableiten'}
Zielgruppe: ${params.clientsPlural}
Leistungen/Kategorien: ${cats || params.appointmentPlural}
${params.brandTagline ? `Tagline: ${params.brandTagline}` : ''}
${params.brandDescription ? `Beschreibung: ${params.brandDescription.slice(0, 400)}` : ''}
${params.brandVoice ? `Markenstimme: ${params.brandVoice}` : ''}
Keywords: ${params.keywords.join(', ') || '—'}

Monat: ${group.label}
Saison-Regel: ${monthSeasonRules(group.month)}

Erzeuge GENAU ${group.dates.length} Themen, Index 1..${group.dates.length}, jedes Thema gilt NUR für sein Datum:
${group.dates.map((d, i) => `${i + 1}. ${d.toISOString().slice(0, 10)} — ${formatSlotDe(d)}`).join('\n')}

Harte Regeln:
- Thema und angle müssen zu DIESEM Datum/Monat passen. Kein Vorziehen: kein Advent im Oktober, kein Jahresrückblick im November, kein «Jahresbeginn 20xx» vor Januar.
- Feiertage nur in der passenden Woche.
- Jedes Thema braucht einen echten Anlass/Nutzen, kein Füllpost
- Ort ${params.place || ''} muss zum Standort passen, keine anderen Städte
- Keine erfundenen Preise/Rabatte/Aktionen
- Abwechslung: Leistungen, Vertrauen, Saison, ${params.clientsPlural}, Team/Qualität
- Sprache: Hochdeutsch, kurz
${previous ? `\nDiese Themen gab es schon — nicht wiederholen:\n${previous}` : ''}

Antworte NUR mit JSON-Array der Länge ${group.dates.length}:
[{"theme":"Kurztitel","angle":"1 Satz warum dieser Post an diesem Datum","topicType":"STANDARD"}]
topicType: STANDARD | EVENT | OFFER (OFFER nur ohne erfundene Rabatte, z.B. «jetzt Platz sichern»).`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const items = parseJsonArray(raw)
    for (let i = 0; i < group.dates.length; i++) {
      const row = normalizeThemeRow(items[i] || items[items.length - 1] || {}, `Thema ${all.length + 1}`)
      all.push(row)
      usedTitles.push(row.theme)
    }
  }

  return all
}

export async function generateCalendarPostCopy(params: {
  tenantId: string
  locationId: string
  themeTitle: string
  themeAngle?: string | null
  existingSummary?: string | null
  mode?: 'generate' | 'regenerate'
}): Promise<string> {
  const ctx = await loadTenantContext(params.tenantId, params.locationId)
  const draft = [
    `Thema: ${params.themeTitle}`,
    params.themeAngle ? `Anlass: ${params.themeAngle}` : '',
    params.existingSummary?.trim() || '',
  ].filter(Boolean).join('\n')

  return generateGbpAiText({
    context: 'post',
    tenantName: ctx.tenant?.brand_name || ctx.tenant?.name || ctx.terms.businessNoun,
    businessNoun: ctx.terms.businessNoun,
    clientsPlural: ctx.terms.clientsPlural,
    clientSingular: ctx.terms.client,
    appointmentSingular: ctx.terms.appointment,
    locationTitle: ctx.loc.title,
    brandVoice: ctx.settings.brand_voice,
    keywords: ctx.keywords,
    ctaType: ctx.settings.default_cta_type,
    draftText: draft,
    tone: 'local_friendly',
    mode: params.mode || 'generate',
  })
}

const COPY_BATCH = 8

export type CalendarProgressStep =
  | 'context'
  | 'slots'
  | 'themes'
  | 'themes_done'
  | 'replace'
  | 'save'
  | 'copy'
  | 'enable'
  | 'done'
  | 'error'

export interface CalendarProgressEvent {
  step: CalendarProgressStep
  label: string
  detail?: string
  current?: number
  total?: number
}

/**
 * Replace unpublished future calendar rows for a location with a new 12-month plan.
 * Writes themes for all slots; generates full copy for the first COPY_BATCH posts.
 * Remaining copy is filled by cron when the slot is due soon.
 */
export async function rebuildLocationPostCalendar(params: {
  tenantId: string
  locationId: string
  onProgress?: (event: CalendarProgressEvent) => void | Promise<void>
}): Promise<{ created: number; withCopy: number }> {
  const emit = async (event: CalendarProgressEvent) => {
    try {
      await params.onProgress?.(event)
    } catch { /* ignore hung clients */ }
  }

  await emit({
    step: 'context',
    label: 'Marke, Standort und Keywords laden',
  })
  const ctx = await loadTenantContext(params.tenantId, params.locationId)
  const placeLabel = ctx.place || ctx.loc.title || 'Standort'
  await emit({
    step: 'context',
    label: 'Marke, Standort und Keywords laden',
    detail: `${ctx.tenant?.brand_name || ctx.tenant?.name || ctx.terms.businessNoun} · ${placeLabel}`,
  })

  const perWeek = normalizePostsPerWeek(ctx.settings.posts_per_week)
  const slotDates = buildCalendarSlotDates({ postsPerWeek: perWeek, months: 12 })
  if (!slotDates.length) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Kalender-Slots berechnet' })
  }
  await emit({
    step: 'slots',
    label: 'Termine für 12 Monate berechnen',
    detail: `${slotDates.length} Slots · ${perWeek}× pro Woche`,
    current: slotDates.length,
    total: slotDates.length,
  })

  await emit({
    step: 'themes',
    label: 'Simy AI plant Themen fürs Jahr',
    detail: `Themen zu Saison, Leistungen und ${placeLabel}…`,
    current: 0,
    total: slotDates.length,
  })
  const themes = await generateCalendarThemes({
    tenantName: ctx.tenant?.brand_name || ctx.tenant?.name || ctx.terms.businessNoun,
    businessNoun: ctx.terms.businessNoun,
    clientsPlural: ctx.terms.clientsPlural,
    appointmentPlural: ctx.terms.appointmentsPlural,
    locationTitle: ctx.loc.title || '',
    place: ctx.place,
    keywords: ctx.keywords,
    brandVoice: ctx.settings.brand_voice,
    brandTagline: ctx.tenant?.brand_tagline || null,
    brandDescription: ctx.tenant?.brand_description || null,
    categories: ctx.tenant?.selected_categories,
    slotDates,
    onProgress: async ({ monthLabel, current, total }) => {
      await emit({
        step: 'themes',
        label: 'Simy AI plant Themen fürs Jahr',
        detail: monthLabel,
        current,
        total,
      })
    },
  })
  await emit({
    step: 'themes_done',
    label: 'Simy AI plant Themen fürs Jahr',
    detail: `${themes.length} Themen stehen`,
    current: themes.length,
    total: slotDates.length,
  })

  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()

  await emit({
    step: 'replace',
    label: 'Kalender speichern',
    detail: 'Unveröffentlichte Slots ersetzen, gepostete bleiben',
  })
  await supabase
    .from('gbp_post_calendar')
    .delete()
    .eq('tenant_id', params.tenantId)
    .eq('location_id', ctx.loc.id)
    .in('status', ['planned', 'failed'])
    .gt('planned_for', nowIso)

  const rows = slotDates.map((d, i) => ({
    tenant_id: params.tenantId,
    location_id: ctx.loc.id,
    year: d.getUTCFullYear(),
    planned_for: d.toISOString(),
    theme_title: themes[i]?.theme || `Thema ${i + 1}`,
    theme_angle: themes[i]?.angle || null,
    summary: '',
    topic_type: themes[i]?.topicType || 'STANDARD',
    status: 'planned' as const,
  }))

  const { data: inserted, error } = await supabase
    .from('gbp_post_calendar')
    .insert(rows)
    .select('id, theme_title, theme_angle')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await emit({
    step: 'save',
    label: 'Kalender speichern',
    detail: `${inserted?.length || 0} Themen eingetragen`,
    current: inserted?.length || 0,
    total: slotDates.length,
  })

  let withCopy = 0
  const toCopy = (inserted || []).slice(0, COPY_BATCH)
  for (let i = 0; i < toCopy.length; i++) {
    const row = toCopy[i]
    await emit({
      step: 'copy',
      label: 'Texte für die nächsten Posts schreiben',
      detail: row.theme_title,
      current: i + 1,
      total: toCopy.length,
    })
    try {
      const summary = await generateCalendarPostCopy({
        tenantId: params.tenantId,
        locationId: ctx.loc.id,
        themeTitle: row.theme_title,
        themeAngle: row.theme_angle,
      })
      if (summary?.trim()) {
        await supabase
          .from('gbp_post_calendar')
          .update({ summary: summary.trim(), updated_at: new Date().toISOString() })
          .eq('id', row.id)
        withCopy++
      }
    } catch (err: any) {
      console.warn('[gbp-post-calendar] copy failed', row.id, err?.message || err)
    }
  }

  await emit({
    step: 'enable',
    label: 'Automatik einschalten',
    detail: 'post_mode = calendar',
  })
  await supabase
    .from('gbp_automation_settings')
    .update({ post_mode: 'calendar', updated_at: new Date().toISOString() })
    .eq('tenant_id', params.tenantId)

  const created = inserted?.length || 0
  await emit({
    step: 'done',
    label: 'Fertig',
    detail: `${created} Slots · ${withCopy} Texte bereit, Rest schreibt der Cron vor dem Termin`,
    current: created,
    total: created,
  })

  return { created, withCopy }
}

/** Fill empty summaries for slots in the next `daysAhead` days. */
export async function fillUpcomingCalendarCopy(limit = 12): Promise<number> {
  const supabase = getSupabaseAdmin()
  const until = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
  const { data: rows } = await supabase
    .from('gbp_post_calendar')
    .select('id, tenant_id, location_id, theme_title, theme_angle, summary')
    .eq('status', 'planned')
    .lte('planned_for', until)
    .order('planned_for', { ascending: true })
    .limit(40)

  const needCopy = (rows || []).filter(r => !String(r.summary || '').trim()).slice(0, limit)

  let filled = 0
  for (const row of needCopy) {
    try {
      const summary = await generateCalendarPostCopy({
        tenantId: row.tenant_id,
        locationId: row.location_id,
        themeTitle: row.theme_title,
        themeAngle: row.theme_angle,
      })
      if (!summary?.trim()) continue
      await supabase
        .from('gbp_post_calendar')
        .update({ summary: summary.trim(), updated_at: new Date().toISOString() })
        .eq('id', row.id)
      filled++
    } catch (err: any) {
      console.warn('[gbp-post-calendar] fill copy failed', row.id, err?.message || err)
    }
  }
  return filled
}
