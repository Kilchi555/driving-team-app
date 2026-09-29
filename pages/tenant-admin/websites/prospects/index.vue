<template>
  <div>
    <div class="sa-page-header">
      <div>
        <NuxtLink to="/tenant-admin/websites" class="sa-back">← Websites</NuxtLink>
        <h1 class="sa-page-title">Website-Prospects</h1>
        <p class="sa-page-sub">URL einfügen → Analyse, Umsatzrange, Vorschau-Seite und Mail-Draft. Versand erst nach deinem Review.</p>
      </div>
    </div>

    <section class="sa-card auto-card">
      <div class="auto-head">
        <div>
          <h2>Prospect Automation</h2>
          <p>Die automatische Suche bleibt aus, bis du sie einschaltest. Ein manueller Lauf nutzt denselben Job.</p>
        </div>
        <span :class="['sa-badge', savedEnabled ? 'sa-badge-green' : 'sa-badge-neutral']">
          {{ savedEnabled ? 'Aktiv' : 'Deaktiviert' }}
        </span>
      </div>

      <p v-if="!automationPersistent" class="auto-note">Die gespeicherte Konfiguration ist nicht verfügbar. Die Automation bleibt aus.</p>

      <div class="auto-grid">
        <label class="sa-check">
          <input v-model="automation.enabled" type="checkbox" :disabled="savingAutomation || !automationPersistent" />
          Automatische Ausführung
          <strong>{{ automation.enabled ? 'ON' : 'OFF' }}</strong>
        </label>
        <label class="sa-field">
          <span>Frequenz</span>
          <select v-model="automation.frequency" class="sa-input" :disabled="!automationPersistent">
            <option value="daily">Täglich</option>
          </select>
        </label>
        <label class="sa-field">
          <span>Uhrzeit</span>
          <input v-model="automation.time" type="time" step="60" class="sa-input" :disabled="!automationPersistent" />
        </label>
        <label class="sa-field">
          <span>Zeitzone</span>
          <select v-model="automation.timezone" class="sa-input" :disabled="!automationPersistent">
            <option v-if="extraZone" :value="extraZone">{{ extraZone }}</option>
            <option value="Europe/Zurich">Europe/Zurich</option>
            <option value="Europe/Berlin">Europe/Berlin</option>
            <option value="Europe/Paris">Europe/Paris</option>
            <option value="Europe/Vienna">Europe/Vienna</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
      </div>
      <p class="auto-note">Der stündliche Takt prüft, ob die gespeicherte Uhrzeit in der gewählten Zeitzone erreicht ist. Sommer- und Winterzeit folgen dieser Zeitzone.</p>
      <div class="sa-form-actions">
        <button type="button" class="sa-btn-primary" :disabled="savingAutomation || !automationPersistent" @click="saveAutomation">
          {{ savingAutomation ? 'Speichert…' : 'Einstellungen speichern' }}
        </button>
        <p v-if="lastDispatchLabel" class="auto-note">Letzter Scheduler-Check: {{ lastDispatchLabel }}</p>
      </div>

      <div class="auto-run">
        <div>
          <h3>Prospect Discovery</h3>
          <p v-if="showRunning">Prospect Discovery läuft …</p>
          <p v-else>Startet die Suche für die Stadt des heutigen UTC-Tages. Die Städte-Reihenfolge verschiebt sich dadurch nicht.</p>
        </div>
        <button type="button" class="sa-btn-primary" :disabled="runBlocked" @click="runNow">
          {{ showRunning ? 'Läuft…' : 'Jetzt ausführen' }}
        </button>
      </div>
      <p v-if="showRunning" class="sa-badge sa-badge-amber">Running</p>
      <p v-if="automationError" class="sa-error">{{ automationError }}</p>
      <p v-if="automationMessage" class="auto-ok">{{ automationMessage }}</p>

      <div v-if="lastRun" class="auto-last">
        <h3>Letzter Lauf</h3>
        <dl>
          <div><dt>Zeit</dt><dd>{{ formatWhen(lastRun.finishedAt || lastRun.startedAt) }}</dd></div>
          <div><dt>Trigger</dt><dd>{{ lastRun.trigger === 'manual' ? 'Manuell' : 'Automatisch' }}</dd></div>
          <div><dt>Status</dt><dd>{{ runStatusLabel(lastRun.status) }}</dd></div>
          <div><dt>Stadt</dt><dd>{{ lastRun.city || '—' }}</dd></div>
          <div><dt>Prospects erstellt</dt><dd>{{ lastRun.created }}</dd></div>
          <div><dt>Review</dt><dd>{{ lastRun.review }}</dd></div>
          <div><dt>Scored</dt><dd>{{ lastRun.scored }}</dd></div>
          <div><dt>Errors</dt><dd>{{ lastRun.errors }}</dd></div>
        </dl>
        <p v-if="lastRun.trigger === 'manual' && lastRun.triggeredBy" class="auto-note">Ausgelöst von Super Admin {{ lastRun.triggeredBy }}</p>
        <p v-if="lastRun.status === 'failed' && lastRun.errorSummary" class="sa-error">{{ lastRun.errorSummary }}</p>
      </div>
    </section>

    <form class="sa-card sa-form" @submit.prevent="analyze">
      <div class="sa-form-grid">
        <label class="sa-field sa-span-2">
          <span>Bestehende Website</span>
          <input v-model="form.url" type="url" placeholder="https://www.fahrschule-beispiel.ch" class="sa-input" />
        </label>
        <label class="sa-field">
          <span>Name (optional)</span>
          <input v-model="form.name" type="text" placeholder="Fahrschule Muster" class="sa-input" />
        </label>
        <label class="sa-field">
          <span>Stadt (optional)</span>
          <input v-model="form.city" type="text" placeholder="Zürich" class="sa-input" />
        </label>
        <label class="sa-field">
          <span>Branche</span>
          <select v-model="form.business_type" class="sa-input">
            <option value="">auto</option>
            <option value="driving_school">Fahrschule</option>
            <option value="mental_coach">Coaching</option>
            <option value="consulting">Consulting</option>
            <option value="therapy">Therapie</option>
            <option value="tutoring">Nachhilfe</option>
            <option value="fitness">Fitness</option>
            <option value="music_school">Musikschule</option>
            <option value="dog_training">Hundeschule</option>
            <option value="massage">Massage</option>
            <option value="generic">Andere</option>
          </select>
        </label>
        <label class="sa-check">
          <input v-model="form.generate" type="checkbox" />
          Website direkt generieren
        </label>
      </div>
      <div class="sa-form-actions">
        <button type="submit" class="sa-btn-primary" :disabled="analyzing || !canSubmit">
          {{ analyzing ? 'Analysiert… das kann 20–40 Sek. dauern' : 'Analysieren' }}
        </button>
        <p v-if="error" class="sa-error">{{ error }}</p>
      </div>
    </form>

    <div class="flex gap-2 mb-6 flex-wrap">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        :class="['sa-tab', activeTab === tab.value ? 'sa-tab-active' : '']"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
        <span class="sa-tab-count">{{ countByStatus(tab.value) }}</span>
      </button>
    </div>

    <div class="sa-card">
      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Betrieb</th>
              <th>Score</th>
              <th>SEO / Speed</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id">
              <td>
                <div class="sa-tenant-name">{{ p.name }}</div>
                <div class="sa-tenant-slug">
                  {{ p.city || '—' }} ·
                  <template v-if="!p.existing_url && p.source === 'places_cron'">keine Homepage</template>
                  <template v-else>{{ p.hostname || p.existing_url || 'ohne URL' }}</template>
                  <span v-if="p.source === 'places_cron'"> · Cron</span>
                  <span v-if="p.analysis?.architecture?.mode === 'multi'"> · Multi</span>
                  <span v-else-if="p.analysis?.architecture?.mode === 'one'"> · One</span>
                </div>
              </td>
              <td>
                <span :class="['sa-score', scoreTone(p.opportunity_score)]">{{ p.opportunity_score ?? '—' }}</span>
              </td>
              <td class="sa-cell-muted">{{ p.seo_score ?? '—' }} / {{ p.speed_score ?? '—' }}</td>
              <td><span :class="['sa-badge', statusBadge(p.status)]">{{ statusLabel(p.status) }}</span></td>
              <td class="text-right">
                <NuxtLink :to="`/tenant-admin/websites/prospects/${p.id}`" class="sa-action-btn sa-action-primary">
                  Review
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !filtered.length" class="sa-empty">Noch keine Prospects. URL oben einfügen.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tenant-admin', middleware: ['superadmin'] })
useHead({ title: 'Website-Prospects – Super Admin' })

const form = reactive({
  url: '',
  name: '',
  city: '',
  business_type: '',
  generate: true,
})
const analyzing = ref(false)
const loading = ref(true)
const error = ref('')
const prospects = ref<any[]>([])
const activeTab = ref('all')
const knownZones = ['Europe/Zurich', 'Europe/Berlin', 'Europe/Paris', 'Europe/Vienna', 'UTC']
const automation = reactive({
  enabled: false,
  frequency: 'daily',
  time: '04:30',
  timezone: 'Europe/Zurich',
})
const automationPersistent = ref(true)
const savedEnabled = ref(false)
const activeRun = ref<any>(null)
const lastRun = ref<any>(null)
const lastDispatch = ref<{ at?: string | null; result?: string | null } | null>(null)
const runningNow = ref(false)
const savingAutomation = ref(false)
const automationError = ref('')
const automationMessage = ref('')
let automationPoll: ReturnType<typeof setInterval> | undefined

const statusTabs = [
  { label: 'Alle', value: 'all' },
  { label: 'In Prüfung', value: 'review' },
  { label: 'Analysiert', value: 'scored' },
  { label: 'Freigegeben', value: 'approved' },
  { label: 'Übersprungen', value: 'skipped' },
]

const canSubmit = computed(() => !!form.url.trim() || !!form.name.trim())
const extraZone = computed(() => knownZones.includes(automation.timezone) ? '' : automation.timezone)
const showRunning = computed(() => runningNow.value || !!activeRun.value)
const runBlocked = computed(() => showRunning.value || savingAutomation.value)
const lastDispatchLabel = computed(() => {
  const at = lastDispatch.value?.at
  if (!at) return ''
  const reason = ({
    disabled: 'Automation aus',
    not_due: 'noch nicht fällig',
    started: 'Lauf gestartet',
    already_running: 'bereits ein Lauf aktiv',
  } as Record<string, string>)[lastDispatch.value?.result || ''] || 'geprüft'
  return `${formatWhen(at)} · ${reason}`
})
const filtered = computed(() => {
  if (activeTab.value === 'all') return prospects.value
  return prospects.value.filter((p) => p.status === activeTab.value)
})

const authHeaders = async () => {
  const sb = getSupabase()
  const { data: { session } } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

const formatWhen = (iso?: string | null) => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const runStatusLabel = (status: string) => ({
  running: 'Running',
  completed: 'Completed',
  failed: 'Fehlgeschlagen',
  skipped: 'Übersprungen',
}[status] || status)

const stopAutomationPoll = () => {
  if (!automationPoll) return
  clearInterval(automationPoll)
  automationPoll = undefined
}

const loadAutomation = async () => {
  try {
    const res = await $fetch<{
      settings: { enabled: boolean; frequency: string; time: string; timezone: string }
      activeRun: any
      lastRun: any
      lastDispatch: { at: string | null; result: string | null }
      persistent: boolean
    }>('/api/tenant-admin/website-prospects/automation', { headers: await authHeaders() })
    savedEnabled.value = !!res.settings?.enabled
    automation.enabled = savedEnabled.value
    automation.frequency = res.settings?.frequency || 'daily'
    automation.time = res.settings?.time || '04:30'
    automation.timezone = res.settings?.timezone || 'Europe/Zurich'
    automationPersistent.value = res.persistent !== false
    activeRun.value = res.activeRun || null
    lastRun.value = res.lastRun || null
    lastDispatch.value = res.lastDispatch || null
  } catch {
    savedEnabled.value = false
    automation.enabled = false
    automationPersistent.value = false
    activeRun.value = null
  }
}

const ensureAutomationPoll = () => {
  if (automationPoll || (!activeRun.value && !runningNow.value)) return
  automationPoll = setInterval(() => { loadAutomation() }, 4000)
}

const saveAutomation = async () => {
  automationError.value = ''
  automationMessage.value = ''
  savingAutomation.value = true
  try {
    await $fetch('/api/tenant-admin/website-prospects/automation', {
      method: 'PUT',
      headers: await authHeaders(),
      body: {
        enabled: automation.enabled,
        frequency: 'daily',
        time: automation.time,
        timezone: automation.timezone,
      },
    })
    automationMessage.value = automation.enabled ? 'Automatische Ausführung ist aktiv.' : 'Automatische Ausführung ist aus.'
    await loadAutomation()
  } catch {
    automationError.value = 'Die Automation konnte nicht gespeichert werden.'
  } finally {
    savingAutomation.value = false
  }
}

const runNow = async () => {
  if (runBlocked.value) return
  automationError.value = ''
  automationMessage.value = ''
  runningNow.value = true
  ensureAutomationPoll()
  try {
    const res = await $fetch<{
      status?: string
      runId?: string | null
      created?: number
      errors?: number
      errorSummary?: string | null
    }>('/api/tenant-admin/website-prospects/automation/run', {
      method: 'POST',
      headers: await authHeaders(),
      timeout: 90_000,
    })
    await loadAutomation()
    if (res.status === 'failed') {
      automationError.value = res.errorSummary
        ? `Der Prospect-Discovery-Lauf ist fehlgeschlagen. ${res.errorSummary}`
        : 'Der Prospect-Discovery-Lauf ist fehlgeschlagen.'
    } else {
      automationMessage.value = 'Prospect Discovery abgeschlossen.'
    }
    try { await load() } catch { /* the run result stays visible if the list refresh fails */ }
  } catch (e: any) {
    const status = e?.statusCode || e?.status || e?.response?.status
    automationError.value = status === 409
      ? 'Ein Prospect-Discovery-Lauf läuft bereits.'
      : 'Der Prospect-Discovery-Lauf konnte nicht gestartet werden.'
    await loadAutomation()
  } finally {
    runningNow.value = false
    if (!activeRun.value) stopAutomationPoll()
  }
}

const load = async () => {
  loading.value = true
  try {
    const res = await $fetch<{ prospects: any[] }>('/api/tenant-admin/website-prospects', {
      headers: await authHeaders(),
    })
    prospects.value = res.prospects || []
  } finally {
    loading.value = false
  }
}

const analyze = async () => {
  error.value = ''
  analyzing.value = true
  try {
    const res = await $fetch<{ prospect: { id: string }; generate_error?: string }>(
      '/api/tenant-admin/website-prospects/analyze',
      {
        method: 'POST',
        headers: await authHeaders(),
        timeout: 90_000,
        body: {
          url: form.url.trim() || null,
          name: form.name.trim() || null,
          city: form.city.trim() || null,
          business_type: form.business_type || null,
          generate: form.generate,
        },
      },
    )
    if (res.generate_error) error.value = `Analyse ok, Generate: ${res.generate_error}`
    await load()
    if (res.prospect?.id) await navigateTo(`/tenant-admin/websites/prospects/${res.prospect.id}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message || 'Analyse fehlgeschlagen'
  } finally {
    analyzing.value = false
  }
}

const countByStatus = (status: string) =>
  status === 'all' ? prospects.value.length : prospects.value.filter((p) => p.status === status).length

const statusLabel = (s: string) =>
  ({
    discovered: 'Neu',
    scored: 'Analysiert',
    generated: 'Generiert',
    review: 'In Prüfung',
    approved: 'Freigegeben',
    sent: 'Gesendet',
    claimed: 'Claimed',
    skipped: 'Skip',
    rejected: 'Abgelehnt',
  }[s] || s)

const statusBadge = (s: string) =>
  ({
    review: 'sa-badge-amber',
    scored: 'sa-badge-blue',
    approved: 'sa-badge-green',
    generated: 'sa-badge-blue',
    skipped: 'sa-badge-neutral',
    rejected: 'sa-badge-red',
  }[s] || 'sa-badge-neutral')

const scoreTone = (n?: number | null) => {
  if (n == null) return ''
  if (n >= 70) return 'hot'
  if (n >= 45) return 'warm'
  return 'cold'
}

watch([activeRun, runningNow], () => {
  if (activeRun.value || runningNow.value) ensureAutomationPoll()
  else stopAutomationPoll()
})

onMounted(() => {
  load()
  loadAutomation()
})
onBeforeUnmount(stopAutomationPoll)
</script>

<style scoped>
.sa-page-header { margin-bottom: 1.5rem; }
.sa-back { display:inline-block; font-size:0.75rem; color:#818cf8; text-decoration:none; margin-bottom:0.35rem; }
.sa-page-title { font-size:1.375rem; font-weight:800; color:#f1f5f9; }
.sa-page-sub { font-size:0.8rem; color:#64748b; margin-top:0.25rem; max-width:40rem; }
.sa-form { padding:1.25rem; margin-bottom:1.5rem; }
.sa-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0.75rem; }
.sa-span-2 { grid-column:span 2; }
.sa-field { display:flex; flex-direction:column; gap:0.35rem; font-size:0.72rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; }
.sa-input { width:100%; padding:0.55rem 0.75rem; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#121526; color:#e2e8f0; font-size:0.85rem; }
.sa-check { display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; color:#cbd5e1; text-transform:none; letter-spacing:0; font-weight:600; }
.sa-form-actions { margin-top:1rem; display:flex; align-items:center; gap:1rem; }
.sa-error { color:#f87171; font-size:0.8rem; }
.sa-tab { display:flex; align-items:center; gap:0.5rem; padding:0.375rem 0.875rem; border-radius:8px; font-size:0.8rem; font-weight:600; color:#94a3b8; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); cursor:pointer; }
.sa-tab-active { color:#a5b4fc !important; background:rgba(99,102,241,0.15) !important; border-color:rgba(99,102,241,0.3) !important; }
.sa-tab-count { background:rgba(255,255,255,0.08); padding:0.1rem 0.4rem; border-radius:999px; font-size:0.7rem; }
.sa-card { background:#1a1d2e; border:1px solid rgba(255,255,255,0.06); border-radius:14px; overflow:hidden; }
.sa-table-wrap { overflow-x:auto; }
.sa-table { width:100%; border-collapse:collapse; font-size:0.82rem; }
.sa-table th { padding:0.75rem 1rem; text-align:left; font-size:0.7rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.06em; }
.sa-table td { padding:0.875rem 1rem; color:#cbd5e1; }
.sa-table tbody tr { border-top:1px solid rgba(255,255,255,0.04); }
.sa-cell-muted { color:#64748b !important; }
.sa-tenant-name { font-weight:600; color:#e2e8f0; }
.sa-tenant-slug { font-size:0.72rem; color:#475569; margin-top:0.1rem; }
.sa-badge { display:inline-flex; padding:0.2rem 0.6rem; border-radius:999px; font-size:0.7rem; font-weight:700; }
.sa-badge-green { background:rgba(16,185,129,0.12); color:#34d399; }
.sa-badge-amber { background:rgba(245,158,11,0.12); color:#fbbf24; }
.sa-badge-red { background:rgba(239,68,68,0.1); color:#f87171; }
.sa-badge-blue { background:rgba(99,102,241,0.12); color:#a5b4fc; }
.sa-badge-neutral { background:rgba(100,116,139,0.15); color:#64748b; }
.sa-score { font-weight:800; font-variant-numeric:tabular-nums; }
.sa-score.hot { color:#fbbf24; }
.sa-score.warm { color:#a5b4fc; }
.sa-score.cold { color:#64748b; }
.sa-action-btn { padding:0.3rem 0.75rem; border-radius:6px; font-size:0.75rem; font-weight:600; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:#94a3b8; text-decoration:none; }
.sa-action-primary { background:rgba(99,102,241,0.15) !important; border-color:rgba(99,102,241,0.25) !important; color:#a5b4fc !important; }
.sa-btn-primary { padding:0.55rem 1rem; background:linear-gradient(135deg,#4f46e5,#7c3aed); border:none; border-radius:8px; font-size:0.82rem; font-weight:700; color:white; cursor:pointer; }
.sa-btn-primary:disabled { opacity:0.55; cursor:wait; }
.sa-empty { padding:3rem 1.5rem; text-align:center; color:#475569; }
.auto-card { padding:1.25rem; margin-bottom:1.5rem; }
.auto-head, .auto-run { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; }
.auto-head h2, .auto-run h3, .auto-last h3 { margin:0; color:#f1f5f9; font-size:1rem; }
.auto-head p, .auto-run p { margin:0.35rem 0 0; color:#94a3b8; font-size:0.8rem; max-width:40rem; }
.auto-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:0.75rem; margin-top:1rem; }
.auto-note { margin:0.75rem 0 0; color:#64748b; font-size:0.75rem; }
.auto-ok { color:#34d399; font-size:0.8rem; margin:0.75rem 0 0; }
.auto-run { margin-top:1.25rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.06); }
.auto-last { margin-top:1rem; }
.auto-last dl { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:0.75rem 1rem; margin:0.75rem 0 0; }
.auto-last dt { font-size:0.68rem; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:#64748b; }
.auto-last dd { margin:0.2rem 0 0; color:#e2e8f0; font-size:0.85rem; }
@media (max-width: 720px) {
  .sa-form-grid, .auto-grid, .auto-last dl { grid-template-columns:1fr; }
  .sa-span-2 { grid-column:span 1; }
  .auto-head, .auto-run { flex-direction:column; }
}
</style>
