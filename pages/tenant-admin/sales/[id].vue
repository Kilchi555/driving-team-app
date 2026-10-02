<template>
  <div v-if="loadState === 'loading'" class="sa-card block">
    <p class="meta">Sales-Daten werden geladen…</p>
  </div>
  <div v-else-if="loadState !== 'ready'" class="sa-card block">
    <NuxtLink to="/tenant-admin/sales" class="sa-back">← Sales-Liste</NuxtLink>
    <h1 class="sa-page-title">{{ loadTitle }}</h1>
    <p class="sa-error">{{ loadError }}</p>
  </div>
  <div v-else-if="prospect">
    <NuxtLink to="/tenant-admin/sales" class="sa-back">← Sales-Liste</NuxtLink>
    <header class="sa-page-header">
      <h1 class="sa-page-title">{{ prospect.name }}</h1>
      <p class="person">{{ prospect.person || 'Keine belastbare Person' }}</p>
      <div class="chips">
        <span class="sa-badge sa-badge-blue">{{ prospect.priority || 'Keine Priorität' }}</span>
        <span :class="['sa-badge', prospect.engagement_level === 'HOT' ? 'sa-badge-amber' : 'sa-badge-neutral']">{{ prospect.engagement_level }}</span>
        <span class="sa-badge sa-badge-neutral">{{ evidenceLabel(prospect.business_potential) }}</span>
      </div>
      <p :class="['contactability', prospect.contactability === 'REVIEW_REQUIRED' ? 'warn' : 'stop']">
        Contactability: {{ prospect.contactability_label }}
      </p>
      <p class="meta">Consent-Status aus den vorhandenen Daten: {{ prospect.consent_status }}. Das ist keine Freigabe zum Schreiben.</p>
    </header>

    <section class="sa-card block">
      <h2>Contact</h2>
      <dl>
        <div><dt>Phone</dt><dd><a v-if="prospect.phone" :href="`tel:${prospect.phone}`">{{ prospect.phone }}</a><template v-else>—</template></dd></div>
        <div><dt>Email</dt><dd>{{ prospect.email || '—' }}</dd></div>
        <div><dt>Website</dt><dd>{{ prospect.website || prospect.website_host || '—' }}</dd></div>
        <div><dt>Location</dt><dd>{{ [prospect.address, prospect.postal_code, prospect.city].filter(Boolean).join(', ') || '—' }}</dd></div>
      </dl>
    </section>

    <section class="sa-card block">
      <h2>Why this lead</h2>
      <ul>
        <li v-for="line in prospect.why" :key="line">{{ line }}</li>
      </ul>
      <p class="meta">Signaturen: {{ prospect.strong_people }}. Das ist keine Mitarbeiterzahl.</p>
    </section>

    <section class="sa-card block">
      <h2>HISTORICAL OUTREACH</h2>
      <p class="meta">August-Kampagne. Das ist keine aktuelle Sales-Aktivität.</p>
      <ul>
        <li v-for="mail in [1, 2, 3, 4]" :key="mail">
          Mail {{ mail }}: {{ flag(prospect.august.mails[mail]) }}
        </li>
        <li>SMS: {{ prospect.august.sms_note ? 'Notiz vorhanden, kein Ergebnis gespeichert' : 'keine SMS-Notiz' }}</li>
      </ul>
    </section>

    <section class="sa-card block">
      <h2>Gespräch</h2>
      <p v-if="!prospect.eligible" class="stop">Für diesen Datensatz wird kein Kontaktformular angeboten.</p>
      <form v-else @submit.prevent="saveContact">
        <p class="meta">Speichern dokumentiert nur, was du bereits getan hast. Es wird keine E-Mail, SMS oder WhatsApp gesendet.</p>
        <div class="grid">
          <label class="sa-field"><span>Channel</span>
            <select v-model="form.channel" class="sa-input" required>
              <option value="phone">phone</option>
              <option value="email">email</option>
              <option value="sms">sms</option>
              <option value="whatsapp">whatsapp</option>
              <option value="other">other</option>
            </select>
          </label>
          <label class="sa-field"><span>Result</span>
            <select v-model="form.result" class="sa-input" required>
              <option value="no_answer">no_answer</option>
              <option value="callback_requested">callback_requested</option>
              <option value="conversation">conversation</option>
              <option value="interested">interested</option>
              <option value="not_interested">not_interested</option>
              <option value="wrong_contact">wrong_contact</option>
              <option value="existing_customer">existing_customer</option>
              <option value="do_not_contact">do_not_contact</option>
              <option value="demo_requested">demo_requested</option>
              <option value="demo_booked">demo_booked</option>
            </select>
          </label>
          <label class="sa-field"><span>Sales status</span>
            <select v-model="form.sales_status" class="sa-input">
              <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
            </select>
          </label>
          <label class="sa-field"><span>Next action</span>
            <select v-model="form.next_action" class="sa-input">
              <option value="call">call</option>
              <option value="email">email</option>
              <option value="demo">demo</option>
              <option value="proposal">proposal</option>
              <option value="nurture">nurture</option>
              <option value="none">none</option>
            </select>
          </label>
          <label class="sa-field"><span>Next follow-up</span>
            <input v-model="form.next_follow_up_at" type="date" class="sa-input" />
          </label>
        </div>
        <label class="sa-field"><span>Notes</span><textarea v-model="form.notes" class="sa-input" rows="3" /></label>
        <h3>Conversation intelligence</h3>
        <label class="sa-field"><span>current_software</span><input v-model="form.current_software" class="sa-input" type="text" /></label>
        <label class="sa-field"><span>pain_points</span><textarea v-model="form.pain_points" class="sa-input" rows="2" placeholder="Terminplanung, Schülerverwaltung, Fakturierung, Fahrlehrerplanung, SMS, Administration, Website, Online-Buchung, Reporting" /></label>
        <label class="sa-field"><span>interested_features</span><textarea v-model="form.interested_features" class="sa-input" rows="2" /></label>
        <label class="sa-field"><span>objections</span><textarea v-model="form.objections" class="sa-input" rows="2" /></label>
        <button class="sa-btn-primary" type="submit" :disabled="saving || storeUnavailable">+ Kontakt dokumentieren</button>
        <p v-if="message" class="ok">{{ message }}</p>
        <p v-if="error" class="sa-error">{{ error }}</p>
      </form>
    </section>

    <section class="sa-card block">
      <h2>Dokumentierte Kontakte</h2>
      <ul v-if="logs.length">
        <li v-for="log in logs" :key="log.id">
          {{ formatWhen(log.created_at) }} · {{ log.channel }} · {{ log.result }} · {{ log.next_action || '—' }}
          <p v-if="log.notes">{{ log.notes }}</p>
        </li>
      </ul>
      <p v-else class="meta">Noch kein manuell dokumentierter Kontakt.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { salesDetailFailureMessage, salesDetailLoadFailure, type SalesDetailLoadState } from '~/utils/sales-detail-state'

definePageMeta({ layout: 'tenant-admin', middleware: ['superadmin'] })
const route = useRoute()
const prospect = ref<any>(null)
const profile = ref<any>(null)
const logs = ref<any[]>([])
const error = ref('')
const message = ref('')
const saving = ref(false)
const storeUnavailable = ref(false)
const loadState = ref<SalesDetailLoadState>('loading')
const loadError = ref('')
const loadTitle = computed(() => {
  if (loadState.value === 'not_found') return 'Prospect nicht gefunden'
  if (loadState.value === 'unauthorized') return 'Kein Zugriff'
  return 'Sales-Daten nicht verfügbar'
})
const statuses = ['review_required', 'new', 'contact_1', 'contacted', 'conversation', 'demo_booked', 'demo_completed', 'proposal', 'won', 'lost', 'nurture', 'do_not_contact', 'excluded_existing_tenant']
const form = reactive({
  channel: 'phone',
  result: 'no_answer',
  sales_status: 'review_required',
  next_action: 'call',
  next_follow_up_at: '',
  notes: '',
  current_software: '',
  pain_points: '',
  interested_features: '',
  objections: '',
})

const authHeaders = async () => {
  const sb = getSupabase()
  const { data: { session } } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}
const formatWhen = (iso?: string | null) => iso ? new Date(iso).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const evidenceLabel = (value: string) => ({ HIGH_EVIDENCE: 'HIGH evidence', MEDIUM_EVIDENCE: 'MEDIUM evidence', LOW_EVIDENCE: 'LOW evidence', AMBIGUOUS: 'AMBIGUOUS evidence' }[value] || value)
const flag = (mail: { sent: boolean; opened: boolean; clicked: boolean }) => {
  if (!mail?.sent && !mail?.opened && !mail?.clicked) return 'nicht gesendet'
  return `${mail.sent ? 'sent' : 'nicht gesendet'} / ${mail.opened ? 'opened' : 'nicht geöffnet'} / ${mail.clicked ? 'clicked' : 'kein Click'}`
}

const load = async () => {
  error.value = ''
  loadError.value = ''
  try {
    const headers = await authHeaders()
    const data = await $fetch<any>(`/api/tenant-admin/sales/${route.params.id}`, { headers })
    if (!data?.prospect) {
      prospect.value = null
      loadState.value = 'not_found'
      loadError.value = salesDetailFailureMessage('not_found')
      useHead({ title: 'Sales' })
      return
    }
    prospect.value = data.prospect
    profile.value = data.profile
    logs.value = data.logs || []
    storeUnavailable.value = data.profile_store === 'unavailable'
    if (data.profile) {
      form.sales_status = data.profile.sales_status || form.sales_status
      form.current_software = data.profile.current_software || ''
      form.pain_points = data.profile.pain_points || ''
      form.interested_features = data.profile.interested_features || ''
      form.objections = data.profile.objections || ''
      form.notes = data.profile.notes || ''
    }
    loadState.value = 'ready'
    useHead({ title: `${data.prospect?.name || 'Prospect'} – Sales` })
  } catch (err: any) {
    prospect.value = null
    profile.value = null
    logs.value = []
    const state = salesDetailLoadFailure(err?.statusCode || err?.status || err?.response?.status)
    loadState.value = state
    loadError.value = salesDetailFailureMessage(state)
    useHead({ title: 'Sales' })
  }
}

const saveContact = async () => {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const headers = await authHeaders()
    await $fetch(`/api/tenant-admin/sales/${route.params.id}/contact`, {
      method: 'POST',
      headers,
      body: form,
    })
    message.value = 'Kontakt dokumentiert. Es wurde nichts gesendet.'
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Speichern fehlgeschlagen'
  } finally {
    saving.value = false
  }
  if (!message.value) return
  await load()
  if (loadState.value !== 'ready') {
    loadError.value = `${loadError.value} Der Kontakt wurde bereits dokumentiert.`
  }
}

onMounted(load)
</script>

<style scoped>
.sa-back { color:#818cf8; text-decoration:none; font-size:0.75rem; }
.sa-page-header { margin:0.75rem 0 1rem; }
.sa-page-title { font-size:1.5rem; font-weight:800; color:#f1f5f9; margin:0; }
.person { color:#cbd5e1; margin:0.25rem 0; }
.chips { display:flex; gap:0.4rem; flex-wrap:wrap; }
.contactability { font-weight:800; margin:0.75rem 0 0.25rem; }
.warn { color:#fbbf24; }
.stop { color:#f87171; }
.meta, .sa-error { color:#64748b; font-size:0.78rem; }
.sa-error { color:#f87171; }
.ok { color:#34d399; font-size:0.8rem; }
.sa-card { background:#1a1d2e; border:1px solid rgba(255,255,255,0.06); border-radius:14px; }
.block { padding:1rem 1.25rem; margin-bottom:1rem; }
.block h2, .block h3 { color:#f1f5f9; font-size:0.95rem; margin:0 0 0.5rem; }
.block dl { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0.75rem; }
.block dt { font-size:0.68rem; text-transform:uppercase; color:#64748b; font-weight:700; }
.block dd { margin:0.15rem 0 0; color:#e2e8f0; }
.block a { color:#a5b4fc; }
.grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0.75rem; }
.sa-field { display:flex; flex-direction:column; gap:0.3rem; margin-top:0.6rem; font-size:0.72rem; font-weight:700; color:#64748b; text-transform:uppercase; }
.sa-input { width:100%; padding:0.55rem 0.75rem; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#121526; color:#e2e8f0; font-size:0.85rem; }
.sa-badge { display:inline-flex; padding:0.2rem 0.55rem; border-radius:999px; font-size:0.7rem; font-weight:700; }
.sa-badge-amber { background:rgba(245,158,11,0.12); color:#fbbf24; }
.sa-badge-blue { background:rgba(99,102,241,0.12); color:#a5b4fc; }
.sa-badge-neutral { background:rgba(100,116,139,0.15); color:#94a3b8; }
.sa-btn-primary { margin-top:0.8rem; padding:0.55rem 1rem; background:linear-gradient(135deg,#4f46e5,#7c3aed); border:none; border-radius:8px; font-weight:700; color:white; cursor:pointer; }
.sa-btn-primary:disabled { opacity:0.55; }
@media (max-width: 720px) { .block dl, .grid { grid-template-columns:1fr; } }
</style>
