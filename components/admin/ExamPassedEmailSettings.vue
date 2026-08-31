<template>
  <div class="max-w-3xl space-y-5">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">E-Mails nach bestandener Prüfung</h2>
      <p class="text-sm text-gray-500 mt-1">
        Steuere, welche Mails rausgehen, nach wie vielen Tagen, und passe Betreff sowie den persönlichen Text an.
        Logo, Farbe, Review-Buttons und Affiliate-Links bleiben automatisch vom Betrieb.
      </p>
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-sm text-gray-500 py-8">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      Einstellungen werden geladen…
    </div>

    <template v-else>
      <article
        v-for="mail in mailCards"
        :key="mail.key"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div class="px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-800">{{ mail.title }}</h3>
            <p class="text-xs text-gray-400 mt-0.5">{{ mail.hint }}</p>
          </div>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0"
            :style="settings[mail.enabledKey] ? primaryBg : { background: '#e5e7eb' }"
            @click="settings[mail.enabledKey] = !settings[mail.enabledKey]"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="settings[mail.enabledKey] ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <div v-if="settings[mail.enabledKey]" class="px-5 py-4 border-t border-gray-50 space-y-4">
          <p v-if="mail.warning" class="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {{ mail.warning }}
          </p>

          <div v-if="mail.daysKey" class="max-w-[12rem]">
            <label class="block text-xs font-medium text-gray-600 mb-1">Versand nach (Tage)</label>
            <input
              v-model.number="settings[mail.daysKey]"
              type="number"
              :min="mail.daysMin"
              :max="mail.daysMax"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Betreff</label>
            <input
              v-model="settings[mail.subjectKey]"
              type="text"
              maxlength="140"
              :placeholder="defaults[mail.defaultSubjectKey]"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Eigener Text</label>
            <textarea
              v-model="settings[mail.bodyKey]"
              rows="4"
              maxlength="1000"
              :placeholder="defaults[mail.defaultBodyKey]"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm leading-relaxed"
            />
            <p class="text-xs text-gray-400 mt-1">
              Leer lassen = Standardtext. Platzhalter: <code class="bg-gray-100 px-1 rounded">{firstName}</code>
              <code class="bg-gray-100 px-1 rounded">{tenantName}</code>
            </p>
          </div>
        </div>
      </article>

      <div class="flex items-center justify-end gap-3">
        <p v-if="savedAt" class="text-xs text-gray-400">Gespeichert {{ savedAt }}</p>
        <button
          type="button"
          :disabled="saving"
          class="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
          :style="primaryBg"
          @click="save"
        >
          {{ saving ? 'Speichern…' : 'Speichern' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'

const { primaryColor } = useTenantBranding()
const { showSuccess, showError } = useUIStore()

const loading = ref(true)
const saving = ref(false)
const savedAt = ref('')
const settings = reactive({
  congratulationsEnabled: true,
  reviewFollowupEnabled: true,
  reviewFollowupDays: 7,
  affiliatePromoEnabled: true,
  affiliatePromoDays: 30,
  congratulationsSubject: '',
  congratulationsBody: '',
  reviewFollowupSubject: '',
  reviewFollowupBody: '',
  affiliatePromoSubject: '',
  affiliatePromoBody: '',
})
const defaults = ref({
  congratulationsSubject: 'Herzlichen Glückwunsch – Prüfung bestanden!',
  congratulationsBody: '',
  reviewFollowupSubject: '',
  reviewFollowupBody: '',
  affiliatePromoSubject: '',
  affiliatePromoBody: '',
})
const capabilities = ref({ reviewPlaces: 0, affiliateEnabled: false })

const primaryBg = computed(() => ({ background: primaryColor.value || '#2563eb' }))

const mailCards = computed(() => [
  {
    key: 'mail1',
    title: 'Glückwunsch (sofort)',
    hint: 'Geht direkt nach dem Eintragen von «bestanden» raus.',
    enabledKey: 'congratulationsEnabled' as const,
    subjectKey: 'congratulationsSubject' as const,
    bodyKey: 'congratulationsBody' as const,
    defaultSubjectKey: 'congratulationsSubject' as const,
    defaultBodyKey: 'congratulationsBody' as const,
    warning: '',
  },
  {
    key: 'mail2',
    title: 'Review-Erinnerung',
    hint: 'Nur wenn Google-Bewertungslinks hinterlegt sind.',
    enabledKey: 'reviewFollowupEnabled' as const,
    daysKey: 'reviewFollowupDays' as const,
    daysMin: 1,
    daysMax: 90,
    subjectKey: 'reviewFollowupSubject' as const,
    bodyKey: 'reviewFollowupBody' as const,
    defaultSubjectKey: 'reviewFollowupSubject' as const,
    defaultBodyKey: 'reviewFollowupBody' as const,
    warning: capabilities.value.reviewPlaces === 0
      ? 'Keine Google-Places hinterlegt – diese Mail wird auch eingeschaltet nicht versendet.'
      : '',
  },
  {
    key: 'mail3',
    title: 'Affiliate-Empfehlung',
    hint: 'Nur wenn das Affiliate-System aktiv und nicht pausiert ist.',
    enabledKey: 'affiliatePromoEnabled' as const,
    daysKey: 'affiliatePromoDays' as const,
    daysMin: 1,
    daysMax: 180,
    subjectKey: 'affiliatePromoSubject' as const,
    bodyKey: 'affiliatePromoBody' as const,
    defaultSubjectKey: 'affiliatePromoSubject' as const,
    defaultBodyKey: 'affiliatePromoBody' as const,
    warning: capabilities.value.affiliateEnabled
      ? ''
      : 'Affiliate ist aus oder nicht im Abo – diese Mail wird auch eingeschaltet nicht versendet.',
  },
])

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{
      settings: typeof settings
      defaults: typeof defaults.value
      capabilities: { reviewPlaces: number; affiliateEnabled: boolean }
    }>('/api/admin/exam-passed-emails')
    Object.assign(settings, res.settings)
    defaults.value = res.defaults
    capabilities.value = res.capabilities
  } catch (error: any) {
    showError(error?.data?.statusMessage || error?.message || 'Einstellungen konnten nicht geladen werden')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await $fetch('/api/admin/exam-passed-emails', { method: 'POST', body: { ...settings } })
    savedAt.value = new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
    showSuccess('Prüfungs-Mails gespeichert')
  } catch (error: any) {
    showError(error?.data?.statusMessage || error?.message || 'Speichern fehlgeschlagen')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
