<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md mx-auto">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <!-- Loading State -->
        <div v-if="isProcessing" class="text-center py-12">
          <div class="mb-4">
            <div class="inline-block">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
          <p class="text-gray-600">Verarbeite Ihre Anmeldung...</p>
        </div>

        <!-- Success State -->
        <div v-else-if="success" class="text-center py-12">
          <div class="mb-4">
            <div class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Anmeldung erfolgreich!</h2>
          <p class="text-gray-600 mb-6">
            Vielen Dank für Ihre Anmeldung. Sie erhalten in Kürze eine Bestätigungsmail.
          </p>
          
          <div v-if="enrollmentDetails" class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 class="font-semibold text-gray-900 mb-3">Anmeldungsdetails:</h3>
            <div class="space-y-2 text-sm text-gray-600">
              <p><span class="font-medium">Kurs:</span> {{ enrollmentDetails.courseName }}</p>
              <p v-if="enrollmentDetails.participantName">
                <span class="font-medium">Teilnehmer:</span> {{ enrollmentDetails.participantName }}
              </p>
              <p v-if="enrollmentDetails.paymentAmount">
                <span class="font-medium">Zahlbetrag:</span> CHF {{ enrollmentDetails.paymentAmount.toFixed(2) }}
              </p>
              <p v-if="enrollmentDetails.paymentMethod">
                <span class="font-medium">Zahlungsmethode:</span> {{ enrollmentDetails.paymentMethod }}
              </p>
            </div>
          </div>

          <button
            @click="goHome"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Zur Startseite
          </button>
        </div>

        <!-- Error State -->
        <div v-else class="text-center py-12">
          <div class="mb-4">
            <div class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Anmeldung fehlgeschlagen</h2>
          <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
          
          <button
            @click="goBack"
            class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Zurück
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const route = useRoute()
const router = useRouter()

const isProcessing = ref(true)
const success = ref(false)
const errorMessage = ref('')
const enrollmentDetails = ref<any>(null)

const processEnrollment = async () => {
  try {
    const courseId = route.query.courseId as string
    const transactionId = route.query.transaction_id as string
    const isSARI = route.query.sari === 'true'

    if (!courseId) {
      throw new Error('Course ID not provided')
    }

    // Call enrollment completion API
    const response = await $fetch('/api/courses/enroll-complete', {
      method: 'POST',
      body: {
        courseId,
        transactionId,
        isSARI
      }
    })

    if (!response.success) {
      throw new Error(response.message || 'Enrollment failed')
    }

    enrollmentDetails.value = response.enrollmentDetails
    success.value = true
  } catch (err: any) {
    console.error('Error processing enrollment:', err)
    errorMessage.value = err.message || 'Ein Fehler ist aufgetreten'
    success.value = false
  } finally {
    isProcessing.value = false
  }
}

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  processEnrollment()
})
</script>

