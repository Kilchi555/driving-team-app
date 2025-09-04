import { ref, computed } from 'vue'
import { supabase } from '~/utils/supabase'

export interface ConsolidatedDiscount {
  id: string
  appointment_id?: string
  payment_id?: string
  product_sale_id?: string
  user_id: string
  staff_id?: string
  discount_type: 'fixed' | 'percentage' | 'free_lesson' | 'free_product'
  discount_amount_rappen: number
  discount_reason?: string
  original_amount_rappen: number
  final_amount_rappen: number
  is_active: boolean
  applied_at: string
  created_at: string
}

export interface DiscountCalculation {
  discount_amount_rappen: number
  original_amount_rappen: number
  final_amount_rappen: number
  error?: string
}

export const useDiscountsConsolidated = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Alle aktiven Rabatte für einen Benutzer laden
  const getUserDiscounts = async (userId: string): Promise<ConsolidatedDiscount[]> => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: dbError } = await supabase
        .from('discounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      return data || []
    } catch (err: any) {
      error.value = err.message
      console.error('Error loading user discounts:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Rabatt für eine spezifische Entität laden
  const getEntityDiscount = async (
    entityType: 'appointment' | 'payment' | 'product_sale',
    entityId: string
  ): Promise<ConsolidatedDiscount | null> => {
    try {
      const { data, error: dbError } = await supabase
        .from('discounts')
        .select('*')
        .eq(`${entityType}_id`, entityId)
        .eq('is_active', true)
        .single()

      if (dbError && dbError.code !== 'PGRST116') throw dbError
      return data
    } catch (err: any) {
      console.error(`Error loading ${entityType} discount:`, err)
      return null
    }
  }

  // Neuen Rabatt erstellen
  const createDiscount = async (discountData: Omit<ConsolidatedDiscount, 'id' | 'created_at'>): Promise<ConsolidatedDiscount | null> => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: dbError } = await supabase
        .from('discounts')
        .insert([discountData])
        .select()
        .single()

      if (dbError) throw dbError
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error creating discount:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Rabatt aktualisieren
  const updateDiscount = async (id: string, updates: Partial<Discount>): Promise<Discount | null> => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: dbError } = await supabase
        .from('discounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (dbError) throw dbError
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating discount:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Rabatt deaktivieren (soft delete)
  const deactivateDiscount = async (id: string): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase
        .from('discounts')
        .update({ is_active: false })
        .eq('id', id)

      if (dbError) throw dbError
      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Error deactivating discount:', err)
      return false
    }
  }

  // Rabatt für eine Zahlung berechnen
  const calculatePaymentDiscount = async (
    paymentId: string,
    baseAmountRappen: number
  ): Promise<DiscountCalculation> => {
    try {
      const discount = await getEntityDiscount('payment', paymentId)
      
      if (!discount) {
        return {
          discount_amount_rappen: 0,
          original_amount_rappen: baseAmountRappen,
          final_amount_rappen: baseAmountRappen
        }
      }

      let finalAmount = baseAmountRappen
      if (discount.discount_type === 'percentage') {
        finalAmount = Math.round(baseAmountRappen * (1 - discount.discount_amount_rappen / 100))
      } else {
        finalAmount = Math.max(0, baseAmountRappen - discount.discount_amount_rappen)
      }

      return {
        discount_amount_rappen: discount.discount_amount_rappen,
        original_amount_rappen: baseAmountRappen,
        final_amount_rappen: finalAmount
      }
    } catch (err: any) {
      return {
        discount_amount_rappen: 0,
        original_amount_rappen: baseAmountRappen,
        final_amount_rappen: baseAmountRappen,
        error: err.message
      }
    }
  }

  // Rabatt für einen Termin berechnen
  const calculateAppointmentDiscount = async (
    appointmentId: string,
    baseAmountRappen: number
  ): Promise<DiscountCalculation> => {
    try {
      const discount = await getEntityDiscount('appointment', appointmentId)
      
      if (!discount) {
        return {
          discount_amount_rappen: 0,
          original_amount_rappen: baseAmountRappen,
          final_amount_rappen: baseAmountRappen
        }
      }

      let finalAmount = baseAmountRappen
      if (discount.discount_type === 'percentage') {
        finalAmount = Math.round(baseAmountRappen * (1 - discount.discount_amount_rappen / 100))
      } else {
        finalAmount = Math.max(0, baseAmountRappen - discount.discount_amount_rappen)
      }

      return {
        discount_amount_rappen: discount.discount_amount_rappen,
        original_amount_rappen: baseAmountRappen,
        final_amount_rappen: finalAmount
      }
    } catch (err: any) {
      return {
        discount_amount_rappen: 0,
        original_amount_rappen: baseAmountRappen,
        final_amount_rappen: baseAmountRappen,
        error: err.message
      }
    }
  }

  // Rabatt für einen Produktverkauf berechnen
  const calculateProductSaleDiscount = async (
    productSaleId: string,
    baseAmountRappen: number
  ): Promise<DiscountCalculation> => {
    try {
      const discount = await getEntityDiscount('product_sale', productSaleId)
      
      if (!discount) {
        return {
          discount_amount_rappen: 0,
          original_amount_rappen: baseAmountRappen,
          final_amount_rappen: baseAmountRappen
        }
      }

      let finalAmount = baseAmountRappen
      if (discount.discount_type === 'percentage') {
        finalAmount = Math.round(baseAmountRappen * (1 - discount.discount_amount_rappen / 100))
      } else {
        finalAmount = Math.max(0, baseAmountRappen - discount.discount_amount_rappen)
      }

      return {
        discount_amount_rappen: discount.discount_amount_rappen,
        original_amount_rappen: baseAmountRappen,
        final_amount_rappen: finalAmount
      }
    } catch (err: any) {
      return {
        discount_amount_rappen: 0,
        original_amount_rappen: baseAmountRappen,
        final_amount_rappen: baseAmountRappen,
        error: err.message
      }
    }
  }

  // Rabatt-Statistiken für einen Benutzer
  const getUserDiscountStats = async (userId: string) => {
    try {
      const { data, error: dbError } = await supabase
        .from('discounts')
        .select('discount_amount_rappen, discount_type, created_at')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (dbError) throw dbError

      const totalDiscount = data?.reduce((sum, d) => sum + d.discount_amount_rappen, 0) || 0
      const discountCount = data?.length || 0
      const discountTypes = data?.reduce((acc, d) => {
        acc[d.discount_type] = (acc[d.discount_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return {
        totalDiscountRappen: totalDiscount,
        totalDiscountCHF: totalDiscount / 100,
        discountCount,
        discountTypes
      }
    } catch (err: any) {
      console.error('Error loading discount stats:', err)
      return {
        totalDiscountRappen: 0,
        totalDiscountCHF: 0,
        discountCount: 0,
        discountTypes: {}
      }
    }
  }

  // Computed properties
  const hasError = computed(() => error.value !== null)
  const errorMessage = computed(() => error.value)

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    hasError,
    errorMessage,
    
    // Methods
    getUserDiscounts,
    getEntityDiscount,
    createDiscount,
    updateDiscount,
    deactivateDiscount,
    calculatePaymentDiscount,
    calculateAppointmentDiscount,
    calculateProductSaleDiscount,
    getUserDiscountStats
  }
}
