// composables/useEventModalForm.ts
import { ref, computed, reactive } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useCategoryData } from '~/composables/useCategoryData'
import { useEventTypes } from '~/composables/useEventTypes'

// Types (können später in separates types file)
interface AppointmentData {
  id?: string
  title: string
  description: string
  type: string
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
      // ✅ Location-Validierung wieder aktiviert
      const isValid = baseValid && 
                     selectedStudent.value && 
                     formData.value.type && 
                     formData.value.location_id &&
                     formData.value.duration_minutes > 0
      
      console.log('🔍 Form validation check:', {
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

  const populateFormFromAppointment = (appointment: any) => {
    console.log('📝 Populating form from appointment:', appointment?.id)
    console.log('🔍 Full appointment data:', appointment)
    console.log('🔍 Appointment event_type_code check:', {
      direct_event_type_code: appointment.event_type_code,
      extendedProps_appointment_type: appointment.extendedProps?.appointment_type,
      extendedProps_eventType: appointment.extendedProps?.eventType,
      type: appointment.type,
      extendedProps_type: appointment.extendedProps?.type,
    })
    console.log('🔍 Appointment user_id check:', {
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
      console.log('🎯 Detected event type in appointment.type:', appointmentType)
    } else {
      // appointment.type ist die Fahrzeugkategorie, verwende event_type_code
      appointmentType = appointment.event_type_code || appointment.extendedProps?.appointment_type || 'lesson'
      vehicleCategory = appointment.type ? appointment.type.split(',')[0].trim() : 'B'
      console.log('🎯 Using event_type_code:', appointmentType)
    }
    
    console.log('🎯 Final appointmentType:', appointmentType)
    console.log('🎯 Final vehicleCategory:', vehicleCategory)
    
    const isOtherEvent = appointmentType && otherEventTypes.includes(appointmentType.toLowerCase())
    
    // Zeit-Verarbeitung
    const startDateTime = new Date(appointment.start_time || appointment.start)
    const endDateTime = appointment.end_time || appointment.end ? new Date(appointment.end_time || appointment.end) : null
    const startDate = startDateTime.toISOString().split('T')[0]
    const startTime = startDateTime.toTimeString().slice(0, 5)
    const endTime = endDateTime ? endDateTime.toTimeString().slice(0, 5) : ''
    
    let duration = appointment.duration_minutes || appointment.extendedProps?.duration_minutes
    console.log('🔍 Duration calculation debug:', {
      appointmentDuration: appointment.duration_minutes,
      extendedPropsDuration: appointment.extendedProps?.duration_minutes,
      hasEndDateTime: !!endDateTime,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime?.toISOString(),
      calculatedDuration: endDateTime ? Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)) : 'N/A'
    })
    
    if (!duration && endDateTime) {
      duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
      console.log('✅ Duration calculated from start/end times:', duration, 'minutes')
    }
    duration = duration || 45
    console.log('🎯 Final duration:', duration, 'minutes')
    
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
    
    console.log('🔍 DEBUG: Form populated with duration:', {
      originalDuration: duration,
      formDataDuration: formData.value.duration_minutes,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime
    })
    
    console.log('✅ Form populated with type:', formData.value.type)
    
    // ✅ Load student if user_id exists
    console.log('🔍 Student loading check:', {
      user_id: formData.value.user_id,
      eventType: formData.value.eventType,
      shouldLoadStudent: !!(formData.value.user_id && formData.value.eventType === 'lesson')
    })
    
    if (formData.value.user_id && formData.value.eventType === 'lesson') {
      console.log('🎯 Loading student by ID:', formData.value.user_id)
      loadStudentById(formData.value.user_id)
    } else {
      console.log('ℹ️ Skipping student load - missing user_id or not a lesson')
    }
    
    // ✅ Load existing discount if appointment ID exists
    if (appointment.id) {
      loadExistingDiscount(appointment.id)
      // ✅ Load existing products as well
      loadExistingProducts(appointment.id)
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
      console.log('📞 loadStudentById called with userId:', userId)
      
      // ✅ PRÜFE ZUERST: Ist das ein bezahlbarer Termin (Lektion)?
      if (!isLessonType(formData.value.eventType)) {
        console.log('🚫 Not loading student for other event type:', formData.value.eventType)
        selectedStudent.value = null
        return
      }
      
      const supabase = getSupabase()
      
      console.log('🔍 Querying users table for student...')
      const { data: student, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('role', 'client')
        .single()

      console.log('📊 Student query result:', { student, error })

      if (error) {
        console.error('❌ Error loading student:', error)
        return
      }

      if (student) {
        selectedStudent.value = student
        console.log('✅ Student loaded for existing appointment:', student.first_name, student.last_name)
        console.log('🎯 selectedStudent.value now set to:', selectedStudent.value?.id)
      } else {
        console.log('⚠️ No student found with ID:', userId)
      }
    } catch (err) {
      console.error('❌ Error in loadStudentById:', err)
    }
  }

  const calculateEndTime = () => {
    if (formData.value.startTime && formData.value.duration_minutes) {
      formData.value.endTime = computedEndTime.value
      console.log('⏰ End time calculated:', formData.value.endTime)
    }
  }

  // ============ SAVE/DELETE LOGIC ============ 
  
  // ✅ Load existing discount from discount_sales table
  const loadExistingDiscount = async (appointmentId: string) => {
    try {
      const supabase = getSupabase()
      
      const { data: discount, error } = await supabase
        .from('discount_sales')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.warn('⚠️ Error loading discount:', error)
        return null
      }
      
      if (discount) {
        console.log('💰 Existing discount loaded:', discount)
        
        // Convert rappen back to CHF for fixed discounts
        const discountAmount = discount.discount_type === 'percentage' 
          ? discount.discount_amount_rappen // Percentage stays as is
          : discount.discount_amount_rappen / 100 // Convert rappen to CHF
        
        // Update formData with discount info
        formData.value.discount = discountAmount
        formData.value.discount_type = discount.discount_type
        formData.value.discount_reason = discount.discount_reason || ''
        
        console.log('✅ Discount data populated into form:', {
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
      console.log('🏢 Loading student billing address for:', studentId)
      
      const supabaseClient = getSupabase()
      console.log('🔍 Supabase client check:', { 
        hasSupabase: !!supabaseClient,
        hasFrom: typeof supabaseClient?.from,
        supabaseType: typeof supabaseClient
      })
      
      // ✅ DEBUG: Erst schauen welche Spalten es gibt und alle Adressen laden
      console.log('🔍 Looking for billing addresses with created_by =', studentId)
      
      // Alle aktiven Adressen laden um die Struktur zu sehen
      const { data: allData, error: allError } = await supabaseClient
        .from('company_billing_addresses')
        .select('*')
        .eq('is_active', true)
        .limit(5)
        
      if (!allError && allData) {
        console.log('🔍 Sample billing addresses (to check structure):', allData)
      }
      
      // Jetzt spezifisch für diesen User suchen
      const { data, error } = await supabaseClient
        .from('company_billing_addresses')
        .select('*')
        .eq('created_by', studentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Database error:', error)
        throw error
      }

      console.log('🔍 Found billing addresses:', { 
        count: data?.length || 0, 
        addresses: data 
      })

      // Die neueste Adresse zurückgeben (falls vorhanden)
      const latestAddress = data && data.length > 0 ? data[0] : null
      if (latestAddress) {
        console.log('✅ Student billing address loaded:', latestAddress)
      } else {
        console.log('💡 No billing address found for student')
      }
      
      return latestAddress
    } catch (error) {
      console.error('❌ Error loading student billing address:', error)
      return null
    }
  }

  // ✅ Load existing payment data for edit mode
  const loadExistingPayment = async (appointmentId: string) => {
    if (!appointmentId) {
      console.log('ℹ️ No appointment ID provided for payment loading')
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
        console.log('✅ Existing payment loaded:', {
          id: paymentData.id,
          payment_method: paymentData.payment_method,
          payment_status: paymentData.payment_status,
          total_amount_chf: (paymentData.total_amount_rappen / 100).toFixed(2)
        })
        
        // Update selectedPaymentMethod ref if available
        if (refs?.selectedPaymentMethod) {
          refs.selectedPaymentMethod.value = paymentData.payment_method
          console.log('💳 Payment method set from existing payment:', paymentData.payment_method)
        }
        
        return paymentData
      }
      
      console.log('ℹ️ No existing payment found for appointment:', appointmentId)
      return null
      
    } catch (err: any) {
      console.error('❌ Error loading existing payment:', err)
      return null
    }
  }

  // ✅ Save discount to discount_sales table if discount exists
  const saveDiscountIfExists = async (appointmentId: string) => {
    if (!formData.value.discount || formData.value.discount <= 0) {
      console.log('ℹ️ No discount to save')
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
      
      console.log('💰 Saving discount data:', discountData)
      
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
        console.log('✅ Discount updated successfully')
      } else {
        // Create new discount
        const { data: newDiscount, error: insertError } = await supabase
          .from('discount_sales')
          .insert(discountData)
          .select()
          .single()
        
        if (insertError) throw insertError
        discountRecord = newDiscount
        console.log('✅ Discount saved successfully')
      }
      
      return discountRecord
      
    } catch (err: any) {
      console.error('❌ Error saving discount:', err)
      // Don't throw - discount saving shouldn't fail the entire appointment save
      return null
    }
  }
  
  // ✅ Save discount OR create discount_sales record for products linkage
  const saveDiscountOrCreateForProducts = async (appointmentId: string) => {
    const hasDiscount = formData.value.discount && formData.value.discount > 0
    const hasProducts = refs?.selectedProducts?.value && refs.selectedProducts.value.length > 0
    
    if (!hasDiscount && !hasProducts) {
      console.log('ℹ️ No discount or products to save')
      return null
    }
    
    try {
      const supabase = getSupabase()
      
      // Check if discount_sales record already exists for this appointment
      const { data: existingRecord, error: checkError } = await supabase
        .from('discount_sales')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.warn('⚠️ Error checking existing discount_sales:', checkError)
      }
      
      const discountData = {
        appointment_id: appointmentId,
        user_id: formData.value.user_id,
        staff_id: formData.value.staff_id,
        discount_amount_rappen: hasDiscount 
          ? (formData.value.discount_type === 'percentage' 
            ? Math.round(formData.value.discount || 0) // Percentage as whole number
            : Math.round((formData.value.discount || 0) * 100)) // Convert CHF to rappen
          : 0,
        discount_type: formData.value.discount_type || 'fixed',
        discount_reason: formData.value.discount_reason || '',
        payment_method: refs?.selectedPaymentMethod?.value || 'pending',
        status: 'pending'
      }
      
      console.log('💰 Saving/creating discount_sales record:', discountData)
      
      let discountRecord = null
      
      if (existingRecord) {
        // Update existing record
        const { data: updatedRecord, error: updateError } = await supabase
          .from('discount_sales')
          .update(discountData)
          .eq('id', existingRecord.id)
          .select()
          .single()
        
        if (updateError) throw updateError
        discountRecord = updatedRecord
        console.log('✅ Discount_sales record updated')
      } else {
        // Create new record
        const { data: newRecord, error: insertError } = await supabase
          .from('discount_sales')
          .insert(discountData)
          .select()
          .single()
        
        if (insertError) throw insertError
        discountRecord = newRecord
        console.log('✅ Discount_sales record created')
      }
      
      return discountRecord
      
    } catch (err: any) {
      console.error('❌ Error saving discount_sales record:', err)
      return null
    }
  }
  
  // ✅ Load existing products via discount_sales → product_sales chain
  const loadExistingProducts = async (appointmentId: string) => {
    console.log('📦 Loading existing products for appointment:', appointmentId)
    try {
      const supabase = getSupabase()
      
      // First get the discount_sales record for this appointment
      const { data: discountSale, error: discountError } = await supabase
        .from('discount_sales')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single()
      
      if (discountError && discountError.code !== 'PGRST116') {
        console.warn('⚠️ Error loading discount_sales:', discountError)
        return []
      }
      
      if (!discountSale) {
        console.log('📦 No discount_sales record found, no products to load')
        return []
      }

      console.log('📦 Found discount_sales record:', discountSale.id)

      // Now load product_sales that reference this discount_sales
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
        .eq('product_sale_id', discountSale.id)

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Error loading product_sales:', error)
        return []
      }

      if (!productItems || productItems.length === 0) {
        console.log('📦 No product items found')
        return []
      }

      console.log('📦 Found product items:', productItems.length)

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
      
      console.log('✅ Products formatted for UI:', allProducts.length)
      
      // Set products in refs if available
      if (refs?.selectedProducts) {
        refs.selectedProducts.value = allProducts
        console.log('✅ Products set in selectedProducts ref')
      }
      
      return allProducts
    } catch (err: any) {
      console.error('❌ Error loading existing products:', err)
      return []
    }
  }
  
  // ✅ Load invited staff and customers for other event types
  const loadInvitedStaffAndCustomers = async (appointmentId: string) => {
    console.log('👥 Loading invited staff and customers for appointment:', appointmentId)
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
        console.log('👥 Loaded invited customers:', customers?.length || 0)
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
          console.log('✅ Set invited customers in form:', newCustomers.length)
        } else {
          console.warn('⚠️ invitedCustomers ref not available')
        }
      }
      
      // TODO: Load invited staff when invited_staff table is created
      // For now, we'll need to create this table first
      console.log('ℹ️ Staff invitations loading not yet implemented - need invited_staff table')
      
    } catch (err: any) {
      console.error('❌ Error loading invited staff and customers:', err)
    }
  }
  
  // ✅ Note: Admin fee loading is now handled directly in usePricing for edit mode
  
  // ✅ Save products to product_sales table if products exist
  const saveProductsIfExists = async (appointmentId: string, discountSaleId?: string) => {
    // Check if we have selected products (from refs or other sources)
    const selectedProducts = refs?.selectedProducts?.value || []
    
    if (!selectedProducts || selectedProducts.length === 0) {
      console.log('ℹ️ No products to save')
      return
    }
    
    if (!discountSaleId) {
      console.log('❌ No discount_sale_id provided for product linkage')
      return
    }
    
    try {
      const supabase = getSupabase()
      
      // First, delete existing products for this discount_sale
      const { error: deleteError } = await supabase
        .from('product_sales')
        .delete()
        .eq('product_sale_id', discountSaleId)
      
      if (deleteError) {
        console.warn('⚠️ Error deleting existing products:', deleteError)
      }
      
      // Prepare product data for insertion
      const productData = selectedProducts.map((item: any) => ({
        product_sale_id: discountSaleId, // Link to discount_sales record
        product_id: item.product?.id || item.id,
        quantity: item.quantity || 1,
        unit_price_rappen: Math.round((item.product?.price || item.price || 0) * 100),
        total_price_rappen: Math.round((item.total || (item.product?.price || item.price || 0) * (item.quantity || 1)) * 100)
      }))
      
      console.log('📦 Saving product data:', productData)
      
      // Insert new products
      const { error: insertError } = await supabase
        .from('product_sales')
        .insert(productData)
      
      if (insertError) throw insertError
      
      console.log('✅ Products saved successfully:', productData.length)
      
    } catch (err: any) {
      console.error('❌ Error saving products:', err)
      // Don't throw - product saving shouldn't fail the entire appointment save
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
      
      // Appointment Data
      // ✅ FIX: Für "other" EventTypes ohne Schüler, verwende staff_id als user_id
      const userId = formData.value.user_id || (formData.value.eventType === 'other' ? formData.value.staff_id || dbUser.id : null)
      
      const appointmentData = {
        title: formData.value.title,
        description: formData.value.description,
        user_id: userId,
        staff_id: formData.value.staff_id || dbUser.id,
        location_id: formData.value.location_id,
        start_time: `${formData.value.startDate}T${formData.value.startTime}:00`,
        end_time: `${formData.value.startDate}T${formData.value.endTime}:00`,
        duration_minutes: formData.value.duration_minutes,
        type: formData.value.type,
        status: formData.value.status,
        // ✅ Missing fields added back
        event_type_code: formData.value.appointment_type || 'lesson',
        custom_location_address: formData.value.custom_location_address || undefined,
        custom_location_name: formData.value.custom_location_name || undefined,
        google_place_id: formData.value.google_place_id || undefined,
        // ✅ Add tenant_id and category_code for availability checking
        tenant_id: dbUser.tenant_id,
        category_code: formData.value.category_code || dbUser.category,
        // ✅ Required fields from schema:
        is_paid: false,  // Default false, managed separately in payments
        price_per_minute: 0  // Default 0, managed separately in pricing
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
      
      // ✅ Save discount and products (create discount_sales record even if no discount, for products linkage)
      const discountSale = await saveDiscountOrCreateForProducts(result.id)
      
      // ✅ Save products if exists
      await saveProductsIfExists(result.id, discountSale?.id)
      
      // ✅ Create payment entry nur für Lektionen (lesson, exam, theory)
      const appointmentType = formData.value.appointment_type || 'lesson' // Fallback zu 'lesson' wenn undefined
      const isLessonType = ['lesson', 'exam', 'theory'].includes(appointmentType)
      if (isLessonType) {
        console.log('🚀 Creating payment entry for lesson type:', appointmentType)
        const paymentResult = await createPaymentEntry(result.id, discountSale?.id)
        console.log('📊 Payment creation result:', paymentResult)
      } else {
        console.log('ℹ️ Skipping payment creation for other event type:', appointmentType)
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

  // ✅ NEUE FUNKTION: Lade letzte Kategorie aus Cloud Supabase
  const loadLastAppointmentCategory = async (studentId?: string): Promise<string | null> => {
    try {
      console.log('🎯 Loading last appointment category from Cloud Supabase...')
      
      if (!currentUser?.id) {
        console.log('🚫 No current user ID available')
        return null
      }

      const supabase = getSupabase()
      
      let query = supabase
        .from('appointments')
        .select('type, start_time, user_id, title')
        .eq('staff_id', currentUser.id)
        .order('start_time', { ascending: false })
      
      if (studentId) {
        console.log('🎯 Loading last category for specific student:', studentId)
        query = query.eq('user_id', studentId)
      }
      
      const { data: lastAppointment, error } = await query.limit(1).single()

      if (error) {
        console.error('❌ Error loading last appointment:', error)
        return null
      }

      if (lastAppointment?.type) {
        console.log('✅ Last appointment category loaded:', lastAppointment.type)
        return lastAppointment.type
      } else {
        console.log('ℹ️ No last appointment category found')
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
        console.log('📚 Theorielektion: Verwende Standardpreis 85.- CHF')
      } else {
        // ✅ Für andere Lektionen: Verwende die dynamische Preisberechnung
        const pricePerMinute = 2.11 // Default price per minute
        const baseLessonPriceRappen = Math.round(durationMinutes * pricePerMinute * 100)
        // Round to nearest 100 rappen (CHF 1.00)
        lessonPriceRappen = Math.round(baseLessonPriceRappen / 100) * 100
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
        console.log('📚 Theorielektion: Keine Admin-Fee')
      } else {
        adminFeeRappen = Math.round((refs?.dynamicPricing?.value?.adminFeeRappen || 0))
      }
      
      console.log('💰 Admin fee for payment:', {
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
      
      console.log('💳 Payment method debug:', {
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
      let companyBillingAddressId = null
      let invoiceAddress = null
      
      if (paymentMethod === 'invoice' && refs?.priceDisplayRef?.value) {
        const priceDisplay = refs.priceDisplayRef.value
        
        // Check if there's a saved company billing address ID from EventModal
        // This should be set when the invoice address is saved
        const eventModalScope = (globalThis as any).savedCompanyBillingAddressId
        if (eventModalScope) {
          companyBillingAddressId = eventModalScope
          console.log('📋 Using company billing address ID from EventModal scope:', companyBillingAddressId)
        }
        // Fallback: Check PriceDisplay component directly
        if (priceDisplay && priceDisplay.savedCompanyBillingAddressId) {
          companyBillingAddressId = priceDisplay.savedCompanyBillingAddressId
          console.log('📋 Using company billing address ID from PriceDisplay:', companyBillingAddressId)
        }
        // Fallback: Copy invoice data as JSONB if no company billing address was saved
        else if (priceDisplay && priceDisplay.invoiceData) {
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
          console.log('📋 Using fallback invoice address as JSONB:', invoiceAddress)
        }
      }

      const paymentData = {
        appointment_id: appointmentId,
        user_id: formData.value.user_id || null,
        staff_id: formData.value.staff_id,
        lesson_price_rappen: lessonPriceRappen,
        admin_fee_rappen: adminFeeRappen,
        products_price_rappen: productsPriceRappen,
        discount_amount_rappen: discountAmountRappen,
        total_amount_rappen: Math.max(0, totalAmountRappen), // Ensure no negative totals
        payment_method: paymentMethod,
        payment_status: 'pending',
        currency: 'CHF',
        description: `Payment for appointment: ${formData.value.title}`,
        created_by: formData.value.staff_id || null,
        notes: formData.value.discount_reason ? `Discount: ${formData.value.discount_reason}` : null,
        company_billing_address_id: companyBillingAddressId || null, // ✅ NEU: Referenz zu company_billing_addresses
        invoice_address: invoiceAddress // ✅ Fallback: Rechnungsadresse als JSONB
      }
      
      console.log('💳 Creating payment entry:', paymentData)
      
      const { data: payment, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error creating payment:', error)
        // Don't throw - payment creation shouldn't fail the entire appointment save
        return null
      }
      
      console.log('✅ Payment entry created:', payment.id)
      return payment
      
    } catch (err: any) {
      console.error('❌ Error in createPaymentEntry:', err)
      // Don't throw - payment creation shouldn't fail the entire appointment save
      return null
    }
  }

  // ✅ NEUE FUNKTION: Lade letzten Standort aus Cloud Supabase
  const loadLastAppointmentLocation = async (studentId?: string): Promise<{ location_id: string | null, custom_location_address: any | null }> => {
    try {
      console.log('📍 Loading last appointment location from Cloud Supabase...')
      
      if (!currentUser?.id) {
        console.log('🚫 No current user ID available')
        return { location_id: null, custom_location_address: null }
      }

      const supabase = getSupabase()
      
      let query = supabase
        .from('appointments')
        .select('location_id, custom_location_address, start_time, user_id, title')
        .eq('staff_id', currentUser.id)
        .order('start_time', { ascending: false })
      
      if (studentId) {
        console.log('🎯 Loading last location for specific student:', studentId)
        query = query.eq('user_id', studentId)
      }
      
      const { data: lastAppointment, error } = await query.limit(1).single()

      if (error) {
        console.error('❌ Error loading last appointment location:', error)
        return { location_id: null, custom_location_address: null }
      }

      if (lastAppointment?.location_id || lastAppointment?.custom_location_address) {
        console.log('✅ Last appointment location loaded:', {
          location_id: lastAppointment.location_id,
          has_custom_address: !!lastAppointment.custom_location_address
        })
        
        return {
          location_id: lastAppointment.location_id,
          custom_location_address: lastAppointment.custom_location_address
        }
      } else {
        console.log('ℹ️ No last appointment location found')
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

    // Composables
    categoryData,
    eventTypes,
  }
}

export { useEventModalForm }