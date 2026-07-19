<!-- pages/admin/dunning-settings.vue -->
<!-- Mahnwesen: Vorlagen-Editor + Fristen/Gebühren-Einstellungen pro Tenant -->

<template>
  <div class="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">

    <!-- ═══ PAGE HEADER ═══ -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/admin/dunning" class="text-gray-400 hover:text-gray-600" title="Zurück zum Mahnwesen">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </NuxtLink>
          <h1 class="text-xl font-bold text-gray-900">Mahnwesen-Einstellungen</h1>
        </div>
        <p class="text-sm text-gray-500 mt-0.5">Fristen, Gebühren und Vorlagen für Zahlungserinnerungen & Mahnungen</p>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-16 text-gray-400">Lade Einstellungen…</div>

    <template v-else>
      <!-- ═══ FRISTEN & GEBÜHREN ═══ -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-900">Fristen & Gebühren</h2>
            <p class="text-xs text-gray-500 mt-0.5">Ab wie vielen Tagen nach Fälligkeit wird welche Stufe vorgeschlagen?</p>
          </div>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <span class="text-xs font-medium text-gray-600">Mahnwesen aktiv</span>
            <input type="checkbox" v-model="settings.is_enabled" class="sr-only peer">
            <span class="relative w-9 h-5 rounded-full transition-colors" :class="settings.is_enabled ? 'bg-emerald-500' : 'bg-gray-300'" @click="settings.is_enabled = !settings.is_enabled">
              <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" :class="{ 'translate-x-4': settings.is_enabled }"/>
            </span>
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div v-for="(stageCfg, idx) in stageFieldConfig" :key="stageCfg.stage" class="rounded-xl border border-gray-100 p-3.5 space-y-3" :style="{ borderTopColor: stageCfg.color, borderTopWidth: '3px' }">
            <p class="text-xs font-semibold uppercase tracking-wide" :style="{ color: stageCfg.color }">{{ stageCfg.label }}</p>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Ab Tagen überfällig</label>
              <input v-model.number="settings[stageCfg.daysField]" type="number" min="1"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Mahngebühr (CHF)</label>
              <input :value="rappenToChf(settings[stageCfg.feeField])" @input="e => settings[stageCfg.feeField] = chfToRappen((e.target as HTMLInputElement).value)"
                type="number" min="0" step="0.05"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
          </div>
        </div>
        <p v-if="stageOrderWarning" class="text-xs text-red-600 -mt-1">{{ stageOrderWarning }}</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <label class="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" v-model="settings.add_fee_to_invoice_total" class="rounded keep-checkbox">
            <span class="text-sm text-gray-700">Mahngebühr automatisch zum Rechnungsbetrag addieren</span>
          </label>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Neue Zahlungsfrist nach Mahnung (Tage)</label>
            <input v-model.number="settings.new_due_days" type="number" min="1"
              class="w-full sm:w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <label class="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" v-model="settings.apply_interest" class="rounded keep-checkbox">
            <span class="text-sm text-gray-700">Verzugszins in Mahnungen ausweisen</span>
          </label>
          <div v-if="settings.apply_interest">
            <label class="block text-xs text-gray-500 mb-1">Verzugszins (% p.a.)</label>
            <input v-model.number="settings.interest_rate_percent" type="number" min="0" step="0.1"
              class="w-full sm:w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-1">
          <span v-if="settingsSavedMsg" class="text-xs text-emerald-600">{{ settingsSavedMsg }}</span>
          <button :disabled="isSavingSettings || !!stageOrderWarning" @click="saveSettings"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
            :style="{ background: primaryColor }">
            {{ isSavingSettings ? 'Speichern…' : 'Einstellungen speichern' }}
          </button>
        </div>
      </div>

      <!-- ═══ VORLAGEN ═══ -->
      <div class="space-y-4">
        <h2 class="text-sm font-semibold text-gray-900 px-1">Vorlagen</h2>

        <div v-for="tpl in templates" :key="tpl.stage" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100" :style="{ background: stageColorLight(tpl.stage) }">
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full" :style="{ background: stageColor(tpl.stage) }"></span>
              <h3 class="text-sm font-semibold text-gray-900">{{ tpl.label }}</h3>
              <span v-if="!tpl.is_custom" class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Standard</span>
              <span v-else class="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Angepasst</span>
            </div>
            <div class="flex items-center gap-2">
              <button v-if="tpl.is_custom" @click="resetTemplate(tpl)" class="text-xs text-gray-500 hover:text-gray-700 underline">Standard wiederherstellen</button>
              <button @click="tpl.showPreview = !tpl.showPreview" class="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600">
                {{ tpl.showPreview ? 'Vorschau ausblenden' : 'Vorschau' }}
              </button>
            </div>
          </div>

          <div class="p-5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="sm:col-span-1">
                <label class="block text-xs font-medium text-gray-500 mb-1">Name (intern)</label>
                <input v-model="tpl.name" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-gray-500 mb-1">E-Mail-Betreff</label>
                <input v-model="tpl.subject" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-xs font-medium text-gray-500">Text</label>
              </div>
              <textarea
                :ref="el => setBodyRef(el as HTMLTextAreaElement, tpl.stage)"
                v-model="tpl.body"
                rows="9"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono"
              />
              <div class="flex flex-wrap gap-1.5 mt-2">
                <button v-for="ph in placeholderHelp" :key="ph.key" type="button"
                  @click="insertPlaceholder(tpl.stage, ph.key)"
                  :title="ph.label"
                  class="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] px-1.5 py-0.5 rounded font-mono transition-colors">
                  {{ '{' + ph.key + '}' }}
                </button>
              </div>
            </div>

            <!-- Live-Vorschau mit Musterdaten -->
            <div v-if="tpl.showPreview" class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Vorschau mit Musterdaten</p>
              <p class="text-sm font-semibold text-gray-800 mb-2">{{ renderSample(tpl.subject) }}</p>
              <p class="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{{ renderSample(tpl.body) }}</p>
            </div>

            <div class="flex items-center justify-end gap-3">
              <span v-if="tpl.savedMsg" class="text-xs text-emerald-600">{{ tpl.savedMsg }}</span>
              <button :disabled="tpl.isSaving" @click="saveTemplate(tpl)"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                :style="{ background: stageColor(tpl.stage) }">
                {{ tpl.isSaving ? 'Speichern…' : 'Vorlage speichern' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const { primaryColor } = useTenantBranding()

const isLoading = ref(true)
const isSavingSettings = ref(false)
const settingsSavedMsg = ref('')

const settings = reactive<any>({
  is_enabled: true,
  reminder_after_days: 10,
  first_dunning_after_days: 20,
  second_dunning_after_days: 30,
  reminder_fee_rappen: 0,
  first_dunning_fee_rappen: 2000,
  second_dunning_fee_rappen: 4000,
  add_fee_to_invoice_total: true,
  apply_interest: false,
  interest_rate_percent: 5,
  new_due_days: 10,
})

const stageFieldConfig = [
  { stage: 1, label: 'Zahlungserinnerung', daysField: 'reminder_after_days', feeField: 'reminder_fee_rappen', color: '#2563eb' },
  { stage: 2, label: '1. Mahnung', daysField: 'first_dunning_after_days', feeField: 'first_dunning_fee_rappen', color: '#d97706' },
  { stage: 3, label: '2. / letzte Mahnung', daysField: 'second_dunning_after_days', feeField: 'second_dunning_fee_rappen', color: '#dc2626' },
]

const stageOrderWarning = computed(() => {
  if (settings.reminder_after_days >= settings.first_dunning_after_days || settings.first_dunning_after_days >= settings.second_dunning_after_days) {
    return 'Die Fristen müssen aufsteigend sein: Erinnerung < 1. Mahnung < 2. Mahnung'
  }
  return ''
})

function stageColor(stage: number) {
  return stageFieldConfig.find(s => s.stage === stage)?.color || '#2563eb'
}
function stageColorLight(stage: number) {
  const c = stageColor(stage)
  return c + '0d'
}

function rappenToChf(rappen: number): string {
  return ((rappen || 0) / 100).toFixed(2)
}
function chfToRappen(value: string): number {
  return Math.round((parseFloat(value) || 0) * 100)
}

const loadSettings = async () => {
  try {
    const data = await $fetch<any>('/api/admin/dunning-settings')
    Object.assign(settings, data)
  } catch (e) {
    console.error('Fehler beim Laden der Mahnwesen-Einstellungen:', e)
  }
}

const saveSettings = async () => {
  isSavingSettings.value = true
  settingsSavedMsg.value = ''
  try {
    await $fetch('/api/admin/dunning-settings', { method: 'POST', body: { ...settings } })
    settingsSavedMsg.value = 'Gespeichert ✓'
    setTimeout(() => (settingsSavedMsg.value = ''), 2500)
  } catch (e: any) {
    console.error('Fehler beim Speichern:', e)
    settingsSavedMsg.value = e?.data?.statusMessage || 'Fehler beim Speichern'
  } finally {
    isSavingSettings.value = false
  }
}

// ── Vorlagen ──
const templates = ref<any[]>([])
const bodyRefs: Record<number, HTMLTextAreaElement | null> = {}
function setBodyRef(el: HTMLTextAreaElement | null, stage: number) {
  bodyRefs[stage] = el
}

const placeholderHelp = [
  { key: 'kunde_name', label: 'Name des Kunden' },
  { key: 'rechnungsnummer', label: 'Rechnungsnummer' },
  { key: 'rechnungsdatum', label: 'Rechnungsdatum' },
  { key: 'faelligkeitsdatum', label: 'Ursprüngliches Fälligkeitsdatum' },
  { key: 'offener_betrag', label: 'Noch offener Betrag' },
  { key: 'ueberfaellige_tage', label: 'Anzahl Tage überfällig' },
  { key: 'mahngebuehr', label: 'Mahngebühr dieser Stufe' },
  { key: 'verzugszins', label: 'Verzugszins' },
  { key: 'gesamtbetrag_mit_gebuehr', label: 'Offener Betrag + Gebühr + Zins' },
  { key: 'neues_zahlungsziel', label: 'Neue Zahlungsfrist' },
  { key: 'absender_name', label: 'Name Absender' },
  { key: 'firma_name', label: 'Firmenname' },
]

const sampleData: Record<string, string> = {
  kunde_name: 'Max Muster',
  rechnungsnummer: '2026-000123',
  rechnungsdatum: '01.06.2026',
  faelligkeitsdatum: '01.07.2026',
  offener_betrag: 'CHF 450.00',
  ueberfaellige_tage: '14',
  mahngebuehr: 'CHF 20.00',
  verzugszins: 'CHF 3.15',
  gesamtbetrag_mit_gebuehr: 'CHF 473.15',
  neues_zahlungsziel: '15.07.2026',
  absender_name: 'Anna Muster',
  firma_name: 'Fahrschule Muster AG',
}

function renderSample(text: string): string {
  let out = text || ''
  for (const key in sampleData) {
    out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), sampleData[key])
  }
  return out
}

function insertPlaceholder(stage: number, key: string) {
  const tpl = templates.value.find(t => t.stage === stage)
  const el = bodyRefs[stage]
  const placeholder = `{${key}}`
  if (!tpl) return
  if (!el) {
    tpl.body = (tpl.body || '') + placeholder
    return
  }
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const current = tpl.body || ''
  tpl.body = current.slice(0, start) + placeholder + current.slice(end)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + placeholder.length, start + placeholder.length)
  })
}

const loadTemplates = async () => {
  try {
    const data = await $fetch<any[]>('/api/admin/dunning-templates')
    templates.value = data.map(t => ({ ...t, showPreview: false, isSaving: false, savedMsg: '' }))
  } catch (e) {
    console.error('Fehler beim Laden der Mahnvorlagen:', e)
  }
}

async function saveTemplate(tpl: any) {
  tpl.isSaving = true
  tpl.savedMsg = ''
  try {
    const res = await $fetch<any>('/api/admin/dunning-templates', {
      method: 'POST',
      body: { stage: tpl.stage, language: tpl.language, name: tpl.name, subject: tpl.subject, body: tpl.body }
    })
    tpl.id = res.id
    tpl.is_custom = true
    tpl.savedMsg = 'Gespeichert ✓'
    setTimeout(() => (tpl.savedMsg = ''), 2500)
  } catch (e: any) {
    console.error('Fehler beim Speichern der Vorlage:', e)
    tpl.savedMsg = e?.data?.statusMessage || 'Fehler beim Speichern'
  } finally {
    tpl.isSaving = false
  }
}

async function resetTemplate(tpl: any) {
  if (!confirm(`"${tpl.label}" wirklich auf den Standardtext zurücksetzen?`)) return
  try {
    await $fetch('/api/admin/dunning-templates/reset', { method: 'POST', body: { stage: tpl.stage, language: tpl.language } })
    await loadTemplates()
  } catch (e) {
    console.error('Fehler beim Zurücksetzen:', e)
  }
}

onMounted(async () => {
  isLoading.value = true
  await Promise.all([loadSettings(), loadTemplates()])
  isLoading.value = false
})
</script>
