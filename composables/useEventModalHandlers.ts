// composables/useEventModalHandlers.ts - VOLLSTÄNDIGE MIGRIERTE VERSION mit einheitlicher usePricing
import { ref, computed, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { usePaymentMethods } from '~/composables/usePaymentMethods'
import { useTimeCalculations } from '~/composables/useTimeCalculations'
import { usePricing } from '~/composables/usePricing' // ✅ EINHEITLICHE PRICING-LÖSUNG

// Define constants for better readability and maintainability
const DEFAULT_DURATION_MINUTES = 45
const FALLBACK_PRICE_PER_MINUTE = 95 / DEFAULT_DURATION_MINUTES

export const useEventModalHandlers = (
  formData: any,
  selectedStudent: any,
  selectedCategory: any,
  availableDurations: any,
  appointmentNumber: any,
  selectedLocation: any 
) => {

  const supabase = getSupabase()
  const paymentMethods = usePaymentMethods()

  // ✅ NEUE EINHEITLICHE PRICING-LÖSUNG
  const pricing = usePricing({
    watchChanges: true,
    autoUpdate: true,
    categoryCode: computed(() => formData.value.type),
    durationMinutes: computed(() => formData.value.duration_minutes),
    selectedStudent: computed(() => selectedStudent.value)
  })

  // ============ UTILITY FUNCTIONS ============
  const { calculateEndTime } = useTimeCalculations(formData)

  /**
   * Loads the duration of the last completed appointment for a given student.
   * @param studentId The ID of the student.
   * @returns The duration in minutes or null if no completed appointment is found.
   */
  const getLastAppointmentDuration = async (studentId: string): Promise<number | null> => {
    console.log('⏱️ Checking last appointment duration for student:', studentId)
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('duration_minutes')
        .eq('user_id', studentId)
        .is('deleted_at', null) // ✅ Soft Delete Filter
        .not('status', 'eq', 'cancelled') // ✅ Stornierte Termine nicht zählen
        .not('status', 'eq', 'aborted')   // ✅ Abgebrochene Termine nicht zählen
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      
      const lastDuration = data?.duration_minutes || null
      console.log('📊 Last appointment duration:', lastDuration, 'minutes')
      return lastDuration

    } catch (err: any) {
      console.error('❌ Error loading last appointment duration:', err)
      return null
    }
  }

  /**
   * Gets the last appointment category for a given student.
   */
  const getLastAppointmentCategory = async (studentId: string): Promise<string | null> => {
    console.log('🎯 Checking last appointment category for student:', studentId)
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('type')
        .eq('user_id', studentId)
        .is('deleted_at', null) // ✅ Soft Delete Filter
        .not('status', 'eq', 'cancelled') // ✅ Stornierte Termine nicht zählen
        .not('status', 'eq', 'aborted')   // ✅ Abgebrochene Termine nicht zählen
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      
      const lastCategory = data?.type || null
      console.log('📊 Last appointment category:', lastCategory)
      return lastCategory

    } catch (err: any) {
      console.error('❌ Error loading last appointment category:', err)
      return null
    }
  }

  /**
   * Auto-fills form data based on selected student's profile.
   * @param student The selected student object.
   */
  const autoFillFromStudent = async (student: any) => {
    console.log('👤 Auto-filling from student:', student.first_name, student.last_name)
    selectedStudent.value = student

    // Update title
    formData.value.title = `${student.first_name} ${student.last_name}`
    formData.value.user_id = student.id
    
    // Update category from student profile
    if (student.category) {
      const categories = student.category.split(',').map((c: string) => c.trim())
      formData.value.type = categories[0] // Use first category
      console.log('🎯 Auto-set category from student profile:', formData.value.type)
    }

    // Set location preference
    if (student.preferred_location_id) {
      formData.value.location_id = student.preferred_location_id
      console.log('📍 Auto-set location from student preference')
    }

    // Set staff assignment
    if (student.assigned_staff_id) {
      formData.value.staff_id = student.assigned_staff_id
      console.log('👨‍🏫 Auto-set staff from student assignment')
    }

    // Load last appointment duration
    try {
      const lastDuration = await getLastAppointmentDuration(student.id)
      if (lastDuration && lastDuration > 0) {
        formData.value.duration_minutes = lastDuration
        console.log('⏱️ Auto-set duration from last appointment:', lastDuration, 'min')
      } else {
        formData.value.duration_minutes = student.preferred_duration || DEFAULT_DURATION_MINUTES
        console.log('⏱️ Using preferred/default duration:', formData.value.duration_minutes, 'min')
      }
    } catch (err) {
      console.error('❌ Error loading last duration, using default', DEFAULT_DURATION_MINUTES, 'min:', err)
      formData.value.duration_minutes = DEFAULT_DURATION_MINUTES
    }

    // ✅ PRICING wird automatisch durch die Watcher der neuen usePricing berechnet
    // Kein manueller Code mehr nötig - pricing.dynamicPricing.value wird automatisch aktualisiert!

    console.log('✅ Student auto-fill completed - pricing calculated automatically')
  }

  /**
   * Handles clearing the selected student and resetting related form fields.
   */
  const handleStudentCleared = () => {
    console.log('🗑️ Student cleared')

    selectedStudent.value = null
    formData.value.title = ''
    formData.value.type = ''
    formData.value.user_id = ''
    formData.value.location_id = ''
    formData.value.price_per_minute = 0
    formData.value.payment_method = 'cash' // Default payment method
  }

  // ============ CATEGORY HANDLERS ============

  /**
   * Handles the selection of a category.
   * Updates price and loads staff durations based on the selected category.
   * @param category The selected category object.
   */
const handleCategorySelected = async (category: any) => {
  console.log('🎯 Category selected:', category?.code)
  selectedCategory.value = category
  
  if (category) {
    // Load category data from categories table
    try {
      const { data: categoryData, error } = await supabase
        .from('categories')
        .select('*')
        .eq('code', category.code)
        .eq('is_active', true)
        .maybeSingle()
        
      if (categoryData) {
        console.log('💰 Category data loaded from DB:', categoryData.price_per_lesson)
        selectedCategory.value = { ...category, ...categoryData }
      } else {
        console.log('⚠️ Category not found in DB, fallback pricing will be used')
      }
    } catch (err) {
      console.error('❌ Error loading category from DB:', err)
    }
    
    calculateEndTime()
  }
}

  /**
   * Sets duration based on lesson type and triggers automatic price calculation.
   */
  const setDurationForLessonType = (lessonTypeCode: string) => {
    console.log('⏱️ Setting duration for lesson type:', lessonTypeCode)
    
    switch (lessonTypeCode) {
      case 'exam':
        // Prüfung: Verwende category exam_duration_minutes
        const examDuration = selectedCategory.value?.exam_duration_minutes || 135
        console.log('📝 Auto-setting EXAM duration:', examDuration, 'for category:', selectedCategory.value?.code)
        
        formData.value.duration_minutes = examDuration
        availableDurations.value = [examDuration]
        break
        
      case 'lesson':
        if (selectedCategory.value?.lesson_duration_minutes) {
          const standardDuration = selectedCategory.value.lesson_duration_minutes
          formData.value.duration_minutes = standardDuration
          availableDurations.value = [standardDuration, standardDuration * 2]
        } else {
          formData.value.duration_minutes = 45
          availableDurations.value = [45, 90]
        }
        break
        
      case 'theory':
        console.log('🎓 Setting theory duration: 45min')
        formData.value.duration_minutes = 45
        availableDurations.value = [45]
        break
        
      default:
        console.log('❓ Unknown lesson type, using default')
        if (availableDurations.value.length === 0) {
          availableDurations.value = [45]
        }
        if (!formData.value.duration_minutes) {
          formData.value.duration_minutes = availableDurations.value[0] || 45
        }
        break
    }
    
    calculateEndTime()
    // ✅ PREIS wird automatisch durch pricing Watcher neu berechnet!
  }

  /**
   * Handles duration changes - price is automatically recalculated by pricing watcher.
   */
  const handleDurationChanged = (newDurationMinutes: number) => {
    console.log('⏱️ Duration changed to:', newDurationMinutes, 'minutes')
    
    // Update duration (this will trigger price recalculation via watcher)
    formData.value.duration_minutes = newDurationMinutes
    
    // Add custom duration to available options
    if (!availableDurations.value.includes(newDurationMinutes)) {
      availableDurations.value = [...availableDurations.value, newDurationMinutes].sort((a, b) => a - b)
      console.log('⏱️ Added custom duration to available options:', availableDurations.value)
    }
    
    calculateEndTime()
    // ✅ PREIS wird automatisch durch pricing Watcher neu berechnet!
    console.log('💰 Price will be automatically recalculated by pricing watcher')
  }

  /**
   * Legacy price change handler - now simplified since pricing is automatic.
   */
  const handlePriceChanged = (pricePerMinute: number) => {
    console.log('💰 Price manually changed:', pricePerMinute)
    formData.value.price_per_minute = pricePerMinute
  }

  /**
   * Handles changes to available durations.
   */
const handleDurationsChanged = (durations: number[]) => {
  console.log('⏱️ Durations changed:', durations)
  console.log('🔍 Current appointment_type:', formData.value.appointment_type)
  console.log('🔍 Current duration:', formData.value.duration_minutes)
  
  // ✅ FIX: Bei Prüfungen die exam_duration aus selectedCategory verwenden
  if (formData.value.appointment_type === 'exam') {
    const examDuration = selectedCategory.value?.exam_duration_minutes || 135
    console.log('📝 OVERRIDE: Using exam duration instead of received durations:', examDuration)
    availableDurations.value = [examDuration]
    formData.value.duration_minutes = examDuration
  } else {
    // Normale Fahrstunden-Logic
    availableDurations.value = durations
    
    // ✅ INTELLIGENTE DAUER-AUSWAHL: Versuche die aktuelle Dauer zu behalten, wenn möglich
    if (durations.length > 0) {
      const currentDuration = formData.value.duration_minutes
      
      if (durations.includes(currentDuration)) {
        console.log('✅ Keeping current duration:', currentDuration, 'as it\'s available in new category')
      } else {
        // Aktuelle Dauer nicht verfügbar - wähle intelligente Alternative
        let newDuration = durations[0] // Fallback
        
        // Versuche eine ähnliche Dauer zu finden (±15min Toleranz)
        const similarDuration = durations.find(d => Math.abs(d - currentDuration) <= 15)
        if (similarDuration) {
          newDuration = similarDuration
          console.log('🎯 Found similar duration:', newDuration, 'instead of', currentDuration)
        } else {
          console.log('⚠️ No similar duration found, using first available:', newDuration)
        }
        
        formData.value.duration_minutes = newDuration
      }
    }
  }
  
  calculateEndTime()
}

  // ============ LOCATION HANDLERS ============

  /**
   * Handles location selection.
   */
  const handleLocationSelected = (location: any) => {
    console.log('📍 Location selected:', location)
    selectedLocation.value = location
    formData.value.location_id = location?.id || ''
  }

  // ============ EVENT TYPE HANDLERS ============

  /**
   * Handles event type selection.
   */
  const handleEventTypeSelected = (eventType: string) => {
    console.log('📝 Event type selected:', eventType)
    formData.value.eventType = eventType
  }

  /**
   * Back to student selection handler.
   */
  const backToStudentSelection = () => {
    console.log('⬅️ Back to student selection')
    selectedStudent.value = null
    formData.value.user_id = ''
  }

  // ============ PAYMENT HANDLERS ============

  /**
   * Handles payment success.
   */
  const handlePaymentSuccess = (paymentData: any) => {
    console.log('✅ Payment successful:', paymentData)
          // is_paid removed - not in appointments table
    formData.value.payment_method = paymentData.method
    formData.value.payment_data = paymentData
    formData.value.payment_status = 'completed'
  }

  /**
   * Handles payment error.
   */
  const handlePaymentError = (error: any) => {
    console.error('❌ Payment error:', error)
          // is_paid removed - not in appointments table
    formData.value.payment_status = 'failed'
  }

  /**
   * Handles payment started.
   */
  const handlePaymentStarted = () => {
    console.log('🔄 Payment started')
    formData.value.payment_status = 'pending'
  }

  /**
   * Handles save required event.
   */
  const handleSaveRequired = () => {
    console.log('💾 Save required before payment')
    // Trigger save event
  }

  /**
   * Handles payment method selection.
   */
  const handlePaymentMethodSelected = (method: string) => {
    console.log('💳 Payment method selected:', method)
    formData.value.payment_method = method
  }

  /**
   * Gets payment method options.
   */
  const getPaymentMethodOptions = () => {
    return paymentMethods.paymentMethodOptions.value || []
  }

  /**
   * Calculates payment breakdown.
   */
  const calculatePaymentBreakdown = () => {
    // ✅ VERWENDET NEUE PRICING-DATEN
    const basePrice = pricing.dynamicPricing.value.pricePerMinute * formData.value.duration_minutes
    const adminFee = pricing.dynamicPricing.value.adminFeeChf
    const discount = formData.value.discount || 0
    const total = basePrice + adminFee - discount

    return {
      basePrice: basePrice.toFixed(2),
      adminFee: adminFee.toFixed(2),
      discount: discount.toFixed(2),
      total: Math.max(0, total).toFixed(2)
    }
  }

  /**
   * Processes payment after save.
   */
  const processPaymentAfterSave = async (appointmentId: string) => {
    console.log('💳 Processing payment for appointment:', appointmentId)
    // Implementation depends on payment provider
  }

  // ============ DISCOUNT HANDLERS ============

  /**
   * Handles discount changes.
   */
  const handleDiscountChanged = (discount: number, discountType: string, reason: string) => {
    console.log('💰 Discount changed:', { discount, discountType, reason })
    formData.value.discount = discount
    formData.value.discount_type = discountType
    formData.value.discount_reason = reason
  }

  // ============ TEAM HANDLERS ============

  /**
   * Handles team invite toggle.
   */
  const handleTeamInviteToggle = (staffId: string, invitedStaff: any) => {
    console.log('👥 Team invite toggled for staff ID:', staffId)

    const index = invitedStaff.value.indexOf(staffId)
    if (index > -1) {
      invitedStaff.value.splice(index, 1)
      console.log('➖ Staff removed from invite list.')
    } else {
      invitedStaff.value.push(staffId)
      console.log('➕ Staff added to invite list.')
    }
  }

  /**
   * Clears all staff invites.
   */
  const clearAllInvites = (invitedStaff: any) => {
    invitedStaff.value = []
    console.log('🗑️ All team invites cleared.')
  }

  /**
   * Invites all available staff members.
   */
  const inviteAllStaff = (availableStaff: any, invitedStaff: any) => {
    invitedStaff.value = availableStaff.value.map((s: any) => s.id)
    console.log('👥 All staff invited:', invitedStaff.value.length, 'staff members.')
  }

  // ============ UTILITY FUNCTIONS ============

  /**
   * Loads staff durations for a category.
   */
  const loadStaffDurations = async (categoryCode: string, staffId: string) => {
    console.log('⏱️ Loading staff durations for category:', categoryCode, 'staff:', staffId)
    
    try {
      // ✅ TENANT-FILTER: Erst Benutzer-Tenant ermitteln
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
      if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')

      // ✅ TENANT-GEFILTERTE Kategorie-Dauern laden
      const { data, error } = await supabase
        .from('categories')
        .select('lesson_duration_minutes')
        .eq('code', categoryCode)
        .eq('tenant_id', userProfile.tenant_id)  // ✅ TENANT FILTER
        .eq('is_active', true)
        .maybeSingle()

      if (error) throw error
      
      let durations = data?.lesson_duration_minutes || [45]
      
      // ✅ CONVERT STRING ARRAYS TO NUMBER ARRAYS
      if (Array.isArray(durations)) {
        durations = durations.map((d: any) => {
          const num = parseInt(d.toString(), 10)
          return isNaN(num) ? 45 : num
        })
      } else {
        const num = parseInt(durations.toString(), 10)
        durations = [isNaN(num) ? 45 : num]
      }
      
      console.log('📊 Category durations loaded:', durations)
      return durations

    } catch (err: any) {
      console.error('❌ Error loading category durations:', err)
      return [45] // Default fallback
    }
  }

  /**
   * Gets default title based on context.
   */
  const getDefaultTitle = (student: any, category: string) => {
    if (student) {
      return `${student.first_name} ${student.last_name}`
    }
    return `Fahrstunde ${category || ''}`
  }

  /**
   * Gets event type name.
   */
  const getEventTypeName = (eventTypeCode: string) => {
    const eventTypes: Record<string, string> = {
      'lesson': 'Fahrstunde',
      'theory': 'Theoriestunde',
      'exam': 'Prüfung',
      'staff_meeting': 'Team-Meeting'
    }
    return eventTypes[eventTypeCode] || eventTypeCode
  }

  /**
   * Gets admin fee for category.
   */
  const getAdminFeeForCategory = (categoryCode: string, appointmentNumber: number) => {
    // ✅ KORRIGIERT: Admin-Fee nur beim 2. Termin pro Kategorie (außer bei Motorrädern)
    const motorcycleCategories = ['A', 'A1', 'A35kW']
    const isMotorcycle = motorcycleCategories.includes(categoryCode)
    
    if (isMotorcycle || appointmentNumber !== 2) {
      return 0
    }
    
    // ✅ VERWENDET NEUE PRICING-DATEN
    return pricing.dynamicPricing.value.hasAdminFee ? pricing.dynamicPricing.value.adminFeeChf : 0
  }

  /**
   * Gets appointment number for user.
   */
  const getAppointmentNumber = async (userId: string): Promise<number> => {
    return await pricing.getAppointmentCount(userId)
  }

  // ============ RETURN VALUES ============
  return {
    // ✅ NEUE PRICING API
    pricing, // Enthält: dynamicPricing, calculatePrice, updateDynamicPricing, etc.
    
    // Student Handlers
    handleStudentCleared,
    autoFillFromStudent,

    // Category Handlers
    handleCategorySelected,
    handlePriceChanged,
    handleDurationsChanged,
    getLastAppointmentCategory,
    
    // Duration Handlers
    handleDurationChanged,
    setDurationForLessonType,

    // Location Handlers
    handleLocationSelected,

    // Event Type Handlers
    handleEventTypeSelected,
    backToStudentSelection,

    // Payment Handlers
    handlePaymentSuccess,
    handlePaymentError,
    handlePaymentStarted,
    handleSaveRequired,

    // Payment Method Handlers
    handlePaymentMethodSelected,
    getPaymentMethodOptions,
    calculatePaymentBreakdown,
    processPaymentAfterSave,

    // Discount Handlers
    handleDiscountChanged,

    // Team Handlers
    handleTeamInviteToggle,
    clearAllInvites,
    inviteAllStaff,

    // Utilities
    calculateEndTime,
    getLastAppointmentDuration,
    getAppointmentNumber,
    loadStaffDurations,
    getDefaultTitle,
    getEventTypeName,
    getAdminFeeForCategory,
    
    // Legacy support
    paymentMethods
  }
}