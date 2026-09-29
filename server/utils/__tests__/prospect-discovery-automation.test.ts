import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { requireSuperAdmin } from '../require-super-admin'
import {
  PROSPECT_AUTOMATION_DEFAULTS,
  dispatchCronProspectDiscovery,
  isAutomationDue,
  localDateKey,
  parseAutomationSettings,
  readProspectAutomation,
  sanitizeErrorSummary,
  saveProspectAutomationSettings,
  settingsFromRow,
  startManualProspectDiscovery,
  startProspectDiscoveryRun,
  zonedParts,
  type DispatchNote,
  type ProspectRunStore,
  type PublicProspectRun,
} from '../prospect-discovery-automation'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}))

vi.mock('~/server/utils/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/auth')>()
  return { ...actual, getAuthenticatedUser: mocks.getUser }
})

const ACTOR = '11111111-1111-4111-8111-111111111111'
const WINTER_DUE = new Date('2026-01-15T03:30:00.000Z')
const SUMMER_DUE = new Date('2026-07-15T02:30:00.000Z')
const ENABLED = {
  enabled: true,
  frequency: 'daily' as const,
  time: '04:30',
  timezone: 'Europe/Zurich',
}

type StoredRun = {
  id: string
  trigger: 'manual' | 'cron'
  triggered_by: string | null
  status: PublicProspectRun['status']
  started_at: string
  finished_at?: string | null
  city?: string | null
  duration_ms?: number | null
  created_count?: number
  review_count?: number
  scored_count?: number
  error_count?: number
  generated_count?: number
  emails_sent?: number
  error_summary?: string | null
}

function memoryStore() {
  const state = {
    settings: { ...PROSPECT_AUTOMATION_DEFAULTS },
    lastDispatch: { at: null as string | null, result: null as DispatchNote | null },
    runs: [] as StoredRun[],
    failLoad: false,
  }
  const toPublic = (run: StoredRun | undefined): PublicProspectRun | null => {
    if (!run) return null
    return {
      id: String(run.id),
      trigger: run.trigger === 'manual' ? 'manual' : 'cron',
      triggeredBy: run.triggered_by ?? null,
      status: run.status,
      startedAt: run.started_at,
      finishedAt: run.finished_at ?? null,
      city: run.city ?? null,
      durationMs: run.duration_ms ?? null,
      created: run.created_count ?? 0,
      review: run.review_count ?? 0,
      scored: run.scored_count ?? 0,
      errors: run.error_count ?? 0,
      generated: run.generated_count ?? 0,
      emailsSent: 0,
      errorSummary: run.error_summary ?? null,
    }
  }
  const store: ProspectRunStore = {
    async loadSettings() {
      if (state.failLoad) throw new Error('relation prospect_discovery_settings does not exist')
      return { settings: { ...state.settings }, lastDispatch: { ...state.lastDispatch } }
    },
    async saveSettings(settings) {
      state.settings = { ...settings }
    },
    async noteDispatch(result, at) {
      state.lastDispatch = { at, result }
    },
    async releaseStaleRuns(cutoff) {
      for (const run of state.runs) {
        if (run.status === 'running' && String(run.started_at) < cutoff) {
          run.status = 'failed'
          run.finished_at = new Date().toISOString()
          run.error_summary = 'stale'
        }
      }
    },
    async tryInsertRunning(row) {
      if (state.runs.some((run) => run.status === 'running')) return { ok: false }
      const id = `run-${state.runs.length + 1}`
      state.runs.push({
        id,
        ...row,
        status: 'running',
        city: null,
        finished_at: null,
        created_count: 0,
        review_count: 0,
        scored_count: 0,
        error_count: 0,
        generated_count: 0,
        emails_sent: 0,
        error_summary: null,
      })
      return { ok: true, id }
    },
    async finishRun(id, patch) {
      const run = state.runs.find((item) => item.id === id)
      if (!run) throw new Error('missing run')
      Object.assign(run, patch)
    },
    async findActiveRun() {
      return toPublic([...state.runs].reverse().find((run) => run.status === 'running'))
    },
    async findLastFinishedRun() {
      return toPublic([...state.runs].reverse().find((run) => run.status === 'completed' || run.status === 'failed'))
    },
    async hasCronRunOnLocalDate(dateKey, timeZone) {
      return state.runs.some((run) => {
        if (run.trigger !== 'cron') return false
        if (!['running', 'completed', 'failed'].includes(run.status)) return false
        return localDateKey(new Date(run.started_at), timeZone) === dateKey
      })
    },
  }
  return { state, store }
}

const reviewSummary = async () => ({
  city: 'Bern',
  searched: 1,
  details: 1,
  created: 1,
  skippedDuplicate: 0,
  skippedWeak: 0,
  unsafeUrls: 0,
  pagespeed: 0,
  errors: 0,
  scored: 1,
  emailsSent: 0 as const,
  generated: [{ id: 'p1', place_id: 'place-1', status: 'review' }],
})

describe('prospect automation defaults and schedule', () => {
  it('treats a missing or corrupt settings row as disabled', () => {
    expect(PROSPECT_AUTOMATION_DEFAULTS.enabled).toBe(false)
    expect(settingsFromRow(null).enabled).toBe(false)
    expect(settingsFromRow({ enabled: 'true', frequency: 'daily', run_time: '04:30', timezone: 'Europe/Zurich' }).enabled).toBe(false)
    expect(settingsFromRow({ enabled: true, frequency: 'hourly', run_time: '04:30', timezone: 'Europe/Zurich' }).enabled).toBe(false)
    expect(settingsFromRow({ enabled: true, frequency: 'daily', run_time: '99:99', timezone: 'Europe/Zurich' }).enabled).toBe(false)
  })

  it('matches 04:30 Europe/Zurich across winter and summer time', () => {
    expect(zonedParts(WINTER_DUE, 'Europe/Zurich')).toMatchObject({ hour: 4, minute: 30, month: 1, day: 15 })
    expect(zonedParts(SUMMER_DUE, 'Europe/Zurich')).toMatchObject({ hour: 4, minute: 30, month: 7, day: 15 })
    expect(isAutomationDue({ settings: ENABLED, now: WINTER_DUE, cronAlreadyStartedOnLocalDate: false })).toBe(true)
    expect(isAutomationDue({ settings: ENABLED, now: SUMMER_DUE, cronAlreadyStartedOnLocalDate: false })).toBe(true)
    const utcMorning = new Date('2026-01-15T04:30:00.000Z')
    expect(zonedParts(utcMorning, 'Europe/Zurich')).toMatchObject({ hour: 5, minute: 30 })
    expect(isAutomationDue({ settings: ENABLED, now: utcMorning, cronAlreadyStartedOnLocalDate: false })).toBe(false)
    expect(isAutomationDue({
      settings: { ...ENABLED, enabled: false },
      now: WINTER_DUE,
      cronAlreadyStartedOnLocalDate: false,
    })).toBe(false)
    expect(isAutomationDue({ settings: ENABLED, now: WINTER_DUE, cronAlreadyStartedOnLocalDate: true })).toBe(false)
  })

  it('rejects settings that are not booleans, daily HH:MM, or a real timezone', () => {
    const ok = parseAutomationSettings({
      enabled: true,
      frequency: 'daily',
      time: '04:30',
      timezone: 'Europe/Zurich',
      tenant_id: 'tenant-evil',
      emailsSent: 9,
    })
    expect(ok).toEqual({ ok: true, settings: ENABLED })
    expect(parseAutomationSettings({ enabled: 'true', frequency: 'daily', time: '04:30', timezone: 'Europe/Zurich' }).ok).toBe(false)
    expect(parseAutomationSettings({ enabled: true, frequency: 'hourly', time: '04:30', timezone: 'Europe/Zurich' }).ok).toBe(false)
    expect(parseAutomationSettings({ enabled: true, frequency: 'daily', time: '04:30; rm -rf /', timezone: 'Europe/Zurich' }).ok).toBe(false)
    expect(parseAutomationSettings({
      enabled: true,
      frequency: 'daily',
      time: '04:30',
      timezone: "Europe/Zurich'; drop table users;--",
    }).ok).toBe(false)
  })

  it('stores the migration as default-off, service-role only, and single-running', () => {
    const sql = readFileSync(resolve(process.cwd(), 'sql_migrations/20260927_prospect_discovery_automation.sql'), 'utf8')
    expect(sql).toContain('enabled boolean not null default false')
    expect(sql).toContain('values (1, false,')
    expect(sql).toContain('on conflict (id) do nothing')
    expect(sql).toContain('revoke all on table public.prospect_discovery_settings from anon, authenticated')
    expect(sql).toContain('revoke all on table public.prospect_discovery_runs from anon, authenticated')
    expect(sql).toContain('grant all on table public.prospect_discovery_settings to service_role')
    expect(sql).toContain("where status = 'running'")
    expect(sql.toLowerCase()).toContain('enable row level security')
    expect(sql.toLowerCase()).not.toContain('create policy')
    expect(sql).not.toContain('tenant_id')
    const vercel = readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')
    expect(vercel).toContain('"/api/cron/discover-website-prospects"')
    expect(vercel).toContain('"schedule": "30 * * * *"')
  })
})

describe('prospect discovery triggers share one job', () => {
  it('does not discover when automation is disabled or the settings cannot be read', async () => {
    const disabled = memoryStore()
    const runDiscovery = vi.fn(reviewSummary)
    const skipped = await dispatchCronProspectDiscovery({ now: WINTER_DUE, store: disabled.store, runDiscovery })
    expect(skipped).toMatchObject({ ok: true, skipped: 'automation_disabled', emailsSent: 0 })
    expect(runDiscovery).not.toHaveBeenCalled()
    expect(disabled.state.lastDispatch.result).toBe('disabled')
    expect(disabled.state.runs).toHaveLength(0)

    const broken = memoryStore()
    broken.state.failLoad = true
    broken.state.settings.enabled = true
    const hidden = await dispatchCronProspectDiscovery({ now: WINTER_DUE, store: broken.store, runDiscovery })
    expect(hidden.skipped).toBe('automation_disabled')
    expect(runDiscovery).not.toHaveBeenCalled()
  })

  it('starts the same discovery function from cron only when the local slot is due', async () => {
    const { state, store } = memoryStore()
    state.settings = { ...ENABLED }
    const runDiscovery = vi.fn(reviewSummary)
    const early = await dispatchCronProspectDiscovery({
      now: new Date('2026-01-15T02:30:00.000Z'),
      store,
      runDiscovery,
    })
    expect(early.skipped).toBe('not_due')
    expect(runDiscovery).not.toHaveBeenCalled()

    const started = await dispatchCronProspectDiscovery({ now: WINTER_DUE, store, runDiscovery })
    expect(started).toMatchObject({
      ok: true,
      status: 'completed',
      trigger: 'cron',
      city: 'Bern',
      created: 1,
      review: 1,
      scored: 1,
      emailsSent: 0,
    })
    expect(runDiscovery).toHaveBeenCalledTimes(1)
    expect(state.runs[0].trigger).toBe('cron')
    expect(state.runs[0].triggered_by).toBeNull()
    expect(state.runs[0].emails_sent).toBe(0)

    const repeat = await dispatchCronProspectDiscovery({ now: WINTER_DUE, store, runDiscovery })
    expect(repeat.skipped).toBe('not_due')
    expect(runDiscovery).toHaveBeenCalledTimes(1)
  })

  it('starts the same discovery function from a manual trigger without shifting the cron day', async () => {
    const { state, store } = memoryStore()
    state.settings = { ...ENABLED }
    const runDiscovery = vi.fn(reviewSummary)
    await dispatchCronProspectDiscovery({ now: WINTER_DUE, store, runDiscovery })
    const manual = await startManualProspectDiscovery({
      triggeredBy: ACTOR,
      now: WINTER_DUE,
      store,
      runDiscovery,
    })
    expect(manual).toMatchObject({ status: 'completed', trigger: 'manual', emailsSent: 0 })
    expect(runDiscovery).toHaveBeenCalledTimes(2)
    expect(state.runs[1].triggered_by).toBe(ACTOR)
    expect(state.runs.filter((run) => run.trigger === 'cron')).toHaveLength(1)
  })

  it('rejects a second trigger while a run is still going', async () => {
    const { store } = memoryStore()
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => { release = resolve })
    let calls = 0
    const runDiscovery = vi.fn(async () => {
      calls += 1
      await gate
      return reviewSummary()
    })
    const now = WINTER_DUE
    const first = startProspectDiscoveryRun({
      trigger: 'manual',
      triggeredBy: ACTOR,
      now,
      store,
      runDiscovery,
    })
    await vi.waitUntil(() => calls === 1)
    const second = await startManualProspectDiscovery({ triggeredBy: ACTOR, now, store, runDiscovery })
    const cron = await dispatchCronProspectDiscovery({
      now,
      store: { ...store, loadSettings: async () => ({ settings: { ...ENABLED }, lastDispatch: { at: null, result: null } }) },
      runDiscovery,
    })
    expect(second.skipped).toBe('already_running')
    expect(cron.skipped).toBe('already_running')
    expect(calls).toBe(1)
    release()
    await expect(first).resolves.toMatchObject({ status: 'completed' })
  })

  it('marks the run failed and releases the lock when discovery throws', async () => {
    const { state, store } = memoryStore()
    const failed = await startManualProspectDiscovery({
      triggeredBy: ACTOR,
      now: WINTER_DUE,
      store,
      runDiscovery: async () => {
        throw new Error('places failed key=AIzaSySECRET1234567890')
      },
    })
    expect(failed.status).toBe('failed')
    expect(failed.emailsSent).toBe(0)
    expect(failed.errorSummary).not.toContain('AIza')
    expect(state.runs[0].status).toBe('failed')
    const again = await startManualProspectDiscovery({
      triggeredBy: ACTOR,
      now: WINTER_DUE,
      store,
      runDiscovery: reviewSummary,
    })
    expect(again.status).toBe('completed')
  })

  it('replaces a stale running row before starting again', async () => {
    const { state, store } = memoryStore()
    state.runs.push({
      id: 'stale',
      trigger: 'cron',
      triggered_by: null,
      status: 'running',
      started_at: new Date(WINTER_DUE.getTime() - 10 * 60 * 1000).toISOString(),
      emails_sent: 0,
    })
    const result = await startManualProspectDiscovery({
      triggeredBy: ACTOR,
      now: WINTER_DUE,
      store,
      runDiscovery: reviewSummary,
    })
    expect(result.status).toBe('completed')
    expect(state.runs.find((run) => run.id === 'stale')?.status).toBe('failed')
  })

  it('redacts secrets from stored error text', () => {
    const text = sanitizeErrorSummary('Bearer abc.def.ghi and sb_secret_live_key AIzaSySECRET1234567890')
    expect(text).not.toContain('AIza')
    expect(text).not.toContain('sb_secret')
    expect(text).not.toContain('abc.def')
  })

  it('keeps city rotation inside the discovery job', () => {
    const automation = readFileSync(resolve(process.cwd(), 'server/utils/prospect-discovery-automation.ts'), 'utf8')
    const discover = readFileSync(resolve(process.cwd(), 'server/utils/website-prospect-discover.ts'), 'utf8')
    expect(automation).not.toContain('cronCityForDate')
    expect(automation).toContain('runCronWebsiteProspectDiscovery()')
    expect(discover).toContain('cronCityForDate')
    const page = readFileSync(resolve(process.cwd(), 'pages/tenant-admin/websites/prospects/index.vue'), 'utf8')
    expect(page).toContain('Jetzt ausführen')
    expect(page).toContain('/api/tenant-admin/website-prospects/automation')
    expect(page).not.toMatch(/googleapis|SUPABASE_SERVICE|CRON_SECRET|service_role/i)
  })

  it('saves only the validated settings object', async () => {
    const { state, store } = memoryStore()
    await saveProspectAutomationSettings(ENABLED, ACTOR, store)
    expect(state.settings).toEqual(ENABLED)
    const snapshot = await readProspectAutomation(store)
    expect(snapshot.persistent).toBe(true)
    expect(snapshot.settings.enabled).toBe(true)
    const broken = memoryStore()
    broken.state.failLoad = true
    const fallback = await readProspectAutomation(broken.store)
    expect(fallback.persistent).toBe(false)
    expect(fallback.settings.enabled).toBe(false)
  })
})

describe('requireSuperAdmin still gates prospect automation', () => {
  it('denies anonymous, tenant admin, and normal users', async () => {
    mocks.getUser.mockResolvedValue(null)
    await expect(requireSuperAdmin({} as never)).rejects.toMatchObject({ statusCode: 401 })

    mocks.getUser.mockResolvedValue({ role: 'admin', db_user_id: '22222222-2222-4222-8222-222222222222' })
    await expect(requireSuperAdmin({} as never)).rejects.toMatchObject({ statusCode: 403 })

    mocks.getUser.mockResolvedValue({ role: 'client', db_user_id: '33333333-3333-4333-8333-333333333333' })
    await expect(requireSuperAdmin({} as never)).rejects.toMatchObject({ statusCode: 403 })

    mocks.getUser.mockResolvedValue({ role: 'staff', db_user_id: '44444444-4444-4444-8444-444444444444' })
    await expect(requireSuperAdmin({} as never)).rejects.toMatchObject({ statusCode: 403 })

    mocks.getUser.mockResolvedValue({ role: 'super_admin', db_user_id: ACTOR })
    await expect(requireSuperAdmin({} as never)).resolves.toMatchObject({ role: 'super_admin' })
  })
})
