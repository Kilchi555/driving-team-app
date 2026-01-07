// composables/useEventModalForm.ts
import { ref, computed, reactive } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { useCategoryData } from '~/composables/useCategoryData'
import { toLocalTimeString, localTimeToUTC } from '~/utils/dateUtils'
import { useEventTypes } from '~/composables/useEventTypes'

// Types (können später in separates types file)
interface AppointmentData {
  id?: string
  title: string
  description: string
  type: string | null // ✅ Can be null for "other" event types (meetings, training)
  appointment_type?: string  // ✅ Added missing property
  startDate: string
  startTime: string
  endTime: string 
  duration_minutes: number
  user_id: string
  staff_id: string
  location_id: string
  // ✅ price_per_minute removed - not in appointments table, handled in pricing system
  status: string
  eventType: string 
  selectedSpecialType: string 
  // ✅ is_paid removed - not in appointments table, handled in payments table
  discount?: number
  discount_type?: string
  discount_reason?: string
  // ✅ Additional missing fields
  custom_location_address?: any
  custom_location_name?: string
  google_place_id?: string
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

const useEventModalForm = (currentUser?: any, refs?: {
  customerInviteSelectorRef?: any,
  staffSelectorRef?: any,
  invitedCustomers?: any,
  invitedStaffIds?: any,
  selectedLocation?: any,
  priceDisplayRef?: any,  
  emit?: any,
  props?: any,
  selectedPaymentMethod?: any,
  selectedPaymentData?: any,
  selectedProducts?: any, // ✅ Selected products from useProductSale
  dynamicPricing?: any, // ✅ Dynamic pricing for admin fee
}) => {
  
  // ============ STATE ============
  const formData = ref<AppointmentData>({
    title: '',
    description: '',
    type: '',
    appointment_type: 'lesson',
    startDate: '',
    startTime: '',
    endTime: '',
    duration_minutes: 45,
    user_id: '',
    staff_id: '',
    location_id: '',
    // ✅ price_per_minute removed - not in appointments table
    status: 'booked',
    eventType: 'lesson',
    selectedSpecialType: '',
    // ✅ is_paid removed - not in appointments table
    discount: 0,
    discount_type: 'fixed',
    discount_reason: '',
    // ✅ Additional missing fields
    custom_location_address: undefined,
    custom_location_name: undefined,
    google_place_id: undefined
  })

  const selectedStudent = ref<Student | null>(null)
  const selectedCategory = ref<any>(null)
  const selectedLocation = ref<any>(null)
  const availableDurations = ref<number[]>([45])
  const appointmentNumber = ref<number>(1)
  
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ✅ NEUE COMPOSABLES
  const categoryData = useCategoryData()
  const eventTypes = useEventTypes()

  // ============ COMPUTED ============
  const isFormValid = computed(() => {
    const baseValid = formData.value.title && 
                     formData.value.startDate && 
                     formData.value.startTime &&
                     formData.value.endTime

    if (formData.value.eventType === 'lesson') {
      // ✅ NEU: Debug-Log für Form-Validierung
      const isValid = baseValid && 
                     selectedStudent.value && 
                     formData.value.type && 
                     formData.value.location_id &&
                     formData.value.duration_minutes > 0
      
      logger.debug('🔍 Form validation check:', {
        baseValid,
        hasStudent: !!selectedStudent.value,
        hasType: !!formData.value.type,
        hasLocation: !!formData.value.location_id,
        hasDuration: formData.value.duration_minutes > 0,
        isValid
      })
      
      return isValid
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

  // ✅ totalPrice removed - pricing handled separately in pricing system
  const totalPrice = computed(() => '0.00')

  // ============ FORM ACTIONS ============
  const resetForm = () => {
    logger.debug('🔄 Resetting form data')
    
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
      // ✅ price_per_minute removed - not in appointments table
      status: 'booked',
      eventType: 'lesson',
      appointment_type: 'lesson', // ✅ Standard lesson type setzen
      selectedSpecialType: '',
      // ✅ is_paid removed - not in appointments table
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

  const populateFormFromAppointment = async (appointment: any) => {
    logger.debug('📝 Populating form from appointment:', appointment?.id)
    logger.debug('🔍 Full appointment data:', appointment)
    logger.debug('🔍 Appointment event_type_code check:', {
      direct_event_type_code: appointment.event_type_code,
      extendedProps_appointment_type: appointment.extendedProps?.appointment_type,
      extendedProps_eventType: appointment.extendedProps?.eventType,
      type: appointment.type,
      extendedProps_type: appointment.extendedProps?.type,
    })
    logger.debug('🔍 Appointment user_id check:', {
      user_id: appointment.user_id,
      extendedProps_user_id: appointment.extendedProps?.user_id,
      hasUserData: !!(appointment.user_id || appointment.extendedProps?.user_id)
    })
    
    // ✅ KORREKTE TERMINART AUS DB - Mehrere Fallbacks prüfen
    const otherEventTypes = ['meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other', 'vku', 'nothelfer']
    
    // Prüfe zuerst, ob appointment.type ein event type ist (falsch gespeichert)
    const isTypeAnEventType = appointment.type && otherEventTypes.includes(appointment.type.toLowerCase())
    
    let appointmentType = 'lesson' // Default
    let vehicleCategory = 'B' // Default
    
    if (isTypeAnEventType) {
      // appointment.type ist ein event type, nicht die Fahrzeugkategorie
      // Das ist der korrekte Termintyp
      appointmentType = appointment.type.toLowerCase()
      vehicleCategory = 'B' // Standard für andere Events
      logger.debug('🎯 Detected event type in appointment.type:', appointmentType)
    } else {
      // appointment.type ist die Fahrzeugkategorie, verwende event_type_code
      appointmentType = appointment.event_type_code || appointment.extendedProps?.appointment_type || 'lesson'
      vehicleCategory = appointment.type ? appointment.type.split(',')[0].trim() : 'B'
      logger.debug('🎯 Using event_type_code:', appointmentType)
    }
    
    logger.debug('🎯 Final appointmentType:', appointmentType)
    logger.debug('🎯 Final vehicleCategory:', vehicleCategory)
    
    const isOtherEvent = appointmentType && otherEventTypes.includes(appointmentType.toLowerCase())
    
    // Zeit-Verarbeitung: Convert UTC from DB to Zurich local time for display
    const startDateTime = new Date(appointment.start_time || appointment.start)
    const endDateTime = appointment.end_time || appointment.end ? new Date(appointment.end_time || appointment.end) : null
    
    // Convert UTC to Zurich local time using toLocaleString
    const startLocalStr = startDateTime.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
    const startDate = startLocalStr.substring(0, 10) // YYYY-MM-DD
    const startTime = startLocalStr.substring(11, 16) // HH:MM
    
    const endTime = endDateTime 
      ? endDateTime.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' }).substring(11, 16)
      : ''
    
    let duration = appointment.duration_minutes || appointment.extendedProps?.duration_minutes
    logger.debug('🔍 Duration calculation debug:', {
      appointmentDuration: appointment.duration_minutes,
      extendedPropsDuration: appointment.extendedProps?.duration_minutes,
      hasEndDateTime: !!endDateTime,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime?.toISOString(),
      calculatedDuration: endDateTime ? Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)) : 'N/A'
    })
    
    if (!duration && endDateTime) {
      duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
      logger.debug('✅ Duration calculated from start/end times:', duration, 'minutes')
    }
    duration = duration || 45
    logger.debug('🎯 Final duration:', duration, 'minutes')
    
    // ✅ vehicleCategory bereits oben definiert
    
    formData.value = {
      title: appointment.title || '',
      description: appointment.description || appointment.extendedProps?.description || '',
      type: vehicleCategory, // Immer Fahrzeugkategorie (B, A, etc.)
      appointment_type: appointmentType, // Der tatsächliche event_type_code (lesson, meeting, etc.)
      startDate: startDate,
      startTime: startTime,
      endTime: endTime,
      duration_minutes: duration,
      user_id: appointment.user_id || appointment.extendedProps?.user_id || '',
      staff_id: appointment.staff_id || appointment.extendedProps?.staff_id || currentUser?.id || '',
      location_id: appointment.location_id || appointment.extendedProps?.location_id || '',
      // ✅ price_per_minute removed - not in appointments table
      status: appointment.status || appointment.extendedProps?.status || 'confirmed',
      eventType: isOtherEvent ? appointmentType : 'lesson',
      selectedSpecialType: isOtherEvent ? appointmentType : '',
      // ✅ is_paid removed - not in appointments table
      discount: appointment.discount || appointment.extendedProps?.discount || 0,
      discount_type: appointment.discount_type || appointment.extendedProps?.discount_type || 'fixed',
      discount_reason: appointment.discount_reason || appointment.extendedProps?.discount_reason || '',
      // ✅ Additional missing fields
      custom_location_address: appointment.custom_location_address || appointment.extendedProps?.custom_location_address || null,
      custom_location_name: appointment.custom_location_name || appointment.extendedProps?.custom_location_name || null,
      google_place_id: appointment.google_place_id || appointment.extendedProps?.google_place_id || null
    }
    
    logger.debug('🔍 DEBUG: Form populated with duration:', {
      originalDuration: duration,
      formDataDuration: formData.value.duration_minutes,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime
    })
    
    logger.debug('✅ Form populated with type:', formData.value.type)
    
    // ✅ Load student if user_id exists
    logger.debug('🔍 Student loading check:', {
      user_id: formData.value.user_id,
      eventType: formData.value.eventType,
      shouldLoadStudent: !!(formData.value.user_id && formData.value.eventType === 'lesson')
    })
    
    if (formData.value.user_id && formData.value.eventType === 'lesson') {
      logger.debug('🎯 Loading student by ID:', formData.value.user_id)
      loadStudentById(formData.value.user_id)
    } else {
      logger.debug('ℹ️ Skipping student load - missing user_id or not a lesson')
    }
    
    // ✅ Load existing discount if appointment ID exists
    if (appointment.id) {
      loadExistingDiscount(appointment.id)
      // ✅ Load existing products - AWAIT to ensure they're loaded before other operations
      await loadExistingProducts(appointment.id)
      // ✅ Load invited staff and customers for other event types
      if (isOtherEvent) {
        loadInvitedStaffAndCustomers(appointment.id)
      }
      // ✅ Admin fee will be loaded automatically by usePricing in edit mode
    }
  }

  // ✅ Helper function to check if event type is a lesson type
  const isLessonType = (eventType: string) => {
    const lessonTypes = ['lesson', 'exam', 'theory']
    return lessonTypes.includes(eventType)
  }

  // ✅ Load student by ID for existing appointments
  const loadStudentById = async (userId: string) => {
    try {
      logger.debug('📞 loadStudentById called with userId:', userId)
      
      // ✅ PRÜFE ZUERST: Ist das ein bezahlbarer Termin (Lektion)?
      if (!isLessonType(formData.value.eventType)) {
        logger.debug('🚫 Not loading student for other event type:', formData.value.eventType)
        selectedStudent.value = null
        return
      }
      
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        logger.error('❌ No access token available')
        return
      }
      
      logger.debug('🔍 Loading student via backend API...')
      const { user: student } = await $fetch('/api/admin/get-user-for-edit', {
        query: { user_id: userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      logger.debug('📊 Student query result:', { student })

      if (student) {
        selectedStudent.value = student
        logger.debug('✅ Student loaded for existing appointment:', student.first_name, student.last_name)
        logger.debug('🎯 selectedStudent.value now set to:', selectedStudent.value?.id)
      } else {
        logger.debug('⚠️ No student found with ID:', userId)
      }
    } catch (err) {
      console.error('❌ Error in loadStudentById:', err)
    }
  }

  const calculateEndTime = () => {
    if (formData.value.startTime && formData.value.duration_minutes) {
      formData.value.endTime = computedEndTime.value
      logger.debug('⏰ End time calculated:', formData.value.endTime)
    }
  }

  // ============ SAVE/DELETE LOGIC ============ 
  
  // ✅ Load existing discount from discount_sales table
  const loadExistingDiscount = async (appointmentId: string) => {
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        logger.error('❌ No access token available')
        return null
      }
      
      const { discountSales } = await $fetch('/api/admin/get-discount-sales', {
        query: { appointment_id: appointmentId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      
      const discount = discountSales?.[0]
      
      if (discount) {
        logger.debug('💰 Existing discount loaded:', discount)
        
        // Convert rappen back to CHF for fixed discounts
        const discountAmount = discount.discount_type === 'percentage' 
          ? discount.discount_amount_rappen // Percentage stays as is
          : discount.discount_amount_rappen / 100 // Convert rappen to CHF
        
        // Update formData with discount info
        formData.value.discount = discountAmount
        formData.value.discount_type = discount.discount_type
        formData.value.discount_reason = discount.discount_reason || ''
        
        logger.debug('✅ Discount data populated into form:', {
          amount: discountAmount,
          type: discount.discount_type,
          reason: discount.discount_reason
        })
        
        return discount
      }
      
      return null
    } catch (err: any) {
      console.error('❌ Error loading existing discount:', err)
      return null
    }
  }
  
  // ✅ NEU: Lade Standard-Rechnungsadresse eines Studenten
  const loadStudentBillingAddress = async (studentId: string) => {
    try {
      logger.debug('🏢 Loading student billing address for:', studentId)
      
      const supabaseClient = getSupabase()
      
      // ✅ Lade die neueste Rechnungsadresse für diesen Student (user_id)
      logger.debug('🔍 Looking for billing address with user_id =', studentId)
      
      const { data: addressData, error: addressError } = await supabaseClient
        .from('company_billing_addresses')
        .select('*')
        .eq('user_id', studentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (addressError) {
        console.warn('⚠️ Error querying billing addresses:', addressError)
        return null
      }

      if (addressData && addressData.length > 0) {
        const address = addressData[0]
        logger.debug('✅ Student billing address loaded:', address)
        return address
      }

      logger.debug('💡 No active billing address found for student')
      return null
    } catch (error) {
      console.error('❌ Error loading student billing address:', error)
      return null
    }
  }

  // ✅ Load existing payment data for edit mode
  const loadExistingPayment = async (appointmentId: string) => {
    if (!appointmentId) {
      logger.debug('ℹ️ No appointment ID provided for payment loading')
      return null
    }

    try {
      const supabase = getSupabase()
      
      const { data: paymentData, error } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.warn('⚠️ Error loading existing payment:', error)
        return null
      }
      
      if (paymentData) {
        logger.debug('✅ Existing payment loaded:', {
          id: paymentData.id,
          payment_method: paymentData.payment_method,
          payment_status: paymentData.payment_status,
          total_amount_chf: (paymentData.total_amount_rappen / 100).toFixed(2)
        })
        
        // Update selectedPaymentMethod ref if available
        if (refs?.selectedPaymentMethod) {
          refs.selectedPaymentMethod.value = paymentData.payment_method
          logger.debug('💳 Payment method set from existing payment:', paymentData.payment_method)
        }
        
        return paymentData
      }
      
      logger.debug('ℹ️ No existing payment found for appointment:', appointmentId)
      return null
      
    } catch (err: any) {
      console.error('❌ Error loading existing payment:', err)
      return null
    }
  }

  // ✅ Save discount to discount_sales table if discount exists
  const saveDiscountIfExists = async (appointmentId: string) => {
    if (!formData.value.discount || formData.value.discount <= 0) {
      logger.debug('ℹ️ No discount to save')
      return null
    }
    
    try {
      const supabase = getSupabase()
      
      // First, check if discount already exists for this appointment
      const { data: existingDiscount, error: checkError } = await supabase
        .from('discount_sales')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.warn('⚠️ Error checking existing discount:', checkError)
      }
      
      const discountData = {
        appointment_id: appointmentId,
        user_id: formData.value.user_id,
        staff_id: formData.value.staff_id,
        discount_amount_rappen: formData.value.discount_type === 'percentage' 
          ? Math.round(formData.value.discount || 0) // Percentage as whole number (e.g., 10 for 10%)
          : Math.round((formData.value.discount || 0) * 100), // Convert CHF to rappen
        discount_type: formData.value.discount_type || 'fixed',
        discount_reason: formData.value.discount_reason || '',
        payment_method: refs?.selectedPaymentMethod?.value || 'pending',
        status: 'pending'
      }
      
      logger.debug('💰 Saving discount data:', discountData)
      
      let discountRecord = null
      
      if (existingDiscount) {
        // Update existing discount
        const { data: updatedDiscount, error: updateError } = await supabase
          .from('discount_sales')
          .update(discountData)
          .eq('id', existingDiscount.id)
          .select()
          .single()
        
        if (updateError) throw updateError
        discountRecord = updatedDiscount
        logger.debug('✅ Discount updated successfully')
      } else {
        // Create new discount
        const { data: newDiscount, error: insertError } = await supabase
          .from('discount_sales')
          .insert(discountData)
          .select()
          .single()
        
        if (insertError) throw insertError
        discountRecord = newDiscount
        logger.debug('✅ Discount saved successfully')
      }
      
      return discountRecord
      
    } catch (err: any) {
      console.error('❌ Error saving discount:', err)
      // Don't throw - discount saving shouldn't fail the entire appointment save
      return null
    }
  }
  
  // ✅ Save discount OR create discount_sales record for products linkage (via secure API)
  const saveDiscountOrCreateForProducts = async (appointmentId: string) => {
    const hasDiscount = formData.value.discount && formData.value.discount > 0
    const hasProducts = refs?.selectedProducts?.value && refs.selectedProducts.value.length > 0
    
    if (!hasDiscount && !hasProducts) {
      logger.debug('ℹ️ No discount or products to save')
      return null
    }
    
    try {
      const discountData = {
        discount_amount_rappen: hasDiscount 
          ? (formData.value.discount_type === 'percentage' 
            ? Math.round(formData.value.discount || 0) // Percentage as whole number
            : Math.round((formData.value.discount || 0) * 100)) // Convert CHF to rappen
          : 0,
        discount_type: formData.value.discount_type || 'fixed',
        discount_reason: formData.value.discount_reason || '',
        staff_id: formData.value.staff_id || null,
        payment_method: refs?.selectedPaymentMethod?.value || null,
        status: 'pending'
      }
      
      logger.debug('💰 Saving discount via API:', discountData)
      
      // ✅ Get auth token and add Authorization header
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      
      // Call secure API instead of direct Supabase query
      const result = await $fetch('/api/discounts/save', {
        method: 'POST',
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {},
        body: {
          appointmentId,
          discountData
        }
      })
      
      logger.debug('✅ Discount saved via API:', result.discount?.id)
      return result.discount
      
    } catch (err: any) {
      console.error('❌ Error saving discount:', err)
      logger.error('Discount save error:', {
        message: err.message,
        status: err.status,
        statusCode: err.statusCode
      })
      return null
    }
  }
  
  // ✅ Load existing products directly from appointment
  // After refactor: products are directly linked to appointments, not via discount_sales
  const loadExistingProducts = async (appointmentId: string) => {
    logger.debug('📦 Loading existing products for appointment:', appointmentId)
    try {
      const supabase = getSupabase()
      
      // ✅ Load products directly by appointment_id (no more discount_sales indirection)
      const { data: productItems, error } = await supabase
        .from('product_sales')
        .select(`
          *,
          products (
            id,
            name,
            description,
            price_rappen
          )
        `)
        .eq('appointment_id', appointmentId)

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Error loading product_sales:', error)
        return []
      }

      if (!productItems || productItems.length === 0) {
        logger.debug('📦 No products found for appointment')
        return []
      }

      logger.debug('📦 Found product items:', productItems.length)

      // Format products for UI
      const allProducts = productItems.map((item: any) => ({
        id: item.id,
        product: {
          id: item.products?.id || item.product_id,
          name: item.products?.name || 'Unknown Product',
          price: (item.products?.price_rappen || item.unit_price_rappen || 0) / 100,
          description: item.products?.description || ''
        },
        quantity: item.quantity || 1,
        total: item.total_price_rappen / 100
      }))
      
      logger.debug('✅ Products formatted for UI:', allProducts.length)
      
      // Set products in refs if available
      if (refs?.selectedProducts) {
        refs.selectedProducts.value = allProducts
        logger.debug('✅ Products set in selectedProducts ref')
      }
      
      return allProducts
    } catch (err: any) {
      console.error('❌ Error loading existing products:', err)
      return []
    }
  }
  
  // ✅ Load invited staff and customers for other event types
  const loadInvitedStaffAndCustomers = async (appointmentId: string) => {
    logger.debug('👥 Loading invited staff and customers for appointment:', appointmentId)
    try {
      const supabase = getSupabase()
      
      // Load invited customers
      const { data: customers, error: customersError } = await supabase
        .from('invited_customers')
        .select('*')
        .eq('appointment_id', appointmentId)
      
      if (customersError) {
        console.warn('⚠️ Error loading invited customers:', customersError)
      } else {
        logger.debug('👥 Loaded invited customers:', customers?.length || 0)
        // Set invited customers in the form - convert to NewCustomer format
        if (refs?.invitedCustomers) {
          const newCustomers = (customers || []).map(customer => ({
            first_name: customer.first_name || '',
            last_name: customer.last_name || '',
            phone: customer.phone || '',
            category: customer.category || '',
            notes: customer.notes || ''
          }))
          refs.invitedCustomers.value = newCustomers
          logger.debug('✅ Set invited customers in form:', newCustomers.length)
        } else {
          console.warn('⚠️ invitedCustomers ref not available')
        }
      }
      
      // TODO: Load invited staff when invited_staff table is created
      // For now, we'll need to create this table first
      logger.debug('ℹ️ Staff invitations loading not yet implemented - need invited_staff table')
      
    } catch (err: any) {
      console.error('❌ Error loading invited staff and customers:', err)
    }
  }
  
  // ✅ Note: Admin fee loading is now handled directly in usePricing for edit mode
  
  // ✅ Save products to product_sales table if products exist
  // Products are now directly linked to appointments (not via discount_sales)
  const saveProductsIfExists = async (appointmentId: string, discountSaleId?: string) => {
    // Check if we have selected products (from refs or other sources)
    const selectedProducts = refs?.selectedProducts?.value || []
    
    if (!selectedProducts || selectedProducts.length === 0) {
      logger.debug('ℹ️ No products to save')
      return { totalProductsPriceRappen: 0 }
    }
    
    try {
      const supabase = getSupabase()
      
      // Delete existing products for this appointment
      const { error: deleteError } = await supabase
        .from('product_sales')
        .delete()
        .eq('appointment_id', appointmentId)
      
      if (deleteError) {
        console.warn('⚠️ Error deleting existing products:', deleteError)
      }
      
      // Prepare product data for insertion
      // ✅ Now using appointment_id directly instead of product_sale_id
      const productData = selectedProducts.map((item: any) => ({
        appointment_id: appointmentId,  // Direct link to appointment
        product_id: item.product?.id || item.id,
        quantity: item.quantity || 1,
        unit_price_rappen: Math.round((item.product?.price || item.price || 0) * 100),
        total_price_rappen: Math.round((item.total || (item.product?.price || item.price || 0) * (item.quantity || 1)) * 100)
      }))
      
      logger.debug('📦 Saving product data:', productData)
      
      // Insert new products
      const { error: insertError } = await supabase
        .from('product_sales')
        .insert(productData)
      
      if (insertError) throw insertError
      
      logger.debug('✅ Products saved successfully:', productData.length)
      
      // ✅ Calculate total products price
      const totalProductsPriceRappen = productData.reduce((sum, item) => sum + (item.total_price_rappen || 0), 0)
      logger.debug('💰 Total products price:', (totalProductsPriceRappen / 100).toFixed(2), 'CHF')
      
      return { totalProductsPriceRappen }
      
    } catch (err: any) {
      console.error('❌ Error saving products:', err)
      // Don't throw - product saving shouldn't fail the entire appointment save
      return { totalProductsPriceRappen: 0 }
    }
  }
  
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
      
      if (!dbUser.tenant_id) {
        throw new Error('Benutzer hat keinen Tenant zugeordnet')
      }
      
      // Appointment Data
      // ✅ FIX: Für "other" EventTypes ohne Schüler, verwende staff_id als user_id
      // WICHTIG: user_id darf NIEMALS null sein - Foreign Key Constraint!
      const userId = formData.value.user_id || formData.value.staff_id || dbUser.id
      
      if (!userId) {
        throw new Error('Kein gültiger User für diesen Termin vorhanden')
      }
      
      logger.debug('📋 Appointment user_id:', userId, 'eventType:', formData.value.eventType)
      
      // Determine if this is a chargeable lesson-type appointment
      const isChargeableLesson = (formData.value.appointment_type || 'lesson') && ['lesson', 'exam', 'theory'].includes(formData.value.appointment_type || 'lesson')
      // Generate confirmation token for chargeable appointments
      const confirmationToken = isChargeableLesson ? crypto.randomUUID?.() || Math.random().toString(36).slice(2) : null

      // Build timestamps: Convert from local (Zurich) time to UTC for database storage
      // formData values are already in Zurich local time (e.g., "11:00")
      // We need to convert them to UTC ISO strings (e.g., "2025-11-17T10:00:00")
      
      const convertLocalToUTC = (dateStr: string, timeStr: string): string => {
        // Get Zurich timezone offset at this date
        const [year, month, day] = dateStr.split('-').map(Number)
        const midnightUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
        
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
        // Format is "YYYY-MM-DD, HH:MM:SS" with comma and space after date
        // Position 12-14 contains "HH" (hours)
        const zurichHour = parseInt(zurichMidnightStr.substring(12, 14))
        
        const offsetHours = zurichHour // Zurich offset from UTC
        
        // Parse input time
        const [hours, minutes] = timeStr.split(':').map(Number)
        
        
        // Convert: UTC = Local - Offset
        let utcHours = hours - offsetHours
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
        
        const paddedHours = String(utcHours).padStart(2, '0')
        const paddedMinutes = String(minutes).padStart(2, '0')
        const paddedDay = String(utcDay).padStart(2, '0')
        
        const result = `${year}-${String(month).padStart(2, '0')}-${paddedDay}T${paddedHours}:${paddedMinutes}:00`
        
        
        return result
      }
      
      const localStart = convertLocalToUTC(formData.value.startDate, formData.value.startTime)
      const localEnd = convertLocalToUTC(formData.value.startDate, formData.value.endTime)
      
      const nowLocal = toLocalTimeString(new Date()) // Current timestamp (unchanged for now)

      // ✅ IMPORTANTE FIX: Berechne total_amount_rappen VOR dem Speichern!
      // Dies ermöglicht der API, das Payment automatisch zu erstellen
      let totalAmountRappenForPayment = 0
      let basePriceRappen = 0
      let adminFeeRappen = 0
      let productsPriceRappen = 0
      let discountAmountRappen = 0
      
      if (isChargeableLesson) {
        try {
          // ✅ Berechne Preis basierend auf Duration und pricePerMinute
          // Diese sind IMMER verfügbar, im Gegensatz zu formData.base_price_rappen
          const durationMinutes = formData.value.duration_minutes || 45
          const pricePerMinute = refs?.dynamicPricing?.value?.pricePerMinute || 2.11 // Default: CHF 2.11/min
          
          // Berechne die Einzelkomponenten
          basePriceRappen = Math.round(durationMinutes * pricePerMinute * 100)
          adminFeeRappen = refs?.dynamicPricing?.value?.adminFeeRappen || 0
          productsPriceRappen = formData.value.products_total_rappen || 0
          discountAmountRappen = Math.round((formData.value.discount || 0) * 100)
          
          totalAmountRappenForPayment = Math.max(0, 
            basePriceRappen + adminFeeRappen + productsPriceRappen - discountAmountRappen
          )
          
          logger.debug('💰 Payment amount calculated:', {
            duration: durationMinutes,
            pricePerMinute: pricePerMinute.toFixed(2),
            basePrice: (basePriceRappen / 100).toFixed(2),
            adminFee: (adminFeeRappen / 100).toFixed(2),
            products: (productsPriceRappen / 100).toFixed(2),
            discount: (discountAmountRappen / 100).toFixed(2),
            total: (totalAmountRappenForPayment / 100).toFixed(2)
          })
        } catch (priceErr: any) {
          logger.warn('⚠️ Could not calculate payment amount:', priceErr)
          // Continue without amount - payment will be created later with correct amount
        }
      }
      
      // ✅ NEW: Calculate credit used (for display in confirmation and storage in payment)
      let creditUsedRappenForPayment = 0
      const priceDisplay = refs?.priceDisplayRef?.value
      if (priceDisplay?.usedCredit && priceDisplay.usedCredit > 0) {
        creditUsedRappenForPayment = Math.round(priceDisplay.usedCredit * 100)
        logger.debug('💳 Credit used calculated:', {
          creditChf: priceDisplay.usedCredit,
          creditRappen: creditUsedRappenForPayment
        })
      }

      const appointmentData = {
        title: formData.value.title,
        description: formData.value.description,
        user_id: userId,
        staff_id: formData.value.staff_id || dbUser.id,
        location_id: formData.value.location_id,
        start_time: localStart,
        end_time: localEnd,
        duration_minutes: formData.value.duration_minutes,
        type: formData.value.type,
        // For chargeable lessons, newly created appointments should require confirmation first
        // For other events or edits, use pending_confirmation as default
        status: (mode === 'create' || isChargeableLesson) ? 'pending_confirmation' : (formData.value.status || 'pending_confirmation'),
        // ✅ Missing fields added
        event_type_code: formData.value.appointment_type || 'lesson',
        custom_location_address: formData.value.custom_location_address || undefined,
        custom_location_name: formData.value.custom_location_name || undefined,
        google_place_id: formData.value.google_place_id || undefined,
        confirmation_token: confirmationToken || undefined,
        // ✅ Add tenant_id for availability checking
        tenant_id: dbUser.tenant_id,
        // Store created/updated timestamps explicitly in local time
        created_at: nowLocal,
        updated_at: nowLocal
        // ✅ Note: total_amount_rappen is sent separately to API, not stored in appointments
      }
      
      logger.debug('💾 Saving appointment data:', appointmentData)
      
      // Use API endpoint with admin privileges to bypass RLS foreign key issues
      let response
      try {
        response = await $fetch('/api/appointments/save', {
          method: 'POST',
          body: {
            mode,
            eventId,
            appointmentData,
            totalAmountRappenForPayment,
            paymentMethodForPayment: formData.value.payment_method || 'wallee',
            // ✅ Send price breakdown components
            basePriceRappen,
            adminFeeRappen,
            productsPriceRappen,
            discountAmountRappen,
            // ✅ Send credit used (if any)
            creditUsedRappen: creditUsedRappenForPayment
          }
        })
      } catch (fetchError: any) {
        logger.error('❌ API error saving appointment:', fetchError)
        // Re-throw with better error message
        throw new Error(fetchError.data?.message || fetchError.message || 'Fehler beim Speichern des Termins')
      }
      
      const result = response?.data
      
      if (!result) {
        throw new Error('Keine Daten vom Server erhalten')
      }
      
      logger.debug('✅ Appointment saved:', result.id)
      
      // ✅ NEW: Send appointment confirmation email with token
      // ✅ NOTE: Email notification is handled by createPaymentEntry() via send-payment-confirmation
      // to avoid duplicate emails. The payment confirmation includes all necessary details.
      
      // ✅ Auto-assign staff to customer (via Backend API to bypass RLS)
      if (mode === 'create' && result.staff_id && result.user_id) {
        try {
          const supabase = getSupabase()
          const { data: { session } } = await supabase.auth.getSession()
          
          const response = await $fetch('/api/admin/update-user-assigned-staff', {
            method: 'POST',
            headers: session?.access_token ? {
              'Authorization': `Bearer ${session.access_token}`
            } : {},
            body: {
              userId: result.user_id,
              staffId: result.staff_id
            }
          }) as any
          
          if (response?.success) {
            logger.debug('✅ Staff added to customer assigned_staff_ids via API')
          }
        } catch (error: any) {
          console.warn('⚠️ Could not auto-assign staff:', error.message)
          // Not critical, continue
        }
      }
      
      // ✅ Save discount and products (create discount_sales record even if no discount, for products linkage)
      const discountSale = await saveDiscountOrCreateForProducts(result.id)
      
      // ✅ Save products if exists and get total products price
      const productResult = await saveProductsIfExists(result.id, discountSale?.id)
      
      // ✅ Update payment with products price if products were saved
      if (productResult?.totalProductsPriceRappen && productResult.totalProductsPriceRappen > 0) {
        try {
          logger.debug('💰 Updating payment with products price:', (productResult.totalProductsPriceRappen / 100).toFixed(2))
          
          const supabase = getSupabase()
          const { data: { session } } = await supabase.auth.getSession()
          
          // Get the payment record for this appointment
          const { data: payments, error: paymentFetchError } = await supabase
            .from('payments')
            .select('id, total_amount_rappen, lesson_price_rappen, admin_fee_rappen, discount_amount_rappen')
            .eq('appointment_id', result.id)
            .single()
          
          if (!paymentFetchError && payments) {
            // Recalculate total: lesson + admin_fee + products - discount
            const newTotal = (payments.lesson_price_rappen || 0) 
              + (payments.admin_fee_rappen || 0) 
              + (productResult.totalProductsPriceRappen || 0) 
              - (payments.discount_amount_rappen || 0)
            
            // Update payment with products price
            const { error: updateError } = await supabase
              .from('payments')
              .update({
                products_price_rappen: productResult.totalProductsPriceRappen,
                total_amount_rappen: Math.max(0, newTotal),
                updated_at: new Date().toISOString()
              })
              .eq('appointment_id', result.id)
            
            if (updateError) {
              logger.warn('⚠️ Could not update payment with products price:', updateError)
            } else {
              logger.debug('✅ Payment updated with products price')
            }
          }
        } catch (err: any) {
          logger.warn('⚠️ Error updating payment with products:', err.message)
          // Don't throw - this is secondary update
        }
      }
      
      // ✅ Create or update payment entry nur für Lektionen (lesson, exam, theory)
      const appointmentType = formData.value.appointment_type || 'lesson' // Fallback zu 'lesson' wenn undefined
      const isLessonType = ['lesson', 'exam', 'theory'].includes(appointmentType)
      if (isLessonType) {
        if (mode === 'create') {
          logger.debug('🚀 Creating new payment entry for lesson type (pending_confirmation flow):', appointmentType)
          const paymentResult = await createPaymentEntry(result.id, discountSale?.id)
          logger.debug('📊 Payment creation result:', paymentResult)
        } else {
          logger.debug('🔄 Updating existing payment entry for lesson type:', appointmentType)
          const paymentResult = await updatePaymentEntry(result.id, discountSale?.id)
          logger.debug('📊 Payment update result:', paymentResult)
        }
      } else {
        logger.debug('ℹ️ Skipping payment creation for other event type:', appointmentType)
      }
      
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
      
      logger.debug('✅ Appointment deleted:', eventId)
      
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

  // ✅ NEUE FUNKTION: Lade letzte Kategorie aus Cloud Supabase
  const loadLastAppointmentCategory = async (studentId?: string): Promise<string | null> => {
    try {
      logger.debug('🎯 Loading last appointment category from Cloud Supabase...')
      
      if (!currentUser?.id) {
        logger.debug('🚫 No current user ID available')
        return null
      }

      const supabase = getSupabase()
      
      let query = supabase
        .from('appointments')
        .select('type, start_time, user_id, title')
        .eq('staff_id', currentUser.id)
        .is('deleted_at', null)
        .not('status', 'eq', 'cancelled')
        .not('status', 'eq', 'aborted')
        .order('start_time', { ascending: false })
      
      if (studentId) {
        logger.debug('🎯 Loading last category for specific student:', studentId)
        query = query.eq('user_id', studentId)
      }
      
      const { data: lastAppointment, error } = await query.limit(1).maybeSingle()

      if (error) {
        console.error('❌ Error loading last appointment:', error)
        return null
      }

      if (!lastAppointment) {
        logger.debug('ℹ️ No last appointment category found (first appointment for this student)')
        return null
      }

      if (lastAppointment?.type) {
        logger.debug('✅ Last appointment category loaded:', lastAppointment.type)
        return lastAppointment.type
      } else {
        logger.debug('ℹ️ No appointment type found')
        return null
      }

    } catch (error) {
      console.error('❌ Error in loadLastAppointmentCategory:', error)
      return null
    }
  }

  // ✅ Create payment entry for appointment
  const createPaymentEntry = async (appointmentId: string, discountSaleId?: string) => {
    try {
      const supabase = getSupabase()
      
      // ✅ KORRIGIERT: Verwende die korrekte Preisberechnung aus dynamicPricing
      const durationMinutes = formData.value.duration_minutes || 45
      const appointmentType = formData.value.appointment_type || 'lesson'
      
      // ✅ Für Theorielektionen: Verwende den korrekten Preis (85.- CHF)
      let lessonPriceRappen: number
      if (appointmentType === 'theory') {
        lessonPriceRappen = 8500 // 85.00 CHF in Rappen
        logger.debug('📚 Theorielektion: Verwende Standardpreis 85.- CHF')
      } else {
        // ✅ Für andere Lektionen: Verwende die dynamische Preisberechnung aus dynamicPricing
        const dynamicPrice = refs?.dynamicPricing?.value
        
        if (dynamicPrice && dynamicPrice.totalPriceChf) {
          // Verwende den berechneten Preis aus dem PriceDisplay (OHNE Admin Fee)
          const totalChf = parseFloat(dynamicPrice.totalPriceChf) || 0
          const adminFeeChf = dynamicPrice.adminFeeChf || 0
          const basePriceChf = totalChf - adminFeeChf
          lessonPriceRappen = Math.round(basePriceChf * 100)
          logger.debug('💰 Verwende dynamischen Preis:', {
            totalChf,
            adminFeeChf,
            basePriceChf,
            basePriceRappen: lessonPriceRappen,
            pricePerMinute: dynamicPrice.pricePerMinute
          })
        } else {
          // Fallback: Default price per minute (sollte nicht passieren)
          console.warn('⚠️ No dynamic pricing available, using fallback')
          const pricePerMinute = 2.11
          const baseLessonPriceRappen = Math.round(durationMinutes * pricePerMinute * 100)
          lessonPriceRappen = Math.round(baseLessonPriceRappen / 100) * 100
        }
      }
      
      // Calculate products total
      const selectedProducts = refs?.selectedProducts?.value || []
      const productsPriceRappen = selectedProducts.reduce((total: number, item: any) => {
        const price = item.product?.price || item.price || 0
        const quantity = item.quantity || 1
        return total + Math.round(price * quantity * 100)
      }, 0)
      
      // Discount amount
      const discountAmountRappen = Math.round((formData.value.discount || 0) * 100)
      
      // ✅ KORRIGIERT: Admin fee - für Theorielektionen immer 0, sonst aus dynamicPricing
      let adminFeeRappen: number
      if (appointmentType === 'theory') {
        adminFeeRappen = 0 // Keine Admin-Fee für Theorielektionen
        logger.debug('📚 Theorielektion: Keine Admin-Fee')
      } else {
        adminFeeRappen = Math.round((refs?.dynamicPricing?.value?.adminFeeRappen || 0))
      }
      
      logger.debug('💰 Admin fee for payment:', {
        adminFeeChf: refs?.dynamicPricing?.value?.adminFeeChf,
        adminFeeRappen: adminFeeRappen,
        hasAdminFee: refs?.dynamicPricing?.value?.hasAdminFee
      })
      
      // Get payment method from refs or default
      const rawPaymentMethod = refs?.selectedPaymentMethod?.value || 'wallee'
      
      // Map payment method to correct database values (UI values → DB values)
      const paymentMethodMapping: Record<string, string> = {
        'wallee': 'wallee',
        'online': 'wallee',
        'twint': 'wallee',
        'card': 'wallee',
        'credit-card': 'wallee',
        'cash': 'cash',
        'bar': 'cash',
        'invoice': 'invoice',
        'rechnung': 'invoice'
      }
      
      const paymentMethod = paymentMethodMapping[rawPaymentMethod] || 'wallee'
      
      logger.debug('💳 Payment method debug:', {
        rawPaymentMethod,
        mappedPaymentMethod: paymentMethod,
        availableMappings: Object.keys(paymentMethodMapping),
        refsAvailable: refs ? true : false,
        selectedPaymentMethodRef: refs?.selectedPaymentMethod?.value,
        willSaveAs: paymentMethod
      })
      
      // Total calculation
      const totalAmountRappen = lessonPriceRappen + productsPriceRappen + adminFeeRappen - discountAmountRappen
      
      // Get invoice address from PriceDisplay component if payment method is invoice
      let companyBillingAddressId: string | null = null
      let invoiceAddress: any = null
      
      // ✅ IMPORTANT: We no longer use globalThis for the billing address ID
      // globalThis is unreliable and causes phantom ID references
      // Instead, we simply don't include company_billing_address_id in the payment
      // This triggers automatic creation of a Pendenz for missing billing address
      
      if (paymentMethod === 'invoice' && refs?.priceDisplayRef?.value) {
        const priceDisplay = refs.priceDisplayRef.value
        
        // Copy invoice data as JSONB if available
        if (priceDisplay && priceDisplay.invoiceData) {
          invoiceAddress = {
            company_name: priceDisplay.invoiceData.company_name || '',
            contact_person: priceDisplay.invoiceData.contact_person || '',
            email: priceDisplay.invoiceData.email || '',
            phone: priceDisplay.invoiceData.phone || '',
            street: priceDisplay.invoiceData.street || '',
            street_number: priceDisplay.invoiceData.street_number || '',
            zip: priceDisplay.invoiceData.zip || '',
            city: priceDisplay.invoiceData.city || '',
            country: priceDisplay.invoiceData.country || 'Schweiz',
            vat_number: priceDisplay.invoiceData.vat_number || '',
            notes: priceDisplay.invoiceData.notes || ''
          }
          logger.debug('📋 Using invoice address as JSONB for display')
        }
        
        // company_billing_address_id will NOT be set (remains null)
        // This allows the payment to be created and triggers a Pendenz
        companyBillingAddressId = null
      }

      // ✅ WICHTIG: tenant_id für Payments hinzufügen
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      // ✅ NEW: Check if student credit is being used
      let creditUsedRappen = 0
      let creditTransactionId = null
      
      // Check if PriceDisplay has credit usage info
      logger.debug('🔍 DEBUG createPaymentEntry - checking priceDisplayRef:', {
        hasRef: !!refs,
        hasDisplayRef: !!refs?.priceDisplayRef,
        hasValue: !!refs?.priceDisplayRef?.value,
        displayRefKeys: refs?.priceDisplayRef?.value ? Object.keys(refs.priceDisplayRef.value) : 'no keys'
      })
      
      if (refs?.priceDisplayRef?.value) {
        const priceDisplay = refs.priceDisplayRef.value
        logger.debug('🔍 DEBUG priceDisplay object:', {
          usedCredit: priceDisplay.usedCredit,
          type: typeof priceDisplay.usedCredit,
          keys: Object.keys(priceDisplay)
        })
        
        // Check if credit is being used (from PriceDisplay calculation)
        if (priceDisplay.usedCredit && priceDisplay.usedCredit > 0) {
          creditUsedRappen = Math.round(priceDisplay.usedCredit * 100)
          logger.debug('💳 Credit being used from PriceDisplay:', {
            creditChf: priceDisplay.usedCredit,
            creditRappen: creditUsedRappen
          })
        } else {
          logger.debug('⚠️ usedCredit is falsy or <= 0:', priceDisplay.usedCredit)
        }
      } else {
        logger.debug('⚠️ priceDisplayRef not available')
      }
      
      // ✅ NOTE: Credit transaction handling is now done by useStudentCredits
      // when the payment is confirmed, not during creation

      const paymentData: any = {
        appointment_id: appointmentId,
        user_id: formData.value.user_id || null,
        staff_id: formData.value.staff_id,
        lesson_price_rappen: lessonPriceRappen,
        admin_fee_rappen: adminFeeRappen,
        products_price_rappen: productsPriceRappen,
        discount_amount_rappen: discountAmountRappen,
        total_amount_rappen: Math.max(0, totalAmountRappen),
        // ✅ If credit covers the entire payment, set payment_method to 'credit'
        payment_method: creditUsedRappen >= Math.max(0, totalAmountRappen) ? 'credit' : paymentMethod,
        // ✅ If credit covers the entire payment, mark as completed
        payment_status: creditUsedRappen >= Math.max(0, totalAmountRappen) ? 'completed' : 'pending',
        currency: 'CHF',
        description: `Payment for appointment: ${formData.value.title}`,
        created_by: formData.value.staff_id || null,
        notes: formData.value.discount_reason ? `Discount: ${formData.value.discount_reason}` : null,
        invoice_address: invoiceAddress,
        tenant_id: userData?.tenant_id || null,
        credit_used_rappen: creditUsedRappen,
        credit_transaction_id: creditTransactionId,
        // ✅ If credit covers everything, mark as paid
        paid_at: creditUsedRappen >= Math.max(0, totalAmountRappen) ? new Date().toISOString() : null
      }
      
      // Note: company_billing_address_id is intentionally NOT set in create mode
      // This triggers the Pendenz system for missing billing address if needed
      
      logger.debug('💳 Creating payment entry:', {
        paymentData,
        creditUsedRappen,
        totalAmountRappen: Math.max(0, totalAmountRappen),
        willSetToCredit: creditUsedRappen >= Math.max(0, totalAmountRappen),
        willSetToCompleted: creditUsedRappen >= Math.max(0, totalAmountRappen),
        finalPaymentMethod: creditUsedRappen >= Math.max(0, totalAmountRappen) ? 'credit' : paymentMethod,
        finalPaymentStatus: creditUsedRappen >= Math.max(0, totalAmountRappen) ? 'completed' : 'pending'
      })
      
      // ✅ Payment now created automatically in POST /api/appointments/save endpoint
      // No need to call separate create-payment API
      logger.debug('ℹ️ Payment will be created automatically by appointments/save API')
      
      // For now, just return null - payment was created server-side
      return null
      
    } catch (err: any) {
      console.error('❌ Error in createPaymentEntry:', err)
      // Don't throw - payment creation shouldn't fail the entire appointment save
      return null
    }
  }

  // ✅ Update payment entry for existing appointment
  const updatePaymentEntry = async (appointmentId: string, discountSaleId?: string) => {
    try {
      const supabase = getSupabase()
      
      // Check if payment already exists
      const { data: existingPayment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('❌ Error checking existing payment:', fetchError)
        return null
      }

      if (!existingPayment) {
        logger.debug('ℹ️ No existing payment found, creating new one')
        return await createPaymentEntry(appointmentId, discountSaleId)
      }

      // ✅ CHECK: Verhindere Änderungen an bezahlten Terminen, wenn Dauer erhöht wird
      const isPaid = existingPayment.payment_status === 'completed' || existingPayment.payment_status === 'authorized'
      
      if (isPaid) {
        // ✅ Nutze die bereits geladenen Appointment-Daten aus formData
        // Keine zusätzliche Query nötig - das verhindert RLS-Fehler
        const newDuration = formData.value.duration_minutes || 45
        
        // Bei Edit-Mode sollten die Original-Daten bekannt sein
        // Falls nicht, erlaube die Änderung trotzdem (non-blocking)
        logger.debug('✅ Duration check for paid appointment - allowing update')
      }

      logger.debug('🔄 Updating existing payment:', existingPayment.id)
      
      // ✅ WICHTIG: Nutze die aktuell in PriceDisplay gespeicherte Price aus der DB
      // nicht die alten Refs, da PriceDisplay den Preis bereits aktualisiert hat
      let lessonPriceRappen: number
      const appointmentType = formData.value.appointment_type || 'lesson'
      
      // ✅ Get user data for tenant_id early (needed for pricing rule lookup)
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', formData.value.staff_id)
        .single()
      
      // Check if PriceDisplay already updated the payment with new price
      if (existingPayment.lesson_price_rappen && existingPayment.lesson_price_rappen > 0) {
        // Use the current payment price (already updated by PriceDisplay watcher)
        lessonPriceRappen = existingPayment.lesson_price_rappen
        logger.debug('💾 Using existing payment price from DB (updated by PriceDisplay):', lessonPriceRappen)
      } else {
        // Fallback: calculate based on current data
        const durationMinutes = formData.value.duration_minutes || 45
      
      if (appointmentType === 'theory') {
        lessonPriceRappen = 8500
        logger.debug('📚 Theorielektion: Verwende Standardpreis 85.- CHF')
      } else {
        const dynamicPrice = refs?.dynamicPricing?.value
        
        // DEBUG: Zeige den aktuellen Status von dynamicPrice
        logger.debug('🔍 Dynamic pricing state at save time:', {
          available: !!dynamicPrice,
          totalPriceChf: dynamicPrice?.totalPriceChf,
          pricePerMinute: dynamicPrice?.pricePerMinute,
          adminFeeChf: dynamicPrice?.adminFeeChf,
          adminFeeRappen: dynamicPrice?.adminFeeRappen
        })
        
        if (dynamicPrice && dynamicPrice.totalPriceChf) {
          const totalChf = parseFloat(dynamicPrice.totalPriceChf) || 0
          const adminFeeChf = dynamicPrice.adminFeeChf || 0
          const basePriceChf = totalChf - adminFeeChf
          lessonPriceRappen = Math.round(basePriceChf * 100)
        } else {
          logger.warn('⚠️ No dynamic pricing available, using fallback pricing calculation')
          
          // Fallback: Lade die Preisregel aus der DB
          const { data: pricingRule } = await supabase
            .from('pricing_rules')
            .select('*')
            .eq('category_code', formData.value.type)
            .eq('tenant_id', userData?.tenant_id || '')
            .eq('is_default', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          if (pricingRule) {
            const basePriceChf = pricingRule.base_price_rappen / 100
            lessonPriceRappen = Math.round(basePriceChf * 100)
            logger.debug('💾 Fallback: Using pricing rule from DB:', { category: formData.value.type, price: lessonPriceRappen })
          } else {
            // Last resort: Use generic calculation
            const pricePerMinute = 2.11
            const baseLessonPriceRappen = Math.round(durationMinutes * pricePerMinute * 100)
            lessonPriceRappen = Math.round(baseLessonPriceRappen / 100) * 100
            logger.warn('💾 Fallback: Using generic price per minute calculation:', { pricePerMinute, duration: durationMinutes, price: lessonPriceRappen })
          }
          }
        }
      }
      
      const selectedProducts = refs?.selectedProducts?.value || []
      const productsPriceRappen = selectedProducts.reduce((total: number, item: any) => {
        const price = item.product?.price || item.price || 0
        const quantity = item.quantity || 1
        return total + Math.round(price * quantity * 100)
      }, 0)
      
      const discountAmountRappen = Math.round((formData.value.discount || 0) * 100)
      
      // ✅ WICHTIG: Nutze admin fee aus DB wenn bereits dort, sonst berechne neu
      let adminFeeRappen: number
      if (appointmentType === 'theory') {
        adminFeeRappen = 0
      } else {
        // Use existing admin fee from DB (already updated by PriceDisplay if needed)
        adminFeeRappen = existingPayment.admin_fee_rappen || 0
        
        // If still 0 and not theory, check dynamic pricing
        if (adminFeeRappen === 0) {
        adminFeeRappen = Math.round((refs?.dynamicPricing?.value?.adminFeeRappen || 0))
        }
      }
      
      const rawPaymentMethod = refs?.selectedPaymentMethod?.value || 'wallee'
      const paymentMethodMapping: Record<string, string> = {
        'wallee': 'wallee',
        'online': 'wallee',
        'twint': 'wallee',
        'card': 'wallee',
        'credit-card': 'wallee',
        'cash': 'cash',
        'bar': 'cash',
        'invoice': 'invoice',
        'rechnung': 'invoice'
      }
      
      const paymentMethod = paymentMethodMapping[rawPaymentMethod] || 'wallee'
      const totalAmountRappen = lessonPriceRappen + productsPriceRappen + adminFeeRappen - discountAmountRappen
      
      // Get invoice address
      let companyBillingAddressId: string | null = null
      let invoiceAddress: any = null
      
      if (paymentMethod === 'invoice') {
        const invoiceAddressData = (refs as any)?.companyBillingAddress?.value
        if (invoiceAddressData) {
          companyBillingAddressId = invoiceAddressData.id
          invoiceAddress = {
            company_name: invoiceAddressData.company_name,
            address: invoiceAddressData.address,
            city: invoiceAddressData.city,
            postal_code: invoiceAddressData.postal_code,
            country: invoiceAddressData.country
          }
        }
      }
      
      // userData already fetched at the start of this function
      
      const updateData = {
        lesson_price_rappen: lessonPriceRappen,
        products_price_rappen: productsPriceRappen,
        discount_amount_rappen: discountAmountRappen,
        total_amount_rappen: Math.max(0, totalAmountRappen),
        payment_method: paymentMethod,
        description: `Payment for appointment: ${formData.value.title}`,
        notes: formData.value.discount_reason ? `Discount: ${formData.value.discount_reason}` : null,
        company_billing_address_id: companyBillingAddressId || null,
        invoice_address: invoiceAddress,
        updated_at: new Date().toISOString()
      }
      
      logger.debug('💳 Updating payment entry:', updateData)
      
      const { data: payment, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', existingPayment.id)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error updating payment:', error)
        return null
      }
      
      logger.debug('✅ Payment entry updated:', payment.id)
      return payment
      
    } catch (err: any) {
      console.error('❌ Error in updatePaymentEntry:', err)
      return null
    }
  }

  // ✅ NEUE FUNKTION: Lade letzten Standort aus Cloud Supabase
  const loadLastAppointmentLocation = async (studentId?: string): Promise<{ location_id: string | null, custom_location_address: any | null }> => {
    try {
      logger.debug('📍 Loading last appointment location from Cloud Supabase...')
      
      if (!currentUser?.id) {
        logger.debug('🚫 No current user ID available')
        return { location_id: null, custom_location_address: null }
      }

      const supabase = getSupabase()
      
      let query = supabase
        .from('appointments')
        .select('location_id, custom_location_address, start_time, user_id, title')
        .eq('staff_id', currentUser.id)
        .order('start_time', { ascending: false })
      
      if (studentId) {
        logger.debug('🎯 Loading last location for specific student:', studentId)
        query = query.eq('user_id', studentId)
      }
      
      const { data: lastAppointment, error } = await query.limit(1).maybeSingle()

      if (error) {
        console.error('❌ Error loading last appointment location:', error)
        return { location_id: null, custom_location_address: null }
      }

      if (!lastAppointment) {
        logger.debug('ℹ️ No previous appointments found for this user')
        return { location_id: null, custom_location_address: null }
      }

      if (lastAppointment?.location_id || lastAppointment?.custom_location_address) {
        logger.debug('✅ Last appointment location loaded:', {
          location_id: lastAppointment.location_id,
          has_custom_address: !!lastAppointment.custom_location_address
        })
        
        return {
          location_id: lastAppointment.location_id,
          custom_location_address: lastAppointment.custom_location_address
        }
      } else {
        logger.debug('ℹ️ No last appointment location found')
        return { location_id: null, custom_location_address: null }
      }

    } catch (error) {
      console.error('❌ Error in loadLastAppointmentLocation:', error)
      return { location_id: null, custom_location_address: null }
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
    loadStudentById,
    calculateEndTime,
    saveAppointment,
    deleteAppointment,
    getAppointmentNumber,
    loadLastAppointmentCategory,
    loadLastAppointmentLocation,
    loadExistingDiscount,
    loadExistingPayment,
    loadStudentBillingAddress, // ✅ NEU: Export für Student Billing Address

    saveDiscountIfExists,
    saveDiscountOrCreateForProducts,
    loadExistingProducts,
    saveProductsIfExists,
    createPaymentEntry,
    updatePaymentEntry,

    // Composables
    categoryData,
    eventTypes,
  }
}

export { useEventModalForm }