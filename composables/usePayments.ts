// composables/usePayments.ts - Gemeinsame Payment Logic
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface CalculatedPrice {
  base_price_rappen: number
  admin_fee_rappen: number
  total_rappen: number
  base_price_chf: string
  admin_fee_chf: string
  total_chf: string
  category_code: string
  duration_minutes: number
}

interface PaymentMethod {
  method_code: string
  display_name: string
  description: string
  icon_name: string
  is_active: boolean
  is_online: boolean
  display_order: number
}

interface PaymentData {
  appointment_id: string
  user_id: string
  staff_id?: string
  amount_rappen: number
  admin_fee_rappen: number
  total_amount_rappen: number
  payment_method: string
  payment_status: string
  description: string
  metadata: Record<string, any>
}

export const usePayments = () => {
  const supabase = getSupabase()
  
  // State
  const isLoadingPrice = ref(false)
  const isProcessing = ref(false)
  const calculatedPrice = ref<CalculatedPrice | null>(null)
  const priceError = ref<string>('')

  // Payment Methods (could be loaded from database)
  const availablePaymentMethods = ref<PaymentMethod[]>([
    {
      method_code: 'wallee',
      display_name: 'Online Zahlung',
      description: 'Kreditkarte, Twint, etc.',
      icon_name: 'credit-card',
      is_active: true,
      is_online: true,
      display_order: 1
    },
    {
      method_code: 'cash',
      display_name: 'Bar',
      description: 'Zahlung beim Fahrlehrer',
      icon_name: 'cash',
      is_active: true,
      is_online: false,
      display_order: 2
    },
    {
      method_code: 'invoice',
      display_name: 'Rechnung',
      description: 'Firmenrechnung',
      icon_name: 'document',
      is_active: true,
      is_online: false,
      display_order: 3
    }
  ])

  // Category-specific pricing (from your project data)
  const categoryPricing: Record<string, { base: number, admin: number }> = {
    'B': { base: 95, admin: 120 },
    'A1': { base: 95, admin: 0 },
    'A35kW': { base: 95, admin: 0 },
    'A': { base: 95, admin: 0 },
    'BE': { base: 120, admin: 120 },
    'C1': { base: 150, admin: 200 },
    'D1': { base: 150, admin: 200 },
    'C': { base: 170, admin: 200 },
    'CE': { base: 200, admin: 250 },
    'D': { base: 200, admin: 300 },
    'Motorboot': { base: 95, admin: 120 },
    'BPT': { base: 100, admin: 120 }
  }

  // Get appointment count for a user
  const getAppointmentCount = async (userId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['completed', 'confirmed'])

      if (error) throw error
      return (count || 0) + 1
    } catch (error) {
      console.error('Error getting appointment count:', error)
      return 1
    }
  }

  // Calculate price based on category, duration, and appointment count
  const calculatePrice = async (
    category: string, 
    duration: number, 
    userId?: string
  ): Promise<CalculatedPrice> => {
    isLoadingPrice.value = true
    priceError.value = ''

    try {
      // Get appointment count if userId provided
      const appointmentCount = userId ? await getAppointmentCount(userId) : 1
      
      // Get category pricing
      const pricing = categoryPricing[category] || categoryPricing['B']
      
      // Calculate base price (per 45min, scaled to duration)
      const basePriceChf = (pricing.base / 45) * duration
      const basePriceRappen = Math.round(basePriceChf * 100)
      
      // Admin fee only from 2nd appointment (except for A1/A35kW/A)
      const adminFeeChf = (appointmentCount > 1 && pricing.admin > 0) ? pricing.admin : 0
      const adminFeeRappen = adminFeeChf * 100
      
      // Total
      const totalRappen = basePriceRappen + adminFeeRappen
      const totalChf = totalRappen / 100

      const result: CalculatedPrice = {
        base_price_rappen: basePriceRappen,
        admin_fee_rappen: adminFeeRappen,
        total_rappen: totalRappen,
        base_price_chf: basePriceChf.toFixed(2),
        admin_fee_chf: adminFeeChf.toFixed(2),
        total_chf: totalChf.toFixed(2),
        category_code: category,
        duration_minutes: duration
      }

      calculatedPrice.value = result
      return result

    } catch (error: any) {
      priceError.value = error.message || 'Fehler bei der Preisberechnung'
      throw error
    } finally {
      isLoadingPrice.value = false
    }
  }

  // Create payment record in database
  const createPaymentRecord = async (data: Partial<PaymentData>): Promise<any> => {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return payment
    } catch (error) {
      console.error('Error creating payment record:', error)
      throw error
    }
  }

  // Handle cash payment
  const processCashPayment = async (
    appointmentId: string,
    userId: string,
    staffId: string,
    price: CalculatedPrice
  ) => {
    isProcessing.value = true

    try {
      const paymentData: Partial<PaymentData> = {
        appointment_id: appointmentId,
        user_id: userId,
        staff_id: staffId,
        amount_rappen: price.base_price_rappen,
        admin_fee_rappen: price.admin_fee_rappen,
        total_amount_rappen: price.total_rappen,
        payment_method: 'cash',
        payment_status: 'completed', // Cash is immediately completed
        description: `Fahrlektion ${price.category_code} - ${price.duration_minutes} Min`,
        metadata: {
          category: price.category_code,
          duration: price.duration_minutes,
          processed_at: new Date().toISOString()
        }
      }

      const payment = await createPaymentRecord(paymentData)

      // Update appointment as paid
      await updateAppointmentPaymentStatus(appointmentId, true, 'cash')

      return payment
    } finally {
      isProcessing.value = false
    }
  }

  // Handle invoice payment
  const processInvoicePayment = async (
    appointmentId: string,
    userId: string,
    staffId: string,
    price: CalculatedPrice,
    invoiceData: Record<string, any>
  ) => {
    isProcessing.value = true

    try {
      const paymentData: Partial<PaymentData> = {
        appointment_id: appointmentId,
        user_id: userId,
        staff_id: staffId,
        amount_rappen: price.base_price_rappen,
        admin_fee_rappen: price.admin_fee_rappen,
        total_amount_rappen: price.total_rappen,
        payment_method: 'invoice',
        payment_status: 'pending', // Invoice starts as pending
        description: `Fahrlektion ${price.category_code} - ${price.duration_minutes} Min`,
        metadata: {
          category: price.category_code,
          duration: price.duration_minutes,
          invoice_data: invoiceData,
          created_at: new Date().toISOString()
        }
      }

      const payment = await createPaymentRecord(paymentData)

      // Don't mark appointment as paid yet (wait for invoice payment)
      
      return payment
    } finally {
      isProcessing.value = false
    }
  }

  // Update appointment payment status
  const updateAppointmentPaymentStatus = async (
    appointmentId: string,
    isPaid: boolean,
    paymentMethod?: string
  ) => {
    try {
      const updateData: any = { is_paid: isPaid }
      
      if (paymentMethod) {
        updateData.payment_method = paymentMethod
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating appointment payment status:', error)
      throw error
    }
  }

  // Get payment history for appointment
  const getPaymentHistory = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting payment history:', error)
      return []
    }
  }

  // Get payment method icon class
  const getPaymentMethodIconClass = (methodCode: string): string => {
    const classes: Record<string, string> = {
      wallee: 'bg-blue-100 text-blue-600',
      cash: 'bg-yellow-100 text-yellow-600',
      invoice: 'bg-gray-100 text-gray-600',
      card: 'bg-purple-100 text-purple-600',
      twint: 'bg-blue-100 text-blue-600'
    }
    return classes[methodCode] || 'bg-gray-100 text-gray-600'
  }

  // Get payment button text
  const getPaymentButtonText = (methodCode: string): string => {
    const texts: Record<string, string> = {
      wallee: 'Online bezahlen',
      cash: 'Bar bezahlen',
      invoice: 'Rechnung erstellen',
      card: 'Mit Karte bezahlen',
      twint: 'Mit Twint bezahlen'
    }
    return texts[methodCode] || 'Bezahlen'
  }

  return {
    // State
    isLoadingPrice: computed(() => isLoadingPrice.value),
    isProcessing: computed(() => isProcessing.value),
    calculatedPrice: computed(() => calculatedPrice.value),
    priceError: computed(() => priceError.value),
    availablePaymentMethods: computed(() => availablePaymentMethods.value),

    // Methods
    calculatePrice,
    getAppointmentCount,
    createPaymentRecord,
    processCashPayment,
    processInvoicePayment,
    updateAppointmentPaymentStatus,
    getPaymentHistory,

    // Utilities
    getPaymentMethodIconClass,
    getPaymentButtonText,

    // Reset
    clearErrors: () => {
      priceError.value = ''
    }
  }
}