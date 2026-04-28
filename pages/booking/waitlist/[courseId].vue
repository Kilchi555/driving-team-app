<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-lg mx-auto px-4 sm:px-6">

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-4">
        <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-gray-500 text-sm">Kurs wird geladen...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Kurs nicht gefunden</h2>
        <p class="text-gray-500 text-sm">{{ error }}</p>
      </div>

      <!-- Success -->
      <div v-else-if="submitted" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Auf der Warteliste!</h2>
        <p class="text-gray-600 mb-4">
          Sie sind auf <strong>Position #{{ submittedPosition }}</strong> der Warteliste für
          <strong>{{ course?.name }}</strong>.
        </p>
        <p class="text-sm text-gray-500">
          Eine Bestätigung wurde an <strong>{{ form.email }}</strong> gesendet.
          Sobald ein Kursdatum feststeht, werden Sie benachrichtigt.
        </p>
      </div>

      <!-- Form -->
      <template v-else-if="course">
        <!-- Header -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium mb-2">
                <span class="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                Datum noch nicht festgelegt
              </div>
              <h1 class="text-xl font-bold text-gray-900">{{ course.name }}</h1>
              <p v-if="course.description" class="text-sm text-gray-500 mt-1">{{ course.description }}</p>
              <div class="flex flex-wrap gap-3 mt-3 text-sm text-gray-600">
                <span v-if="course.max_participants" class="flex items-center gap-1">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
                  </svg>
                  Max. {{ course.max_participants }} Teilnehmer
                </span>
                <span v-if="course.price_per_participant_rappen" class="flex items-center gap-1">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                  </svg>
                  CHF {{ (course.price_per_participant_rappen / 100).toFixed(0) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Banner -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <strong>Wie funktioniert die Warteliste?</strong><br>
          Tragen Sie sich ein — sobald genügend Interessenten vorhanden sind, legen wir einen Termin fest und benachrichtigen Sie per E-Mail.
        </div>

        <!-- Form -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-5">Interesse bekunden</h2>
          <form @submit.prevent="submit" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Vorname *</label>
                <input
                  v-model="form.first_name"
                  type="text"
                  required
                  autocomplete="given-name"
                  placeholder="Max"
                  class="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Nachname *</label>
                <input
                  v-model="form.last_name"
                  type="text"
                  required
                  autocomplete="family-name"
                  placeholder="Muster"
                  class="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">E-Mail *</label>
              <input
                v-model="form.email"
                type="email"
                required
                autocomplete="email"
                placeholder="max.muster@example.com"
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Telefon <span class="text-gray-400 font-normal">(optional)</span></label>
              <input
                v-model="form.phone"
                type="tel"
                autocomplete="tel"
                placeholder="+41 79 123 45 67"
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <!-- Submit Error -->
            <div v-if="submitError" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {{ submitError }}
            </div>

            <button
              type="submit"
              :disabled="submitting"
              class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              <div v-if="submitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ submitting ? 'Wird eingetragen...' : 'Auf Warteliste eintragen' }}
            </button>

            <p class="text-xs text-gray-400 text-center">
              Mit der Eintragung stimmen Sie zu, per E-Mail kontaktiert zu werden, sobald ein Kurstermin feststeht.
            </p>
          </form>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const courseId = route.params.courseId as string

const loading = ref(true)
const error = ref<string | null>(null)
const course = ref<any>(null)
const submitting = ref(false)
const submitted = ref(false)
const submitError = ref<string | null>(null)
const submittedPosition = ref(0)

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: ''
})

onMounted(async () => {
  try {
    const res = await $fetch(`/api/courses/waitlist-info?course_id=${courseId}`)
    course.value = (res as any).course
  } catch (err: any) {
    error.value = err.data?.statusMessage || 'Kurs nicht gefunden'
  } finally {
    loading.value = false
  }
})

const submit = async () => {
  submitting.value = true
  submitError.value = null

  try {
    const res = await $fetch('/api/courses/waitlist-signup', {
      method: 'POST',
      body: {
        course_id: courseId,
        ...form.value
      }
    }) as any
    submittedPosition.value = res.position
    submitted.value = true
  } catch (err: any) {
    submitError.value = err.data?.statusMessage || 'Eintragung fehlgeschlagen. Bitte versuchen Sie es erneut.'
  } finally {
    submitting.value = false
  }
}

useHead({
  title: course.value ? `Warteliste: ${course.value.name}` : 'Warteliste'
})
</script>
