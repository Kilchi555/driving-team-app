<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ExceptionInputError,
  validateExceptionDays,
  zurichTodayCivilDate,
  civilDayOfWeek,
} from '~/utils/effective-working-hours'
import {
  civilDatesForWeekday,
  draftBlocksForStoredException,
  exceptionCountLabel,
  exceptionRowLabel,
  exceptionsForWeekday,
  formatExceptionDateLabel,
  indexExceptionsByDate,
  modeFromStoredException,
  planExceptionSave,
  resolveExceptionOpenDate,
  weekdayLabel,
  type ExceptionUiMode,
  type ListedWorkingHourException,
} from '~/utils/working-hour-exception-entry'

const props = defineProps<{
  visible: boolean
  staffId: string
  staffName?: string
  initialDate: string
  listedExceptions?: ListedWorkingHourException[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

interface DayDraft {
  date: string
  mode: ExceptionUiMode
  blocks: Array<{ uid: number; start_time: string; end_time: string }>
  existed: boolean
}

let blockUid = 0

function withIds(blocks: Array<{ start_time: string; end_time: string }>): DayDraft['blocks'] {
  return blocks.map((block) => ({
    uid: ++blockUid,
    start_time: block.start_time,
    end_time: block.end_time,
  }))
}

const days = ref<DayDraft[]>([])
const startDate = ref('')
const multi = ref(false)
const rangeEnd = ref('')
const errorMessage = ref('')
const saving = ref(false)
const loading = ref(false)
let loadToken = 0

const today = computed(() => zurichTodayCivilDate())
const startLabel = computed(() => {
  try {
    return formatExceptionDateLabel(startDate.value)
  } catch {
    return ''
  }
})
const startWeekdayLabel = computed(() => {
  try {
    return weekdayLabel(civilDayOfWeek(startDate.value))
  } catch {
    return ''
  }
})
const savedOnWeekday = computed(() => {
  const date = startDate.value || props.initialDate
  if (!date) return []
  try {
    return exceptionsForWeekday(props.listedExceptions || [], civilDayOfWeek(date))
  } catch {
    return []
  }
})
const savedOnWeekdayLabel = computed(() => {
  const label = exceptionCountLabel(savedOnWeekday.value.length)
  return label ? `${label} an diesem Wochentag` : ''
})
const savePlan = computed(() => planExceptionSave(days.value))
const willWrite = computed(() => savePlan.value.deletes.length + savePlan.value.upserts.length > 0)
const restoreLabel = computed(() => savePlan.value.upserts.length === 0 && savePlan.value.deletes.length > 0)
const confirmRestore = ref(false)
const restoreDatesLabel = computed(() => savePlan.value.deletes
  .map((date) => {
    try {
      return formatExceptionDateLabel(date)
    } catch {
      return date
    }
  })
  .join(', '))

watch(() => [props.visible, props.initialDate, props.staffId] as const, async ([visible, date, staffId], previous) => {
  if (!visible || !date || !staffId) return
  const becameVisible = !previous || !previous[0]
  if (!becameVisible && previous && previous[1] === date && previous[2] === staffId) return
  const openDate = resolveExceptionOpenDate(date, startDate.value, today.value)
  startDate.value = openDate
  multi.value = false
  rangeEnd.value = openDate
  errorMessage.value = ''
  await loadDays([openDate], false)
})

async function loadDays(dates: string[], useTemplate: boolean) {
  const token = ++loadToken
  loading.value = true
  errorMessage.value = ''
  const template = useTemplate ? days.value[0] : undefined
  try {
    const start = dates[0]
    const end = dates[dates.length - 1]
    const response = await $fetch<{
      success: boolean
      exceptions: Array<{ date: string; isClosed: boolean; blocks: Array<{ start_time: string; end_time: string }> }>
    }>('/api/staff/working-hour-exceptions', {
      method: 'POST',
      body: { action: 'list', staffId: props.staffId, startDate: start, endDate: end },
    })
    if (token !== loadToken) return
    const byDate = indexExceptionsByDate(response.exceptions || [])
    days.value = dates.map((date) => {
      const existing = byDate.get(date)
      if (existing) {
        return {
          date,
          mode: modeFromStoredException(existing),
          blocks: withIds(draftBlocksForStoredException(existing)),
          existed: true,
        }
      }
      return {
        date,
        mode: template?.mode || 'normal',
        blocks: withIds(template
          ? template.blocks.map((block) => ({ start_time: block.start_time, end_time: block.end_time }))
          : [{ start_time: '08:00', end_time: '12:00' }]),
        existed: false,
      }
    })
  } catch (error: any) {
    if (token !== loadToken) return
    errorMessage.value = error?.statusMessage || error?.data?.statusMessage || 'Laden fehlgeschlagen'
  } finally {
    if (token === loadToken) loading.value = false
  }
}

async function onStartDateChange() {
  multi.value = false
  rangeEnd.value = startDate.value
  if (!startDate.value) return
  await loadDays([startDate.value], false)
}

async function selectSavedDate(date: string) {
  startDate.value = date
  multi.value = false
  rangeEnd.value = date
  errorMessage.value = ''
  await loadDays([date], false)
}

function onModeChange(day: DayDraft) {
  if (day.mode === 'custom' && day.blocks.length === 0) {
    day.blocks.push({ uid: ++blockUid, start_time: '08:00', end_time: '12:00' })
  }
}

function addBlock(day: DayDraft) {
  day.mode = 'custom'
  day.blocks.push({ uid: ++blockUid, start_time: '13:00', end_time: '17:00' })
}

function removeBlock(day: DayDraft, index: number) {
  day.blocks.splice(index, 1)
  if (day.blocks.length === 0) {
    day.blocks.push({ uid: ++blockUid, start_time: '08:00', end_time: '12:00' })
  }
}

async function applyRange() {
  errorMessage.value = ''
  const start = startDate.value
  const end = rangeEnd.value
  if (!start || !end || end < start) {
    errorMessage.value = 'Das Enddatum liegt vor dem Startdatum.'
    return
  }
  try {
    const dates = civilDatesForWeekday(start, end, civilDayOfWeek(start))
    if (dates.length < 1) {
      errorMessage.value = 'In diesem Zeitraum liegt kein passender Wochentag.'
      return
    }
    await loadDays(dates, true)
  } catch (error: unknown) {
    errorMessage.value = germanMessage(error)
  }
}

function requestSave() {
  if (!props.staffId || days.value.length === 0 || saving.value || loading.value) return
  if (multi.value && rangeEnd.value > startDate.value && days.value.length < 2) {
    errorMessage.value = 'Bitte «Tage laden», bevor die Ausnahme für mehrere Tage gespeichert wird.'
    return
  }
  const plan = planExceptionSave(days.value)
  if (plan.deletes.length === 0 && plan.upserts.length === 0) return
  if (plan.deletes.length > 0) {
    confirmRestore.value = true
    return
  }
  void persist(plan)
}

function cancelRestore() {
  confirmRestore.value = false
}

async function save() {
  if (!props.staffId || days.value.length === 0 || saving.value || loading.value) return
  if (multi.value && rangeEnd.value > startDate.value && days.value.length < 2) {
    errorMessage.value = 'Bitte «Tage laden», bevor die Ausnahme für mehrere Tage gespeichert wird.'
    return
  }
  const plan = planExceptionSave(days.value)
  if (plan.deletes.length === 0 && plan.upserts.length === 0) return
  confirmRestore.value = false
  await persist(plan)
}

async function persist(plan: ReturnType<typeof planExceptionSave>) {
  const overlap = plan.deletes.filter((date) => plan.upserts.some((day) => day.date === date))
  if (overlap.length > 0) {
    errorMessage.value = 'Ein Tag kann nicht gleichzeitig ersetzt und gelöscht werden.'
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    if (plan.upserts.length > 0) {
      const validated = validateExceptionDays(plan.upserts)
      if (validated.length === 1) {
        const day = validated[0]
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
            days: validated,
          },
        })
      }
    }
    for (const date of plan.deletes) {
      await $fetch('/api/staff/working-hour-exceptions', {
        method: 'POST',
        body: { action: 'delete', staffId: props.staffId, date },
      })
    }
    emit('saved')
  } catch (error: unknown) {
    errorMessage.value = germanMessage(error)
  } finally {
    saving.value = false
  }
}

function germanMessage(error: unknown): string {
  if (error instanceof ExceptionInputError) {
    const known: Record<string, string> = {
      'start_time must be before end_time': 'Die Startzeit muss vor der Endzeit liegen.',
      'Intervals overlap': 'Die Arbeitszeiten überlappen sich.',
      'Invalid time': 'Bitte gültige Zeiten eingeben.',
      'Open exception requires at least one block': 'Bitte mindestens einen Arbeitszeitblock angeben.',
      'Date is before today in Europe/Zurich': 'Das Datum liegt vor dem heutigen Tag.',
      'Too many dates': 'Zu viele Tage ausgewählt.',
      'Too many blocks': 'Zu viele Arbeitszeitblöcke.',
      'CLOSED exception cannot include blocks': 'Ein geschlossener Tag hat keine Arbeitszeitblöcke.',
    }
    return known[error.message] || 'Die Arbeitszeit ist ungültig.'
  }
  const fetchError = error as { statusMessage?: string; data?: { statusMessage?: string } }
  return fetchError?.statusMessage || fetchError?.data?.statusMessage || 'Speichern fehlgeschlagen'
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-[560] bg-black/50 flex items-end md:items-center justify-center"
      data-testid="working-hour-exception-sheet"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-t-3xl md:rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" role="dialog" aria-modal="true" aria-labelledby="working-hour-exception-title" @click.stop>
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 id="working-hour-exception-title" class="text-base font-semibold text-gray-900">Arbeitszeit-Ausnahme</h2>
          <button type="button" class="w-8 h-8 bg-gray-100 rounded-full text-gray-500" aria-label="Schliessen" @click="emit('close')">×</button>
        </div>

        <div class="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          <p v-if="staffName" class="text-sm text-gray-700">
            Mitarbeiter: <span class="font-medium text-gray-900">{{ staffName }}</span>
          </p>
          <p class="text-sm text-gray-500">
            Ohne Ausnahme gilt der normale Wochenplan. Eine eigene Arbeitszeit oder ein geschlossener Tag gilt nur am gewählten Datum. Bestehende Termine bleiben.
          </p>

          <label class="block text-sm text-gray-700" for="exception-start-date">
            Datum
            <input
              id="exception-start-date"
              v-model="startDate"
              type="date"
              :min="today"
              class="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              @change="onStartDateChange"
            >
          </label>
          <p v-if="startLabel" class="text-sm font-medium text-gray-900">{{ startLabel }}</p>

          <div v-if="savedOnWeekday.length > 0" class="space-y-1" data-testid="weekday-saved-exceptions">
            <p class="text-xs text-gray-500">{{ savedOnWeekdayLabel }}</p>
            <button
              v-for="row in savedOnWeekday"
              :key="row.date"
              type="button"
              class="block w-full text-left text-xs rounded-lg border px-2 py-1.5"
              :class="row.date === startDate ? 'border-gray-900 bg-gray-50 text-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
              :data-testid="`saved-exception-${row.date}`"
              @click="selectSavedDate(row.date)"
            >
              {{ exceptionRowLabel(row) }}
            </button>
          </div>

          <p v-if="loading" class="text-sm text-gray-500">Laden…</p>

          <div v-else class="space-y-3">
            <div v-for="day in days" :key="day.date" class="border border-gray-200 rounded-lg p-3 space-y-3">
              <p v-if="days.length > 1" class="text-sm font-medium text-gray-800">{{ formatExceptionDateLabel(day.date) }}</p>
              <fieldset class="space-y-2">
                <legend class="text-sm font-medium text-gray-800 mb-2">Was gilt an diesem Tag?</legend>
                <label class="flex items-start gap-2 text-sm text-gray-800">
                  <input v-model="day.mode" class="mt-1" type="radio" :name="`exception-mode-${day.date}`" value="normal" @change="onModeChange(day)">
                  <span>Normale Arbeitszeit</span>
                </label>
                <p class="text-xs text-gray-500 pl-6">An diesem Datum gelten die normalen Arbeitszeiten dieses Wochentags.</p>

                <label class="flex items-start gap-2 text-sm text-gray-800">
                  <input v-model="day.mode" class="mt-1" type="radio" :name="`exception-mode-${day.date}`" value="custom" @change="onModeChange(day)">
                  <span>Eigene Arbeitszeit</span>
                </label>
                <p class="text-xs text-gray-500 pl-6">An diesem Datum gelten andere Arbeitszeiten.</p>

                <label class="flex items-start gap-2 text-sm text-gray-800">
                  <input v-model="day.mode" class="mt-1" type="radio" :name="`exception-mode-${day.date}`" value="closed" @change="onModeChange(day)">
                  <span>Ganzer Tag geschlossen</span>
                </label>
                <p class="text-xs text-gray-500 pl-6">An diesem Datum findet keine Arbeitszeit statt.</p>
              </fieldset>

              <div v-if="day.mode === 'custom'" class="space-y-2">
                <div v-for="(block, index) in day.blocks" :key="block.uid" class="flex items-end gap-2" data-testid="exception-interval">
                  <label class="flex-1 text-xs text-gray-500">
                    Von
                    <input v-model="block.start_time" type="time" class="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm">
                  </label>
                  <label class="flex-1 text-xs text-gray-500">
                    Bis
                    <input v-model="block.end_time" type="time" class="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm">
                  </label>
                  <button type="button" class="text-sm text-red-600 px-2 py-1" :aria-label="`Block ${index + 1} entfernen`" @click="removeBlock(day, index)">✕</button>
                </div>
                <button type="button" class="w-full py-2 text-sm border border-dashed border-gray-300 rounded-lg text-gray-600" @click="addBlock(day)">
                  + Block hinzufügen
                </button>
              </div>
            </div>
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input v-model="multi" type="checkbox">
            Auf mehrere Tage anwenden
          </label>

          <div v-if="multi" class="space-y-2">
            <p class="text-xs text-gray-500">
              In diesem Zeitraum wird nur der Wochentag {{ startWeekdayLabel || 'des Startdatums' }} gespeichert. Andere Wochentage bleiben beim Wochenplan.
            </p>
            <div class="flex items-end gap-2">
              <label class="flex-1 text-xs text-gray-500" for="exception-range-end">
                Bis
                <input id="exception-range-end" v-model="rangeEnd" type="date" :min="startDate || today" class="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm">
              </label>
              <button type="button" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg" @click="applyRange">
                Tage laden
              </button>
            </div>
          </div>

          <p v-if="!loading && !willWrite && !errorMessage" class="text-xs text-gray-500">Keine Ausnahme gespeichert. Es gilt der Wochenplan.</p>
          <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
        </div>

        <div class="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 disabled:opacity-50"
            :disabled="saving || loading || days.length === 0 || !willWrite"
            @click="requestSave"
          >
            {{ restoreLabel ? 'Normale Arbeitszeit wiederherstellen' : 'Speichern' }}
          </button>
        </div>
      </div>

      <div
        v-if="confirmRestore"
        class="fixed inset-0 z-[570] bg-black/50 flex items-end md:items-center justify-center p-4"
        data-testid="working-hour-exception-restore-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="working-hour-exception-restore-title"
      >
        <div class="bg-white rounded-t-3xl md:rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
          <h3 id="working-hour-exception-restore-title" class="text-base font-semibold text-gray-900">Ausnahme löschen</h3>
          <p class="text-sm text-gray-700">
            Diese Ausnahme wird gelöscht. Danach gelten wieder die normalen Wochenarbeitszeiten.
          </p>
          <p v-if="restoreDatesLabel" class="text-sm text-gray-500">{{ restoreDatesLabel }}</p>
          <p class="text-xs text-gray-500">Der Wochenplan selbst bleibt unverändert.</p>
          <div class="flex items-center justify-end gap-3">
            <button type="button" class="px-4 py-2 rounded-lg text-sm border border-gray-300" @click="cancelRestore">
              Abbrechen
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 disabled:opacity-50"
              data-testid="confirm-restore-weekly-hours"
              :disabled="saving"
              @click="save"
            >
              Ausnahme löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
