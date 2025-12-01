// composables/usePayments.ts - Gemeinsame Payment Logic
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'
import type { Payment, Product, Discount, PaymentMethod } from '~/types/payment'
import type { PaymentItem } from '~/types/payment'
import { usePaymentItems } from '~/composables/usePaymentItems'
import { useDiscounts } from '~/composables/useDiscounts'

export const usePayments = () => {
  // ✅ RUNDUNGSFUNKTION: Preise auf nächsten Franken runden
  const roundToNearestFranken = (rappen: number): number => {
    const remainder = rappen % 100
    if (remainder === 0) return rappen
    if (remainder < 50) return rappen - remainder      // Abrunden bei < 50 Rappen
    else return rappen + (100 - remainder)             // Aufrunden bei >= 50 Rappen
  }

  const supabase = getSupabase()
  const { createPaymentItem, addAppointmentItem, addProductItem, addDiscountItem } = usePaymentItems()
  const { validateDiscountCode, applyDiscount, loadDiscounts, loadDiscountsByCategory, availableDiscounts } = useDiscounts()
  
  // State
  const isLoading = ref(false)
  const isLoadingPrice = ref(false)
  const priceError = ref<string | null>(null)
  const isProcessing = ref(false)

  // Computed
  const hasPriceError = computed(() => !!priceError.value)

  // Methods
  const calculatePrice = async (
    categoryCode: string,
    durationMinutes: number,
    staffId?: string
  ) => {
    try {
      isLoadingPrice.value = true
      priceError.value = null

      // Get base price from categories table
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('base_price_rappen')
        .eq('code', categoryCode)
        .single()

      if (categoryError) throw categoryError
      if (!categoryData) throw new Error('Kategorie nicht gefunden')

      let basePrice = categoryData.base_price_rappen

      // ✅ ENTFERNT: Staff-specific pricing wird nicht mehr verwendet
      // Preise werden jetzt direkt aus der categories Tabelle geladen

      // Calculate total based on duration
      const totalPrice = Math.round((basePrice * durationMinutes) / 45)
      const adminFee = Math.round(totalPrice * 0.05) // 5% admin fee
      const totalWithFee = totalPrice + adminFee

      return {
        base_price_rappen: totalPrice,
        admin_fee_rappen: adminFee,
        total_rappen: totalWithFee,
        category_code: categoryCode,
        duration_minutes: durationMinutes
      }
    } catch (error: any) {
      priceError.value = error.message || 'Fehler bei der Preisberechnung'
      throw error
    } finally {
      isLoadingPrice.value = false
    }
  }

  // Create payment record in database with new structure
  const createPaymentRecord = async (data: Partial<Payment>): Promise<Payment> => {
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

  // Create payment items for a payment using the new structure
  const createPaymentItems = async (paymentId: string, items: Partial<PaymentItem>[]): Promise<void> => {
    try {
      for (const item of items) {
        if (item.item_type === 'appointment' && item.item_id) {
          await addAppointmentItem(
            paymentId,
            item.item_id,
            item.item_name || 'Fahrstunde',
            item.unit_price_rappen || 0,
            item.description
          )
        } else if (item.item_type === 'product' && item.item_id) {
          await addProductItem(
            paymentId,
            item.item_id,
            item.item_name || 'Produkt',
            item.quantity || 1,
            item.unit_price_rappen || 0,
            item.description
          )
        } else if (item.item_type === 'discount' && item.item_id) {
          await addDiscountItem(
            paymentId,
            item.item_id,
            item.item_name || 'Rabatt',
            Math.abs(item.total_price_rappen || 0),
            item.description
          )
        }
      }
    } catch (error) {
      console.error('Error creating payment items:', error)
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

      // Create payment items (mit gerundeten Preisen)
      const paymentItems: any[] = [
        {
          item_type: 'appointment',
          item_id: appointmentId,
          item_name: `Fahrlektion ${price.category_code}`,
          quantity: 1,
          unit_price_rappen: roundedLessonPriceRappen,
          total_price_rappen: roundedLessonPriceRappen,
          description: `${price.duration_minutes} Minuten`
        }
      ]

      // Add products if any
      if (products && products.length > 0) {
        products.forEach(product => {
          paymentItems.push({
            item_type: 'product',
            item_id: product.id,
            item_name: product.name,
            quantity: 1, // Standard quantity
            unit_price_rappen: product.price_rappen,
            total_price_rappen: product.price_rappen,
            description: product.description
          })
        })
      }

      // Add discounts if any
      if (discounts && discounts.length > 0) {
        discounts.forEach(discount => {
          paymentItems.push({
            item_type: 'discount',
            item_id: discount.id,
            item_name: discount.name,
            quantity: 1,
            unit_price_rappen: -discount.discount_value || 0,
            total_price_rappen: -discount.discount_value || 0,
            description: discount.name || ''
          })
        })
      }

      await createPaymentItems(payment.id, paymentItems)

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

      // Create payment items (same logic as cash payment)
      const paymentItems: Partial<PaymentItem>[] = [
        {
          item_type: 'appointment',
          item_id: appointmentId,
          item_name: `Fahrlektion ${price.category_code}`,
          quantity: 1,
          unit_price_rappen: roundedLessonPriceRappen,
          total_price_rappen: roundedLessonPriceRappen,
          description: `${price.duration_minutes} Minuten`
        }
      ]

      if (products && products.length > 0) {
        products.forEach(product => {
          paymentItems.push({
            item_type: 'product',
            item_id: product.id,
            item_name: product.name,
            quantity: 1, // Standard quantity
            unit_price_rappen: product.price_rappen,
            total_price_rappen: product.price_rappen,
            description: product.description
          })
        })
      }

      if (discounts && discounts.length > 0) {
        discounts.forEach(discount => {
          paymentItems.push({
            item_type: 'discount',
            item_id: discount.id,
            item_name: discount.name,
            quantity: 1,
            unit_price_rappen: -discount.discount_value || 0,
            total_price_rappen: -discount.discount_value || 0,
            description: discount.name || ''
          })
        })
      }

      await createPaymentItems(payment.id, paymentItems)

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

      // Create payment items
      await createPaymentItems(payment.id, appointmentId, products, discounts)

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
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          wallee_transaction_id: walleeResponse.transactionId, // ✅ Store in main field
          metadata: {
            ...paymentData.metadata,
            wallee_transaction_id: walleeResponse.transactionId
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) {
        console.warn('⚠️ Could not update payment with Wallee transaction ID:', updateError)
      }

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
      // ✅ NEW: Get tenant_id from current auth user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      let tenantId: string | null = null
      let actualUserId: string | null = userId
      
      if (authUser) {
        console.log('🔍 Auth user found:', authUser.id)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, tenant_id')
          .eq('auth_user_id', authUser.id)
          .single()
        
        if (userError) {
          console.error('❌ Error fetching user data:', userError)
        } else if (userData) {
          tenantId = userData.tenant_id
          actualUserId = userData.id
          console.log('✅ User data loaded:', { userId: userData.id, tenantId })
        }
      }
      
      // Fallback: try to get tenant_id from userId if provided
      if (!tenantId && userId) {
        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', userId)
          .single()
        tenantId = userData?.tenant_id || null
      }
      
      console.log('💳 Creating payment with:', { userId: actualUserId, tenantId })
      
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

      // Create payment record directly with only columns that exist
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: actualUserId || null, // ✅ Use actualUserId instead of userId
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
          tenant_id: tenantId // ✅ NEW: Include tenant_id for RLS
        })
        .select()
        .single()

      if (paymentError) {
        console.error('❌ Error creating payment record:', paymentError)
        throw paymentError
      }

      console.log('✅ Payment record created:', payment.id)

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
          successUrl: `${window.location.origin}/payment/success?transaction_id=${payment.id}`,
          failedUrl: `${window.location.origin}/payment/failed?transaction_id=${payment.id}`
        }
      })

      if (!walleeResponse.success) {
        throw new Error(walleeResponse.error || 'Wallee transaction failed')
      }

      // Update payment with Wallee transaction ID
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          wallee_transaction_id: walleeResponse.transactionId, // ✅ Store in main field
          metadata: {
            ...paymentData.metadata,
            wallee_transaction_id: walleeResponse.transactionId
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) {
        console.warn('⚠️ Could not update payment with Wallee transaction ID:', updateError)
      }

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

      // Create payment items
      const paymentItems: Partial<PaymentItem>[] = []

      // Add products
      products.forEach(product => {
        paymentItems.push({
          item_type: 'product',
          item_id: product.id,
          item_name: product.name,
          quantity: 1, // Standard quantity
          unit_price_rappen: product.price_rappen,
          total_price_rappen: product.price_rappen,
          description: product.description
        })
      })

      // Add discounts
      discounts.forEach(discount => {
        paymentItems.push({
          item_type: 'discount',
          item_id: discount.id,
          item_name: discount.name,
          quantity: 1,
          unit_price_rappen: -discount.discount_value || 0,
          total_price_rappen: -discount.discount_value || 0,
          description: discount.name || ''
        })
      })

      await createPaymentItems(payment.id, paymentItems)

      return payment
    } finally {
      isProcessing.value = false
    }
  }

  // Get payment details with items
  const getPaymentDetails = async (paymentId: string) => {
    try {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          appointments (
            id,
            title,
            start_time,
            end_time,
            duration_minutes,
            type
          ),
          users!payments_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', paymentId)
        .single()

      if (paymentError) throw paymentError

      // Get payment items
      const { data: items, error: itemsError } = await supabase
        .from('payment_items')
        .select('*')
        .eq('payment_id', paymentId)

      if (itemsError) throw itemsError

      return {
        ...payment,
        items: items || []
      }
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
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
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
    calculatePrice,
    createPaymentRecord,
    createPaymentItems,
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