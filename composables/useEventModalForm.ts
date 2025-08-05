// composables/useEventModalForm.ts
import { ref, computed, readonly } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useTimeCalculations } from '~/composables/useTimeCalculations'
import { useCategoryData } from '~/composables/useCategoryData'
import { toLocalTimeString } from '~/utils/dateUtils'
import { useAutoAssignStaff } from '~/composables/useAutoAssignStaff'


export const useEventTypes = () => {
  const eventTypesCache = ref<string[]>([])
  const eventTypesFullCache = ref<any[]>([]) // ✅ NEU: Für komplette Objekte
  const isEventTypesLoaded = ref(false)
  
// useEventModalForm.ts - erweitern Sie die loadEventTypes Funktion
const loadEventTypes = async (excludeTypes: string[] = [], loadFullObjects: boolean = false) => {
  if (isEventTypesLoaded.value && !loadFullObjects) return eventTypesCache.value
  
  try {
    const supabase = getSupabase()
    console.log('🔄 Loading event types from database...')
    
    const { data, error } = await supabase
      .from('event_types')
      .select(loadFullObjects ? '*' : 'code')
      .eq('is_active', true)
      .order('display_order')
    
    if (error) throw error
    
    if (loadFullObjects) {
      // ✅ DEBUG: Alle Event Type Codes anzeigen
      console.log('🔍 All event type codes in DB:', (data || []).map(et => et.code))
      
      // Filter anwenden für komplette Objekte
      const filteredData = (data || []).filter(eventType => 
        !excludeTypes.includes(eventType.code)
      )
      
      console.log('✅ Full event types loaded (filtered):', filteredData.length, 'of', data?.length, 'total')
      return filteredData
      
    } else {
      // Original Code logic für nur Codes
      const allCodes = data?.map((et: any) => et.code) || []
      console.log('🔍 All event type codes in DB:', allCodes)
      
      eventTypesCache.value = allCodes.filter(code => !excludeTypes.includes(code))
      isEventTypesLoaded.value = true
      
      console.log('✅ Event types loaded:', eventTypesCache.value, excludeTypes.length > 0 ? `(excluded: ${excludeTypes.join(', ')})` : '')
      return eventTypesCache.value
    }
    
  } catch (err) {
    console.error('❌ Error loading event types from DB:', err)
    
    if (loadFullObjects) {
      return []
    } else {
      // Fallback ohne excluded types
      eventTypesCache.value = ['meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other']
      isEventTypesLoaded.value = true
      return eventTypesCache.value
    }
  }
}
  
  return {
    eventTypesCache: computed(() => eventTypesCache.value),
    isEventTypesLoaded: computed(() => isEventTypesLoaded.value),
    loadEventTypes
  }
}

interface Refs {
  customerInviteSelectorRef?: any
  staffSelectorRef?: any
  priceDisplayRef?: any  // ✅ HINZUFÜGEN
  invitedCustomers?: any
  invitedStaffIds?: any
}

// Types (können später in separates types file)
interface AppointmentData {
  id?: string
  title: string
  description: string
  type: string
  event_type_code?: string      
  appointment_type?: string       
  startDate: string
  startTime: string
  endTime: string 
  duration_minutes: number
  user_id: string
  staff_id: string
  location_id: string
  price_per_minute: number
  status: string
  eventType: string 
  selectedSpecialType: string 
  is_paid: boolean 
  discount?: number
  discount_type?: string
  discount_reason?: string
  payment_method?: string
  payment_data?: any
  payment_status?: string

}

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
  preferred_location_id?: string
  preferred_duration?: number 
}

interface EventModalCallbacks {
  onCustomerInvites?: (appointmentData: any) => Promise<any[]>
  onTeamInvites?: (appointmentData: any) => Promise<any[]>
}

export const useEventModalForm = (currentUser?: any, refs?: {
  customerInviteSelectorRef?: any,
  staffSelectorRef?: any,
  invitedCustomers?: any,
  invitedStaffIds?: any,
  selectedLocation?: any,
  priceDisplayRef?: any,  
  emit?: any,
  props?: any,
}) => {
  
    // ✅ Composables initialisieren
  const categoryData = useCategoryData()
  const eventTypes = useEventTypes()
  const { checkFirstAppointmentAssignment } = useAutoAssignStaff()
  const supabase = getSupabase()

  const customerInviteSelectorRef = ref()
  const invitedCustomers = ref<any[]>([])  
  // Setter-Funktionen für EventModal
  const setCustomerInviteRef = (ref: any) => {
    customerInviteSelectorRef.value = ref
  }
  
  const setInvitedCustomers = (customers: any[]) => {
    invitedCustomers.value = customers
  }

  // ============ STATE ============
  const formData = ref<AppointmentData>({
    title: '',
    description: '',
    type: '',
    startDate: '',
    startTime: '',
    endTime: '',
    duration_minutes: 45,
    user_id: '',
    staff_id: '',
    location_id: '',
    price_per_minute: 0,
    status: 'booked',
    eventType: 'lesson',
    selectedSpecialType: '',
    is_paid: false,
    discount: 0,
    discount_type: 'fixed',
    discount_reason: '',
    payment_method: 'cash',
    payment_data: null,
    payment_status: 'pending'
  })

  const selectedStudent = ref<Student | null>(null)
  const selectedCategory = ref<any>(null)
  const selectedLocation = ref<any>(null)
  const availableDurations = ref<number[]>([45])
  const appointmentNumber = ref<number>(1)
  const selectedLessonType = ref('lesson')

  
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ============ COMPUTED ============
  
  const hasValidLocation = computed(() => {
  // 1. Echte Location ID aus DB
  if (formData.value.location_id && !formData.value.location_id.startsWith('temp_')) {
    return true
  }
  
  // 2. Temporäre Location ID (wird beim Speichern konvertiert)
  if (formData.value.location_id && formData.value.location_id.startsWith('temp_')) {
    return true
  }
  
  // 3. selectedLocation hat eine ID (Fallback)
  if (selectedLocation.value && selectedLocation.value.id) {
    return true
  }
  
  return false
})

const isFormValid = computed(() => {
  const lessonTypes = ['lesson', 'exam', 'theory']
  
  if (lessonTypes.includes(formData.value.eventType)) {
    const lessonValid = !!(selectedStudent.value &&
                         formData.value.type &&
                         formData.value.startDate &&
                         formData.value.startTime &&
                         hasValidLocation.value &&  // ✅ Neue Location-Validierung
                         formData.value.staff_id)
    
    console.log('🔍 LESSON VALIDATION (TEMP-FIXED):', {
      isValid: lessonValid,
      eventType: formData.value.eventType,
      selectedStudent: !!selectedStudent.value,
      studentName: selectedStudent.value ? `${selectedStudent.value.first_name} ${selectedStudent.value.last_name}` : 'FEHLT',
      type: formData.value.type || 'FEHLT',
      startDate: formData.value.startDate || 'FEHLT',
      startTime: formData.value.startTime || 'FEHLT',
      // ✅ Erweiterte Location-Info:
      location_id: formData.value.location_id || 'FEHLT',
      location_is_temp: formData.value.location_id?.startsWith('temp_') || false,
      selectedLocation_name: selectedLocation.value?.name || 'KEINE',
      selectedLocation_id: selectedLocation.value?.id || 'KEINE',
      hasValidLocation: hasValidLocation.value,
      staff_id: formData.value.staff_id || 'FEHLT'
    })
    
    return lessonValid
  } else {
    const otherValid = !!(formData.value.title &&
                        formData.value.startDate &&
                        formData.value.startTime &&
                        hasValidLocation.value &&  // ✅ Neue Location-Validierung
                        formData.value.staff_id)
    
    console.log('🔍 OTHER VALIDATION (TEMP-FIXED):', {
      isValid: otherValid,
      eventType: formData.value.eventType,
      title: formData.value.title || 'FEHLT',
      startDate: formData.value.startDate || 'FEHLT',
      startTime: formData.value.startTime || 'FEHLT',
      location_id: formData.value.location_id || 'FEHLT',
      location_is_temp: formData.value.location_id?.startsWith('temp_') || false,
      hasValidLocation: hasValidLocation.value,
      staff_id: formData.value.staff_id || 'FEHLT'
    })
    
    return otherValid
  }
})
  const computedEndTime = computed(() => {
    if (!formData.value.startTime || !formData.value.duration_minutes) return ''
    
    const [hours, minutes] = formData.value.startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    
    const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)
    
    const endHours = String(endDate.getHours()).padStart(2, '0')
    const endMinutes = String(endDate.getMinutes()).padStart(2, '0')
    
    return `${endHours}:${endMinutes}`
  })

  const totalPrice = computed(() => {
    const pricePerMinute = formData.value.price_per_minute || (95/45)
    const total = pricePerMinute * (formData.value.duration_minutes || 45)
    return total.toFixed(2)
  })

  // ============ FORM ACTIONS ============
  const resetForm = () => {
    console.log('🔄 Resetting form data')
    
    formData.value = {
      title: '',
      description: '',
      type: '',
      startDate: '',
      startTime: '',
      endTime: '',
      duration_minutes: 45,
      user_id: '',
      staff_id: currentUser?.id || '',
      location_id: '',
      price_per_minute: 0,
      status: 'booked',
      eventType: 'lesson',
      selectedSpecialType: '',
      is_paid: false,
      discount: 0,
      discount_type: 'fixed',
      discount_reason: ''
    }
    
    selectedStudent.value = null
    selectedCategory.value = null
    selectedLocation.value = null
    availableDurations.value = [45]
    appointmentNumber.value = 1
    error.value = null
  }


// In useEventModalForm.ts - korrektes System basierend auf event_types DB:

const populateFormFromAppointment = async (appointment: any) => {
  console.log('📝 Populating form from appointment:', appointment?.id)
  
  // Debug: Alle möglichen Type-Felder ausgeben
  console.log('🔍 ALL TYPE FIELDS:', {
    'extendedProps.type': appointment.extendedProps?.type,
    'type': appointment.type,
    'extendedProps.appointment_type': appointment.extendedProps?.appointment_type,
    'extendedProps.eventType': appointment.extendedProps?.eventType,
    'appointment_type': appointment.appointment_type,
    'eventType': appointment.eventType
  })
  
  // ✅ Event Type Code ermitteln - das ist der wichtigste Wert!
  const rawEventTypeCode = appointment.extendedProps?.appointment_type || 
                          appointment.type || 
                          appointment.extendedProps?.type || 
                          appointment.extendedProps?.eventType ||
                          'lesson' // Default
  
  // ✅ Event Types aus DB laden
  const allEventTypeCodes = await eventTypes.loadEventTypes()
  
  // ✅ MIGRATIONS-LOGIK für bestehende Termine:
  // Wenn rawEventTypeCode eine Fahrkategorie ist (B, A1, etc.), dann ist es ein 'lesson'
  // Wenn rawEventTypeCode ein gültiger Event Type ist, dann verwenden
  
  let eventTypeCode: string
  let drivingCategory: string
  
  if (allEventTypeCodes.includes(rawEventTypeCode)) {
    // Es ist bereits ein gültiger Event Type Code
    eventTypeCode = rawEventTypeCode
    drivingCategory = appointment.extendedProps?.category || 
                     appointment.category ||
                     'B' // Default Fahrkategorie
  } else {
    // Es ist wahrscheinlich eine Fahrkategorie (B, A1, etc.) - Legacy Format
    eventTypeCode = 'lesson' // ✅ Bestehende Termine sind normale Fahrstunden
    drivingCategory = rawEventTypeCode // Die Fahrkategorie
  }
  
  console.log('🔍 Migration logic applied:', {
    rawEventTypeCode,
    eventTypeCode,
    drivingCategory,
    allEventTypeCodes: allEventTypeCodes.slice(0, 5)
  })

  console.log('🔍 CATEGORY SOURCES DEBUG:', {
  'appointment.type': appointment.type,
  'appointment.category': appointment.category,
  'appointment.extendedProps?.category': appointment.extendedProps?.category,
  'appointment.extendedProps?.original_type': appointment.extendedProps?.original_type,
  'rawEventTypeCode': rawEventTypeCode,
  allSources: {
    type: appointment.type,
    category: appointment.category,
    extPropsCategory: appointment.extendedProps?.category,
    extPropsOriginalType: appointment.extendedProps?.original_type,
    extPropsAppointmentType: appointment.extendedProps?.appointment_type
  }
})
  
  // ✅ EINFACHE LOGIK basierend auf event_types DB:
  // - lesson, exam, theory = LESSON TYPE (zeigt StudentSelector + LessonTypeSelector)
  // - meeting, pgs, vku, etc. = OTHER TYPE (zeigt EventTypeSelector)
  
  const lessonEventTypes = ['lesson', 'exam', 'theory']
  const isLessonType = lessonEventTypes.includes(eventTypeCode)
  
  console.log('🔍 Event type detection:', {
    eventTypeCode,
    isLessonType,
    allEventTypeCodes: allEventTypeCodes.slice(0, 5),
    lessonEventTypes
  })
  
  // Zeit-Verarbeitung
  const startDateTime = new Date(appointment.start_time || appointment.start)
  const endDateTime = appointment.end_time || appointment.end ? new Date(appointment.end_time || appointment.end) : null
  const startDate = toLocalTimeString(startDateTime).split('T')[0]
  const startTime = startDateTime.toTimeString().slice(0, 5)
  const endTime = endDateTime ? endDateTime.toTimeString().slice(0, 5) : ''
  
  let duration = appointment.duration_minutes || appointment.extendedProps?.duration_minutes
  if (!duration && endDateTime) {
    duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
  }
  duration = duration || 45
  
  // ✅ Form Data setzen - KORREKTE Struktur
  formData.value = {
    id: appointment.id || '',
    title: appointment.title || '',
    description: appointment.description || appointment.extendedProps?.description || '',
    type: isLessonType ? drivingCategory : eventTypeCode, // Fahrkategorie für lessons, event_type_code für others
    appointment_type: eventTypeCode, // Der tatsächliche event_type_code
    startDate: startDate,
    startTime: startTime,
    endTime: endTime,
    duration_minutes: duration,
    user_id: appointment.user_id || appointment.extendedProps?.user_id || '',
    staff_id: appointment.staff_id || appointment.extendedProps?.staff_id || currentUser?.id || '',
    location_id: appointment.location_id || appointment.extendedProps?.location_id || '',
    price_per_minute: appointment.price_per_minute || appointment.extendedProps?.price_per_minute || 0,
    status: appointment.status || appointment.extendedProps?.status || 'confirmed',
    // ✅ WICHTIG: Korrekte eventType Bestimmung
    eventType: isLessonType ? 'lesson' : 'other',
    selectedSpecialType: isLessonType ? '' : eventTypeCode,
    is_paid: appointment.is_paid || appointment.extendedProps?.is_paid || false,
    discount: appointment.discount || appointment.extendedProps?.discount || 0,
    discount_type: appointment.discount_type || appointment.extendedProps?.discount_type || 'fixed',
    discount_reason: appointment.discount_reason || appointment.extendedProps?.discount_reason || '',
    payment_method: appointment.payment_method || appointment.extendedProps?.payment_method || 'cash',
    payment_data: appointment.payment_data || appointment.extendedProps?.payment_data || null,
    payment_status: appointment.payment_status || appointment.extendedProps?.payment_status || 'pending'
  }
  
  console.log('✅ Form populated:', {
    eventTypeCode,
    isLessonType,
    eventType: formData.value.eventType,
    type: formData.value.type,
    appointment_type: formData.value.appointment_type,
    selectedSpecialType: formData.value.selectedSpecialType
  })

  if (isLessonType) {
    selectedLessonType.value = eventTypeCode // ✅ exam, lesson, theory
  }
  
  // ✅ Student für Lesson Types laden
  if (isLessonType && formData.value.user_id) {
    console.log('👤 Loading student for lesson type:', formData.value.user_id)
    try {
      const { data: student, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', formData.value.user_id)
        .single()
      
      if (error) throw error
      
      if (student) {
        selectedStudent.value = student
        console.log('✅ Student loaded:', student.first_name)
      }
    } catch (err) {
      console.error('❌ Error loading student:', err)
    }
  }
  
  // ✅ Location immer laden falls vorhanden
  if (formData.value.location_id) {
    console.log('📍 Loading location:', formData.value.location_id)
    try {
      const { data: location, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', formData.value.location_id)
        .single()
      
      if (error) throw error
      
      if (location) {
        selectedLocation.value = location
        console.log('✅ Location loaded:', location.name)
      }
    } catch (err) {
      console.error('❌ Error loading location:', err)
    }
  }
// useEventModalForm.ts - Zeile 478 ersetzen (den Debug-Code erweitern):

// ✅ VOLLSTÄNDIGES DEBUGGING der appointment Struktur
console.log('🔍 COMPLETE APPOINTMENT STRUCTURE:', JSON.stringify(appointment, null, 2))
console.log('🔍 APPOINTMENT TOP LEVEL:', {
  id: appointment.id,
  title: appointment.title,
  discount: appointment.discount,
  discount_type: appointment.discount_type,
  discount_reason: appointment.discount_reason
})
console.log('🔍 APPOINTMENT EXTENDED PROPS:', {
  extendedProps: appointment.extendedProps,
  'extendedProps.discount': appointment.extendedProps?.discount,
  'extendedProps.discount_type': appointment.extendedProps?.discount_type,
  'extendedProps.discount_reason': appointment.extendedProps?.discount_reason
})

// ✅ ERWEITERTE Suche nach Rabatt-Daten in allen möglichen Orten
const discountAmount = appointment.discount || 
                      appointment.extendedProps?.discount || 
                      appointment.extendedProps?.discountAmount ||
                      0

const discountType = appointment.discount_type || 
                    appointment.extendedProps?.discount_type ||
                    appointment.extendedProps?.discountType ||
                    'fixed'

const discountReason = appointment.discount_reason || 
                      appointment.extendedProps?.discount_reason ||
                      appointment.extendedProps?.discountReason ||
                      ''

console.log('💰 Loading discount from appointment data:', {
  discount: discountAmount,
  discount_type: discountType,
  discount_reason: discountReason,
  sources: {
    'appointment.discount': appointment.discount,
    'extendedProps.discount': appointment.extendedProps?.discount,
    'appointment.discount_type': appointment.discount_type,
    'extendedProps.discount_type': appointment.extendedProps?.discount_type
  }
})

// Setze Rabatt-Werte
formData.value.discount = discountAmount
formData.value.discount_type = discountType
formData.value.discount_reason = discountReason

console.log('✅ Discount loaded from appointment:', {
  amount: formData.value.discount,
  type: formData.value.discount_type,
  reason: formData.value.discount_reason
})
}

const { calculateEndTime } = useTimeCalculations(formData)


  // ============ SAVE/DELETE LOGIC ============ 
  // Zuerst diese Hilfsfunktion ganz oben in useEventModalForm.ts hinzufügen:
const saveWithOfflineSupport = async (
  table: string, 
  data: any, 
  action: string = 'insert', 
  where: any = null, 
  operationName: string
) => {
  try {
    const supabase = getSupabase()
    
    let result
    switch (action) {
      case 'insert':
        result = await supabase.from(table).insert(data).select().single()
        break
      case 'update':
        result = await supabase.from(table).update(data).eq('id', where.id).select().single()
        break
      case 'delete':
        result = await supabase.from(table).delete().eq('id', where.id)
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }
    
    if (result.error) throw result.error
    console.log(`✅ Online save successful: ${operationName}`)
    return result
    
  } catch (error: any) {
    console.log(`📦 Network error, saving offline: ${operationName}`)
    
    // In Offline-Queue speichern
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]')
    queue.push({ 
      table, 
      action, 
      data, 
      where, 
      operationName, 
      timestamp: Date.now(),
      retryCount: 0
    })
    localStorage.setItem('offline_queue', JSON.stringify(queue))
    
    // Fake Success für UI (Optimistic Update)
    const fakeResult = { 
      data: action === 'delete' ? null : { ...data, id: `temp_${Date.now()}` },
      error: null 
    }
    
    console.log(`📦 Saved to offline queue: ${operationName}`)
    
    // Bei Netzwerk-Fehlern: Optimistic Update
    if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
      return fakeResult
    }
    
    // Bei echten DB-Fehlern: Fehler weiterwerfen
    throw error
  }
}

const cleanUUIDFields = (data: any) => {
  const cleaned = { ...data }
  
  // Bereinige alle UUID-Felder von temporären IDs
  const uuidFields = ['user_id', 'staff_id', 'location_id', 'id']
  
  uuidFields.forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      // Entferne temporäre IDs (setze auf null)
      if (cleaned[field].startsWith('temp_') || 
          cleaned[field].startsWith('manual_') ||
          cleaned[field].includes('temp_manual_')) {
        console.log(`🧹 Removing temp ID from ${field}:`, cleaned[field])
        cleaned[field] = null
      }
    }
  })
  
  console.log('🧹 UUID fields cleaned:', cleaned)
  return cleaned
}

// Dann die saveAppointment Funktion ersetzen:
const saveAppointment = async (mode: 'create' | 'edit', eventId?: string) => {
    console.log('🔥🔥🔥 useEventModalForm saveAppointment called!') 

  isLoading.value = true
  error.value = null
  
  try {
    if (!isFormValid.value) {
      throw new Error('Bitte füllen Sie alle Pflichtfelder aus')
    }
    
    // Auth Check (mit Offline-Fallback)
    let dbUser
    try {
      const supabase = getSupabase()
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (!authData?.user) {
        throw new Error('Nicht authentifiziert')
      }
      
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single()
      
      if (!data) {
        throw new Error('User-Profil nicht gefunden')
      }
      
      dbUser = data
    } catch (authError) {
      console.log('⚠️ Auth check failed (offline?), using fallback')
      // Bei Offline: Verwende aktuelle User-Daten als Fallback
      dbUser = { 
        id: formData.value.staff_id || 'offline_staff_' + Date.now() 
      }
    }

const localStartString = `${formData.value.startDate}T${formData.value.startTime}:00`
const localEndString = `${formData.value.startDate}T${formData.value.endTime}:00`

console.log('🔍 SAVING TO DB (LOCAL TIME):', {
  start_time: localStartString,
  end_time: localEndString,
  note: 'NO TIMEZONE INFO - PURE LOCAL TIME'
})

// Appointment Data
const appointmentData = {
  title: formData.value.title,
  description: formData.value.description,
  user_id: formData.value.user_id,
  staff_id: formData.value.staff_id || dbUser.id,
  location_id: formData.value.location_id,
  start_time: localStartString,  
  end_time: localEndString,     
  duration_minutes: formData.value.duration_minutes,
  type: formData.value.eventType === 'lesson' ? formData.value.type : formData.value.type,  // Immer formData.value.type (die Fahrkategorie)
  event_type_code: formData.value.eventType === 'lesson' ? formData.value.appointment_type : formData.value.selectedSpecialType,
  status: formData.value.status,
  price_per_minute: formData.value.price_per_minute,
  is_paid: formData.value.is_paid,
  discount: formData.value.discount || 0,                    
  discount_type: formData.value.discount_type || 'fixed',   
  discount_reason: formData.value.discount_reason || '', 

}

    const cleanedAppointmentData = cleanUUIDFields({
      ...appointmentData,
      user_id: appointmentData.user_id || appointmentData.staff_id || dbUser.id,        
      staff_id: appointmentData.staff_id || null,
      location_id: appointmentData.location_id || null
    })
    
    console.log('💾 Saving appointment data:', cleanedAppointmentData)
    

    // Dann cleanedAppointmentData verwenden statt appointmentData:
    let result
    if (mode === 'edit' && eventId) {
      result = await saveWithOfflineSupport(
        'appointments',
        cleanedAppointmentData,  // ← Gereinigte Daten verwenden
        'update',
        { id: eventId },
        `Termin "${cleanedAppointmentData.title}" bearbeiten`
      )
    } else {
      result = await saveWithOfflineSupport(
        'appointments', 
        cleanedAppointmentData,  // ← Gereinigte Daten verwenden
        'insert',
        null,
        `Termin "${cleanedAppointmentData.title}" erstellen`
      )
    }
    
    console.log('✅ Appointment saved:', result?.data?.id || 'offline')

const savedAppointmentId = result.data.id

// ✅ AUTO-ASSIGNMENT beim ersten Termin mit spezifischem Staff
if (savedAppointmentId && 
    cleanedAppointmentData.user_id && 
    cleanedAppointmentData.staff_id &&
    !String(savedAppointmentId).startsWith('temp_')) {
  
  try {
    const assignment = await checkFirstAppointmentAssignment({
      user_id: cleanedAppointmentData.user_id,
      staff_id: cleanedAppointmentData.staff_id
    })
    
    if (assignment.assigned) {
      console.log(`✅ Auto-Assignment: ${assignment.studentName} - Staff hinzugefügt (${assignment.totalStaff} Staff total)`)
    } else {
      console.log(`ℹ️ No auto-assignment: ${assignment.reason}`)
    }
  } catch (assignmentError) {
    console.error('❌ Auto-Assignment Fehler:', assignmentError)
    // Fehler nicht weiterwerfen - Termin ist bereits gespeichert
  }
}

// useEventModalForm.ts - ändere den Debug:
console.log('🔍 DEBUG Payment Method:', {
  paymentMethod: cleanedAppointmentData.payment_method, // ← Das richtige Objekt
  formDataMethod: formData.value.payment_method, // ← Vergleich
  savedAppointmentId,
  willCreatePayment: cleanedAppointmentData.payment_method === 'twint' || cleanedAppointmentData.payment_method === 'online'
})

// ✅ EINFACHER TEST - mit RPC Call (umgeht RLS):
if (savedAppointmentId) { // ← Erstelle IMMER einen Payment für den Test
  console.log('🔥 Creating payment record for TESTING...')
  
  // Verwende den direkten Supabase Insert statt RPC:
  try {
    const supabase = getSupabase()
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        appointment_id: savedAppointmentId,
        user_id: cleanedAppointmentData.user_id,
        staff_id: cleanedAppointmentData.staff_id,
        amount_rappen: 9500, // Hardcode für Test
        total_amount_rappen: 9500,
        payment_method: 'twint', // Hardcode für Test
        payment_status: 'pending',
        currency: 'CHF',
        description: 'Test Payment'
      })

    if (paymentError) {
      console.error('❌ RPC Error:', paymentError)
    } else {
      console.log('✅ Payment record created via RPC')
    }
    
  } catch (err) {
    console.error('❌ Payment creation failed:', err)
  }
}

console.log('🔍 PRODUCT DEBUGGING:', {
  savedAppointmentId,
  hasRefs: !!refs,
  hasPriceDisplayRef: !!refs?.priceDisplayRef,
  priceDisplayRefValue: refs?.priceDisplayRef?.value
})

// ✅ SICHERE Null-Checks mit optionalem Chaining
if (refs?.priceDisplayRef?.value && savedAppointmentId) {
  console.log('📦 PriceDisplay found:', refs.priceDisplayRef.value)
  
  // ✅ DIREKT auf productSale zugreifen
  const priceDisplayInstance = refs.priceDisplayRef.value
  if (priceDisplayInstance.productSale?.selectedProducts?.value?.length > 0) {
    console.log('📦 ProductSale found with products:', priceDisplayInstance.productSale.selectedProducts.value.length)
    
    try {
      // ✅ KORREKTE Speicherung über das productSale composable
      await priceDisplayInstance.productSale.saveAppointmentProducts(savedAppointmentId)
      console.log('✅ Products saved via productSale')
    } catch (error) {
      console.error('❌ Error saving products:', error)
    }
  } else {
    console.log('❌ No productSale or products found')
  }
} else {
  console.log('❌ No PriceDisplay ref or savedAppointmentId')
}

    // 🔍 DEBUG LOGS HINZUFÜGEN:
    console.log('🔍 SMS Debug:', {
      hasRefs: !!refs,
      hasCustomerRef: !!refs?.customerInviteSelectorRef,
      hasCustomerRefValue: !!refs?.customerInviteSelectorRef?.value,
      resultId: result?.data?.id,
      isTemporary: String(result?.data?.id || '').startsWith('temp_')
    })
    
    // Handle customer invites with SMS (nur bei echten IDs, nicht temp_)
    if (refs?.customerInviteSelectorRef?.value && result?.data?.id && !String(result.data.id).startsWith('temp_')) {
      console.log('📱 Creating customer invites with SMS...')
      try {
        const customerInvites = await refs.customerInviteSelectorRef.value.createInvitedCustomers({
          ...appointmentData,
          id: result.data.id
        })
        console.log('✅ Customer invites created with SMS:', customerInvites.length)
      } catch (inviteError) {
        console.error('❌ Error creating customer invites:', inviteError)
        // Continue even if invites fail - main appointment is saved
      }
    } else if (refs?.customerInviteSelectorRef?.value && String(result?.data?.id || '').startsWith('temp_')) {
      console.log('📦 Customer invites will be created when synced online')
    }

    // ✅ SUCCESS: Emit save event (Modal wird von EventModal.vue geschlossen)
    const savedData = result?.data || cleanedAppointmentData
    console.log('✅ Emitting save event - modal will close automatically')
    
    // Events emittieren - EventModal.vue behandelt das Schließen
    if (refs?.emit) {
      refs.emit('save-event', savedData)
      refs.emit('appointment-saved', savedData)
    }
    
    return savedData
    
  } catch (err: any) {
    console.error('❌ Save error:', err)
    
    // Bei Offline: Benutzerfreundliche Behandlung
    if (err.message?.includes('synchronisiert')) {
      console.log('📦 Appointment will be synced when online')
      // Nicht als Fehler behandeln - optimistic update
      error.value = null
      
      // Erstelle Fallback-Objekt mit den Form-Daten
      const fallbackAppointment = {
        id: `temp_${Date.now()}`,
        title: formData.value.title,
        description: formData.value.description,
        user_id: formData.value.user_id,
        staff_id: formData.value.staff_id,
        location_id: formData.value.location_id,
        start_time: `${formData.value.startDate}T${formData.value.startTime}:00`,
        end_time: `${formData.value.startDate}T${formData.value.endTime}:00`,
        duration_minutes: formData.value.duration_minutes,
        type: formData.value.eventType === 'lesson' ? formData.value.appointment_type || formData.value.type : formData.value.type,
        event_type_code: formData.value.eventType === 'lesson' ? formData.value.appointment_type : formData.value.selectedSpecialType,
        status: formData.value.status,
        price_per_minute: formData.value.price_per_minute,
        is_paid: formData.value.is_paid
      }
      
      // ✅ AUCH BEI OFFLINE: Events emittieren - Modal wird von EventModal.vue geschlossen
      if (refs?.emit) {
        refs.emit('save-event', fallbackAppointment)
        refs.emit('appointment-saved', fallbackAppointment)
      }
      
      return fallbackAppointment
    } else {
      // Echte Fehler normal behandeln - Modal BLEIBT OFFEN
      error.value = err.message
      throw err
    }
  } finally {
    isLoading.value = false
  }
}

  const deleteAppointment = async (eventId: string) => {
    isLoading.value = true
    
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', eventId)
      
      if (error) throw error
      
      console.log('✅ Appointment deleted:', eventId)
      
    } catch (err: any) {
      console.error('❌ Delete error:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ============ UTILS ============
  const getAppointmentNumber = async (userId?: string) => {
    const studentId = userId || formData.value.user_id
    if (!studentId) return 1
    
    try {
      const supabase = getSupabase()
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', studentId)
        .in('status', ['completed', 'confirmed'])
      
      if (error) throw error
      return (count || 0) + 1
      
    } catch (err) {
      console.error('❌ Error counting appointments:', err)
      return 1
    }
  }

  return {
    // State
    formData,
    selectedStudent,
    selectedCategory,
    selectedLocation,
    availableDurations,
    appointmentNumber,
    isLoading,
    error,
    
    // Computed
    isFormValid,
    computedEndTime,
    totalPrice,
    
    // Actions
    resetForm,
    populateFormFromAppointment,
    calculateEndTime,
    saveAppointment,
    deleteAppointment,
    getAppointmentNumber,

        // Composables
    categoryData,
    eventTypes,

        // SMS-spezifische Funktionen exportieren
    setCustomerInviteRef,
    setInvitedCustomers,
    invitedCustomers: readonly(invitedCustomers)
  }
}