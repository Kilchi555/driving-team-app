<template>
  <div>
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Security & Rate Limiting</h1>
        <p class="sa-page-sub">Anmeldeversuche, Blockierungen und Sicherheitsanomalien</p>
      </div>
      <button @click="loadRateLimitLogs" :disabled="isLoading" class="sa-btn-primary">
        <svg class="w-4 h-4" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Aktualisieren
      </button>
    </div>

    <!-- Passkey / Biometric Login (Super Admin) -->
    <div class="sa-card mb-5">
      <div class="sa-card-header">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>
          </svg>
          <span class="sa-card-title">Passkey &amp; Biometrie</span>
        </div>
        <span class="text-xs text-violet-400">Phishing-resistente Anmeldung für diesen Account</span>
      </div>
      <div class="p-4">
        <PasskeyManager primary-color="#7c3aed" />
      </div>
    </div>

    <!-- KPI row -->
    <div class="sa-kpi-grid-3">
      <div class="sa-kpi-card sa-kpi-rose">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 4v2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
        <div class="sa-kpi-value">{{ stats.blockedIPs }}</div>
        <div class="sa-kpi-label">Geblockte IPs ({{ filters.timeRange }})</div>
      </div>
      <div class="sa-kpi-card sa-kpi-amber">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v2m0 4v2M9 17H5a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4"/></svg></div>
        <div class="sa-kpi-value">{{ stats.failedAttempts }}</div>
        <div class="sa-kpi-label">Fehlversuche</div>
      </div>
      <div class="sa-kpi-card sa-kpi-indigo">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
        <div class="sa-kpi-value-mono">{{ stats.mostActiveIP }}</div>
        <div class="sa-kpi-label">Zuletzt geblockte IP</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="sa-filter-bar">
      <select v-model="filters.operation" class="sa-select">
        <option value="">Alle Operationen</option>
        <option value="login">Login</option>
        <option value="register">Registrierung</option>
        <option value="password_reset">Passwort zurücksetzen</option>
      </select>
      <select v-model="filters.status" class="sa-select">
        <option value="">Alle Status</option>
        <option value="allowed">Erlaubt</option>
        <option value="blocked">Blockiert</option>
      </select>
      <select v-model="filters.timeRange" class="sa-select">
        <option value="1h">Letzte Stunde</option>
        <option value="24h">Letzte 24h</option>
        <option value="7d">Letzte 7 Tage</option>
        <option value="30d">Letzte 30 Tage</option>
      </select>
    </div>

    <!-- Log table -->
    <div class="sa-card mb-5">
      <div v-if="isLoading" class="sa-loading">
        <div class="sa-spinner" />
        <p>Wird geladen…</p>
      </div>
      <div v-else-if="rateLimitLogs.length === 0" class="sa-empty">Keine Logs gefunden</div>
      <div v-else class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Zeit</th><th>Operation</th><th>IP</th><th>E-Mail</th><th>Status</th><th>Versuche</th><th>Backoff</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in rateLimitLogs" :key="log.id">
              <td class="sa-cell-muted font-mono text-xs">{{ formatDateTime(log.created_at) }}</td>
              <td>
                <span :class="['sa-badge', log.operation === 'login' ? 'sa-badge-indigo' : log.operation === 'register' ? 'sa-badge-green' : 'sa-badge-neutral']">
                  {{ getOperationLabel(log.operation) }}
                </span>
              </td>
              <td class="font-mono text-xs text-slate-300">{{ log.ip_address }}</td>
              <td class="sa-cell-muted text-xs">{{ log.email || '—' }}</td>
              <td>
                <span :class="['sa-badge', log.status === 'allowed' ? 'sa-badge-green' : 'sa-badge-red']">
                  {{ log.status === 'allowed' ? 'Erlaubt' : 'Blockiert' }}
                </span>
              </td>
              <td class="sa-cell-muted">{{ log.request_count }}/{{ log.max_requests }}</td>
              <td>
                <span :class="['sa-badge', log.backoff_level && log.backoff_level > 1 ? 'sa-badge-amber' : 'sa-badge-neutral']">
                  {{ getBackoffLabel(log.backoff_level) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="rateLimitLogs.length > 0" class="sa-pagination">
        <span class="sa-page-info">{{ rateLimitLogs.length }} / {{ totalLogs }} Einträge</span>
        <div class="flex gap-2">
          <button @click="currentPage = Math.max(1, currentPage - 1); loadRateLimitLogs()" :disabled="currentPage === 1" class="sa-page-btn">‹</button>
          <span class="sa-page-info">Seite {{ currentPage }}</span>
          <button @click="currentPage++; loadRateLimitLogs()" :disabled="rateLimitLogs.length < pageSize" class="sa-page-btn">›</button>
        </div>
      </div>
    </div>

    <!-- Bottom analytics -->
    <div class="sa-two-col">
      <!-- Top blocked IPs -->
      <div class="sa-card">
        <div class="sa-card-header"><h2 class="sa-card-title">Top 10 geblockte IPs</h2></div>
        <div v-if="topBlockedIPs.length === 0" class="sa-empty-sm">Keine Daten</div>
        <div v-else class="space-y-2">
          <div v-for="(ip, idx) in topBlockedIPs" :key="ip.ip_address" class="sa-ip-row">
            <div class="sa-ip-rank">{{ idx + 1 }}</div>
            <span class="sa-ip-addr">{{ ip.ip_address }}</span>
            <div class="text-right">
              <p class="text-xs font-semibold text-rose-400">{{ ip.block_count }}×</p>
              <p class="text-xs sa-cell-muted">{{ ip.last_blocked }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Operation stats -->
      <div class="sa-card">
        <div class="sa-card-header"><h2 class="sa-card-title">Operationen (24h)</h2></div>
        <div class="space-y-4">
          <div v-for="op in operationStats" :key="op.operation">
            <div class="flex justify-between mb-1">
              <span class="text-xs text-slate-400">{{ getOperationLabel(op.operation) }}</span>
              <span class="text-xs text-slate-400">{{ op.total }} gesamt</span>
            </div>
            <div class="sa-bar-wrap">
              <div class="sa-bar sa-bar-rose" :style="{ width: calculatePercentage(op.blocked, op.total) + '%' }" />
            </div>
            <div class="flex justify-between mt-1">
              <span class="text-xs text-emerald-400">Erlaubt: {{ op.total - op.blocked }}</span>
              <span class="text-xs text-rose-400">Blockiert: {{ op.blocked }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tenant-admin' })
import { ref, onMounted } from 'vue'
import PasskeyManager from '~/components/auth/PasskeyManager.vue'

const isLoading = ref(false)
const rateLimitLogs = ref<any[]>([])
const topBlockedIPs = ref<any[]>([])
const operationStats = ref<any[]>([])
const totalLogs = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)

const stats = ref({ blockedIPs: 0, failedAttempts: 0, mostActiveIP: '-' })
const filters = ref({ operation: '', status: '', timeRange: '24h' })

const getTimeRangeQuery = (range: string) => {
  const now = new Date()
  const s = new Date()
  if (range === '1h')  s.setHours(now.getHours() - 1)
  if (range === '24h') s.setDate(now.getDate() - 1)
  if (range === '7d')  s.setDate(now.getDate() - 7)
  if (range === '30d') s.setDate(now.getDate() - 30)
  return s.toISOString()
}
const formatDateTime = (d: string) => new Date(d).toLocaleString('de-CH', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
const getOperationLabel = (op: string) => ({ login:'Login', register:'Registrierung', password_reset:'Passwort Reset' }[op] || op)
const getBackoffLabel = (level?: number) => {
  if (!level) return 'Normal'
  return ({ 1:'1x (1min)', 2:'2x (2min)', 3:'5x (5min)', 4:'15x (15min)', 5:'60x (1h)', 6:'240x (4h)' }[level] || `${level}x`)
}
const calculatePercentage = (blocked: number, total: number) => total === 0 ? 0 : Math.round((blocked / total) * 100)

const loadRateLimitLogs = async () => {
  isLoading.value = true
  try {
    const timeRangeStart = getTimeRangeQuery(filters.value.timeRange)
    let query = supabase.from('rate_limit_logs').select('*', { count: 'exact' }).gte('created_at', timeRangeStart).order('created_at', { ascending: false })
    if (filters.value.operation) query = query.eq('operation', filters.value.operation)
    if (filters.value.status)    query = query.eq('status', filters.value.status)
    const { data, error, count } = await query.range((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value - 1)
    if (error) throw error
    rateLimitLogs.value = data || []
    totalLogs.value = count || 0
    await loadStats(); await loadTopBlockedIPs(); await loadOperationStats()
  } catch (e) { console.error(e) } finally { isLoading.value = false }
}

const loadStats = async () => {
  const start = getTimeRangeQuery(filters.value.timeRange)
  const [{ data: bd }, { data: fd }, { data: rd }] = await Promise.all([
    supabase.from('rate_limit_logs').select('ip_address').eq('status', 'blocked').gte('created_at', start),
    supabase.from('rate_limit_logs').select('id').eq('status', 'blocked').gte('created_at', start),
    supabase.from('rate_limit_logs').select('ip_address').eq('status', 'blocked').gte('created_at', start).order('created_at', { ascending: false }).limit(1),
  ])
  stats.value = {
    blockedIPs: new Set(bd?.map(d => d.ip_address) || []).size,
    failedAttempts: fd?.length || 0,
    mostActiveIP: rd?.[0]?.ip_address || '-',
  }
}

const loadTopBlockedIPs = async () => {
  const { data } = await supabase.from('rate_limit_logs').select('ip_address, created_at').eq('status', 'blocked').gte('created_at', getTimeRangeQuery(filters.value.timeRange)).order('created_at', { ascending: false })
  const map: Record<string, { count: number; last: string }> = {}
  data?.forEach(l => { if (!map[l.ip_address]) map[l.ip_address] = { count: 0, last: l.created_at }; map[l.ip_address].count++ })
  topBlockedIPs.value = Object.entries(map).map(([ip, s]) => ({ ip_address: ip, block_count: s.count, last_blocked: formatDateTime(s.last) })).sort((a, b) => b.block_count - a.block_count).slice(0, 10)
}

const loadOperationStats = async () => {
  const { data } = await supabase.from('rate_limit_logs').select('operation, status').gte('created_at', getTimeRangeQuery(filters.value.timeRange))
  const ops: Record<string, { total: number; blocked: number }> = { login: { total: 0, blocked: 0 }, register: { total: 0, blocked: 0 }, password_reset: { total: 0, blocked: 0 } }
  data?.forEach(l => { if (ops[l.operation]) { ops[l.operation].total++; if (l.status === 'blocked') ops[l.operation].blocked++ } })
  operationStats.value = Object.entries(ops).map(([op, s]) => ({ operation: op, ...s }))
}

onMounted(() => loadRateLimitLogs())
</script>

<style scoped>
.sa-page-header { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2rem;gap:1rem; }
.sa-page-title  { font-size:1.75rem;font-weight:800;color:#f1f5f9;letter-spacing:-.03em; }
.sa-page-sub    { font-size:.85rem;color:#64748b;margin-top:.25rem; }
.sa-btn-primary { display:inline-flex;align-items:center;gap:.375rem;padding:.5rem 1rem;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:.8rem;font-weight:600;border-radius:8px;border:none;cursor:pointer;transition:all .2s; }
.sa-btn-primary:hover { filter:brightness(1.1); }

.sa-kpi-grid-3 { display:grid;grid-template-columns:repeat(1,1fr);gap:1rem;margin-bottom:1.5rem; }
@media(min-width:768px) { .sa-kpi-grid-3 { grid-template-columns:repeat(3,1fr); } }
.sa-kpi-card  { border-radius:14px;padding:1.25rem;border:1px solid transparent; }
.sa-kpi-indigo { background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.2); }
.sa-kpi-amber  { background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.2); }
.sa-kpi-rose   { background:rgba(244,63,94,.08); border-color:rgba(244,63,94,.2); }
.sa-kpi-icon { width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:.75rem; }
.sa-kpi-indigo .sa-kpi-icon { background:rgba(99,102,241,.15);color:#a5b4fc; }
.sa-kpi-amber  .sa-kpi-icon { background:rgba(245,158,11,.15);color:#fcd34d; }
.sa-kpi-rose   .sa-kpi-icon { background:rgba(244,63,94,.15); color:#fda4af; }
.sa-kpi-value      { font-size:2rem;font-weight:800;color:#f1f5f9;line-height:1;letter-spacing:-.04em; }
.sa-kpi-value-mono { font-size:1.1rem;font-weight:700;color:#f1f5f9;font-family:monospace; }
.sa-kpi-label { font-size:.75rem;color:#64748b;margin-top:.375rem;font-weight:500; }

.sa-filter-bar { display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.25rem; }
.sa-select { padding:.4rem .75rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#e2e8f0;font-size:.78rem;border-radius:7px;cursor:pointer; }
.sa-select option { background:#1e2130; }

.sa-card { background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden; }
.sa-card-header { display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem 0; }
.sa-card-title  { font-size:.9rem;font-weight:700;color:#e2e8f0; }

.sa-table-wrap { overflow-x:auto; }
.sa-table { width:100%;border-collapse:collapse; }
.sa-table th { padding:.625rem .875rem;text-align:left;font-size:.7rem;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.2); }
.sa-table td { padding:.75rem .875rem;font-size:.78rem;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,.04); }
.sa-table tr:last-child td { border-bottom:none; }
.sa-table tr:hover td { background:rgba(255,255,255,.025); }
.sa-cell-muted { color:#64748b!important; }

.sa-badge { display:inline-flex;align-items:center;padding:.15rem .55rem;border-radius:999px;font-size:.68rem;font-weight:600; }
.sa-badge-green   { background:rgba(16,185,129,.1); color:#6ee7b7;border:1px solid rgba(16,185,129,.2); }
.sa-badge-red     { background:rgba(239,68,68,.1);  color:#fca5a5;border:1px solid rgba(239,68,68,.2); }
.sa-badge-amber   { background:rgba(245,158,11,.1); color:#fcd34d;border:1px solid rgba(245,158,11,.2); }
.sa-badge-indigo  { background:rgba(99,102,241,.1); color:#a5b4fc;border:1px solid rgba(99,102,241,.2); }
.sa-badge-neutral { background:rgba(100,116,139,.1);color:#94a3b8;border:1px solid rgba(100,116,139,.2); }

.sa-pagination { display:flex;align-items:center;justify-content:space-between;padding:.875rem 1.25rem;border-top:1px solid rgba(255,255,255,.06); }
.sa-page-info { font-size:.75rem;color:#64748b; }
.sa-page-btn  { padding:.25rem .625rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#94a3b8;border-radius:6px;cursor:pointer;font-size:.8rem; }
.sa-page-btn:hover { background:rgba(255,255,255,.08); }
.sa-page-btn:disabled { opacity:.4;cursor:not-allowed; }

.sa-two-col { display:grid;grid-template-columns:1fr;gap:1.25rem; }
@media(min-width:1024px) { .sa-two-col { grid-template-columns:1fr 1fr; } }

.sa-ip-row { display:flex;align-items:center;gap:.75rem;padding:.5rem 1.25rem;border-bottom:1px solid rgba(255,255,255,.04); }
.sa-ip-row:last-child { border-bottom:none; }
.sa-ip-rank { width:22px;height:22px;border-radius:50%;background:rgba(244,63,94,.1);color:#fda4af;font-size:.68rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.sa-ip-addr { flex:1;font-family:monospace;font-size:.78rem;color:#e2e8f0; }

.sa-bar-wrap { height:6px;background:rgba(255,255,255,.06);border-radius:999px;overflow:hidden; }
.sa-bar      { height:100%;background:linear-gradient(90deg,#4f46e5,#7c3aed);border-radius:999px;transition:width .3s; }
.sa-bar-rose { background:linear-gradient(90deg,#be123c,#f43f5e); }

.sa-loading { display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:3rem;color:#64748b;font-size:.8rem; }
.sa-spinner { width:32px;height:32px;border:3px solid rgba(99,102,241,.2);border-top-color:#6366f1;border-radius:50%;animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.sa-empty    { text-align:center;padding:3rem;color:#475569;font-size:.8rem; }
.sa-empty-sm { text-align:center;padding:1.5rem;color:#475569;font-size:.78rem; }
</style>
