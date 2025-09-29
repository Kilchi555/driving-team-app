// composables/useDiscounts.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

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
      const { data: { user } } = await supabase.auth.getUser()
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
        .order('created_at', { ascending: false })
      
      if (dbError) throw dbError
      
      discounts.value = data || []
      console.log('✅ Discounts loaded for tenant:', discounts.value.length, userProfile.tenant_id)
      console.log('📋 Loaded discount IDs:', discounts.value.map(d => ({ id: d.id, name: d.name, code: d.code })))
      
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
      const { data: { user } } = await supabase.auth.getUser()
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
      const { data, error: dbError } = await supabase
        .from('discounts')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single()
      
      if (dbError || !data) {
        return {
          isValid: false,
          discount_amount_rappen: 0,
          error: 'Gutscheincode nicht gefunden'
        }
      }

      const discount = data as Discount
      
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
      const { error: dbError } = await supabase
        .from('discounts')
        .update({ 
          usage_count: supabase.sql`usage_count + 1`,
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
      
      console.log('✅ Discount applied:', discountId)
      
    } catch (err: any) {
      console.error('❌ Error applying discount:', err)
      throw err
    }
  }

  const createDiscount = async (discountData: Partial<DiscountCode>) => {
    try {
      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('No tenant_id found for user')

      // Add tenant_id to discount data
      const discountWithTenant = {
        ...discountData,
        tenant_id: userProfile.tenant_id
      }

      const { data, error: dbError } = await supabase
        .from('discounts')
        .insert(discountWithTenant)
        .select()
        .single()
      
      if (dbError) throw dbError
      
      discounts.value.unshift(data)
      console.log('✅ Discount created with tenant_id:', data.id, userProfile.tenant_id)
      
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
      
      console.log('✅ Discount updated:', id)
      
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
      console.log('✅ Discount deleted:', id)
      
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
