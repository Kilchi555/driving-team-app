// composables/usePaymentMethods.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface PaymentMethod {
  value: string
  label: string
  icon: string
  description: string
  color: string
}

interface PaymentCalculation {
  basePrice: number
  adminFee: number
  discountAmount: number
  totalAmount: number
  pricePerMinute: number
}

export const usePaymentMethods = () => {
  const supabase = getSupabase()
  
  // State
  const selectedPaymentMethod = ref<string>('cash')
  const isProcessingPayment = ref(false)
  const paymentError = ref<string>('')
  const paymentSuccess = ref<any>(null)

  // Available Payment Methods
  const paymentMethodOptions = computed((): PaymentMethod[] => [
    {
      value: 'cash',
      label: 'Bar beim Fahrlehrer',
      icon: 'i-heroicons-banknotes',
      description: 'Zahlung vor Ort beim Fahrlehrer',
      color: 'yellow'
    },
    {
      value: 'invoice',
      label: 'Rechnung',
      icon: 'i-heroicons-document-text',
      description: 'Rechnung wird erstellt und versendet',
      color: 'blue'
    },
    {
      value: 'online',
      label: 'Online bezahlen',
      icon: 'i-heroicons-credit-card',
      description: 'Sofortige Zahlung mit Kreditkarte/Twint',
      color: 'green'
    }
  ])

  // Get payment method by value
  const getPaymentMethod = (value: string): PaymentMethod | undefined => {
    return paymentMethodOptions.value.find(method => method.value === value)
  }

  // Load student's preferred payment method
  const loadStudentPaymentPreference = async (studentId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('preferred_payment_method')
        .eq('id', studentId)
        .maybeSingle()

      if (error) throw error
      
      const preference = data?.preferred_payment_method || 'cash'
      selectedPaymentMethod.value = preference
      
      console.log('💳 Loaded payment preference:', preference)
      return preference

    } catch (err) {
      console.error('❌ Error loading payment preference:', err)
      selectedPaymentMethod.value = 'cash'
      return 'cash'
    }
  }

  // Save payment method preference to student profile
  const saveStudentPaymentPreference = async (studentId: string, paymentMethod: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ preferred_payment_method: paymentMethod })
        .eq('id', studentId)

      if (error) throw error
      
      console.log('✅ Payment preference saved:', paymentMethod)
      
    } catch (err) {
      console.error('❌ Error saving payment preference:', err)
      // Non-critical error - don't throw
    }
  }

  // Select payment method and save preference
  const selectPaymentMethod = async (method: string, studentId?: string) => {
    selectedPaymentMethod.value = method
    
    // Save to student profile if studentId provided
    if (studentId) {
      await saveStudentPaymentPreference(studentId, method)
    }
    
    console.log('💳 Payment method selected:', method)
  }

  // Calculate price breakdown
  const calculatePaymentBreakdown = (
    category: string,
    duration: number,
    appointmentNumber: number,
    discount?: { amount: number, type: 'fixed' | 'percentage', reason?: string }
  ): PaymentCalculation => {
    
    // Base prices from project data
    const categoryPricing: Record<string, number> = {
      'A': 95, 'A1': 95, 'A35kW': 95, 'B': 95,
      'BE': 120, 'C1': 150, 'D1': 150, 'C': 170,
      'CE': 200, 'D': 200, 'BPT': 100, 'Motorboot': 95
    }

    // Admin fees - only from 2nd appointment
    const adminFees: Record<string, number> = {
      'B': 120, 'A1': 0, 'A35kW': 0, 'A': 0, 'BE': 120,
      'C1': 200, 'D1': 200, 'C': 200, 'CE': 250, 'D': 300,
      'Motorboot': 120, 'BPT': 120
    }

    const basePriceFor45Min = categoryPricing[category] || 95
    const basePrice = (basePriceFor45Min / 45) * duration
    const pricePerMinute = basePriceFor45Min / 45
    
    const adminFee = appointmentNumber > 1 ? (adminFees[category] || 0) : 0
    
    let discountAmount = 0
    if (discount && discount.amount > 0) {
      if (discount.type === 'percentage') {
        discountAmount = basePrice * (discount.amount / 100)
      } else {
        discountAmount = discount.amount
      }
    }
    
    const totalAmount = Math.max(0, basePrice + adminFee - discountAmount)
    
    return {
      basePrice,
      adminFee,
      discountAmount,
      totalAmount,
      pricePerMinute
    }
  }

  // Create pending payment record for admin dashboard
  const createPendingPaymentRecord = async (appointmentData: {
    appointmentId: string
    userId: string
    staffId: string
    category: string
    duration: number
    appointmentNumber: number
    paymentMethod: string
    calculation: PaymentCalculation
  }) => {
    try {
      const paymentRecord = {
        appointment_id: appointmentData.appointmentId,
        user_id: appointmentData.userId,
        staff_id: appointmentData.staffId,
        amount_rappen: Math.round(appointmentData.calculation.basePrice * 100),
        admin_fee_rappen: Math.round(appointmentData.calculation.adminFee * 100),
        total_amount_rappen: Math.round(appointmentData.calculation.totalAmount * 100),
        payment_method: appointmentData.paymentMethod,
        payment_status: 'pending',
        description: `Fahrstunde ${appointmentData.category} - ${appointmentData.duration} Min`,
        metadata: {
          category: appointmentData.category,
          duration: appointmentData.duration,
          appointment_number: appointmentData.appointmentNumber,
          price_breakdown: appointmentData.calculation,
          created_at: new Date().toISOString()
        }
      }

      const { data, error } = await supabase
        .from('payments')
        .insert(paymentRecord)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Pending payment record created:', data.id)
      return data

    } catch (err) {
      console.error('❌ Error creating pending payment record:', err)
      throw err
    }
  }

  // Process cash payment
  const processCashPayment = async (appointmentData: any) => {
    isProcessingPayment.value = true
    paymentError.value = ''
    
    try {
      // Create pending payment record
      const paymentRecord = await createPendingPaymentRecord({
        ...appointmentData,
        paymentMethod: 'cash'
      })

      // Update appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          payment_method: 'cash',
          payment_status: 'pending',
          is_paid: false
        })
        .eq('id', appointmentData.appointmentId)

      if (error) throw error

      paymentSuccess.value = {
        type: 'cash',
        message: 'Barzahlung erfasst - Zahlung erfolgt beim Fahrlehrer',
        paymentId: paymentRecord.id
      }

      return paymentRecord

    } catch (err: any) {
      paymentError.value = err.message
      throw err
    } finally {
      isProcessingPayment.value = false
    }
  }

  // Process invoice payment
  const processInvoicePayment = async (appointmentData: any) => {
    isProcessingPayment.value = true
    paymentError.value = ''
    
    try {
      // Create pending payment record
      const paymentRecord = await createPendingPaymentRecord({
        ...appointmentData,
        paymentMethod: 'invoice'
      })

      // Update appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          payment_method: 'invoice',
          payment_status: 'pending',
          is_paid: false
        })
        .eq('id', appointmentData.appointmentId)

      if (error) throw error

      paymentSuccess.value = {
        type: 'invoice',
        message: 'Rechnung wird erstellt und per E-Mail versendet',
        paymentId: paymentRecord.id
      }

      return paymentRecord

    } catch (err: any) {
      paymentError.value = err.message
      throw err
    } finally {
      isProcessingPayment.value = false
    }
  }

  // Process online payment (requires appointment to be saved first)
  const processOnlinePayment = async (appointmentData: any) => {
    isProcessingPayment.value = true
    paymentError.value = ''
    
    try {
      if (!appointmentData.appointmentId || appointmentData.appointmentId.startsWith('temp_')) {
        throw new Error('Termin muss zuerst gespeichert werden für Online-Zahlung')
      }

      // Create pending payment record
      const paymentRecord = await createPendingPaymentRecord({
        ...appointmentData,
        paymentMethod: 'online'
      })

      // Update appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          payment_method: 'online',
          payment_status: 'pending',
          is_paid: false
        })
        .eq('id', appointmentData.appointmentId)

      if (error) throw error

      // Return data for Wallee integration
      return {
        paymentRecord,
        appointmentId: appointmentData.appointmentId,
        amount: appointmentData.calculation.totalAmount,
        needsWalleeRedirect: true
      }

    } catch (err: any) {
      paymentError.value = err.message
      throw err
    } finally {
      isProcessingPayment.value = false
    }
  }

  // Mark payment as completed (called after successful online payment)
  const markPaymentCompleted = async (appointmentId: string, transactionData?: any) => {
    try {
      // Update appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          payment_status: 'completed',
          is_paid: true
        })
        .eq('id', appointmentId)

      if (appointmentError) throw appointmentError

      // Update payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          payment_status: 'completed',
          paid_at: new Date().toISOString(),
          wallee_transaction_id: transactionData?.transactionId || null,
          metadata: {
            ...transactionData,
            completed_at: new Date().toISOString()
          }
        })
        .eq('appointment_id', appointmentId)

      if (paymentError) throw paymentError

      paymentSuccess.value = {
        type: 'online',
        message: 'Online-Zahlung erfolgreich abgeschlossen',
        transactionId: transactionData?.transactionId
      }

      console.log('✅ Payment marked as completed:', appointmentId)

    } catch (err) {
      console.error('❌ Error marking payment completed:', err)
      throw err
    }
  }

  // Get pending payments for admin dashboard
  const getPendingPayments = async (staffId?: string) => {
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          appointments (
            title,
            start_time,
            end_time,
            type
          ),
          users!payments_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false })

      if (staffId) {
        query = query.eq('staff_id', staffId)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []

    } catch (err) {
      console.error('❌ Error loading pending payments:', err)
      return []
    }
  }

  // Clear state
  const clearPaymentState = () => {
    paymentError.value = ''
    paymentSuccess.value = null
    isProcessingPayment.value = false
  }

  return {
    // State
    selectedPaymentMethod,
    isProcessingPayment: computed(() => isProcessingPayment.value),
    paymentError: computed(() => paymentError.value),
    paymentSuccess: computed(() => paymentSuccess.value),
    
    // Options
    paymentMethodOptions,
    getPaymentMethod,
    
    // Student Preferences
    loadStudentPaymentPreference,
    saveStudentPaymentPreference,
    selectPaymentMethod,
    
    // Calculations
    calculatePaymentBreakdown,
    
    // Payment Processing
    processCashPayment,
    processInvoicePayment,
    processOnlinePayment,
    markPaymentCompleted,
    
    // Admin
    getPendingPayments,
    createPendingPaymentRecord,
    
    // Utils
    clearPaymentState
  }
}