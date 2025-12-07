<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, onErrorCaptured } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import EventModal from './EventModal.vue'
import EnhancedStudentModal from './EnhancedStudentModal.vue'
import { getSupabase } from '~/utils/supabase'
import { useCurrentUser } from '~/composables/useCurrentUser'
import ConfirmationDialog from './ConfirmationDialog.vue'
import { useAppointmentStatus } from '~/composables/useAppointmentStatus'
import MoveAppointmentModal from './MoveAppointmentModal.vue'
import { toLocalTimeString } from '~/utils/dateUtils'
import { useStaffWorkingHours } from '~/composables/useStaffWorkingHours'
import { useExternalCalendarSync } from '~/composables/useExternalCalendarSync'

// ✅ GLOBALE FEHLERBEHANDLUNG
onErrorCaptured((error, instance, info) => {
  console.error('🚨 Vue Error Captured:', {
    error: error.message,
    instance: instance?.$options?.name || 'Unknown',
    info,
    stack: error.stack
  })
  
  // ✅ Fehler nicht weiterwerfen, nur loggen
  return false
})

// ✅ GLOBAL ERROR HANDLER für unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('🚨 Global Error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    })
    
    // ✅ Verhindere Standard-Fehlerbehandlung
    event.preventDefault()
  })
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', {
      reason: event.reason,
      promise: event.promise
    })
    
    // ✅ Verhindere Standard-Fehlerbehandlung
    event.preventDefault()
  })
}


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
const clipboardTimeout = ref<NodeJS.Timeout | null>(null)  // ✅ 5-Minuten-Timeout
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

// View switcher method
// Update year in custom title button
const updateCustomTitle = () => {
  if (!calendar.value) return
  const api = calendar.value.getApi()
  const currentDate = api.getDate()
  currentYear.value = currentDate.getFullYear()
  
  // Update button text mit Jahr + Pfeil
  api.setOption('customButtons', {
    ...api.getOption('customButtons'),
    customTitle: {
      text: `${currentYear.value} ▼`,
      click: () => {
        showDatePicker.value = !showDatePicker.value
      }
    }
  })
}

// Jump to specific date
const jumpToDate = (year: number, month: number) => {
  if (!calendar.value) return
  const api = calendar.value.getApi()
  const targetDate = new Date(year, month, 1)
  api.gotoDate(targetDate)
  showDatePicker.value = false
  updateCustomTitle()
}

const switchView = () => {
  if (!calendar.value) return
  
  const api = calendar.value.getApi()
  if (currentView.value === 'timeGridWeek') {
    currentView.value = 'timeGridDay'
    // Set abbreviated month names for day view only
    api.setOption('titleFormat', { year: 'numeric', month: 'short', day: 'numeric' })
    // Update button text
    api.setOption('customButtons', {
      ...api.getOption('customButtons'),
      viewSwitcher: {
        text: 'Woche',
        click: switchView
      }
    })
    api.changeView('timeGridDay')
  } else {
    currentView.value = 'timeGridWeek'
    // Update button text
    api.setOption('customButtons', {
      ...api.getOption('customButtons'),
      viewSwitcher: {
        text: 'Tag',
        click: switchView
      }
    })
    // Reset to default format for week view (no changes needed)
    api.changeView('timeGridWeek')
  }
  updateCustomTitle()
}


const calendar = ref()
const supabase = getSupabase()
const rootEl = ref<HTMLElement | null>(null)

// Swipe navigation state
let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0
const SWIPE_THRESHOLD = 50 // px
const SWIPE_TIME_MS = 800 // ms

const handleTouchStart = (e: TouchEvent) => {
  const t = e.touches[0]
  touchStartX = t.clientX
  touchStartY = t.clientY
  touchStartTime = Date.now()
}

const handleTouchEnd = (e: TouchEvent) => {
  if (!touchStartTime) return
  const t = e.changedTouches[0]
  const dx = t.clientX - touchStartX
  const dy = t.clientY - touchStartY
  const dt = Date.now() - touchStartTime
  touchStartTime = 0

  // Ignore vertical scrolls or long gestures
  if (Math.abs(dy) > Math.abs(dx) || Math.abs(dy) > 40 || dt > SWIPE_TIME_MS) return
  if (Math.abs(dx) < SWIPE_THRESHOLD) return

  const api = calendar.value?.getApi?.()
  if (!api) return
  if (dx < 0) {
    // swipe left -> next period
    api.next()
  } else {
    // swipe right -> previous period
    api.prev()
  }
}

const attachSwipe = () => {
  if (!rootEl.value) return
  rootEl.value.addEventListener('touchstart', handleTouchStart, { passive: true })
  rootEl.value.addEventListener('touchend', handleTouchEnd, { passive: true })
}

const detachSwipe = () => {
  if (!rootEl.value) return
  rootEl.value.removeEventListener('touchstart', handleTouchStart)
  rootEl.value.removeEventListener('touchend', handleTouchEnd)
}

// View switcher
const currentView = ref<'timeGridWeek' | 'timeGridDay'>('timeGridWeek')

interface Props {
  currentUser?: any
  adminStaffFilter?: string | null
}

const props = defineProps<Props>()

const isModalVisible = ref(false)
const modalEventData = ref<any>(null)
const modalMode = ref<'view' | 'edit' | 'create'>('create')

// EnhancedStudentModal State
const showEnhancedStudentModal = ref(false)
const selectedStudentForProgress = ref<any>(null)
const studentProgressActiveTab = ref<'details' | 'progress' | 'payments' | 'documents'>('progress')

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
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  display?: string
  classNames?: string[]
  extendedProps?: {
    location?: string
    staff_note?: string
    client_note?: string
    category?: string
    instructor?: string
    student?: string
    email?: string
    phone?: string
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
    type?: string
    isNonWorkingHours?: boolean
    isClickThrough?: boolean
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
const isInitialLoad = ref(true) // Flag für ersten Load
const showDatePicker = ref(false) // Für Monatskalender-Dropdown
const currentYear = ref(new Date().getFullYear())
let syncInterval: NodeJS.Timeout | null = null // Interval für Auto-Sync

// Working Hours Management
const { 
  loadWorkingHours, 
  getActiveWorkingHours, 
  isOutsideWorkingHours,
  workingHoursByDay 
} = useStaffWorkingHours()

const emit = defineEmits(['view-updated', 'appointment-changed'])

// NEUE FUNKTION: Nicht-Arbeitszeiten aus DB laden und als wiederkehrende Events anzeigen
const loadNonWorkingHoursBlocks = async (staffId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
  try {
    console.log('🔒 Loading non-working hours blocks from DB...')
    
    // ALLE Working hours für diesen Staff laden (aktive UND inaktive)
    const { data: allWorkingHours, error } = await supabase
      .from('staff_working_hours')
      .select('*')
      .eq('staff_id', staffId)
      .order('day_of_week')
    
    if (error) {
      console.error('Error loading working hours:', error)
      return []
    }
    
    console.log('✅ Loaded all working hours:', allWorkingHours?.length || 0)
    
    const events: CalendarEvent[] = []
    
    // Für jeden Tag im sichtbaren Bereich
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay() // Sonntag = 7
      
      // Finde alle Working Hours für diesen Wochentag
      const dayWorkingHours = allWorkingHours?.filter(wh => wh.day_of_week === dayOfWeek) || []
      
      // Prüfe ob der Tag aktive Working Hours hat
      const hasActiveWorkingHours = dayWorkingHours.some(wh => wh.is_active === true)
      
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      // FALL 1: Tag hat KEINE aktiven Working Hours → ganzer Tag blockieren
      if (!hasActiveWorkingHours) {
        events.push({
          id: `non-working-day-${dayOfWeek}-${dateStr}`,
          title: '',
          start: `${dateStr}T00:00`,
          end: `${dateStr}T23:59`,
          backgroundColor: '#f3f4f6', // Helles Grau (durchklickbar)
          borderColor: 'transparent',
          textColor: 'transparent',
          display: 'background',
          classNames: ['non-working-hours-block'],
          extendedProps: {
            type: 'non_working_hours',
            isNonWorkingHours: true,
            isClickThrough: true
          }
        })
      } 
      // FALL 2: Tag hat aktive Working Hours → nur die inaktiven Blöcke blockieren
      else {
        const inactiveBlocks = dayWorkingHours.filter(wh => wh.is_active === false)
        
        inactiveBlocks.forEach((block, index) => {
          // Convert UTC time to local time for display
          // Working hours are now stored in UTC, need to display in local time
          const [utcHour, utcMinute, utcSecond] = block.start_time.split(':').map(Number)
          const [utcEndHour, utcEndMinute, utcEndSecond] = block.end_time.split(':').map(Number)
          
          // Create UTC date and get local time equivalent
          const utcStart = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), utcHour || 0, utcMinute || 0, utcSecond || 0))
          const utcEnd = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), utcEndHour || 0, utcEndMinute || 0, utcEndSecond || 0))
          
          // Convert to local time strings for display
          const localStartHour = String(utcStart.getHours()).padStart(2, '0')
          const localStartMinute = String(utcStart.getMinutes()).padStart(2, '0')
          const localStartSecond = String(utcStart.getSeconds()).padStart(2, '0')
          
          const localEndHour = String(utcEnd.getHours()).padStart(2, '0')
          const localEndMinute = String(utcEnd.getMinutes()).padStart(2, '0')
          const localEndSecond = String(utcEnd.getSeconds()).padStart(2, '0')
          
          const startTime = `${dateStr}T${localStartHour}:${localStartMinute}:${localStartSecond}`
          const endTime = `${dateStr}T${localEndHour}:${localEndMinute}:${localEndSecond}`
          
          events.push({
            id: `non-working-${dayOfWeek}-${index}-${dateStr}`,
            title: '',
            start: startTime,
            end: endTime,
            backgroundColor: '#f3f4f6', // Helles Grau (durchklickbar)
            borderColor: 'transparent',
            textColor: 'transparent',
            display: 'background',
            classNames: ['non-working-hours-block'],
            extendedProps: {
              type: 'non_working_hours',
              isNonWorkingHours: true,
              isClickThrough: true
            }
          })
        })
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    console.log('✅ Generated non-working hours events:', events.length)
    return events
    
  } catch (error) {
    console.error('Error loading non-working hours blocks:', error)
    return []
  }
}

// LEGACY: Arbeitszeiten als Kalender-Events generieren (wiederkehrend)
const generateWorkingHoursEvents = (staffId: string, startDate: Date, endDate: Date) => {
  const workingHoursEvents: CalendarEvent[] = []
  const activeHours = getActiveWorkingHours()
  
  console.log('🔍 Generating working hours events:', {
    staffId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    activeHours: activeHours.length,
    workingHoursByDay: workingHoursByDay.value,
    allWorkingHoursDays: Object.keys(workingHoursByDay.value)
  })
  
  // WICHTIG: Auch wenn keine aktiven Stunden, trotzdem alle Tage grau machen
  if (!activeHours.length) {
    console.log('⚠️ No active working hours - will gray out all days')
    // Nicht returnen, sondern durchlaufen und alle Tage als inaktiv behandeln
  }
  
  // Erweitere den Zeitraum um 2 Wochen vor und nach dem sichtbaren Bereich (reduziert von 3 Monaten)
  const extendedStart = new Date(startDate)
  extendedStart.setDate(extendedStart.getDate() - 14)
  
  const extendedEnd = new Date(endDate)
  extendedEnd.setDate(extendedEnd.getDate() + 14)
  
  // Für jeden Tag im erweiterten Bereich
  const currentDate = new Date(extendedStart)
  while (currentDate <= extendedEnd) {
    const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay() // Sonntag = 7
    const workingHour = workingHoursByDay.value[dayOfWeek]
    
    console.log('🔍 Processing date:', currentDate.toDateString(), 'dayOfWeek:', dayOfWeek, 'workingHour:', workingHour)
    
    // Prüfe ob dieser Tag aktive Arbeitszeiten hat
    if (workingHour?.is_active) {
      // Tag hat aktive Arbeitszeiten -> nur Zeiten außerhalb blockieren
      // Working hours are now stored in UTC, need to convert to local time for display
      const [startHour, startMinute] = workingHour.start_time.split(':').map(Number)
      const [endHour, endMinute] = workingHour.end_time.split(':').map(Number)
      
      // Create UTC dates and convert to local time
      const utcStartDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), startHour || 0, startMinute || 0, 0))
      const utcEndDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), endHour || 0, endMinute || 0, 0))
      
      const workStart = new Date(currentDate)
      workStart.setHours(utcStartDate.getHours(), utcStartDate.getMinutes(), 0, 0)
      
      const workEnd = new Date(currentDate)
      workEnd.setHours(utcEndDate.getHours(), utcEndDate.getMinutes(), 0, 0)
      
      // Block vor Arbeitsbeginn (00:00 bis Arbeitsbeginn) - DUNKELGRAU
      console.log('🔍 Debug workStart:', workStart.getHours(), workStart.getMinutes(), 'for day', dayOfWeek)
      
      // IMMER Events erstellen für Debugging - entferne if-Bedingung
      console.log('🔍 Creating before-work event for', currentDate.toDateString())
      const beforeEvent = {
        id: `working-hours-before-${dayOfWeek}-${currentDate.toISOString().split('T')[0]}`,
        title: '',
        start: new Date(currentDate).toISOString().split('T')[0] + 'T00:00:00',
        end: workStart.toISOString().replace('Z', ''), // Entferne Z für lokale Zeit
        backgroundColor: '#f3f4f6', // Helles Grau (durchklickbar)
        borderColor: 'transparent',
        textColor: 'transparent',
        display: 'background',
        classNames: ['non-working-hours-block'],
        extendedProps: {
          type: 'non_working_hours',
          isNonWorkingHours: true,
          isClickThrough: true
        }
      }
      workingHoursEvents.push(beforeEvent)
      console.log('🔍 Added before-work event:', beforeEvent.start, 'to', beforeEvent.end, 'for', currentDate.toDateString())
      
      // KEIN weisser Event nötig - Kalender-Hintergrund ist bereits weiß
      // Nur graue Events für Nicht-Arbeitszeiten erstellen
      
      // Block nach Arbeitsende (Arbeitsende bis 23:59) - HELLES GRAU
      if (workEnd.getHours() < 23 || (workEnd.getHours() === 23 && workEnd.getMinutes() < 59)) {
        const dayEnd = new Date(currentDate)
        dayEnd.setHours(23, 59, 59, 999)
        
        const afterEvent = {
          id: `working-hours-after-${dayOfWeek}-${currentDate.toISOString().split('T')[0]}`,
          title: '',
          start: workEnd.toISOString().replace('Z', ''), // Entferne Z für lokale Zeit
          end: dayEnd.toISOString().replace('Z', ''), // Entferne Z für lokale Zeit
          backgroundColor: '#f3f4f6', // Helles Grau (durchklickbar)
          borderColor: 'transparent',
          textColor: 'transparent',
          display: 'background',
          classNames: ['non-working-hours-block'],
          extendedProps: {
            type: 'non_working_hours',
            isNonWorkingHours: true,
            isClickThrough: true
          }
        }
        workingHoursEvents.push(afterEvent)
        console.log('🔍 Added after-work event:', afterEvent.start, 'to', afterEvent.end, 'for', currentDate.toDateString())
      }
      
      // KEINE grauen Blöcke für die Arbeitszeit selbst (08:00-18:00 bleibt weiß)
      
    } else {
      // Tag hat KEINE aktiven Arbeitszeiten -> ganzer Tag hellgrau (Default 00:00-24:00)
      const fullDayEvent = {
        id: `working-hours-full-${dayOfWeek}-${currentDate.toISOString().split('T')[0]}`,
        title: '',
        start: new Date(currentDate).toISOString().split('T')[0] + 'T00:00:00',
        end: new Date(currentDate).toISOString().split('T')[0] + 'T23:59:59',
        backgroundColor: '#f3f4f6', // Helles Grau (durchklickbar)
        borderColor: 'transparent',
        textColor: 'transparent',
        display: 'background',
        classNames: ['non-working-hours-block'],
        extendedProps: {
          type: 'non_working_hours',
          isNonWorkingHours: true,
          isClickThrough: true
        }
      }
      workingHoursEvents.push(fullDayEvent)
      console.log('🔍 Added full-day event (default 00:00-24:00):', fullDayEvent.start, 'to', fullDayEvent.end, 'for', currentDate.toDateString())
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  console.log('✅ Generated working hours events:', workingHoursEvents.length)
  return workingHoursEvents
}

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
      .eq('staff_id', '091afa9b-e8a1-43b8-9cae-3195621619ae') // ✅ KORREKTE STAFF ID
      .order('start_time')

    const { data: meetings, error } = await query

    console.log('📊 Raw staff meetings from DB:', meetings?.length || 0)
    if (error) throw error

    // Convert zu Calendar Events Format
    const convertedMeetings = (meetings || []).map((meeting) => {
      // ✅ Location für den Titel bestimmen
      const locationText = meeting.location?.name || meeting.location?.address || 'Kein Ort'
      
      // ✅ Titel mit Location kombinieren falls vorhanden
      let meetingTitle = meeting.title || 'Staff Meeting'
      if (locationText && locationText !== 'Kein Ort') {
        meetingTitle = `${meetingTitle} - ${locationText}`
      }
      
      return {
        id: meeting.id,
        title: meetingTitle,
        start: meeting.start_time,
        end: meeting.end_time,
        allDay: false,
        extendedProps: {
          location: locationText,
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
      }
    })

    console.log('✅ Staff meetings loaded:', convertedMeetings.length)
    return convertedMeetings

  } catch (error) {
    console.error('❌ Error loading staff meetings:', error)
    return []
  }
}

// Ersetzen Sie BEIDE Funktionen in CalendarComponent.vue:

// 1. Die verbesserte loadRegularAppointments Funktion:
const loadExternalBusyTimes = async (): Promise<CalendarEvent[]> => {
  try {
    console.log('📅 Loading external busy times...')
    
    const { currentUser: composableCurrentUser } = useCurrentUser()
    const currentUserData = props.currentUser || composableCurrentUser.value
    
    if (!currentUserData?.id) {
      console.log('⚠️ No user data for external busy times')
      return []
    }
    
    console.log('🔍 DEBUG: Loading external busy times for user:', { 
      userId: currentUserData.id, 
      tenantId: currentUserData.tenant_id 
    })
    
    // Load external busy times für einen erweiterten Zeitraum (1 Jahr voraus)
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
    
    const { data: busyTimes, error } = await supabase
      .from('external_busy_times')
      .select('*')
      .eq('staff_id', currentUserData.id)
      .eq('tenant_id', currentUserData.tenant_id)
      .gte('end_time', new Date().toISOString()) // Ab jetzt
      .lte('start_time', oneYearFromNow.toISOString()) // Bis 1 Jahr voraus
      .order('start_time')
    
    if (error) {
      console.error('Error loading external busy times:', error)
      return []
    }
    
    if (!busyTimes || busyTimes.length === 0) {
      console.log('📅 No external busy times found')
      return []
    }
    
    console.log('✅ Loaded external busy times:', busyTimes.length)
    
    // Convert UTC times to local time for display (same as appointments)
    const parseUTCTime = (utcTimeString: string) => {
      // Parse UTC ISO string and convert to local time
      let timeStr = utcTimeString
      // Normalize format: convert space format to ISO if needed
      if (timeStr.includes(' ') && !timeStr.includes('T')) {
        timeStr = timeStr.replace(' ', 'T')
      }
      // Ensure timezone suffix is properly formatted
      if (timeStr.includes('+00') && !timeStr.includes('+00:00')) {
        timeStr = timeStr.replace('+00', '+00:00')
      }
      if (!timeStr.includes('+') && !timeStr.includes('Z')) {
        timeStr += '+00:00'
      }
      
      const utcDate = new Date(timeStr)
      // Use toLocaleString to convert UTC to local timezone (Europe/Zurich)
      const localDateStr = utcDate.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
      const localDate = new Date(localDateStr)
      
      // Create local date string for calendar display
      const localYear = localDate.getFullYear()
      const localMonth = String(localDate.getMonth() + 1).padStart(2, '0')
      const localDay = String(localDate.getDate()).padStart(2, '0')
      const localHour = String(localDate.getHours()).padStart(2, '0')
      const localMinute = String(localDate.getMinutes()).padStart(2, '0')
      const localSecond = String(localDate.getSeconds()).padStart(2, '0')
      return `${localYear}-${localMonth}-${localDay}T${localHour}:${localMinute}:${localSecond}`
    }
    
    // Convert to calendar events
    const events: CalendarEvent[] = busyTimes.map(busy => {
      return {
        id: `external-busy-${busy.id}`,
        title: busy.event_title || 'Privat',
        start: parseUTCTime(busy.start_time),
        end: parseUTCTime(busy.end_time),
        backgroundColor: '#e9d5ff', // Helles Lila (durchklickbar)
        borderColor: 'transparent',
        textColor: '#9333ea',
        display: 'background', // Als Hintergrund, damit durchklickbar
        classNames: ['external-busy-block'],
        extendedProps: {
          type: 'external_busy',
          external_event_id: busy.external_event_id,
          sync_source: busy.sync_source,
          isClickThrough: true // Marker für durchklickbar
        }
      }
    })
    
    return events
    
  } catch (error) {
    console.error('Error loading external busy times:', error)
    return []
  }
}

const loadRegularAppointments = async () => {
  console.log('🔥 NEW loadRegularAppointments function is running!')
  isLoadingEvents.value = true
  try {
    console.log('🔄 Loading appointments from Supabase...')
    console.log('👤 Current user from props:', props.currentUser?.id)
    
    // ✅ Fallback: useCurrentUser direkt verwenden falls props falsch sind
    const { currentUser: composableCurrentUser } = useCurrentUser()
    let actualUserId = props.currentUser?.id || composableCurrentUser.value?.id
    
    console.log('👤 Actual user ID to use:', actualUserId)
    
    // Get user's tenant_id for filtering
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', actualUserId)
      .single()
    
    if (userError) throw userError
    if (!userData?.tenant_id) throw new Error('User has no tenant assigned')
    
    console.log('🏢 User tenant_id:', userData.tenant_id)

    // ✅ Optimierte Abfrage mit weniger JOINs für bessere Performance
    let query = supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        type,
        event_type_code,
        status,
        duration_minutes,
        location_id,
        user_id,
        staff_id,
        created_by,
        description,
        user:users!appointments_user_id_fkey(first_name, last_name, category, phone, email),
        staff:users!appointments_staff_id_fkey(first_name, last_name),
        created_by_user:users!appointments_created_by_fkey(first_name, last_name)
      `)
      .is('deleted_at', null) // ✅ Soft Delete Filter
      .eq('tenant_id', userData.tenant_id) // ✅ Tenant Filter
      .order('start_time')
      .limit(1000) // ✅ Limit für bessere Performance
    
    // ✅ Admin vs Staff Logic: Admins sehen alle Termine, Staff nur eigene
    const userRole = props.currentUser?.role || composableCurrentUser.value?.role
    if (userRole === 'admin') {
      console.log('🔥 Admin detected - loading appointments for tenant:', userData.tenant_id)
      // Admin Staff Filter: Wenn ein spezifischer Staff ausgewählt ist
      if (props.adminStaffFilter) {
        console.log('🔥 Admin filtering by staff:', props.adminStaffFilter)
        query = query.eq('staff_id', props.adminStaffFilter)
      } else {
        console.log('🔥 Admin loading ALL appointments for tenant')
        // Alle Termine des Tenants (kein zusätzlicher Filter)
      }
    } else {
      console.log('🔥 Staff detected - loading own appointments only for tenant:', userData.tenant_id)
      query = query.eq('staff_id', actualUserId) // Nur eigene Termine
    }
    
    const { data: appointments, error } = await query
    console.log('📊 Raw appointments from DB:', appointments?.length || 0)
    console.log('🔍 Query details:', {
      staff_id: actualUserId,
      tenant_id: userData.tenant_id,
      deleted_at: 'null',
      order: 'start_time'
    })
    console.log('🔍 Full query:', query)
    if (error) {
      console.error('❌ Supabase query error:', error)
    }

    // ✅ DEBUG: Erste Appointment prüfen
    if (appointments && appointments.length > 0) {
      console.log('🔍 First appointment data:', {
        id: appointments[0].id,
        title: appointments[0].title,
        type: appointments[0].type,
        event_type_code: appointments[0].event_type_code,
        appointment_type: appointments[0].event_type_code || 'lesson', // Verwende event_type_code als appointment_type
        start_time: appointments[0].start_time,
        duration_minutes: appointments[0].duration_minutes
      })
    } else {
      console.log('❌ NO APPOINTMENTS FOUND!')
      console.log('🔍 Debug info:', {
        actualUserId,
        tenant_id: userData.tenant_id,
        userRole: props.currentUser?.role || composableCurrentUser.value?.role
      })
    }
    
    if (error) throw error
    
    // Filtern: Admins sehen alle Termine (oder gefilterte), Staff nur eigene
    const filteredAppointments = (appointments || []).filter((apt) => {
      if (userRole === 'admin') {
        if (props.adminStaffFilter) {
          const isSelectedStaff = apt.staff_id === props.adminStaffFilter
          console.log('🔍 Admin staff filter check:', { aptStaffId: apt.staff_id, selectedStaff: props.adminStaffFilter, isSelectedStaff })
          return isSelectedStaff // Admin sieht nur Termine des ausgewählten Staff
        } else {
          console.log('🔍 Admin filter: showing all appointments')
          return true // Admin sieht alle Termine
        }
      } else {
        const isOwnAppointment = apt.staff_id === actualUserId
        console.log('🔍 Staff filter check:', { aptStaffId: apt.staff_id, actualUserId, isOwnAppointment })
        return isOwnAppointment // Staff nur eigene Termine
      }
    })
    
    console.log('✅ Filtered appointments:', filteredAppointments.length)
    
    // ✅ Location-Daten für ALLE Termine mit location_id laden (nicht nur für alte Termine)
    const locationIds = [...new Set(filteredAppointments
      .filter(apt => apt.location_id) // Alle Termine mit location_id
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
        console.log('📍 Locations data:', locations)
      }
    }
    
    const convertedEvents = filteredAppointments.map((apt) => {
      const isTeamInvite = apt.type === 'team_invite'
      
      // ✅ Event-Titel bestimmen
      let eventTitle = ''
      if (apt.type === 'lesson' || !apt.type) {
        // ✅ Location für den Titel bestimmen - Priorität: address > name (da address sauberer ist)
        const locationText = (apt as any).location_address || 
            (apt.location_id ? locationsMap[apt.location_id]?.address : '') ||
            (apt as any).location_name || 
            (apt.location_id ? locationsMap[apt.location_id]?.name : '') || ''
        
        const studentName = `${apt.user?.[0]?.first_name || ''} ${apt.user?.[0]?.last_name || ''}`.trim() || 'Fahrlektion'
        
        // ✅ Debug: Location-Daten loggen
        console.log('🔍 Location debug for appointment:', apt.id, {
          location_id: apt.location_id,
          location_name: (apt as any).location_name,
          location_address: (apt as any).location_address,
          locationsMap_data: apt.location_id ? locationsMap[apt.location_id] : 'no location_id',
          final_locationText: locationText
        })
        
        // ✅ Titel mit Location kombinieren falls vorhanden
        if (locationText) {
          eventTitle = `${studentName} - ${locationText}`
        } else {
          eventTitle = studentName
        }
      } else {
        eventTitle = apt.title || apt.type || 'Termin'
      }
      
      // ✅ Kategorie vom Appointment type Feld nehmen
      const category = apt.type || 'B'
      // ✅ Type korrekt setzen: Wenn type eine Kategorie ist, dann ist es eine Fahrstunde
      const eventType = (apt.type && ['B', 'A', 'A1', 'A35kW', 'BE', 'C', 'C1', 'CE', 'D', 'D1', 'Motorboot', 'BPT'].includes(apt.type)) ? 'lesson' : (apt.event_type_code || 'lesson')
      const eventColor = getEventColor(eventType, apt.status, category)
      
      // ✅ DEBUG: Event-Transformation
      console.log('🔄 Converting appointment to event:', {
        id: apt.id,
        type: apt.type,
        event_type_code: apt.event_type_code,
        category: category,
        eventType: eventType,
        title: eventTitle
      })
      
      // Convert UTC appointment times to local time for display
      // Appointments are stored in UTC, calendar expects local time
      const parseUTCTime = (utcTimeString: string) => {
        // Parse UTC ISO string and convert to local time
        const utcDate = new Date(utcTimeString)
        
        // Create a date object and format using toLocaleString with Zurich timezone
        const localString = utcDate.toLocaleString('sv-SE', {
          timeZone: 'Europe/Zurich',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
        
        // localString format: "2025-11-29 10:00:00"
        // Replace space with T to get ISO format: "2025-11-29T10:00:00"
        return localString.replace(' ', 'T')
      }
      
      const event = {
        id: apt.id,
        title: eventTitle,
        start: parseUTCTime(apt.start_time),
        end: parseUTCTime(apt.end_time),
        allDay: false,
        backgroundColor: eventColor,
        borderColor: eventColor,
        textColor: '#ffffff',
        // ✅ DEBUG: Zusätzliche Event-Daten direkt am Event-Objekt
        event_type_code: apt.event_type_code || 'lesson', // ✅ NEU: event_type_code direkt am Event
        type: apt.type, // ✅ NEU: type (Fahrzeugkategorie) direkt am Event
        user_id: apt.user_id,
        staff_id: apt.staff_id,
        location_id: apt.location_id,
        duration_minutes: apt.duration_minutes,
        status: apt.status,
        // ✅ Debug: Event-Farben direkt setzen
        classNames: [`category-${category}`],
        extendedProps: {
          // ✅ Location für 'other' Events wieder hinzufügen - gleiche Priorität wie im Titel
          location: (apt.location_id ? locationsMap[apt.location_id]?.address : '') || '',
          // ✅ Produktdaten für Wiederherstellung
          has_products: false, // Wird später gesetzt
          staff_note: apt.description || '',
          client_note: '',
          category: (apt as any).user?.category || apt.type || 'B',
          instructor: `${(apt as any).staff?.first_name || ''} ${(apt as any).staff?.last_name || ''}`.trim(),
          student: `${(apt as any).user?.first_name || ''} ${(apt as any).user?.last_name || ''}`.trim(),
          phone: (apt as any).user?.phone || '', // ✅ NEU: Phone für SMS-Benachrichtigungen
          email: (apt as any).user?.email || '', // ✅ NEU: Email für Email-Benachrichtigungen
          created_by: `${(apt as any).created_by_user?.first_name || ''} ${(apt as any).created_by_user?.last_name || ''}`.trim() || 'Unbekannt',
          price: 0, // Preis wird nicht mehr in appointments gespeichert
          user_id: apt.user_id,
          staff_id: apt.staff_id,
          location_id: apt.location_id,
          duration_minutes: apt.duration_minutes,
          status: apt.status,
          appointment_type: apt.event_type_code || 'lesson', // ✅ KORRIGIERT: event_type_code verwenden
          is_team_invite: isTeamInvite,
          original_type: (apt as any).user?.category || apt.type || 'B',
          eventType: (apt.type && ['B', 'A', 'A1', 'A35kW', 'BE', 'C', 'C1', 'CE', 'D', 'D1', 'Motorboot', 'BPT'].includes(apt.type)) ? 'lesson' : (apt.event_type_code || 'lesson') // ✅ KORRIGIERT: event_type_code für eventType verwenden
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
// ✅ Caching für bessere Performance
const lastLoadTime = ref<number>(0)
const CACHE_DURATION = 30000 // 30 Sekunden Cache

// ✅ Cache-Invalidierung für bessere Performance
const invalidateCache = () => {
  lastLoadTime.value = 0
  console.log('🔄 Calendar cache invalidated')
}

const loadAppointments = async (forceReload = false) => {
  // ✅ Prüfen ob Komponente noch mounted ist
  if (!calendar.value) {
    console.log('⚠️ Calendar not mounted, skipping load')
    return
  }
  
  // ✅ Zusätzliche Sicherheitsprüfung: Ist die Komponente noch aktiv?
  if (isUpdating.value) {
    console.log('⚠️ Calendar update already in progress, skipping load')
    return
  }

  // ✅ Cache-Check: Nur neu laden wenn nötig
  const now = Date.now()
  if (!forceReload && (now - lastLoadTime.value) < CACHE_DURATION) {
    console.log('⚡ Using cached calendar data (last load:', Math.round((now - lastLoadTime.value) / 1000), 'seconds ago)')
    return
  }
  
  isLoadingEvents.value = true
  isUpdating.value = true
  
  try {
    console.log('🔄 Loading all calendar events...', forceReload ? '(forced reload)' : '(cached check)')
    
    // ✅ Externe Kalender synchronisieren BEVOR Termine geladen werden
    console.log('🔄 Syncing external calendars before loading appointments...')
    try {
      const { autoSyncCalendars } = useExternalCalendarSync()
      const syncResult = await autoSyncCalendars(props.currentUser?.id)
      if (syncResult.success && !syncResult.skipped) {
        console.log('✅ External calendars synced successfully')
      } else if (syncResult.skipped) {
        console.log('⏭️ External calendar sync skipped (cooldown or already running)')
      }
    } catch (syncError) {
      console.warn('⚠️ External calendar sync failed (non-fatal):', syncError)
      // Sync-Fehler sind nicht fatal, wir laden trotzdem die Termine
    }
    
    // Get current calendar view for date range (immer aktuell bei jedem Aufruf)
    const calendarApi = calendar.value?.getApi()
    const currentView = calendarApi?.view
    const viewStart = currentView?.activeStart || new Date()
    const viewEnd = currentView?.activeEnd || new Date()
    
    console.log('📅 Loading events for view range:', viewStart, 'to', viewEnd)
    
    // Parallel laden (mit aktuellen View-Daten)
    const [appointments, externalBusyEvents, nonWorkingHoursEvents] = await Promise.all([
      loadRegularAppointments(),
      loadExternalBusyTimes(),
      loadNonWorkingHoursBlocks(props.currentUser?.id || '', viewStart, viewEnd),
    ])
    
    // ✅ Sicherheitsprüfung: Ist die Komponente noch mounted?
    if (!calendar.value) {
      console.log('⚠️ Calendar unmounted during load, aborting')
      return
    }
    
    console.log('🕐 Non-working hours blocks loaded:', nonWorkingHoursEvents.length)
    
    // Kombinieren
    const allEvents = [...appointments, ...nonWorkingHoursEvents, ...externalBusyEvents]
    calendarEvents.value = allEvents
    lastLoadTime.value = now // ✅ Cache-Zeit aktualisieren
    
    console.log('✅ Final calendar summary:', {
      appointments: appointments.length,
      nonWorkingHours: nonWorkingHoursEvents.length,
      externalBusy: externalBusyEvents.length,
      total: allEvents.length,
      cacheTime: new Date(lastLoadTime.value).toLocaleTimeString()
    })
    
    // ✅ DEBUG: Zeige alle Events
    console.log('🔍 ALL EVENTS:', allEvents)
    if (appointments.length > 0) {
      console.log('🔍 FIRST APPOINTMENT EVENT:', appointments[0])
    }
    
    // ✅ Prüfen ob Komponente noch mounted ist bevor Calendar API aufrufen
    if (calendar.value?.getApi) {
      try {
        const calendarApi = calendar.value.getApi()
        
        // ✅ Zusätzliche Sicherheitsprüfung: Ist der Calendar API noch gültig?
        if (!calendarApi || typeof calendarApi.getEvents !== 'function') {
          console.log('⚠️ Calendar API not ready, skipping event update')
          return
        }
        
        // ✅ Events immer neu laden (verschiedene Wochen haben gleiche Anzahl)
        console.log('🔄 Updating calendar events...')
        calendarApi.removeAllEvents()
        calendarApi.addEventSource(calendarEvents.value)
        console.log('✅ Calendar events updated successfully')
      } catch (error) {
        console.error('❌ Error updating calendar events:', error)
        // ✅ Fehler nicht weiterwerfen, nur loggen
      }
    }
  } catch (error) {
    console.error('❌ Error loading calendar events:', error)
    // ✅ Fehler nicht weiterwerfen, nur loggen
  } finally {
    isLoadingEvents.value = false
    isUpdating.value = false
  }
}

// ✅ Helper-Funktion für Event-Farben
const getEventColor = (type: string, status?: string, category?: string): string => {
  // ✅ Kategorie-basierte Farben für Fahrstunden
  const categoryColors = {
    'B': '#10b981',      // Grün für Auto
    'A': '#f59e0b',      // Orange für Motorrad
    'A1': '#f59e0b',     // Orange für Motorrad A1
    'A35kW': '#f59e0b',  // Orange für Motorrad A35kW
    'BE': '#3b82f6',     // Blau für Anhänger
    'C': '#8b5cf6',      // Lila für LKW
    'C1': '#8b5cf6',     // Lila für LKW C1
    'CE': '#ef4444',     // Rot für LKW CE
    'D': '#06b6d4',      // Cyan für Bus
    'D1': '#06b6d4',     // Cyan für Bus D1
    'Motorboot': '#1d4ed8', // Dunkelblau für Motorboot
    'BPT': '#10b981'     // Grün für BPT
  }
  
  // ✅ Typ-basierte Farben für andere Termine (dunklere Farben für bessere Sichtbarkeit)
  const typeColors = {
    'lesson': '#10b981',      // Grün für Fahrstunden
    'exam': '#f59e0b',        // Orange für Prüfungen  
    'theory': '#3b82f6',      // Blau für Theorie
    'meeting': '#7c3aed',     // Dunkel-Lila für Meetings
    'break': '#475569',       // Dunkelgrau für Pausen
    'training': '#ea580c',    // Dunkel-Orange für Training
    'maintenance': '#dc2626', // Dunkel-Rot für Wartung
    'admin': '#0891b2',       // Dunkel-Cyan für Admin
    'team_invite': '#0284c7', // Blau für Team-Einladungen
    'vku': '#059669',         // Grün für VKU
    'nothelfer': '#d97706',   // Bernstein für Nothelfer
    'other': '#374151'        // Dunkelgrau für Sonstiges
  }
  
  // ✅ Default-Farbe für alle Events ohne spezifische Kategorie/Typ
  const defaultColor = '#4b5563' // Dunkles neutrales Grau
  
  let baseColor = defaultColor
  
  // ✅ Priorität 1: Typ-basierte Farbe (für other event types)
  if (type && typeColors[type as keyof typeof typeColors]) {
    baseColor = typeColors[type as keyof typeof typeColors]
  }
  // ✅ Priorität 2: Kategorie-basierte Farbe (für Fahrstunden) - überschreibt Typ-Farbe
  else if (category && categoryColors[category as keyof typeof categoryColors]) {
    baseColor = categoryColors[category as keyof typeof categoryColors]
  }
  
  // ✅ Status-basierte Anpassungen (überschreibt alles)
  if (status === 'completed') {
    baseColor = '#22c55e' // Helles Grün für abgeschlossene Termine
  }
  // ✅ cancelled Events behalten ihre normale Farbe
  
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
const sendSmsOnDrop = ref(true) // ✅ NEU: State für SMS-Checkbox beim Verschieben

// Neue Hilfsfunktion:
const openNewAppointmentModal = (arg: any) => {
  try {
    // ✅ Sicherheitsprüfung: Ist der Calendar noch mounted?
    if (!calendar.value) {
      console.log('⚠️ Calendar not mounted, skipping modal open')
      return
    }
    
    // ✅ Sicherheitsprüfung: Ist bereits ein Modal offen?
    if (isModalVisible.value) {
      console.log('⚠️ Modal already visible, skipping new modal')
      return
    }
    
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
        appointment_type: 'lesson', // ✅ Explizit auf 'lesson' setzen
        isNewAppointment: true
      }
    }
    
    console.log('✅ FREE SLOT: Modal opened with clean data (no student preselection)')
    
  } catch (error) {
    console.error('❌ Error opening new appointment modal:', error)
    // ✅ Fehler nicht weiterwerfen, nur loggen
    
    // ✅ Fallback: Modal schließen falls es geöffnet wurde
    isModalVisible.value = false
  }
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
      
      // ✅ WICHTIG: Nicht versuchen, extendedProps direkt zu mutieren (read-only!)
      // Stattdessen: Kalender neu laden um frische Daten zu bekommen
      console.log('🔄 Invalidating cache and reloading appointments...')
      invalidateCache()
      isUpdating.value = true
      await loadAppointments()
      isUpdating.value = false
      refreshCalendar()
      
      // ✅ NEU: Immer SMS UND EMAIL versenden (kein Checkbox mehr)
      const phoneNumber = dropInfo.event.extendedProps?.phone
      const studentEmail = dropInfo.event.extendedProps?.email
      const studentName = dropInfo.event.extendedProps?.student || 'Fahrschüler'
      const firstName = studentName?.split(' ')[0] || studentName
      const newTime = newStartTime
      
      // SMS versenden
      if (phoneNumber) {
        console.log('📱 Sending SMS notification for rescheduled appointment...')
        try {
          const result = await $fetch('/api/sms/send', {
            method: 'POST',
            body: {
              phone: phoneNumber,
              message: `Hallo ${firstName},\n\ndein Termin wurde verschoben auf:\n${newTime}\n\nViele Grüße`
            }
          })
          console.log('✅ SMS sent successfully:', result)
        } catch (smsError: any) {
          console.error('❌ Failed to send SMS:', smsError)
        }
      } else {
        console.log('⚠️ No phone number available for SMS')
      }
      
      // Email versenden
      if (studentEmail) {
        console.log('📧 Sending Email notification for rescheduled appointment...')
        try {
          const result = await $fetch('/api/email/send-appointment-notification', {
            method: 'POST',
            body: {
              email: studentEmail,
              studentName: studentName,
              appointmentTime: newTime,
              type: 'rescheduled'
            }
          })
          console.log('✅ Email sent successfully:', result)
        } catch (emailError: any) {
          console.error('❌ Failed to send Email:', emailError)
        }
      } else {
        console.log('⚠️ No email address available for email notification')
      }
      
      // Modal aktualisieren falls offen
      if (isModalVisible.value && modalEventData.value?.id === dropInfo.event.id) {
        console.log('📝 Updating modal data...')
        modalEventData.value = {
          ...modalEventData.value,
          start: dropInfo.event.startStr,
          end: dropInfo.event.endStr
        }
      }
      
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

  // ✅ ENTFERNT: sendSmsOnDrop.value = true (nicht mehr nötig, SMS wird immer versendet)

showConfirmDialog({
  title: 'Termin verschieben',
  message: 'Möchten Sie diesen Termin wirklich verschieben?',
  details: `
    <strong>Termin:</strong> ${dropInfo.event.title}<br>
    <strong>Neue Zeit:</strong> ${newStartTime} - ${newEndTime}<br>
    <strong>Fahrschüler:</strong> ${studentName}<br><br>
    
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div class="text-sm text-blue-800">
        📱 Der Fahrschüler wird per SMS und E-Mail über die Terminverschiebung informiert.
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
    slotMaxTime: '23:30:00',
    firstDay: 1,
    displayEventTime: false,
    forceEventDuration: true, 
    selectable: true,
    editable: true,
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    headerToolbar: {
      left: 'customTitle',
      center: 'viewSwitcher',
      right: 'prev,next today'
    },
    customButtons: {
      customTitle: {
        text: '',
        click: () => {
          showDatePicker.value = !showDatePicker.value
        }
      },
      viewSwitcher: {
        text: 'Tag',
        click: switchView
      }
    },
    events: calendarEvents.value,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
    // Bei Wochenwechsel Cache invalidieren und neu laden
    datesSet: () => {
      updateCustomTitle() // Update Jahr im Header
      
      if (isInitialLoad.value) {
        isInitialLoad.value = false
        console.log('📅 Initial load, skipping datesSet reload')
        return
      }
      console.log('📅 Week changed, reloading events (auto-sync every 5min)')
      invalidateCache()
      refreshCalendar()
    },
  // Klick auf leeren Zeitslot

// In der dateClick Funktion im calendarOptions:
dateClick: (arg) => {
  try {
    // ✅ Sicherheitsprüfung: Ist der Calendar noch mounted?
    if (!calendar.value) {
      console.log('⚠️ Calendar not mounted, skipping date click')
      return
    }
    
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
        // ✅ Zusätzliche Sicherheitsprüfung vor dem Setzen des Modals
        if (calendar.value) {
          showClipboardChoice.value = true
          console.log('✅ Choice modal set to visible with timeout:', showClipboardChoice.value)
        } else {
          console.log('⚠️ Calendar unmounted during timeout, skipping modal show')
        }
      }, 10) // Kleine Verzögerung um Race Conditions zu vermeiden
      
      return
    }
    
    console.log('➕ No clipboard, opening new appointment modal')
    openNewAppointmentModal(arg)
    
  } catch (error) {
    console.error('❌ Error handling date click:', error)
    // ✅ Fehler nicht weiterwerfen, nur loggen
  }
},

eventContent: (arg) => {
  const extendedProps = arg.event.extendedProps
  const location = extendedProps?.location || ''
  const eventType = arg.event.extendedProps?.eventType || 'lesson'
  const student = extendedProps?.student || ''
  
  if (eventType === 'lesson') {
    // ✅ Bei Fahrstunden: Name und Treffpunkt anzeigen
    return {
      html: `
        <div class="custom-event">
          <div class="event-name">${student}</div>
          ${location ? `<div class="event-location">${location}</div>` : ''}
        </div>
      `
    }
  } else {
    // ✅ Bei 'other' Events: Titel und Location anzeigen
    const showLocation = location || eventType === 'other'
    return {
      html: `
        <div class="custom-event">
          <div class="event-name">${arg.event.title}</div>
          ${showLocation ? `<div class="event-location">${location || 'Kein Ort'}</div>` : ''}
        </div>
      `
    }
  }
},

// Klick auf existierenden Termin
eventClick: (clickInfo) => {
  try {
    // ✅ Sicherheitsprüfung: Ist der Calendar noch mounted?
    if (!calendar.value) {
      console.log('⚠️ Calendar not mounted, skipping event click')
      return
    }
    
    const appointmentData = calendarEvents.value.find(evt => evt.id === clickInfo.event.id)
    
    if (!appointmentData) {
      console.warn('⚠️ Appointment data not found for event:', clickInfo.event.id)
      return
    }

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
    
    console.log('✅ Event click handled successfully:', clickInfo.event.title)
  } catch (error) {
    console.error('❌ Error handling event click:', error)
    // ✅ Fehler nicht weiterwerfen, nur loggen
  }
},

// Ziehen/Auswählen von Zeitbereich
select: (arg) => {
  try {
    // ✅ Sicherheitsprüfung: Ist der Calendar noch mounted?
    if (!calendar.value) {
      console.log('⚠️ Calendar not mounted, skipping select')
      return
    }
    
    isModalVisible.value = true
    modalMode.value = 'create'
    modalEventData.value = {
      title: '',
      start: arg.start,
      end: arg.end,
      allDay: arg.allDay
    }
    
    console.log('✅ Time range selection handled successfully')
  } catch (error) {
    console.error('❌ Error handling time range selection:', error)
    // ✅ Fehler nicht weiterwerfen, nur loggen
  }
},
  eventClassNames: (arg) => {
  const category = arg.event.extendedProps?.category || 'default'
  // ✅ Sicherheitsprüfung: category muss ein String sein
  const categoryString = typeof category === 'string' ? category : 'default'
  return [`category-${categoryString.toLowerCase()}`]
},
})

let calendarApi: any = null

// 🔥 NEU: Refresh Function hinzufügen
const refreshCalendar = async () => {
  console.log('🔄 CalendarComponent - Refreshing calendar...')
  
  try {
    // ✅ Sicherheitsprüfung: Ist der Calendar noch mounted?
    if (!calendar.value) {
      console.log('⚠️ Calendar not mounted, skipping refresh')
      return
    }
    
    // ✅ Sicherheitsprüfung: Ist bereits ein Update im Gange?
    if (isUpdating.value) {
      console.log('⚠️ Calendar update already in progress, skipping refresh')
      return
    }
    
    // 0. Cache invalidieren
    invalidateCache()
    console.log('🔄 Cache invalidated for refresh')
    
    // 1. Aktuelle View-Position speichern
    const currentDate = calendar.value?.getApi()?.getDate()
    
    // 2. Daten neu laden mit forceReload = true (Cache umgehen)
    await Promise.all([
      loadAppointments(true),
    ])
    
    // ✅ Sicherheitsprüfung: Ist der Calendar noch mounted nach dem Laden?
    if (!calendar.value) {
      console.log('⚠️ Calendar unmounted during refresh, aborting')
      return
    }
    
    // 3. Warte einen Moment für State-Updates
    await nextTick()
    
    // 4. FullCalendar wird automatisch durch die watch(calendarEvents) aktualisiert
    console.log('✅ Calendar data refreshed')
    
    // 5. View-Position wiederherstellen falls nötig
    if (currentDate && calendar.value?.getApi) {
      try {
        const api = calendar.value.getApi()
        
        // ✅ Zusätzliche Sicherheitsprüfung: Ist der API noch gültig?
        if (!api || typeof api.getDate !== 'function') {
          console.log('⚠️ Calendar API not ready, skipping position restore')
          return
        }
        
        const currentViewDate = api.getDate()
        
        // Nur wiederherstellen falls sich Position geändert hat
        if (Math.abs(currentDate.getTime() - currentViewDate.getTime()) > 24 * 60 * 60 * 1000) {
          api.gotoDate(currentDate)
          console.log('✅ View position restored to:', currentDate)
        }
      } catch (error) {
        console.error('❌ Error restoring view position:', error)
        // ✅ Fehler nicht weiterwerfen, nur loggen
      }
    }
    
  } catch (error) {
    console.error('❌ Error during calendar refresh:', error)
    // ✅ Fehler nicht weiterwerfen, nur loggen
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
    console.log('🔍 Final category:', category)
    
    // ✅ APPOINTMENTS-DATEN (alle Pflichtfelder basierend auf Schema)
    // ⚠️ WICHTIG: FullCalendar gibt lokale Zeit zurück (z.B. 09:00 GMT+0100)
    // Wir müssen das in UTC konvertieren für die Datenbank
    // UTC = Local - Offset (mit Zurich offset als POSITIVE Zahl berechnet, nicht getTimezoneOffset!)
    const convertToUTC = (localDate: Date): string => {
      // Get Zurich timezone offset at this date (1 for winter, 2 for summer)
      const year = localDate.getFullYear()
      const month = localDate.getMonth()
      const day = localDate.getDate()
      const midnightUTC = new Date(Date.UTC(year, month, day, 0, 0, 0))
      
      // Calculate what Zurich time is when UTC is midnight
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Zurich',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      
      const zurichMidnightStr = formatter.format(midnightUTC)
      const match = zurichMidnightStr.match(/(\d{2}):(\d{2}):(\d{2})$/)
      const zurichHour = match ? parseInt(match[1]) : 1 // 1 for winter, 2 for summer
      
      // Parse local time
      const hours = localDate.getHours()
      const minutes = localDate.getMinutes()
      const seconds = localDate.getSeconds()
      
      // Convert: UTC = Local - Offset
      let utcHours = hours - zurichHour
      let utcDay = day
      
      // Handle day wrap-around
      if (utcHours < 0) {
        utcHours += 24
        utcDay -= 1
      }
      if (utcHours >= 24) {
        utcHours -= 24
        utcDay += 1
      }
      
      const paddedYear = year
      const paddedMonth = String(month + 1).padStart(2, '0')
      const paddedDay = String(utcDay).padStart(2, '0')
      const paddedHours = String(utcHours).padStart(2, '0')
      const paddedMinutes = String(minutes).padStart(2, '0')
      const paddedSeconds = String(seconds).padStart(2, '0')
      
      const result = `${paddedYear}-${paddedMonth}-${paddedDay}T${paddedHours}:${paddedMinutes}:${paddedSeconds}`
      
      console.log('🔄 convertToUTC:', {
        input: localDate.toString(),
        zurichOffset: zurichHour,
        hours: hours,
        utcHours: utcHours,
        utcDay: utcDay,
        output: result,
        expected_local_time: localDate.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
      })
      return result
    }
    
    const appointmentData = {
      // Basis-Felder (NOT NULL)
      title: clipboardAppointment.value.title || 'Kopierter Termin',
      description: clipboardAppointment.value.description || '-',
      user_id: clipboardAppointment.value.user_id,
      staff_id: clipboardAppointment.value.staff_id || props.currentUser?.id,
      location_id: clipboardAppointment.value.location_id,
      
      // Zeit-Felder (NOT NULL) - MUSS UTC sein!
      start_time: convertToUTC(clickedDate), // ✅ Removed +1 hour quick fix - use exact clicked time
      end_time: convertToUTC(endDate), // ✅ Removed +1 hour quick fix - use exact end time
      duration_minutes: clipboardAppointment.value.duration || 45,
      
      // Typ-Felder (NOT NULL)
      type: category,
      status: 'pending_confirmation',
      
      // Optional aber wichtig
      event_type_code: clipboardAppointment.value.event_type_code || 'lesson',
      tenant_id: props.currentUser?.tenant_id || clipboardAppointment.value.tenant_id,
      
      // Note: Pricing, payments, discounts, products werden über separates Payment-System verwaltet
    }
    
    // ✅ FINALE DEBUG-AUSGABE
    console.log('💾 FINAL appointmentData before save:', appointmentData)
    
    // Direkt in Datenbank speichern
    const { data: newAppointment, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single()
    
    if (error) throw error
    
    console.log('✅ Appointment pasted successfully:', newAppointment.id)
    
    // ✅ NEU: Email "Bestätigung erforderlich" versenden
    const studentEmail = clipboardAppointment.value.email
    const studentName = clipboardAppointment.value.student || 'Fahrschüler'
    const appointmentTime = new Date(clickedDate).toLocaleString('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    if (studentEmail) {
      console.log('📧 Sending confirmation email for pasted appointment...')
      try {
        const result = await $fetch('/api/email/send-appointment-notification', {
          method: 'POST',
          body: {
            email: studentEmail,
            studentName: studentName,
            appointmentTime: appointmentTime,
            type: 'pending_confirmation'
          }
        })
        console.log('✅ Confirmation email sent successfully:', result)
      } catch (emailError: any) {
        console.error('❌ Failed to send confirmation email:', emailError)
        // Nicht kritisch, Termin wurde trotzdem erstellt
      }
    } else {
      console.log('⚠️ No email address available for confirmation email')
    }
    
    // ✅ Payment erstellen (basierend auf pricing_rules)
    const basePriceMapping: Record<string, number> = {
      'B': 95, 'A': 95, 'A1': 95, 'BE': 120, 'C': 170, 
      'C1': 150, 'D': 200, 'CE': 200, 'Motorboot': 120, 'BPT': 95
    }
    
    const durationUnits = Math.ceil((newAppointment.duration_minutes || 45) / 45)
    const basePriceChf = (basePriceMapping[category] || 95) * durationUnits
    const lessonPriceRappen = Math.round(basePriceChf * 100)
    
    // ✅ NEU: Admin Fee basierend auf pricing_rules berechnen
    let adminFeeRappen = 0
    try {
      // Zähle wie viele Termine dieser Kunde bereits hat (für diesen Staff)
      const { data: existingAppointments, error: countError } = await supabase
        .from('appointments')
        .select('id')
        .eq('user_id', newAppointment.user_id)
        .eq('staff_id', newAppointment.staff_id)
        .is('deleted_at', null)
        .neq('id', newAppointment.id) // Exclude the one we just created
      
      const appointmentCount = existingAppointments?.length || 0
      console.log('📊 Existing appointments for user:', appointmentCount)
      
      // Lade pricing rule für diese Kategorie
      const { data: pricingRules, error: rulesError } = await supabase
        .from('pricing_rules')
        .select('admin_fee_rappen, admin_fee_applies_from')
        .eq('category_code', category)
        .eq('rule_type', 'admin_fee')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (pricingRules && pricingRules.admin_fee_applies_from) {
        // Admin Fee wird NUR bei Termin N verrechnet (z.B. nur beim 2. Termin)
        // appointmentCount ist die Anzahl BESTEHENDER Termine
        // Der neue Termin ist Termin Nummer: appointmentCount + 1
        const newAppointmentNumber = appointmentCount + 1
        
        if (newAppointmentNumber === pricingRules.admin_fee_applies_from) {
          adminFeeRappen = pricingRules.admin_fee_rappen || 0
          console.log('✅ Admin fee applies (appointment #' + newAppointmentNumber + '):', adminFeeRappen)
        } else {
          console.log('ℹ️ Admin fee does not apply (appointment #' + newAppointmentNumber + ', only applies at #' + pricingRules.admin_fee_applies_from + ')')
        }
      }
    } catch (err) {
      console.error('❌ Error calculating admin fee:', err)
    }
    
    const paymentData = {
      appointment_id: newAppointment.id,
      user_id: newAppointment.user_id,
      staff_id: newAppointment.staff_id,
      tenant_id: newAppointment.tenant_id,
      lesson_price_rappen: lessonPriceRappen,
      admin_fee_rappen: adminFeeRappen, // ✅ Berechnet basierend auf pricing_rules
      products_price_rappen: 0,
      discount_amount_rappen: 0,
      total_amount_rappen: lessonPriceRappen + adminFeeRappen, // ✅ Total mit admin_fee
      payment_method: clipboardAppointment.value.payment_method || 'invoice', // ✅ Verwende kopierten payment_method
      payment_status: 'pending',
      currency: 'CHF',
      description: `Kopierter Termin: ${newAppointment.title}`,
      created_by: props.currentUser?.id,
      credit_used_rappen: 0
    }
    
    const { error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
    
    if (paymentError) {
      console.error('⚠️ Error creating payment for copied appointment:', paymentError)
      // Nicht kritisch, Termin wurde trotzdem erstellt
    } else {
      console.log('✅ Payment created for copied appointment')
    }
    
    // Cleanup
    showClipboardChoice.value = false
    pendingSlotClick.value = null
    
    // ✅ Cache invalidieren damit loadAppointments nicht gecacht wird
    invalidateCache()
    
    // Kalender neu laden und direkt aktualisieren
    console.log('🔄 Reloading calendar after paste...')
    await loadAppointments(true) // Force reload
    
    // ✅ Erfolgs-Nachricht
    showToast('✅ Termin erfolgreich eingefügt')
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

// ✅ NEUE FUNKTION: 5-Minuten-Timeout für Clipboard starten
const startClipboardTimeout = () => {
  // Vorheriges Timeout löschen falls vorhanden
  if (clipboardTimeout.value) {
    clearTimeout(clipboardTimeout.value)
    clipboardTimeout.value = null
  }
  
  // 5-Minuten-Timeout starten (5 * 60 * 1000 = 300000ms)
  clipboardTimeout.value = setTimeout(() => {
    console.log('⏰ 5-Minuten-Timeout erreicht - Clipboard wird geleert')
    clipboardAppointment.value = null
    clipboardTimeout.value = null
  }, 5 * 60 * 1000)
  
  console.log('⏰ 5-Minuten-Timeout für Clipboard gestartet')
}

// Copy Handler anpassen:
const handleOpenStudentProgress = async (student: any) => {
  console.log('👤 Opening student progress for:', student)
  
  // Schließe EventModal
  isModalVisible.value = false
  
  // Öffne EnhancedStudentModal mit Fortschritt-Tab
  selectedStudentForProgress.value = student
  studentProgressActiveTab.value = 'progress'
  showEnhancedStudentModal.value = true
}

const handleCopyAppointment = async (copyData: any) => {
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
  
  // ✅ Fetch payment_method vom Payment-Record
  let paymentMethod = 'invoice' // Default
  console.log('🔍 Fetching payment for appointment:', copyData.eventData.id)
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .select('payment_method')
      .eq('appointment_id', copyData.eventData.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    console.log('💳 Payment fetch result:', { payment, error })
    
    if (!error && payment) {
      paymentMethod = payment.payment_method
      console.log('✅ Payment method fetched from DB:', paymentMethod)
    } else if (error) {
      console.warn('⚠️ Error fetching payment:', error)
    } else {
      console.warn('⚠️ No payment found for appointment')
    }
  } catch (err) {
    console.warn('⚠️ Could not fetch payment method:', err)
  }
  
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
        payment_method: paymentMethod, // ✅ Von DB geladen
  }
  
  console.log('✅ Termin in Zwischenablage gespeichert:', clipboardAppointment.value)
  
  // ✅ 5-Minuten-Timeout starten
  startClipboardTimeout()
}

const cancelClipboardChoice = () => {
  console.log('❌ Cancelling clipboard choice')
  showClipboardChoice.value = false
  pendingSlotClick.value = null
}

// ✅ Cleanup beim Verlassen der Komponente
onUnmounted(() => {
  if (clipboardTimeout.value) {
    clearTimeout(clipboardTimeout.value)
    clipboardTimeout.value = null
    console.log('🧹 Clipboard timeout cleared on unmount')
  }
  
  // Clear sync interval
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('🧹 Sync interval cleared on unmount')
  }
  detachSwipe()
})

onMounted(async () => {
  try {
    console.log('📅 CalendarComponent mounted')
    isCalendarReady.value = true
    attachSwipe()
    
    // 🔥 NEU: Calendar API Setup
    await nextTick()
    
    // ✅ Sicherheitsprüfung: Ist die Komponente noch mounted?
    if (!calendar.value) {
      console.log('⚠️ Calendar ref not available during mount')
      return
    }
    
    calendarApi = calendar.value.getApi()
    console.log('✅ Calendar API initialized')
    
    // ✅ Sicherheitsprüfung: Ist der API gültig?
    if (calendarApi && typeof calendarApi.view?.currentStart !== 'undefined') {
      emit('view-updated', calendarApi.view.currentStart)
    }
    
    // ✅ Auto-Sync alle 5 Minuten starten (nur als Backup, da wir jetzt bei jedem loadAppointments syncen)
    const { autoSyncCalendars } = useExternalCalendarSync()
    syncInterval = setInterval(async () => {
      console.log('⏰ Auto-sync interval triggered (every 5 min) - backup sync')
      try {
        const result = await autoSyncCalendars(props.currentUser?.id)
        if (result.success && !result.skipped) {
          console.log('✅ Auto-sync completed, reloading events')
          invalidateCache()
          await loadAppointments(true) // Force reload nach Sync
        }
      } catch (err) {
        console.warn('Auto-sync interval failed (non-fatal):', err)
      }
    }, 5 * 60 * 1000) // 5 Minuten
    console.log('✅ Auto-sync interval started (every 5 min) - backup sync')
    
    console.log('🔄 Initial appointment loading...')
    await loadAppointments()
    
    
  } catch (error) {
    console.error('❌ Error during CalendarComponent mount:', error)
    // ✅ Fehler nicht weiterwerfen, nur loggen
    
    // ✅ Fallback: Calendar als nicht bereit markieren
    isCalendarReady.value = false
  }
})




// Watch for admin staff filter changes
watch(() => props.adminStaffFilter, async (newFilter) => {
  console.log('🔄 Admin staff filter changed:', newFilter)
  if (props.currentUser?.role === 'admin') {
    invalidateCache() // ✅ Cache invalidieren bei Filter-Änderungen
    await loadAppointments(true) // ✅ Force reload
  }
}, { immediate: false })

// ✅ Watch für User-Änderungen mit Cache-Invalidierung
watch(() => props.currentUser, async (newUser, oldUser) => {
  if (newUser && newUser.id !== oldUser?.id) {
    console.log('🔄 User changed, invalidating cache and reloading')
    invalidateCache()
    await loadAppointments(true)
  }
}, { deep: true })

watch(calendarEvents, (newEvents) => {
  try {
    console.log('🔄 calendarEvents changed, updating FullCalendar:', newEvents.length)
    
    // ✅ Prüfen ob Komponente noch mounted ist
    if (!calendar.value?.getApi) {
      console.log('⚠️ Calendar not ready, skipping event update')
      return
    }
    
    try {
      const api = calendar.value.getApi()
      
      // ✅ Zusätzliche Sicherheitsprüfung: Ist der API noch gültig?
      if (!api || typeof api.getEvents !== 'function') {
        console.log('⚠️ Calendar API not ready, skipping event update')
        return
      }
      
      // ✅ FIX: Events nur aktualisieren wenn nötig
      const currentEvents = api.getEvents()
      if (currentEvents.length !== newEvents.length) {
        console.log('🔄 Updating calendar events...')
        api.removeAllEvents()
        api.removeAllEventSources()
        newEvents.forEach(event => api.addEvent(event))
        console.log('✅ Calendar events updated successfully')
      }
    } catch (error) {
      console.error('❌ Error updating calendar events:', error)
      // ✅ Fehler nicht weiterwerfen, nur loggen
    }
  } catch (error) {
    console.error('❌ Error in calendarEvents watcher:', error)
    // ✅ Fehler nicht weiterwerfen, nur loggen
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
  <div class="relative" ref="rootEl">
    <!-- Loading Overlay -->
    <div v-if="isLoadingEvents" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
        <p class="text-gray-600">Termine werden geladen...</p>
      </div>
    </div>
    
    <!-- Date Picker Backdrop -->
    <div v-if="showDatePicker" @click="showDatePicker = false" class="fixed inset-0 z-40"></div>
    
    <!-- Date Picker Dropdown -->
    <div v-if="showDatePicker" class="absolute top-16 left-4 bg-white shadow-xl rounded-lg p-4 z-50 border border-gray-200 w-64">
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="(monthName, index) in ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']"
          :key="index"
          @click="jumpToDate(currentYear, index)"
          class="px-3 py-2 text-sm hover:bg-blue-100 rounded transition-colors font-medium text-gray-700"
        >
          {{ monthName }}
        </button>
      </div>
      <div class="mt-3 pt-3 border-t flex items-center justify-between">
        <button @click="currentYear--" class="px-3 py-1 hover:bg-gray-100 rounded font-bold text-gray-700">◀</button>
        <span class="font-bold text-lg text-gray-800">{{ currentYear }}</span>
        <button @click="currentYear++" class="px-3 py-1 hover:bg-gray-100 rounded font-bold text-gray-700">▶</button>
      </div>
    </div>
    
    <FullCalendar
      v-if="isCalendarReady"
      ref="calendar"
      :options="calendarOptions"
    />
    
    <div v-else>
      Kalender wird geladen...
    </div>
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
  @open-student-progress="handleOpenStudentProgress"
  @refresh-calendar="() => { invalidateCache(); loadAppointments(true); }"
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

      <!-- Geklickter Zeitslot Info -->
      <div v-if="pendingSlotClick" class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div class="text-sm">
          <div class="font-medium text-green-900 mb-1">Einfügen am:</div>
          <div class="text-green-700 text-xs space-y-1">
            <div>📅 {{ pendingSlotClick.date.toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</div>
            <div>🕐 {{ pendingSlotClick.date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) }}</div>
          </div>
        </div>
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

  <!-- EnhancedStudentModal für Schüler-Fortschritt -->
  <EnhancedStudentModal
    v-if="showEnhancedStudentModal"
    :selected-student="selectedStudentForProgress"
    :initial-tab="studentProgressActiveTab"
    :current-user="props.currentUser"
    @close="() => { showEnhancedStudentModal = false; selectedStudentForProgress = null }"
  />

</template>

<style>
/* === KALENDER BASIS === */
.fc {
  background-color: white !important;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  /* Use small viewport height to avoid iOS browser chrome overlay */
  height: calc(100svh - 50px - env(safe-area-inset-bottom, 0px));
  margin: 0 !important;
}

/* === NICHT-ARBEITSZEITEN BLÖCKE (grau für blockierte Zeit) === */
/* Nicht-Arbeitszeit-Blöcke (hellgrau hinterlegt, durchklickbar) */
.non-working-hours-block {
  opacity: 0.5 !important; /* Halbtransparent für dezente Darstellung */
  pointer-events: none !important; /* Durchklickbar */
  z-index: 0 !important; /* Niedrigere z-index damit Termine darüber erscheinen */
  border: none !important;
  box-shadow: none !important;
}

/* External Busy Times (helles Lila, durchklickbar) */
.external-busy-block {
  opacity: 0.4 !important; /* Noch dezenter */
  pointer-events: none !important; /* Durchklickbar */
  z-index: 0 !important;
  border: none !important;
  box-shadow: none !important;
}

/* Kalender-Hintergrund auf weiß setzen */
.fc-timegrid-slot {
  background-color: #ffffff !important;
}

.fc-timegrid-body {
  background-color: #ffffff !important;
}

.fc-timegrid {
  background-color: #ffffff !important;
}

/* CSS überschreibt nicht die backgroundColor - kommt aus dem Code */
.non-working-hours-block .fc-event-title {
  display: none !important;
}

.non-working-hours-block .fc-event-main {
  display: none !important;
}

/* Nicht-Arbeitszeit-Block Hover-Effekt deaktivieren */
.non-working-hours-block:hover {
  opacity: 0.5 !important; /* Bleibt gleich beim Hover */
  transform: none !important;
  box-shadow: none !important;
}

/* External Busy Block Hover-Effekt deaktivieren */
.external-busy-block:hover {
  opacity: 0.4 !important; /* Bleibt gleich beim Hover */
  transform: none !important;
  box-shadow: none !important;
}

/* Freie Slots sollen weiß bleiben */
.fc-timegrid-slot {
  background-color: white !important;
}

/* Kalender-Hintergrund ist immer weiß */
.fc-timegrid-body,
.fc-scrollgrid-sync-table,
.fc-col-header,
.fc-timegrid-axis,
.fc-timegrid-slots table {
  background-color: white !important;
}

/* ARBEITSZEIT soll weiß sein - nur Slots ohne non-working-hours-block */
.fc-timegrid-slot:not(.non-working-hours-block) {
  background-color: white !important;
}

/* Entferne rote Ränder von allen Events */
.fc-event {
  z-index: 10 !important; /* Höhere z-index damit Termine über Arbeitszeiten erscheinen */
  border: none !important;
  box-shadow: none !important;
}

.fc-event:hover {
  box-shadow: none !important;
}

/* === HEADER & NAVIGATION === */
.fc-col-header-cell {
  background-color: #f8fafc !important;
  color: #374151 !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  padding: 6px 6px !important;
  border-bottom: 2px solid #ffffff !important;
  margin: 0 !important;
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
  font-size: 0.875rem !important;
  font-weight: 500 !important;
  padding: 1px 2px !important;
}

/* === ZEIT-SPALTE === */

.fc-timegrid-slot-label {
  color: #6b7280 !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
  padding: 1px 2px !important;
}

/* === GRID BORDERS (restore vertical/day separators) === */
.fc-theme-standard {
  --fc-border-color: #e5e7eb; /* Tailwind gray-200 */
}
.fc-theme-standard td,
.fc-theme-standard th {
  border-color: #e5e7eb !important;
}
.fc-timegrid-slots td,
.fc-timegrid-cols td,
.fc-timegrid-col {
  border-right: 1px solid #e5e7eb !important;
}

/* Vertikale Trennlinien zwischen Tagen */
.fc-timegrid-axis,
.fc-timegrid-slot-lane {
  border-right: 1px solid #e5e7eb !important;
}

/* Stärkere Regel für Tages-Spalten */
.fc-col-header-cell,
.fc-timegrid-col-frame,
.fc-daygrid-day-frame {
  border-right: 1px solid #d1d5db !important;
}

/* Alle Spalten im TimeGrid */
.fc-timegrid .fc-scrollgrid-sync-table td {
  border-right: 1px solid #d1d5db !important;
}

/* SEHR SPEZIFISCHE Regeln für vertikale Linien */
.fc-timegrid-body .fc-scrollgrid-sync-table colgroup col:not(:last-child) {
  border-right: 1px solid #e5e7eb !important;
}

.fc-timegrid-body table tr td:not(:last-child) {
  border-right: 1px solid #e5e7eb !important;
}

.fc-col-header table tr th:not(:last-child) {
  border-right: 1px solid #e5e7eb !important;
}

/* Für die Zeitachse */
.fc-timegrid-body .fc-timegrid-slots table tr td {
  border-right: 1px solid #e5e7eb !important;
}

/* WICHTIG: Direkte Regel für die Tages-Spalten */
.fc-timegrid-col:not(:last-child) {
  border-right: 1px solid #e5e7eb !important;
  box-shadow: 1px 0 0 0 #e5e7eb !important;
}

/* Für die Slots innerhalb der Spalten */
.fc-timegrid-slot:not(:last-child) {
  border-right: 1px solid #e5e7eb !important;
}

/* Für die Event-Container innerhalb der Spalten */
.fc-timegrid-col-events {
  border-right: 1px solid #e5e7eb !important;
}

/* Alternative: Box-Shadow für alle Spalten */
.fc-timegrid-body .fc-timegrid-col {
  position: relative;
}

.fc-timegrid-body .fc-timegrid-col::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: #e5e7eb;
  z-index: 1;
}

.fc-timegrid-body .fc-timegrid-col:last-child::after {
  display: none;
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
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* ✅ Events die volle Breite geben */
.fc-event {
  width: 100% !important;
  margin: 0 !important;
  left: 0 !important;
  right: 0 !important;
  min-width: 100% !important;
}

.fc-event-main {
  width: 100% !important;
  min-width: 100% !important;
}

.fc-timegrid-event {
  width: 100% !important;
  margin: 0 !important;
  left: 0 !important;
  right: 0 !important;
  min-width: 100% !important;
}

.fc-timegrid-event-harness {
  width: 100% !important;
  min-width: 100% !important;
}

.fc-timegrid-event-harness .fc-event {
  width: 100% !important;
  min-width: 100% !important;
}

/* ✅ Zusätzliche FullCalendar-Überschreibungen */
.fc-timegrid-col-events {
  width: 100% !important;
}

.fc-timegrid-col-frame {
  width: 100% !important;
}

/* ✅ FullCalendar Border-Überschreibungen - ENTFERNT um rote Trennstriche zu vermeiden */
/* .fc-event {
  border-width: 2px !important;
  border-style: solid !important;
  border-color: #dc2626 !important;
}

.fc-timegrid-event {
  border-width: 2px !important;
  border-style: solid !important;
  border-color: #dc2626 !important;
} */

/* ✅ FullCalendar Background-Überschreibungen */
.fc-event {
  background-color: inherit !important;
}

.fc-timegrid-event {
  background-color: inherit !important;
}

.fc-event-main {
  background-color: inherit !important;
}

/* ✅ Spezifische Background-Überschreibungen für Kategorien */
.fc-event.category-B {
  background-color: #7ab25f !important;
}

.fc-event.category-A,
.fc-event.category-A1,
.fc-event.category-A35kW {
  background-color: #f59e0b !important;
}

.fc-event.category-BE {
  background-color: #3b82f6 !important;
}

.fc-event.category-C,
.fc-event.category-C1 {
  background-color: #8b5cf6 !important;
}

.fc-event.category-CE {
  background-color: #ef4444 !important;
}

.fc-event.category-D,
.fc-event.category-D1 {
  background-color: #06b6d4 !important;
}

.fc-event.category-Motorboot {
  background-color: #1d4ed8 !important;
}

.fc-event.category-BPT {
  background-color: #10b981 !important;
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
  padding: 10px 16px !important;
  font-weight: 500 !important;
  font-size: 0.875rem !important;
  transition: all 0.2s ease !important;
}

/* View Switcher Button - matches fc-button style */
.view-switcher-btn {
  background-color: white !important;
  border: 1px solid #d1d5db !important;
  color: #374151 !important;
  border-radius: 8px !important;
  padding: 8px 16px !important;
  font-weight: 500 !important;
  font-size: 0.875rem !important;
  transition: all 0.2s ease !important;
  cursor: pointer;
}

.view-switcher-btn:hover {
  background-color: #f9fafb !important;
  border-color: #9ca3af !important;
  transform: translateY(-1px);
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
  margin: 0 !important;
  border-bottom: none !important;
}

.fc-toolbar-title {
  font-size: 1.25rem !important;
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
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .fc-toolbar-title {
    font-size: 1rem !important;
  }
  
  .fc-button {
    padding: 6px 8px !important;
    font-size: 0.8rem !important;
  }
  
  .view-switcher-btn {
    padding: 6px 8px !important;
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

/* ✅ Kategorie-basierte Event-Farben */
.category-B {
  background-color: #7ab25f !important;
  border-color: #5a8a3f !important;
  border-width: 1px !important;
  border-style: solid !important;
}

.category-A,
.category-A1,
.category-A35kW {
  background-color: #f59e0b !important;
  border-color: #d97706 !important;
  border-width: 1px !important;
  border-style: solid !important;
}

.category-BE {
  background-color: #3b82f6 !important;
  border-color: #2563eb !important;
  border-width: 1px !important;
  border-style: solid !important;
}

.category-C,
.category-C1 {
  background-color: #8b5cf6 !important;
  border-color: #7c3aed !important;
  border-width: 1px !important;
  border-style: solid !important;
}

.category-CE {
  background-color: #ef4444 !important;
  border-color: #dc2626 !important;
  border-width: 1px !important;
  border-style: solid !important;
}

.category-D,
.category-D1 {
  background-color: #06b6d4 !important;
  border-color: #0891b2 !important;
  border-width: 1px !important;
  border-style: solid !important;
}

.category-Motorboot {
  background-color: #1d4ed8 !important;
  border-color: #1e40af !important;
  border-width: 1px !important;
  border-style: solid !important;
}

.category-BPT {
  background-color: #10b981 !important;
  border-color: #059669 !important;
  border-width: 1px !important;
  border-style: solid !important;
}

/* ENTFERNT: Zu aggressive Regel die alles weiß macht */
/* .fc-timegrid * {
  background-color: white !important;
  background: white !important;
} */

/* Tailwind CSS ::selection Duplikate bereinigen */
::selection {
  background-color: rgb(var(--color-primary-DEFAULT) / 0.4);
}

</style>