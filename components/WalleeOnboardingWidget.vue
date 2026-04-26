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
    <template v-if="status === 'not_started'">
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
    <template v-else-if="status === 'pending'">
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

    <!-- active -->
    <template v-else-if="status === 'active'">
      <p class="text-sm text-gray-600">
        Online-Zahlungen sind aktiv. Deine Kunden können per Kreditkarte, TWINT und weiteren Methoden bezahlen.
      </p>
      <div class="mt-3 flex gap-4 text-sm">
        <a href="https://app-wallee.com" target="_blank"
           class="text-blue-600 hover:underline">Wallee Dashboard öffnen →</a>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const status = ref<'not_started' | 'pending' | 'active'>('not_started')
const showForm = ref(false)
const loading  = ref(false)
const errorMsg = ref('')
const pdfFile  = ref<File | null>(null)

const form = ref({
  company_name: '',
  contact_name: '',
  uid_number:   '',
  iban:         '',
  notes:        '',
})

const statusConfig = computed(() => {
  const configs = {
    not_started: {
      icon: '💳', iconBg: 'bg-gray-100',
      label: 'Nicht eingerichtet',
      badgeClass: 'bg-gray-100 text-gray-600',
    },
    pending: {
      icon: '⏳', iconBg: 'bg-yellow-100',
      label: 'Antrag eingereicht',
      badgeClass: 'bg-yellow-100 text-yellow-700',
    },
    active: {
      icon: '✅', iconBg: 'bg-green-100',
      label: 'Aktiv',
      badgeClass: 'bg-green-100 text-green-700',
    },
  }
  return configs[status.value]
})

onMounted(async () => {
  try {
    const res = await $fetch<{ status: string }>('/api/tenants/wallee-onboarding-status')
    status.value = (res.status as any) || 'not_started'
  } catch {
    // keep default
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
    status.value  = 'pending'
    showForm.value = false
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || 'Fehler beim Einreichen des Antrags'
  } finally {
    loading.value = false
  }
}
</script>
