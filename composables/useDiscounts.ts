// composables/useDiscounts.ts
import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'
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
      
      logger.debug('🔄 Loading discounts via API...')
      
      // ✅ Use secure API endpoint instead of direct Supabase query
      const response = await $fetch('/api/discounts/list')
      
      if (!response.success || !response.data) {
        throw new Error('Failed to load discounts from API')
      }
      
      discounts.value = response.data
      logger.debug('✅ Discounts loaded via API:', discounts.value.length)
      logger.debug('📋 Loaded discount IDs:', discounts.value.map(d => ({ 
        id: d.id, 
        name: d.name, 
        code: d.code, 
        is_active: d.is_active,
        discount_type: d.discount_type,
        is_voucher: d.is_voucher,
        usage_limit: d.usage_limit,
        max_per_user: d.max_per_user,
        usage_count: d.usage_count
      })))
      
    } catch (err: any) {
      logger.error('❌ Error loading discounts:', err.message)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const loadDiscountsByCategory = async (categoryCode: string) => {
    try {
      logger.debug('🔄 Loading discounts for category via API:', categoryCode)
      
      // ✅ Use secure API endpoint
      const response = await $fetch(`/api/discounts/by-category/${categoryCode}`)
      
      if (!response.success) {
        throw new Error('Failed to load discounts by category')
      }
      
      logger.debug('✅ Category discounts loaded:', response.data?.length || 0)
      return response.data || []
    } catch (err: any) {
      logger.error('❌ Error loading discounts by category:', err.message)
      return []
    }
  }

  const validateDiscountCode = async (
    code: string, 
    amount_rappen: number, 
    categoryCode?: string
  ): Promise<DiscountValidationResult> => {
    try {
      logger.debug('🔄 Validating discount code via API:', code)
      
      // ✅ Use secure API endpoint
      const response = await $fetch('/api/discounts/validate', {
        method: 'POST',
        body: {
          code,
          amount_rappen,
          categoryCode
        }
      })
      
      logger.debug('✅ Discount validation result:', response.isValid)
      return response
    } catch (err: any) {
      logger.error('❌ Error validating discount code:', err.message)
      return {
        isValid: false,
        discount_amount_rappen: 0,
        error: 'Fehler bei der Gutscheinprüfung'
      }
    }
  }

  const applyDiscount = async (discountId: string) => {
    try {
      logger.debug('🔄 Applying discount via API:', discountId)
      
      // ✅ Use secure API endpoint
      const response = await $fetch(`/api/discounts/apply/${discountId}`, {
        method: 'POST'
      })
      
      if (!response.success) {
        throw new Error('Failed to apply discount')
      }
      
      // Aktualisiere lokalen State
      const discount = discounts.value.find(d => d.id === discountId)
      if (discount) {
        discount.usage_count = response.usage_count
        discount.updated_at = new Date().toISOString()
      }
      
      logger.debug('✅ Discount applied via API:', discountId)
      
    } catch (err: any) {
      logger.error('❌ Error applying discount:', err.message)
      throw err
    }
  }

  const createDiscount = async (discountData: Partial<DiscountCode>) => {
    try {
      logger.debug('🔄 Creating discount via API')
      
      // ✅ Use existing save.post endpoint
      const response = await $fetch('/api/discounts/save', {
        method: 'POST',
        body: discountData
      })
      
      if (!response.success) {
        throw new Error('Failed to create discount')
      }
      
      discounts.value.unshift(response.data)
      logger.debug('✅ Discount created via API:', response.data.id)
      
      return response.data
    } catch (err: any) {
      logger.error('❌ Error creating discount:', err.message)
      throw err
    }
  }

  const updateDiscount = async (id: string, updates: Partial<DiscountCode>) => {
    try {
      logger.debug('🔄 Updating discount via API:', id)
      
      // ✅ Use existing save.post endpoint
      const response = await $fetch('/api/discounts/save', {
        method: 'POST',
        body: { id, ...updates }
      })
      
      if (!response.success) {
        throw new Error('Failed to update discount')
      }
      
      const index = discounts.value.findIndex(d => d.id === id)
      if (index !== -1) {
        discounts.value[index] = response.data
      }
      
      logger.debug('✅ Discount updated via API:', id)
      
      return response.data
    } catch (err: any) {
      logger.error('❌ Error updating discount:', err.message)
      throw err
    }
  }

  const deleteDiscount = async (id: string) => {
    try {
      logger.debug('🔄 Deleting discount via API:', id)
      
      // ✅ TODO: Create DELETE endpoint if needed, for now use soft delete via update
      const response = await $fetch('/api/discounts/save', {
        method: 'POST',
        body: { 
          id, 
          deleted_at: new Date().toISOString()
        }
      })
      
      if (!response.success) {
        throw new Error('Failed to delete discount')
      }
      
      discounts.value = discounts.value.filter(d => d.id !== id)
      logger.debug('✅ Discount deleted via API:', id)
      
    } catch (err: any) {
      logger.error('❌ Error deleting discount:', err.message)
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
