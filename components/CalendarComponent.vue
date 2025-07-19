<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import EventModal from './EventModal.vue'
import { getSupabase } from '~/utils/supabase'
import ConfirmationDialog from './ConfirmationDialog.vue'
import { useAppointmentStatus } from '~/composables/useAppointmentStatus'
import MoveAppointmentModal from './MoveAppointmentModal.vue'




// Neue refs für Confirmation Dialog
const showConfirmation = ref(false)
const confirmationData = ref({
  title: '',
  message: '',
  details: '',
  icon: '',
  type: 'warning' as 'success' | 'warning' | 'danger',
  confirmText: 'Bestätigen',
  cancelText: 'Abbrechen'
})
const pendingAction = ref<(() => Promise<void>) | null>(null)
const showMoveModal = ref(false)
const selectedAppointmentToMove = ref<CalendarAppointment | null>(null)


// Helper-Funktion für Confirmation Dialog
const showConfirmDialog = (options: {
  title: string
  message: string
  details?: string
  icon?: string
  type?: 'success' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
  action: () => Promise<void>
}) => {
  confirmationData.value = {
    title: options.title,
    message: options.message,
    details: options.details || '',
    icon: options.icon || '❓',
    type: options.type || 'warning',
    confirmText: options.confirmText || 'Bestätigen',
    cancelText: options.cancelText || 'Abbrechen'
  }
  pendingAction.value = options.action
  showConfirmation.value = true
}

// CalendarComponent.vue - Einfache Toast-Alternative

const showToast = (message: string) => {
  // Einfache Browser-Benachrichtigung
  if (message.includes('✅')) {
    alert('✅ ' + message.replace('✅ ', ''))
  } else if (message.includes('❌')) {
    alert('❌ ' + message.replace('❌ ', ''))
  } else {
    alert(message)
  }
}

// Confirmation handlers
const handleConfirmAction = async () => {
  if (pendingAction.value) {
    await pendingAction.value()
  }
  showConfirmation.value = false
  pendingAction.value = null
}

const handleCancelAction = () => {
  showConfirmation.value = false
  pendingAction.value = null
}

const openMoveModal = (appointment: CalendarAppointment) => {
  selectedAppointmentToMove.value = appointment
  showMoveModal.value = true
}

const { updateOverdueAppointments } = useAppointmentStatus()


const calendar = ref()
const supabase = getSupabase()

interface Props {
  currentUser?: any
}

const props = defineProps<Props>()

const isModalVisible = ref(false)
const modalEventData = ref<any>(null)
const modalMode = ref<'view' | 'edit' | 'create'>('create')

const handleAppointmentMoved = async (moveData: MoveData) => {
  console.log('✅ Appointment moved:', moveData)
  
  try {
    // Kalender neu laden
    await loadAppointments()
    
    // Success Toast
    showToast('✅ Termin erfolgreich verschoben')
  } catch (error) {
    console.error('❌ Error reloading calendar:', error)
    showToast('❌ Fehler beim Aktualisieren des Kalenders')
  }
}


type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay?: boolean
  extendedProps?: {
    location?: string
    staff_note?: string
    client_note?: string
    category?: string
    instructor?: string
    student?: string
    price?: number
    user_id?: string
    staff_id?: string
    location_id?: string
    duration_minutes?: number
    price_per_minute?: number
    status?: string
    is_paid?: boolean
    appointment_type?: string
    is_team_invite?: boolean
    original_type?: string
  }
}

interface MoveData {
  appointmentId: string
  newStart: string
  newEnd: string
}

interface CalendarAppointment {
  id: string
  title: string
  start: Date | string
  end: Date | string
  extendedProps?: {
    student?: string
    location?: string
    user_name?: string
    duration_minutes?: number
    [key: string]: any
  }
}

const calendarEvents = ref<CalendarEvent[]>([])
const isLoadingEvents = ref(false)

const emit = defineEmits(['view-updated', 'appointment-changed'])

const loadStaffMeetings = async () => {
  console.log('🔄 Loading staff meetings...')
  try {
    const supabase = getSupabase()
    let query = supabase
      .from('staff_meetings')
      .select(`
        *,
        staff:staff_id(first_name, last_name),
        location:location_id(name, address)
      `)
      .eq('staff_id', props.currentUser?.id) // Nur eigene Meetings
      .order('start_time')

    const { data: meetings, error } = await query

    console.log('📊 Raw staff meetings from DB:', meetings?.length || 0)
    if (error) throw error

    // Convert zu Calendar Events Format
    const convertedMeetings = (meetings || []).map((meeting) => ({
      id: meeting.id,
      title: meeting.title || 'Staff Meeting',
      start: meeting.start_time,
      end: meeting.end_time,
      allDay: false,
      extendedProps: {
        location: meeting.location?.name || 'Kein Ort',
        description: meeting.description || '',
        category: meeting.event_type_code,
        staff_id: meeting.staff_id,
        location_id: meeting.location_id,
        duration_minutes: meeting.duration_minutes,
        status: meeting.status,
        // Markiere als Staff Meeting
        isStaffMeeting: true,
        eventType: 'staff_meeting'
      }
    }))

    console.log('✅ Staff meetings loaded:', convertedMeetings.length)
    return convertedMeetings

  } catch (error) {
    console.error('❌ Error loading staff meetings:', error)
    return []
  }
}

// Kombiniere beide Datenquellen in loadAppointments
const loadAppointments = async () => {
  isLoadingEvents.value = true
  try {
    console.log('🔄 Loading all calendar events...')
    
    // Parallel laden
    const [appointments, staffMeetings] = await Promise.all([
      loadRegularAppointments(), // Deine bestehende Logik umbenennen
      loadStaffMeetings()
    ])

    // Kombinieren
    const allEvents = [...appointments, ...staffMeetings]
    calendarEvents.value = allEvents

    console.log('✅ Final calendar summary:', {
      appointments: appointments.length,
      staffMeetings: staffMeetings.length,
      total: allEvents.length
    })

    if (calendar.value?.getApi) {
      const calendarApi = calendar.value.getApi()
      calendarApi.refetchEvents()
    }

  } catch (error) {
    console.error('❌ Error loading calendar events:', error)
  } finally {
    isLoadingEvents.value = false
  }
}

const loadRegularAppointments = async () => {
  isLoadingEvents.value = true
  try {
    console.log('🔄 Loading appointments from Supabase...')
    console.log('👤 Current user:', props.currentUser?.id)
    
    // Erweiterte Abfrage: Eigene Termine UND Team-Einladungen
    let query = supabase
      .from('appointments')
      .select(`
        *,
        user:user_id(first_name, last_name),
        staff:staff_id(first_name, last_name),
        location:location_id(name, address)
      `)
      .or(`staff_id.eq.${props.currentUser?.id}`) // Eigene Termine (als staff_id)
      .order('start_time')
    
    const { data: appointments, error } = await query
    
    console.log('📊 Raw appointments from DB:', appointments?.length || 0)
    
    if (error) throw error
    
    // Filtern: Eigene Termine + echte Team-Einladungen (nicht doppelte)
    const filteredAppointments = (appointments || []).filter((apt) => {
      const isOwnAppointment = apt.staff_id === props.currentUser?.id
      const isTeamInvite = apt.type === 'team_invite'
      
      // Debug-Info
      console.log(`🔍 Filtering appointment "${apt.title}":`, {
        id: apt.id,
        staff_id: apt.staff_id,
        type: apt.type,
        isOwnAppointment,
        isTeamInvite,
        currentUserId: props.currentUser?.id
      })
      
      return isOwnAppointment // Nur eigene Termine
    })
    
    console.log('✅ Filtered appointments:', filteredAppointments.length)
    
    const convertedEvents = filteredAppointments.map((apt) => {
      const isTeamInvite = apt.type === 'team_invite'
      
      const event = {
        id: apt.id,
        title: apt.title || `${apt.user?.first_name || 'Unbekannt'} - ${apt.type || 'Termin'}`,
        start: new Date(apt.start_time).toISOString(), 
        end: new Date(apt.end_time).toISOString(),
        allDay: false,
        extendedProps: {
          location: apt.location?.name || 'Kein Ort',
          staff_note: apt.description || '',
          client_note: '',
          category: apt.type,
          instructor: `${apt.staff?.first_name || ''} ${apt.staff?.last_name || ''}`.trim(),
          student: `${apt.user?.first_name || ''} ${apt.user?.last_name || ''}`.trim(),
          price: (apt.price_per_minute || 0) * (apt.duration_minutes || 45),
          user_id: apt.user_id,
          staff_id: apt.staff_id,
          location_id: apt.location_id,
          duration_minutes: apt.duration_minutes,
          price_per_minute: apt.price_per_minute,
          status: apt.status,
          is_paid: apt.is_paid,
          // WICHTIG: Typ-Informationen für Modal
          appointment_type: apt.type,
          is_team_invite: isTeamInvite,
          original_type: apt.type
        }
      }
      
      console.log('🔍 TIME COMPARISON:', {
        dbStartTime: apt.start_time,
        eventStartTime: event.start,
        parsedDate: new Date(apt.start_time),
        parsedISOString: new Date(apt.start_time).toISOString()
      })
      
      return event
    })
    
    calendarEvents.value = convertedEvents
    
    
    console.log('✅ Final calendar summary:', {
      totalEvents: convertedEvents.length,
      teamInvites: convertedEvents.filter(e => e.extendedProps.is_team_invite).length,
      regularTermine: convertedEvents.filter(e => !e.extendedProps.is_team_invite).length,
      lessons: convertedEvents.filter(e => e.extendedProps.appointment_type === 'lesson').length,
      others: convertedEvents.filter(e => !['lesson', 'team_invite'].includes(e.extendedProps.appointment_type)).length
    })
    
    
    if (calendar.value?.getApi) {
      const calendarApi = calendar.value.getApi()
      calendarApi.refetchEvents()
      console.log('🔄 Calendar events refetched')
    }
    return convertedEvents 

    
  } catch (error) {
    console.error('❌ Error loading appointments:', error)
    return [] 
  } finally {
    isLoadingEvents.value = false
  }
}

const handleMoveError = (error: string) => {
  console.error('❌ Move error:', error)
  showToast('❌ Fehler beim Verschieben: ' + error)
}

const editAppointment = (appointment: CalendarAppointment) => {
  console.log('✏️ Edit appointment:', appointment.id)
  // TODO: Implementiere Edit-Modal
  // emit('edit-appointment', appointment)
  showToast('Edit-Funktion noch nicht implementiert')
}

// Im calendarOptions eventClick ersetzen:
// eventClick: handleEventClick,

const handleSaveEvent = async (eventData: CalendarEvent) => {
  console.log('💾 Event saved, refreshing calendar...')
  
  // View-Position speichern
  const currentDate = calendar.value?.getApi()?.getDate()
  
  // Daten neu laden
  await loadAppointments()
  await loadStaffMeetings()
  
  // View-Position wiederherstellen falls nötig
  if (currentDate && calendar.value?.getApi) {
    calendar.value.getApi().gotoDate(currentDate)
    console.log('✅ View position preserved:', currentDate)
  }
  
  emit('appointment-changed', { type: 'saved', data: eventData })
  isModalVisible.value = false
}

// CalendarComponent.vue - Erweiterte handleEventDrop Funktion
// Debug-Version um die richtigen Selektoren zu finden
const updateModalFieldsIfOpen = (event: any) => {
  console.log('🔍 Debugging modal inputs...')
  
  // Verschiedene Selektoren ausprobieren
  const dateInputs = document.querySelectorAll('input[type="date"]')
  const timeInputs = document.querySelectorAll('input[type="time"]')
  const allInputs = document.querySelectorAll('input')
  
  console.log('📊 Found inputs:', {
    dateInputs: dateInputs.length,
    timeInputs: timeInputs.length,
    allInputs: allInputs.length
  })
  
  // Alle Input-Elemente loggen um die richtigen zu finden
  allInputs.forEach((input, index) => {
    console.log(`Input ${index}:`, {
      type: input.type,
      id: input.id,
      name: input.name,
      className: input.className,
      value: input.value,
      placeholder: input.placeholder
    })
  })
  
  // Versuchen spezifischere Selektoren basierend auf Ihrem Modal
  const startDateInput = document.querySelector('input[type="date"]') as HTMLInputElement
  const startTimeInput = document.querySelector('input[type="time"]:first-of-type') as HTMLInputElement
  const endTimeInput = document.querySelector('input[type="time"]:last-of-type') as HTMLInputElement
  
}

const eventModalRef = ref()
const isUpdating = ref(false)
const modalEventType = ref<'lesson' | 'staff_meeting'>('lesson')


// Überarbeitete handleEventDrop mit schönem Dialog
const handleEventDrop = async (dropInfo: any) => {
  const newStartTime = new Date(dropInfo.event.start).toLocaleString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const newEndTime = new Date(dropInfo.event.end).toLocaleString('de-CH', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const moveAction = async () => {
    try {
      console.log('✅ User confirmed move, updating database...')
      
      const { error } = await supabase
        .from('appointments')
        .update({
          start_time: dropInfo.event.startStr,
          end_time: dropInfo.event.endStr
        })
        .eq('id', dropInfo.event.id)

      if (error) throw error

      console.log('✅ Appointment moved in database:', dropInfo.event.title)
      
      // Modal aktualisieren falls offen
      if (isModalVisible.value && modalEventData.value?.id === dropInfo.event.id) {
        console.log('📝 Updating modal data...')
        modalEventData.value = {
          ...modalEventData.value,
          start: dropInfo.event.startStr,
          end: dropInfo.event.endStr
        }
      }
      
      // Kalender neu laden
      console.log('🔄 Reloading calendar events...')
        isUpdating.value = true
        await loadAppointments()
        await loadStaffMeetings()
        isUpdating.value = false

      
      console.log(`✅ Termin "${dropInfo.event.title}" erfolgreich verschoben`)
      
    } catch (err: any) {
      console.error('❌ Error moving appointment:', err)
      dropInfo.revert()
      
      // Schöne Fehlermeldung auch mit Dialog
      showConfirmDialog({
        title: 'Fehler beim Verschieben',
        message: 'Der Termin konnte nicht verschoben werden.',
        details: `<strong>Fehler:</strong> ${err?.message || 'Unbekannter Fehler'}<br><br>Der Termin wurde auf die ursprüngliche Zeit zurückgesetzt.`,
        icon: '❌',
        type: 'danger',
        confirmText: 'OK',
        cancelText: '',
        action: async () => {} // Leere Aktion für OK-Button
      })
    }
  }

const studentName = dropInfo.event.extendedProps?.student || 'Unbekannt'
const studentPhone = dropInfo.event.extendedProps?.phone || 'Keine Nummer'

showConfirmDialog({
  title: 'Termin verschieben',
  message: 'Möchten Sie diesen Termin wirklich verschieben?',
  details: `
    <strong>Termin:</strong> ${dropInfo.event.title}<br>
    <strong>Neue Zeit:</strong> ${newStartTime} - ${newEndTime}<br>
    <strong>Fahrschüler:</strong> ${studentName}<br><br>
    
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div class="flex items-center gap-2 mb-2">
        <input type="checkbox" id="sendSms" checked class="rounded border-gray-300">
        <label for="sendSms" class="font-medium text-blue-800">
          📱 SMS-Benachrichtigung senden
        </label>
      </div>
      <div class="text-xs text-blue-600">
        Der Fahrschüler wird über die Terminverschiebung informiert.
      </div>
    </div>
  `,
  icon: '🔄',
  type: 'warning',
  confirmText: 'Verschieben & Benachrichtigen',
  cancelText: 'Abbrechen',
  action: moveAction
})

  // Verschieben erstmal rückgängig machen, wird nur bei Bestätigung durchgeführt
  dropInfo.revert()
}

// Überarbeitete handleEventResize
const handleEventResize = async (resizeInfo: any) => {
  const durationMs = resizeInfo.event.end.getTime() - resizeInfo.event.start.getTime()
  const durationMinutes = Math.round(durationMs / (1000 * 60))

  const resizeAction = async () => {
    try {
      console.log('✅ User confirmed resize, updating database...')
      
      const { error } = await supabase
        .from('appointments')
        .update({
          end_time: resizeInfo.event.endStr,
          duration_minutes: durationMinutes
        })
        .eq('id', resizeInfo.event.id)

      if (error) throw error
      
      console.log('✅ Appointment resized in database:', resizeInfo.event.title)
      
      if (isModalVisible.value && modalEventData.value?.id === resizeInfo.event.id) {
        modalEventData.value = {
          ...modalEventData.value,
          end: resizeInfo.event.endStr
        }
      }
      
      await loadAppointments()
      await loadStaffMeetings()
      
    } catch (err: any) {
      console.error('❌ Error resizing appointment:', err)
      resizeInfo.revert()
      
      showConfirmDialog({
        title: 'Fehler beim Ändern',
        message: 'Die Terminlänge konnte nicht geändert werden.',
        details: `<strong>Fehler:</strong> ${err?.message || 'Unbekannter Fehler'}`,
        icon: '❌',
        type: 'danger',
        confirmText: 'OK',
        cancelText: '',
        action: async () => {}
      })
    }
  }

showConfirmDialog({
  title: 'Terminlänge ändern',
  message: 'Möchten Sie die Terminlänge wirklich ändern?',
  details: `
    <strong>Termin:</strong> ${resizeInfo.event.title}<br>
    <strong>Neue Dauer:</strong> ${durationMinutes} Minuten<br>
    <strong>Fahrschüler:</strong> ${resizeInfo.event.extendedProps?.student || 'Unbekannt'}<br><br>
    
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div class="flex items-center gap-2 mb-2">
        <input type="checkbox" id="sendSmsResize" checked class="rounded border-gray-300">
        <label for="sendSmsResize" class="font-medium text-blue-800">
          📱 SMS über Änderung senden
        </label>
      </div>
      <div class="text-xs text-blue-600">
        Der Fahrschüler wird über die Terminänderung informiert.
      </div>
    </div>
  `,
  icon: '📏',
  type: 'warning',
  confirmText: 'Ändern & Benachrichtigen',
  cancelText: 'Abbrechen',
  action: resizeAction
})

  resizeInfo.revert()
}

  const calendarOptions = ref<CalendarOptions>({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    locale: 'delocale',
    timeZone: 'local',
    
    allDaySlot: false,
    slotMinTime: '05:00:00',
    slotMaxTime: '23:00:00',
    firstDay: 1,
    displayEventTime: true,
    forceEventDuration: true, 
    selectable: true,
    editable: true,
    events: calendarEvents.value,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
  // Klick auf leeren Zeitslot
 dateClick: (arg) => {
  console.log('🔍 FREE SLOT CLICKED:', {
    clickedDate: arg.date,
    clickedISO: arg.date.toISOString()
  })
  
  // ✅ FIX 1: Verwende originale Zeit (keine -2h Korrektur)
  const clickedDate = arg.date
  const endDate = new Date(clickedDate.getTime() + 45 * 60000)
  
  console.log('📅 CREATE MODE: Free slot clicked at', clickedDate.toISOString())
  
  isModalVisible.value = true
  modalMode.value = 'create'
  modalEventData.value = {
    title: '',
    start: clickedDate.toISOString(), 
    end: endDate.toISOString(),
    allDay: arg.allDay,
    
    // ✅ FIX 2: KRITISCH - Markierung für freien Slot
    isFreeslotClick: true,
    clickSource: 'calendar-free-slot',
    
    // ✅ FIX 3: Explizit KEINE Student-Daten
    user_id: null,
    selectedStudentId: null,
    preselectedStudent: null,
    
    extendedProps: {
      location: '',
      staff_note: '',
      client_note: '',
      eventType: 'lesson',
      isNewAppointment: true
    }
  }
  
  console.log('✅ FREE SLOT: Modal opened with clean data (no student preselection)')
},

eventContent: (arg) => {
  const student = arg.event.extendedProps?.student || ''
  const location = arg.event.extendedProps?.location || ''
  
  return {
    html: `
      <div class="custom-event">
        <div class="event-name">${student}</div>
          <div class="event-location"> ${location}</div>
        </div>
      </div>
    `
  }
},

// Klick auf existierenden Termin
eventClick: (clickInfo) => {
  const appointmentData = calendarEvents.value.find(evt => evt.id === clickInfo.event.id)

 // Type Assertion verwenden
  const extendedProps = appointmentData?.extendedProps as any
  
  // Event Type erkennen
  const isStaffMeeting = extendedProps?.eventType === 'staff_meeting' ||
                         extendedProps?.isStaffMeeting === true ||
                         !extendedProps?.student // Kein Student = Staff Meeting
  
  modalEventType.value = isStaffMeeting ? 'staff_meeting' : 'lesson'
  
  isModalVisible.value = true
  modalMode.value = 'edit'
  modalEventData.value = appointmentData
},

// Ziehen/Auswählen von Zeitbereich
select: (arg) => {
  isModalVisible.value = true
  modalMode.value = 'create'
  modalEventData.value = {
    title: '',
    start: arg.start,
    end: arg.end,
    allDay: arg.allDay
  }
},
  
  // DEBUG: Callback um zu sehen ob Events verarbeitet werden
  eventDidMount: (info) => {
    console.log('✅ EVENT MOUNTED:',  {
    title: info.event.title,
    start: info.event.start,
    end: info.event.end,
    startStr: info.event.startStr,
    endStr: info.event.endStr
  })
  },
  eventClassNames: (arg) => {
  const category = arg.event.extendedProps?.category || 'default'
  return [`category-${category.toLowerCase()}`]
},
})

let calendarApi: any = null

// 🔥 NEU: Refresh Function hinzufügen
const refreshCalendar = async () => {
  console.log('🔄 CalendarComponent - Refreshing calendar...')
  
  try {
    // 1. Aktuelle View-Position speichern
    const currentDate = calendar.value?.getApi()?.getDate()
    
    // 2. Daten neu laden
    await Promise.all([
      loadAppointments(),
      loadStaffMeetings()
    ])
    
    // 3. Warte einen Moment für State-Updates
    await nextTick()
    
    // 4. FullCalendar wird automatisch durch die watch(calendarEvents) aktualisiert
    console.log('✅ Calendar data refreshed')
    
    // 5. View-Position wiederherstellen falls nötig
    if (currentDate && calendar.value?.getApi) {
      const api = calendar.value.getApi()
      const currentViewDate = api.getDate()
      
      // Nur wiederherstellen falls sich Position geändert hat
      if (Math.abs(currentDate.getTime() - currentViewDate.getTime()) > 24 * 60 * 60 * 1000) {
        api.gotoDate(currentDate)
        console.log('✅ View position restored to:', currentDate)
      }
    }
    
  } catch (error) {
    console.error('❌ Error during calendar refresh:', error)
  }
}

const isCalendarReady = ref(false)

const handleDeleteEvent = async (eventData: CalendarEvent) => {
  console.log('🗑 Event deleted, refreshing calendar...')
  await loadAppointments()
  await loadStaffMeetings()

  refreshCalendar()

  // 🆕 Event nach oben emittieren  
  emit('appointment-changed', { type: 'deleted', data: eventData })
  
  isModalVisible.value = false
}

onMounted(async () => {
  console.log('📅 CalendarComponent mounted')
  isCalendarReady.value = true
  
  // 🔥 NEU: Calendar API Setup
  await nextTick()
  if (calendar.value) {
    calendarApi = calendar.value.getApi()
    console.log('✅ Calendar API initialized')
    emit('view-updated', calendarApi.view.currentStart)
  }
  
  console.log('🔄 Initial appointment loading...')
  await loadAppointments()
  await loadStaffMeetings()
})

watch(() => props.currentUser, async (newUser) => {
  if (newUser) {
    await loadAppointments()
    await loadStaffMeetings()
  }
}, { deep: true })

watch(calendarEvents, (newEvents) => {
  console.log('🔄 calendarEvents changed, updating FullCalendar:', newEvents.length)
  
  if (calendar.value?.getApi) {
    const api = calendar.value.getApi()
    
    // Alle Events entfernen und neue hinzufügen
    api.removeAllEvents()
    api.addEventSource(newEvents)
    
    console.log('✅ FullCalendar events updated successfully')
  }
}, { deep: true, immediate: true })


defineExpose({
  getApi: () => calendar.value?.getApi?.(),
  loadAppointments,
  loadStaffMeetings,
  refreshCalendar,  
  handleSaveEvent,     // ← HINZUFÜGEN
  handleDeleteEvent   
})


</script>

<template>
  <div v-if="isLoadingEvents" class="text-center py-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
    <p class="text-gray-600">Termine werden geladen...</p>
  </div>
  
  <FullCalendar
    v-else-if="isCalendarReady"
    ref="calendar"
    :options="calendarOptions"
  />
  <div v-else>
    Kalender wird geladen...
  </div>

 <EventModal
  ref="eventModalRef"
  :is-visible="isModalVisible"
  :event-data="modalEventData"
  :mode="modalMode"
  :current-user="props.currentUser" 
  :event-type="modalEventType"
  @close="isModalVisible = false"
  @save-event="handleSaveEvent"       
  @delete-event="handleDeleteEvent"   
  @refresh-calendar="loadAppointments"
  @appointment-saved="refreshCalendar"    
  @appointment-updated="refreshCalendar"   
  @appointment-deleted="refreshCalendar"
/>

  <!-- Confirmation Dialog -->
  <ConfirmationDialog
    :is-visible="showConfirmation"
    :title="confirmationData.title"
    :message="confirmationData.message"
    :details="confirmationData.details"
    :icon="confirmationData.icon"
    :type="confirmationData.type"
    :confirm-text="confirmationData.confirmText"
    :cancel-text="confirmationData.cancelText"
    @confirm="handleConfirmAction"
    @cancel="handleCancelAction"
    @close="handleCancelAction"
  />

    <!-- Move Modal hinzufügen -->
  <MoveAppointmentModal
    :is-visible="showMoveModal"
    :appointment="selectedAppointmentToMove"
    @close="showMoveModal = false"
    @moved="handleAppointmentMoved"
    @error="handleMoveError"
  />
</template>

<style>
/* === KALENDER BASIS === */
.fc {
  background-color: white !important;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  height: calc(100vh - 50px); 
}

/* === HEADER & NAVIGATION === */
.fc-col-header-cell {
  background-color: #f8fafc !important;
  color: #374151 !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  padding: 4px 4px !important;
  border-bottom: 2px solid #e5e7eb !important;
}

/* Custom day header styling */
.fc-day-header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.fc-day-header-content .block {
  display: block;
  line-height: 1;
}

/* Heute hervorheben */
.fc-col-header-cell.fc-day-today {
  background-color: #dbeafe !important;
  color: #1d4ed8 !important;
}


/* === ZEIT-SPALTE === */


.fc-timegrid-slot-label {
  color: #6b7280 !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
}

.fc-timegrid-col.fc-day-today {
    color: #1d4ed8 !important;
}

/* === EVENTS === */
.fc-event {
  border: none !important;
  border-radius: 6px !important;
  padding: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
  display: block !important;
  background-color: #62b22f !important; /* Fallback-Farbe */
  overflow: hidden;
}

.fc-event:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.fc-event-title {
  font-weight: 600 !important;
  color: white !important;
  font-size: 10px !important;
}

/* === EVENT KATEGORIEN === */
.fc-event.category-a {
  background-color: #019ee5 !important;
}

.fc-event.category-b {
  background-color: #62b22f !important;
}

.fc-event.category-be {
  background-color: #f59e0b !important;
}

.fc-event.category-c {
  background-color: #ef4444 !important;
}

.fc-event.category-ce {
  background-color: #8b5cf6 !important;
}

.fc-event.category-d {
  background-color: #1d1e19 !important;
}

.fc-event.category-bpt {
  background-color: #06b6d4 !important;
}

.fc-event.category-boat {
  background-color: #10b981 !important;
}

.fc-event.category-default {
  background-color: #666666 !important;
}

/* === CUSTOM EVENT CONTENT === */
.custom-event {
  font-size: 9px;
  line-height: 1;
  color: white;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.event-location {
  font-size: 7px;
  opacity: 0.9;
  color: white !important;
  text-decoration: none;
}

/* === BUTTONS === */
.fc-button {
  background-color: white !important;
  border: 1px solid #d1d5db !important;
  color: #374151 !important;
  border-radius: 8px !important;
  padding: 8px 16px !important;
  font-weight: 500 !important;
  font-size: 0.875rem !important;
  transition: all 0.2s ease !important;
}

.fc-button:hover {
  background-color: #f9fafb !important;
  border-color: #9ca3af !important;
  transform: translateY(-1px);
}

.fc-button-primary {
  background-color: #62b22f !important;
  border-color: #62b22f !important;
  color: white !important;
}

.fc-button-primary:hover {
  background-color: #54a026 !important;
  border-color: #54a026 !important;
}

.fc-button:disabled {
  background-color: #f3f4f6 !important;
  color: #9ca3af !important;
  cursor: not-allowed !important;
}

.fc-button-group {
  gap: 8px;
}

/* === TOOLBAR === */
.fc-toolbar {
  padding: 8px;
  background-color: white !important;
  gap: 2px !important;
  align-items: center;
  justify-content: center;
}

.fc-toolbar-title {
  font-size: 1.5rem !important;
  font-weight: 700 !important;
  color: #111827 !important;
}

/* === SELECTION === */
.fc-highlight {
  background-color: rgba(98, 178, 47, 0.2) !important;
  border-radius: 4px;
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .fc-toolbar {
    flex-direction: column;
    gap: 4px;
  }
  
  .fc-toolbar-title {
    font-size: 1.25rem !important;
  }
  
  .fc-button {
    padding: 6px 12px !important;
    font-size: 0.8rem !important;
  }
  
  .fc-col-header-cell {
    font-size: 0.75rem !important;
  }
 
}

/* === LOADING STATE === */
.fc-loading {
  background-color: #f9fafb !important;
  opacity: 0.7;
}

/* Nur diese CSS-Klasse hinzufügen: */
.fc {
  transition: opacity 0.3s ease !important;
}

.fc.updating {
  opacity: 0.7 !important;
}
</style>