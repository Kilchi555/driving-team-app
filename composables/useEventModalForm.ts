// composables/useEventModalForm.ts
import { ref, computed, reactive } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useTimeCalculations } from '~/composables/useTimeCalculations'
import { useCategoryData } from '~/composables/useCategoryData'

const useEventTypes = () => {
  const eventTypesCache = ref<string[]>([])
  const isEventTypesLoaded = ref(false)
  
  const loadEventTypes = async () => {
    if (isEventTypesLoaded.value) return eventTypesCache.value
    
    try {
      const supabase = getSupabase()
      console.log('🔄 Loading event types from database...')
      
      const { data, error } = await supabase
        .from('event_types')
        .select('code')
        .eq('is_active', true)
      
      if (error) throw error
      
      eventTypesCache.value = data?.map((et: any) => et.code) || []
      isEventTypesLoaded.value = true
      
      console.log('✅ Event types loaded:', eventTypesCache.value)
      return eventTypesCache.value
      
    } catch (err) {
      console.error('❌ Error loading event types from DB:', err)
      // Fallback: Bekannte Event Types als Backup
      eventTypesCache.value = ['meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other']
      isEventTypesLoaded.value = true
      return eventTypesCache.value
    }
  }
  
  return {
    eventTypesCache: computed(() => eventTypesCache.value),
    isEventTypesLoaded: computed(() => isEventTypesLoaded.value),
    loadEventTypes
  }
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

export const useEventModalForm = (currentUser?: any) => {
  
    // ✅ Composables initialisieren
  const categoryData = useCategoryData()
  const eventTypes = useEventTypes()
  const supabase = getSupabase()

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
  const isFormValid = computed(() => {
    const baseValid = formData.value.title && 
                     formData.value.startDate && 
                     formData.value.startTime &&
                     formData.value.endTime

    if (formData.value.eventType === 'lesson') {
      return baseValid && 
             selectedStudent.value && 
             formData.value.type && 
             formData.value.location_id &&
             formData.value.duration_minutes > 0
    } else {
      return baseValid && formData.value.selectedSpecialType
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
  const startDate = startDateTime.toISOString().split('T')[0]
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

// Dann die saveAppointment Funktion ersetzen:
const saveAppointment = async (mode: 'create' | 'edit', eventId?: string) => {
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
    
    // Appointment Data
    const appointmentData = {
      title: formData.value.title,
      description: formData.value.description,
      user_id: formData.value.user_id,
      staff_id: formData.value.staff_id || dbUser.id,
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
    
    console.log('💾 Saving appointment data:', appointmentData)
    
    let result
    if (mode === 'edit' && eventId) {
      // Update existing appointment
      result = await saveWithOfflineSupport(
        'appointments',
        appointmentData,
        'update',
        { id: eventId },
        `Termin "${appointmentData.title}" bearbeiten`
      )
    } else {
      // Create new appointment  
      result = await saveWithOfflineSupport(
        'appointments',
        appointmentData,
        'insert',
        null,
        `Termin "${appointmentData.title}" erstellen`
      )
    }
    
    console.log('✅ Appointment saved:', result?.data?.id || 'offline')
    return result?.data || appointmentData
    
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
      
      return fallbackAppointment
    } else {
      // Echte Fehler normal behandeln
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
    eventTypes
  }
}