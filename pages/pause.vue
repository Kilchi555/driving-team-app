<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center">
      <div v-if="state === 'loading'" class="space-y-4">
        <div class="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <svg class="w-6 h-6 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <p class="text-gray-600">Einen Moment…</p>
      </div>

      <div v-else-if="state === 'choose'" class="space-y-6">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Brauchst du noch Termine?</h1>
          <p class="mt-2 text-gray-600 text-sm">
            Hallo {{ firstName || 'du' }} — sag uns kurz Bescheid, dann erinnern wir dich nicht mehr.
          </p>
          <p v-if="tenantName" class="mt-1 text-xs text-gray-400">{{ tenantName }}</p>
        </div>
        <div class="space-y-3">
          <button
            class="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
            :disabled="saving"
            @click="stop('exam_passed')"
          >
            Prüfung bestanden
          </button>
          <button
            class="w-full py-3 px-4 bg-white text-gray-800 rounded-xl font-medium border border-gray-200 hover:border-gray-300 transition-colors"
            :disabled="saving"
            @click="stop('stopped')"
          >
            Ich brauche keine Fahrstunden mehr
          </button>
        </div>
        <p class="text-xs text-gray-400">
          Das Konto bleibt bestehen. Du kannst später wieder buchen.
        </p>
      </div>

      <div v-else-if="state === 'success'" class="space-y-6">
        <div class="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Danke, wir haben es notiert</h1>
          <p class="mt-2 text-gray-600 text-sm">
            {{ successText }}
          </p>
        </div>
        <button
          class="text-sm text-gray-500 underline underline-offset-2"
          :disabled="saving"
          @click="resume"
        >
          Doch wieder Termine wollen
        </button>
      </div>

      <div v-else class="space-y-6">
        <div class="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <svg class="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Link ungültig</h1>
          <p class="mt-2 text-gray-600 text-sm">
            Dieser Link ist ungültig. Bitte öffne den Link aus der E-Mail oder SMS, oder sag in der App unter Profil Bescheid.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Termine nicht mehr nötig' })

type State = 'loading' | 'choose' | 'success' | 'error'
type Reason = 'exam_passed' | 'stopped'

const route = useRoute()
const state = ref<State>('loading')
const saving = ref(false)
const firstName = ref('')
const tenantName = ref('')
const lastReason = ref<Reason | null>(null)

const token = computed(() => (typeof route.query.t === 'string' ? route.query.t : ''))

const successText = computed(() => {
  if (lastReason.value === 'exam_passed') {
    return 'Herzliche Gratulation zur Prüfung. Du erhältst keine Erinnerungen mehr für den nächsten Termin.'
  }
  return 'Du erhältst keine Erinnerungen mehr für den nächsten Termin.'
})

async function loadStatus() {
  if (!token.value) {
    state.value = 'error'
    return
  }
  try {
    const res = await $fetch<{ success: boolean, firstName?: string, tenantName?: string, stopped?: boolean, reason?: Reason | null }>(
      '/api/idle-reminder/status',
      { query: { t: token.value } }
    )
    firstName.value = res.firstName || ''
    tenantName.value = res.tenantName || ''
    if (res.stopped) {
      lastReason.value = res.reason === 'exam_passed' ? 'exam_passed' : 'stopped'
      state.value = 'success'
      return
    }
    state.value = 'choose'
  } catch {
    state.value = 'error'
  }
}

async function stop(reason: Reason) {
  saving.value = true
  try {
    await $fetch('/api/idle-reminder/stop', {
      method: 'POST',
      body: { token: token.value, reason }
    })
    lastReason.value = reason
    state.value = 'success'
  } catch {
    state.value = 'error'
  } finally {
    saving.value = false
  }
}

async function resume() {
  saving.value = true
  try {
    await $fetch('/api/idle-reminder/stop', {
      method: 'POST',
      body: { token: token.value, action: 'resume' }
    })
    lastReason.value = null
    state.value = 'choose'
  } catch {
    state.value = 'error'
  } finally {
    saving.value = false
  }
}

onMounted(loadStatus)
</script>
