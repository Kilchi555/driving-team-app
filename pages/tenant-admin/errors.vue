<template>
  <div>
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Error Monitoring</h1>
        <p class="sa-page-sub">Fehler und Probleme auf der Plattform</p>
      </div>
      <div class="flex gap-2">
        <button @click="loadErrors" :disabled="isLoading" class="sa-btn-primary">
          <svg class="w-4 h-4" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <div v-if="accessDenied" class="sa-card sa-empty">
      Kein Zugriff auf das Error Monitoring – diese Ansicht ist Admins und Superadmins vorbehalten.
    </div>

    <template v-else>
    <!-- KPI row -->
    <div class="sa-kpi-grid">
      <div class="sa-kpi-card sa-kpi-rose">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v2m0 4v2M9 5a3 3 0 016 0"/></svg></div>
        <div class="sa-kpi-value">{{ stats.todayErrors }}</div>
        <div class="sa-kpi-label">Fehler heute</div>
      </div>
      <div class="sa-kpi-card sa-kpi-amber">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 4v2M9 3a9 9 0 1118 0 9 9 0 01-18 0z"/></svg></div>
        <div class="sa-kpi-value">{{ stats.openErrors }}</div>
        <div class="sa-kpi-label">Offene Fehler</div>
      </div>
      <div class="sa-kpi-card sa-kpi-emerald">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
        <div class="sa-kpi-value">{{ stats.fixedErrors }}</div>
        <div class="sa-kpi-label">Behoben</div>
      </div>
      <div class="sa-kpi-card sa-kpi-violet">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 00-9.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
        <div class="sa-kpi-value">{{ stats.affectedUsers }}</div>
        <div class="sa-kpi-label">Betroffene User</div>
      </div>
      <div class="sa-kpi-card sa-kpi-indigo">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg></div>
        <div class="sa-kpi-value">{{ stats.errorRate }}%</div>
        <div class="sa-kpi-label">Error Rate</div>
      </div>
      <div class="sa-kpi-card sa-kpi-fallback" :title="'Stellen im Code, an denen mangels Live-Daten aus der DB ein hart codierter Fallback verwendet wurde (z.B. Preise, Kategorien, Tenant-Zuordnung).'">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
        <div class="sa-kpi-value">{{ stats.fallbackUsages }}</div>
        <div class="sa-kpi-label">Fallback-Nutzung (7 Tage)</div>
      </div>
    </div>

    <!-- Trend chart -->
    <div v-if="trends.length > 0" class="sa-card sa-card-p mb-5">
      <div class="sa-card-header-plain"><h2 class="sa-card-title">Error Trend</h2></div>
      <div class="sa-trend-chart">
        <div v-for="(point, idx) in trends.slice(-48)" :key="idx" class="sa-trend-bar-wrap">
          <div class="sa-trend-bar" :style="{ height: Math.max(4, (point.total / maxTrendValue) * 100) + '%' }" />
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="sa-filter-bar">
      <select v-model="filters.level" class="sa-select">
        <option value="">Alle Level</option>
        <option value="error">Error</option>
        <option value="warn">Warning</option>
        <option value="info">Info</option>
      </select>
      <select v-model="filters.status" class="sa-select">
        <option value="">Alle Status</option>
        <option value="open">Offen</option>
        <option value="investigating">Untersucht</option>
        <option value="fixed">Behoben</option>
        <option value="ignored">Ignoriert</option>
      </select>
      <select v-model="filters.component" class="sa-select">
        <option value="">Alle Komponenten</option>
        <option v-for="c in uniqueComponents" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filters.timeRange" class="sa-select">
        <option value="1h">Letzte Stunde</option>
        <option value="24h">Letzte 24h</option>
        <option value="7d">Letzte 7 Tage</option>
        <option value="30d">Letzte 30 Tage</option>
      </select>
      <input v-model="filters.search" type="text" placeholder="Suche…" class="sa-input-sm" />
    </div>

    <!-- Table -->
    <div class="sa-card">
      <div v-if="isLoading" class="sa-loading"><div class="sa-spinner" /><p>Wird geladen…</p></div>
      <div v-else-if="filteredErrors.length === 0" class="sa-empty">Keine Fehler gefunden</div>
      <div v-else class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr><th>Zeit</th><th>Level</th><th>Komponente</th><th>Nachricht</th><th>Status</th><th class="text-right">Details</th></tr>
          </thead>
          <tbody>
            <tr v-for="error in filteredErrors" :key="error.id" class="cursor-pointer">
              <td class="sa-cell-muted font-mono text-xs">{{ formatDateTime(error.created_at) }}</td>
              <td>
                <span :class="['sa-badge', error.level === 'error' ? 'sa-badge-red' : error.level === 'warn' ? 'sa-badge-amber' : 'sa-badge-indigo']">
                  {{ error.level.toUpperCase() }}
                </span>
              </td>
              <td class="text-xs font-medium" style="color:#e2e8f0">{{ error.component }}</td>
              <td class="sa-cell-muted text-xs max-w-xs truncate">{{ error.message }}</td>
              <td>
                <select v-model="error.status" @change="updateErrorStatus(error)" :class="['sa-status-select',
                  error.status === 'open' ? 'sa-status-open' :
                  error.status === 'investigating' ? 'sa-status-inv' :
                  error.status === 'fixed' ? 'sa-status-fixed' : 'sa-status-ignore']">
                  <option value="open">Offen</option>
                  <option value="investigating">Untersucht</option>
                  <option value="fixed">Behoben</option>
                  <option value="ignored">Ignoriert</option>
                </select>
              </td>
              <td class="text-right">
                <button @click="selectedError = error" class="sa-action-btn">Details</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="filteredErrors.length > 0" class="sa-pagination">
        <span class="sa-page-info">{{ filteredErrors.length }} / {{ totalErrors }} Einträge</span>
        <div class="flex gap-2">
          <button @click="currentPage = Math.max(1, currentPage - 1); loadErrors()" :disabled="currentPage === 1" class="sa-page-btn">‹</button>
          <span class="sa-page-info">Seite {{ currentPage }}</span>
          <button @click="currentPage++; loadErrors()" :disabled="filteredErrors.length < pageSize" class="sa-page-btn">›</button>
        </div>
      </div>
    </div>
    </template>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedError" class="sa-modal-backdrop" @click.self="selectedError = null">
          <div class="sa-modal">
            <div class="sa-modal-header">
              <div class="flex items-center justify-between">
                <h2 class="sa-modal-title">Error Details</h2>
                <button @click="selectedError = null" class="sa-modal-close">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div class="sa-modal-body space-y-4">
              <div>
                <p class="sa-label">Nachricht</p>
                <p class="text-sm text-slate-300 break-words">{{ selectedError.message }}</p>
              </div>
              <div v-if="selectedError.data" class="sa-code-block">
                <p class="sa-label mb-1">Stack Trace</p>
                <pre class="text-xs text-slate-400 overflow-auto max-h-48 whitespace-pre-wrap">{{ selectedError.data.stack || 'N/A' }}</pre>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div><p class="sa-label">Browser</p><p class="text-sm text-slate-300">{{ selectedError.data?.browserName || 'Unknown' }}</p></div>
                <div><p class="sa-label">URL</p><p class="text-sm text-slate-300 truncate">{{ selectedError.url || '—' }}</p></div>
              </div>
              <div v-if="selectedError.resolution_notes" class="sa-code-block">
                <p class="sa-label mb-1">Notizen</p>
                <p class="text-sm text-slate-300">{{ selectedError.resolution_notes }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tenant-admin' })
import { ref, onMounted, computed } from 'vue'

const isLoading = ref(false)
const errorLogs = ref<any[]>([])
const trends = ref<any[]>([])
const totalErrors = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const selectedError = ref<any>(null)
const accessDenied = ref(false)

const stats = ref({ todayErrors: 0, openErrors: 0, fixedErrors: 0, affectedUsers: 0, errorRate: 0, fallbackUsages: 0 })
const filters = ref({ level: '', status: '', component: '', search: '', timeRange: '7d' })

const maxTrendValue = computed(() => Math.max(...trends.value.map(t => t.total), 1))
const uniqueComponents = computed(() => [...new Set(errorLogs.value.map(e => e.component))])
const filteredErrors = computed(() => errorLogs.value.filter(e => {
  if (filters.value.level && e.level !== filters.value.level) return false
  if (filters.value.status && e.status !== filters.value.status) return false
  if (filters.value.component && e.component !== filters.value.component) return false
  if (filters.value.search && !e.message.toLowerCase().includes(filters.value.search.toLowerCase())) return false
  return true
}))

const formatDateTime = (d: string) => new Date(d).toLocaleString('de-CH', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
const rangeToHours = (range: string) => ({ '1h': 1, '24h': 24, '7d': 24 * 7, '30d': 24 * 30 }[range] || 24 * 7)

/** Buckets the currently loaded logs into hourly counts for the trend chart (client-side, no extra endpoint needed). */
const buildHourlyTrends = (logs: any[]) => {
  const buckets = new Map<string, number>()
  logs.forEach(l => {
    const hourKey = (l.created_at || '').slice(0, 13) // "YYYY-MM-DDTHH"
    if (!hourKey) return
    buckets.set(hourKey, (buckets.get(hourKey) || 0) + 1)
  })
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, total]) => ({ hour, total }))
}

const loadErrors = async () => {
  isLoading.value = true
  accessDenied.value = false
  try {
    const r = await $fetch<any>('/api/admin/error-logs', {
      params: {
        hours: rangeToHours(filters.value.timeRange),
        level: filters.value.level || undefined,
        component: filters.value.component || undefined,
        page: currentPage.value,
        limit: pageSize.value,
      }
    })
    if (r?.success) {
      errorLogs.value = r.data.errorLogs || []
      totalErrors.value = r.data.statistics?.totalErrors || 0
      trends.value = buildHourlyTrends(errorLogs.value)
    }
    loadStats()
  } catch (e: any) {
    if (e?.statusCode === 401 || e?.statusCode === 403) accessDenied.value = true
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const loadStats = () => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  stats.value = {
    todayErrors: errorLogs.value.filter(e => e.created_at >= todayStart.toISOString()).length,
    // "new" is the DB default status; treat it the same as "open" for the KPI.
    openErrors: errorLogs.value.filter(e => e.status === 'open' || e.status === 'new' || !e.status).length,
    fixedErrors: errorLogs.value.filter(e => e.status === 'fixed').length,
    affectedUsers: new Set(errorLogs.value.filter(e => e.user_id).map(e => e.user_id)).size,
    errorRate: errorLogs.value.length > 0 ? Math.round((errorLogs.value.filter(e => e.level === 'error').length / errorLogs.value.length) * 100) : 0,
    fallbackUsages: errorLogs.value.filter(e => (e.component || '').startsWith('fallback:')).length,
  }
}

const updateErrorStatus = async (error: any) => {
  try {
    await $fetch('/api/admin/error-update-status', { method: 'POST', body: { errorId: error.id, status: error.status } })
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => loadErrors())
</script>

<style scoped>
.sa-page-header { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2rem;gap:1rem; }
.sa-page-title  { font-size:1.75rem;font-weight:800;color:#f1f5f9;letter-spacing:-.03em; }
.sa-page-sub    { font-size:.85rem;color:#64748b;margin-top:.25rem; }
.sa-btn-primary { display:inline-flex;align-items:center;gap:.375rem;padding:.5rem 1rem;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:.8rem;font-weight:600;border-radius:8px;border:none;cursor:pointer; }
.sa-btn-ghost   { padding:.5rem .875rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#94a3b8;font-size:.78rem;font-weight:500;border-radius:8px;cursor:pointer; }
.sa-btn-ghost:hover { background:rgba(255,255,255,.08);color:#e2e8f0; }

.sa-kpi-grid { display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;margin-bottom:1.5rem; }
@media(min-width:640px)  { .sa-kpi-grid { grid-template-columns:repeat(3,1fr); } }
@media(min-width:1024px) { .sa-kpi-grid { grid-template-columns:repeat(6,1fr); } }
.sa-kpi-card  { border-radius:14px;padding:1.25rem;border:1px solid transparent; }
.sa-kpi-rose    { background:rgba(244,63,94,.08); border-color:rgba(244,63,94,.2); }
.sa-kpi-amber   { background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.2); }
.sa-kpi-emerald { background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.2); }
.sa-kpi-violet  { background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.2); }
.sa-kpi-indigo  { background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.2); }
.sa-kpi-fallback { background:rgba(251,146,60,.08);border-color:rgba(251,146,60,.2); }
.sa-kpi-icon { width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:.75rem; }
.sa-kpi-rose    .sa-kpi-icon { background:rgba(244,63,94,.15);  color:#fda4af; }
.sa-kpi-amber   .sa-kpi-icon { background:rgba(245,158,11,.15); color:#fcd34d; }
.sa-kpi-emerald .sa-kpi-icon { background:rgba(16,185,129,.15); color:#6ee7b7; }
.sa-kpi-violet  .sa-kpi-icon { background:rgba(139,92,246,.15); color:#c4b5fd; }
.sa-kpi-indigo  .sa-kpi-icon { background:rgba(99,102,241,.15); color:#a5b4fc; }
.sa-kpi-fallback .sa-kpi-icon { background:rgba(251,146,60,.15); color:#fdba74; }
.sa-kpi-value { font-size:2rem;font-weight:800;color:#f1f5f9;line-height:1;letter-spacing:-.04em; }
.sa-kpi-label { font-size:.75rem;color:#64748b;margin-top:.375rem;font-weight:500; }

.sa-card { background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden; }
.sa-card-p { padding:1.5rem; }
.sa-card-header-plain { margin-bottom:1rem; }
.sa-card-title { font-size:.9rem;font-weight:700;color:#e2e8f0; }

.sa-trend-chart { display:flex;align-items:flex-end;gap:2px;height:80px;background:rgba(0,0,0,.15);border-radius:8px;padding:.5rem .75rem; }
.sa-trend-bar-wrap { flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%; }
.sa-trend-bar { width:100%;background:rgba(244,63,94,.4);border-radius:2px 2px 0 0;transition:height .2s; }

.sa-filter-bar { display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.25rem;align-items:center; }
.sa-select { padding:.4rem .75rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#e2e8f0;font-size:.78rem;border-radius:7px;cursor:pointer; }
.sa-select option { background:#1e2130; }
.sa-input-sm { padding:.4rem .75rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#e2e8f0;font-size:.78rem;border-radius:7px;flex:1;min-width:140px; }
.sa-input-sm::placeholder { color:#475569; }

.sa-table-wrap { overflow-x:auto; }
.sa-table { width:100%;border-collapse:collapse; }
.sa-table th { padding:.625rem .875rem;text-align:left;font-size:.7rem;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.2); }
.sa-table td { padding:.75rem .875rem;font-size:.78rem;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,.04); }
.sa-table tr:last-child td { border-bottom:none; }
.sa-table tr:hover td { background:rgba(255,255,255,.025); }
.sa-cell-muted { color:#64748b!important; }

.sa-badge { display:inline-flex;align-items:center;padding:.15rem .55rem;border-radius:999px;font-size:.68rem;font-weight:600; }
.sa-badge-red    { background:rgba(239,68,68,.1); color:#fca5a5;border:1px solid rgba(239,68,68,.2); }
.sa-badge-amber  { background:rgba(245,158,11,.1);color:#fcd34d;border:1px solid rgba(245,158,11,.2); }
.sa-badge-indigo { background:rgba(99,102,241,.1);color:#a5b4fc;border:1px solid rgba(99,102,241,.2); }

.sa-status-select { padding:.15rem .375rem;border-radius:6px;font-size:.7rem;font-weight:600;border:none;cursor:pointer; }
.sa-status-open   { background:rgba(245,158,11,.15); color:#fcd34d; }
.sa-status-inv    { background:rgba(99,102,241,.15); color:#a5b4fc; }
.sa-status-fixed  { background:rgba(16,185,129,.15); color:#6ee7b7; }
.sa-status-ignore { background:rgba(100,116,139,.1); color:#94a3b8; }

.sa-action-btn { font-size:.72rem;font-weight:500;color:#6366f1;background:none;border:none;cursor:pointer; }
.sa-action-btn:hover { color:#a5b4fc; }

.sa-pagination { display:flex;align-items:center;justify-content:space-between;padding:.875rem 1.25rem;border-top:1px solid rgba(255,255,255,.06); }
.sa-page-info { font-size:.75rem;color:#64748b; }
.sa-page-btn  { padding:.25rem .625rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#94a3b8;border-radius:6px;cursor:pointer;font-size:.8rem; }
.sa-page-btn:disabled { opacity:.4;cursor:not-allowed; }

.sa-modal-backdrop { position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1.5rem; }
.sa-modal { background:#141620;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:560px;box-shadow:0 40px 80px rgba(0,0,0,.5);overflow:hidden; }
.sa-modal-header { padding:1.5rem 1.5rem .75rem; }
.sa-modal-title  { font-size:1rem;font-weight:700;color:#f1f5f9; }
.sa-modal-close  { color:#64748b;background:none;border:none;cursor:pointer; }
.sa-modal-close:hover { color:#94a3b8; }
.sa-modal-body   { padding:1rem 1.5rem 1.5rem; }
.sa-label { font-size:.72rem;font-weight:500;color:#64748b; }
.sa-code-block { background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:.75rem; }

.sa-loading { display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:3rem;color:#64748b;font-size:.8rem; }
.sa-spinner { width:32px;height:32px;border:3px solid rgba(99,102,241,.2);border-top-color:#6366f1;border-radius:50%;animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.sa-empty { text-align:center;padding:3rem;color:#475569;font-size:.8rem; }

.modal-enter-active,.modal-leave-active { transition:all .2s ease; }
.modal-enter-from,.modal-leave-to { opacity:0;transform:scale(.97); }
</style>
