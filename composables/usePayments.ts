// composables/usePayments.ts - Gemeinsame Payment Logic
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { toLocalTimeString } from '~/utils/dateUtils'
import type { Payment, Product, Discount, PaymentMethod } from '~/types/payment'
import { useDiscounts } from '~/composables/useDiscounts'

export const usePayments = () => {
  // ✅ RUNDUNGSFUNKTION: Preise auf nächsten Franken runden
  const roundToNearestFranken = (rappen: number): number => {
    const remainder = rappen % 100
    if (remainder === 0) return rappen
    if (remainder < 50) return rappen - remainder      // Abrunden bei < 50 Rappen
    else return rappen + (100 - remainder)             // Aufrunden bei >= 50 Rappen
  }

  const { validateDiscountCode, applyDiscount, loadDiscounts, loadDiscountsByCategory, availableDiscounts } = useDiscounts()
  
  // State
  const isLoading = ref(false)
  const isLoadingPrice = ref(false)
  const priceError = ref<string | null>(null)
  const isProcessing = ref(false)

  // Computed
  const hasPriceError = computed(() => !!priceError.value)

  // Methods

  // Create payment record in database with new structure
  const createPaymentRecord = async (data: Partial<Payment>): Promise<Payment> => {
    try {
      const response = await $fetch('/api/staff/create-payment', {
        method: 'POST',
        body: data
      }) as any

      if (!response || !response.data) {
        throw new Error('Invalid response from payment creation API')
      }
      return response.data
    } catch (error) {
      console.error('Error creating payment record:', error)
      throw error
    }
  }


  // Handle cash payment with new structure
  const processCashPayment = async (
    appointmentId: string,
    userId: string,
    staffId: string,
    price: any,
    products?: Product[],
    discounts?: Discount[]
  ) => {
    isProcessing.value = true

    try {
      // ✅ Berechne Produkte und Rabatte Gesamtbeträge
      const productsTotalRappen = products?.reduce((sum, product) => 
        sum + (product.price_rappen || 0), 0) || 0
      const discountsTotalRappen = discounts?.reduce((sum, discount) => 
        sum + (discount.discount_value || 0), 0) || 0
      const subtotalRappen = price.total_rappen + productsTotalRappen
      const finalTotalRappen = subtotalRappen - discountsTotalRappen

      // ✅ RUNDUNG: Alle Preise auf nächsten Franken runden
      const roundedLessonPriceRappen = roundToNearestFranken(price.total_rappen)
      const roundedProductsTotalRappen = roundToNearestFranken(productsTotalRappen)
      const roundedDiscountsTotalRappen = roundToNearestFranken(discountsTotalRappen)
      const roundedSubtotalRappen = roundToNearestFranken(subtotalRappen)
      const roundedFinalTotalRappen = roundToNearestFranken(finalTotalRappen)

      // Create payment record mit neuen Spalten
      const paymentData: any = {
        appointment_id: appointmentId,
        user_id: userId,
        staff_id: staffId,
        // ✅ Neue Spalten verwenden (mit gerundeten Preisen)
        lesson_price_rappen: price.base_price_rappen || roundedLessonPriceRappen,
        products_price_rappen: roundedProductsTotalRappen,
        discount_amount_rappen: roundedDiscountsTotalRappen,
        subtotal_rappen: (price.base_price_rappen || roundedLessonPriceRappen) + roundedProductsTotalRappen,
        total_amount_rappen: roundedFinalTotalRappen,
        // ✅ Alte Spalten für Kompatibilität (mit gerundeten Preisen)
        amount_rappen: price.base_price_rappen || roundedLessonPriceRappen,
        admin_fee_rappen: price.admin_fee_rappen || 0, // Korrekte Admin-Fee
        payment_method: 'cash',
        payment_status: 'completed',
        description: `Fahrlektion ${price.category_code} - ${price.duration_minutes} Min`,
        is_standalone: false,
        metadata: {
          category: price.category_code,
          duration: price.duration_minutes,
          processed_at: toLocalTimeString(new Date),
          price_breakdown: {
            lesson_price_rappen: roundedLessonPriceRappen,
            products_price_rappen: roundedProductsTotalRappen,
            discount_amount_rappen: roundedDiscountsTotalRappen,
            subtotal_rappen: roundedSubtotalRappen,
            total_amount_rappen: roundedFinalTotalRappen
          }
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

  // Handle invoice payment with new structure
  const processInvoicePayment = async (
    appointmentId: string,
    userId: string,
    staffId: string,
    price: any,
    invoiceData: Record<string, any>,
    products?: Product[],
    discounts?: Discount[]
  ) => {
    isProcessing.value = true

    try {
      // ✅ Berechne Produkte und Rabatte Gesamtbeträge
      const productsTotalRappen = products?.reduce((sum, product) => 
        sum + (product.price_rappen || 0), 0) || 0
      const discountsTotalRappen = discounts?.reduce((sum, discount) => 
        sum + (discount.discount_value || 0), 0) || 0
      const subtotalRappen = price.total_rappen + productsTotalRappen
      const finalTotalRappen = subtotalRappen - discountsTotalRappen

      // ✅ RUNDUNG: Alle Preise auf nächsten Franken runden
      const roundedLessonPriceRappen = roundToNearestFranken(price.total_rappen)
      const roundedProductsTotalRappen = roundToNearestFranken(productsTotalRappen)
      const roundedDiscountsTotalRappen = roundToNearestFranken(discountsTotalRappen)
      const roundedSubtotalRappen = roundToNearestFranken(subtotalRappen)
      const roundedFinalTotalRappen = roundToNearestFranken(finalTotalRappen)

      // Create payment record mit neuen Spalten
      const paymentData: any = {
        appointment_id: appointmentId,
        user_id: userId,
        staff_id: staffId,
        // ✅ Neue Spalten verwenden (mit gerundeten Preisen)
        lesson_price_rappen: roundedLessonPriceRappen,
        products_price_rappen: roundedProductsTotalRappen,
        discount_amount_rappen: roundedDiscountsTotalRappen,
        subtotal_rappen: roundedSubtotalRappen,
        total_amount_rappen: roundedFinalTotalRappen,
        // ✅ Alte Spalten für Kompatibilität (mit gerundeten Preisen)
        amount_rappen: roundedLessonPriceRappen,
        admin_fee_rappen: 0, // Wird aus price.total_rappen berechnet
        payment_method: 'invoice',
        payment_status: 'pending',
        description: `Fahrlektion ${price.category_code} - ${price.duration_minutes} Min`,
        is_standalone: false,
        metadata: {
          category: price.category_code,
          duration: price.duration_minutes,
          invoice_data: invoiceData,
          created_at: toLocalTimeString(new Date),
          price_breakdown: {
            lesson_price_rappen: roundedLessonPriceRappen,
            products_price_rappen: roundedProductsTotalRappen,
            discount_amount_rappen: roundedDiscountsTotalRappen,
            subtotal_rappen: roundedSubtotalRappen,
            total_amount_rappen: roundedFinalTotalRappen
          }
        }
      }

      const payment = await createPaymentRecord(paymentData)

      return payment
    } finally {
      isProcessing.value = false
    }
  }

  // Handle Wallee online payment
  const processWalleePayment = async (
    appointmentId: string,
    userId: string,
    staffId: string,
    price: any,
    products?: Product[],
    discounts?: Discount[]
  ) => {
    isProcessing.value = true

    try {
      // ✅ Berechne Produkte und Rabatte Gesamtbeträge
      const productsTotalRappen = products?.reduce((sum, product) => 
        sum + (product.price_rappen || 0), 0) || 0
      const discountsTotalRappen = discounts?.reduce((sum, discount) => 
        sum + (discount.discount_value || 0), 0) || 0
      const subtotalRappen = price.total_rappen + productsTotalRappen
      const finalTotalRappen = subtotalRappen - discountsTotalRappen

      // ✅ RUNDUNG: Alle Preise auf nächsten Franken runden
      const roundedLessonPriceRappen = roundToNearestFranken(price.total_rappen)
      const roundedProductsTotalRappen = roundToNearestFranken(productsTotalRappen)
      const roundedDiscountsTotalRappen = roundToNearestFranken(discountsTotalRappen)
      const roundedSubtotalRappen = roundToNearestFranken(subtotalRappen)
      const roundedFinalTotalRappen = roundToNearestFranken(finalTotalRappen)

      // Create payment record
      const paymentData: any = {
        appointment_id: appointmentId,
        user_id: userId,
        staff_id: staffId,
        lesson_price_rappen: roundedLessonPriceRappen,
        products_price_rappen: roundedProductsTotalRappen,
        discount_amount_rappen: roundedDiscountsTotalRappen,
        subtotal_rappen: roundedSubtotalRappen,
        total_amount_rappen: roundedFinalTotalRappen,
        // amount_rappen: roundedLessonPriceRappen, // Spalte existiert nicht in der Tabelle
        admin_fee_rappen: 0,
        payment_method: 'wallee',
        payment_status: 'pending',
        currency: 'CHF',
        description: `Fahrstunde ${price.category_code} (${price.duration_minutes} Min)`,
        is_standalone: false,
        metadata: {
          products: products || [],
          discounts: discounts || [],
          category_code: price.category_code,
          duration_minutes: price.duration_minutes
        }
      }

      // Create payment record
      const payment = await createPaymentRecord(paymentData)

      // Create Wallee transaction
      const walleeResponse = await $fetch('/api/wallee/create-transaction', {
        method: 'POST',
        body: {
          orderId: payment.id,
          amount: roundedFinalTotalRappen / 100, // Convert to CHF
          currency: 'CHF',
          customerEmail: '', // Will be filled in shop
          customerName: '', // Will be filled in shop
          description: paymentData.description,
          successUrl: `${window.location.origin}/payment/success?transaction_id=${payment.id}`,
          failedUrl: `${window.location.origin}/payment/failed?transaction_id=${payment.id}`
        }
      })

      if (!walleeResponse.success) {
        throw new Error(walleeResponse.error || 'Wallee transaction failed')
      }

      // Update payment with Wallee transaction ID
      await $fetch('/api/payments/update-wallee-id', {
        method: 'POST',
        body: {
          payment_id: payment.id,
          wallee_transaction_id: walleeResponse.transactionId
        }
      })

      // Return payment with Wallee URL
      return {
        ...payment,
        payment_url: walleeResponse.paymentUrl
      }

    } finally {
      isProcessing.value = false
    }
  }

  // Create standalone Wallee payment (without appointment)
  const createStandaloneWalleePayment = async (
    userId: string | null,
    staffId: string | null,
    products: Product[],
    discounts: Discount[],
    customerEmail: string,
    customerName: string
  ): Promise<Payment & { payment_url: string }> => {
    isProcessing.value = true

    try {
      // ✅ Get tenant_id from secure API instead of direct queries
      let tenantId: string | null = null
      let actualUserId: string | null = userId
      
      if (!userId) {
        // Try to get from current auth user via API
        const userInfo = await $fetch('/api/users/current', {
          method: 'GET'
        }) as any
        
        if (userInfo && userInfo.data) {
          tenantId = userInfo.data.tenant_id
          actualUserId = userInfo.data.id
        }
      } else {
        // Get tenant info for provided userId
        const userInfo = await $fetch('/api/users/get-tenant', {
          method: 'GET',
          query: { user_id: userId }
        }) as any
        
        if (userInfo && userInfo.data) {
          tenantId = userInfo.data.tenant_id
          actualUserId = userInfo.data.id
        }
      }
      
      logger.debug('💳 Creating payment with:', { userId: actualUserId, tenantId })
      
      // Calculate total
      const subtotal = products.reduce((sum, product) => 
        sum + (product.price_rappen), 0
      )
      
      const totalDiscount = discounts.reduce((sum, discount) => 
        sum + (discount.discount_value || 0), 0
      )
      
      const total = subtotal - totalDiscount

      // ✅ RUNDUNG: Alle Preise auf nächsten Franken runden
      const roundedSubtotalRappen = roundToNearestFranken(subtotal)
      const roundedTotalDiscountRappen = roundToNearestFranken(totalDiscount)
      const roundedTotalRappen = roundToNearestFranken(total)

      // Create payment record
      const paymentData: Partial<Payment> = {
        user_id: userId,
        staff_id: staffId,
        appointment_id: null,
        lesson_price_rappen: 0,
        products_price_rappen: roundedSubtotalRappen,
        discount_amount_rappen: roundedTotalDiscountRappen,
        subtotal_rappen: roundedSubtotalRappen,
        total_amount_rappen: roundedTotalRappen,
        amount_rappen: 0,
        admin_fee_rappen: 0,
        payment_method: 'wallee',
        payment_status: 'pending',
        currency: 'CHF',
        description: 'Produktkauf',
        is_standalone: true,
        metadata: {
          products_count: products.length,
          discounts_count: discounts.length,
          price_breakdown: {
            lesson_price_rappen: 0,
            products_price_rappen: roundedSubtotalRappen,
            discount_amount_rappen: roundedTotalDiscountRappen,
            subtotal_rappen: roundedSubtotalRappen,
            total_amount_rappen: roundedTotalRappen
          },
          products: products,
          discounts: discounts,
          customer_email: customerEmail,
          customer_name: customerName
        }
      }

      // Create payment record via API instead of direct Supabase
      const paymentResponse = await $fetch('/api/staff/create-payment', {
        method: 'POST',
        body: {
          user_id: actualUserId || null,
          staff_id: staffId || null,
          appointment_id: null,
          lesson_price_rappen: 0,
          products_price_rappen: roundedSubtotalRappen,
          discount_amount_rappen: roundedTotalDiscountRappen,
          total_amount_rappen: roundedTotalRappen,
          admin_fee_rappen: 0,
          payment_method: 'wallee',
          payment_status: 'pending',
          currency: 'CHF',
          description: 'Produktkauf',
          metadata: paymentData.metadata,
          tenant_id: tenantId
        }
      }) as any

      if (!paymentResponse || !paymentResponse.data) {
        throw new Error('❌ Error creating payment record')
      }

      const payment = paymentResponse.data
      logger.debug('✅ Payment record created:', payment.id)

      // Create Wallee transaction
      const walleeResponse = await $fetch('/api/wallee/create-transaction', {
        method: 'POST',
        body: {
          orderId: payment.id,
          amount: roundedTotalRappen / 100, // Convert to CHF
          currency: 'CHF',
          customerEmail: customerEmail,
          customerName: customerName,
          description: 'Produktkauf',
          userId: actualUserId, // ✅ Pass userId for Wallee config lookup
          tenantId: tenantId, // ✅ Pass tenantId for Wallee config lookup
          successUrl: `${window.location.origin}/payment/success?transaction_id=${payment.id}`,
          failedUrl: `${window.location.origin}/payment/failed?transaction_id=${payment.id}`
        }
      })

      if (!walleeResponse.success) {
        throw new Error(walleeResponse.error || 'Wallee transaction failed')
      }

      // Update payment with Wallee transaction ID via API
      await $fetch('/api/payments/update-wallee-id', {
        method: 'POST',
        body: {
          payment_id: payment.id,
          wallee_transaction_id: walleeResponse.transactionId
        }
      })

      // Return payment with Wallee URL
      return {
        ...payment,
        payment_url: walleeResponse.paymentUrl
      }

    } finally {
      isProcessing.value = false
    }
  }

  // Create standalone payment (without appointment)
  const createStandalonePayment = async (
    userId: string,
    staffId: string,
    products: Product[],
    discounts: Discount[],
    paymentMethod: string
  ): Promise<Payment> => {
    isProcessing.value = true

    try {
      // Calculate total
      const subtotal = products.reduce((sum, product) => 
        sum + (product.price_rappen), 0
      )
      
      const totalDiscount = discounts.reduce((sum, discount) => 
        sum + (discount.discount_value || 0), 0
      )
      
      const total = subtotal - totalDiscount

      // ✅ RUNDUNG: Alle Preise auf nächsten Franken runden
      const roundedSubtotalRappen = roundToNearestFranken(subtotal)
      const roundedTotalDiscountRappen = roundToNearestFranken(totalDiscount)
      const roundedTotalRappen = roundToNearestFranken(total)

      // Create payment record mit neuen Spalten
      const paymentData: Partial<Payment> = {
        user_id: userId,
        staff_id: staffId,
        appointment_id: null,
        // ✅ Neue Spalten verwenden (mit gerundeten Preisen)
        lesson_price_rappen: 0, // Keine Fahrstunde
        products_price_rappen: roundedSubtotalRappen,
        discount_amount_rappen: roundedTotalDiscountRappen,
        subtotal_rappen: roundedSubtotalRappen,
        total_amount_rappen: roundedTotalRappen,
        // ✅ Alte Spalten für Kompatibilität (mit gerundeten Preisen)
        amount_rappen: 0, // Keine Fahrstunde
        admin_fee_rappen: 0, // Keine Admin-Gebühr
        payment_method: paymentMethod as PaymentMethod,
        payment_status: 'completed',
        description: 'Produktkauf',
        is_standalone: true,
        metadata: {
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price_rappen: p.price_rappen,
            category: p.category,
            quantity: 1,
            is_active: p.is_active,
            created_at: p.created_at,
            updated_at: p.updated_at,
            display_order: p.display_order,
            is_voucher: p.is_voucher || false,
            is_credit_product: p.is_credit_product || false,
            credit_amount_rappen: p.credit_amount_rappen || 0,
            min_amount_rappen: p.min_amount_rappen || 0,
            max_amount_rappen: p.max_amount_rappen || 0,
            allow_custom_amount: p.allow_custom_amount || false,
            unit_price_rappen: p.price_rappen,
            total_price_rappen: p.price_rappen
          })),
          products_count: products.length,
          discounts_count: discounts.length,
          price_breakdown: {
            lesson_price_rappen: 0,
            products_price_rappen: roundedSubtotalRappen,
            discount_amount_rappen: roundedTotalDiscountRappen,
            subtotal_rappen: roundedSubtotalRappen,
            total_amount_rappen: roundedTotalRappen
          }
        }
      }

      const payment = await createPaymentRecord(paymentData)

      return payment
    } finally {
      isProcessing.value = false
    }
  }

  // Get payment details with items
  const getPaymentDetails = async (paymentId: string) => {
    try {
      const response = await $fetch('/api/payments/get-details', {
        method: 'GET',
        query: { payment_id: paymentId }
      }) as any

      if (!response || !response.data) {
        throw new Error('Invalid response from payment details API')
      }
      return response.data
    } catch (error) {
      console.error('Error getting payment details:', error)
      throw error
    }
  }

  // Update appointment payment status
  const updateAppointmentPaymentStatus = async (
    appointmentId: string,
    isPaid: boolean,
    paymentMethod?: string
  ) => {
    try {
      await $fetch('/api/appointments/update-payment-status', {
        method: 'POST',
        body: {
          appointment_id: appointmentId,
          is_paid: isPaid,
          payment_method: paymentMethod
        }
      })
    } catch (error) {
      console.error('Error updating appointment payment status:', error)
      throw error
    }
  }

  // Get available discounts using the new discounts composable
  const getAvailableDiscounts = async (category?: string, amount?: number) => {
    try {
      if (category && category !== 'all') {
        return await loadDiscountsByCategory(category)
      } else {
        await loadDiscounts()
        return availableDiscounts.value.filter(d => 
          !amount || d.min_amount_rappen <= amount
        )
      }
    } catch (error) {
      console.error('Error getting available discounts:', error)
      return []
    }
  }

  // Get products
  const getProducts = async (category?: string) => {
    try {
      const response = await $fetch('/api/products/list', {
        method: 'GET',
        query: category ? { category } : {}
      }) as any

      if (!response || !Array.isArray(response.data)) {
        throw new Error('Invalid response from products API')
      }
      return response.data
    } catch (error) {
      console.error('Error getting products:', error)
      return []
    }
  }

  return {
    // State
    isLoading: computed(() => isLoading.value),
    isLoadingPrice: computed(() => isLoadingPrice.value),
    isProcessing: computed(() => isProcessing.value),
    priceError: computed(() => priceError.value),
    hasPriceError,

    // Methods
    createPaymentRecord,
    processCashPayment,
    processInvoicePayment,
    processWalleePayment,
    createStandaloneWalleePayment,
    createStandalonePayment,
    getPaymentDetails,
    updateAppointmentPaymentStatus,
    getAvailableDiscounts,
    getProducts
  }
}