<template>
  <div>
    <!-- Header -->
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Websites</h1>
        <p class="sa-page-sub">{{ websiteTenants.length }} Kunden mit Website</p>
      </div>
      <NuxtLink to="/tenant-register?mode=website" class="sa-btn-primary" target="_blank">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Neuer Website-Kunde
      </NuxtLink>
    </div>

    <!-- Status Filter Tabs -->
    <div class="flex gap-2 mb-6 flex-wrap">
      <button v-for="tab in statusTabs" :key="tab.value"
        @click="activeTab = tab.value"
        :class="['sa-tab', activeTab === tab.value ? 'sa-tab-active' : '']">
        {{ tab.label }}
        <span class="sa-tab-count">{{ countByStatus(tab.value) }}</span>
      </button>
    </div>

    <!-- Table -->
    <div class="sa-card">
      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Kunde</th>
              <th>Website Status</th>
              <th>Domain</th>
              <th>Erstellt</th>
              <th>Freigegeben</th>
              <th class="text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in filteredTenants" :key="t.id">
              <td>
                <div class="flex items-center gap-3">
                  <div class="sa-tenant-avatar">{{ getInitials(t.name) }}</div>
                  <div>
                    <div class="sa-tenant-name">{{ t.name }}</div>
                    <div class="sa-tenant-slug">{{ t.slug }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span :class="['sa-badge', statusBadgeClass(t.website_status)]">
                  {{ statusLabel(t.website_status) }}
                </span>
              </td>
              <td class="sa-cell-muted">
                <a v-if="t.website_domain" :href="`https://${t.website_domain}`" target="_blank"
                  class="sa-link-sm">{{ t.website_domain }}</a>
                <span v-else>—</span>
              </td>
              <td class="sa-cell-muted">{{ formatDate(t.created_at) }}</td>
              <td class="sa-cell-muted">
                <span v-if="t.website_approved_at">{{ formatDate(t.website_approved_at) }}</span>
                <span v-else>—</span>
              </td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <NuxtLink :to="`/tenant-admin/websites/${t.id}`" class="sa-action-btn sa-action-primary">
                    {{ t.website_status === 'pending_review' ? '🔍 Prüfen' : '✏️ Bearbeiten' }}
                  </NuxtLink>
                  <a :href="`/website-preview/${t.slug}`" target="_blank" class="sa-action-btn">
                    👁 Vorschau
                  </a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredTenants.length === 0" class="sa-empty">
          <p class="text-3xl mb-3">🌐</p>
          <p class="font-600 text-slate-400">Keine Einträge in diesem Status</p>
          <p class="text-sm text-slate-500 mt-1">
            Neuer Kunde über "Neuer Website-Kunde" anlegen.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'tenant-admin', middleware: ['super-admin'] })
useHead({ title: 'Websites – Simy Super Admin' })

const supabase = getSupabase()

const allTenants = ref<any[]>([])
const activeTab = ref('all')

const statusTabs = [
  { label: 'Alle', value: 'all' },
  { label: 'Ausstehend', value: 'pending_review' },
  { label: 'Freigegeben', value: 'approved' },
  { label: 'Live', value: 'live' },
  { label: 'Deaktiviert', value: 'disabled' },
]

const websiteTenants = computed(() =>
  allTenants.value.filter(t => t.website_status && t.website_status !== 'none')
)

const filteredTenants = computed(() => {
  if (activeTab.value === 'all') return websiteTenants.value
  return websiteTenants.value.filter(t => t.website_status === activeTab.value)
})

const countByStatus = (status: string) => {
  if (status === 'all') return websiteTenants.value.length
  return allTenants.value.filter(t => t.website_status === status).length
}

onMounted(async () => {
  const { data } = await supabase
    .from('tenants')
    .select('id, name, slug, created_at, website_status, website_domain, website_approved_at, website_notes')
    .not('website_status', 'eq', 'none')
    .order('created_at', { ascending: false })
  allTenants.value = data || []
})

const statusLabel = (s: string) => ({
  none: '—', pending_review: 'Wartet auf Prüfung', approved: 'Freigegeben',
  live: 'Live', disabled: 'Deaktiviert',
}[s] || s)

const statusBadgeClass = (s: string) => ({
  pending_review: 'sa-badge-amber',
  approved: 'sa-badge-blue',
  live: 'sa-badge-green',
  disabled: 'sa-badge-red',
  none: 'sa-badge-neutral',
}[s] || 'sa-badge-neutral')

const getInitials = (name: string) =>
  name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?'

const formatDate = (iso: string) => iso
  ? new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—'
</script>

<style scoped>
.sa-page-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; }
.sa-page-title { font-size:1.375rem; font-weight:800; color:#f1f5f9; }
.sa-page-sub { font-size:0.8rem; color:#64748b; margin-top:0.125rem; }

.sa-tab {
  display:flex; align-items:center; gap:0.5rem;
  padding:0.375rem 0.875rem; border-radius:8px;
  font-size:0.8rem; font-weight:600; color:#94a3b8;
  background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06);
  cursor:pointer; transition:all 0.15s;
}
.sa-tab:hover { color:#e2e8f0; background:rgba(255,255,255,0.08); }
.sa-tab-active { color:#a5b4fc !important; background:rgba(99,102,241,0.15) !important; border-color:rgba(99,102,241,0.3) !important; }
.sa-tab-count { background:rgba(255,255,255,0.08); padding:0.1rem 0.4rem; border-radius:999px; font-size:0.7rem; }

.sa-card { background:#1a1d2e; border:1px solid rgba(255,255,255,0.06); border-radius:14px; overflow:hidden; }
.sa-table-wrap { overflow-x:auto; }
.sa-table { width:100%; border-collapse:collapse; font-size:0.82rem; }
.sa-table thead tr { border-bottom:1px solid rgba(255,255,255,0.06); }
.sa-table th { padding:0.75rem 1rem; text-align:left; font-size:0.7rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.06em; }
.sa-table tbody tr { border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.15s; }
.sa-table tbody tr:last-child { border-bottom:none; }
.sa-table tbody tr:hover { background:rgba(255,255,255,0.03); }
.sa-table td { padding:0.875rem 1rem; vertical-align:middle; color:#cbd5e1; }
.sa-cell-muted { color:#64748b !important; }

.sa-tenant-avatar { width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg,#4f46e5,#7c3aed); display:flex; align-items:center; justify-content:center; font-size:0.65rem; font-weight:700; color:white; flex-shrink:0; }
.sa-tenant-name { font-weight:600; color:#e2e8f0; font-size:0.85rem; }
.sa-tenant-slug { font-size:0.72rem; color:#475569; margin-top:0.1rem; }

.sa-badge { display:inline-flex; align-items:center; padding:0.2rem 0.6rem; border-radius:999px; font-size:0.7rem; font-weight:700; }
.sa-badge-green { background:rgba(16,185,129,0.12); color:#34d399; }
.sa-badge-amber { background:rgba(245,158,11,0.12); color:#fbbf24; }
.sa-badge-red { background:rgba(239,68,68,0.1); color:#f87171; }
.sa-badge-blue { background:rgba(99,102,241,0.12); color:#a5b4fc; }
.sa-badge-neutral { background:rgba(100,116,139,0.15); color:#64748b; }

.sa-action-btn { padding:0.3rem 0.75rem; border-radius:6px; font-size:0.75rem; font-weight:600; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:#94a3b8; cursor:pointer; transition:all 0.15s; text-decoration:none; white-space:nowrap; }
.sa-action-btn:hover { background:rgba(255,255,255,0.1); color:#e2e8f0; }
.sa-action-primary { background:rgba(99,102,241,0.15) !important; border-color:rgba(99,102,241,0.25) !important; color:#a5b4fc !important; }
.sa-action-primary:hover { background:rgba(99,102,241,0.25) !important; }

.sa-btn-primary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:linear-gradient(135deg,#4f46e5,#7c3aed); border:none; border-radius:8px; font-size:0.82rem; font-weight:700; color:white; cursor:pointer; transition:opacity 0.15s; text-decoration:none; }
.sa-btn-primary:hover { opacity:0.9; }

.sa-link-sm { font-size:0.75rem; color:#818cf8; text-decoration:none; }
.sa-link-sm:hover { text-decoration:underline; }

.sa-empty { padding:4rem 2rem; text-align:center; color:#475569; }
</style>
