import { ref, computed } from 'vue'
import { supabase } from '~/utils/supabase'

export interface DiscountCode {
  id: string
  code: string
  name: string
  description: string
  discount_type: 'fixed' | 'percentage' | 'free_lesson' | 'free_product'
  discount_value: number
  max_discount_rappen?: number
  min_amount_rappen: number
  applies_to: 'all' | 'appointments' | 'products' | 'specific_categories'
  category_filter?: string[]
  trigger_type: 'manual' | 'birthday' | 'anniversary' | 'first_lesson' | 'milestone' | 'seasonal'
  trigger_conditions: Record<string, any>
  auto_apply: boolean
  valid_from: string
  valid_until?: string
  is_active: boolean
  max_total_usage: number
  max_per_user: number
  current_total_usage: number
  created_by_id?: string
  metadata: Record<string, any>
}

export interface Discount {
  id: string
  appointment_id?: string
  payment_id?: string
  product_sale_id?: string
  user_id: string
  staff_id?: string
  discount_code_id?: string
  discount_type: 'fixed' | 'percentage' | 'free_lesson' | 'free_product'
  discount_amount_rappen: number
  discount_reason?: string
  original_amount_rappen: number
  final_amount_rappen: number
  is_automatic: boolean
  applied_by_staff_id?: string
  expires_at?: string
  usage_count: number
  max_usage_count: number
  is_active: boolean
  applied_at: string
  created_at: string
}

export interface DiscountCalculation {
  discount_amount_rappen: number
  original_amount_rappen: number
  final_amount_rappen: number
  applied_discounts: Discount[]
  error?: string
}

export const useHybridDiscounts = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ===== DISCOUNT CODES MANAGEMENT =====

  // Alle aktiven Rabatt-Codes laden
  const getActiveDiscountCodes = async (): Promise<DiscountCode[]> => {
    try {
      const { data, error: dbError } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (dbError) throw dbError
      return data || []
    } catch (err: any) {
      console.error('Error loading discount codes:', err)
      return []
    }
  }

  // Neuen Rabatt-Code erstellen
  const createDiscountCode = async (codeData: Omit<DiscountCode, 'id' | 'created_at' | 'current_total_usage'>): Promise<DiscountCode | null> => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: dbError } = await supabase
        .from('discount_codes')
        .insert([codeData])
        .select()
        .single()

      if (dbError) throw dbError
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error creating discount code:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Rabatt-Code aktualisieren
  const updateDiscountCode = async (id: string, updates: Partial<DiscountCode>): Promise<DiscountCode | null> => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: dbError } = await supabase
        .from('discount_codes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (dbError) throw dbError
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating discount code:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Rabatt-Code deaktivieren
  const deactivateDiscountCode = async (id: string): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase
        .from('discount_codes')
        .update({ is_active: false })
        .eq('id', id)

      if (dbError) throw dbError
      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Error deactivating discount code:', err)
      return false
    }
  }

  // ===== MANUAL STAFF DISCOUNTS =====

  // Manuellen Rabatt durch Staff erstellen
  const createStaffDiscount = async (
    appointmentId: string,
    userId: string,
    staffId: string,
    discountType: 'fixed' | 'percentage',
    discountAmount: number,
    discountReason: string,
    originalAmountRappen: number,
    expiresAt?: string
  ): Promise<Discount | null> => {
    try {
      isLoading.value = true
      error.value = null

      // Rabatt-Betrag in Rappen konvertieren
      const discountAmountRappen = discountType === 'percentage' 
        ? Math.round(originalAmountRappen * discountAmount / 100)
        : Math.round(discountAmount * 100)

      const { data, error: dbError } = await supabase
        .rpc('create_staff_discount', {
          p_appointment_id: appointmentId,
          p_user_id: userId,
          p_staff_id: staffId,
          p_discount_type: discountType,
          p_discount_amount_rappen: discountAmountRappen,
          p_discount_reason: discountReason,
          p_original_amount_rappen: originalAmountRappen,
          p_expires_at: expiresAt
        })

      if (dbError) throw dbError

      // Den erstellten Rabatt laden
      const { data: discountData } = await supabase
        .from('discounts')
        .select('*')
        .eq('id', data)
        .single()

      return discountData
    } catch (err: any) {
      error.value = err.message
      console.error('Error creating staff discount:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // ===== AUTOMATIC DISCOUNT APPLICATION =====

  // Automatische Rabatte für einen Benutzer anwenden
  const autoApplyDiscountsForUser = async (
    userId: string,
    appointmentId?: string
  ): Promise<{ applied_discounts: any[], count: number }> => {
    try {
      const { data, error: dbError } = await supabase
        .rpc('auto_apply_discounts_for_user', {
          p_user_id: userId,
          p_appointment_id: appointmentId
        })

      if (dbError) throw dbError
      return data || { applied_discounts: [], count: 0 }
    } catch (err: any) {
      console.error('Error auto-applying discounts:', err)
      return { applied_discounts: [], count: 0 }
    }
  }

  // ===== DISCOUNT RETRIEVAL =====

  // Alle aktiven Rabatte eines Benutzers laden
  const getUserActiveDiscounts = async (userId: string): Promise<Discount[]> => {
    try {
      const { data, error: dbError } = await supabase
        .from('v_user_active_discounts')
        .select('*')
        .eq('user_id', userId)
        .order('applied_at', { ascending: false })

      if (dbError) throw dbError
      return data || []
    } catch (err: any) {
      console.error('Error loading user discounts:', err)
      return []
    }
  }

  // Rabatt für eine spezifische Entität laden
  const getEntityDiscount = async (
    entityType: 'appointment' | 'payment' | 'product_sale',
    entityId: string
  ): Promise<Discount | null> => {
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

  // ===== DISCOUNT CALCULATIONS =====

  // Rabatt für eine Zahlung berechnen (inkl. automatische Rabatte)
  const calculatePaymentDiscount = async (
    paymentId: string,
    baseAmountRappen: number,
    userId: string,
    appointmentId?: string
  ): Promise<DiscountCalculation> => {
    try {
      // Erst automatische Rabatte anwenden
      if (appointmentId) {
        await autoApplyDiscountsForUser(userId, appointmentId)
      }

      // Alle aktiven Rabatte für diese Zahlung laden
      const { data: discounts, error: dbError } = await supabase
        .from('discounts')
        .select('*')
        .eq('payment_id', paymentId)
        .eq('is_active', true)

      if (dbError) throw dbError

      let totalDiscount = 0
      const appliedDiscounts: Discount[] = []

      for (const discount of discounts || []) {
        let discountAmount = 0
        
        if (discount.discount_type === 'percentage') {
          discountAmount = Math.round(baseAmountRappen * discount.discount_amount_rappen / 100)
        } else {
          discountAmount = discount.discount_amount_rappen
        }

        totalDiscount += discountAmount
        appliedDiscounts.push(discount)
      }

      const finalAmount = Math.max(0, baseAmountRappen - totalDiscount)

      return {
        discount_amount_rappen: totalDiscount,
        original_amount_rappen: baseAmountRappen,
        final_amount_rappen: finalAmount,
        applied_discounts: appliedDiscounts
      }
    } catch (err: any) {
      return {
        discount_amount_rappen: 0,
        original_amount_rappen: baseAmountRappen,
        final_amount_rappen: baseAmountRappen,
        applied_discounts: [],
        error: err.message
      }
    }
  }

  // Rabatt für einen Termin berechnen
  const calculateAppointmentDiscount = async (
    appointmentId: string,
    baseAmountRappen: number,
    userId: string
  ): Promise<DiscountCalculation> => {
    try {
      // Erst automatische Rabatte anwenden
      await autoApplyDiscountsForUser(userId, appointmentId)

      // Alle aktiven Rabatte für diesen Termin laden
      const { data: discounts, error: dbError } = await supabase
        .from('discounts')
        .select('*')
        .eq('appointment_id', appointmentId)
        .eq('is_active', true)

      if (dbError) throw dbError

      let totalDiscount = 0
      const appliedDiscounts: Discount[] = []

      for (const discount of discounts || []) {
        let discountAmount = 0
        
        if (discount.discount_type === 'percentage') {
          discountAmount = Math.round(baseAmountRappen * discount.discount_amount_rappen / 100)
        } else {
          discountAmount = discount.discount_amount_rappen
        }

        totalDiscount += discountAmount
        appliedDiscounts.push(discount)
      }

      const finalAmount = Math.max(0, baseAmountRappen - totalDiscount)

      return {
        discount_amount_rappen: totalDiscount,
        original_amount_rappen: baseAmountRappen,
        final_amount_rappen: finalAmount,
        applied_discounts: appliedDiscounts
      }
    } catch (err: any) {
      return {
        discount_amount_rappen: 0,
        original_amount_rappen: baseAmountRappen,
        final_amount_rappen: baseAmountRappen,
        applied_discounts: [],
        error: err.message
      }
    }
  }

  // ===== DISCOUNT MANAGEMENT =====

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

  // Rabatt deaktivieren
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

  // ===== UTILITY FUNCTIONS =====

  // Rabatt-Statistiken für einen Benutzer
  const getUserDiscountStats = async (userId: string) => {
    try {
      const { data, error: dbError } = await supabase
        .from('discounts')
        .select('discount_amount_rappen, discount_type, is_automatic, created_at')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (dbError) throw dbError

      const totalDiscount = data?.reduce((sum, d) => sum + d.discount_amount_rappen, 0) || 0
      const discountCount = data?.length || 0
      const automaticCount = data?.filter(d => d.is_automatic).length || 0
      const manualCount = data?.filter(d => !d.is_automatic).length || 0

      return {
        totalDiscountRappen: totalDiscount,
        totalDiscountCHF: totalDiscount / 100,
        discountCount,
        automaticCount,
        manualCount
      }
    } catch (err: any) {
      console.error('Error loading discount stats:', err)
      return {
        totalDiscountRappen: 0,
        totalDiscountCHF: 0,
        discountCount: 0,
        automaticCount: 0,
        manualCount: 0
      }
    }
  }

  // Prüfen ob ein Rabatt-Code gültig ist
  const validateDiscountCode = async (code: string, userId: string): Promise<DiscountCode | null> => {
    try {
      const { data, error: dbError } = await supabase
        .from('discount_codes')
        .select('*')
        .ilike('code', code) // Case-insensitive comparison
        .eq('is_active', true)
        .single()

      if (dbError) return null

      // Prüfen ob der Code noch gültig ist
      const now = new Date()
      if (data.valid_until && new Date(data.valid_until) < now) return null
      if (data.valid_from && new Date(data.valid_from) > now) return null

      // Prüfen ob der Benutzer den Code bereits verwendet hat
      if (data.max_per_user > 0) {
        const { count } = await supabase
          .from('discounts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('discount_code_id', data.id)

        if (count && count >= data.max_per_user) return null
      }

      // Prüfen ob der Code das Nutzungslimit erreicht hat
      if (data.max_total_usage > 0 && data.current_total_usage >= data.max_total_usage) return null

      return data
    } catch (err: any) {
      console.error('Error validating discount code:', err)
      return null
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
    
    // Discount Codes Management
    getActiveDiscountCodes,
    createDiscountCode,
    updateDiscountCode,
    deactivateDiscountCode,
    
    // Manual Staff Discounts
    createStaffDiscount,
    
    // Automatic Discount Application
    autoApplyDiscountsForUser,
    
    // Discount Retrieval
    getUserActiveDiscounts,
    getEntityDiscount,
    
    // Discount Calculations
    calculatePaymentDiscount,
    calculateAppointmentDiscount,
    
    // Discount Management
    updateDiscount,
    deactivateDiscount,
    
    // Utility Functions
    getUserDiscountStats,
    validateDiscountCode
  }
}
