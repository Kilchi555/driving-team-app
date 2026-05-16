<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center">

      <!-- Loading -->
      <div v-if="state === 'loading'" class="space-y-4">
        <div class="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <svg class="w-6 h-6 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <p class="text-gray-600">Verarbeite deine Anfrage...</p>
      </div>

      <!-- Confirm prompt -->
      <div v-else-if="state === 'confirm'" class="space-y-6">
        <div class="mx-auto w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg class="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">E-Mail-Abmeldung</h1>
          <p class="mt-2 text-gray-600 text-sm">
            Möchtest du dich von allen Marketing-Emails abmelden?<br>
            Du erhältst dann keine Newsletter oder Angebote mehr.
          </p>
        </div>
        <div class="space-y-3">
          <button
            @click="unsubscribe"
            class="w-full py-3 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            Ja, abmelden
          </button>
          <p class="text-xs text-gray-400">Transaktionale Emails (Buchungsbestätigungen) werden weiterhin gesendet.</p>
        </div>
      </div>

      <!-- Success -->
      <div v-else-if="state === 'success'" class="space-y-6">
        <div class="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Erfolgreich abgemeldet</h1>
          <p class="mt-2 text-gray-600 text-sm">
            Du hast dich von unserem Newsletter abgemeldet.<br>
            Du wirst keine weiteren Marketing-Emails erhalten.
          </p>
        </div>
      </div>

      <!-- Already unsubscribed -->
      <div v-else-if="state === 'already'" class="space-y-6">
        <div class="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          <svg class="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Bereits abgemeldet</h1>
          <p class="mt-2 text-gray-600 text-sm">Du bist bereits von unserem Newsletter abgemeldet.</p>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="state === 'error'" class="space-y-6">
        <div class="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <svg class="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Link ungültig</h1>
          <p class="mt-2 text-gray-600 text-sm">
            Dieser Abmelde-Link ist ungültig oder abgelaufen.<br>
            Bitte kontaktiere uns direkt, um dich abzumelden.
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Abmelden' })

type State = 'loading' | 'confirm' | 'success' | 'already' | 'error'

const route = useRoute()
const state = ref<State>('loading')

const leadId = route.query.lead_id as string
const token = route.query.token as string

onMounted(() => {
  if (!leadId || !token) {
    state.value = 'error'
    return
  }
  state.value = 'confirm'
})

async function unsubscribe() {
  state.value = 'loading'
  try {
    const res = await $fetch<{ success: boolean; alreadyUnsubscribed?: boolean }>('/api/marketing/unsubscribe', {
      method: 'POST',
      body: { lead_id: leadId, token },
    })
    state.value = res.alreadyUnsubscribed ? 'already' : 'success'
  } catch {
    state.value = 'error'
  }
}
</script>
