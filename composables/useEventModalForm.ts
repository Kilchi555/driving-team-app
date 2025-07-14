// composables/useEventModalForm.ts
import { ref, computed, reactive } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Types (können später in separates types file)
interface AppointmentData {
  id?: string
  title: string
  description: string
  type: string
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
    discount_reason: ''
  })

  const selectedStudent = ref<Student | null>(null)
  const selectedCategory = ref<any>(null)
  const selectedLocation = ref<any>(null)
  const availableDurations = ref<number[]>([45])
  const appointmentNumber = ref<number>(1)
  
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

  const populateFormFromAppointment = (appointment: any) => {
    console.log('📝 Populating form from appointment:', appointment?.id)
    
    // Event-Type Detection
    const appointmentType = appointment.extendedProps?.type ||
                           appointment.type ||
                           appointment.extendedProps?.appointment_type ||
                           'lesson'
    
    const otherEventTypes = ['meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other']
    const isOtherEvent = appointmentType && otherEventTypes.includes(appointmentType.toLowerCase())
    
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
    
    // Form Data setzen
    formData.value = {
      title: appointment.title || '',
      description: appointment.description || appointment.extendedProps?.description || '',
      type: appointmentType,
      startDate: startDate,
      startTime: startTime,
      endTime: endTime,
      duration_minutes: duration,
      user_id: appointment.user_id || appointment.extendedProps?.user_id || '',
      staff_id: appointment.staff_id || appointment.extendedProps?.staff_id || currentUser?.id || '',
      location_id: appointment.location_id || appointment.extendedProps?.location_id || '',
      price_per_minute: appointment.price_per_minute || appointment.extendedProps?.price_per_minute || 0,
      status: appointment.status || appointment.extendedProps?.status || 'confirmed',
      eventType: isOtherEvent ? 'other' : 'lesson',
      selectedSpecialType: isOtherEvent ? appointmentType : '',
      is_paid: appointment.is_paid || appointment.extendedProps?.is_paid || false
    }
    
    console.log('✅ Form populated with type:', formData.value.type)
  }

  const calculateEndTime = () => {
    if (formData.value.startTime && formData.value.duration_minutes) {
      formData.value.endTime = computedEndTime.value
      console.log('⏰ End time calculated:', formData.value.endTime)
    }
  }

  // ============ SAVE/DELETE LOGIC ============ 
  const saveAppointment = async (mode: 'create' | 'edit', eventId?: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      if (!isFormValid.value) {
        throw new Error('Bitte füllen Sie alle Pflichtfelder aus')
      }
      
      const supabase = getSupabase()
      
      // Auth Check
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (!authData?.user) {
        throw new Error('Nicht authentifiziert')
      }
      
      // User Check
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single()
      
      if (!dbUser) {
        throw new Error('User-Profil nicht gefunden')
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
        type: formData.value.type,
        status: formData.value.status,
        price_per_minute: formData.value.price_per_minute,
        is_paid: formData.value.is_paid
      }
      
      console.log('💾 Saving appointment data:', appointmentData)
      
      let result
      if (mode === 'edit' && eventId) {
        // Update
        const { data, error: updateError } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', eventId)
          .select()
          .single()
        
        if (updateError) throw updateError
        result = data
      } else {
        // Create
        const { data, error: insertError } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single()
        
        if (insertError) throw insertError
        result = data
      }
      
      console.log('✅ Appointment saved:', result.id)
      return result
      
    } catch (err: any) {
      console.error('❌ Save error:', err)
      error.value = err.message
      throw err
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
    getAppointmentNumber
  }
}