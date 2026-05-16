<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center">

      <!-- Success -->
      <div v-if="status === 'success'" class="space-y-6">
        <div class="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Angemeldet!</h1>
          <p class="mt-2 text-gray-600 text-sm">
            Super — du erhältst ab jetzt unsere Angebote und News.<br>
            Du kannst dich jederzeit wieder abmelden.
          </p>
        </div>
      </div>

      <!-- Already active -->
      <div v-else-if="status === 'already'" class="space-y-6">
        <div class="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Bereits angemeldet</h1>
          <p class="mt-2 text-gray-600 text-sm">Du bist bereits in unserer Liste eingetragen.</p>
        </div>
      </div>

      <!-- Invalid -->
      <div v-else class="space-y-6">
        <div class="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Link ungültig</h1>
          <p class="mt-2 text-gray-600 text-sm">Dieser Link ist abgelaufen oder ungültig.</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Anmeldung bestätigt' })

const route = useRoute()
const status = computed(() => route.query.status as string || 'invalid')
</script>
