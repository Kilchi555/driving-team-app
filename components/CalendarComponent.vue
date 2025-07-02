<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import deLocale from '@fullcalendar/core/locales/de'
import EventModal from './EventModal.vue'
import { getSupabase } from '~/utils/supabase'

const calendar = ref()
const supabase = getSupabase()

interface Props {
  currentUser?: any
}

const props = defineProps<Props>()

const isModalVisible = ref(false)
const modalEventData = ref<any>(null)
const modalMode = ref<'view' | 'edit' | 'create'>('create')

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
  }
}

const calendarEvents = ref<CalendarEvent[]>([])
const isLoadingEvents = ref(false)

const emit = defineEmits(['view-updated'])

const loadAppointments = async () => {
  isLoadingEvents.value = true
  try {
    console.log('🔄 Loading appointments from Supabase...')
    
    let query = supabase
      .from('appointments')
      .select(`
        *,
        user:user_id(first_name, last_name),
        staff:staff_id(first_name, last_name),
        location:location_id(name, address)
      `)
      .order('start_time')
    
    const { data: appointments, error } = await query
    
    console.log('📊 Raw appointments from DB:', appointments)
    
    if (error) throw error
    
    const convertedEvents = (appointments || []).map((apt) => {
      const event = {
        id: apt.id,
        title: apt.title || `${apt.user?.first_name || 'Unbekannt'} - ${apt.type || 'Termin'}`,
        start: apt.start_time,
        end: apt.end_time,
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
          is_paid: apt.is_paid
        }
      }
      
      console.log(`✅ Converted event:`, {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        rawStart: apt.start_time,
        rawEnd: apt.end_time,
        duration: apt.duration_minutes
      })
      
      return event
    }).filter(event => event !== null)
    
    calendarEvents.value = convertedEvents
    
    console.log('✅ Final calendarEvents:', calendarEvents.value.length, 'events')
    
    if (calendar.value?.getApi) {
      const calendarApi = calendar.value.getApi()
      calendarApi.refetchEvents()
      console.log('🔄 Calendar events refetched')
    }
    
  } catch (error) {
    console.error('❌ Error loading appointments:', error)
  } finally {
    isLoadingEvents.value = false
  }
}

const handleSaveEvent = async (eventData: CalendarEvent) => {
  console.log('💾 Event saved, refreshing calendar...')
  await loadAppointments()
  isModalVisible.value = false
}

const handleDeleteEvent = async (eventData: CalendarEvent) => {
  console.log('🗑️ Event deleted, refreshing calendar...') 
    await loadAppointments()
  isModalVisible.value = false
}

// Erweiterte handleEventDrop Funktion mit Modal-Update
const handleEventDrop = async (dropInfo: any) => {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({
        start_time: dropInfo.event.startStr,
        end_time: dropInfo.event.endStr
      })
      .eq('id', dropInfo.event.id)

    if (error) throw error

    console.log('✅ Appointment moved:', dropInfo.event.title)
    
    // Modal aktualisieren falls offen
    updateModalIfOpen(dropInfo.event)
    
  } catch (error) {
    console.error('❌ Error moving appointment:', error)
    dropInfo.revert()
    alert('Fehler beim Verschieben des Termins.')
  }
}

const selectedAppointment = ref(null)

// Funktion um Modal zu aktualisieren
const updateModalIfOpen = (event: any) => {
  // Direkt DOM-Elemente aktualisieren falls Modal offen
  const modal = document.querySelector('.modal') // Passen Sie den Selector an Ihr Modal an
  if (modal && modal.classList.contains('show')) { // oder wie auch immer Ihr Modal "offen" markiert ist
    updateModalFields(event)
  }
}

// Modal-Felder aktualisieren
const updateModalFields = (event: any) => {
  // Start-Zeit Feld aktualisieren
  const startTimeInput = document.querySelector('#start_time') as HTMLInputElement
  if (startTimeInput) {
    startTimeInput.value = event.start.toISOString().slice(0, 16)
  }
  
  // End-Zeit Feld aktualisieren
  const endTimeInput = document.querySelector('#end_time') as HTMLInputElement
  if (endTimeInput) {
    endTimeInput.value = event.end.toISOString().slice(0, 16)
  }
  
  console.log('Modal fields updated with new times')
}

const handleEventResize = async (resizeInfo: any) => {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({
        end_time: resizeInfo.event.endStr,
        duration_minutes: Math.round((resizeInfo.event.end - resizeInfo.event.start) / (1000 * 60))
      })
      .eq('id', resizeInfo.event.id)

    if (error) throw error
    
    console.log('✅ Appointment resized:', resizeInfo.event.title)
    updateModalIfOpen(resizeInfo.event)
    
  } catch (error) {
    console.error('❌ Error resizing appointment:', error)
    resizeInfo.revert()
    alert('Fehler beim Ändern der Terminlänge.')
  }
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
  
  
 events: calendarEvents.value
,

// Klick auf leeren Zeitslot
dateClick: (arg) => {
  const clickedDate = arg.date
  const endDate = new Date(clickedDate.getTime() + 45 * 60000)

  isModalVisible.value = true
  modalMode.value = 'create'
  modalEventData.value = {
    title: '',
    start: clickedDate.toISOString(),
    end: endDate.toISOString(),
    allDay: arg.allDay,
    extendedProps: {
      location: '',
      staff_note: '',
      client_note: ''
    }
  }
},

eventContent: (arg) => {
  const student = arg.event.extendedProps?.student || ''
  const location = arg.event.extendedProps?.location || ''
  
  return {
    html: `
      <div class="custom-event">
        <div class="event-name">${student}</div>
          📍 ${location}
        </div>
      </div>
    `
  }
},

// Klick auf existierenden Termin
eventClick: (clickInfo) => {
  const appointmentData = calendarEvents.value.find(evt => evt.id === clickInfo.event.id)
  
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

const isCalendarReady = ref(false)

onMounted(async () => {
  console.log('📅 CalendarComponent mounted')
  isCalendarReady.value = true
  
  console.log('🔄 Initial appointment loading...')
  await loadAppointments()
  
  if (calendar.value) {
    emit('view-updated', calendar.value.getApi().view.currentStart)
  }
})

watch(() => props.currentUser, async (newUser) => {
  if (newUser) {
    await loadAppointments()
  }
}, { deep: true })

watch(calendarEvents, (newEvents) => {
  if (calendarOptions.value) {
    calendarOptions.value.events = newEvents
    calendar.value?.getApi()?.refetchEvents()
  }
}, { deep: true })


defineExpose({
  getApi: () => calendar.value?.getApi?.(),
  loadAppointments
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
    :is-visible="isModalVisible"
    :event-data="modalEventData"
    :mode="modalMode"
    :current-user="props.currentUser" 
    @close="isModalVisible = false"
    @save-event="handleSaveEvent"
    @delete-event="handleDeleteEvent"
  />
</template>

<style>
/* === KALENDER BASIS === */
.fc {
  background-color: white !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  margin: 1px !important;
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
  font-size: 10px;
  line-height: 1;
  color: white;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.event-location {
  font-size: 8px;
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
  padding-top: 12px;
  background-color: white !important;
  gap: 2px !important;
}

.fc-toolbar-chunk {
  display: flex;
  align-items: center;
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
    margin: 0 !important;
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
</style>