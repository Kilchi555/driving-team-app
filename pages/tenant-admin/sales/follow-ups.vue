<template>
  <div>
    <NuxtLink to="/tenant-admin/sales" class="sa-back">← Sales-Liste</NuxtLink>
    <h1 class="sa-page-title">FOLLOW-UP TODAY</h1>
    <p class="meta">Fällig und überfällig zuerst, danach kommende Termine. Es wird nichts automatisch nachgefasst.</p>
    <p v-if="storeUnavailable" class="sa-error">Der Profilspeicher ist noch nicht migriert. Follow-ups erscheinen erst nach der Migration.</p>
    <p v-if="error" class="sa-error">{{ error }}</p>
    <div class="sa-card">
      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Wann</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Last contact</th>
              <th>Last result</th>
              <th>Next action</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.prospect_id">
              <td>{{ row.bucket }} · {{ formatWhen(row.next_follow_up_at) }}</td>
              <td><NuxtLink :to="`/tenant-admin/sales/${row.prospect_id}`">{{ row.name }}</NuxtLink></td>
              <td>{{ row.phone || '—' }}</td>
              <td>{{ formatWhen(row.last_contacted_at) }}</td>
              <td>{{ row.last_result || '—' }}</td>
              <td>{{ row.next_action || '—' }}</td>
              <td>{{ row.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !rows.length" class="sa-empty">Keine Follow-ups.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tenant-admin', middleware: ['superadmin'] })
useHead({ title: 'Follow-up – Sales' })

const rows = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const storeUnavailable = ref(false)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const sb = getSupabase()
    const { data: { session } } = await sb.auth.getSession()
    const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
    const data = await $fetch<any>('/api/tenant-admin/sales/follow-ups', { headers })
    rows.value = data.follow_ups || []
    storeUnavailable.value = data.profile_store === 'unavailable'
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Follow-ups konnten nicht geladen werden'
  } finally {
    loading.value = false
  }
}
const formatWhen = (iso?: string | null) => iso ? new Date(iso).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' }) : '—'
onMounted(load)
</script>

<style scoped>
.sa-back { color:#818cf8; text-decoration:none; font-size:0.75rem; }
.sa-page-title { font-size:1.375rem; font-weight:800; color:#f1f5f9; }
.meta { color:#64748b; font-size:0.8rem; }
.sa-error { color:#f87171; }
.sa-card { background:#1a1d2e; border:1px solid rgba(255,255,255,0.06); border-radius:14px; }
.sa-table-wrap { overflow-x:auto; }
.sa-table { width:100%; border-collapse:collapse; font-size:0.82rem; }
.sa-table th, .sa-table td { padding:0.75rem 1rem; text-align:left; color:#cbd5e1; }
.sa-table th { font-size:0.68rem; text-transform:uppercase; color:#475569; }
.sa-table tbody tr { border-top:1px solid rgba(255,255,255,0.04); }
.sa-table a { color:#e2e8f0; font-weight:600; text-decoration:none; }
.sa-empty { padding:2rem; text-align:center; color:#475569; }
</style>
