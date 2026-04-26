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
        Für die Aktivierung benötigen wir einmalig einige Firmeninformationen.
      </p>
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm text-blue-800">
        <strong>Was du brauchst:</strong>
        <ul class="mt-2 list-disc list-inside space-y-1">
          <li>UID-Nummer (CHE-xxx.xxx.xxx)</li>
          <li>IBAN deines Geschäftskontos</li>
          <li>Handelsregisterauszug (PDF, optional)</li>
        </ul>
        <p class="mt-2 text-xs text-blue-600">Bearbeitungszeit: 2–5 Werktage</p>
      </div>

      <button @click="showForm = true" v-if="!showForm"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
        Online-Zahlungen beantragen →
      </button>

      <!-- Application form -->
      <form v-if="showForm" @submit.prevent="submitRequest" class="space-y-4 border-t pt-5">
        <h3 class="font-medium text-gray-900">Antrag einreichen</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
            <input v-model="form.company_name" type="text" required
                   class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kontaktperson</label>
            <input v-model="form.contact_name" type="text"
                   class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">UID-Nummer *</label>
            <input v-model="form.uid_number" type="text" required placeholder="CHE-xxx.xxx.xxx"
                   class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">IBAN Geschäftskonto *</label>
            <input v-model="form.iban" type="text" required placeholder="CH56 0483 5012 3456 7800 9"
                   class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Handelsregisterauszug (PDF, optional)</label>
          <input type="file" accept="application/pdf" @change="onFileChange"
                 class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          <p class="text-xs text-gray-500 mt-1">Maximal 10 MB</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Anmerkungen (optional)</label>
          <textarea v-model="form.notes" rows="3" placeholder="Besonderheiten, Fragen..."
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>

        <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>

        <div class="flex gap-3">
          <button type="submit" :disabled="loading"
                  class="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            {{ loading ? 'Wird eingereicht...' : 'Antrag absenden' }}
          </button>
          <button type="button" @click="showForm = false"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Abbrechen
          </button>
        </div>
      </form>
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const onboardingStatus = ref<'not_started' | 'pending' | 'active'>('not_started')
const walleeEnabled    = ref(false)
const showForm         = ref(false)
const loading          = ref(false)
const errorMsg         = ref('')
const pdfFile          = ref<File | null>(null)
const toggleLoading    = ref(false)
const toggleError      = ref('')
const toggleSuccess    = ref('')

const form = ref({
  company_name: '',
  contact_name: '',
  uid_number:   '',
  iban:         '',
  notes:        '',
})

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

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  pdfFile.value = input.files?.[0] || null
}

const submitRequest = async () => {
  loading.value  = true
  errorMsg.value = ''
  try {
    const fd = new FormData()
    fd.append('company_name', form.value.company_name)
    fd.append('contact_name', form.value.contact_name)
    fd.append('uid_number',   form.value.uid_number)
    fd.append('iban',         form.value.iban)
    fd.append('notes',        form.value.notes)
    if (pdfFile.value) fd.append('handelsregister', pdfFile.value)

    await $fetch('/api/tenants/wallee-onboarding-request', { method: 'POST', body: fd })
    onboardingStatus.value = 'pending'
    showForm.value = false
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || 'Fehler beim Einreichen des Antrags'
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
