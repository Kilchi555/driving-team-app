<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-2">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center" :style="primaryBgLight">
        <svg class="w-5 h-5" :style="primaryText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
        </svg>
      </div>
      <div>
        <h1 class="text-xl font-bold text-gray-900">Rückerstattungsanträge</h1>
        <p class="text-sm text-gray-500">Anträge von Staff prüfen und genehmigen oder ablehnen.</p>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="activeTab === tab.value
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'"
      >
        {{ tab.label }}
        <span v-if="tab.value === 'pending' && pendingCount > 0"
          class="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
          :style="primaryBg"
        >{{ pendingCount }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-16 text-gray-400 gap-2">
      <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Wird geladen…
    </div>

    <!-- Empty -->
    <div v-else-if="filteredRequests.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
      <svg class="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <p class="text-sm">Keine Anträge in dieser Kategorie.</p>
    </div>

    <!-- Requests List -->
    <div v-else class="space-y-3">
      <div
        v-for="req in filteredRequests"
        :key="req.id"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div class="px-5 py-4 flex items-start justify-between gap-4">
          <div class="min-w-0">
            <!-- Status Badge -->
            <div class="flex items-center gap-2 mb-2">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                :class="{
                  'bg-amber-100 text-amber-700': req.status === 'pending',
                  'bg-green-100 text-green-700': req.status === 'completed',
                  'bg-red-100 text-red-700': req.status === 'rejected',
                }"
              >
                {{ statusLabel(req.status) }}
              </span>
              <span class="text-xs text-gray-400">{{ formatDate(req.created_at) }}</span>
            </div>

            <!-- Who requested -->
            <p class="text-sm font-semibold text-gray-900">
              {{ req.requested_by?.first_name }} {{ req.requested_by?.last_name }}
              <span class="font-normal text-gray-500">beantragt</span>
              CHF {{ (req.requested_amount_rappen / 100).toFixed(2) }}
            </p>

            <!-- Reason -->
            <p v-if="req.reason" class="text-sm text-gray-500 mt-0.5 italic">„{{ req.reason }}"</p>

            <!-- Payment info -->
            <p class="text-xs text-gray-400 mt-1.5">
              Zahlung: CHF {{ (req.payment?.total_amount_rappen / 100).toFixed(2) }}
              <span v-if="req.payment?.wallee_transaction_id" class="ml-1">(Wallee #{{ req.payment.wallee_transaction_id }})</span>
            </p>

            <!-- Review note -->
            <p v-if="req.review_note" class="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
              <span class="font-medium">Notiz:</span> {{ req.review_note }}
            </p>
          </div>

          <!-- Actions (pending only) -->
          <div v-if="req.status === 'pending'" class="flex flex-col gap-2 flex-shrink-0">
            <button
              @click="openReview(req, 'approve')"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors"
            >
              Genehmigen
            </button>
            <button
              @click="openReview(req, 'reject')"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Ablehnen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Review Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showReviewModal" class="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4" @click.self="showReviewModal = false">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 class="text-base font-bold text-gray-900">
              {{ reviewAction === 'approve' ? 'Antrag genehmigen' : 'Antrag ablehnen' }}
            </h3>

            <div v-if="reviewSuccess" class="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl p-3 text-sm">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              {{ reviewAction === 'approve' ? 'Rückerstattung erfolgreich ausgelöst.' : 'Antrag abgelehnt.' }}
            </div>

            <template v-else>
              <p class="text-sm text-gray-600">
                {{ reviewAction === 'approve'
                  ? `Die Rückerstattung von CHF ${reviewRequest ? (reviewRequest.requested_amount_rappen / 100).toFixed(2) : '—'} wird direkt via Wallee ausgelöst.`
                  : 'Der Staff wird keine Erstattung erhalten.' }}
              </p>

              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">
                  Interne Notiz {{ reviewAction === 'approve' ? '(optional)' : '(optional, für Staff sichtbar)' }}
                </label>
                <input
                  v-model="reviewNote"
                  type="text"
                  placeholder="z.B. Kulanz genehmigt / Grund nicht ausreichend"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

              <div class="flex gap-2 pt-1">
                <button
                  @click="showReviewModal = false"
                  class="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  @click="submitReview"
                  :disabled="isSubmitting"
                  class="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
                  :class="reviewAction === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'"
                >
                  {{ isSubmitting ? 'Wird verarbeitet…' : (reviewAction === 'approve' ? 'Genehmigen & Erstatten' : 'Ablehnen') }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePrimaryColor } from '~/composables/usePrimaryColor'

definePageMeta({ layout: 'admin' })

const { primaryBg, primaryText, primaryBgLight } = usePrimaryColor()

const isLoading = ref(true)
const requests = ref<any[]>([])
const activeTab = ref<'pending' | 'all'>('pending')

const tabs = [
  { value: 'pending', label: 'Offen' },
  { value: 'all', label: 'Alle' },
]

const pendingCount = computed(() => requests.value.filter(r => r.status === 'pending').length)

const filteredRequests = computed(() => {
  if (activeTab.value === 'pending') return requests.value.filter(r => r.status === 'pending')
  return requests.value
})

const statusLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'Offen'
    case 'completed': return 'Erstattet'
    case 'rejected': return 'Abgelehnt'
    default: return status
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// ── Load ──────────────────────────────────────────────────────────────────
const loadRequests = async () => {
  isLoading.value = true
  try {
    const res = await $fetch<any>('/api/admin/refund-requests')
    requests.value = res.data || []
  } catch (e) {
    console.error('❌ Failed to load refund requests:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(loadRequests)

// ── Review Modal ──────────────────────────────────────────────────────────
const showReviewModal = ref(false)
const reviewAction = ref<'approve' | 'reject'>('approve')
const reviewRequest = ref<any>(null)
const reviewNote = ref('')
const isSubmitting = ref(false)
const reviewSuccess = ref(false)

const openReview = (req: any, action: 'approve' | 'reject') => {
  reviewRequest.value = req
  reviewAction.value = action
  reviewNote.value = ''
  reviewSuccess.value = false
  showReviewModal.value = true
}

const submitReview = async () => {
  if (!reviewRequest.value) return
  isSubmitting.value = true
  try {
    await $fetch(`/api/admin/refund-requests/${reviewRequest.value.id}/review`, {
      method: 'POST',
      body: { action: reviewAction.value, note: reviewNote.value || undefined },
    })
    reviewSuccess.value = true
    await loadRequests()
    setTimeout(() => { showReviewModal.value = false }, 1800)
  } catch (err: any) {
    console.error('❌ Review error:', err)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
