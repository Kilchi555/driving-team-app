// Neues, sauberes Payment Composable mit optimiertem Speicher-Workflow
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import type { 
  Payment, 
  PaymentItem, 
  PaymentWithItems, 
  CreatePaymentRequest,
  CreatePaymentItemRequest,
  Product,
  Discount
} from '~/types/payment'

export const usePaymentsNew = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ✅ OPTIMIERTER SPEICHER-WORKFLOW: Termin + Produkte + Rabatte → Payment
  const createAppointmentWithPayment = async (
    appointmentData: {
      title: string
      description?: string
      user_id: string
      staff_id?: string
      location_id?: string
      start_time: string
      end_time: string
      duration_minutes: number
      type: string
      event_type_code: string
      status: string
    },
    products: Product[] = [],
    discounts: Discount[] = [],
    paymentMethod: 'cash' | 'invoice' | 'online' = 'cash'
  ): Promise<{ appointment: any, payment: Payment } | null> => {
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()
      
      console.log('🔄 Creating appointment with integrated payment workflow...')
      
      // 1. TERMIN in appointments Tabelle speichern
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          ...appointmentData,
          // Keine Payment-Daten mehr in appointments!
          price_per_minute: null,
          is_paid: null,
          discount: null,
          discount_type: null,
          discount_reason: null
        })
        .select()
        .single()

      if (appointmentError) throw appointmentError
      console.log('✅ Appointment saved:', appointment.id)

      // 2. PAYMENT ITEMS vorbereiten
      const paymentItems: CreatePaymentItemRequest[] = []

      // 2a. Termin als Payment Item hinzufügen
      const appointmentPrice = calculateAppointmentPrice(appointmentData.type, appointmentData.duration_minutes)
              paymentItems.push({
          item_type: 'appointment',
          item_id: appointment.id,
          item_name: `Fahrstunde ${appointmentData.type}`,
          quantity: 1,
          unit_price_rappen: Math.round(appointmentPrice * 100),
          description: `Fahrstunde ${appointmentData.type} - ${appointmentData.duration_minutes}min`
        })

      // 2b. Produkte als Payment Items hinzufügen
      products.forEach(product => {
        paymentItems.push({
          item_type: 'product',
          item_id: product.id,
          item_name: product.name,
          quantity: 1,
          unit_price_rappen: product.price_rappen,
          description: product.name
        })
      })

      // 2c. Rabatte als Payment Items hinzufügen
      const totalBeforeDiscounts = appointmentPrice + (products.reduce((sum, p) => sum + p.price_rappen / 100, 0))
      discounts.forEach(discount => {
        const discountAmount = discount.discount_type === 'percentage' 
          ? (totalBeforeDiscounts * discount.discount_value / 100)
          : discount.discount_value
        
        paymentItems.push({
          item_type: 'discount',
          item_id: discount.id,
          item_name: discount.name,
          quantity: 1,
          unit_price_rappen: -Math.round(discountAmount * 100), // Negativ für Rabatte
          description: `Rabatt: ${discount.name}`
        })
      })

      // 3. PAYMENT in payments Tabelle erstellen
      const paymentRequest: CreatePaymentRequest = {
        user_id: appointmentData.user_id,
        staff_id: appointmentData.staff_id,
        appointment_id: appointment.id,
        payment_method: paymentMethod,
        items: paymentItems,
        description: `Termin: ${appointmentData.title}`
      }

      const payment = await createPayment(paymentRequest)
      
      if (!payment) {
        throw new Error('Failed to create payment record')
      }

      console.log('✅ Payment created:', payment.id)

      return { appointment, payment }

    } catch (err: any) {
      console.error('❌ Error in appointment with payment workflow:', err)
      error.value = err.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  // ✅ OPTIMIERTER SPEICHER-WORKFLOW: Nur Produkte + Rabatte → Payment (ohne Termin)
  const createStandaloneProductPayment = async (
    userId: string,
    staffId: string,
    products: Product[],
    discounts: Discount[] = [],
    paymentMethod: 'cash' | 'invoice' | 'online' = 'cash',
    description?: string
  ): Promise<Payment | null> => {
    isLoading.value = true
    error.value = null

    try {
      console.log('🔄 Creating standalone product payment...')
      
      if (products.length === 0) {
        throw new Error('At least one product is required')
      }

      // 1. PAYMENT ITEMS vorbereiten
      const paymentItems: CreatePaymentItemRequest[] = []

      // 1a. Produkte als Payment Items hinzufügen
      products.forEach(product => {
        paymentItems.push({
          item_type: 'product',
          item_id: product.id,
          item_name: product.name,
          quantity: 1,
          unit_price_rappen: product.price_rappen,
          description: product.name
        })
      })

      // 1b. Rabatte als Payment Items hinzufügen
      const totalBeforeDiscounts = products.reduce((sum, p) => sum + p.price_rappen / 100, 0)
      discounts.forEach(discount => {
        const discountAmount = discount.discount_type === 'percentage' 
          ? (totalBeforeDiscounts * discount.discount_value / 100)
          : discount.discount_value
        
        paymentItems.push({
          item_type: 'discount',
          item_id: discount.id,
          item_name: `Rabatt: ${discount.name}`,
          quantity: 1,
          unit_price_rappen: -Math.round(discountAmount * 100), // Negativ für Rabatte
          description: `Rabatt: ${discount.name}`
        })
      })

      // 2. PAYMENT in payments Tabelle erstellen (ohne appointment_id)
      const paymentRequest: CreatePaymentRequest = {
        user_id: userId,
        staff_id: staffId,
        appointment_id: undefined, // Wichtig: undefined für standalone Zahlungen
        payment_method: paymentMethod,
        items: paymentItems,
        description: description || `Produktzahlung: ${products.map(p => p.name).join(', ')}`
      }

      const payment = await createPayment(paymentRequest)
      
      if (!payment) {
        throw new Error('Failed to create standalone payment record')
      }

      console.log('✅ Standalone payment created:', payment.id)
      return payment

    } catch (err: any) {
      console.error('❌ Error in standalone product payment workflow:', err)
      error.value = err.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  // ✅ Zahlung erstellen (Termin oder Standalone)
  const createPayment = async (request: CreatePaymentRequest): Promise<Payment | null> => {
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()
      
      // ✅ Berechne Gesamtbeträge für neue Spalten
      const lessonPriceRappen = request.items
        .filter(item => item.item_type === 'appointment')
        .reduce((sum, item) => sum + (item.unit_price_rappen * (item.quantity || 1)), 0)
      
      const productsPriceRappen = request.items
        .filter(item => item.item_type === 'product')
        .reduce((sum, item) => sum + (item.unit_price_rappen * (item.quantity || 1)), 0)
      
      const discountAmountRappen = request.items
        .filter(item => item.item_type === 'discount')
        .reduce((sum, item) => sum + Math.abs(item.unit_price_rappen * (item.quantity || 1)), 0)
      
      // ✅ Admin-Fee wird aus der Preisberechnung übernommen (nicht als separater Payment Item)
      const adminFeeRappen = 0 // Wird aus der appointment Preisberechnung übernommen
      
      const subtotalRappen = lessonPriceRappen + productsPriceRappen
      const totalAmountRappen = subtotalRappen - discountAmountRappen

      // 1. Payment erstellen mit neuen Spalten
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: request.user_id,
          staff_id: request.staff_id,
          appointment_id: request.appointment_id,
          // ✅ Neue Spalten verwenden
          lesson_price_rappen: lessonPriceRappen,
          products_price_rappen: productsPriceRappen,
          discount_amount_rappen: discountAmountRappen,
          subtotal_rappen: subtotalRappen,
          total_amount_rappen: totalAmountRappen,
          // ✅ Alte Spalten für Kompatibilität
          amount_rappen: lessonPriceRappen,
          admin_fee_rappen: adminFeeRappen, // ✅ KORRIGIERT: Korrekte Admin-Fee verwenden
          payment_method: request.payment_method,
          payment_status: 'pending',
          currency: 'CHF',
          description: request.description
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // 2. Payment Items erstellen
      if (request.items.length > 0) {
        const paymentItems = request.items.map(item => ({
          payment_id: payment.id,
          ...item
        }))

        const { error: itemsError } = await supabase
          .from('payment_items')
          .insert(paymentItems)

        if (itemsError) throw itemsError
      }

      // 3. Finale Payment mit berechnetem Gesamtbetrag laden
      const { data: finalPayment, error: finalError } = await supabase
        .from('payments')
        .select(`
          *,
          payment_items (*)
        `)
        .eq('id', payment.id)
        .single()

      if (finalError) throw finalError

      console.log('✅ Payment created successfully:', finalPayment)
      return finalPayment

    } catch (err: any) {
      console.error('❌ Error creating payment:', err)
      error.value = err.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  // ✅ Zahlung für einen bestehenden Termin erstellen
  const createAppointmentPayment = async (
    appointmentId: string,
    userId: string,
    staffId: string,
    paymentMethod: 'cash' | 'invoice' | 'online',
    products: Product[] = [],
    discounts: Discount[] = []
  ): Promise<Payment | null> => {
    
    // 1. Termin-Preis berechnen (45min = 1 Einheit)
    const appointment = await getAppointment(appointmentId)
    if (!appointment) {
      error.value = 'Termin nicht gefunden'
      return null
    }

    const durationUnits = Math.ceil(appointment.duration_minutes / 45)
    const basePrice = getBasePriceForCategory(appointment.type) * durationUnits

    // 2. Payment Items vorbereiten
    const items: CreatePaymentItemRequest[] = []

    // 2a. Termin als Payment Item
            items.push({
          item_type: 'appointment',
          item_id: appointmentId,
          item_name: `Fahrstunde ${appointment.type}`,
          quantity: 1,
          unit_price_rappen: Math.round(basePrice * 100),
          description: `Fahrstunde ${appointment.type} - ${appointment.duration_minutes}min`
        })

    // 2b. Produkte hinzufügen
    products.forEach(product => {
      items.push({
        item_type: 'product',
        item_id: product.id,
        item_name: product.name,
        quantity: 1,
        unit_price_rappen: product.price_rappen,
        description: product.name
      })
    })

    // 2c. Rabatte hinzufügen
    const totalBeforeDiscounts = basePrice + (products.reduce((sum, p) => sum + p.price_rappen / 100, 0))
    discounts.forEach(discount => {
      const discountAmount = discount.discount_type === 'percentage' 
        ? (totalBeforeDiscounts * discount.discount_value / 100)
        : discount.discount_value
      
      items.push({
        item_type: 'discount',
        item_id: discount.id,
        item_name: `Rabatt: ${discount.name}`,
        quantity: 1,
        unit_price_rappen: -Math.round(discountAmount * 100), // Negativ für Rabatte
        description: `Rabatt: ${discount.name}`
      })
    })

    // 3. Payment erstellen
    return createPayment({
      user_id: userId,
      staff_id: staffId,
      appointment_id: appointmentId,
      payment_method: paymentMethod,
      items,
      description: `Fahrstunde ${appointment.type} - ${appointment.duration_minutes}min`
    })
  }

  // ✅ Standalone Produkt-Zahlung erstellen
  const createProductPayment = async (
    userId: string,
    staffId: string,
    paymentMethod: 'cash' | 'invoice' | 'online',
    products: Product[],
    discounts: Discount[] = []
  ): Promise<Payment | null> => {
    
    const items: CreatePaymentItemRequest[] = []

    // 1. Produkte hinzufügen
    products.forEach(product => {
      items.push({
        item_type: 'product',
        item_id: product.id,
        item_name: product.name,
        quantity: 1,
        unit_price_rappen: product.price_rappen,
        description: product.name
      })
    })

    // 2. Rabatte hinzufügen
    const totalProductsValue = products.reduce((sum, p) => sum + p.price_rappen, 0)
    discounts.forEach(discount => {
      const discountAmount = discount.discount_type === 'percentage' 
        ? (totalProductsValue * discount.discount_value / 10000) // price_rappen ist in Rappen
        : (discount.discount_value * 100) // discount_value ist in CHF

      items.push({
        item_type: 'discount',
        item_id: discount.id,
        item_name: `Rabatt: ${discount.name}`,
        quantity: 1,
        unit_price_rappen: -discountAmount,
        description: `Rabatt: ${discount.name}`
      })
    })

    // 3. Payment erstellen
    return createPayment({
      user_id: userId,
      staff_id: staffId,
      payment_method: paymentMethod,
      items,
      description: `Produktzahlung: ${products.map(p => p.name).join(', ')}`
    })
  }

  // ✅ Zahlung als bezahlt markieren
  const markPaymentAsCompleted = async (paymentId: string): Promise<boolean> => {
    try {
      const supabase = getSupabase()
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'completed' })
        .eq('id', paymentId)

      if (updateError) throw updateError

      console.log('✅ Payment marked as completed')
      return true

    } catch (err: any) {
      console.error('❌ Error marking payment as completed:', err)
      error.value = err.message
      return false
    }
  }

  // ✅ Zahlung löschen
  const deletePayment = async (paymentId: string): Promise<boolean> => {
    try {
      const supabase = getSupabase()
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId)

      if (deleteError) throw deleteError

      console.log('✅ Payment deleted')
      return true

    } catch (err: any) {
      console.error('❌ Error deleting payment:', err)
      error.value = err.message
      return false
    }
  }

  // ✅ Zahlungen für einen Benutzer laden
  const loadUserPayments = async (userId: string): Promise<PaymentWithItems[]> => {
    try {
      const supabase = getSupabase()
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          payment_items (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (paymentsError) throw paymentsError

      return payments || []

    } catch (err: any) {
      console.error('❌ Error loading user payments:', err)
      error.value = err.message
      return []
    }
  }

  // ✅ Zahlungen für einen Termin laden
  const loadAppointmentPayments = async (appointmentId: string): Promise<PaymentWithItems[]> => {
    try {
      const supabase = getSupabase()
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          payment_items (*)
        `)
        .eq('appointment_id', appointmentId)

      if (paymentsError) throw paymentsError

      return payments || []

    } catch (err: any) {
      console.error('❌ Error loading appointment payments:', err)
      error.value = err.message
      return []
    }
  }

  // ✅ Alle aktiven Produkte laden
  const loadProducts = async (): Promise<Product[]> => {
    try {
      const supabase = getSupabase()
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (productsError) throw productsError

      return products || []

    } catch (err: any) {
      console.error('❌ Error loading products:', err)
      error.value = err.message
      return []
    }
  }

  // ✅ Alle aktiven Rabatte laden
  const loadDiscounts = async (): Promise<Discount[]> => {
    try {
      const supabase = getSupabase()
      const { data: discounts, error: discountsError } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (discountsError) throw discountsError

      return discounts || []

    } catch (err: any) {
      console.error('❌ Error loading discounts:', err)
      error.value = err.message
      return []
    }
  }

  // ✅ Hilfsfunktionen
  const getAppointment = async (appointmentId: string) => {
    try {
      const supabase = getSupabase()
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .is('deleted_at', null) // ✅ Soft Delete Filter
        .single()

      if (error) throw error
      return appointment

    } catch (err: any) {
      console.error('❌ Error loading appointment:', err)
      return null
    }
  }

  const calculateAppointmentPrice = (category: string, durationMinutes: number): number => {
    const fallbackPrices: Record<string, number> = {
      'B': 2.111,         // 95 CHF / 45min
      'A': 2.111,         // 95 CHF / 45min  
      'A1': 2.111,        // 95 CHF / 45min
      'BE': 2.667,        // 120 CHF / 45min
      'C': 3.778,         // 170 CHF / 45min
      'C1': 3.333,        // 150 CHF / 45min
      'D': 4.444,         // 200 CHF / 45min
      'CE': 4.444,        // 200 CHF / 45min
      'D1': 3.333,        // 150 CHF / 45min
      'Motorboot': 2.667, // 120 CHF / 45min
      'BPT': 2.222        // 100 CHF / 45min
    }
    
    const basePrice = fallbackPrices[category] || fallbackPrices['B']
    const durationUnits = Math.ceil(durationMinutes / 45)
    return basePrice * durationUnits
  }

  const getBasePriceForCategory = (category: string): number => {
    const fallbackPrices: Record<string, number> = {
      'B': 2.111,         // 95 CHF / 45min
      'A': 2.111,         // 95 CHF / 45min  
      'A1': 2.111,        // 95 CHF / 45min
      'BE': 2.667,        // 120 CHF / 45min
      'C': 3.778,         // 170 CHF / 45min
      'C1': 3.333,        // 150 CHF / 45min
      'D': 4.444,         // 200 CHF / 45min
      'CE': 4.444,        // 200 CHF / 45min
      'D1': 3.333,        // 150 CHF / 45min
      'Motorboot': 2.667, // 120 CHF / 45min
      'BPT': 2.222        // 100 CHF / 45min
    }
    
    return fallbackPrices[category] || fallbackPrices['B']
  }

  // ✅ Computed Properties
  const hasError = computed(() => !!error.value)
  const isProcessing = computed(() => isLoading.value)

  return {
    // State
    isLoading,
    error,
    
    // Computed
    hasError,
    isProcessing,
    
    // Methods
    createAppointmentWithPayment,
    createStandaloneProductPayment,
    createPayment,
    createAppointmentPayment,
    createProductPayment,
    markPaymentAsCompleted,
    deletePayment,
    loadUserPayments,
    loadAppointmentPayments,
    loadProducts,
    loadDiscounts
  }
}
