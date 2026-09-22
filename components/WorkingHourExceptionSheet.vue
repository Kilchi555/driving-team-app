<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  MAX_EXCEPTION_DATES,
  zurichTodayCivilDate,
  type ExceptionDayInput,
} from '~/utils/effective-working-hours'

const props = defineProps<{
  visible: boolean
  staffId: string
  date: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

interface DayDraft {
  date: string
  isClosed: boolean
  blocks: Array<{ start_time: string; end_time: string }>
  existed: boolean
}

const days = ref<DayDraft[]>([])
const multi = ref(false)
const rangeEnd = ref('')
const errorMessage = ref('')
const saving = ref(false)
const loading = ref(false)

const today = computed(() => zurichTodayCivilDate())

watch(() => [props.visible, props.date, props.staffId] as const, async ([visible, date, staffId]) => {
  if (!visible || !date || !staffId) return
  multi.value = false
  rangeEnd.value = date
  errorMessage.value = ''
  await loadDays([date])
})

async function loadDays(dates: string[]) {
  loading.value = true
  errorMessage.value = ''
  try {
    const startDate = dates[0]
    const endDate = dates[dates.length - 1]
    const response = await $fetch<{
      success: boolean
      exceptions: Array<{ date: string; isClosed: boolean; blocks: Array<{ start_time: string; end_time: string }> }>
    }>('/api/staff/working-hour-exceptions', {
      method: 'POST',
      body: { action: 'list', staffId: props.staffId, startDate, endDate },
    })
    const byDate = new Map((response.exceptions || []).map((row) => [row.date, row]))
    const template = days.value[0]
    days.value = dates.map((date) => {
      const existing = byDate.get(date)
      if (existing) {
        return {
          date,
          isClosed: existing.isClosed,
          blocks: existing.blocks.length > 0
            ? existing.blocks.map((block) => ({ ...block }))
            : [{ start_time: '08:00', end_time: '12:00' }],
          existed: true,
        }
      }
      return {
        date,
        isClosed: template ? template.isClosed : false,
        blocks: template
          ? template.blocks.map((block) => ({ ...block }))
          : [{ start_time: '08:00', end_time: '12:00' }],
        existed: false,
      }
    })
  } catch (error: any) {
    errorMessage.value = error?.statusMessage || error?.data?.statusMessage || 'Laden fehlgeschlagen'
  } finally {
    loading.value = false
  }
}

function addBlock(day: DayDraft) {
  day.isClosed = false
  day.blocks.push({ start_time: '13:00', end_time: '17:00' })
}

function removeBlock(day: DayDraft, index: number) {
  day.blocks.splice(index, 1)
  if (day.blocks.length === 0) {
    day.blocks.push({ start_time: '08:00', end_time: '12:00' })
  }
}

function civilDatesInclusive(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${start}T12:00:00Z`)
  const last = new Date(`${end}T12:00:00Z`)
  while (cursor.getTime() <= last.getTime() && dates.length <= MAX_EXCEPTION_DATES) {
    const year = cursor.getUTCFullYear()
    const month = String(cursor.getUTCMonth() + 1).padStart(2, '0')
    const day = String(cursor.getUTCDate()).padStart(2, '0')
    dates.push(`${year}-${month}-${day}`)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

async function applyRange() {
  errorMessage.value = ''
  const start = days.value[0]?.date || props.date
  const end = rangeEnd.value
  if (!start || !end || end < start) {
    errorMessage.value = 'Enddatum liegt vor dem Startdatum'
    return
  }
  const dates = civilDatesInclusive(start, end)
  if (dates.length > MAX_EXCEPTION_DATES) {
    errorMessage.value = `Maximal ${MAX_EXCEPTION_DATES} Tage`
    return
  }
  await loadDays(dates)
}

function payload(): ExceptionDayInput[] {
  return days.value.map((day) => ({
    date: day.date,
    isClosed: day.isClosed,
    blocks: day.isClosed ? [] : day.blocks.map((block) => ({ ...block })),
  }))
}

async function save() {
  if (!props.staffId || days.value.length === 0) return
  saving.value = true
  errorMessage.value = ''
  try {
    const daysPayload = payload()
    if (daysPayload.length === 1) {
      const day = daysPayload[0]
      await $fetch('/api/staff/working-hour-exceptions', {
        method: 'POST',
        body: {
          action: 'upsert',
          staffId: props.staffId,
          date: day.date,
          isClosed: day.isClosed,
          blocks: day.blocks,
        },
      })
    } else {
      await $fetch('/api/staff/working-hour-exceptions', {
        method: 'POST',
        body: {
          action: 'upsert_many',
          staffId: props.staffId,
          days: daysPayload,
        },
      })
    }
    emit('saved')
  } catch (error: any) {
    errorMessage.value = error?.statusMessage || error?.data?.statusMessage || 'Speichern fehlgeschlagen'
  } finally {
    saving.value = false
  }
}

async function removeException() {
  const day = days.value[0]
  if (!day?.existed || days.value.length !== 1) return
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/staff/working-hour-exceptions', {
      method: 'POST',
      body: { action: 'delete', staffId: props.staffId, date: day.date },
    })
    emit('saved')
  } catch (error: any) {
    errorMessage.value = error?.statusMessage || error?.data?.statusMessage || 'Löschen fehlgeschlagen'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-[520] bg-black/50 flex items-end md:items-center justify-center" @click.self="emit('close')">
    <div class="bg-white rounded-t-3xl md:rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" @click.stop>
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Abweichende Arbeitszeit</h2>
        <button type="button" class="w-8 h-8 bg-gray-100 rounded-full text-gray-500" @click="emit('close')">×</button>
      </div>

      <div class="px-5 py-4 overflow-y-auto flex-1 space-y-4">
        <p class="text-sm text-gray-500">
          Die Ausnahme ersetzt die Wochenarbeitszeit nur an den gewählten Tagen. Bestehende Termine bleiben.
          Standort-Zeitfenster gelten weiterhin.
        </p>

        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input v-model="multi" type="checkbox">
          Auf mehrere Tage anwenden
        </label>

        <div v-if="multi" class="flex items-end gap-2">
          <label class="flex-1 text-xs text-gray-500">
            Bis
            <input v-model="rangeEnd" type="date" :min="days[0]?.date || today" class="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm">
          </label>
          <button type="button" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg" @click="applyRange">
            Tage laden
          </button>
        </div>

        <p v-if="loading" class="text-sm text-gray-500">Laden…</p>

        <div v-for="day in days" :key="day.date" class="border border-gray-200 rounded-lg p-3 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-gray-800">{{ day.date }}</p>
            <label class="flex items-center gap-2 text-sm text-gray-700">
              <input v-model="day.isClosed" type="checkbox">
              Tag schliessen
            </label>
          </div>

          <div v-if="!day.isClosed" class="space-y-2">
            <div v-for="(block, index) in day.blocks" :key="index" class="flex items-center gap-2">
              <label class="flex-1 text-xs text-gray-500">
                Von
                <input v-model="block.start_time" type="time" class="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm">
              </label>
              <label class="flex-1 text-xs text-gray-500">
                Bis
                <input v-model="block.end_time" type="time" class="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm">
              </label>
              <button type="button" class="text-sm text-red-600 pt-4" @click="removeBlock(day, index)">✕</button>
            </div>
            <button type="button" class="w-full py-2 text-sm border border-dashed border-gray-300 rounded-lg text-gray-600" @click="addBlock(day)">
              + Block hinzufügen
            </button>
          </div>
        </div>

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
      </div>

      <div class="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
        <button
          v-if="days.length === 1 && days[0].existed"
          type="button"
          class="text-sm text-gray-600"
          :disabled="saving"
          @click="removeException"
        >
          Exception entfernen
        </button>
        <span v-else />
        <button
          type="button"
          class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 disabled:opacity-50"
          :disabled="saving || loading || days.length === 0"
          @click="save"
        >
          Speichern
        </button>
      </div>
    </div>
  </div>
</template>
