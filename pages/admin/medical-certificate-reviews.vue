<!-- pages/admin/medical-certificate-reviews.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h1 class="text-2xl font-bold text-gray-900">Arztzeugnis-Prüfungen</h1>
        <p class="mt-1 text-sm text-gray-600">Hochgeladene Arztzeugnisse prüfen und genehmigen</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex space-x-2">
        <button
          @click="statusFilter = 'uploaded'"
          :class="statusFilter === 'uploaded' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Hochgeladen ({{ uploadedCount }})
        </button>
        <button
          @click="statusFilter = 'pending'"
          :class="statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700 border border-gray-300'"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Ausstehend ({{ pendingCount }})
        </button>
        <button
          @click="statusFilter = 'all'"
          :class="statusFilter === 'all' ? 'bg-gray-600 text-white' : 'bg-white text-gray-700 border border-gray-300'"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Alle ({{ totalCount }})
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
        <p class="mt-4 text-gray-600">Lade Prüfungen...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredReviews.length === 0" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Keine Prüfungen</h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ statusFilter === 'uploaded' ? 'Keine hochgeladenen Arztzeugnisse' : statusFilter === 'pending' ? 'Keine ausstehenden Uploads' : 'Keine Arztzeugnisse zur Prüfung' }}
        </p>
      </div>
    </div>

    <!-- Reviews List -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="space-y-4">
        <div 
          v-for="review in filteredReviews" 
          :key="review.appointment_id"
          class="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <!-- Header -->
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">
                {{ review.customer_first_name }} {{ review.customer_last_name }}
              </h3>
              <p class="text-sm text-gray-600">{{ review.customer_email }}</p>
              <p v-if="review.customer_phone" class="text-sm text-gray-500">{{ review.customer_phone }}</p>
            </div>
            <div class="text-right">
              <span 
                :class="review.medical_certificate_status === 'uploaded' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'"
                class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium"
              >
                {{ review.medical_certificate_status === 'uploaded' ? 'Hochgeladen' : 'Ausstehend' }}
              </span>
            </div>
          </div>

          <!-- Appointment Details -->
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-600">Termin:</span>
                <span class="ml-2 font-medium">{{ formatDate(review.start_time) }}</span>
              </div>
              <div>
                <span class="text-gray-600">Fahrlehrer:</span>
                <span class="ml-2 font-medium">{{ review.staff_first_name }} {{ review.staff_last_name }}</span>
              </div>
              <div>
                <span class="text-gray-600">Betrag:</span>
                <span class="ml-2 font-medium">CHF {{ (review.total_amount_rappen / 100).toFixed(2) }}</span>
              </div>
              <div>
                <span class="text-gray-600">Zahlungsstatus:</span>
                <span class="ml-2 font-medium">{{ getPaymentStatusLabel(review.payment_status) }}</span>
              </div>
            </div>
          </div>

          <!-- Cancellation Info -->
          <div class="border-l-4 border-yellow-400 bg-yellow-50 p-3 mb-4">
            <p class="text-sm text-yellow-800">
              <span class="font-medium">Absage-Grund:</span> {{ review.cancellation_reason }}
            </p>
            <p v-if="review.proof_description" class="text-xs text-yellow-700 mt-1">
              {{ review.proof_description }}
            </p>
          </div>

          <!-- Medical Certificate -->
          <div v-if="review.medical_certificate_url" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Hochgeladenes Arztzeugnis:</label>
            <div class="flex items-center space-x-3">
              <a 
                :href="review.medical_certificate_url" 
                target="_blank"
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg class="mr-2 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
                </svg>
                Arztzeugnis öffnen
              </a>
              <span v-if="review.days_since_upload !== null" class="text-xs text-gray-500">
                Hochgeladen vor {{ review.days_since_upload }} Tag(en)
              </span>
            </div>
          </div>
          <div v-else class="mb-4">
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p class="text-sm text-gray-600">
                Noch kein Arztzeugnis hochgeladen
                <span v-if="review.deadline_exceeded" class="text-red-600 font-medium ml-1">(Deadline überschritten!)</span>
              </p>
            </div>
          </div>

          <!-- Admin Notes -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Admin-Notizen:</label>
            <textarea
              v-model="review.notes"
              rows="3"
              placeholder="Notizen zur Prüfung (z.B. warum abgelehnt)..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <!-- Actions -->
          <div v-if="review.medical_certificate_url" class="flex space-x-3">
            <button
              @click="approve(review)"
              :disabled="processing === review.appointment_id"
              class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <span v-if="processing === review.appointment_id">Verarbeite...</span>
              <span v-else>✅ Genehmigen & Erstatten</span>
            </button>
            <button
              @click="reject(review)"
              :disabled="processing === review.appointment_id"
              class="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <span v-if="processing === review.appointment_id">Verarbeite...</span>
              <span v-else>❌ Ablehnen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const authStore = useAuthStore()

// State
const reviews = ref<any[]>([])
const isLoading = ref(true)
const statusFilter = ref('uploaded')
const processing = ref<string | null>(null)

// Computed
const filteredReviews = computed(() => {
  if (statusFilter.value === 'all') return reviews.value
  return reviews.value.filter(r => r.medical_certificate_status === statusFilter.value)
})

const uploadedCount = computed(() => 
  reviews.value.filter(r => r.medical_certificate_status === 'uploaded').length
)

const pendingCount = computed(() => 
  reviews.value.filter(r => r.medical_certificate_status === 'pending').length
)

const totalCount = computed(() => reviews.value.length)

// Methods
const loadReviews = async () => {
  try {
    isLoading.value = true
    
    const { data, error } = await supabase
      .from('medical_certificate_reviews')
      .select('*')
      .order('medical_certificate_uploaded_at', { ascending: false, nullsLast: true })

    if (error) throw error
    
    reviews.value = (data || []).map(r => ({ ...r, notes: r.medical_certificate_notes || '' }))
    
    logger.debug('✅ Loaded reviews:', reviews.value.length)
    
  } catch (err: any) {
    console.error('❌ Error loading reviews:', err)
    alert('Fehler beim Laden der Prüfungen')
  } finally {
    isLoading.value = false
  }
}

const approve = async (review: any) => {
  if (!review.medical_certificate_url) {
    alert('Kein Arztzeugnis hochgeladen')
    return
  }

  if (!confirm(`Arztzeugnis für ${review.customer_first_name} ${review.customer_last_name} genehmigen?\n\nDies wird die Kosten erstatten oder als Guthaben gutschreiben.`)) {
    return
  }

  try {
    processing.value = review.appointment_id
    
    const response = await $fetch('/api/medical-certificate/approve', {
      method: 'POST',
      body: {
        appointmentId: review.appointment_id,
        notes: review.notes
      }
    })

    logger.debug('✅ Approved:', response)
    alert(`Arztzeugnis genehmigt!\n\n${response.message}`)
    
    // Reload reviews
    await loadReviews()
    
  } catch (err: any) {
    console.error('❌ Error approving:', err)
    alert(`Fehler beim Genehmigen: ${err.data?.message || err.message}`)
  } finally {
    processing.value = null
  }
}

const reject = async (review: any) => {
  if (!review.notes || review.notes.trim().length === 0) {
    alert('Bitte geben Sie einen Ablehnungsgrund in den Notizen an')
    return
  }

  if (!confirm(`Arztzeugnis für ${review.customer_first_name} ${review.customer_last_name} ablehnen?\n\nGrund: ${review.notes}`)) {
    return
  }

  try {
    processing.value = review.appointment_id
    
    const response = await $fetch('/api/medical-certificate/reject', {
      method: 'POST',
      body: {
        appointmentId: review.appointment_id,
        notes: review.notes
      }
    })

    logger.debug('✅ Rejected:', response)
    alert('Arztzeugnis abgelehnt')
    
    // Reload reviews
    await loadReviews()
    
  } catch (err: any) {
    console.error('❌ Error rejecting:', err)
    alert(`Fehler beim Ablehnen: ${err.data?.message || err.message}`)
  } finally {
    processing.value = null
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getPaymentStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'pending': 'Ausstehend',
    'authorized': 'Reserviert',
    'completed': 'Bezahlt',
    'cancelled': 'Storniert',
    'failed': 'Fehlgeschlagen'
  }
  return labels[status] || status
}

// Lifecycle
onMounted(() => {
  loadReviews()
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

