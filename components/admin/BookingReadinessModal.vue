<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="booking-readiness-title"
  >
    <button
      type="button"
      class="absolute inset-0 bg-black/40"
      aria-label="Schliessen"
      @click="$emit('close')"
    />

    <div class="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
      <div class="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4">
        <div>
          <h2 id="booking-readiness-title" class="text-base font-bold text-gray-900">
            Online-Buchung prüfen
          </h2>
          <p class="mt-0.5 text-xs text-gray-500">
            Derselbe Slot-Pfad wie die öffentliche Buchungsseite
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          @click="$emit('close')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="px-5 py-4 space-y-4">
        <div
          v-if="loading"
          class="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
        >
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          Live-Probe läuft (Init → Locations/Staff → get-available-slots, 28 Tage)…
        </div>

        <div
          v-else-if="error"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {{ error }}
        </div>

        <template v-else-if="result">
          <!-- Result banner -->
          <div
            class="rounded-xl px-4 py-3 text-sm font-medium"
            :class="result.ready
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
              : 'bg-amber-50 text-amber-900 border border-amber-100'"
          >
            <template v-if="result.ready">
              ✓ Buchungsseite würde Termine anzeigen
              <span class="font-normal">
                — {{ result.slotsFound }}+ freie Slot(s) in den nächsten {{ result.daysChecked }} Tagen
              </span>
            </template>
            <template v-else-if="!result.allowOnlineBooking">
              ✗ Direktbuchung ist aus — Kunden sehen nur das Anfrageformular
              <span v-if="result.slotsFound > 0" class="font-normal">
                (Slots wären vorhanden)
              </span>
            </template>
            <template v-else>
              ✗ Buchungsseite fände aktuell keine freien Termine
            </template>
          </div>

          <!-- Checks -->
          <div class="space-y-2">
            <div
              v-for="check in result.checks"
              :key="check.id"
              class="flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm"
              :class="check.done ? 'bg-emerald-50/60 text-emerald-900' : 'bg-gray-50 text-gray-700'"
            >
              <div
                class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                :class="check.done ? 'bg-emerald-100' : 'bg-white border-2 border-gray-200'"
              >
                <svg v-if="check.done" class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium">{{ check.label }}</p>
                <p v-if="check.detail" class="text-xs mt-0.5 opacity-80">{{ check.detail }}</p>
              </div>
              <NuxtLink
                v-if="!check.done && check.href && check.href.startsWith('/')"
                :to="check.href"
                class="text-xs font-semibold text-blue-600 hover:underline flex-shrink-0"
                @click="$emit('close')"
              >
                Öffnen
              </NuxtLink>
            </div>
          </div>

          <!-- Probe details -->
          <div v-if="result.probe?.category_code" class="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600 space-y-1">
            <p class="font-semibold text-gray-800">Probe-Parameter (wie Buchungsseite)</p>
            <p>
              {{ result.probe.source === 'event_type' ? 'Terminart' : 'Kategorie' }}:
              <strong>{{ result.probe.category_code }}</strong>
              · {{ result.probe.duration_minutes }} Min.
            </p>
            <p v-if="result.probe.staff_name">
              {{ result.probe.staff_name }} @ {{ result.probe.location_name }}
            </p>
            <p>
              {{ result.probe.start_date }} → {{ result.probe.end_date }}
              · {{ result.probe.pairs_found }} Staff×Ort
              · {{ result.probe.tried_combinations }} Slot-Abfrage(n)
            </p>
          </div>

          <!-- Sample slots -->
          <div v-if="result.sampleSlots?.length" class="space-y-1.5">
            <p class="text-xs font-semibold text-gray-700 uppercase tracking-wide">Beispiel-Termine</p>
            <div
              v-for="(slot, i) in result.sampleSlots"
              :key="i"
              class="rounded-lg border border-gray-100 px-3 py-2 text-xs text-gray-700 flex justify-between gap-2"
            >
              <span>{{ formatSlot(slot.start_time) }}</span>
              <span class="text-gray-400">{{ slot.duration_minutes }} Min. · {{ slot.category_code }}</span>
            </div>
          </div>

          <div v-if="result.blockers?.length && !result.ready" class="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3">
            <p class="text-xs font-semibold text-amber-900 mb-1">Blocker</p>
            <ul class="text-xs text-amber-800 space-y-1 list-disc pl-4">
              <li v-for="(b, i) in result.blockers" :key="i">{{ b }}</li>
            </ul>
          </div>
        </template>
      </div>

      <div class="sticky bottom-0 border-t border-gray-100 bg-white px-5 py-4 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          class="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          :disabled="loading"
          @click="load"
        >
          Erneut prüfen
        </button>
        <a
          v-if="bookingHref"
          :href="bookingHref"
          target="_blank"
          rel="noopener"
          class="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white text-center hover:bg-blue-700"
        >
          Buchungsseite öffnen
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; updated: [ready: boolean] }>()

interface ReadinessResult {
  ready: boolean
  allowOnlineBooking: boolean
  slotsFound: number
  daysChecked: number
  bookingUrl: string | null
  blockers: string[]
  checks: Array<{
    id: string
    label: string
    done: boolean
    href: string | null
    detail?: string | null
  }>
  probe: {
    category_code: string | null
    duration_minutes: number | null
    staff_id: string | null
    staff_name: string | null
    location_id: string | null
    location_name: string | null
    start_date: string
    end_date: string
    source: 'category' | 'event_type' | null
    tried_combinations: number
    pairs_found: number
  }
  sampleSlots: Array<{
    start_time: string
    duration_minutes: number
    category_code: string
  }>
}

const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<ReadinessResult | null>(null)

const bookingHref = computed(() => {
  if (!result.value?.bookingUrl) return null
  if (result.value.bookingUrl.startsWith('http')) return result.value.bookingUrl
  if (import.meta.client) return `${window.location.origin}${result.value.bookingUrl}`
  return result.value.bookingUrl
})

const formatSlot = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zurich',
    })
  } catch {
    return iso
  }
}

const load = async () => {
  loading.value = true
  error.value = null
  try {
    const { getSupabase } = await import('~/utils/supabase')
    const { data: { session } } = await getSupabase().auth.getSession()
    if (!session?.access_token) throw new Error('Nicht eingeloggt')

    const data = await $fetch<ReadinessResult & { success: boolean }>('/api/admin/booking-readiness', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    result.value = data
    emit('updated', !!data.ready)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Probe fehlgeschlagen'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) load()
  },
)
</script>
