<template>
  <div>
    <div class="sa-page-header">
      <div>
        <NuxtLink to="/tenant-admin/websites" class="sa-back">← Websites</NuxtLink>
        <h1 class="sa-page-title">Website-Prospects</h1>
        <p class="sa-page-sub">URL einfügen → Analyse, Umsatzrange, Vorschau-Seite und Mail-Draft. Versand erst nach deinem Review.</p>
      </div>
    </div>

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
                  {{ p.city || '—' }} · {{ p.hostname || p.existing_url || 'ohne URL' }}
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

const statusTabs = [
  { label: 'Alle', value: 'all' },
  { label: 'Review', value: 'review' },
  { label: 'Analysiert', value: 'scored' },
  { label: 'Freigegeben', value: 'approved' },
  { label: 'Übersprungen', value: 'skipped' },
]

const canSubmit = computed(() => !!form.url.trim() || !!form.name.trim())
const filtered = computed(() => {
  if (activeTab.value === 'all') return prospects.value
  return prospects.value.filter((p) => p.status === activeTab.value)
})

const authHeaders = async () => {
  const sb = getSupabase()
  const { data: { session } } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
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
    review: 'Review',
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

onMounted(load)
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
@media (max-width: 720px) {
  .sa-form-grid { grid-template-columns:1fr; }
  .sa-span-2 { grid-column:span 1; }
}
</style>
