<template>
  <div class="min-h-screen bg-gray-50/60 p-4 sm:p-6">
    <div class="max-w-3xl mx-auto space-y-5">

      <!-- Header -->
      <div>
        <h1 class="text-xl font-bold text-gray-900">Arztzeugnisse</h1>
        <p class="text-sm text-gray-500 mt-0.5">Hochgeladene Dokumente prüfen und genehmigen</p>
      </div>

      <!-- Filter tabs -->
      <div class="flex gap-1.5 bg-gray-100 rounded-xl p-1 w-fit">
        <button v-for="tab in tabs" :key="tab.id" @click="statusFilter = tab.id"
          :class="['px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
            statusFilter === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']">
          {{ tab.label }}
          <span v-if="tab.count > 0" class="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full"
            :class="statusFilter === tab.id ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'">
            {{ tab.count }}
          </span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-3">
        <div v-for="i in 2" :key="i" class="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse h-40" />
      </div>

      <!-- Empty -->
      <div v-else-if="filteredReviews.length === 0" class="bg-white rounded-2xl p-8 border border-gray-100 text-center">
        <svg class="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p class="text-sm font-medium text-gray-500">Keine Einträge</p>
      </div>

      <!-- Cards -->
      <div v-else class="space-y-4">
        <div v-for="r in filteredReviews" :key="r.appointment_id"
          class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

          <!-- Card header -->
          <div class="flex items-start justify-between p-5 pb-4">
            <div>
              <p class="font-semibold text-gray-900">{{ r.customer_first_name }} {{ r.customer_last_name }}</p>
              <p v-if="r.customer_email" class="text-xs text-gray-400 mt-0.5">{{ r.customer_email }}</p>
              <p v-if="r.customer_phone" class="text-xs text-gray-400">{{ r.customer_phone }}</p>
              <p v-if="!r.customer_email && !r.customer_phone" class="text-xs text-amber-500 mt-0.5">⚠ Keine Kontaktdaten</p>
            </div>
            <span :class="statusBadge(r.medical_certificate_status).class"
              class="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">
              {{ statusBadge(r.medical_certificate_status).label }}
            </span>
          </div>

          <!-- Details grid -->
          <div class="grid grid-cols-2 gap-3 px-5 pb-4 text-sm">
            <div v-if="r.start_time" class="bg-gray-50 rounded-xl px-3 py-2">
              <p class="text-xs text-gray-400 font-medium">Termin</p>
              <p class="text-gray-800 font-semibold text-xs mt-0.5">{{ formatDate(r.start_time) }}</p>
            </div>
            <div class="bg-gray-50 rounded-xl px-3 py-2">
              <p class="text-xs text-gray-400 font-medium">Zahlung</p>
              <p class="font-semibold text-xs mt-0.5" :class="paymentColor(r.payment_status)">
                {{ paymentLabel(r.payment_status) }}
                <span v-if="r.total_amount_rappen" class="text-gray-500 font-normal"> · CHF {{ (r.total_amount_rappen / 100).toFixed(2) }}</span>
              </p>
            </div>
            <div v-if="r.staff_first_name" class="bg-gray-50 rounded-xl px-3 py-2">
              <p class="text-xs text-gray-400 font-medium">Fahrlehrer</p>
              <p class="text-gray-800 font-semibold text-xs mt-0.5">{{ r.staff_first_name }} {{ r.staff_last_name }}</p>
            </div>
            <div v-if="r.days_since_upload !== null" class="bg-gray-50 rounded-xl px-3 py-2">
              <p class="text-xs text-gray-400 font-medium">Hochgeladen</p>
              <p class="text-gray-800 font-semibold text-xs mt-0.5">
                {{ r.days_since_upload === 0 ? 'Heute' : `vor ${r.days_since_upload} Tag(en)` }}
              </p>
            </div>
          </div>

          <!-- Certificate preview link -->
          <div v-if="r.medical_certificate_url" class="px-5 pb-4">
            <a :href="r.medical_certificate_url" target="_blank"
              class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Arztzeugnis öffnen
            </a>
          </div>
          <div v-else class="px-5 pb-4">
            <p class="text-xs text-gray-400 italic">Noch kein Arztzeugnis hochgeladen</p>
          </div>

          <!-- Notes textarea -->
          <div class="px-5 pb-4">
            <textarea v-model="r.notes" rows="2" placeholder="Notizen (optional)…"
              class="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 resize-none"
              :style="{ '--tw-ring-color': primaryColor }" />
          </div>

          <!-- Action buttons -->
          <div v-if="r.medical_certificate_status === 'uploaded'" class="px-5 pb-5 flex gap-2 flex-wrap">

            <!-- PRIMARY: Approve + Cancel without cost + Notify -->
            <button @click="approveAndCancel(r)" :disabled="processing === r.appointment_id"
              class="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50"
              :style="{ background: `linear-gradient(135deg, #16a34a, #15803d)` }">
              <svg v-if="processing !== r.appointment_id" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ processing === r.appointment_id ? 'Verarbeite…' : 'Genehmigen + Stornieren & Benachrichtigen' }}
            </button>

            <!-- SECONDARY: Approve only (with credit/refund) -->
            <button @click="approve(r)" :disabled="processing === r.appointment_id"
              class="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
              Nur genehmigen
            </button>

            <!-- Reject -->
            <button @click="reject(r)" :disabled="processing === r.appointment_id"
              class="px-4 py-2.5 rounded-xl border border-red-100 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
              Ablehnen
            </button>
          </div>

          <!-- Already processed -->
          <div v-else class="px-5 pb-5">
            <p class="text-xs text-gray-400">
              {{ r.medical_certificate_status === 'approved' ? '✅ Genehmigt' : '❌ Abgelehnt' }}
              <span v-if="r.medical_certificate_reviewed_at"> · {{ formatDate(r.medical_certificate_reviewed_at) }}</span>
            </p>
          </div>

          <!-- Success toast per card -->
          <div v-if="successMsg[r.appointment_id]"
            class="mx-5 mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700 font-medium">
            {{ successMsg[r.appointment_id] }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin', layout: 'admin' })
useHead({ title: 'Arztzeugnisse' })

const { primaryColor } = useTenantBranding()

const reviews = ref<any[]>([])
const isLoading = ref(true)
const statusFilter = ref('uploaded')
const processing = ref<string | null>(null)
const successMsg = ref<Record<string, string>>({})

const tabs = computed(() => [
  { id: 'uploaded', label: 'Ausstehend', count: reviews.value.filter(r => r.medical_certificate_status === 'uploaded').length },
  { id: 'pending',  label: 'Noch nicht hochgeladen', count: reviews.value.filter(r => r.medical_certificate_status === 'pending').length },
  { id: 'approved', label: 'Genehmigt', count: reviews.value.filter(r => r.medical_certificate_status === 'approved').length },
  { id: 'all',      label: 'Alle', count: reviews.value.length },
])

const filteredReviews = computed(() =>
  statusFilter.value === 'all' ? reviews.value : reviews.value.filter(r => r.medical_certificate_status === statusFilter.value)
)

async function loadReviews() {
  isLoading.value = true
  try {
    const data = await $fetch<any[]>('/api/admin/medical-certificate-reviews')
    reviews.value = (data || []).map(r => ({ ...r, notes: r.medical_certificate_notes || '' }))
  } catch { /* ignore */ } finally { isLoading.value = false }
}

async function approveAndCancel(r: any) {
  if (!r.medical_certificate_url) return alert('Kein Arztzeugnis hochgeladen')
  if (!confirm(`Arztzeugnis von ${r.customer_first_name} ${r.customer_last_name} genehmigen und Termin ohne Kostenfolge stornieren?\n\nBenachrichtigung wird ${r.customer_email ? 'per E-Mail' : r.customer_phone ? 'per SMS' : 'NICHT (keine Kontaktdaten)'} gesendet.`)) return
  processing.value = r.appointment_id
  try {
    const res = await $fetch<any>('/api/medical-certificate/approve-and-cancel', {
      method: 'POST', body: { appointmentId: r.appointment_id, notes: r.notes }
    })
    successMsg.value[r.appointment_id] = res.message
    setTimeout(() => { delete successMsg.value[r.appointment_id] }, 5000)
    await loadReviews()
  } catch (e: any) {
    alert(`Fehler: ${e?.data?.statusMessage || e?.message}`)
  } finally { processing.value = null }
}

async function approve(r: any) {
  if (!r.medical_certificate_url) return alert('Kein Arztzeugnis hochgeladen')
  if (!confirm(`Nur Arztzeugnis genehmigen (Termin bleibt bestehen, Betrag wird erstattet/gutgeschrieben)?`)) return
  processing.value = r.appointment_id
  try {
    const res = await $fetch<any>('/api/medical-certificate/approve', {
      method: 'POST', body: { appointmentId: r.appointment_id, notes: r.notes }
    })
    successMsg.value[r.appointment_id] = res.message || 'Genehmigt'
    setTimeout(() => { delete successMsg.value[r.appointment_id] }, 5000)
    await loadReviews()
  } catch (e: any) {
    alert(`Fehler: ${e?.data?.statusMessage || e?.message}`)
  } finally { processing.value = null }
}

async function reject(r: any) {
  if (!r.notes?.trim()) return alert('Bitte Ablehnungsgrund in den Notizen angeben.')
  if (!confirm(`Arztzeugnis ablehnen?\n\nGrund: ${r.notes}`)) return
  processing.value = r.appointment_id
  try {
    await $fetch('/api/medical-certificate/reject', {
      method: 'POST', body: { appointmentId: r.appointment_id, notes: r.notes }
    })
    await loadReviews()
  } catch (e: any) {
    alert(`Fehler: ${e?.data?.statusMessage || e?.message}`)
  } finally { processing.value = null }
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; class: string }> = {
    uploaded: { label: 'Warte auf Prüfung', class: 'bg-blue-100 text-blue-700' },
    pending:  { label: 'Noch nicht hochgeladen', class: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Genehmigt', class: 'bg-green-100 text-green-700' },
    rejected: { label: 'Abgelehnt', class: 'bg-red-100 text-red-700' },
  }
  return map[status] ?? { label: status, class: 'bg-gray-100 text-gray-600' }
}

function paymentLabel(s: string) {
  return ({ pending: 'Ausstehend', authorized: 'Reserviert', completed: 'Bezahlt', cancelled: 'Storniert', failed: 'Fehler' } as any)[s] ?? s
}

function paymentColor(s: string) {
  return ({ completed: 'text-green-600', cancelled: 'text-gray-400', failed: 'text-red-600', pending: 'text-amber-600' } as any)[s] ?? 'text-gray-700'
}

function formatDate(iso: string) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(loadReviews)
</script>
