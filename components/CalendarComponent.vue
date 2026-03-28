<script setup lang="ts">
// @ts-ignore - logger.debug/info/warn accept flexible parameters from old console.log calls
import { ref, onMounted, onUnmounted, watch, nextTick, onErrorCaptured, computed } from 'vue'
import { logger } from '~/utils/logger'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import EventModal from './EventModal.vue'
import EnhancedStudentModal from './EnhancedStudentModal.vue'
import { useCurrentUser } from '~/composables/useCurrentUser'
import ConfirmationDialog from './ConfirmationDialog.vue'
import { useAppointmentStatus } from '~/composables/useAppointmentStatus'
import MoveAppointmentModal from './MoveAppointmentModal.vue'
import { toLocalTimeString } from '~/utils/dateUtils'
import { useStaffWorkingHours } from '~/composables/useStaffWorkingHours'
import { useExternalCalendarSync } from '~/composables/useExternalCalendarSync'
import { useCalendarCache } from '~/composables/useCalendarCache'

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


// ✅ Calendar cache for working hours and external busy times (rarely change)
const { getOrFetch: getCachedOrFetch, clearCache } = useCalendarCache()

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

const { isUpdating: isStatusUpdating, updateError, markAppointmentCompleted, markAppointmentEvaluated, getStatusStatistics, batchUpdateStatus } = useAppointmentStatus()

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

// Pending Onboarding Reminder
const showPendingReminderModal = ref(false)
const pendingReminderStudent = ref<any>(null)
const isResendingPendingSms = ref(false)
const pendingReminderResult = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const handleOpenReminderModal = (student: any) => {
  pendingReminderStudent.value = student
  pendingReminderResult.value = null
  showPendingReminderModal.value = true
}

const resendPendingOnboardingSms = async () => {
  if (!pendingReminderStudent.value?.id) return
  isResendingPendingSms.value = true
  pendingReminderResult.value = null
  try {
    const response = await $fetch('/api/students/resend-onboarding-sms', {
      method: 'POST',
      body: { studentId: pendingReminderStudent.value.id }
    }) as any
    if (!response?.success) throw new Error(response?.message || 'Fehler beim Senden')
    pendingReminderResult.value = { type: 'success', message: `SMS erfolgreich gesendet an ${response.phone}` }
    setTimeout(() => { showPendingReminderModal.value = false }, 2500)
  } catch (err: any) {
    const msg = err?.data?.statusMessage || err?.message || 'SMS konnte nicht gesendet werden'
    pendingReminderResult.value = { type: 'error', message: msg }
  } finally {
    isResendingPendingSms.value = false
  }
}
const studentProgressActiveTab = ref<'details' | 'progress' | 'payments' | 'documents'>('progress')

const handleAppointmentMoved = async (moveData: MoveData) => {
  logger.debug('✅ Appointment moved:', moveData)
  
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
const tenantName = ref('Fahrschule') // ✅ NEU: Tenant name for SMS/Email
let syncInterval: NodeJS.Timeout | null = null // Interval für Auto-Sync

// ✅ NEW: Event types color map (loaded from DB)
const eventTypeColorsMap = ref<Record<string, string>>({})

// ✅ Driving license categories: code → color from tenant `categories` table
const drivingCategoryColorsMap = ref<Record<string, string>>({})

// Working Hours Management
const { 
  loadWorkingHours, 
  getActiveWorkingHours, 
  isOutsideWorkingHours,
  workingHoursByDay,
  setDefaultWorkingHours,
  activeWorkingHours
} = useStaffWorkingHours()

// ✅ Current user tracking (from props or composable)
const { currentUser: composableCurrentUser } = useCurrentUser()

const getCurrentUserId = () => {
  return props.currentUser?.id || composableCurrentUser.value?.id
}

const getCurrentUserData = () => {
  return props.currentUser || composableCurrentUser.value
}

// ✅ Current tenant - derived from currentUser
const currentUser = computed(() => {
  return props.currentUser || composableCurrentUser.value
})

const currentTenant = computed(() => {
  return {
    id: currentUser.value?.tenant_id
  }
})

const emit = defineEmits(['view-updated', 'appointment-changed'])

// ✅ NEW FUNCTION: Load event types and their colors from DB
const loadEventTypeColors = async () => {
  try {
    // Use secure API to load event types (handles auth server-side)
    const response = await $fetch('/api/staff/get-event-types') as any
    
    if (response?.data && Array.isArray(response.data)) {
      const colorsMap: Record<string, string> = {}
      response.data.forEach((et: any) => {
        if (et.code && et.default_color) {
          colorsMap[et.code] = et.default_color
        }
      })
      eventTypeColorsMap.value = colorsMap
      logger.debug('✅ Event type colors loaded:', colorsMap)
    }
  } catch (err) {
    logger.warn('⚠️ Error loading event type colors:', err)
  }
}

/** Build lookup: appointment `category` string → hex from DB (`categories.code` + `color`). */
const buildDrivingCategoryColorMap = (categories: any[]): Record<string, string> => {
  const map: Record<string, string> = {}
  if (!Array.isArray(categories)) return map
  for (const c of categories) {
    const raw = c?.color
    if (raw == null || raw === '') continue
    const col = String(raw).trim()
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(col)) continue
    const code = c?.code
    if (!code || typeof code !== 'string') continue
    map[code] = col
    map[code.toUpperCase()] = col
    map[code.toLowerCase()] = col
  }
  // Alias: appointments sometimes use "Boot" vs DB code "Motorboot" (or vice versa)
  if (!map.Boot && map.Motorboot) map.Boot = map.Motorboot
  if (!map.boot && map.motorboot) map.boot = map.motorboot
  if (!map.Motorboot && map.Boot) map.Motorboot = map.Boot
  if (!map.motorboot && map.boot) map.motorboot = map.boot
  return map
}

const loadDrivingCategoryColors = async () => {
  try {
    const response = (await $fetch('/api/staff/get-categories')) as { success?: boolean; data?: any[] }
    if (response?.data && Array.isArray(response.data)) {
      drivingCategoryColorsMap.value = buildDrivingCategoryColorMap(response.data)
      logger.debug('✅ Driving category colors loaded:', drivingCategoryColorsMap.value)
    }
  } catch (err) {
    logger.warn('⚠️ Error loading driving category colors:', err)
  }
}

/** Resolve hex for a calendar event category (DB first). */
const resolveDrivingCategoryColor = (category: string): string | undefined => {
  const m = drivingCategoryColorsMap.value
  if (!category || !m || Object.keys(m).length === 0) return undefined
  if (m[category]) return m[category]
  const u = category.toUpperCase()
  if (m[u]) return m[u]
  const l = category.toLowerCase()
  if (m[l]) return m[l]
  if (category === 'Boot' && m.Motorboot) return m.Motorboot
  if (category === 'Motorboot' && m.Boot) return m.Boot
  return undefined
}

/** HSL (0–360, 0–100, 0–100) → #rrggbb */
const hslToHex = (h: number, s: number, l: number): string => {
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = light - c / 2
  let rp = 0
  let gp = 0
  let bp = 0
  if (h < 60) {
    rp = c; gp = x; bp = 0
  } else if (h < 120) {
    rp = x; gp = c; bp = 0
  } else if (h < 180) {
    rp = 0; gp = c; bp = x
  } else if (h < 240) {
    rp = 0; gp = x; bp = c
  } else if (h < 300) {
    rp = x; gp = 0; bp = c
  } else {
    rp = c; gp = 0; bp = x
  }
  const r = Math.round((rp + m) * 255)
  const g = Math.round((gp + m) * 255)
  const b = Math.round((bp + m) * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Stabile „Zufalls“-Farbe pro Kategorie (gleicher String → gleiche Farbe).
 * Für neue/unkannte Codes wenn DB leer oder nicht erreichbar — nie weiß/bleich.
 */
const colorFromCategoryKey = (category: string): string => {
  const key = category.trim().toLowerCase()
  if (!key) return '#4b5563'
  let hash = 2166136261
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const hue = (hash >>> 0) % 360
  return hslToHex(hue, 58, 46)
}

// NEUE FUNKTION: Nicht-Arbeitszeiten via Backend API laden
const loadNonWorkingHoursBlocks = async (staffId: string | undefined, startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
  try {
    logger.debug('🔒 Loading non-working hours blocks via Backend API...')
    
    // Working hours via Backend API laden – mit Client-Cache (2 min TTL)
    // Bei leerem Ergebnis (z.B. abgelaufener Auth-Token) nicht cachen sondern retry
    let response: { success: boolean, workingHours: any[], staffId: string }
    try {
      response = await getCachedOrFetch(
        '/api/staff/get-working-hours',
        () => $fetch<{ success: boolean, workingHours: any[], staffId: string }>('/api/staff/get-working-hours'),
        undefined,
        2 * 60 * 1000
      )
    } catch (fetchError: any) {
      if (fetchError?.statusCode === 401 || fetchError?.status === 401) {
        // Auth-Token abgelaufen → Cache invalidieren und einmal retry
        logger.warn('⚠️ Working hours: 401 received, invalidating cache and retrying...')
        const { invalidate } = useCalendarCache()
        invalidate('/api/staff/get-working-hours')
        await new Promise(resolve => setTimeout(resolve, 800))
        response = await $fetch<{ success: boolean, workingHours: any[], staffId: string }>('/api/staff/get-working-hours')
      } else {
        throw fetchError
      }
    }
    
    // Wenn workingHours leer zurückkommt obwohl User eingeloggt → Cache invalidieren (kein leeres Ergebnis cachen)
    if (response.success && (!response.workingHours || response.workingHours.length === 0)) {
      logger.warn('⚠️ Working hours returned empty – invalidating cache to avoid stale empty result')
      const { invalidate } = useCalendarCache()
      invalidate('/api/staff/get-working-hours')
    }
    
    if (!response.success) {
      logger.debug('⚠️ No working hours found')
      return []
    }
    
    const allWorkingHours = response.workingHours
    logger.debug('✅ Loaded all working hours via API:', allWorkingHours?.length || 0)
    if (allWorkingHours && allWorkingHours.length > 0) {
      logger.debug('🔍 Sample working hours from API:', allWorkingHours.slice(0, 3).map((wh: any) => ({
        day_of_week: wh.day_of_week,
        is_active: wh.is_active,
        start_time: wh.start_time,
        end_time: wh.end_time
      })))
    }
    
    const events: CalendarEvent[] = []
    
    // Für jeden Tag im sichtbaren Bereich
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay() // Sonntag = 7
      
      // Finde alle Working Hours für diesen Wochentag
      const dayWorkingHours = allWorkingHours?.filter(wh => wh.day_of_week === dayOfWeek) || []
      
      // Prüfe ob der Tag aktive Working Hours hat
      const hasActiveWorkingHours = dayWorkingHours.some(wh => wh.is_active === true)
      
      if (dayOfWeek === 1) { // Debug nur für Montag
        logger.debug(`📊 Day ${dayOfWeek} (Montag): ${dayWorkingHours.length} entries, hasActiveWorkingHours: ${hasActiveWorkingHours}`, dayWorkingHours.map(wh => ({ is_active: wh.is_active, start: wh.start_time, end: wh.end_time })))
      }
      
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      // FALL 1: Tag hat KEINE aktiven Working Hours → ganzer Tag blockieren
      if (!hasActiveWorkingHours) {
        logger.debug(`🚫 Day ${dayOfWeek}: No active working hours - will gray out entire day`)
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
        logger.debug(`✅ Day ${dayOfWeek}: Has active working hours - will show only non-working blocks`)
        const inactiveBlocks = dayWorkingHours.filter(wh => wh.is_active === false)
        
        inactiveBlocks.forEach((block, index) => {
          // Times are already converted to local time by the API (get-working-hours)
          // Just use them directly as local time strings for FullCalendar
          const [startHour, startMinute, startSecond] = block.start_time.split(':').map(Number)
          const [endHour, endMinute, endSecond] = block.end_time.split(':').map(Number)

          const startTime = `${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:${String(startSecond || 0).padStart(2, '0')}`
          const endTime = `${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:${String(endSecond || 0).padStart(2, '0')}`
          
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
    
    logger.debug('✅ Generated non-working hours events:', events.length)
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
  
  logger.debug('🔍 Generating working hours events:', {
    staffId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    activeHours: activeHours.length,
    workingHoursByDay: workingHoursByDay.value,
    allWorkingHoursDays: Object.keys(workingHoursByDay.value)
  })
  
  // WICHTIG: Auch wenn keine aktiven Stunden, trotzdem alle Tage grau machen
  if (!activeHours.length) {
    logger.debug('⚠️ No active working hours - will gray out all days')
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
    
    logger.debug('🔍 Processing date:', currentDate.toDateString(), 'dayOfWeek:', dayOfWeek, 'workingHour:', workingHour)
    
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
      logger.debug('🔍 Debug workStart:', workStart.getHours(), workStart.getMinutes(), 'for day', dayOfWeek)
      
      // IMMER Events erstellen für Debugging - entferne if-Bedingung
      logger.debug('🔍 Creating before-work event for', currentDate.toDateString())
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
      logger.debug('🔍 Added before-work event:', beforeEvent.start, 'to', beforeEvent.end, 'for', currentDate.toDateString())
      
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
        logger.debug('🔍 Added after-work event:', afterEvent.start, 'to', afterEvent.end, 'for', currentDate.toDateString())
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
      logger.debug('🔍 Added full-day event (default 00:00-24:00):', fullDayEvent.start, 'to', fullDayEvent.end, 'for', currentDate.toDateString())
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  logger.debug('✅ Generated working hours events:', workingHoursEvents.length)
  return workingHoursEvents
}

const loadStaffMeetings = async () => {
  logger.debug('🔄 Loading staff meetings via API...')
  try {
    const response = await $fetch('/api/calendar/manage', {
      method: 'POST',
      body: {
        action: 'get-staff-meetings',
        tenant_id: currentTenant.value?.id,
        staff_id: currentUser.value?.id
      }
    }) as any

    if (!response?.success) {
      console.error('❌ Error loading staff meetings:', response?.message)
      return []
    }

    const meetings = response.data || []

    logger.debug('📊 Staff meetings loaded:', meetings.length)

    // Convert zu Calendar Events Format
    const convertedMeetings = (meetings || []).map((meeting: any) => {
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

    logger.debug('✅ Staff meetings converted:', convertedMeetings.length)
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
    logger.debug('📅 Loading external busy times via Backend API...')
    
    // External busy times via Backend API laden – mit Client-Cache (5 min TTL)
    const response = await getCachedOrFetch(
      '/api/staff/get-external-busy-times',
      () => $fetch<{ success: boolean, busyTimes: any[], staffId: string }>('/api/staff/get-external-busy-times'),
      undefined,
      5 * 60 * 1000
    )
    
    if (!response.success || !response.busyTimes || response.busyTimes.length === 0) {
      logger.debug('📅 No external busy times found via API')
      return []
    }
    
    const busyTimes = response.busyTimes
    logger.debug('✅ Loaded external busy times via API:', busyTimes.length)
    
    // Convert UTC times to local time for display
    const parseUTCTime = (utcTimeString: string) => {
      let timeStr = utcTimeString
      if (timeStr.includes(' ') && !timeStr.includes('T')) {
        timeStr = timeStr.replace(' ', 'T')
      }
      if (timeStr.includes('+00') && !timeStr.includes('+00:00')) {
        timeStr = timeStr.replace('+00', '+00:00')
      }
      if (!timeStr.includes('+') && !timeStr.includes('Z')) {
        timeStr += '+00:00'
      }
      
      const utcDate = new Date(timeStr)
      const localDateStr = utcDate.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
      const localDate = new Date(localDateStr)
      
      const localYear = localDate.getFullYear()
      const localMonth = String(localDate.getMonth() + 1).padStart(2, '0')
      const localDay = String(localDate.getDate()).padStart(2, '0')
      const localHour = String(localDate.getHours()).padStart(2, '0')
      const localMinute = String(localDate.getMinutes()).padStart(2, '0')
      const localSecond = String(localDate.getSeconds()).padStart(2, '0')
      return `${localYear}-${localMonth}-${localDay}T${localHour}:${localMinute}:${localSecond}`
    }
    
    // Convert to calendar events
    const events: CalendarEvent[] = busyTimes.map((busy: any) => {
      return {
        id: `external-busy-${busy.id}`,
        title: busy.event_title || 'Privat',
        start: parseUTCTime(busy.start_time),
        end: parseUTCTime(busy.end_time),
        backgroundColor: '#e9d5ff',
        borderColor: 'transparent',
        textColor: '#9333ea',
        display: 'background',
        classNames: ['external-busy-block'],
        extendedProps: {
          type: 'external_busy',
          external_event_id: busy.external_event_id,
          sync_source: busy.sync_source,
          isClickThrough: true
        }
      }
    })
    
    return events
    
  } catch (error) {
    console.error('Error loading external busy times via API:', error)
    return []
  }
}

const loadRegularAppointments = async (viewStartDate?: Date, viewEndDate?: Date, forceReload?: boolean) => {
  logger.debug('🔥 loadRegularAppointments using backend API!', forceReload ? '(force reload)' : '')
  isLoadingEvents.value = true
  try {
    logger.debug('🔄 Loading appointments via backend API...')
    
    // Authentication is handled via HTTP-Only cookies (sent automatically)

    // Build query parameters
    const params = new URLSearchParams()
    if (viewStartDate) params.append('viewStart', viewStartDate.toISOString())
    if (viewEndDate) params.append('viewEnd', viewEndDate.toISOString())
    if (props.adminStaffFilter) params.append('adminStaffFilter', props.adminStaffFilter)

    logger.debug('📡 Calling API with params:', {
      viewStart: viewStartDate?.toISOString(),
      viewEnd: viewEndDate?.toISOString(),
      adminStaffFilter: props.adminStaffFilter
    })

    // Call backend API – mit Client-Cache (30s TTL, gleich wie server-seitiger Cache)
    const cacheParams = {
      viewStart: viewStartDate?.toISOString(),
      viewEnd: viewEndDate?.toISOString(),
      adminStaffFilter: props.adminStaffFilter || null
    }
    
    // ✅ If forceReload, invalidate the specific cache entry first
    if (forceReload) {
      const { invalidate: invalidateCache } = useCalendarCache()
      invalidateCache('/api/calendar/get-appointments', cacheParams)
      logger.debug('🗑️ Cache invalidated for appointments before reload')
    }
    
    const response = await getCachedOrFetch(
      '/api/calendar/get-appointments',
      () => $fetch(`/api/calendar/get-appointments?${params.toString()}`, { method: 'GET' }),
      cacheParams,
      30 * 1000
    ) as any

    if (!response?.success || !response?.data) {
      throw new Error('Failed to load appointments from API')
    }

    const appointments = response.data

    logger.debug('📊 Raw appointments from API:', appointments?.length || 0)
    logger.debug('🔍 Query details:', {
      viewportDates: viewStartDate && viewEndDate ? 'YES' : 'NO',
      count: appointments.length
    })

    // ✅ DEBUG: Erste Appointment prüfen
    if (appointments && appointments.length > 0) {
      logger.debug('🔍 First appointment data:', {
        id: appointments[0].id,
        title: appointments[0].title,
        type: appointments[0].type,
        event_type_code: appointments[0].event_type_code,
        user: appointments[0].user,
        staff: appointments[0].staff,
        start_time: appointments[0].start_time,
        duration_minutes: appointments[0].duration_minutes,
        location_id: appointments[0].location_id,
        location: appointments[0].location
      })
    } else {
      logger.debug('ℹ️ No appointments found')
    }
    
    // Use appointments directly (authorization handled by backend)
    const filteredAppointments = appointments || []
    
    logger.debug('✅ Filtered appointments:', filteredAppointments.length)
    
    // ✅ Location-Daten sind bereits vom Backend geladen! Keine zusätzliche Query nötig
    // Das Backend sendet bereits das "location" Objekt für jeden Termin
    logger.debug('📍 Location data already provided by backend')
    
    const convertedEvents = filteredAppointments.map((apt: any) => {
      const isTeamInvite = apt.type === 'team_invite'
      
      // ✅ Handle both array and object formats for user data
      const userObj = Array.isArray(apt.user) ? apt.user?.[0] : apt.user
      const studentName = `${userObj?.first_name || ''} ${userObj?.last_name || ''}`.trim() || 'Fahrlektion'
      
      // ✅ Event-Titel bestimmen
      let eventTitle = ''
      
      // ✅ PRIORITY 1: Use title from DB if available (user may have customized it!)
      if (apt.title && apt.title.trim() !== '') {
        eventTitle = apt.title
        // ✅ No event type code prefix anymore - keep title clean
      }
      // ✅ FALLBACK: Generate title if none in DB
      else {
        // Determine if this is an "other event type" (not lesson/exam/theory)
        const isOtherEventType = apt.event_type_code && !['lesson', 'exam', 'theory'].includes(apt.event_type_code)
        
        if (isOtherEventType) {
          // ✅ For other event types (VKU, Nothelfer, etc.), just use location (no student name)
          const locationData = (apt as any).location
          const locationText = (apt as any).location_address || 
              (locationData?.address) ||
              (apt as any).location_name || 
              (locationData?.name) || 'Termin'
          eventTitle = locationText
        } else {
          // ✅ For lessons/exams, use student name + location
          // ✅ Location für den Titel bestimmen - Priorität: address > name (da address sauberer ist)
          const locationData = (apt as any).location
          const locationText = (apt as any).location_address || 
              (locationData?.address) ||
              (apt as any).location_name || 
              (locationData?.name) || ''
          
          // ✅ Debug: Location-Daten loggen
          logger.debug('🔍 Location debug for appointment:', apt.id, {
            location_id: apt.location_id,
            location_name: (apt as any).location_name,
            location_address: (apt as any).location_address,
            backend_location_data: locationData,
            final_locationText: locationText,
            userObj: userObj,
            studentName: studentName
          })
          
          // ✅ Titel mit Location kombinieren falls vorhanden
          if (locationText) {
            eventTitle = `${studentName} - ${locationText}`
          } else {
            eventTitle = studentName
          }
        }
      }
      
      // ✅ Kategorie vom Appointment type Feld nehmen
      const category = apt.type || 'B'
      
      // ✅ FIXED: event_type_code has PRIORITY over type
      // If event_type_code is NOT a standard lesson type (lesson/exam/theory), use it
      // Otherwise, determine from type field
      let eventType = 'lesson' // default
      if (apt.event_type_code && !['lesson', 'exam', 'theory'].includes(apt.event_type_code)) {
        // Non-standard event type (vku, nothelfer, meeting, etc.)
        eventType = apt.event_type_code
      } else if (apt.event_type_code) {
        // Standard event type explicitly set
        eventType = apt.event_type_code
      } else if (apt.type && ['B', 'A', 'A1', 'A35kW', 'BE', 'C', 'C1', 'CE', 'D', 'D1', 'Motorboot', 'Boot', 'BPT'].includes(apt.type)) {
        // Has a driving category, so it's a lesson
        eventType = 'lesson'
      }
      
      const eventColor = getEventColor(eventType, apt.status, category, apt.payment_status, apt.user_id)
      
      // ✅ Roter Rahmen für unbezahlte Termine mit echten Kunden
      // Nur wenn user_id != staff_id (echte Kundentermine, keine internen Blöcke)
      const hasRealCustomer = apt.user_id && apt.user_id !== '' && apt.user_id !== apt.staff_id
      const isUnpaid = !apt.payment_status || (apt.payment_status !== 'completed' && apt.payment_status !== 'invoiced')
      const borderColor = (hasRealCustomer && isUnpaid) ? '#ef4444' : eventColor // Rot für unbezahlt
      const unpaidClass = (hasRealCustomer && isUnpaid) ? 'unpaid-appointment' : ''
      
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
        borderColor: borderColor, // ✅ Roter Rahmen für unbezahlt
        textColor: '#ffffff',
        // ✅ DEBUG: Zusätzliche Event-Daten direkt am Event-Objekt
        event_type_code: apt.event_type_code || 'lesson', // ✅ NEU: event_type_code direkt am Event
        type: apt.type, // ✅ NEU: type (Fahrzeugkategorie) direkt am Event
        user_id: apt.user_id,
        staff_id: apt.staff_id,
        location_id: apt.location_id,
        duration_minutes: apt.duration_minutes,
        status: apt.status,
        // ✅ Merge classNames from API (e.g., reserved-slot-event) with local ones
        classNames: [...(apt.classNames || []), `category-${category}`, unpaidClass].filter(Boolean),
        extendedProps: {
          // ✅ Produktdaten für Wiederherstellung
          has_products: false, // Wird später gesetzt
          staff_note: apt.description || '',
          client_note: '',
          category: userObj?.category || apt.type || 'B',
          instructor: `${(apt as any).staff?.first_name || ''} ${(apt as any).staff?.last_name || ''}`.trim(),
          student: studentName,
          phone: userObj?.phone || '', // ✅ NEU: Phone für SMS-Benachrichtigungen
          email: userObj?.email || '', // ✅ NEU: Email für Email-Benachrichtigungen
          created_by: `${(apt as any).created_by_user?.first_name || ''} ${(apt as any).created_by_user?.last_name || ''}`.trim() || 'Unbekannt',
          price: 0, // Preis wird nicht mehr in appointments gespeichert
          user_id: apt.user_id,
          staff_id: apt.staff_id,
          location_id: apt.location_id,
          location: (apt as any).location || null, // ✅ Include full location object from backend
          duration_minutes: apt.duration_minutes,
          status: apt.status,
          appointment_type: apt.event_type_code || 'lesson', // ✅ KORRIGIERT: event_type_code verwenden
          is_team_invite: isTeamInvite,
          original_type: (apt as any).user?.category || apt.type || 'B',
          eventType: (apt.type && ['B', 'A', 'A1', 'A35kW', 'BE', 'C', 'C1', 'CE', 'D', 'D1', 'Motorboot', 'Boot', 'BPT'].includes(apt.type)) ? 'lesson' : (apt.event_type_code || 'lesson'), // ✅ KORRIGIERT: event_type_code für eventType verwenden
          // ✅ NEW: Payment status for color indication
          payment_status: apt.payment_status || null,
          paid_at: apt.paid_at || null,
          is_paid: apt.payment_status === 'completed' && apt.paid_at ? true : false
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

// ✅ IMPROVED CACHING: Viewport-spezifische Caches statt globaler Cache

const loadAppointments = async (forceReload = false) => {
  if (!calendar.value) {
    logger.debug('⚠️ Calendar not mounted, skipping load')
    return
  }
  
  if (isUpdating.value) {
    // Statt sofort abbrechen: kurz warten und nochmals prüfen (Race mit datesSet/onMounted)
    logger.debug('⚠️ Calendar update in progress, waiting briefly before retry...')
    await new Promise(resolve => setTimeout(resolve, 300))
    if (isUpdating.value) {
      logger.debug('⚠️ Calendar update still in progress after wait, skipping load')
      return
    }
  }
  
  const staffId = getCurrentUserId()
  logger.debug('🔍 loadAppointments staffId:', staffId)

  const calendarApi = calendar.value?.getApi()
  const currentView = calendarApi?.view
  const viewStart = currentView?.activeStart || new Date()
  const viewEnd = currentView?.activeEnd || new Date()
  
  if (forceReload) {
    clearCache()
  }
  
  isLoadingEvents.value = true
  isUpdating.value = true
  
  try {
    logger.debug('🔄 Loading all calendar events...', forceReload ? '(forced reload)' : '')
    logger.debug('📅 Loading events for view range:', viewStart, 'to', viewEnd)
    
    const startTime = performance.now()
    
    const [appointments, externalBusyEvents, nonWorkingHoursEvents] = await Promise.all([
      loadRegularAppointments(viewStart, viewEnd, forceReload),
      loadExternalBusyTimes(),
      loadNonWorkingHoursBlocks(staffId, viewStart, viewEnd),
    ])
    logger.debug('📊 Loaded events:', { appointments: appointments.length, nonWorkingHours: nonWorkingHoursEvents.length, externalBusy: externalBusyEvents.length })
    
    const loadDuration = (performance.now() - startTime).toFixed(0)
    logger.debug(`⏱️ Performance: All loads completed in ${loadDuration}ms`)
    
    if (!calendar.value) {
      logger.debug('⚠️ Calendar unmounted during load, aborting')
      return
    }
    
    const allEvents = [...appointments, ...nonWorkingHoursEvents, ...externalBusyEvents]
    
    logger.debug('✅ Final calendar summary:', {
      appointments: appointments.length,
      nonWorkingHours: nonWorkingHoursEvents.length,
      externalBusy: externalBusyEvents.length,
      total: allEvents.length
    })
    
    // Set calendarEvents - the watcher handles FullCalendar update
    calendarEvents.value = allEvents
  } catch (error) {
    console.error('❌ Error loading calendar events:', error)
    // ✅ Fehler nicht weiterwerfen, nur loggen
  } finally {
    isLoadingEvents.value = false
    isUpdating.value = false
  }
}

// ✅ Helper-Funktion für Event-Farben
const getEventColor = (type: string, status?: string, category?: string, paymentStatus?: string | null, userId?: string | null): string => {
  // ✅ Typ-basierte Farben für andere Termine (Fallback wenn nicht in DB)
  const typeColorsFallback = {
    'lesson': '#10b981',      // Grün für Fahrstunden
    'exam': '#f59e0b',        // Orange für Prüfungen  
    'theory': '#3b82f6',      // Blau für Theorie
    'meeting': '#7c3aed',     // Dunkel-Lila für Meetings
    'break': '#475569',       // Dunkelgrau für Pausen
    'training': '#ea580c',    // Dunkel-Orange für Training
    'maintenance': '#dc2626', // Dunkel-Rot für Wartung
    'admin': '#0891b2',       // Dunkel-Cyan für Admin
    'team_invite': '#0284c7', // Blau für Team-Einladungen
    'vku': '#059669',         // Grün für VKU (Fallback)
    'nothelfer': '#d97706',   // Bernstein für Nothelfer (Fallback)
    'other': '#374151'        // Dunkelgrau für Sonstiges
  }
  
  // ✅ Default-Farbe für alle Events ohne spezifische Kategorie/Typ
  const defaultColor = '#4b5563' // Dunkles neutrales Grau
  
  let baseColor = defaultColor
  
  // ✅ PRIORITÄT 1: Kategorie für Fahrstunde/Prüfung/Theorie — nur DB (`categories.color`), sonst stabiler Hash pro Code
  if (category && (!type || ['lesson', 'exam', 'theory'].includes(type))) {
    baseColor = resolveDrivingCategoryColor(category) ?? colorFromCategoryKey(category)
  }
  // ✅ PRIORITÄT 2: Event type colors from DB (für VKU, Nothelfer, etc.)
  else if (type && eventTypeColorsMap.value[type]) {
    baseColor = eventTypeColorsMap.value[type]
  }
  // ✅ PRIORITÄT 3: Fallback to hardcoded type colors
  else if (type && typeColorsFallback[type as keyof typeof typeColorsFallback]) {
    baseColor = typeColorsFallback[type as keyof typeof typeColorsFallback]
  }
  
  // ✅ NO MORE COLOR LIGHTENING - we use red border instead!
  // Border is set in the event creation above
  
  return baseColor
}

// ✅ Helper function: Lighten a hex color by a percentage
const lightenColor = (hex: string, percent: number): string => {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  
  // Lighten by moving towards white (255)
  const newR = Math.round(r + (255 - r) * percent)
  const newG = Math.round(g + (255 - g) * percent)
  const newB = Math.round(b + (255 - b) * percent)
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}
    
const handleMoveError = (error: string) => {
  console.error('❌ Move error:', error)
  showToast('❌ Fehler beim Verschieben: ' + error)
}

const editAppointment = (appointment: CalendarAppointment) => {
  logger.debug('✏️ Edit appointment:', appointment.id)
  // TODO: Implementiere Edit-Modal
  // emit('edit-appointment', appointment)
  showToast('Edit-Funktion noch nicht implementiert')
}

const handleSaveEvent = async (eventData: CalendarEvent) => {
  logger.debug('💾 Event saved, refreshing calendar...', eventData)
  
  await loadAppointments(true)
  
  emit('appointment-changed', { type: 'saved', data: eventData })
  isModalVisible.value = false
}

// CalendarComponent.vue - Erweiterte handleEventDrop Funktion
// Debug-Version um die richtigen Selektoren zu finden
const updateModalFieldsIfOpen = (event: any) => {
  logger.debug('🔍 Debugging modal inputs...')
  
  // Verschiedene Selektoren ausprobieren
  const dateInputs = document.querySelectorAll('input[type="date"]')
  const timeInputs = document.querySelectorAll('input[type="time"]')
  const allInputs = document.querySelectorAll('input')
  
  logger.debug('📊 Found inputs:', {
    dateInputs: dateInputs.length,
    timeInputs: timeInputs.length,
    allInputs: allInputs.length
  })
  
  // Alle Input-Elemente loggen um die richtigen zu finden
  allInputs.forEach((input, index) => {
    logger.debug(`Input ${index}:`, {
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
      logger.debug('⚠️ Calendar not mounted, skipping modal open')
      return
    }
    
    // ✅ Sicherheitsprüfung: Ist bereits ein Modal offen?
    if (isModalVisible.value) {
      logger.debug('⚠️ Modal already visible, skipping new modal')
      return
    }
    
    // ✅ FIX 1: Verwende originale Zeit (keine -2h Korrektur)
    const clickedDate = arg.date
    const endDate = new Date(clickedDate.getTime() + 45 * 60000)
    
    logger.debug('📅 CREATE MODE: Free slot clicked at', toLocalTimeString(clickedDate))
    
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
    
    logger.debug('✅ FREE SLOT: Modal opened with clean data (no student preselection)')
    
  } catch (error) {
    console.error('❌ Error opening new appointment modal:', error)
    // ✅ Fehler nicht weiterwerfen, nur loggen
    
    // ✅ Fallback: Modal schließen falls es geöffnet wurde
    isModalVisible.value = false
  }
}

// Überarbeitete handleEventDrop mit schönem Dialog
const handleEventDrop = async (dropInfo: any) => {
  // ✅ WICHTIG: Speichere die ALT-Zeit BEVOR der Event verändert wird
  const oldStartTime = new Date(dropInfo.oldEvent.start).toLocaleString('de-CH', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const newStartTime = new Date(dropInfo.event.start).toLocaleString('de-CH', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const newEndTime = new Date(dropInfo.event.end).toLocaleString('de-CH', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const moveAction = async () => {
    try {
      logger.debug('✅ User confirmed move, updating via API...')
      
      const updateResponse = await $fetch('/api/calendar/manage', {
        method: 'POST',
        body: {
          action: 'update-appointment-status',
          tenant_id: currentTenant.value?.id,
          appointment_data: {
            id: dropInfo.event.id,
            start_time: dropInfo.event.startStr,
            end_time: dropInfo.event.endStr
          }
        }
      }) as any

      if (!updateResponse?.success) {
        throw new Error(updateResponse?.message || 'Failed to update appointment')
      }

      logger.debug('✅ Appointment moved via API:', dropInfo.event.title)
      
      // ✅ NEW: Invalidate calendar cache to force refresh
      logger.debug('🔄 Reloading appointments after move...')
      isUpdating.value = true
      try {
        await loadAppointments(true)
      } finally {
        isUpdating.value = false
      }
      refreshCalendar()
      
      // ✅ NEU: Immer SMS UND EMAIL versenden (kein Checkbox mehr)
      const phoneNumber = dropInfo.event.extendedProps?.phone
      const studentEmail = dropInfo.event.extendedProps?.email
      const studentName = dropInfo.event.extendedProps?.student || 'Fahrschüler'
      const firstName = studentName?.split(' ')[0] || studentName
      const instructorName = dropInfo.event.extendedProps?.instructor || 'dein Fahrlehrer'
      const newTime = newStartTime
      
      logger.debug('📅 Time details:', { oldStartTime, newTime })
      
      // ✅ SMS DISABLED: Nur Email beim Verschieben
      // SMS versenden (REMOVED)
      // if (phoneNumber) {
      //   logger.debug('📱 Sending SMS notification for rescheduled appointment...')
      //   try {
      //     const result = await $fetch('/api/sms/send', {
      //       method: 'POST',
      //       body: {
      //         phone: phoneNumber,
      //         message: `Hallo ${firstName},\n\nDein Termin mit ${instructorName} wurde verschoben:\n\n📅 ALT:\n${oldStartTime}\n\n📌 NEU:\n${newTime}\n\nBeste Grüsse\n${tenantName.value}`,
      //         tenantId: currentTenant.value?.id
      //       }
      //     })
      //     logger.debug('✅ SMS sent successfully:', result)
      //   } catch (smsError: any) {
      //     console.error('❌ Failed to send SMS:', smsError)
      //   }
      // } else {
      //   logger.debug('⚠️ No phone number available for SMS')
      // }
      
      // Email versenden
      if (studentEmail) {
        logger.debug('📧 Sending Email notification for rescheduled appointment...')
        try {
          const result = await $fetch('/api/email/send-appointment-notification', {
            method: 'POST',
            body: {
              email: studentEmail,
              studentName: firstName,
              oldTime: oldStartTime,
              newTime: newTime,
              staffName: instructorName,
              type: 'rescheduled',
              tenantId: props.currentUser?.tenant_id
            }
          })
          logger.debug('✅ Email sent successfully:', result)
        } catch (emailError: any) {
          console.error('❌ Failed to send Email:', emailError)
        }
      } else {
        logger.debug('⚠️ No email address available for email notification')
      }
      
      // Modal aktualisieren falls offen
      if (isModalVisible.value && modalEventData.value?.id === dropInfo.event.id) {
        logger.debug('📝 Updating modal data...')
        modalEventData.value = {
          ...modalEventData.value,
          start: dropInfo.event.startStr,
          end: dropInfo.event.endStr
        }
      }
      
      logger.debug(`✅ Termin "${dropInfo.event.title}" erfolgreich verschoben`)
      
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
        📱 Der Fahrschüler wird per E-Mail über die Terminverschiebung informiert.
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
      logger.debug('✅ User confirmed resize, updating via API...')
      
      const resizeResponse = await $fetch('/api/calendar/manage', {
        method: 'POST',
        body: {
          action: 'update-appointment-status',
          tenant_id: currentTenant.value?.id,
          appointment_data: {
            id: resizeInfo.event.id,
            end_time: resizeInfo.event.endStr,
            duration_minutes: durationMinutes
          }
        }
      }) as any

      if (!resizeResponse?.success) {
        throw new Error(resizeResponse?.message || 'Failed to update appointment')
      }
      
      logger.debug('✅ Appointment resized via API:', resizeInfo.event.title)
      
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
    height: '100%',
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
        logger.debug('📅 Initial load, skipping datesSet reload')
        return
      }
      logger.debug('📅 Week changed, loading events for new viewport')
      // ✅ Don't invalidate cache here - let loadAppointments handle it
      // This is where viewport caching should shine!
      refreshCalendar()
    },
  // Klick auf leeren Zeitslot

// In der dateClick Funktion im calendarOptions:
dateClick: (arg) => {
  try {
    // ✅ Sicherheitsprüfung: Ist der Calendar noch mounted?
    if (!calendar.value) {
      logger.debug('⚠️ Calendar not mounted, skipping date click')
      return
    }
    
    logger.debug('🔍 FREE SLOT CLICKED:', {
      clickedDate: arg.date,
      clickedISO: toLocalTimeString(arg.date),
      hasClipboard: !!clipboardAppointment.value,
      clipboardData: clipboardAppointment.value
    })
    
    // ✅ Prüfen ob Zwischenablage gefüllt ist
    if (clipboardAppointment.value) {
      logger.debug('📋 Clipboard detected, showing choice modal:', clipboardAppointment.value)
      
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
          logger.debug('✅ Choice modal set to visible with timeout:', showClipboardChoice.value)
        } else {
          logger.debug('⚠️ Calendar unmounted during timeout, skipping modal show')
        }
      }, 10) // Kleine Verzögerung um Race Conditions zu vermeiden
      
      return
    }
    
    logger.debug('➕ No clipboard, opening new appointment modal')
    openNewAppointmentModal(arg)
    
  } catch (error) {
    console.error('❌ Error handling date click:', error)
    // ✅ Fehler nicht weiterwerfen, nur loggen
  }
},

eventContent: (arg) => {
  const extendedProps = arg.event.extendedProps
  const locationObj = extendedProps?.location
  // Extract address or name from location object, or fallback to location string
  const location = (locationObj?.address || locationObj?.name) || extendedProps?.location_address || ''
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
      logger.debug('⚠️ Calendar not mounted, skipping event click')
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
    
    logger.debug('✅ Event click handled successfully:', clickInfo.event.title)
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
      logger.debug('⚠️ Calendar not mounted, skipping select')
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
    
    logger.debug('✅ Time range selection handled successfully')
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
  logger.debug('🔄 CalendarComponent - Refreshing calendar...')
  
  try {
    // ✅ Sicherheitsprüfung: Ist der Calendar noch mounted?
    if (!calendar.value) {
      logger.debug('⚠️ Calendar not mounted, skipping refresh')
      return
    }
    
    // ✅ Sicherheitsprüfung: Ist bereits ein Update im Gange?
    if (isUpdating.value) {
      logger.debug('⚠️ Calendar update already in progress, skipping refresh')
      return
    }
    
    const currentDate = calendar.value?.getApi()?.getDate()
    const refreshStart = currentDate
    
    await loadAppointments(true)
    
    // ✅ Sicherheitsprüfung: Ist der Calendar noch mounted nach dem Laden?
    if (!calendar.value) {
      logger.debug('⚠️ Calendar unmounted during refresh, aborting')
      return
    }
    
    // 3. Warte einen Moment für State-Updates
    await nextTick()
    
    // 4. FullCalendar wird automatisch durch die watch(calendarEvents) aktualisiert
    logger.debug('✅ Calendar data refreshed')
    
    // 5. View-Position wiederherstellen falls nötig
    if (refreshStart && calendar.value?.getApi) {
      try {
        const api = calendar.value.getApi()
        
        // ✅ Zusätzliche Sicherheitsprüfung: Ist der API noch gültig?
        if (!api || typeof api.getDate !== 'function') {
          logger.debug('⚠️ Calendar API not ready, skipping position restore')
          return
        }
        
        const currentViewDate = api.getDate()
        
        // Nur wiederherstellen falls sich Position geändert hat
        if (Math.abs(currentDate.getTime() - currentViewDate.getTime()) > 24 * 60 * 60 * 1000) {
          api.gotoDate(currentDate)
          logger.debug('✅ View position restored to:', currentDate)
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
  logger.debug('🗑 Event deleted, refreshing calendar...')
  
  await loadAppointments(true)

  refreshCalendar()

  // 🆕 Event nach oben emittieren  
  emit('appointment-changed', { type: 'deleted', data: eventData })
  
  isModalVisible.value = false
}

const handleEventDeleted = (id: string) => {
  logger.debug('🗑️ Event deleted:', id)
  loadAppointments() // Kalender neu laden
}

// ✅ NEUE FUNKTION: Direktes Speichern ohne Modal
const pasteAppointmentDirectly = async () => {
  logger.debug('🎯 pasteAppointmentDirectly CALLED - checking if clipboard has data')
  
  if (!clipboardAppointment.value || !pendingSlotClick.value) {
    logger.debug('⚠️ Early return: clipboard empty?', { 
      clipboardEmpty: !clipboardAppointment.value,
      clickEmpty: !pendingSlotClick.value
    })
    return
  }
  
  logger.debug('📋 Pasting appointment directly...')
  logger.debug('🔍 FULL clipboardAppointment:', clipboardAppointment.value)
  
  try {
    // Kopierte Daten mit neuer Zeit vorbereiten
    const clickedDate = pendingSlotClick.value.date
    const endDate = new Date(clickedDate.getTime() + clipboardAppointment.value.duration * 60000)
    
    // ✅ EXPLIZITE KATEGORIE-ERMITTLUNG
    const rawCategory = clipboardAppointment.value.category || clipboardAppointment.value.type
    logger.debug('🔍 Raw category from clipboard:', rawCategory)
    
    // Bei mehreren Kategorien nur die erste nehmen
    const category = rawCategory ? rawCategory.split(',')[0].trim() : 'B'
    logger.debug('🔍 Final category:', category)
    
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
      
      logger.debug('🔄 convertToUTC:', {
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
      status: 'confirmed',
      
      // Optional aber wichtig
      event_type_code: clipboardAppointment.value.event_type_code || 'lesson',
      tenant_id: props.currentUser?.tenant_id || clipboardAppointment.value.tenant_id,
      
      // Note: Pricing, payments, discounts, products werden über separates Payment-System verwaltet
    }
    
    // ✅ FINALE DEBUG-AUSGABE
    logger.debug('💾 FINAL appointmentData before save:', appointmentData)
    
    const createResponse = await $fetch('/api/calendar/manage', {
      method: 'POST',
      body: {
        action: 'create-appointment',
        tenant_id: props.currentUser?.tenant_id || clipboardAppointment.value.tenant_id,
        appointment_data: appointmentData
      }
    }) as any
    
    if (!createResponse?.success) {
      throw new Error(createResponse?.message || 'Failed to create appointment')
    }

    const newAppointment = createResponse.data

    logger.debug('✅ Appointment created via API:', newAppointment.id)
    
    // ✅ DEBUG: Zeige ganzen clipboard content
    logger.debug('🔍 DEBUG clipboardAppointment.value:', clipboardAppointment.value)
    logger.debug('🔍 DEBUG clipboardAppointment.value.email:', clipboardAppointment.value?.email)
    logger.debug('🔍 DEBUG clipboardAppointment.value.student:', clipboardAppointment.value?.student)
    
    // ✅ FIRST: Calculate payment amount BEFORE sending email
    const basePriceMapping: Record<string, number> = {
      'B': 95, 'A': 95, 'A1': 95, 'BE': 120, 'C': 170, 
      'C1': 150, 'D': 200, 'CE': 200, 'Motorboot': 120, 'Boot': 120, 'BPT': 95
    }
    
    const durationUnits = Math.ceil((newAppointment.duration_minutes || 45) / 45)
    const basePriceChf = (basePriceMapping[category] || 95) * durationUnits
    const lessonPriceRappen = Math.round(basePriceChf * 100)
    
    // ✅ NEU: Admin Fee basierend auf pricing_rules berechnen
    let adminFeeRappen = 0
    try {
      const adminFeeResponse = await $fetch('/api/calendar/manage', {
        method: 'POST',
        body: {
          action: 'get-existing-appointments',
          tenant_id: props.currentUser?.tenant_id,
          staff_id: newAppointment.staff_id,
          start_date: null,
          end_date: null
        }
      }) as any

      const existingAppointments = adminFeeResponse?.data || []
      const appointmentCount = existingAppointments?.filter((a: any) => 
        a.user_id === newAppointment.user_id && 
        a.staff_id === newAppointment.staff_id &&
        a.id !== newAppointment.id
      ).length || 0
      
      logger.debug('📊 Existing appointments for user via API:', appointmentCount)
      
      // ✅ Get pricing rules via API
      const pricingResponse = await $fetch('/api/calendar/manage', {
        method: 'POST',
        body: {
          action: 'get-pricing-rules',
          tenant_id: props.currentUser?.tenant_id,
          category: category
        }
      }) as any

      const pricingRules = pricingResponse?.data?.[0]
      
      if (pricingRules && pricingRules.admin_fee_applies_from) {
        // Admin Fee wird NUR bei Termin N verrechnet (z.B. nur beim 2. Termin)
        // appointmentCount ist die Anzahl BESTEHENDER Termine
        // Der neue Termin ist Termin Nummer: appointmentCount + 1
        const newAppointmentNumber = appointmentCount + 1
        
        if (newAppointmentNumber === pricingRules.admin_fee_applies_from) {
          adminFeeRappen = pricingRules.admin_fee_rappen || 0
          logger.debug('✅ Admin fee applies (appointment #' + newAppointmentNumber + ') via API:', adminFeeRappen)
        } else {
          logger.debug('ℹ️ Admin fee does not apply (appointment #' + newAppointmentNumber + ', only applies at #' + pricingRules.admin_fee_applies_from + ')')
        }
      }
    } catch (err) {
      console.error('❌ Error calculating admin fee:', err)
    }
    
    const totalAmountRappen = lessonPriceRappen + adminFeeRappen
    const amountForEmail = `CHF ${(totalAmountRappen / 100).toFixed(2)}`
    
    // ✅ Extract email and student info for notification
    let studentEmail = clipboardAppointment.value?.email
    let studentName = clipboardAppointment.value?.student
    
    // ✅ If not found in clipboard, fetch from API
    if (!studentEmail || !studentName) {
      try {
        const userResponse = await $fetch('/api/calendar/manage', {
          method: 'POST',
          body: {
            action: 'get-user-data',
            tenant_id: props.currentUser?.tenant_id,
            user_id: newAppointment.user_id
          }
        }) as any

        if (userResponse?.success && userResponse.data) {
          const userData = userResponse.data
          studentEmail = studentEmail || userData.email
          studentName = studentName || `${userData.first_name} ${userData.last_name}`.trim()
        }
      } catch (err) {
        console.error('❌ Error fetching student data:', err)
      }
    }
    
    const appointmentTime = new Date(newAppointment.start_time).toLocaleString('de-CH', {
      timeZone: 'Europe/Zurich',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    // ✅ Extract staff name for email
    let staffName = clipboardAppointment.value?.staff_first_name
    if (!staffName) {
      try {
        const staffResponse = await $fetch('/api/calendar/manage', {
          method: 'POST',
          body: {
            action: 'get-staff-data',
            tenant_id: props.currentUser?.tenant_id,
            staff_id: newAppointment.staff_id
          }
        }) as any

        if (staffResponse?.success && staffResponse.data) {
          const staffData = staffResponse.data
          staffName = `${staffData.first_name} ${staffData.last_name}`.trim()
        }
      } catch (err) {
        console.error('❌ Error fetching staff data:', err)
      }
    }
    
    // ✅ NEU: Email "Bestätigung erforderlich" versenden (MIT Betrag)
    
    if (studentEmail) {
      logger.debug('📧 Sending confirmation email for pasted appointment...')
      try {
        const result = await $fetch('/api/email/send-appointment-notification', {
          method: 'POST',
          body: {
            email: studentEmail,
            studentName: studentName,
            appointmentTime: appointmentTime,
            type: 'pending_payment',
            amount: amountForEmail,
            staffName: staffName,
            tenantId: props.currentUser?.tenant_id
          }
        })
        logger.debug('✅ Confirmation email sent successfully:', result)
      } catch (emailError: any) {
        console.error('❌ Failed to send confirmation email:', emailError)
        // Nicht kritisch, Termin wurde trotzdem erstellt
      }
    } else {
      logger.debug('⚠️ No email address available for confirmation email')
    }
    
    // ✅ Payment erstellen
    // Note: Price calculation already done above for email
    const paymentData = {
      appointment_id: newAppointment.id,
      user_id: newAppointment.user_id,
      staff_id: newAppointment.staff_id,
      tenant_id: newAppointment.tenant_id,
      lesson_price_rappen: lessonPriceRappen,
      admin_fee_rappen: adminFeeRappen, // ✅ Berechnet basierend auf pricing_rules
      products_price_rappen: 0,
      discount_amount_rappen: 0,
      total_amount_rappen: totalAmountRappen, // ✅ Verwende bereits berechneten Wert
      payment_method: clipboardAppointment.value.payment_method || 'invoice', // ✅ Verwende kopierten payment_method
      payment_status: 'pending',
      currency: 'CHF',
      description: `Kopierter Termin: ${newAppointment.title}`,
      created_by: props.currentUser?.id,
      credit_used_rappen: 0
    }
    
    const { error: paymentError } = await $fetch('/api/calendar/manage', {
      method: 'POST',
      body: {
        action: 'create-payment',
        tenant_id: newAppointment.tenant_id,
        payment_data: paymentData
      }
    }).catch(() => ({ error: 'API call failed' })) as any
    
    if (paymentError) {
      console.error('⚠️ Error creating payment for copied appointment:', paymentError)
      // Nicht kritisch, Termin wurde trotzdem erstellt
    } else {
      logger.debug('✅ Payment created for copied appointment via API')
    }
    
    // Cleanup
    showClipboardChoice.value = false
    pendingSlotClick.value = null
    
    // ✅ Cache invalidieren damit loadAppointments nicht gecacht wird
    logger.debug('🔄 Reloading calendar after paste...')
    await loadAppointments(true)
    
    // ✅ Erfolgs-Nachricht
    showToast('✅ Termin erfolgreich eingefügt')
  } catch (error: any) {
    console.error('❌ Error pasting appointment:', error)
    showToast('❌ Fehler beim Einfügen: ' + error.message)
  }
}

const createNewAppointment = () => {
  if (!pendingSlotClick.value) return
  
  logger.debug('➕ Creating completely new appointment')
  
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
  
  logger.debug('✅ New appointment modal opened with clean data')
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
    logger.debug('⏰ 5-Minuten-Timeout erreicht - Clipboard wird geleert')
    clipboardAppointment.value = null
    clipboardTimeout.value = null
  }, 5 * 60 * 1000)
  
  logger.debug('⏰ 5-Minuten-Timeout für Clipboard gestartet')
}

// Copy Handler anpassen:
const handleOpenStudentProgress = async (student: any) => {
  logger.debug('👤 Opening student progress for:', student)
  
  // Schließe EventModal
  isModalVisible.value = false
  
  // Öffne EnhancedStudentModal — pending users land on details tab (reminder button)
  selectedStudentForProgress.value = student
  studentProgressActiveTab.value = !student?.auth_user_id ? 'details' : 'progress'
  showEnhancedStudentModal.value = true
}

const handleCopyAppointment = async (copyData: any) => {
  logger.debug('📋 CALENDAR: Copy event received:', copyData)
  
  // ✅ DEBUG: Alle verfügbaren Kategorie-Felder anzeigen
  logger.debug('🔍 DEBUG Category fields:', {
    'copyData.eventData.type': copyData.eventData.type,
    'copyData.eventData.extendedProps?.type': copyData.eventData.extendedProps?.type,
    'copyData.eventData.extendedProps?.category': copyData.eventData.extendedProps?.category,
    'copyData.eventData.extendedProps?.appointment_type': copyData.eventData.extendedProps?.appointment_type
  })
  
  // ✅ KORRIGIERT: Verwende die echte Termin-Kategorie
  const appointmentCategory = copyData.eventData.type || 
                              copyData.eventData.extendedProps?.type || 
                              'B' // Fallback
  
  // ✅ Fetch payment_method vom Payment-Record via API
  let paymentMethod = 'invoice' // Default
  logger.debug('🔍 Fetching payment for appointment via API:', copyData.eventData.id)
  try {
    const paymentResponse = await $fetch('/api/calendar/manage', {
      method: 'POST',
      body: {
        action: 'get-payment',
        tenant_id: props.currentUser?.tenant_id,
        payment_data: {
          appointment_id: copyData.eventData.id
        }
      }
    }) as any
    
    logger.debug('💳 Payment fetch result via API:', paymentResponse)
    
    if (paymentResponse?.success && paymentResponse.data) {
      paymentMethod = paymentResponse.data.payment_method
      logger.debug('✅ Payment method fetched via API:', paymentMethod)
    } else {
      console.warn('⚠️ Error fetching payment:', paymentResponse?.message)
    }
  } catch (err) {
    console.warn('⚠️ Could not fetch payment method:', err)
  }
  
  // In Zwischenablage speichern
  logger.debug('🔍 DEBUG copyData.eventData.extendedProps:', copyData.eventData.extendedProps)
  logger.debug('🔍 DEBUG copyData.eventData.extendedProps?.email:', copyData.eventData.extendedProps?.email)
  logger.debug('🔍 DEBUG copyData.eventData.extendedProps?.student:', copyData.eventData.extendedProps?.student)
  
  // ✅ NEU: Wenn email/student nicht in extendedProps sind, lade sie aus der DB
  let studentEmail = copyData.eventData.extendedProps?.email
  let studentName = copyData.eventData.extendedProps?.student
  
  // Falls nicht vorhanden, lade vom User via API
  if (!studentEmail || !studentName) {
    logger.debug('🔍 Email/Student not in extendedProps, loading from API...')
    try {
      const userResponse = await $fetch('/api/calendar/manage', {
        method: 'POST',
        body: {
          action: 'get-user-data',
          tenant_id: props.currentUser?.tenant_id,
          user_id: copyData.eventData.user_id
        }
      }) as any
      
      if (userResponse?.success && userResponse.data) {
        const userData = userResponse.data
        studentEmail = studentEmail || userData.email
        studentName = studentName || `${userData.first_name} ${userData.last_name}`.trim()
        logger.debug('✅ Loaded from API:', { studentEmail, studentName })
      }
    } catch (err) {
      console.warn('⚠️ Could not load user data:', err)
    }
  }
  
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
        email: studentEmail || copyData.eventData.extendedProps?.email || copyData.eventData.email, // ✅ Email aus extendedProps ODER DB ODER direkt
        student: studentName || copyData.eventData.extendedProps?.student || copyData.eventData.student, // ✅ Student name aus extendedProps ODER DB ODER direkt
        event_type_code: copyData.eventData.event_type_code || 'lesson', // ✅ Event type code
  }
  
  logger.debug('✅ Termin in Zwischenablage gespeichert:', clipboardAppointment.value)
  
  // ✅ 5-Minuten-Timeout starten
  startClipboardTimeout()
}

const cancelClipboardChoice = () => {
  logger.debug('❌ Cancelling clipboard choice')
  showClipboardChoice.value = false
  pendingSlotClick.value = null
}

// ✅ Cleanup beim Verlassen der Komponente
onUnmounted(() => {
  if (clipboardTimeout.value) {
    clearTimeout(clipboardTimeout.value)
    clipboardTimeout.value = null
    logger.debug('🧹 Clipboard timeout cleared on unmount')
  }
  
  // Clear sync interval
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    logger.debug('🧹 Sync interval cleared on unmount')
  }
  detachSwipe()
})

onMounted(async () => {
  try {
    logger.debug('📅 CalendarComponent mounted')
    isCalendarReady.value = true
    attachSwipe()
    
    // ✅ Load event-type + driving-category colors from DB (parallel)
    await Promise.all([loadEventTypeColors(), loadDrivingCategoryColors()])
    
    // ✅ Load tenant name for SMS/Email via API
    try {
      const tenantId = props.currentUser?.tenant_id
      if (tenantId) {
        const tenantResponse = await $fetch('/api/calendar/manage', {
          method: 'POST',
          body: {
            action: 'get-tenant-data',
            tenant_id: tenantId
          }
        }) as any
        
        if (tenantResponse?.success && tenantResponse.data?.name) {
          tenantName.value = tenantResponse.data.name
          logger.debug('🏢 Tenant name loaded via API:', tenantName.value)
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load tenant name:', error)
      tenantName.value = 'Fahrschule'
    }
    
    // 🔥 NEU: Calendar API Setup
    await nextTick()
    
    // ✅ Sicherheitsprüfung: Ist die Komponente noch mounted?
    if (!calendar.value) {
      logger.debug('⚠️ Calendar ref not available during mount')
      return
    }
    
    calendarApi = calendar.value.getApi()
    logger.debug('✅ Calendar API initialized')
    
    // ✅ Sicherheitsprüfung: Ist der API gültig?
    if (calendarApi && typeof calendarApi.view?.currentStart !== 'undefined') {
      emit('view-updated', calendarApi.view.currentStart)
    }
    
    // ✅ Auto-Sync alle 5 Minuten starten (nur als Backup, da wir jetzt bei jedem loadAppointments syncen)
    const { autoSyncCalendars } = useExternalCalendarSync()
    syncInterval = setInterval(async () => {
      logger.debug('⏰ Auto-sync interval triggered (every 5 min) - backup sync')
      try {
        const result = await autoSyncCalendars(props.currentUser?.id)
        if (result.success && !result.skipped) {
          logger.debug('✅ Auto-sync completed, reloading events')
          await loadAppointments(true)
        }
      } catch (err) {
        console.warn('Auto-sync interval failed (non-fatal):', err)
      }
    }, 5 * 60 * 1000) // 5 Minuten
    logger.debug('✅ Auto-sync interval started (every 5 min) - backup sync')
    
    logger.debug('🔄 Initial appointment loading...')
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
  logger.debug('🔄 Admin staff filter changed:', newFilter)
  if (props.currentUser?.role === 'admin') {
    await loadAppointments(true)
  }
}, { immediate: false })

// ✅ Watch für User-Änderungen mit Cache-Invalidierung (Props)
watch(() => props.currentUser, async (newUser, oldUser) => {
  if (newUser && newUser.id !== oldUser?.id) {
    logger.debug('🔄 User changed via props, reloading')
    await loadAppointments(true)
  }
}, { deep: true })

// ✅ Watch für User-Änderungen vom Composable (z.B. nach Login)
watch(() => composableCurrentUser.value?.id, async (newId, oldId) => {
  if (newId && newId !== oldId && calendar.value) {
    logger.debug('🔄 User ID available from composable, loading appointments:', newId)
    await loadAppointments(true)
  }
})

watch(calendarEvents, (newEvents) => {
  try {
    logger.debug('🔄 calendarEvents changed, updating FullCalendar:', newEvents.length)
    
    if (!calendar.value?.getApi) {
      logger.debug('⚠️ Calendar not ready, skipping event update')
      return
    }
    
    try {
      const api = calendar.value.getApi()
      
      if (!api || typeof api.getEvents !== 'function') {
        logger.debug('⚠️ Calendar API not ready, skipping event update')
        return
      }
      
      // ALWAYS update - old length check skipped edits and caused stale display
      logger.debug('🔄 Updating calendar events...')
      api.removeAllEvents()
      api.removeAllEventSources()
      newEvents.forEach(event => api.addEvent(event))
      logger.debug('✅ Calendar events updated:', newEvents.length)
    } catch (error) {
      console.error('❌ Error updating calendar events:', error)
    }
  } catch (error) {
    console.error('❌ Error in calendarEvents watcher:', error)
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
  <div class="relative calendar-root" ref="rootEl">
    <!-- Loading Overlay -->
    <div v-if="isLoadingEvents" class="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-50 gap-4">
      <LoadingLogo size="xl" />
      <p class="text-sm text-gray-500 font-medium">Termine werden geladen...</p>
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
  @close="() => { isModalVisible = false; loadAppointments(true) }"
  @save-event="handleSaveEvent"       
  @delete-event="handleEventDeleted"
  @copy-appointment="handleCopyAppointment"
  @open-student-progress="handleOpenStudentProgress"
  @refresh-calendar="refreshCalendar"
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
    @open-reminder-modal="handleOpenReminderModal"
  />

  <!-- Pending Onboarding Reminder Modal -->
  <div v-if="showPendingReminderModal" class="fixed inset-0 z-[9999] flex items-center justify-center">
    <div class="absolute inset-0 bg-black bg-opacity-50" @click="showPendingReminderModal = false" />
    <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
      <h3 class="text-lg font-semibold text-gray-900">Onboarding-Erinnerung senden</h3>
      <p class="text-sm text-gray-600">
        SMS mit neuem Onboarding-Link an
        <strong>{{ pendingReminderStudent?.first_name }} {{ pendingReminderStudent?.last_name }}</strong>
        ({{ pendingReminderStudent?.phone }}) senden?
      </p>
      <div v-if="pendingReminderResult" :class="[
        'p-3 rounded-lg text-sm font-medium',
        pendingReminderResult.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      ]">
        {{ pendingReminderResult.message }}
      </div>
      <div class="flex gap-3">
        <button
          @click="showPendingReminderModal = false"
          class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          :disabled="isResendingPendingSms"
        >
          Abbrechen
        </button>
        <button
          @click="resendPendingOnboardingSms"
          :disabled="isResendingPendingSms || pendingReminderResult?.type === 'success'"
          class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          <span v-if="isResendingPendingSms">Wird gesendet…</span>
          <span v-else>SMS senden</span>
        </button>
      </div>
    </div>
  </div>

</template>

<style>
/* === KALENDER CONTAINER === */
.calendar-root {
  height: calc(100svh - 50px - env(safe-area-inset-bottom, 0px));
}

/* === KALENDER BASIS === */
.fc {
  background-color: white !important;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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

.fc-event.category-Motorboot,
.fc-event.category-Boot {
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

.category-Motorboot,
.category-Boot {
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

/* ✅ Roter Rahmen für unbezahlte Termine */
.fc-event.unpaid-appointment {
  border: 1px solid #ef4444 !important;
  border-left: 2px solid #ef4444 !important;
}

/* ✅ CSS für reservierte Slots (Booking-Reservierungen in Echtzeit) */
.fc .fc-event.reserved-slot-event {
  background-color: #9ca3af !important;
}

.fc .fc-event.reserved-slot-event .fc-bg {
  background-color: #9ca3af !important;
}

.fc .fc-event.reserved-slot-event .fc-event-main {
  background-color: #9ca3af !important;
}

.fc .fc-event.reserved-slot-event .fc-event-main-frame {
  background-color: #9ca3af !important;
}

.fc .fc-daygrid-event.reserved-slot-event {
  background-color: #9ca3af !important;
}

.fc .fc-daygrid-event.reserved-slot-event .fc-event-main {
  background-color: #9ca3af !important;
}

.fc .fc-timegrid-event.reserved-slot-event {
  background-color: #9ca3af !important;
}

.fc .fc-timegrid-event.reserved-slot-event .fc-event-bg {
  background-color: #9ca3af !important;
}

.fc .fc-event.reserved-slot-event,
.fc .fc-daygrid-event.reserved-slot-event,
.fc .fc-timegrid-event.reserved-slot-event {
  border: 2px solid #6b7280 !important;
  color: #374151 !important;
}

.fc .fc-event.reserved-slot-event .fc-event-title {
  font-weight: 600 !important;
  text-decoration: underline !important;
  color: #374151 !important;
  font-size: 0.85rem !important;
}

/* Tailwind CSS ::selection Duplikate bereinigen */
::selection {
  background-color: rgb(var(--color-primary-DEFAULT) / 0.4);
}

</style>