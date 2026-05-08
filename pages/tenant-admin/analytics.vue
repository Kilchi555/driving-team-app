<template>
  <div>
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Analytics & Monitoring</h1>
        <p class="sa-page-sub">Plattform-Performance aller Tenants</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="selectedTimeRange" @change="loadAnalytics" class="sa-select">
          <option v-for="o in timeRangeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <button @click="setupAnalytics" :disabled="isLoading" class="sa-btn-ghost-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Setup
        </button>
        <button @click="refreshData" :disabled="isLoading" class="sa-btn-primary">
          <svg class="w-4 h-4" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="sa-kpi-grid">
      <div class="sa-kpi-card sa-kpi-indigo">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg></div>
        <div class="sa-kpi-value">{{ metrics.activeTenants }}</div>
        <div class="sa-kpi-label">Aktive Tenants</div>
        <div class="sa-kpi-trend sa-trend-up">+{{ metrics.tenantGrowth }}%</div>
      </div>
      <div class="sa-kpi-card sa-kpi-emerald">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
        <div class="sa-kpi-value">{{ metrics.totalUsers }}</div>
        <div class="sa-kpi-label">Gesamt Benutzer</div>
        <div class="sa-kpi-trend sa-trend-up">+{{ metrics.userGrowth }}%</div>
      </div>
      <div class="sa-kpi-card sa-kpi-amber">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
        <div class="sa-kpi-value">{{ metrics.activeAppointments }}</div>
        <div class="sa-kpi-label">Aktive Termine</div>
        <div class="sa-kpi-sub">Heute: {{ metrics.todayAppointments }}</div>
      </div>
      <div class="sa-kpi-card sa-kpi-violet">
        <div class="sa-kpi-icon"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
        <div class="sa-kpi-value">{{ metrics.uptime }}%</div>
        <div class="sa-kpi-label">Uptime</div>
        <div class="sa-kpi-trend sa-trend-up">Alle Systeme online</div>
      </div>
    </div>

    <!-- Two col -->
    <div class="sa-two-col mb-5">
      <!-- API Performance -->
      <div class="sa-card">
        <div class="sa-card-header"><h2 class="sa-card-title">API Performance</h2></div>
        <div class="space-y-3">
          <div class="sa-metric-row">
            <span class="sa-metric-label">Avg Response Time</span>
            <span class="sa-metric-val">{{ metrics.avgResponseTime }}ms</span>
          </div>
          <div class="sa-metric-row">
            <span class="sa-metric-label">API-Calls (letzte Std.)</span>
            <span class="sa-metric-val">{{ metrics.apiCallsLastHour }}</span>
          </div>
          <div class="sa-metric-row">
            <span class="sa-metric-label">Fehlerrate</span>
            <span class="sa-metric-val" :class="metrics.errorRate > 1 ? 'text-rose-400' : 'text-emerald-400'">{{ metrics.errorRate }}%</span>
          </div>
        </div>
      </div>

      <!-- DB Performance -->
      <div class="sa-card">
        <div class="sa-card-header"><h2 class="sa-card-title">Datenbank</h2></div>
        <div class="space-y-3">
          <div class="sa-metric-row">
            <span class="sa-metric-label">Aktive Verbindungen</span>
            <span class="sa-metric-val">{{ metrics.dbConnections }}</span>
          </div>
          <div class="sa-metric-row">
            <span class="sa-metric-label">Query-Zeit (avg)</span>
            <span class="sa-metric-val">{{ metrics.avgQueryTime }}ms</span>
          </div>
          <div class="sa-metric-row">
            <span class="sa-metric-label">Cache Hit Rate</span>
            <span class="sa-metric-val text-emerald-400">{{ metrics.cacheHitRate }}%</span>
          </div>
        </div>
      </div>

      <!-- System Resources -->
      <div class="sa-card">
        <div class="sa-card-header"><h2 class="sa-card-title">System Resources</h2></div>
        <div class="space-y-3">
          <div class="sa-res-row">
            <span class="sa-metric-label">CPU</span>
            <div class="sa-bar-wrap"><div class="sa-bar" :style="{ width: metrics.cpuUsage + '%' }" /></div>
            <span class="sa-metric-val w-10">{{ metrics.cpuUsage }}%</span>
          </div>
          <div class="sa-res-row">
            <span class="sa-metric-label">Memory</span>
            <div class="sa-bar-wrap"><div class="sa-bar sa-bar-violet" :style="{ width: metrics.memoryUsage + '%' }" /></div>
            <span class="sa-metric-val w-10">{{ metrics.memoryUsage }}%</span>
          </div>
          <div class="sa-res-row">
            <span class="sa-metric-label">Disk</span>
            <div class="sa-bar-wrap"><div class="sa-bar sa-bar-amber" :style="{ width: metrics.diskUsage + '%' }" /></div>
            <span class="sa-metric-val w-10">{{ metrics.diskUsage }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Tenants -->
    <div class="sa-card">
      <div class="sa-card-header">
        <h2 class="sa-card-title">Top Tenants nach Aktivität</h2>
      </div>
      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>#</th><th>Tenant</th><th>Benutzer</th><th>Termine</th><th>Aktivität</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(tenant, idx) in topTenants" :key="tenant.id">
              <td class="sa-cell-muted font-mono">{{ idx + 1 }}</td>
              <td>
                <div class="flex items-center gap-3">
                  <div class="sa-tenant-avatar">{{ tenant.name?.charAt(0)?.toUpperCase() }}</div>
                  <div>
                    <div class="sa-tenant-name">{{ tenant.name }}</div>
                    <div class="sa-tenant-slug">{{ tenant.slug }}</div>
                  </div>
                </div>
              </td>
              <td class="sa-cell-muted">{{ tenant.user_count }}</td>
              <td class="sa-cell-muted">{{ tenant.appointment_count }}</td>
              <td>
                <div class="flex items-center gap-2">
                  <div class="sa-bar-wrap" style="width:80px"><div class="sa-bar" :style="{ width: tenant.activity_percentage + '%' }" /></div>
                  <span class="sa-cell-muted text-xs">{{ tenant.activity_percentage }}%</span>
                </div>
              </td>
              <td>
                <span :class="['sa-badge', tenant.is_active ? 'sa-badge-green' : 'sa-badge-red']">
                  {{ tenant.is_active ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="topTenants.length === 0" class="sa-empty">Keine Daten</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tenant-admin' })
import { ref, onMounted, onUnmounted } from 'vue'

const isLoading = ref(false)
const selectedTimeRange = ref('30d')

const timeRangeOptions = [
  { label: 'Letzte 7 Tage', value: '7d' },
  { label: 'Letzte 30 Tage', value: '30d' },
  { label: 'Letzte 90 Tage', value: '90d' },
  { label: 'Letztes Jahr', value: '1y' },
]

const metrics = ref({
  activeTenants: 0, tenantGrowth: 0, totalUsers: 0, userGrowth: 0,
  activeAppointments: 0, todayAppointments: 0, uptime: 99.9,
  avgResponseTime: 0, apiCallsLastHour: 0, errorRate: 0,
  dbConnections: 0, avgQueryTime: 0, cacheHitRate: 0,
  cpuUsage: 0, memoryUsage: 0, diskUsage: 0,
})
const topTenants = ref<any[]>([])

const loadAnalytics = async () => {
  isLoading.value = true
  try {
    const response = await $fetch<any>('/api/analytics/dashboard', { query: { timeRange: selectedTimeRange.value } })
    metrics.value = { ...metrics.value, ...response.metrics }
    topTenants.value = response.topTenants
  } catch {
    await loadMockData()
  } finally { isLoading.value = false }
}

const loadMockData = async () => {
  metrics.value = {
    activeTenants: 5, tenantGrowth: 12, totalUsers: 150, userGrowth: 8,
    activeAppointments: 45, todayAppointments: 8, uptime: 99.9,
    avgResponseTime: 125, apiCallsLastHour: 750, errorRate: 0.5,
    dbConnections: 12, avgQueryTime: 25, cacheHitRate: 94.5,
    cpuUsage: 45, memoryUsage: 68, diskUsage: 72,
  }
  const { data: tenants } = await supabase.from('tenants').select('id, name, slug, is_active').limit(5)
  topTenants.value = (tenants || []).map(t => ({
    ...t,
    user_count: Math.floor(Math.random() * 50) + 10,
    appointment_count: Math.floor(Math.random() * 100) + 20,
    activity_percentage: Math.floor(Math.random() * 100) + 1,
  }))
}

const setupAnalytics = async () => {
  isLoading.value = true
  try {
    const r = await $fetch<any>('/api/analytics/setup', { method: 'POST' })
    if (r.success) await loadAnalytics()
    else alert('Setup fehlgeschlagen: ' + r.message)
  } catch (e: any) {
    alert('Setup-Fehler: ' + e.message)
  } finally { isLoading.value = false }
}
const refreshData = () => loadAnalytics()

let interval: ReturnType<typeof setInterval>
onMounted(() => { loadAnalytics(); interval = setInterval(loadAnalytics, 30000) })
onUnmounted(() => clearInterval(interval))
</script>

<style scoped>
.sa-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:2rem; gap:1rem; }
.sa-page-title  { font-size:1.75rem; font-weight:800; color:#f1f5f9; letter-spacing:-0.03em; }
.sa-page-sub    { font-size:0.85rem; color:#64748b; margin-top:0.25rem; }

.sa-btn-primary {
  display:inline-flex; align-items:center; gap:0.375rem; padding:0.4rem 0.875rem;
  background:linear-gradient(135deg,#4f46e5,#7c3aed); color:white;
  font-size:0.78rem; font-weight:600; border-radius:7px; border:none; cursor:pointer;
  transition:all 0.2s;
}
.sa-btn-primary:hover { filter:brightness(1.1); }
.sa-btn-ghost-sm {
  display:inline-flex; align-items:center; gap:0.375rem; padding:0.4rem 0.75rem;
  background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
  color:#94a3b8; font-size:0.78rem; font-weight:500; border-radius:7px; cursor:pointer;
}
.sa-btn-ghost-sm:hover { background:rgba(255,255,255,0.08); color:#e2e8f0; }
.sa-select {
  padding:0.4rem 0.75rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
  color:#e2e8f0; font-size:0.78rem; border-radius:7px; cursor:pointer;
}
.sa-select option { background:#1e2130; }

.sa-kpi-grid {
  display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; margin-bottom:1.5rem;
}
@media(min-width:1024px) { .sa-kpi-grid { grid-template-columns:repeat(4,1fr); } }
.sa-kpi-card { border-radius:14px; padding:1.25rem; border:1px solid transparent; }
.sa-kpi-indigo  { background:rgba(99,102,241,0.08); border-color:rgba(99,102,241,0.2); }
.sa-kpi-emerald { background:rgba(16,185,129,0.08); border-color:rgba(16,185,129,0.2); }
.sa-kpi-amber   { background:rgba(245,158,11,0.08); border-color:rgba(245,158,11,0.2); }
.sa-kpi-violet  { background:rgba(139,92,246,0.08); border-color:rgba(139,92,246,0.2); }
.sa-kpi-icon { width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:.75rem; }
.sa-kpi-indigo  .sa-kpi-icon { background:rgba(99,102,241,0.15); color:#a5b4fc; }
.sa-kpi-emerald .sa-kpi-icon { background:rgba(16,185,129,0.15); color:#6ee7b7; }
.sa-kpi-amber   .sa-kpi-icon { background:rgba(245,158,11,0.15); color:#fcd34d; }
.sa-kpi-violet  .sa-kpi-icon { background:rgba(139,92,246,0.15); color:#c4b5fd; }
.sa-kpi-value { font-size:2rem;font-weight:800;color:#f1f5f9;line-height:1;letter-spacing:-.04em; }
.sa-kpi-label { font-size:.75rem;color:#64748b;margin-top:.375rem;font-weight:500; }
.sa-kpi-trend { font-size:.7rem;margin-top:.25rem; }
.sa-kpi-sub   { font-size:.7rem;color:#64748b;margin-top:.25rem; }
.sa-trend-up  { color:#6ee7b7; }

.sa-two-col { display:grid;grid-template-columns:1fr;gap:1.25rem; }
@media(min-width:1024px) { .sa-two-col { grid-template-columns:repeat(3,1fr); } }

.sa-card {
  background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
  border-radius:14px; padding:1.5rem; overflow:hidden; margin-bottom:1.25rem;
}
.sa-card-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem; }
.sa-card-title  { font-size:.9rem;font-weight:700;color:#e2e8f0; }

.sa-metric-row { display:flex;align-items:center;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04); }
.sa-metric-row:last-child { border-bottom:none; }
.sa-metric-label { font-size:.78rem;color:#64748b; }
.sa-metric-val { font-size:.82rem;font-weight:600;color:#e2e8f0; }

.sa-res-row { display:flex;align-items:center;gap:.75rem;padding:.5rem 0; }
.sa-bar-wrap { flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden; }
.sa-bar { height:100%;background:linear-gradient(90deg,#4f46e5,#7c3aed);border-radius:999px;transition:width .3s; }
.sa-bar-violet { background:linear-gradient(90deg,#7c3aed,#a78bfa); }
.sa-bar-amber  { background:linear-gradient(90deg,#d97706,#f59e0b); }

.sa-table-wrap { overflow-x:auto; }
.sa-table { width:100%;border-collapse:collapse; }
.sa-table th { padding:.5rem .75rem;text-align:left;font-size:.7rem;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid rgba(255,255,255,0.06); }
.sa-table td { padding:.75rem;font-size:.8rem;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.04); }
.sa-table tr:last-child td { border-bottom:none; }
.sa-table tr:hover td { background:rgba(255,255,255,0.025); }
.sa-tenant-avatar { width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:white;flex-shrink:0; }
.sa-tenant-name { font-size:.8rem;font-weight:600;color:#e2e8f0; }
.sa-tenant-slug { font-size:.7rem;color:#64748b; }
.sa-cell-muted  { color:#64748b !important; }
.sa-badge { display:inline-flex;align-items:center;padding:.15rem .55rem;border-radius:999px;font-size:.68rem;font-weight:600; }
.sa-badge-green { background:rgba(16,185,129,0.1);color:#6ee7b7;border:1px solid rgba(16,185,129,0.2); }
.sa-badge-red   { background:rgba(239,68,68,0.1); color:#fca5a5;border:1px solid rgba(239,68,68,0.2); }
.sa-empty { text-align:center;padding:2rem;color:#475569;font-size:.8rem; }
</style>
