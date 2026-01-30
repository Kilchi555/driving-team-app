// composables/useDiscounts.ts
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'
import type { Discount } from '~/types/payment'

export interface DiscountCode {
  id: string
  name: string
  code?: string
  discount_type: 'percentage' | 'fixed' | 'free_lesson' | 'free_product'
  discount_value: number
  min_amount_rappen: number
  max_discount_rappen?: number
  valid_from: string
  valid_until?: string
  usage_limit?: number
  max_per_user?: number
  usage_count: number
  is_active: boolean
  applies_to: 'all' | 'appointments' | 'products' | 'services'
  category_filter?: string
  staff_id?: string
  created_at: string
  updated_at: string
}

export interface DiscountValidationResult {
  isValid: boolean
  discount?: DiscountCode
  discount_amount_rappen: number
  error?: string
}

export const useDiscounts = () => {
  const supabase = getSupabase()
  
  // State
  const discounts = ref<DiscountCode[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeDiscounts = computed(() => 
    discounts.value.filter(d => d.is_active)
  )

  const availableDiscounts = computed(() => 
    activeDiscounts.value.filter(d => {
      const now = new Date()
      const validFrom = new Date(d.valid_from)
      const validUntil = d.valid_until ? new Date(d.valid_until) : null
      
      return now >= validFrom && (!validUntil || now <= validUntil)
    })
  )

  // Methods
  const loadDiscounts = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      // Get current user's tenant_id
      const authStore = useAuthStore()
      const user = authStore.user
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('No tenant_id found for user')
      
      const { data, error: dbError } = await supabase
        .from('discounts')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .is('deleted_at', null) // Only load non-deleted discounts
        .order('created_at', { ascending: false })
      
      if (dbError) throw dbError
      
      discounts.value = data || []
      logger.debug('✅ Discounts loaded for tenant:', discounts.value.length, userProfile.tenant_id)
      logger.debug('📋 Loaded discount IDs:', discounts.value.map(d => ({ 
        id: d.id, 
        name: d.name, 
        code: d.code, 
        is_active: d.is_active,
        usage_limit: d.usage_limit,
        max_per_user: d.max_per_user,
        usage_count: d.usage_count
      })))
      
    } catch (err: any) {
      console.error('❌ Error loading discounts:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const loadDiscountsByCategory = async (categoryCode: string) => {
    try {
      // Get current user's tenant_id
      const authStore = useAuthStore()
      const user = authStore.user
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('No tenant_id found for user')

      const { data, error: dbError } = await supabase
        .from('discounts')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null) // Only load non-deleted discounts
        .or(`category_filter.eq.${categoryCode},category_filter.eq.all`)
        .order('created_at', { ascending: false })
      
      if (dbError) throw dbError
      
      return data || []
    } catch (err: any) {
      console.error('❌ Error loading discounts by category:', err)
      return []
    }
  }

  const validateDiscountCode = async (
    code: string, 
    amount_rappen: number, 
    categoryCode?: string
  ): Promise<DiscountValidationResult> => {
    try {
      // Get current user's tenant_id
      const authStore = useAuthStore()
      const user = authStore.user
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('No tenant_id found for user')

      // ✅ FIRST: Try voucher_codes table (credit/gift vouchers)
      const { data: voucherData, error: voucherError } = await supabase
        .from('voucher_codes')
        .select('*')
        .ilike('code', code) // Case-insensitive comparison
        .eq('tenant_id', userProfile.tenant_id)
        .eq('is_active', true)
        .single()
      
      if (!voucherError && voucherData) {
        const now = new Date()
        const validFrom = new Date(voucherData.valid_from)
        const validUntil = voucherData.valid_until ? new Date(voucherData.valid_until) : null
        
        // Check valid period
        if (now < validFrom || (validUntil && now > validUntil)) {
          return {
            isValid: false,
            discount_amount_rappen: 0,
            error: 'Gutschein ist nicht gültig'
          }
        }
        
        // Check redemption limit
        if (voucherData.max_redemptions && voucherData.current_redemptions >= voucherData.max_redemptions) {
          return {
            isValid: false,
            discount_amount_rappen: 0,
            error: 'Gutschein hat das Nutzungslimit erreicht'
          }
        }
        
        // Return voucher credit as discount
        return {
          isValid: true,
          discount_amount_rappen: voucherData.credit_amount_rappen,
          discount: voucherData as any
        }
      }
      
      // ✅ SECOND: Try discounts table (percentage/fixed discounts)
      const { data: discountData, error: discountError } = await supabase
        .from('discounts')
        .select('*')
        .ilike('code', code) // Case-insensitive comparison
        .eq('tenant_id', userProfile.tenant_id) // Filter by tenant
        .eq('is_active', true)
        .single()
      
      if (discountError || !discountData) {
        return {
          isValid: false,
          discount_amount_rappen: 0,
          error: 'Gutscheincode nicht gefunden'
        }
      }

      const discount = discountData as Discount
      
      // Prüfe Gültigkeitszeitraum
      const now = new Date()
      const validFrom = new Date(discount.valid_from)
      const validUntil = discount.valid_until ? new Date(discount.valid_until) : null
      
      if (now < validFrom || (validUntil && now > validUntil)) {
        return {
          isValid: false,
          discount_amount_rappen: 0,
          error: 'Gutschein ist nicht gültig'
        }
      }

      // Prüfe Mindestbetrag
      if (amount_rappen < discount.min_amount_rappen) {
        return {
          isValid: false,
          discount_amount_rappen: 0,
          error: `Mindestbetrag von CHF ${(discount.min_amount_rappen / 100).toFixed(2)} nicht erreicht`
        }
      }

      // Prüfe Kategorie-Filter
      if (discount.category_filter && 
          discount.category_filter !== 'all' && 
          discount.category_filter !== categoryCode) {
        return {
          isValid: false,
          discount_amount_rappen: 0,
          error: 'Gutschein gilt nicht für diese Kategorie'
        }
      }

      // Prüfe Nutzungslimit
      if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
        return {
          isValid: false,
          discount_amount_rappen: 0,
          error: 'Gutschein wurde bereits maximal genutzt'
        }
      }

      // Berechne Rabattbetrag
      let discountAmount = 0
      switch (discount.discount_type) {
        case 'percentage':
          discountAmount = Math.round((amount_rappen * discount.discount_value) / 100)
          break
        case 'fixed':
          discountAmount = Math.round(discount.discount_value * 100) // CHF zu Rappen
          break
        case 'free_lesson':
        case 'free_product':
          discountAmount = amount_rappen // Kompletter Betrag
          break
      }

      // Begrenze auf maximalen Rabatt
      if (discount.max_discount_rappen && discountAmount > discount.max_discount_rappen) {
        discountAmount = discount.max_discount_rappen
      }

      // Begrenze auf den tatsächlichen Betrag
      discountAmount = Math.min(discountAmount, amount_rappen)

      return {
        isValid: true,
        discount,
        discount_amount_rappen: discountAmount
      }
      
    } catch (err: any) {
      console.error('❌ Error validating discount code:', err)
      return {
        isValid: false,
        discount_amount_rappen: 0,
        error: 'Fehler bei der Gutscheinprüfung'
      }
    }
  }

  const applyDiscount = async (discountId: string) => {
    try {
      // First get current usage_count
      const { data: currentDiscount } = await supabase
        .from('discounts')
        .select('usage_count')
        .eq('id', discountId)
        .single()
      
      const newCount = (currentDiscount?.usage_count || 0) + 1
      
      const { error: dbError } = await supabase
        .from('discounts')
        .update({ 
          usage_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', discountId)
      
      if (dbError) throw dbError
      
      // Aktualisiere lokalen State
      const discount = discounts.value.find(d => d.id === discountId)
      if (discount) {
        discount.usage_count += 1
        discount.updated_at = new Date().toISOString()
      }
      
      logger.debug('✅ Discount applied:', discountId)
      
    } catch (err: any) {
      console.error('❌ Error applying discount:', err)
      throw err
    }
  }

  const createDiscount = async (discountData: Partial<DiscountCode>) => {
    try {
      // Get current user's tenant_id
      const authStore = useAuthStore()
      const user = authStore.user
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('No tenant_id found for user')

      // Check if discount code already exists for this tenant
      if (discountData.code) {
        const { data: existingDiscount, error: checkError } = await supabase
          .from('discounts')
          .select('id, code, name')
          .eq('code', discountData.code)
          .eq('tenant_id', userProfile.tenant_id)
          .single()

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw checkError
        }

        if (existingDiscount) {
          throw new Error(`Der Gutscheincode "${discountData.code}" existiert bereits für Ihren Tenant. Bitte wählen Sie einen anderen Code.`)
        }
      }

      // Add tenant_id to discount data and ensure is_active has a default value
      const discountWithTenant = {
        ...discountData,
        tenant_id: userProfile.tenant_id,
        is_active: discountData.is_active !== undefined ? discountData.is_active : true
      }
      
      logger.debug('🔍 Creating discount with data:', discountWithTenant)

      const { data, error: dbError } = await supabase
        .from('discounts')
        .insert(discountWithTenant)
        .select()
        .single()
      
      if (dbError) {
        // Handle duplicate key error specifically
        if (dbError.code === '23505' && dbError.message.includes('discounts_code_key')) {
          throw new Error(`Der Gutscheincode "${discountData.code}" existiert bereits. Bitte wählen Sie einen anderen Code.`)
        }
        throw dbError
      }
      
      discounts.value.unshift(data)
      logger.debug('✅ Discount created with tenant_id:', data.id, userProfile.tenant_id)
      logger.debug('🔍 Created discount data:', { id: data.id, name: data.name, is_active: data.is_active })
      
      return data
    } catch (err: any) {
      console.error('❌ Error creating discount:', err)
      throw err
    }
  }

  const updateDiscount = async (id: string, updates: Partial<DiscountCode>) => {
    try {
      const { data, error: dbError } = await supabase
        .from('discounts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      
      if (dbError) throw dbError
      
      const index = discounts.value.findIndex(d => d.id === id)
      if (index !== -1) {
        discounts.value[index] = data
      }
      
      logger.debug('✅ Discount updated:', id)
      
      return data
    } catch (err: any) {
      console.error('❌ Error updating discount:', err)
      throw err
    }
  }

  const deleteDiscount = async (id: string) => {
    try {
      const { error: dbError } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id)
      
      if (dbError) throw dbError
      
      discounts.value = discounts.value.filter(d => d.id !== id)
      logger.debug('✅ Discount deleted:', id)
      
    } catch (err: any) {
      console.error('❌ Error deleting discount:', err)
      throw err
    }
  }

  return {
    // State
    discounts,
    isLoading,
    error,
    
    // Computed
    activeDiscounts,
    availableDiscounts,
    
    // Methods
    loadDiscounts,
    loadDiscountsByCategory,
    validateDiscountCode,
    applyDiscount,
    createDiscount,
    updateDiscount,
    deleteDiscount
  }
}
