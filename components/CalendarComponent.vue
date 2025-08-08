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
import { toLocalTimeString } from '~/utils/dateUtils'



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
const showClipboardChoice = ref(false)
const clipboardAppointment = ref<any>(null)  // ✅ Typ hinzufügen
const pendingSlotClick = ref<{ date: Date; allDay: boolean } | null>(null)

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

// Ersetzen Sie BEIDE Funktionen in CalendarComponent.vue:

// 1. Die verbesserte loadRegularAppointments Funktion:
const loadRegularAppointments = async () => {
  console.log('🔥 NEW loadRegularAppointments function is running!')
  isLoadingEvents.value = true
  try {
    console.log('🔄 Loading appointments from Supabase...')
    console.log('👤 Current user:', props.currentUser?.id)
    
    // ✅ Erweiterte Abfrage mit manueller Location-Auflösung
    let query = supabase
      .from('appointments')
      .select(`
        *,
        user:user_id(first_name, last_name, category),
        staff:staff_id(first_name, last_name)
      `)
      .eq('staff_id', props.currentUser?.id) // Eigene Termine (als staff_id)
      .order('start_time')
    
    const { data: appointments, error } = await query
    console.log('📊 Raw appointments from DB:', appointments?.length || 0)

    // ✅ MINIMAL DEBUG: Erste Appointment prüfen
    if (appointments && appointments.length > 0) {
      const firstApt = appointments[0]
      console.log('🔍 FIRST APPOINTMENT RAW DATA:', {
        id: firstApt.id,
        title: firstApt.title,
        discount: firstApt.discount,
        discount_type: firstApt.discount_type,
        discount_reason: firstApt.discount_reason,
        hasDiscount: typeof firstApt.discount !== 'undefined'
      })
    }
    
    if (error) throw error
    
    // Filtern: Eigene Termine + echte Team-Einladungen (nicht doppelte)
    const filteredAppointments = (appointments || []).filter((apt) => {
      const isOwnAppointment = apt.staff_id === props.currentUser?.id
      return isOwnAppointment // Nur eigene Termine
    })
    
    console.log('✅ Filtered appointments:', filteredAppointments.length)
    
    // ✅ Location-Daten für alle Termine laden (für alte Termine)
    const locationIds = [...new Set(filteredAppointments
      .filter(apt => apt.location_id && !apt.location_name)
      .map(apt => apt.location_id)
    )]
    
    let locationsMap: Record<string, {name: string, address: string}> = {}
    if (locationIds.length > 0) {
      console.log('🔄 Loading location data for', locationIds.length, 'locations')
      const { data: locations, error: locError } = await supabase
        .from('locations')
        .select('id, name, address')
        .in('id', locationIds)
      
      if (!locError && locations) {
        locationsMap = Object.fromEntries(
          locations.map(loc => [loc.id, { name: loc.name, address: loc.address }])
        )
        console.log('✅ Locations loaded:', Object.keys(locationsMap).length)
      }
    }
    
    const convertedEvents = filteredAppointments.map((apt) => {
      const isTeamInvite = apt.type === 'team_invite'
      
      // ✅ Event-Titel bestimmen
      let eventTitle = ''
      if (apt.type === 'lesson' || !apt.type) {
        eventTitle = `${apt.user?.first_name || ''} ${apt.user?.last_name || ''}`.trim() || 'Fahrlektion'
      } else {
        eventTitle = apt.title || apt.type || 'Termin'
      }
      
      const event = {
        id: apt.id,
        title: eventTitle,
        start: apt.start_time.replace('+00:00', ''),
        end: apt.end_time.replace('+00:00', ''),  
        allDay: false,
        extendedProps: {
          // ✅ Hybride Location-Auflösung: Neue Felder oder aus locations-Map
          location: apt.location_name || 
              apt.location_address || 
              (apt.location_id ? locationsMap[apt.location_id]?.name : '') || 
              (apt.location_id ? locationsMap[apt.location_id]?.address : '') || 
              'Kein Ort',
          discount: apt.discount,
          discount_type: apt.discount_type,
          discount_reason: apt.discount_reason,
          staff_note: apt.description || '',
          client_note: '',
          category: apt.user?.category || apt.type || 'B',
          instructor: `${apt.staff?.first_name || ''} ${apt.staff?.last_name || ''}`.trim(),
          student: `${apt.user?.first_name || ''} ${apt.user?.last_name || ''}`.trim(),
          price: (apt.price_per_minute || 0) * (apt.duration_minutes || 45),
          user_id: apt.user_id,
          staff_id: apt.staff_id,
          location_id: apt.location_id,
          location_name: apt.location_name || (apt.location_id ? locationsMap[apt.location_id]?.name : '') || '',
          location_address: apt.location_address || (apt.location_id ? locationsMap[apt.location_id]?.address : '') || '',
          duration_minutes: apt.duration_minutes,
          price_per_minute: apt.price_per_minute,
          status: apt.status,
          is_paid: apt.is_paid,
          appointment_type: apt.type,
          is_team_invite: isTeamInvite,
          original_type: apt.user?.category || apt.type || 'B',
          eventType: apt.type // ← Wichtig für die Farb-Zuordnung
        }
      }
      
      return event
    })
    
    return convertedEvents
    
  } catch (error) {
    console.error('❌ Error loading appointments:', error)
    throw error
  } finally {
    isLoadingEvents.value = false
  }
}

// 2. Die ursprüngliche loadAppointments Funktion (unverändert):
const loadAppointments = async () => {
  isLoadingEvents.value = true
  try {
    console.log('🔄 Loading all calendar events...')
    // Parallel laden
    const [appointments] = await Promise.all([
      loadRegularAppointments(),
    ])
    // Kombinieren
    const allEvents = [...appointments]
    calendarEvents.value = allEvents
    console.log('✅ Final calendar summary:', {
      appointments: appointments.length,
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

// ✅ Helper-Funktion für Event-Farben
const getEventColor = (type: string, status?: string): string => {
  const colors = {
    'lesson': '#10b981',      // Grün für Fahrstunden
    'exam': '#f59e0b',        // Orange für Prüfungen  
    'theory': '#3b82f6',      // Blau für Theorie
    'meeting': '#8b5cf6',     // Lila für Meetings
    'break': '#6b7280',       // Grau für Pausen
    'maintenance': '#ef4444', // Rot für Wartung
    'team_invite': '#06b6d4', // Cyan für Team-Einladungen
    'other': '#64748b'        // Grau für Sonstiges
  }
  
  let baseColor = colors[type as keyof typeof colors] || colors.other
  
  // Status-basierte Anpassungen
  if (status === 'cancelled') {
    baseColor = '#ef4444' // Rot für abgesagte Termine
  } else if (status === 'completed') {
    baseColor = '#22c55e' // Helles Grün für abgeschlossene Termine
  }
  
  return baseColor
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

const handleSaveEvent = async (eventData: CalendarEvent) => {
  console.log('💾 Event saved, refreshing calendar...')
  
  // View-Position speichern
  const currentDate = calendar.value?.getApi()?.getDate()
  
  // Daten neu laden
  await loadAppointments()
  
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

// Neue Hilfsfunktion:
const openNewAppointmentModal = (arg: any) => {
  // ✅ FIX 1: Verwende originale Zeit (keine -2h Korrektur)
  const clickedDate = arg.date
  const endDate = new Date(clickedDate.getTime() + 45 * 60000)
  
  console.log('📅 CREATE MODE: Free slot clicked at', toLocalTimeString(clickedDate))
  
  isModalVisible.value = true
  modalMode.value = 'create'
  modalEventData.value = {
    title: '',
    start: toLocalTimeString(clickedDate),
    end: toLocalTimeString(endDate),
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
}

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
    displayEventTime: false,
    forceEventDuration: true, 
    selectable: true,
    editable: true,
    events: calendarEvents.value,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
  // Klick auf leeren Zeitslot

// In der dateClick Funktion im calendarOptions:
dateClick: (arg) => {
  console.log('🔍 FREE SLOT CLICKED:', {
    clickedDate: arg.date,
    clickedISO: toLocalTimeString(arg.date),
    hasClipboard: !!clipboardAppointment.value,
    clipboardData: clipboardAppointment.value
  })
  
  // ✅ Prüfen ob Zwischenablage gefüllt ist
  if (clipboardAppointment.value) {
    console.log('📋 Clipboard detected, showing choice modal:', clipboardAppointment.value)
    
    // Slot-Info für später speichern
    pendingSlotClick.value = {
      date: arg.date,
      allDay: arg.allDay
    }
    
    // ✅ WICHTIG: Modal mit setTimeout stabil setzen
    setTimeout(() => {
      showClipboardChoice.value = true
      console.log('✅ Choice modal set to visible with timeout:', showClipboardChoice.value)
    }, 10) // Kleine Verzögerung um Race Conditions zu vermeiden
    
    return
  }
  
  console.log('➕ No clipboard, opening new appointment modal')
  openNewAppointmentModal(arg)
},

eventContent: (arg) => {
  const extendedProps = arg.event.extendedProps
  const location = extendedProps?.location || ''
  
  return {
    html: `
      <div class="custom-event">
        <div class="event-name">${arg.event.title}</div>
        <div class="event-location">${location}</div>
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

  refreshCalendar()

  // 🆕 Event nach oben emittieren  
  emit('appointment-changed', { type: 'deleted', data: eventData })
  
  isModalVisible.value = false
}

const handleEventDeleted = (id: string) => {
  console.log('🗑️ Event deleted:', id)
  loadAppointments() // Kalender neu laden
}

// ✅ NEUE FUNKTION: Direktes Speichern ohne Modal
const pasteAppointmentDirectly = async () => {
  if (!clipboardAppointment.value || !pendingSlotClick.value) return
  
  console.log('📋 Pasting appointment directly...')
  console.log('🔍 FULL clipboardAppointment:', clipboardAppointment.value)
  
  try {
    // Kopierte Daten mit neuer Zeit vorbereiten
    const clickedDate = pendingSlotClick.value.date
    const endDate = new Date(clickedDate.getTime() + clipboardAppointment.value.duration * 60000)
    
    // ✅ EXPLIZITE KATEGORIE-ERMITTLUNG
    const rawCategory = clipboardAppointment.value.category || clipboardAppointment.value.type
    console.log('🔍 Raw category from clipboard:', rawCategory)
    
    // Bei mehreren Kategorien nur die erste nehmen
    const category = rawCategory ? rawCategory.split(',')[0].trim() : 'B'
    console.log('🔍 Final category for pricing:', category)
    
    // ✅ EXPLIZITE PREIS-BERECHNUNG
    const fallbackPrices: Record<string, number> = {
      'B': 95/45,           // 2.11
      'A': 95/45,           // 2.11  
      'A1': 95/45,          // 2.11
      'BE': 120/45,         // 2.67
      'C': 170/45,          // 3.78
      'C1': 150/45,         // 3.33
      'D': 200/45,          // 4.44
      'CE': 200/45,         // 4.44
      'Motorboot': 120/45,       // 2.67
      'BPT': 95/45          // 2.11
    }
    
    const pricePerMinute = fallbackPrices[category] || 2.11
    console.log('🔍 Calculated price_per_minute:', pricePerMinute, 'for category:', category)
    
    // ✅ APPOINTMENTS-DATEN MIT EXPLIZITEN WERTEN
      const appointmentData = {
        // Basis-Felder
        title: clipboardAppointment.value.title || 'Kopierter Termin',
        description: clipboardAppointment.value.description || '',
        user_id: clipboardAppointment.value.user_id,
        staff_id: clipboardAppointment.value.staff_id || props.currentUser?.id,
        location_id: clipboardAppointment.value.location_id,
        
        // Zeit-Felder (neu)
        start_time: toLocalTimeString(clickedDate),
        end_time: toLocalTimeString(endDate),
        duration_minutes: clipboardAppointment.value.duration || 45,
        
        // Kopierte Felder
        type: category,
        price_per_minute: Number(pricePerMinute),
        status: 'scheduled',
        
        // Pflichtfelder mit Defaults
        is_paid: clipboardAppointment.value.is_paid || false,
        discount: clipboardAppointment.value.discount || 0,
        discount_type: clipboardAppointment.value.discount_type || 'fixed',
        discount_reason: clipboardAppointment.value.discount_reason || null,
      }
    
    // ✅ FINALE DEBUG-AUSGABE
    console.log('💾 FINAL appointmentData before save:', appointmentData)
    console.log('🔍 price_per_minute type and value:', typeof appointmentData.price_per_minute, appointmentData.price_per_minute)
    
    // Validierung vor dem Speichern
    if (!appointmentData.price_per_minute || appointmentData.price_per_minute <= 0) {
      throw new Error(`Invalid price_per_minute: ${appointmentData.price_per_minute}`)
    }
    
    // Direkt in Datenbank speichern
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single()
    
    if (error) throw error
    
    console.log('✅ Appointment pasted successfully:', data.id)
    
    // Cleanup
    showClipboardChoice.value = false
    pendingSlotClick.value = null
    
    // Kalender neu laden
    await loadAppointments()
        
  } catch (error: any) {
    console.error('❌ Error pasting appointment:', error)
    showToast('❌ Fehler beim Einfügen: ' + error.message)
  }
}

const createNewAppointment = () => {
  if (!pendingSlotClick.value) return
  
  console.log('➕ Creating completely new appointment')
  
  // ✅ WICHTIG: Völlig leeres Modal ohne vorausgewählte Daten
  const clickedDate = pendingSlotClick.value.date
  const endDate = new Date(clickedDate.getTime() + 45 * 60000)
  
  modalMode.value = 'create'
  modalEventData.value = {
    title: '',
    start: toLocalTimeString(clickedDate),
    end: toLocalTimeString(endDate),
    allDay: pendingSlotClick.value.allDay,
    
    // ✅ WICHTIG: Explizit KEINE Student-Daten setzen
    user_id: null,
    selectedStudentId: null,
    preselectedStudent: null,
    
    // ✅ WICHTIG: Markierung als freier Slot
    isFreeslotClick: true,
    clickSource: 'calendar-free-slot-new',
    
    extendedProps: {
      location: '',
      staff_note: '',
      client_note: '',
      eventType: 'lesson',
      isNewAppointment: true
    }
  }
  
  // Cleanup
  showClipboardChoice.value = false
  pendingSlotClick.value = null
  
  // Modal öffnen
  isModalVisible.value = true
  
  console.log('✅ New appointment modal opened with clean data')
}

// Copy Handler anpassen:
const handleCopyAppointment = (copyData: any) => {
  console.log('📋 CALENDAR: Copy event received:', copyData)
  
  // ✅ DEBUG: Alle verfügbaren Kategorie-Felder anzeigen
  console.log('🔍 DEBUG Category fields:', {
    'copyData.eventData.type': copyData.eventData.type,
    'copyData.eventData.extendedProps?.type': copyData.eventData.extendedProps?.type,
    'copyData.eventData.extendedProps?.category': copyData.eventData.extendedProps?.category,
    'copyData.eventData.extendedProps?.appointment_type': copyData.eventData.extendedProps?.appointment_type
  })
  
  // ✅ KORRIGIERT: Verwende die echte Termin-Kategorie
  const appointmentCategory = copyData.eventData.type || 
                              copyData.eventData.extendedProps?.type || 
                              'B' // Fallback
  
  // In Zwischenablage speichern
  clipboardAppointment.value = {
      id: copyData.eventData.id,
        title: copyData.eventData.title?.replace(' (Kopie)', '') || 'Kopierter Termin',
        user_id: copyData.eventData.user_id,
        staff_id: copyData.eventData.staff_id,
        location_id: copyData.eventData.location_id,
        appointment_type: copyData.eventData.appointment_type,
        category: appointmentCategory,
        type: appointmentCategory,
        duration: copyData.eventData.duration_minutes || 45,
        duration_minutes: copyData.eventData.duration_minutes || 45,
        price_per_minute: copyData.eventData.price_per_minute,
  }
  
  console.log('✅ Termin in Zwischenablage gespeichert:', clipboardAppointment.value)
}

const cancelClipboardChoice = () => {
  console.log('❌ Cancelling clipboard choice')
  showClipboardChoice.value = false
  pendingSlotClick.value = null
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
})

watch(() => props.currentUser, async (newUser) => {
  if (newUser) {
    await loadAppointments()
  }
}, { deep: true })

watch(calendarEvents, (newEvents) => {
  console.log('🔄 calendarEvents changed, updating FullCalendar:', newEvents.length)
  
  if (calendar.value?.getApi) {
    const api = calendar.value.getApi()
    
    // ✅ FIX: Alle Events komplett entfernen
    api.removeAllEvents()
    api.removeAllEventSources()
    
    // ✅ FIX: Events direkt setzen, nicht als Source
    newEvents.forEach(event => api.addEvent(event))
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
  @delete-event="handleEventDeleted"
  @copy-appointment="handleCopyAppointment"
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

 <!-- ✅ NEUES MODAL: Clipboard Choice Modal -->
  <div v-if="showClipboardChoice" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
      <div class="text-center mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
            Kopierter Termin        
        </h3>
      </div>

      <!-- Kopierter Termin Info -->
      <div v-if="clipboardAppointment" class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div class="text-sm">
          <div class="font-medium text-blue-900">{{ clipboardAppointment.title }}</div>
          <div class="text-blue-700 text-xs mt-1">
            Kategorie {{ clipboardAppointment.category }} • {{ clipboardAppointment.duration }}min
          </div>
        </div>
      </div>

      <!-- Buttons -->
      <div class="flex space-x-3">
        <button
          @click="pasteAppointmentDirectly"
          class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
        >
          <span>Dieser einfügen</span>
        </button>
        
        <button
          @click="createNewAppointment"
          class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
        >
          <span>Neuer Termin</span>
        </button>
      </div>

      <!-- Cancel -->
      <button
        @click="cancelClipboardChoice"
        class="w-full mt-3 px-4 py-2 text-gray-600 hover:text-gray-800 text-sm rounded-lg border border-gray-600"
      >
        Abbrechen
      </button>
    </div>
  </div>

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
  border-radius: 4px !important;
  padding: 1px;
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