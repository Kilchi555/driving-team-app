import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  runCronWebsiteProspectDiscovery,
  type DiscoverySummary,
} from '~/server/utils/website-prospect-discover'

/**
 * Shared gate for the one prospect-discovery job.
 * Manual runs and the Vercel cron are triggers only.
 * A missing or unreadable configuration stays disabled.
 *
 * Vercel cron is static (`30 * * * *`: every hour at minute 30).
 * Europe/Zurich is a whole-hour offset from UTC, including DST, so that
 * tick is always minute 30 in Zurich. The stored local time is due when
 * the current local clock is inside the 60 minutes after the configured
 * time and no cron attempt has already started on that local date.
 * A manual run does not consume that daily cron slot and does not change
 * the UTC-day city rotation inside the discovery job.
 */

export const PROSPECT_AUTOMATION_DEFAULTS = {
  enabled: false,
  frequency: 'daily' as const,
  time: '04:30',
  timezone: 'Europe/Zurich',
}

export const STALE_PROSPECT_RUN_MS = 3 * 60 * 1000
const DUE_WINDOW_MINUTES = 60
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
const ZONE_RE = /^[A-Za-z0-9_+\-/]{1,64}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type AutomationSettings = {
  enabled: boolean
  frequency: 'daily'
  time: string
  timezone: string
}

export type DispatchNote = 'disabled' | 'not_due' | 'started' | 'already_running'

export type PublicProspectRun = {
  id: string
  trigger: 'manual' | 'cron'
  triggeredBy: string | null
  status: 'running' | 'completed' | 'failed' | 'skipped'
  startedAt: string
  finishedAt: string | null
  city: string | null
  durationMs: number | null
  created: number
  review: number
  scored: number
  errors: number
  generated: number
  emailsSent: 0
  errorSummary: string | null
}

export type LoadedAutomation = {
  settings: AutomationSettings
  lastDispatch: { at: string | null; result: DispatchNote | null }
}

export type ProspectDiscoveryTriggerResult = {
  ok: boolean
  skipped?: 'automation_disabled' | 'not_due' | 'already_running'
  status?: PublicProspectRun['status']
  runId: string | null
  trigger?: 'manual' | 'cron'
  city: string | null
  created: number
  review: number
  scored: number
  errors: number
  generated: number
  emailsSent: 0
  startedAt?: string | null
  finishedAt?: string | null
  errorSummary?: string | null
}

type DiscoveryOutcome = DiscoverySummary | { ok: true; skipped: 'no_google_key'; emailsSent: 0 }

type FinishPatch = {
  status: 'completed' | 'failed'
  finished_at: string
  city: string | null
  duration_ms: number
  created_count: number
  review_count: number
  scored_count: number
  error_count: number
  generated_count: number
  emails_sent: 0
  error_summary: string | null
}

export type ProspectRunStore = {
  loadSettings: () => Promise<LoadedAutomation>
  saveSettings: (settings: AutomationSettings, updatedBy: string | null) => Promise<void>
  noteDispatch: (result: DispatchNote, at: string) => Promise<void>
  releaseStaleRuns: (startedBeforeIso: string) => Promise<void>
  tryInsertRunning: (row: {
    trigger: 'manual' | 'cron'
    triggered_by: string | null
    started_at: string
  }) => Promise<{ ok: true; id: string } | { ok: false }>
  finishRun: (id: string, patch: FinishPatch) => Promise<void>
  findActiveRun: () => Promise<PublicProspectRun | null>
  findLastFinishedRun: () => Promise<PublicProspectRun | null>
  hasCronRunOnLocalDate: (dateKey: string, timeZone: string) => Promise<boolean>
}

const RUN_COLUMNS = 'id, trigger, triggered_by, status, started_at, finished_at, city, duration_ms, created_count, review_count, scored_count, error_count, generated_count, emails_sent, error_summary'

export function isValidIanaTimeZone(timeZone: string): boolean {
  if (!ZONE_RE.test(timeZone)) return false
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(0)
    return true
  } catch {
    return false
  }
}

export function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const bag: Record<string, string> = {}
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value
  }
  let hour = Number(bag.hour)
  if (hour === 24) hour = 0
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
  }
}

export function localDateKey(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone)
  const month = String(parts.month).padStart(2, '0')
  const day = String(parts.day).padStart(2, '0')
  return `${parts.year}-${month}-${day}`
}

export function staleRunCutoff(now: Date): string {
  return new Date(now.getTime() - STALE_PROSPECT_RUN_MS).toISOString()
}

export function isAutomationDue(input: {
  settings: AutomationSettings
  now: Date
  cronAlreadyStartedOnLocalDate: boolean
}): boolean {
  const { settings, now, cronAlreadyStartedOnLocalDate } = input
  if (!settings.enabled) return false
  if (settings.frequency !== 'daily') return false
  if (cronAlreadyStartedOnLocalDate) return false
  if (!isValidIanaTimeZone(settings.timezone)) return false
  const match = TIME_RE.exec(settings.time)
  if (!match) return false
  const scheduled = Number(match[1]) * 60 + Number(match[2])
  const local = zonedParts(now, settings.timezone)
  const current = local.hour * 60 + local.minute
  const delta = (current - scheduled + 24 * 60) % (24 * 60)
  return delta < DUE_WINDOW_MINUTES
}

export function parseAutomationSettings(body: unknown): { ok: true; settings: AutomationSettings } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Ungültige Eingabe' }
  }
  const raw = body as Record<string, unknown>
  if (typeof raw.enabled !== 'boolean') return { ok: false, error: 'Aktivierung muss wahr oder falsch sein' }
  if (raw.frequency !== 'daily') return { ok: false, error: 'Frequenz wird nur als täglich unterstützt' }
  if (typeof raw.time !== 'string' || !TIME_RE.test(raw.time)) return { ok: false, error: 'Uhrzeit muss HH:MM sein' }
  if (typeof raw.timezone !== 'string' || !isValidIanaTimeZone(raw.timezone)) {
    return { ok: false, error: 'Zeitzone ist ungültig' }
  }
  return {
    ok: true,
    settings: {
      enabled: raw.enabled,
      frequency: 'daily',
      time: raw.time,
      timezone: raw.timezone,
    },
  }
}

export function settingsFromRow(row: unknown): AutomationSettings {
  if (!row || typeof row !== 'object') return { ...PROSPECT_AUTOMATION_DEFAULTS }
  const raw = row as Record<string, unknown>
  const time = typeof raw.run_time === 'string' ? raw.run_time : ''
  const timezone = typeof raw.timezone === 'string' ? raw.timezone : ''
  if (raw.frequency !== 'daily' || !TIME_RE.test(time) || !isValidIanaTimeZone(timezone)) {
    return { ...PROSPECT_AUTOMATION_DEFAULTS }
  }
  return {
    enabled: raw.enabled === true,
    frequency: 'daily',
    time,
    timezone,
  }
}

export function sanitizeErrorSummary(error: unknown): string {
  let text = 'Prospect Discovery fehlgeschlagen'
  if (typeof error === 'string') text = error
  else if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    text = (error as { message: string }).message
  }
  text = text.split('\n')[0] || text
  text = text.replace(/AIza[0-9A-Za-z\-_]{8,}/g, '[redacted]')
  text = text.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
  text = text.replace(/sb_secret_[A-Za-z0-9_]+/g, '[redacted]')
  text = text.replace(/sb_publishable_[A-Za-z0-9_]+/g, '[redacted]')
  text = text.replace(/([?&]key=)[^&\s]+/gi, '$1[redacted]')
  text = text.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[redacted]')
  text = text.replace(/\s+/g, ' ').trim()
  if (!text) text = 'Prospect Discovery fehlgeschlagen'
  return text.slice(0, 240)
}

export function superAdminActorId(user: { db_user_id?: unknown } | null | undefined): string | null {
  const id = user?.db_user_id
  if (typeof id !== 'string' || !UUID_RE.test(id)) return null
  return id
}

export function countsFromDiscovery(outcome: DiscoveryOutcome) {
  if ('skipped' in outcome && outcome.skipped === 'no_google_key') {
    return { city: null, created: 0, review: 0, scored: 0, errors: 0, generated: 0, emailsSent: 0 as const }
  }
  const summary = outcome as DiscoverySummary
  const generated = summary.generated || []
  const review = generated.filter((item) => item.status === 'review' || item.status === 'approved').length
  return {
    city: summary.city || null,
    created: summary.created || 0,
    review,
    scored: summary.scored || 0,
    errors: summary.errors || 0,
    generated: generated.length,
    emailsSent: 0 as const,
  }
}

function emptyCounts() {
  return { city: null, created: 0, review: 0, scored: 0, errors: 0, generated: 0, emailsSent: 0 as const }
}

function skipResult(skipped: 'automation_disabled' | 'not_due' | 'already_running', runId: string | null = null): ProspectDiscoveryTriggerResult {
  return { ok: true, skipped, runId, ...emptyCounts() }
}

function isDispatchNote(value: unknown): value is DispatchNote {
  return value === 'disabled' || value === 'not_due' || value === 'started' || value === 'already_running'
}

export function publicRunFromRow(row: Record<string, unknown> | null | undefined): PublicProspectRun | null {
  if (!row?.id) return null
  const status = String(row.status)
  const safeStatus: PublicProspectRun['status'] = status === 'running' || status === 'completed' || status === 'failed' || status === 'skipped'
    ? status
    : 'failed'
  return {
    id: String(row.id),
    trigger: row.trigger === 'manual' ? 'manual' : 'cron',
    triggeredBy: typeof row.triggered_by === 'string' ? row.triggered_by : null,
    status: safeStatus,
    startedAt: String(row.started_at || ''),
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    city: row.city ? String(row.city) : null,
    durationMs: typeof row.duration_ms === 'number' ? row.duration_ms : null,
    created: Number(row.created_count || 0),
    review: Number(row.review_count || 0),
    scored: Number(row.scored_count || 0),
    errors: Number(row.error_count || 0),
    generated: Number(row.generated_count || 0),
    emailsSent: 0,
    errorSummary: row.error_summary ? String(row.error_summary).slice(0, 240) : null,
  }
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  if (!error) return false
  return error.code === '23505' || /duplicate|unique/i.test(String(error.message || ''))
}

function defaultStore(): ProspectRunStore {
  return createSupabaseProspectRunStore(getSupabaseAdmin())
}

export function createSupabaseProspectRunStore(supabase: ReturnType<typeof getSupabaseAdmin>): ProspectRunStore {
  return {
    async loadSettings() {
      const { data, error } = await supabase
        .from('prospect_discovery_settings')
        .select('enabled, frequency, run_time, timezone, last_dispatch_at, last_dispatch_result')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      if (!data) {
        return { settings: { ...PROSPECT_AUTOMATION_DEFAULTS }, lastDispatch: { at: null, result: null } }
      }
      const result = isDispatchNote(data.last_dispatch_result) ? data.last_dispatch_result : null
      return {
        settings: settingsFromRow(data),
        lastDispatch: {
          at: data.last_dispatch_at ? String(data.last_dispatch_at) : null,
          result,
        },
      }
    },
    async saveSettings(settings, updatedBy) {
      const { error } = await supabase.from('prospect_discovery_settings').upsert({
        id: 1,
        enabled: settings.enabled,
        frequency: settings.frequency,
        run_time: settings.time,
        timezone: settings.timezone,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      }, { onConflict: 'id' })
      if (error) throw error
    },
    async noteDispatch(result, at) {
      const { error } = await supabase
        .from('prospect_discovery_settings')
        .update({ last_dispatch_at: at, last_dispatch_result: result })
        .eq('id', 1)
      if (error) throw error
    },
    async releaseStaleRuns(startedBeforeIso) {
      const { error } = await supabase
        .from('prospect_discovery_runs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_summary: 'Lauf wurde nach einem Abbruch als fehlgeschlagen markiert.',
        })
        .eq('status', 'running')
        .lt('started_at', startedBeforeIso)
      if (error) throw error
    },
    async tryInsertRunning(row) {
      const { data, error } = await supabase
        .from('prospect_discovery_runs')
        .insert({
          trigger: row.trigger,
          triggered_by: row.triggered_by,
          status: 'running',
          started_at: row.started_at,
          emails_sent: 0,
          created_count: 0,
          review_count: 0,
          scored_count: 0,
          error_count: 0,
          generated_count: 0,
        })
        .select('id')
        .single()
      if (error) {
        if (isUniqueViolation(error)) return { ok: false }
        throw error
      }
      if (!data?.id) throw new Error('prospect run insert failed')
      return { ok: true, id: String(data.id) }
    },
    async finishRun(id, patch) {
      const { error } = await supabase.from('prospect_discovery_runs').update(patch).eq('id', id)
      if (error) throw error
    },
    async findActiveRun() {
      const { data, error } = await supabase
        .from('prospect_discovery_runs')
        .select(RUN_COLUMNS)
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return publicRunFromRow(data as Record<string, unknown> | null)
    },
    async findLastFinishedRun() {
      const { data, error } = await supabase
        .from('prospect_discovery_runs')
        .select(RUN_COLUMNS)
        .in('status', ['completed', 'failed'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return publicRunFromRow(data as Record<string, unknown> | null)
    },
    async hasCronRunOnLocalDate(dateKey, timeZone) {
      const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('prospect_discovery_runs')
        .select('started_at, status')
        .eq('trigger', 'cron')
        .in('status', ['running', 'completed', 'failed'])
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(48)
      if (error) throw error
      return (data || []).some((row) => {
        const started = new Date(String(row.started_at))
        if (Number.isNaN(started.getTime())) return false
        return localDateKey(started, timeZone) === dateKey
      })
    },
  }
}

async function note(store: ProspectRunStore, result: DispatchNote, at: string) {
  try {
    await store.noteDispatch(result, at)
  } catch (error) {
    console.error('[prospect-discovery] dispatch note failed', sanitizeErrorSummary(error))
  }
}

export async function startProspectDiscoveryRun(opts: {
  trigger: 'manual' | 'cron'
  triggeredBy: string | null
  now?: Date
  store?: ProspectRunStore
  runDiscovery?: () => Promise<DiscoveryOutcome>
}): Promise<ProspectDiscoveryTriggerResult> {
  const store = opts.store ?? defaultStore()
  const now = opts.now ?? new Date()
  await store.releaseStaleRuns(staleRunCutoff(now))
  const inserted = await store.tryInsertRunning({
    trigger: opts.trigger,
    triggered_by: opts.triggeredBy,
    started_at: now.toISOString(),
  })
  if (!inserted.ok) {
    const active = await store.findActiveRun()
    return skipResult('already_running', active?.id ?? null)
  }

  const startedMs = Date.now()
  try {
    const outcome = await (opts.runDiscovery ? opts.runDiscovery() : runCronWebsiteProspectDiscovery())
    const counts = countsFromDiscovery(outcome)
    const finishedAt = new Date().toISOString()
    await store.finishRun(inserted.id, {
      status: 'completed',
      finished_at: finishedAt,
      city: counts.city,
      duration_ms: Date.now() - startedMs,
      created_count: counts.created,
      review_count: counts.review,
      scored_count: counts.scored,
      error_count: counts.errors,
      generated_count: counts.generated,
      emails_sent: 0,
      error_summary: null,
    })
    return {
      ok: true,
      status: 'completed',
      runId: inserted.id,
      trigger: opts.trigger,
      ...counts,
      startedAt: now.toISOString(),
      finishedAt,
    }
  } catch (error) {
    const errorSummary = sanitizeErrorSummary(error)
    console.error('[prospect-discovery] run failed', inserted.id, errorSummary)
    const finishedAt = new Date().toISOString()
    try {
      await store.finishRun(inserted.id, {
        status: 'failed',
        finished_at: finishedAt,
        city: null,
        duration_ms: Date.now() - startedMs,
        created_count: 0,
        review_count: 0,
        scored_count: 0,
        error_count: 1,
        generated_count: 0,
        emails_sent: 0,
        error_summary: errorSummary,
      })
    } catch (finishError) {
      console.error('[prospect-discovery] could not mark run failed', sanitizeErrorSummary(finishError))
    }
    return {
      ok: false,
      status: 'failed',
      runId: inserted.id,
      trigger: opts.trigger,
      ...emptyCounts(),
      errors: 1,
      startedAt: now.toISOString(),
      finishedAt,
      errorSummary,
    }
  }
}

export async function dispatchCronProspectDiscovery(opts: {
  now?: Date
  store?: ProspectRunStore
  runDiscovery?: () => Promise<DiscoveryOutcome>
} = {}): Promise<ProspectDiscoveryTriggerResult> {
  const store = opts.store ?? defaultStore()
  const now = opts.now ?? new Date()
  let loaded: LoadedAutomation
  try {
    loaded = await store.loadSettings()
  } catch (error) {
    console.error('[prospect-discovery] settings unreadable; treating automation as disabled', sanitizeErrorSummary(error))
    return skipResult('automation_disabled')
  }
  if (!loaded.settings.enabled) {
    await note(store, 'disabled', now.toISOString())
    return skipResult('automation_disabled')
  }

  let alreadyStarted = true
  try {
    alreadyStarted = await store.hasCronRunOnLocalDate(localDateKey(now, loaded.settings.timezone), loaded.settings.timezone)
  } catch (error) {
    console.error('[prospect-discovery] schedule check failed; skipping discovery', sanitizeErrorSummary(error))
    return skipResult('automation_disabled')
  }
  if (!isAutomationDue({
    settings: loaded.settings,
    now,
    cronAlreadyStartedOnLocalDate: alreadyStarted,
  })) {
    await note(store, 'not_due', now.toISOString())
    return skipResult('not_due')
  }

  const result = await startProspectDiscoveryRun({
    trigger: 'cron',
    triggeredBy: null,
    now,
    store,
    runDiscovery: opts.runDiscovery,
  })
  await note(store, result.skipped === 'already_running' ? 'already_running' : 'started', now.toISOString())
  return result
}

export async function startManualProspectDiscovery(opts: {
  triggeredBy: string | null
  now?: Date
  store?: ProspectRunStore
  runDiscovery?: () => Promise<DiscoveryOutcome>
} = { triggeredBy: null }): Promise<ProspectDiscoveryTriggerResult> {
  return startProspectDiscoveryRun({
    trigger: 'manual',
    triggeredBy: opts.triggeredBy,
    now: opts.now,
    store: opts.store,
    runDiscovery: opts.runDiscovery,
  })
}

export async function readProspectAutomation(store?: ProspectRunStore) {
  const resolved = store ?? defaultStore()
  try {
    const loaded = await resolved.loadSettings()
    const [activeRun, lastRun] = await Promise.all([
      resolved.findActiveRun(),
      resolved.findLastFinishedRun(),
    ])
    return { ...loaded, activeRun, lastRun, persistent: true }
  } catch (error) {
    console.error('[prospect-discovery] automation read failed', sanitizeErrorSummary(error))
    return {
      settings: { ...PROSPECT_AUTOMATION_DEFAULTS },
      lastDispatch: { at: null, result: null },
      activeRun: null,
      lastRun: null,
      persistent: false,
    }
  }
}

export async function saveProspectAutomationSettings(
  settings: AutomationSettings,
  updatedBy: string | null,
  store?: ProspectRunStore,
) {
  const resolved = store ?? defaultStore()
  await resolved.saveSettings(settings, updatedBy)
}
