// composables/usePaymentItems.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export interface PaymentItem {
  id: string
  payment_id: string
  item_type: 'appointment' | 'product' | 'discount' | 'service'
  item_id?: string
  item_name: string
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
  description?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface CreatePaymentItemData {
  payment_id: string
  item_type: 'appointment' | 'product' | 'discount' | 'service'
  item_id?: string
  item_name: string
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
  description?: string
  metadata?: Record<string, any>
}

export const usePaymentItems = () => {
  const supabase = getSupabase()
  
  // State
  const paymentItems = ref<PaymentItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const totalAmount = computed(() => 
    paymentItems.value.reduce((sum, item) => sum + item.total_price_rappen, 0)
  )

  const totalAmountChf = computed(() => 
    (totalAmount.value / 100).toFixed(2)
  )

  const itemsByType = computed(() => {
    const grouped: Record<string, PaymentItem[]> = {
      appointment: [],
      product: [],
      discount: [],
      service: []
    }
    
    paymentItems.value.forEach(item => {
      if (grouped[item.item_type]) {
        grouped[item.item_type].push(item)
      }
    })
    
    return grouped
  })

  // Methods
  const loadPaymentItems = async (paymentId: string) => {
    try {
      isLoading.value = true
      error.value = null
      
      const { data, error: dbError } = await supabase
        .from('payment_items')
        .select('*')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: true })
      
      if (dbError) throw dbError
      
      paymentItems.value = data || []
      console.log('✅ Payment items loaded:', paymentItems.value.length)
      
    } catch (err: any) {
      console.error('❌ Error loading payment items:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const createPaymentItem = async (itemData: CreatePaymentItemData): Promise<PaymentItem> => {
    try {
      const { data, error: dbError } = await supabase
        .from('payment_items')
        .insert(itemData)
        .select()
        .single()
      
      if (dbError) throw dbError
      
      paymentItems.value.push(data)
      console.log('✅ Payment item created:', data.id)
      
      return data
    } catch (err: any) {
      console.error('❌ Error creating payment item:', err)
      throw err
    }
  }

  const createMultiplePaymentItems = async (items: CreatePaymentItemData[]): Promise<PaymentItem[]> => {
    try {
      if (items.length === 0) return []
      
      const { data, error: dbError } = await supabase
        .from('payment_items')
        .insert(items)
        .select()
      
      if (dbError) throw dbError
      
      paymentItems.value.push(...(data || []))
      console.log('✅ Multiple payment items created:', data?.length || 0)
      
      return data || []
    } catch (err: any) {
      console.error('❌ Error creating multiple payment items:', err)
      throw err
    }
  }

  const updatePaymentItem = async (id: string, updates: Partial<PaymentItem>): Promise<PaymentItem> => {
    try {
      const { data, error: dbError } = await supabase
        .from('payment_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (dbError) throw dbError
      
      const index = paymentItems.value.findIndex(item => item.id === id)
      if (index !== -1) {
        paymentItems.value[index] = data
      }
      
      console.log('✅ Payment item updated:', id)
      
      return data
    } catch (err: any) {
      console.error('❌ Error updating payment item:', err)
      throw err
    }
  }

  const deletePaymentItem = async (id: string) => {
    try {
      const { error: dbError } = await supabase
        .from('payment_items')
        .delete()
        .eq('id', id)
      
      if (dbError) throw dbError
      
      paymentItems.value = paymentItems.value.filter(item => item.id !== id)
      console.log('✅ Payment item deleted:', id)
      
    } catch (err: any) {
      console.error('❌ Error deleting payment item:', err)
      throw err
    }
  }

  const deletePaymentItemsByPayment = async (paymentId: string) => {
    try {
      const { error: dbError } = await supabase
        .from('payment_items')
        .delete()
        .eq('payment_id', paymentId)
      
      if (dbError) throw dbError
      
      paymentItems.value = paymentItems.value.filter(item => item.payment_id !== paymentId)
      console.log('✅ Payment items deleted for payment:', paymentId)
      
    } catch (err: any) {
      console.error('❌ Error deleting payment items by payment:', err)
      throw err
    }
  }

  // Helper methods for specific item types
  const addAppointmentItem = async (
    paymentId: string, 
    appointmentId: string, 
    appointmentTitle: string, 
    priceRappen: number,
    description?: string
  ) => {
    return await createPaymentItem({
      payment_id: paymentId,
      item_type: 'appointment',
      item_id: appointmentId,
      item_name: appointmentTitle,
      quantity: 1,
      unit_price_rappen: priceRappen,
      total_price_rappen: priceRappen,
      description
    })
  }

  const addProductItem = async (
    paymentId: string,
    productId: string,
    productName: string,
    quantity: number,
    unitPriceRappen: number,
    description?: string
  ) => {
    const totalPrice = unitPriceRappen * quantity
    
    return await createPaymentItem({
      payment_id: paymentId,
      item_type: 'product',
      item_id: productId,
      item_name: productName,
      quantity,
      unit_price_rappen: unitPriceRappen,
      total_price_rappen: totalPrice,
      description
    })
  }

  const addDiscountItem = async (
    paymentId: string,
    discountId: string,
    discountName: string,
    discountAmountRappen: number,
    description?: string
  ) => {
    return await createPaymentItem({
      payment_id: paymentId,
      item_type: 'discount',
      item_id: discountId,
      item_name: discountName,
      quantity: 1,
      unit_price_rappen: -discountAmountRappen, // Negativ für Rabatte
      total_price_rappen: -discountAmountRappen,
      description
    })
  }

  const addServiceItem = async (
    paymentId: string,
    serviceId: string,
    serviceName: string,
    priceRappen: number,
    description?: string
  ) => {
    return await createPaymentItem({
      payment_id: paymentId,
      item_type: 'service',
      item_id: serviceId,
      item_name: serviceName,
      quantity: 1,
      unit_price_rappen: priceRappen,
      total_price_rappen: priceRappen,
      description
    })
  }

  // Clear local state
  const clearItems = () => {
    paymentItems.value = []
    error.value = null
  }

  return {
    // State
    paymentItems,
    isLoading,
    error,
    
    // Computed
    totalAmount,
    totalAmountChf,
    itemsByType,
    
    // Methods
    loadPaymentItems,
    createPaymentItem,
    createMultiplePaymentItems,
    updatePaymentItem,
    deletePaymentItem,
    deletePaymentItemsByPayment,
    
    // Helper methods
    addAppointmentItem,
    addProductItem,
    addDiscountItem,
    addServiceItem,
    
    // Utility
    clearItems
  }
}
