<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
    @click.self="close"
  >
    <div class="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3" :style="{ background: `${primaryColor}10` }">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">
            {{ focusTeilLabel || 'Kurstermin' }}
          </p>
          <h3 class="text-base font-bold text-gray-900 truncate">
            {{ course?.name || appointmentTitle || 'Kurs' }}
          </h3>
          <p v-if="appointmentTimeLabel" class="text-xs text-gray-500 mt-1">{{ appointmentTimeLabel }}</p>
        </div>
        <button
          type="button"
          class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors flex-shrink-0"
          aria-label="Schliessen"
          @click="close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="px-5 py-3 border-b border-gray-50 flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Teilnehmer
          <span class="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-gray-200 text-gray-600 text-xs font-bold">
            {{ participants.length }}
          </span>
        </span>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
          :style="{ background: primaryColor }"
          :disabled="isLoading || allParticipants.length === 0"
          title="Kurs-Teilnehmerliste (alle Teile) als PDF"
          @click="downloadPdf"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          PDF / Druck
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-5 py-4">
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-16 gap-3">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-gray-200" :style="{ borderTopColor: primaryColor }" />
          <p class="text-sm text-gray-500">Teilnehmer werden geladen…</p>
        </div>

        <div v-else-if="error" class="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {{ error }}
        </div>

        <div v-else-if="participants.length === 0" class="flex flex-col items-center justify-center py-14 text-center">
          <div class="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p class="text-sm font-medium text-gray-900 mb-1">Keine Teilnehmer</p>
          <p class="text-xs text-gray-400">
            {{ filteredBySession
              ? 'Für diesen Kursteil sind keine Teilnehmer angemeldet.'
              : 'Für diesen Kurs sind noch keine Anmeldungen vorhanden.' }}
          </p>
        </div>

        <ul v-else class="space-y-2">
          <li
            v-for="p in participants"
            :key="p.id"
            class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5 flex items-center gap-3"
          >
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              :style="{ background: primaryColor }"
            >
              {{ initials(p) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-gray-900 truncate">{{ p.first_name }} {{ p.last_name }}</span>
                <span :class="statusBadge(p.status)" class="px-2 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0">
                  {{ statusText(p.status) }}
                </span>
                <span
                  v-if="p.partial_label"
                  class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0"
                >
                  {{ p.partial_label }}
                </span>
              </div>
              <div class="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                <span v-if="p.phone" class="truncate">{{ p.phone }}</span>
                <span v-if="p.email" class="truncate hidden sm:inline">{{ p.email }}</span>
              </div>
            </div>
          </li>
        </ul>

        <div v-if="!isLoading && focusSessions.length" class="mt-5 pt-4 border-t border-gray-100">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
            {{ filteredBySession ? 'Dieser Termin' : 'Kursteile' }}
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="s in focusSessions"
              :key="s.id || s.teil"
              class="inline-flex text-[11px] px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-700"
            >
              {{ sessionLabel(s) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { formatCourseSessionLine } from '~/utils/format-course-sessions'
import { printParticipantList } from '~/utils/print-participant-list'

const props = defineProps<{
  isVisible: boolean
  appointmentId?: string | null
  courseId?: string | null
  appointmentTitle?: string | null
  appointmentStart?: string | null
  appointmentEnd?: string | null
}>()

const emit = defineEmits<{ close: [] }>()

const { primaryColor, brandName, getLogo } = useTenantBranding()

const isLoading = ref(false)
const error = ref<string | null>(null)
const course = ref<any>(null)
const participants = ref<any[]>([])
const allParticipants = ref<any[]>([])
const focusSessions = ref<any[]>([])
const filteredBySession = ref(false)

const focusTeilLabel = computed(() => {
  if (!filteredBySession.value || !focusSessions.value.length) return ''
  const teils = [...new Set(focusSessions.value.map((s: any) => s.teil).filter(Boolean))]
  if (teils.length === 1) return `Teil ${teils[0]}`
  if (teils.length > 1) return `Teil ${teils.join(' + ')}`
  return ''
})

const appointmentTimeLabel = computed(() => {
  if (!props.appointmentStart) return ''
  const start = new Date(props.appointmentStart)
  const end = props.appointmentEnd ? new Date(props.appointmentEnd) : null
  const date = start.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const tStart = start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  const tEnd = end
    ? end.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
    : ''
  return tEnd ? `${date}, ${tStart}–${tEnd}` : `${date}, ${tStart}`
})

function initials(p: any) {
  return `${(p.first_name?.[0] || '').toUpperCase()}${(p.last_name?.[0] || '').toUpperCase()}` || '?'
}

function statusBadge(status: string) {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800'
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'waitlist': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function statusText(status: string) {
  switch (status) {
    case 'confirmed': return 'Bestätigt'
    case 'pending': return 'Ausstehend'
    case 'waitlist': return 'Warteliste'
    default: return status || '—'
  }
}

function sessionLabel(s: any) {
  return formatCourseSessionLine(
    {
      session_number: s.teil ?? s.session_number,
      start_time: s.start_time,
      end_time: s.end_time,
    },
    (s.teil ?? 1) - 1,
  )
}

async function loadRoster() {
  if (!props.appointmentId && !props.courseId) {
    error.value = 'Kein Kurs verknüpft'
    return
  }

  isLoading.value = true
  error.value = null
  course.value = null
  participants.value = []
  allParticipants.value = []
  focusSessions.value = []
  filteredBySession.value = false

  try {
    const params = new URLSearchParams()
    if (props.appointmentId) params.set('appointmentId', props.appointmentId)
    else if (props.courseId) params.set('courseId', props.courseId)

    const data = await $fetch<any>(`/api/courses/roster?${params.toString()}`)
    course.value = data.course
    participants.value = data.participants || []
    allParticipants.value = data.all_participants?.length
      ? data.all_participants
      : (data.participants || [])
    focusSessions.value = data.focus_sessions?.length
      ? data.focus_sessions
      : (data.course?.course_sessions || [])
    filteredBySession.value = !!data.filtered_by_session
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Teilnehmer konnten nicht geladen werden'
  } finally {
    isLoading.value = false
  }
}

function downloadPdf() {
  // Same PDF as admin: whole course, all Teile, all participants
  // Partial/individual attendance is marked per signature column in the print util.
  const pdfParticipants = allParticipants.value.length
    ? allParticipants.value
    : participants.value
  if (!course.value || pdfParticipants.length === 0) return

  printParticipantList({
    course: course.value,
    participants: pdfParticipants,
    brand: {
      color: primaryColor.value,
      tenant: brandName.value || 'Unternehmen',
      logoUrl: getLogo('header') || getLogo('square') || '',
    },
  })
}

function close() {
  emit('close')
}

watch(
  () => [props.isVisible, props.appointmentId, props.courseId] as const,
  ([visible]) => {
    if (visible) loadRoster()
  },
)
</script>
