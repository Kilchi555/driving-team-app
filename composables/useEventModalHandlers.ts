import { ref, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useEventModalHandlers = (
  formData: any,
  selectedStudent: any,
  selectedCategory: any,
  availableDurations: any,
  appointmentNumber: any
) => {
  
  const supabase = getSupabase()

  // ============ STUDENT HANDLERS ============
  const handleStudentSelected = async (student: any) => {
    console.log('🎯 Student selected:', student.first_name, student.id)
    
    selectedStudent.value = student
    
    // Auto-fill form data from student (nur im CREATE mode)
    if (student) {
      await autoFillFromStudent(student)
    }
  }

  const handleStudentCleared = () => {
    console.log('🗑️ Student cleared')
    
    selectedStudent.value = null
    formData.value.title = ''
    formData.value.type = ''
    formData.value.user_id = ''
    formData.value.location_id = ''
    formData.value.price_per_minute = 0
  }

// composables/useEventModalHandlers.ts
import { ref, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { usePaymentMethods } from '~/composables/usePaymentMethods'

export const useEventModalHandlers = (
  formData: any, 
  selectedStudent: any, 
  selectedCategory: any, 
  availableDurations: any, 
  appointmentNumber: any
) => {
  
  const supabase = getSupabase()
  const paymentMethods = usePaymentMethods()

  // ============ STUDENT HANDLERS ============
  const handleStudentSelected = async (student: any) => {
    console.log('🎯 Student selected:', student.first_name, student.id)
    
    selectedStudent.value = student
    
    // Auto-fill form data from student (nur im CREATE mode)
    if (student) {
      await autoFillFromStudent(student)
    }
  }

  const handleStudentCleared = () => {
    console.log('🗑️ Student cleared')
    
    selectedStudent.value = null
    formData.value.title = ''
    formData.value.type = ''
    formData.value.user_id = ''
    formData.value.location_id = ''
    formData.value.price_per_minute = 0
    formData.value.payment_method = 'cash'
  }

  const autoFillFromStudent = async (student: any) => {
    console.log('🤖 Auto-filling form from student:', student.first_name)
    
    // Set basic data from users table
    formData.value.user_id = student.id
    formData.value.staff_id = student.assigned_staff_id || formData.value.staff_id
    
    // Set category from users.category
    if (student.category) {
      const primaryCategory = student.category.split(',')[0].trim()
      formData.value.type = primaryCategory
      console.log('📚 Category from users table:', formData.value.type)
    }
    
    // Load preferred payment method from student profile
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
        formData.value.duration_minutes = 45 // Default
      }
    } catch (err) {
      console.log('⚠️ Could not load last duration, using default 45min')
      formData.value.duration_minutes = 45
    }
    
    // Update price based on category - aus Projektdaten
    const categoryPricing: Record<string, number> = {
      'A': 95/45, 'A1': 95/45, 'A35kW': 95/45, 'B': 95/45, 
      'BE': 120/45, 'C1': 150/45, 'D1': 150/45, 'C': 170/45, 
      'CE': 200/45, 'D': 200/45, 'BPT': 100/45, 'Motorboot': 95/45
    }
    formData.value.price_per_minute = categoryPricing[formData.value.type] || (95/45)
    
    // Count appointments for this user (wichtig für Versicherungspauschale ab 2. Termin)
    try {
      appointmentNumber.value = await getAppointmentNumber(student.id)
      console.log('📈 Appointment number from DB:', appointmentNumber.value)
    } catch (err) {
      console.error('❌ Error counting appointments:', err)
      appointmentNumber.value = 1
    }
    
    console.log('✅ Auto-fill from Supabase completed')
  }

  // ============ CATEGORY HANDLERS ============
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
          formData.value.price_per_minute = categoryData.price_per_lesson / 45
          console.log('💰 Price from categories table:', categoryData.price_per_lesson)
        } else {
          // Fallback zu statischen Preisen
          const fallbackPrices: Record<string, number> = {
            'B': 95, 'A1': 95, 'BE': 120, 'C1': 150, 'D1': 150, 'C': 170, 
            'CE': 200, 'D': 200, 'BPT': 100, 'Motorboot': 95
          }
          formData.value.price_per_minute = (fallbackPrices[category.code] || 95) / 45
        }
      } catch (err) {
        console.error('❌ Error loading category from DB:', err)
        formData.value.price_per_minute = 95 / 45 // Fallback
      }

      // Load staff durations from staff_settings table
      if (formData.value.staff_id) {
        try {
          await loadStaffDurations(formData.value.staff_id)
        } catch (err) {
          console.log('⚠️ Could not load staff durations from DB, using defaults')
          availableDurations.value = [45, 90, 135] // Fallback
        }
      }
      
      calculateEndTime()
    }
  }

  const handlePriceChanged = (pricePerMinute: number) => {
    console.log('💰 Price changed:', pricePerMinute)
    formData.value.price_per_minute = pricePerMinute
  }

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
  const handleDurationChanged = (duration: number) => {
    console.log('⏱️ Duration changed to:', duration)
    formData.value.duration_minutes = duration
    calculateEndTime()
  }

  // ============ LOCATION HANDLERS ============
  const handleLocationSelected = async (location: any) => {
    console.log('📍 Location selected:', location?.name)
    
    if (!location) {
      formData.value.location_id = ''
      return
    }

    // Echte Location aus locations table
    if (location.id && !location.id.startsWith('temp_')) {
      formData.value.location_id = location.id
      console.log('✅ Location ID from locations table:', location.id)
    } 
    // Neue Location von Google Places - speichern in locations table
    else if (location.id && location.id.startsWith('temp_') && formData.value.staff_id) {
      try {
        const { data: newLocation, error } = await supabase
          .from('locations')
          .insert({
            staff_id: formData.value.staff_id,
            name: location.name,
            adress: location.address || location.formatted_address || ''
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
    // Temporäre Location (wird beim Appointment speichern behandelt)
    else {
      formData.value.location_id = ''
      console.log('⚠️ Temporary location, will handle on save')
    }
  }

  // ============ EVENT TYPE HANDLERS ============
  const handleEventTypeSelected = (eventType: any) => {
    console.log('📋 Event type selected:', eventType?.code)
    
    formData.value.selectedSpecialType = eventType.code
    formData.value.duration_minutes = eventType.default_duration_minutes || 45
    
    if (eventType.auto_generate_title) {
      formData.value.title = eventType.name || 'Neuer Termin'
    }
    
    calculateEndTime()
  }

  const switchToOtherEventType = () => {
    formData.value.eventType = 'other'
    formData.value.selectedSpecialType = ''
    formData.value.title = ''
  }

  const backToStudentSelection = () => {
    formData.value.eventType = 'lesson'
    formData.value.selectedSpecialType = ''
    formData.value.title = ''
  }

  // ============ PAYMENT HANDLERS ============
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

  const handlePaymentError = (error: string) => {
    console.error('❌ Payment error:', error)
    formData.value.is_paid = false
  }

  const handlePaymentStarted = (method: string) => {
    console.log('🔄 Payment started with method:', method)
  }

  const handleSaveRequired = async (appointmentData: any) => {
    console.log('💾 Save required for payment processing')
    
    // WICHTIG: Appointment muss ZUERST gespeichert werden für echte UUID
    try {
      // Emit save event to parent (EventModal)
      // Parent muss das Appointment speichern und echte ID zurückgeben
      return new Promise((resolve, reject) => {
        // Signal parent that appointment needs to be saved first
        resolve({
          ...appointmentData,
          requiresSave: true,
          message: 'Appointment must be saved before payment'
        })
      })
    } catch (err) {
      console.error('❌ Error in handleSaveRequired:', err)
      throw err
    }
  }

  // ============ PAYMENT METHOD HANDLERS ============
  const handlePaymentMethodSelected = async (paymentMethod: string) => {
    console.log('💳 Payment method selected:', paymentMethod)
    
    // Use payment composable to handle selection
    if (selectedStudent.value?.id) {
      await paymentMethods.selectPaymentMethod(paymentMethod, selectedStudent.value.id)
    }
    
    // Update form data
    formData.value.payment_method = paymentMethod
    formData.value.payment_status = 'pending'
    formData.value.is_paid = false
    
    console.log('💳 Payment method configured:', {
      method: paymentMethod,
      status: formData.value.payment_status,
      paid: formData.value.is_paid
    })
  }

  const getPaymentMethodOptions = () => {
    return paymentMethods.paymentMethodOptions.value
  }

  const calculatePaymentBreakdown = () => {
    if (!formData.value.type || !formData.value.duration_minutes) {
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

  const processPaymentAfterSave = async (savedAppointment: any) => {
    const paymentMethod = formData.value.payment_method
    
    if (!paymentMethod || paymentMethod === 'none') {
      return null // No payment processing needed
    }

    const calculation = calculatePaymentBreakdown()
    if (!calculation) {
      throw new Error('Could not calculate payment breakdown')
    }

    const appointmentData = {
      appointmentId: savedAppointment.id,
      userId: formData.value.user_id,
      staffId: formData.value.staff_id,
      category: formData.value.type,
      duration: formData.value.duration_minutes,
      appointmentNumber: appointmentNumber.value,
      calculation
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
              currency: 'CHF'
            }
          }
          
          return result
          
        default:
          console.log('⚠️ Unknown payment method:', paymentMethod)
          return null
      }
    } catch (err) {
      console.error('❌ Payment processing error:', err)
      throw err
    }
  }
  const handleDiscountChanged = (discount: number, discountType: string, reason: string) => {
    console.log('🏷️ Discount changed:', { discount, discountType, reason })
    
    formData.value.discount = discount
    formData.value.discount_type = discountType
    formData.value.discount_reason = reason
  }

  // ============ TEAM HANDLERS (TAGS/EINLADUNGEN) ============
  const handleTeamInviteToggle = (staffId: string, invitedStaff: any) => {
    console.log('👥 Team invite toggled:', staffId)
    
    const index = invitedStaff.value.indexOf(staffId)
    if (index > -1) {
      invitedStaff.value.splice(index, 1)
      console.log('➖ Staff removed from invite')
    } else {
      invitedStaff.value.push(staffId)
      console.log('➕ Staff added to invite')
    }
  }

  const clearAllInvites = (invitedStaff: any) => {
    invitedStaff.value = []
    console.log('🗑️ All team invites cleared')
  }

  const inviteAllStaff = (availableStaff: any, invitedStaff: any) => {
    invitedStaff.value = availableStaff.value.map((s: any) => s.id)
    console.log('👥 All staff invited:', invitedStaff.value.length)
  }

  // ============ UTILITY FUNCTIONS ============
  const calculateEndTime = () => {
    if (formData.value.startTime && formData.value.duration_minutes) {
      const [hours, minutes] = formData.value.startTime.split(':').map(Number)
      const startDate = new Date()
      startDate.setHours(hours, minutes, 0, 0)
      
      const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)
      
      const endHours = String(endDate.getHours()).padStart(2, '0')
      const endMinutes = String(endDate.getMinutes()).padStart(2, '0')
      
      formData.value.endTime = `${endHours}:${endMinutes}`
      console.log('⏰ End time calculated:', formData.value.endTime)
    }
  }

  // Load last appointment duration from appointments table
  const getLastAppointmentDuration = async (studentId: string): Promise<number | null> => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('duration_minutes')
        .eq('user_id', studentId)
        .eq('status', 'completed')
        .order('end_time', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (error) {
        console.log('⚠️ No completed appointments found for student')
        return null
      }
      
      return data?.duration_minutes || null
    } catch (err) {
      console.error('❌ Error loading last appointment duration:', err)
      return null
    }
  }

  // Count appointments for appointment number (wichtig für Versicherungspauschale)
  const getAppointmentNumber = async (studentId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', studentId)
        .in('status', ['completed', 'confirmed'])
      
      if (error) throw error
      return (count || 0) + 1
      
    } catch (err) {
      console.error('❌ Error counting appointments from DB:', err)
      return 1
    }
  }

  // Load staff durations from staff_settings table
  const loadStaffDurations = async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from('staff_settings')
        .select('preferred_durations')
        .eq('staff_id', staffId)
        .maybeSingle()

      if (error || !data?.preferred_durations) {
        console.log('⚠️ No staff durations in DB, using defaults')
        availableDurations.value = [45, 90, 135]
        return
      }

      // Parse preferred_durations (stored as JSON string)
      let durations: number[] = []
      try {
        if (data.preferred_durations.startsWith('[')) {
          durations = JSON.parse(data.preferred_durations)
        } else {
          durations = data.preferred_durations.split(',').map((d: string) => parseInt(d.trim()))
        }
        durations = durations.filter(d => !isNaN(d) && d > 0).sort((a, b) => a - b)
      } catch (parseErr) {
        console.error('❌ Error parsing staff durations:', parseErr)
        durations = [45, 90, 135]
      }

      availableDurations.value = durations
      console.log('✅ Staff durations loaded from DB:', durations)
      
    } catch (err) {
      console.error('❌ Error loading staff durations from DB:', err)
      availableDurations.value = [45, 90, 135] // Fallback
    }
  }

  // Helper functions
  const getDefaultTitle = () => {
    if (formData.value.eventType === 'lesson' && selectedStudent.value) {
      return selectedStudent.value.first_name || 'Schüler'
    }
    if (formData.value.selectedSpecialType) {
      return getEventTypeName(formData.value.selectedSpecialType)
    }
    return 'Neuer Termin'
  }

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

  const getAdminFeeForCategory = (categoryCode: string): number => {
    // Versicherungspauschale aus Projektdaten - nur ab 2. Termin
    const adminFees: Record<string, number> = {
      'B': 120, 'A1': 0, 'A35kW': 0, 'A': 0, 'BE': 120,
      'C1': 200, 'D1': 200, 'C': 200, 'CE': 250, 'D': 300,
      'Motorboot': 120, 'BPT': 120
    }
    return adminFees[categoryCode] || 0
  }

  return {
    // Student Handlers
    handleStudentSelected,
    handleStudentCleared,
    autoFillFromStudent,
    
    // Category Handlers  
    handleCategorySelected,
    handlePriceChanged,
    handleDurationsChanged,
    
    // Duration Handlers
    handleDurationChanged,
    
    // Location Handlers
    handleLocationSelected,
    
    // Event Type Handlers
    handleEventTypeSelected,
    switchToOtherEventType,
    backToStudentSelection,
    
    // Payment Handlers
    handlePaymentSuccess,
    handlePaymentError,
    handlePaymentStarted,
    handleSaveRequired,
    
    // Payment Method Handlers
    handlePaymentMethodSelected,
    getPaymentMethodOptions,
    createPendingPaymentRecord,
    
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