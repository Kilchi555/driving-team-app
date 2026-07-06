<template>
  <div class="bg-white rounded-lg shadow-sm border p-6">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 rounded-full flex items-center justify-center"
           :class="statusConfig.iconBg">
        <span class="text-xl">{{ statusConfig.icon }}</span>
      </div>
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Online-Zahlungen</h2>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="statusConfig.badgeClass">
          {{ statusConfig.label }}
        </span>
      </div>
    </div>

    <!-- not_started -->
    <template v-if="onboardingStatus === 'not_started'">
      <p class="text-sm text-gray-600 mb-4">
        Mit Online-Zahlungen können deine Kunden direkt bei der Buchung per Kreditkarte, TWINT oder anderen Methoden bezahlen.
      </p>
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm text-blue-800">
        Nach deiner Anfrage schicken wir dir per E-Mail einen persönlichen Registrierungslink von Wallee, über den du dein Konto direkt bei Wallee einrichten kannst. Die Bearbeitungszeit beträgt 2–5 Werktage.
      </div>

      <p v-if="errorMsg" class="text-sm text-red-600 mb-3">{{ errorMsg }}</p>

      <button @click="showConfirm = true"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
        Online-Zahlungen beantragen →
      </button>
    </template>

    <!-- pending -->
    <template v-else-if="onboardingStatus === 'pending'">
      <p class="text-sm text-gray-600 mb-3">
        Dein Antrag ist eingegangen und wird aktuell bearbeitet.
        Wir melden uns innerhalb von <strong>2–5 Werktagen</strong> per E-Mail.
      </p>
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        <strong>⏳ In Bearbeitung</strong> — sobald dein Wallee-Space eingerichtet ist, wirst du automatisch benachrichtigt.
      </div>
      <p class="mt-3 text-xs text-gray-500">
        Fragen? <a href="mailto:info@simy.ch" class="text-blue-600 hover:underline">info@simy.ch</a>
      </p>
    </template>

    <!-- active (onboarding done) → show enable/disable toggle -->
    <template v-else-if="onboardingStatus === 'active'">
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p class="text-sm font-medium text-gray-900">Online-Zahlungen einschalten</p>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ walleeEnabled
              ? 'Aktiv — Kunden können per Karte, TWINT usw. bezahlen.'
              : 'Deaktiviert — nur Bar/Rechnung sichtbar.' }}
          </p>
        </div>
        <button
          @click="toggleWallee"
          :disabled="toggleLoading"
          :class="[
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50',
            walleeEnabled ? 'bg-blue-600' : 'bg-gray-200'
          ]"
          role="switch"
          :aria-checked="walleeEnabled"
        >
          <span
            :class="[
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
              walleeEnabled ? 'translate-x-5' : 'translate-x-0'
            ]"
          />
        </button>
      </div>

      <p v-if="toggleError" class="mt-2 text-sm text-red-600">{{ toggleError }}</p>
      <p v-if="toggleSuccess" class="mt-2 text-sm text-green-600">{{ toggleSuccess }}</p>

      <div class="mt-4 flex gap-4 text-sm">
        <a href="https://app-wallee.com" target="_blank"
           class="text-blue-600 hover:underline">Wallee Dashboard →</a>
      </div>
    </template>
  </div>

  <!-- Bestätigungs-Modal -->
  <Teleport to="body">
    <div v-if="showConfirm"
         class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
         @click.self="showConfirm = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span class="text-xl">💳</span>
          </div>
          <h3 class="text-base font-bold text-gray-900">Online-Zahlungen beantragen?</h3>
        </div>
        <p class="text-sm text-gray-600 mb-5">
          Wir schicken dir per E-Mail einen persönlichen Wallee-Registrierungslink. Nach dem Einrichten können deine Kunden per Kreditkarte, TWINT und mehr bezahlen.
        </p>
        <p v-if="errorMsg" class="text-sm text-red-600 mb-3">{{ errorMsg }}</p>
        <div class="flex gap-3">
          <button
            @click="submitRequest"
            :disabled="loading"
            class="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
          >{{ loading ? 'Wird gesendet…' : 'Ja, beantragen' }}</button>
          <button
            @click="showConfirm = false"
            :disabled="loading"
            class="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >Abbrechen</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const onboardingStatus = ref<'not_started' | 'pending' | 'active'>('not_started')
const walleeEnabled    = ref(false)
const showConfirm      = ref(false)
const loading          = ref(false)
const errorMsg         = ref('')
const toggleLoading    = ref(false)
const toggleError      = ref('')
const toggleSuccess    = ref('')

const statusConfig = computed(() => {
  if (onboardingStatus.value === 'active') {
    return walleeEnabled.value
      ? { icon: '✅', iconBg: 'bg-green-100', label: 'Aktiv',          badgeClass: 'bg-green-100 text-green-700' }
      : { icon: '⏸️', iconBg: 'bg-gray-100',  label: 'Pausiert',       badgeClass: 'bg-gray-100 text-gray-600' }
  }
  const configs = {
    not_started: { icon: '💳', iconBg: 'bg-gray-100',   label: 'Nicht eingerichtet',  badgeClass: 'bg-gray-100 text-gray-600' },
    pending:     { icon: '⏳', iconBg: 'bg-yellow-100', label: 'Antrag eingereicht',  badgeClass: 'bg-yellow-100 text-yellow-700' },
    active:      { icon: '✅', iconBg: 'bg-green-100',  label: 'Aktiv',               badgeClass: 'bg-green-100 text-green-700' },
  }
  return configs[onboardingStatus.value]
})

onMounted(async () => {
  try {
    const res = await $fetch<{ status: string; enabled: boolean }>('/api/tenants/wallee-onboarding-status')
    onboardingStatus.value = (res.status as any) || 'not_started'
    walleeEnabled.value    = res.enabled ?? false
  } catch {
    // keep defaults
  }
})

const submitRequest = async () => {
  loading.value  = true
  errorMsg.value = ''
  try {
    await $fetch('/api/tenants/wallee-onboarding-request', { method: 'POST' })
    onboardingStatus.value = 'pending'
    showConfirm.value = false
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || 'Fehler beim Senden der Anfrage.'
  } finally {
    loading.value = false
  }
}

const toggleWallee = async () => {
  toggleLoading.value = true
  toggleError.value   = ''
  toggleSuccess.value = ''
  const newVal = !walleeEnabled.value
  try {
    await $fetch('/api/tenants/wallee-toggle', { method: 'POST', body: { enabled: newVal } })
    walleeEnabled.value    = newVal
    toggleSuccess.value    = newVal ? 'Online-Zahlungen aktiviert.' : 'Online-Zahlungen deaktiviert.'
    setTimeout(() => { toggleSuccess.value = '' }, 3000)
  } catch (err: any) {
    toggleError.value = err?.data?.statusMessage || 'Fehler beim Umschalten'
  } finally {
    toggleLoading.value = false
  }
}
</script>
