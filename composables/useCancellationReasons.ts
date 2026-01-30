import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

export interface CancellationReason {
  id: string
  code: string
  name_de: string
  description_de?: string
  is_active: boolean
  sort_order: number
  cancellation_type?: 'student' | 'staff'
  created_at: string
  updated_at: string
}

export const useCancellationReasons = () => {
  const cancellationReasons = ref<CancellationReason[]>([])
  const allCancellationReasons = ref<CancellationReason[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Fetch active cancellation reasons (for general use)
  const fetchCancellationReasons = async () => {
    try {
      isLoading.value = true
      error.value = null

      // Get current user's tenant_id
      const authStore = useAuthStore()
      const currentUser = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }

      logger.debug('🔍 Cancellation Reasons - Current tenant_id:', tenantId)

      const { data, error: fetchError } = await supabase
        .from('cancellation_reasons')
        .select('*')
        .eq('is_active', true)
        .eq('tenant_id', tenantId) // Filter by current tenant
        .order('sort_order', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      cancellationReasons.value = data || []
    } catch (err) {
      console.error('Error fetching cancellation reasons:', err)
      error.value = err instanceof Error ? err.message : 'Failed to fetch cancellation reasons'
    } finally {
      isLoading.value = false
    }
  }

  // Fetch all cancellation reasons (for admin management)
  const fetchAllCancellationReasons = async () => {
    try {
      isLoading.value = true
      error.value = null

      // Get current user's tenant_id
      const authStore = useAuthStore()
      const currentUser = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }

      logger.debug('🔍 All Cancellation Reasons - Current tenant_id:', tenantId)

      const { data, error: fetchError } = await supabase
        .from('cancellation_reasons')
        .select('*')
        .eq('tenant_id', tenantId) // Filter by current tenant
        .order('sort_order', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      allCancellationReasons.value = data || []
      cancellationReasons.value = data?.filter(reason => reason.is_active) || []
    } catch (err) {
      console.error('Error fetching all cancellation reasons:', err)
      error.value = err instanceof Error ? err.message : 'Failed to fetch cancellation reasons'
    } finally {
      isLoading.value = false
    }
  }

  // Create new cancellation reason
  const createCancellationReason = async (reasonData: Omit<CancellationReason, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      isLoading.value = true
      error.value = null

      // Get current user's tenant_id
      const authStore = useAuthStore()
      const currentUser = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }

      const { data, error: createError } = await supabase
        .from('cancellation_reasons')
        .insert([{ ...reasonData, tenant_id: tenantId }])
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // Refresh the lists
      await fetchAllCancellationReasons()
      return data
    } catch (err) {
      console.error('Error creating cancellation reason:', err)
      error.value = err instanceof Error ? err.message : 'Failed to create cancellation reason'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Update cancellation reason
  const updateCancellationReason = async (id: string, updates: Partial<Omit<CancellationReason, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('cancellation_reasons')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // Refresh the lists
      await fetchAllCancellationReasons()
      return data
    } catch (err) {
      console.error('Error updating cancellation reason:', err)
      error.value = err instanceof Error ? err.message : 'Failed to update cancellation reason'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Delete cancellation reason (soft delete by setting is_active to false)
  const deleteCancellationReason = async (id: string) => {
    try {
      isLoading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('cancellation_reasons')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      // Refresh the lists
      await fetchAllCancellationReasons()
    } catch (err) {
      console.error('Error deleting cancellation reason:', err)
      error.value = err instanceof Error ? err.message : 'Failed to delete cancellation reason'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Computed properties for filtered reasons
  const studentCancellationReasons = computed(() => {
    return cancellationReasons.value.filter(reason => 
      reason.cancellation_type === 'student'
    )
  })

  const staffCancellationReasons = computed(() => {
    return cancellationReasons.value.filter(reason => 
      reason.cancellation_type === 'staff'
    )
  })

  return {
    // Data
    cancellationReasons,
    allCancellationReasons,
    studentCancellationReasons,
    staffCancellationReasons,
    
    // State
    isLoading,
    error,
    
    // Actions
    fetchCancellationReasons,
    fetchAllCancellationReasons,
    createCancellationReason,
    updateCancellationReason,
    deleteCancellationReason
  }
}
