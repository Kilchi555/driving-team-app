<template>
  <div>
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Manueller Sales-Sprint</h1>
        <p class="sa-page-sub">Die ersten qualifizierten Fahrschulen. Jeder Kontakt wird von Hand entschieden. Es wird nichts gesendet.</p>
      </div>
      <NuxtLink to="/tenant-admin/sales/follow-ups" class="sa-action-btn sa-action-primary">Follow-up heute</NuxtLink>
    </div>

    <section class="sa-card funnel">
      <p class="funnel-label">Pipeline · nur manuell gesetzte Status</p>
      <div class="funnel-row">
        <span>New {{ counts.profiles }}</span>
        <span>↓</span>
        <span>Contacted {{ counts.contacted }}</span>
        <span>↓</span>
        <span>Conversation {{ counts.conversations }}</span>
        <span>↓</span>
        <span>Demo {{ counts.demos }}</span>
        <span>↓</span>
        <span>Proposal {{ counts.proposals }}</span>
        <span>↓</span>
        <span>Won {{ counts.won }}</span>
      </div>
      <p class="funnel-side">Lost {{ counts.lost }} · Nurture bleibt ein eigener Status · Follow-ups heute {{ counts.followups_today }}</p>
      <p v-if="rates.conversation_to_demo != null" class="funnel-side">
        Aus den gesetzten Status: Gespräch → Demo {{ rates.conversation_to_demo }}% · Demo → Angebot {{ rates.demo_to_proposal ?? '—' }}% · Angebot → Gewonnen {{ rates.proposal_to_won ?? '—' }}%. Kein Branchenbenchmark.
      </p>
    </section>

    <div class="quick">
      <button v-for="item in quickFilters" :key="item.value" type="button" :class="['sa-tab', quick === item.value ? 'sa-tab-active' : '']" @click="toggleQuick(item.value)">
        {{ item.label }}
      </button>
    </div>

    <form class="sa-card filters" @submit.prevent="load">
      <label class="sa-check">
        <input v-model="sprint" type="checkbox" @change="load" />
        Initial Sales Sprint
      </label>
      <label class="sa-field">
        <span>Priority</span>
        <select v-model="priority" class="sa-input" @change="load">
          <option value="">Alle</option>
          <option>P1</option><option>P2</option><option>P3</option><option>P4</option>
        </select>
      </label>
      <label class="sa-field">
        <span>Engagement</span>
        <select v-model="engagement" class="sa-input" @change="load">
          <option value="">Alle</option>
          <option>HOT</option><option>WARM</option><option>COLD</option><option>UNKNOWN</option>
        </select>
      </label>
      <label class="sa-field">
        <span>Business evidence</span>
        <select v-model="evidence" class="sa-input" @change="load">
          <option value="">Alle</option>
          <option value="HIGH_EVIDENCE">Hoch</option>
          <option value="MEDIUM_EVIDENCE">Mittel</option>
          <option value="LOW_EVIDENCE">Niedrig</option>
          <option value="AMBIGUOUS">Unklar</option>
        </select>
      </label>
      <label class="sa-field">
        <span>Contactability</span>
        <select v-model="contactability" class="sa-input" @change="load">
          <option value="">Alle</option>
          <option value="REVIEW_REQUIRED">Review required</option>
          <option value="OPT_OUT">Opt-out</option>
          <option value="EXISTING_TENANT">Existing tenant</option>
          <option value="POSSIBLE_EXISTING_TENANT">Possible tenant</option>
        </select>
      </label>
      <label class="sa-field">
        <span>Sales status</span>
        <select v-model="salesStatus" class="sa-input" @change="load">
          <option value="">Alle</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>
      </label>
      <label class="sa-field">
        <span>Assigned to</span>
        <input v-model="assignedTo" class="sa-input" type="text" placeholder="User-ID" @change="load" />
      </label>
      <label class="sa-field">
        <span>Next follow-up</span>
        <select v-model="followUp" class="sa-input" @change="load">
          <option value="">Alle</option>
          <option value="due">Fällig / überfällig</option>
          <option value="upcoming">Später</option>
        </select>
      </label>
    </form>

    <p v-if="storeUnavailable" class="sa-error">Der Profilspeicher ist noch nicht migriert. Die Liste ist nur lesend. Kontakte können erst nach der Migration dokumentiert werden.</p>
    <p v-if="error" class="sa-error">{{ error }}</p>
    <p class="hint">{{ hint }}</p>

    <div class="sa-card">
      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Priority</th>
              <th>Name</th>
              <th>Person</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Website</th>
              <th>City</th>
              <th>Engagement</th>
              <th>Evidence</th>
              <th>Confidence</th>
              <th>Contactability</th>
              <th>Status</th>
              <th>Last contact</th>
              <th>Next follow-up</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in prospects" :key="row.prospect_id">
              <td>{{ row.priority || '—' }}</td>
              <td><NuxtLink :to="`/tenant-admin/sales/${row.prospect_id}`" class="sa-tenant-name">{{ row.name }}</NuxtLink></td>
              <td>{{ row.person || '—' }}</td>
              <td>{{ row.phone || '—' }}</td>
              <td>{{ row.email || '—' }}</td>
              <td class="sa-cell-muted">{{ row.website_host || '—' }}</td>
              <td>{{ row.city || '—' }}</td>
              <td><span :class="['sa-badge', badge(row.engagement_level)]">{{ row.engagement_level }}</span></td>
              <td>{{ evidenceLabel(row.business_potential) }}</td>
              <td>{{ row.size_evidence_confidence }}</td>
              <td><span :class="['sa-badge', contactBadge(row.contactability)]">{{ row.contactability_label }}</span></td>
              <td>{{ row.sales_status || 'Nicht erfasst' }}</td>
              <td>{{ formatWhen(row.last_contacted_at) }}</td>
              <td>{{ formatWhen(row.next_follow_up_at) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !prospects.length" class="sa-empty">Keine Prospects für diesen Filter.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tenant-admin', middleware: ['superadmin'] })
useHead({ title: 'Sales – Super Admin' })

const prospects = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const storeUnavailable = ref(false)
const hint = ref('')
const sprint = ref(true)
const priority = ref('')
const engagement = ref('')
const evidence = ref('')
const contactability = ref('')
const salesStatus = ref('')
const followUp = ref('')
const assignedTo = ref('')
const quick = ref('')
const counts = reactive({
  profiles: 0, contacted: 0, conversations: 0, demos: 0, proposals: 0, won: 0, lost: 0, followups_today: 0,
})
const rates = reactive<{ conversation_to_demo: number | null; demo_to_proposal: number | null; proposal_to_won: number | null }>({
  conversation_to_demo: null, demo_to_proposal: null, proposal_to_won: null,
})
const statuses = ['new', 'review_required', 'contact_1', 'contacted', 'conversation', 'demo_booked', 'demo_completed', 'proposal', 'won', 'lost', 'nurture', 'do_not_contact', 'excluded_existing_tenant']
const quickFilters = [
  { label: 'HOT', value: 'HOT' },
  { label: 'P1', value: 'P1' },
  { label: 'Needs follow-up', value: 'follow_up' },
  { label: 'Demo booked', value: 'demo' },
  { label: 'Proposal', value: 'proposal' },
  { label: 'Nurture', value: 'nurture' },
]

const authHeaders = async () => {
  const sb = getSupabase()
  const { data: { session } } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

const formatWhen = (iso?: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })
}
const badge = (level: string) => ({ HOT: 'sa-badge-amber', WARM: 'sa-badge-blue', COLD: 'sa-badge-neutral', UNKNOWN: 'sa-badge-neutral' }[level] || 'sa-badge-neutral')
const contactBadge = (value: string) => value === 'REVIEW_REQUIRED' ? 'sa-badge-amber' : 'sa-badge-red'
const evidenceLabel = (value: string) => ({ HIGH_EVIDENCE: 'Hoch', MEDIUM_EVIDENCE: 'Mittel', LOW_EVIDENCE: 'Niedrig', AMBIGUOUS: 'Unklar' }[value] || value)

const toggleQuick = (value: string) => {
  quick.value = quick.value === value ? '' : value
  load()
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const headers = await authHeaders()
    const [list, dashboard] = await Promise.all([
      $fetch<any>('/api/tenant-admin/sales', {
        headers,
        query: {
          sprint: sprint.value ? '1' : '0',
          priority: priority.value,
          engagement: engagement.value,
          evidence: evidence.value,
          contactability: contactability.value,
          sales_status: salesStatus.value,
          follow_up: followUp.value,
          assigned_to: assignedTo.value,
          quick: quick.value,
        },
      }),
      $fetch<any>('/api/tenant-admin/sales/dashboard', { headers }),
    ])
    prospects.value = list.prospects || []
    storeUnavailable.value = list.profile_store === 'unavailable'
    hint.value = sprint.value
      ? `Initial Sales Sprint: ${list.shown} von ${list.sprint_total} P1/P2, sortiert nach Priorität, Engagement und Evidenz.`
      : `${list.shown} Zeilen. Profile werden nicht automatisch angelegt.`
    Object.assign(counts, dashboard.counts || {})
    Object.assign(rates, dashboard.rates || {})
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Liste konnte nicht geladen werden'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.sa-page-header { margin-bottom: 1.5rem; display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; }
.sa-page-title { font-size:1.375rem; font-weight:800; color:#f1f5f9; }
.sa-page-sub { font-size:0.8rem; color:#64748b; margin-top:0.25rem; max-width:42rem; }
.sa-card { background:#1a1d2e; border:1px solid rgba(255,255,255,0.06); border-radius:14px; overflow:hidden; }
.funnel, .filters { padding:1rem 1.25rem; margin-bottom:1rem; }
.funnel-label, .funnel-side, .hint { color:#64748b; font-size:0.75rem; margin:0.35rem 0 0; }
.funnel-row { display:flex; flex-wrap:wrap; gap:0.5rem 0.75rem; color:#e2e8f0; font-weight:700; margin-top:0.35rem; }
.quick { display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem; }
.filters { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:0.75rem; }
.sa-field { display:flex; flex-direction:column; gap:0.35rem; font-size:0.72rem; font-weight:700; color:#64748b; text-transform:uppercase; }
.sa-input { width:100%; padding:0.55rem 0.75rem; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#121526; color:#e2e8f0; font-size:0.85rem; }
.sa-check { display:flex; align-items:center; gap:0.5rem; color:#cbd5e1; font-size:0.8rem; font-weight:600; }
.sa-tab { padding:0.375rem 0.875rem; border-radius:8px; font-size:0.8rem; font-weight:600; color:#94a3b8; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); cursor:pointer; }
.sa-tab-active { color:#a5b4fc; background:rgba(99,102,241,0.15); border-color:rgba(99,102,241,0.3); }
.sa-table-wrap { overflow-x:auto; }
.sa-table { width:100%; border-collapse:collapse; font-size:0.78rem; }
.sa-table th { padding:0.75rem 0.7rem; text-align:left; font-size:0.68rem; font-weight:700; color:#475569; text-transform:uppercase; }
.sa-table td { padding:0.75rem 0.7rem; color:#cbd5e1; vertical-align:top; }
.sa-table tbody tr { border-top:1px solid rgba(255,255,255,0.04); }
.sa-cell-muted { color:#64748b !important; }
.sa-tenant-name { font-weight:600; color:#e2e8f0; text-decoration:none; }
.sa-badge { display:inline-flex; padding:0.2rem 0.55rem; border-radius:999px; font-size:0.68rem; font-weight:700; }
.sa-badge-amber { background:rgba(245,158,11,0.12); color:#fbbf24; }
.sa-badge-blue { background:rgba(99,102,241,0.12); color:#a5b4fc; }
.sa-badge-red { background:rgba(239,68,68,0.1); color:#f87171; }
.sa-badge-neutral { background:rgba(100,116,139,0.15); color:#94a3b8; }
.sa-action-btn { padding:0.45rem 0.8rem; border-radius:8px; font-size:0.78rem; font-weight:700; text-decoration:none; }
.sa-action-primary { background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.25); color:#a5b4fc; }
.sa-empty { padding:3rem 1.5rem; text-align:center; color:#475569; }
.sa-error { color:#f87171; font-size:0.8rem; margin:0 0 0.75rem; }
@media (max-width: 900px) { .filters { grid-template-columns:1fr; } }
</style>
