import { ref, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { usePaymentMethods } from '~/composables/usePaymentMethods'
import { useTimeCalculations } from '~/composables/useTimeCalculations'


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

  // ============ UTILITY FUNCTIONS (Defined first for better accessibility) ============
const { calculateEndTime } = useTimeCalculations(formData)


  /**
   * Loads the duration of the last completed appointment for a given student.
   * @param studentId The ID of the student.
   * @returns The duration in minutes or null if no completed appointment is found.
   */

  const getLastAppointmentCategory = async (studentId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('type')
      .eq('user_id', studentId)
      .eq('status', 'completed')
      .order('end_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ Error fetching last appointment category:', error.message)
      return null
    }

    if (!data) {
      console.log('⚠️ No completed appointments found for student:', studentId)
      return null
    }

    return data.type || null
  } catch (err) {
    console.error('❌ Unexpected error loading last appointment category:', err)
    return null
  }
}

  const getLastAppointmentDuration = async (studentId: string): Promise<number | null> => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('duration_minutes')
        .eq('user_id', studentId)
        .eq('status', 'completed') // Only consider completed appointments
        .order('end_time', { ascending: false }) // Get the most recent one
        .limit(1)
        .maybeSingle() // Expects zero or one record

      if (error) {
        console.error('❌ Error fetching last appointment duration:', error.message)
        return null
      }

      if (!data) {
        console.log('⚠️ No completed appointments found for student:', studentId)
        return null
      }

      return data.duration_minutes || null
    } catch (err) {
      console.error('❌ Unexpected error loading last appointment duration:', err)
      return null
    }
  }

  /**
   * Counts the number of completed or confirmed appointments for a student.
   * Used to determine the appointment number for insurance fees.
   * @param studentId The ID of the student.
   * @returns The total count of relevant appointments + 1 (for the current appointment).
   */
  const getAppointmentNumber = async (studentId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true }) // 'head: true' fetches no data, just the count
        .eq('user_id', studentId)
        .in('status', ['completed', 'confirmed']) // Count completed and confirmed appointments

      if (error) throw error
      return (count || 0) + 1 // +1 because the current appointment is the next one
    } catch (err) {
      console.error('❌ Error counting appointments from DB:', err)
      return 1 // Default to 1 if counting fails
    }
  }

  /**
   * Loads preferred durations for a staff member from the 'staff_settings' table.
   * @param staffId The ID of the staff member.
   */
  const loadStaffDurations = async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from('staff_settings')
        .select('preferred_durations')
        .eq('staff_id', staffId)
        .maybeSingle()

      if (error || !data?.preferred_durations) {
        console.log('⚠️ No staff durations found in DB or error, using defaults.')
        availableDurations.value = [DEFAULT_DURATION_MINUTES, 90, 135]
        return
      }

      // Parse preferred_durations (can be JSON string or comma-separated string)
      let durations: number[] = []
      try {
        if (typeof data.preferred_durations === 'string' && data.preferred_durations.startsWith('[')) {
          durations = JSON.parse(data.preferred_durations)
        } else if (typeof data.preferred_durations === 'string') {
          durations = data.preferred_durations.split(',').map((d: string) => parseInt(d.trim()))
        } else if (Array.isArray(data.preferred_durations)) {
          durations = data.preferred_durations
        }
        durations = durations.filter(d => !isNaN(d) && d > 0).sort((a, b) => a - b)
      } catch (parseErr) {
        console.error('❌ Error parsing staff durations:', parseErr)
        durations = [DEFAULT_DURATION_MINUTES, 90, 135] // Fallback on parsing error
      }

      availableDurations.value = durations
      console.log('✅ Staff durations loaded from DB:', durations)

    } catch (err) {
      console.error('❌ Error loading staff durations from DB:', err)
      availableDurations.value = [DEFAULT_DURATION_MINUTES, 90, 135] // Fallback on fetch error
    }
  }

  /**
   * Generates a default title for the event based on event type and selected student.
   * @returns The generated default title.
   */
  const getDefaultTitle = () => {
    if (formData.value.eventType === 'lesson' && selectedStudent.value) {
      return selectedStudent.value.first_name || 'Schüler'
    }
    if (formData.value.selectedSpecialType) {
      return getEventTypeName(formData.value.selectedSpecialType)
    }
    return 'Neuer Termin'
  }

  /**
   * Returns a human-readable name for an event type code.
   * @param code The event type code.
   * @returns The human-readable name.
   */
  const getEventTypeName = (code: string): string => {
    const eventTypes: Record<string, string> = {
      'meeting': 'Team-Meeting',
      'course': 'Verkehrskunde',
      'break': 'Pause',
      'training': 'Weiterbildung',
      'maintenance': 'Wartung',
      'admin': 'Administration',
      'other': 'Sonstiges'
    }
    return eventTypes[code] || code || 'Neuer Termin'
  }

  /**
   * Retrieves the administrative fee for a given category.
   * This is typically an insurance fee applied from the 2nd appointment onwards.
   * @param categoryCode The code of the category.
   * @returns The administrative fee amount.
   */
  const getAdminFeeForCategory = (categoryCode: string): number => {
    // Insurance fee from project data - only from 2nd appointment
    const adminFees: Record<string, number> = {
      'B': 120, 'A1': 0, 'A35kW': 0, 'A': 0, 'BE': 120,
      'C1': 200, 'D1': 200, 'C': 200, 'CE': 250, 'D': 300,
      'Motorboot': 120, 'BPT': 120
    }
    return adminFees[categoryCode] || 0
  }

  // ============ STUDENT HANDLERS ============

  /**
   * Auto-fills form data based on the selected student's profile from Supabase.
   * @param student The student object to auto-fill from.
   */
  const autoFillFromStudent = async (student: any) => {
    console.log('🤖 Auto-filling form from student:', student.first_name)

    // Set basic data from users table
    formData.value.user_id = student.id
    formData.value.staff_id = student.assigned_staff_id || formData.value.staff_id

    // Set category from users.category (taking the primary category if multiple exist)
    if (student.category) {
      const primaryCategory = student.category.split(',')[0].trim()
      formData.value.type = primaryCategory
      console.log('📚 Category from users table:', formData.value.type)

    // ✅ NEU: Kategorie-Daten direkt aus DB laden für Dauer-Berechnung
    try {
      console.log('🔄 Loading category data for:', primaryCategory)
      const { data, error } = await supabase
        .from('categories')
        .select('code, lesson_duration_minutes, exam_duration_minutes')
        .eq('code', primaryCategory)
        .eq('is_active', true)
        .single()
      
      if (error) throw error
      
      if (data) {
        selectedCategory.value = data
        console.log('✅ Category data loaded for student:', data)
      }
    } catch (err) {
      console.error('❌ Error loading category data:', err)
      // Fallback: leeres Objekt mit Standard-Werten
      selectedCategory.value = {
        code: primaryCategory,
        lesson_duration_minutes: 45,
        exam_duration_minutes: 180
      }
    }
    }

    // Load preferred payment method from student profile using the paymentMethods composable
    const preferredPaymentMethod = await paymentMethods.loadStudentPaymentPreference(student.id)
    formData.value.payment_method = preferredPaymentMethod
    console.log('💳 Loaded payment preference:', preferredPaymentMethod)

    // Load last appointment duration from appointments table
    try {
      const lastDuration = await getLastAppointmentDuration(student.id)
      if (lastDuration) {
        formData.value.duration_minutes = lastDuration
        console.log('⏱️ Duration from last appointment:', lastDuration)
      } else {
        formData.value.duration_minutes = DEFAULT_DURATION_MINUTES // Default
      }
    } catch (err) {
      console.log('⚠️ Could not load last duration, using default', DEFAULT_DURATION_MINUTES, 'min:', err)
      formData.value.duration_minutes = DEFAULT_DURATION_MINUTES
    }

    // Update price based on category - from project data (static fallback)
    const categoryPricing: Record<string, number> = {
      'A': 95 / 45, 'A1': 95 / 45, 'A35kW': 95 / 45, 'B': 95 / 45,
      'BE': 120 / 45, 'C1': 150 / 45, 'D1': 150 / 45, 'C': 170 / 45,
      'CE': 200 / 45, 'D': 200 / 45, 'BPT': 100 / 45, 'Motorboot': 95 / 45
    }
    formData.value.price_per_minute = categoryPricing[formData.value.type] || FALLBACK_PRICE_PER_MINUTE

    // Count appointments for this user (important for insurance fee from 2nd appointment)
    try {
      appointmentNumber.value = await getAppointmentNumber(student.id)
      console.log('📈 Appointment number from DB:', appointmentNumber.value)
    } catch (err) {
      console.error('❌ Error counting appointments:', err)
      appointmentNumber.value = 1 // Default to 1 if counting fails
    }

    console.log('✅ Auto-fill from Supabase completed')
  }

  /**
   * Handles the selection of a student.
   * Auto-fills form data based on the selected student's profile.
   * @param student The selected student object.
   */


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
// In composables/useEventModalHandlers.ts - handleCategorySelected erweitern:

const handleCategorySelected = async (category: any) => {
  console.log('🎯 Category selected:', category?.code)
  selectedCategory.value = category
  
  if (category) {
    // Load category data from categories table
    try {
      const { data: categoryData, error } = await supabase
        .from('categories')
        .select('*') // ✅ Holt bereits exam_duration_minutes mit
        .eq('code', category.code)
        .eq('is_active', true)
        .maybeSingle()
        
      if (categoryData) {
        formData.value.price_per_minute = categoryData.price_per_lesson / DEFAULT_DURATION_MINUTES
        console.log('💰 Price from categories table:', categoryData.price_per_lesson)
        
        // ✅ NEU: Kategorie-Daten für Dauer-Berechnung speichern
        selectedCategory.value = { ...category, ...categoryData }
      } else {
        // Fallback to static prices if not found in DB
        const fallbackPrices: Record<string, number> = {
          'B': 95, 'A1': 95, 'BE': 120, 'C1': 150, 'D1': 150, 'C': 170,
          'CE': 200, 'D': 200, 'BPT': 100, 'Motorboot': 95
        }
        formData.value.price_per_minute = (fallbackPrices[category.code] || 95) / DEFAULT_DURATION_MINUTES
        console.log('⚠️ Category not found in DB, using fallback price:', formData.value.price_per_minute * DEFAULT_DURATION_MINUTES)
      }
    } catch (err) {
      console.error('❌ Error loading category from DB:', err)
      formData.value.price_per_minute = FALLBACK_PRICE_PER_MINUTE // Fallback
    }

    // ✅ NEU: Dauer basierend auf aktuellem Lesson Type setzen
    if (formData.value.appointment_type) {
      setDurationForLessonType(formData.value.appointment_type)
    }
    
    calculateEndTime()
  }
}


// FIX für useEventModalHandlers.ts - setDurationForLessonType Funktion

const setDurationForLessonType = (lessonTypeCode: string) => {
  console.log('⏱️ Setting duration for lesson type:', lessonTypeCode)
  
  switch (lessonTypeCode) {
    case 'exam':
      // Prüfung: Verwende category exam_duration_minutes
      const examDuration = selectedCategory.value?.exam_duration_minutes || 180
      console.log('📝 Auto-setting EXAM duration:', examDuration)
      
      formData.value.duration_minutes = examDuration
      availableDurations.value = [examDuration]
      calculateEndTime()
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
  calculateEndTime()
  break
      
    case 'theory':
      console.log('🎓 Setting theory duration: 45min')
      formData.value.duration_minutes = 45
      availableDurations.value = [45]
      calculateEndTime()
      break
      
    default:
      console.log('❓ Unknown lesson type, using default')
      if (availableDurations.value.length === 0) {
        availableDurations.value = [45]
      }
      if (!formData.value.duration_minutes) {
        formData.value.duration_minutes = availableDurations.value[0] || 45
      }
      calculateEndTime()
      break
  }
}

  /**
   * Handles changes to the price per minute.
   * @param pricePerMinute The new price per minute.
   */
  const handlePriceChanged = (pricePerMinute: number) => {
    console.log('💰 Price changed:', pricePerMinute)
    formData.value.price_per_minute = pricePerMinute
  }

  /**
   * Handles changes to the available durations.
   * Adjusts the current duration if it's no longer available.
   * @param durations An array of available durations in minutes.
   */
  const handleDurationsChanged = (durations: number[]) => {
    console.log('📥 Durations changed to:', durations)

    availableDurations.value = [...durations]

    // If current duration not available, select first available
    if (durations.length > 0 && !durations.includes(formData.value.duration_minutes)) {
      formData.value.duration_minutes = durations[0]
      calculateEndTime()
      console.log('✅ Updated duration to:', durations[0])
    }
  }

  // ============ DURATION HANDLERS ============

  /**
   * Handles changes to the selected duration.
   * Recalculates the end time.
   * @param duration The new duration in minutes.
   */
  const handleDurationChanged = (duration: number) => {
    console.log('⏱️ Duration changed to:', duration)
    formData.value.duration_minutes = duration
    calculateEndTime()
  }

  // ============ LOCATION HANDLERS ============

  /**
   * Handles the selection of a location.
   * Saves new Google Places locations to the 'locations' table.
   * @param location The selected location object.
   */
  const handleLocationSelected = async (location: any) => {
    console.log('📍 Location selected:', location?.name)

    selectedLocation.value = location; // WICHTIG: selectedLocation Ref aktualisieren

    if (!location) {
      formData.value.location_id = ''
      return
    }

    // Existing location from 'locations' table
    if (location.id && !String(location.id).startsWith('temp_')) {
      formData.value.location_id = location.id
      console.log('✅ Location ID from locations table:', location.id)
    }
    // New location from Google Places - save to 'locations' table
    else if (location.id && String(location.id).startsWith('temp_') && formData.value.staff_id) {
      try {
        const { data: newLocation, error } = await supabase
          .from('locations')
          .insert({
            staff_id: formData.value.staff_id,
            name: location.name,
            adress: location.address || location.formatted_address || '' // Use 'address' or 'formatted_address'
          })
          .select()
          .single()

        if (error) throw error

        formData.value.location_id = newLocation.id
        console.log('✅ New location saved to DB:', newLocation.id)
      } catch (err) {
        console.error('❌ Could not save location to DB:', err)
        formData.value.location_id = ''
      }
    }
    // Temporary location (will be handled when the appointment is saved)
    else {
      formData.value.location_id = ''
      console.log('⚠️ Temporary location, will handle on save or if staff_id is missing.')
    }
  }

  // ============ EVENT TYPE HANDLERS ============

  /**
   * Handles the selection of a special event type (e.g., meeting, break).
   * @param eventType The selected event type object.
   */
  const handleEventTypeSelected = (eventType: any) => {
    console.log('📋 Event type selected:', eventType?.code)

    formData.value.selectedSpecialType = eventType.code
    formData.value.duration_minutes = eventType.default_duration_minutes || DEFAULT_DURATION_MINUTES

    if (eventType.auto_generate_title) {
      formData.value.title = eventType.name || 'Neuer Termin'
    }

    calculateEndTime()
  }

  /**
   * Switches the event type to 'other' and resets related fields.
   */
  const switchToOtherEventType = () => {
    formData.value.eventType = 'other'
    formData.value.selectedSpecialType = ''
    formData.value.title = ''
  }

  /**
   * Switches the event type back to 'lesson' and resets related fields.
   */
  const backToStudentSelection = () => {
    formData.value.eventType = 'lesson'
    formData.value.selectedSpecialType = ''
    formData.value.title = ''
  }

  // ============ PAYMENT HANDLERS ============

  /**
   * Handles a successful payment.
   * Optionally saves a payment record to the 'payments' table.
   * @param paymentData Data related to the successful payment.
   */
  const handlePaymentSuccess = async (paymentData: any) => {
    console.log('✅ Payment successful:', paymentData)
    formData.value.is_paid = true

    // Optional: Save payment record to payments table
    if (paymentData.transactionId && formData.value.id) {
      try {
        await supabase
          .from('payments')
          .insert({
            appointment_id: formData.value.id,
            user_id: formData.value.user_id,
            staff_id: formData.value.staff_id,
            amount_rappen: Math.round(formData.value.price_per_minute * formData.value.duration_minutes * 100),
            payment_method: paymentData.method || 'wallee',
            payment_status: 'completed',
            wallee_transaction_id: paymentData.transactionId
          })

        console.log('💾 Payment record saved to DB')
      } catch (err) {
        console.error('❌ Could not save payment record:', err)
      }
    }
  }

  /**
   * Handles a payment error.
   * @param error The error message.
   */
  const handlePaymentError = (error: string) => {
    console.error('❌ Payment error:', error)
    formData.value.is_paid = false
  }

  /**
   * Handles the start of a payment process.
   * @param method The payment method used.
   */
  const handlePaymentStarted = (method: string) => {
    console.log('🔄 Payment started with method:', method)
  }

  /**
   * Signals that the appointment needs to be saved before payment processing can occur.
   * This is crucial for obtaining a real UUID for the appointment.
   * @param appointmentData The current appointment data.
   * @returns A Promise resolving with a flag indicating save is required.
   */
  const handleSaveRequired = async (appointmentData: any) => {
    console.log('💾 Save required for payment processing')

    // IMPORTANT: Appointment must be saved FIRST to get a real UUID
    return new Promise((resolve) => {
      // Signal parent that appointment needs to be saved first
      resolve({
        ...appointmentData,
        requiresSave: true,
        message: 'Appointment must be saved before payment'
      })
    })
  }

  // ============ PAYMENT METHOD HANDLERS ============

  /**
   * Handles the selection of a payment method.
   * Updates the form data and optionally saves the preference for the student.
   * @param paymentMethod The selected payment method string.
   */
  const handlePaymentMethodSelected = async (paymentMethod: string) => {
    console.log('💳 Payment method selected:', paymentMethod)

    // Use payment composable to handle selection (e.g., saving preference)
    if (selectedStudent.value?.id) {
      await paymentMethods.selectPaymentMethod(paymentMethod, selectedStudent.value.id)
    }

    // Update form data
    formData.value.payment_method = paymentMethod
    formData.value.payment_status = 'pending'
    formData.value.is_paid = false // Reset paid status

    console.log('💳 Payment method configured:', {
      method: paymentMethod,
      status: formData.value.payment_status,
      paid: formData.value.is_paid
    })
  }

  /**
   * Retrieves the available payment method options from the paymentMethods composable.
   * @returns An array of payment method options.
   */
  const getPaymentMethodOptions = () => {
    return paymentMethods.paymentMethodOptions.value
  }

  /**
   * Calculates the payment breakdown (total, discounts, fees) for the current appointment.
   * @returns The payment breakdown object or null if data is insufficient.
   */
  const calculatePaymentBreakdown = () => {
    if (!formData.value.type || !formData.value.duration_minutes) {
      console.warn('⚠️ Cannot calculate payment breakdown: Missing type or duration.')
      return null
    }

    const discount = formData.value.discount ? {
      amount: formData.value.discount,
      type: formData.value.discount_type || 'fixed',
      reason: formData.value.discount_reason
    } : undefined

    return paymentMethods.calculatePaymentBreakdown(
      formData.value.type,
      formData.value.duration_minutes,
      appointmentNumber.value,
      discount
    )
  }

  /**
   * Processes the payment after the appointment has been successfully saved.
   * Delegates to specific payment processing functions based on the selected method.
   * @param savedAppointment The appointment object returned after being saved to the DB.
   * @returns The result of the payment processing, potentially including a redirect flag for online payments.
   * @throws Error if payment calculation fails or processing encounters an issue.
   */
  const processPaymentAfterSave = async (savedAppointment: any) => {
    const paymentMethod = formData.value.payment_method

    if (!paymentMethod || paymentMethod === 'none') {
      console.log('ℹ️ No payment processing needed (method is none or not set).')
      return null // No payment processing needed
    }

    const calculation = calculatePaymentBreakdown()
    if (!calculation) {
      throw new Error('Could not calculate payment breakdown before processing.')
    }

    const appointmentData = {
      appointmentId: savedAppointment.id,
      userId: formData.value.user_id,
      staffId: formData.value.staff_id,
      category: formData.value.type,
      duration: formData.value.duration_minutes,
      appointmentNumber: appointmentNumber.value,
      calculation // Pass the calculated breakdown
    }

    try {
      switch (paymentMethod) {
        case 'cash':
          return await paymentMethods.processCashPayment(appointmentData)

        case 'invoice':
          return await paymentMethods.processInvoicePayment(appointmentData)

        case 'online':
          const result = await paymentMethods.processOnlinePayment(appointmentData)

          if (result.needsWalleeRedirect) {
            // Return data for Wallee integration in parent component
            return {
              ...result,
              redirectToWallee: true,
              amount: calculation.totalAmount,
              currency: 'CHF' // Assuming CHF as currency
            }
          }

          return result

        default:
          console.log('⚠️ Unknown payment method:', paymentMethod)
          return null
      }
    } catch (err) {
      console.error('❌ Payment processing error:', err)
      throw err // Re-throw to be handled by the calling component
    }
  }

  /**
   * Handles changes to discount values.
   * @param discount The discount amount.
   * @param discountType The type of discount ('fixed' or 'percentage').
   * @param reason The reason for the discount.
   */
  const handleDiscountChanged = (discount: number, discountType: string, reason: string) => {
    console.log('🏷️ Discount changed:', { discount, discountType, reason })

    formData.value.discount = discount
    formData.value.discount_type = discountType
    formData.value.discount_reason = reason
  }

  // ============ TEAM HANDLERS (TAGS/EINLADUNGEN) ============

  /**
   * Toggles the invitation status for a staff member.
   * @param staffId The ID of the staff member to toggle.
   * @param invitedStaff A ref containing an array of invited staff IDs.
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
   * @param invitedStaff A ref containing an array of invited staff IDs.
   */
  const clearAllInvites = (invitedStaff: any) => {
    invitedStaff.value = []
    console.log('🗑️ All team invites cleared.')
  }

  /**
   * Invites all available staff members.
   * @param availableStaff A ref containing an array of all available staff members.
   * @param invitedStaff A ref containing an array of invited staff IDs.
   */
  const inviteAllStaff = (availableStaff: any, invitedStaff: any) => {
    invitedStaff.value = availableStaff.value.map((s: any) => s.id)
    console.log('👥 All staff invited:', invitedStaff.value.length, 'staff members.')
  }

  return {
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
    switchToOtherEventType,
    backToStudentSelection,

    // Payment Handlers
    handlePaymentSuccess,
    handlePaymentError,
    handlePaymentStarted, // <-- NEU: Jetzt exportiert
    handleSaveRequired,

    // Payment Method Handlers
    handlePaymentMethodSelected,
    getPaymentMethodOptions,
    calculatePaymentBreakdown, // Expose for external use
    processPaymentAfterSave,   // Expose for external use

    // Discount Handlers
    handleDiscountChanged,

    // Team Handlers (Tags/Einladungen)
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
    getAdminFeeForCategory
  }
}
