<template>
  <div>
    <!-- Page header -->
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Control Center</h1>
        <p class="sa-page-sub">Simy Platform – alle Tenants auf einen Blick</p>
      </div>
      <NuxtLink to="/tenant-admin/tenants" class="sa-btn-primary">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Neuer Tenant
      </NuxtLink>
    </div>

    <!-- KPI Row -->
    <div class="sa-kpi-grid">
      <div class="sa-kpi-card sa-kpi-indigo">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div class="sa-kpi-value">{{ stats.totalTenants }}</div>
        <div class="sa-kpi-label">Gesamt Tenants</div>
      </div>

      <div class="sa-kpi-card sa-kpi-emerald">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="sa-kpi-value">{{ stats.activeTenants }}</div>
        <div class="sa-kpi-label">Aktive Tenants</div>
      </div>

      <div class="sa-kpi-card sa-kpi-amber">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="sa-kpi-value">{{ stats.trialTenants }}</div>
        <div class="sa-kpi-label">Trial Tenants</div>
      </div>

      <div class="sa-kpi-card sa-kpi-violet">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div class="sa-kpi-value">{{ stats.totalUsers }}</div>
        <div class="sa-kpi-label">Gesamt Benutzer</div>
      </div>

      <div class="sa-kpi-card sa-kpi-rose">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div class="sa-kpi-value">{{ stats.blockedIPs }}</div>
        <div class="sa-kpi-label">Geblockte IPs</div>
      </div>
    </div>

    <!-- Two column layout -->
    <div class="sa-two-col">
      <!-- Recent Tenants -->
      <div class="sa-card" style="grid-column: span 2">
        <div class="sa-card-header">
          <h2 class="sa-card-title">Neueste Tenants</h2>
          <NuxtLink to="/tenant-admin/tenants" class="sa-link-sm">Alle anzeigen →</NuxtLink>
        </div>
        <div class="sa-table-wrap">
          <table class="sa-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Wallee</th>
                <th>Erstellt</th>
                <th class="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tenant in recentTenants" :key="tenant.id">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="sa-tenant-avatar">{{ getInitials(tenant.name) }}</div>
                    <div>
                      <div class="sa-tenant-name">{{ tenant.name }}</div>
                      <div class="sa-tenant-slug">{{ tenant.slug }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span :class="['sa-badge', tenant.is_active ? 'sa-badge-green' : 'sa-badge-red']">
                    {{ tenant.is_active ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                  <span v-if="tenant.is_trial" class="sa-badge sa-badge-amber ml-1">Trial</span>
                </td>
                <td class="sa-cell-muted">{{ tenant.subscription_plan || '—' }}</td>
                <td>
                  <span :class="['sa-badge',
                    tenant.wallee_onboarding_status === 'active' ? 'sa-badge-green' :
                    tenant.wallee_onboarding_status === 'pending' ? 'sa-badge-amber' : 'sa-badge-neutral']">
                    {{ tenant.wallee_onboarding_status === 'active' ? 'Aktiv' :
                       tenant.wallee_onboarding_status === 'pending' ? 'Ausstehend' : '—' }}
                  </span>
                </td>
                <td class="sa-cell-muted">{{ formatDate(tenant.created_at) }}</td>
                <td class="text-right">
                  <NuxtLink :to="`/tenant-admin/tenants`" class="sa-action-link">Details →</NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="recentTenants.length === 0" class="sa-empty">
            <svg class="w-10 h-10 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
            </svg>
            Noch keine Tenants
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="sa-card">
        <div class="sa-card-header">
          <h2 class="sa-card-title">Schnellaktionen</h2>
        </div>
        <div class="sa-quick-grid">
          <NuxtLink v-for="action in quickActions" :key="action.to" :to="action.to" class="sa-quick-item">
            <div :class="['sa-quick-icon', action.color]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="action.icon" />
              </svg>
            </div>
            <span class="sa-quick-label">{{ action.label }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Recent Security Events -->
      <div class="sa-card">
        <div class="sa-card-header">
          <h2 class="sa-card-title">Sicherheitsereignisse</h2>
          <NuxtLink to="/tenant-admin/security" class="sa-link-sm">Alle →</NuxtLink>
        </div>
        <div class="space-y-2">
          <div v-if="recentActivities.length === 0" class="sa-empty-sm">Keine Ereignisse</div>
          <div v-for="act in recentActivities" :key="act.id" class="sa-event-item">
            <div class="sa-event-dot" />
            <div class="flex-1 min-w-0">
              <p class="sa-event-desc">{{ act.description }}</p>
              <p class="sa-event-time">{{ formatTimeAgo(act.created_at) }}</p>
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
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

const supabase = getSupabase()

const stats = ref({ totalTenants: 0, activeTenants: 0, trialTenants: 0, totalUsers: 0, blockedIPs: 0 })
const recentTenants = ref<any[]>([])
const recentActivities = ref<any[]>([])

const quickActions = [
  { to: '/tenant-admin/tenants', label: 'Alle Tenants', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'bg-indigo-500/10 text-indigo-400' },
  { to: '/tenant-admin/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'bg-emerald-500/10 text-emerald-400' },
  { to: '/tenant-admin/security', label: 'Security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'bg-rose-500/10 text-rose-400' },
  { to: '/tenant-admin/errors', label: 'Errors', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'bg-amber-500/10 text-amber-400' },
  { to: '/tenant-admin/business-types', label: 'Business Types', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', color: 'bg-violet-500/10 text-violet-400' },
  { to: '/tenant-register', label: 'Tenant anlegen', icon: 'M12 4v16m8-8H4', color: 'bg-sky-500/10 text-sky-400' },
]

const loadStats = async () => {
  try {
    const [{ data: tenants }, { data: users }, { data: blocked }] = await Promise.all([
      supabase.from('tenants').select('id, is_active, is_trial'),
      supabase.from('users').select('id'),
      supabase.from('rate_limit_logs').select('id').eq('status', 'blocked'),
    ])
    stats.value = {
      totalTenants: tenants?.length ?? 0,
      activeTenants: tenants?.filter(t => t.is_active).length ?? 0,
      trialTenants: tenants?.filter(t => t.is_trial).length ?? 0,
      totalUsers: users?.length ?? 0,
      blockedIPs: blocked?.length ?? 0,
    }
  } catch (e) { logger.warn('Stats load error', e) }
}

const loadRecentTenants = async () => {
  const { data } = await supabase.from('tenants').select('*').order('created_at', { ascending: false }).limit(8)
  recentTenants.value = data ?? []
}

const loadRecentActivities = async () => {
  const { data } = await supabase
    .from('rate_limit_logs').select('*').eq('status', 'blocked')
    .order('created_at', { ascending: false }).limit(8)
  recentActivities.value = (data ?? []).map(l => ({
    id: l.id,
    description: `Blockiert: ${l.ip_address}${l.email ? ` (${l.email})` : ''}`,
    created_at: l.created_at,
  }))
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('de-CH')
const formatTimeAgo = (d: string) => {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (diff < 60) return `vor ${diff} Min`
  if (diff < 1440) return `vor ${Math.floor(diff / 60)} Std`
  return `vor ${Math.floor(diff / 1440)} Tagen`
}

onMounted(() => { loadStats(); loadRecentTenants(); loadRecentActivities() })
</script>

<style scoped>
/* ── Page header ── */
.sa-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
}
.sa-page-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: -0.03em;
}
.sa-page-sub {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.25rem;
}
.sa-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.3);
  transition: all 0.2s;
  white-space: nowrap;
}
.sa-btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }

/* ── KPI Grid ── */
.sa-kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}
@media (min-width: 640px) { .sa-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1024px) { .sa-kpi-grid { grid-template-columns: repeat(5, 1fr); } }

.sa-kpi-card {
  border-radius: 14px;
  padding: 1.25rem;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
}
.sa-kpi-indigo  { background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.2); }
.sa-kpi-emerald { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.2); }
.sa-kpi-amber   { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.2); }
.sa-kpi-violet  { background: rgba(139, 92, 246, 0.08); border-color: rgba(139, 92, 246, 0.2); }
.sa-kpi-rose    { background: rgba(244, 63, 94, 0.08);  border-color: rgba(244, 63, 94, 0.2);  }

.sa-kpi-icon {
  width: 36px; height: 36px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 0.75rem;
}
.sa-kpi-indigo  .sa-kpi-icon { background: rgba(99,102,241,0.15); color: #a5b4fc; }
.sa-kpi-emerald .sa-kpi-icon { background: rgba(16,185,129,0.15); color: #6ee7b7; }
.sa-kpi-amber   .sa-kpi-icon { background: rgba(245,158,11,0.15);  color: #fcd34d; }
.sa-kpi-violet  .sa-kpi-icon { background: rgba(139,92,246,0.15);  color: #c4b5fd; }
.sa-kpi-rose    .sa-kpi-icon { background: rgba(244,63,94,0.15);   color: #fda4af; }

.sa-kpi-value {
  font-size: 2rem;
  font-weight: 800;
  color: #f1f5f9;
  line-height: 1;
  letter-spacing: -0.04em;
}
.sa-kpi-label {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.375rem;
  font-weight: 500;
}

/* ── Two-col layout ── */
.sa-two-col {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}
@media (min-width: 1024px) {
  .sa-two-col { grid-template-columns: 1fr 1fr; }
}

/* ── Cards ── */
.sa-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 1.5rem;
  overflow: hidden;
}
.sa-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}
.sa-card-title { font-size: 0.9rem; font-weight: 700; color: #e2e8f0; }
.sa-link-sm { font-size: 0.75rem; color: #6366f1; text-decoration: none; }
.sa-link-sm:hover { color: #a5b4fc; }

/* ── Table ── */
.sa-table-wrap { overflow-x: auto; }
.sa-table { width: 100%; border-collapse: collapse; }
.sa-table th {
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sa-table td {
  padding: 0.75rem;
  font-size: 0.8rem;
  color: #cbd5e1;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.sa-table tr:last-child td { border-bottom: none; }
.sa-table tr:hover td { background: rgba(255,255,255,0.025); }

.sa-tenant-avatar {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.7rem; font-weight: 700; color: white;
  flex-shrink: 0;
}
.sa-tenant-name { font-size: 0.8rem; font-weight: 600; color: #e2e8f0; }
.sa-tenant-slug { font-size: 0.7rem; color: #64748b; }
.sa-cell-muted { color: #64748b !important; }

/* Badges */
.sa-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
}
.sa-badge-green  { background: rgba(16,185,129,0.1);  color: #6ee7b7; border: 1px solid rgba(16,185,129,0.2); }
.sa-badge-red    { background: rgba(239,68,68,0.1);   color: #fca5a5; border: 1px solid rgba(239,68,68,0.2); }
.sa-badge-amber  { background: rgba(245,158,11,0.1);  color: #fcd34d; border: 1px solid rgba(245,158,11,0.2); }
.sa-badge-neutral{ background: rgba(100,116,139,0.1); color: #94a3b8; border: 1px solid rgba(100,116,139,0.2); }

.sa-action-link { font-size: 0.75rem; color: #6366f1; text-decoration: none; }
.sa-action-link:hover { color: #a5b4fc; }

/* Quick actions */
.sa-quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.sa-quick-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  text-decoration: none;
  transition: all 0.15s;
}
.sa-quick-item:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(99,102,241,0.25);
  transform: translateY(-1px);
}
.sa-quick-icon {
  width: 30px; height: 30px;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sa-quick-label { font-size: 0.75rem; font-weight: 500; color: #94a3b8; }
.sa-quick-item:hover .sa-quick-label { color: #e2e8f0; }

/* Event feed */
.sa-event-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.sa-event-item:last-child { border-bottom: none; }
.sa-event-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #f87171;
  flex-shrink: 0;
  margin-top: 5px;
}
.sa-event-desc { font-size: 0.78rem; color: #94a3b8; }
.sa-event-time { font-size: 0.68rem; color: #475569; margin-top: 1px; }
.sa-empty { text-align: center; padding: 3rem 1rem; color: #475569; font-size: 0.8rem; }
.sa-empty-sm { text-align: center; padding: 1.5rem; color: #475569; font-size: 0.78rem; }
</style>
