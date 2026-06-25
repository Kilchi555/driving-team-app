<template>
  <div class="bg-white rounded-lg shadow-sm border p-6">
    <div class="flex items-center gap-3 mb-5">
      <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
        </svg>
      </div>
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Online-Zahlungen (Wallee)</h2>
        <p class="text-sm text-gray-500">Kreditkarte, TWINT und mehr für deine Kunden</p>
      </div>
      <div class="ml-auto">
        <span v-if="status === 'active'" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Aktiv
        </span>
        <span v-else-if="status === 'pending'" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> In Bearbeitung
        </span>
        <span v-else-if="status === 'pending_uid'" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
          <span class="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span> UID ausstehend
        </span>
        <span v-else class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
          <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Nicht eingerichtet
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-8 text-center text-sm text-gray-400">Laden…</div>

    <!-- ACTIVE -->
    <div v-else-if="status === 'active'" class="space-y-4">
      <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
        ✅ Online-Zahlungen sind aktiv. Deine Kunden können jetzt per Kreditkarte, TWINT und weiteren Methoden bezahlen. Ab heute wird die Abrechnung gestartet.
      </div>
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p class="text-sm font-medium text-gray-900">Online-Zahlungen aktiviert</p>
          <p class="text-xs text-gray-500 mt-0.5">Deaktivieren um vorübergehend keine Online-Zahlungen anzunehmen</p>
        </div>
        <button
          @click="toggleWallee"
          :disabled="toggling"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
          :class="enabled ? 'bg-green-500' : 'bg-gray-300'"
        >
          <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
            :class="enabled ? 'translate-x-6' : 'translate-x-1'"></span>
        </button>
      </div>
    </div>

    <!-- PENDING UID -->
    <div v-else-if="status === 'pending_uid'" class="space-y-3">
      <div class="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p class="text-sm font-semibold text-orange-800 mb-1">📋 Antrag eingereicht — UID fehlt noch</p>
        <p class="text-sm text-orange-700">
          Wir haben deinen Antrag erhalten. Um fortzufahren, benötigst du eine <strong>UID-Nummer</strong> (Unternehmens-Identifikationsnummer).
          Falls dein Betrieb noch nicht im Handelsregister eingetragen ist, übernimmt <strong>Simy bis zu CHF 80.–</strong> der anfallenden Kosten.
        </p>
        <p class="text-xs text-orange-600 mt-2">
          Trage deine UID unten ein sobald du sie hast, oder wende dich an
          <a href="mailto:info@simy.ch" class="underline font-medium">info@simy.ch</a> für Unterstützung.
        </p>
      </div>
      <!-- Allow submitting UID later -->
      <form @submit.prevent="submitUidUpdate" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">UID-Nummer nachreichen</label>
          <input v-model="form.uidNumber" type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            placeholder="CHE-123.456.789" />
        </div>
        <button type="submit" :disabled="submitting || !form.uidNumber"
          class="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors">
          {{ submitting ? 'Wird gespeichert…' : 'UID einreichen' }}
        </button>
      </form>
      <p class="text-xs text-gray-400 text-center">Bei Fragen: <a href="mailto:info@simy.ch" class="underline">info@simy.ch</a></p>
    </div>

    <!-- PENDING -->
    <div v-else-if="status === 'pending'" class="space-y-3">
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p class="text-sm font-semibold text-amber-800 mb-1">⏳ Antrag eingereicht</p>
        <p class="text-sm text-amber-700">Wir richten dein Wallee-Konto ein. Das dauert in der Regel <strong>ca. 5 Werktage</strong>. Du erhältst eine E-Mail sobald alles bereit ist. Die Abrechnung startet erst ab diesem Zeitpunkt.</p>
        <p v-if="appliedAt" class="text-xs text-amber-600 mt-2">Eingereicht am {{ formatDate(appliedAt) }}</p>
      </div>
      <p class="text-xs text-gray-400 text-center">Bei Fragen: <a href="mailto:info@simy.ch" class="underline">info@simy.ch</a></p>
    </div>

    <!-- NOT STARTED → Application Form -->
    <div v-else class="space-y-4">
      <p class="text-sm text-gray-600">
        Fülle das Formular aus um Online-Zahlungen zu aktivieren. Wir richten dein Wallee-Konto innerhalb von 2–5 Werktagen ein.
      </p>

      <!-- UID fehlt → Hinweis auf Einzelfirma-Eintragung -->
      <div v-if="!hasUid" class="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
        <p class="text-sm font-semibold text-blue-800">ℹ️ Keine UID-Nummer hinterlegt</p>
        <p class="text-sm text-blue-700">
          Für Online-Zahlungen ist eine UID-Nummer (Unternehmens-Identifikationsnummer) erforderlich.
          Falls dein Betrieb noch nicht im Handelsregister eingetragen ist, übernimmt <strong>Simy bis zu CHF 80.–</strong> der anfallenden Kosten für die Eintragung als Einzelfirma.
        </p>
        <p class="text-xs text-blue-600">
          Die Kosten entstehen erst nach einer erfolgreich abgeschlossenen Eintragung — es entstehen dir keine Vorauskosten.
          Trage deine UID ein sobald du sie hast, oder wende dich an <a href="mailto:info@simy.ch" class="underline font-medium">info@simy.ch</a> für Unterstützung.
        </p>
      </div>

      <div v-if="submitError" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        {{ submitError }}
      </div>

      <form @submit.prevent="submitApplication" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Company Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
            <input v-model="form.companyName" type="text" required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Fahrschule Muster GmbH" />
          </div>
          <!-- Contact Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kontaktperson</label>
            <input v-model="form.contactName" type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Max Muster" />
          </div>
          <!-- UID Number (optional) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">UID-Nummer <span class="text-gray-400 font-normal">(optional)</span></label>
            <input v-model="form.uidNumber" type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="CHE-123.456.789" />
            <p class="text-xs text-gray-400 mt-1">Ohne UID wird der Antrag vorgemerkt — du wirst informiert wie du eine UID beantragst.</p>
          </div>
          <!-- IBAN -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">IBAN *</label>
            <input v-model="form.iban" type="text" required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="CH56 0483 5012 3456 7800 9" />
            <p class="text-xs text-gray-400 mt-1">Konto für Auszahlungen</p>
          </div>
        </div>

        <!-- Handelsregister PDF -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Handelsregisterauszug (PDF, optional)</label>
          <div
            class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
            @click="($refs.pdfInput as HTMLInputElement)?.click()"
          >
            <input ref="pdfInput" type="file" accept=".pdf" class="hidden" @change="onPdfSelect" />
            <p v-if="form.pdfFile" class="text-sm text-blue-600 font-medium">📄 {{ form.pdfFile.name }}</p>
            <p v-else class="text-sm text-gray-400">PDF hier ablegen oder klicken zum Hochladen (max. 10 MB)</p>
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bemerkungen (optional)</label>
          <textarea v-model="form.notes" rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Besondere Hinweise, Fragen, etc."></textarea>
        </div>

        <button type="submit" :disabled="submitting"
          class="w-full py-3 px-6 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {{ submitting ? 'Wird gesendet…' : 'Antrag einreichen' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)
const status = ref<'not_started' | 'pending_uid' | 'pending' | 'active'>('not_started')
const enabled = ref(false)
const appliedAt = ref<string | null>(null)
const submitting = ref(false)
const toggling = ref(false)
const submitError = ref('')
const hasUid = ref(true)

const form = ref({
  companyName: '',
  contactName: '',
  uidNumber: '',
  iban: '',
  notes: '',
  pdfFile: null as File | null,
})

const onPdfSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) form.value.pdfFile = file
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })

onMounted(async () => {
  try {
    const data = await $fetch<{ status: string; enabled: boolean; appliedAt: string | null; uidNumber: string | null }>(
      '/api/tenants/wallee-onboarding-status'
    )
    status.value = (data.status as any) || 'not_started'
    if (data.uidNumber) form.value.uidNumber = data.uidNumber
    enabled.value = data.enabled
    appliedAt.value = data.appliedAt
    hasUid.value = !!data.uidNumber?.trim()
    if (data.uidNumber) form.value.uidNumber = data.uidNumber
  } catch {
    status.value = 'not_started'
  } finally {
    loading.value = false
  }
})

const submitUidUpdate = async () => {
  submitting.value = true
  submitError.value = ''
  try {
    const fd = new FormData()
    fd.append('uid_number', form.value.uidNumber)
    fd.append('uid_update_only', 'true')
    await $fetch('/api/tenants/wallee-onboarding-request', { method: 'POST', body: fd })
    status.value = 'pending'
  } catch (e: any) {
    submitError.value = e?.data?.statusMessage || e?.message || 'Fehler beim Einreichen der UID'
  } finally {
    submitting.value = false
  }
}

const submitApplication = async () => {
  submitting.value = true
  submitError.value = ''
  try {
    const fd = new FormData()
    fd.append('company_name', form.value.companyName)
    fd.append('contact_name', form.value.contactName)
    fd.append('uid_number', form.value.uidNumber)
    fd.append('iban', form.value.iban)
    fd.append('notes', form.value.notes)
    if (form.value.pdfFile) fd.append('handelsregister', form.value.pdfFile)

    await $fetch('/api/tenants/wallee-onboarding-request', { method: 'POST', body: fd })
    status.value = 'pending'
    appliedAt.value = new Date().toISOString()
  } catch (e: any) {
    submitError.value = e?.data?.statusMessage || e?.message || 'Fehler beim Einreichen des Antrags'
  } finally {
    submitting.value = false
  }
}

const toggleWallee = async () => {
  toggling.value = true
  try {
    await $fetch('/api/tenants/wallee-toggle', { method: 'POST', body: { enabled: !enabled.value } })
    enabled.value = !enabled.value
  } catch (e: any) {
    console.error('Wallee toggle failed:', e)
  } finally {
    toggling.value = false
  }
}
</script>
