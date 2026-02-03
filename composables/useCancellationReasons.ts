import { ref, computed } from 'vue'

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

      const response = await $fetch('/api/cancellation-reasons/list-active', {
        method: 'GET'
      }) as any

      // Handle response format: { success: true, data: [...] }
      const reasons = response?.data
      if (!reasons || !Array.isArray(reasons)) {
        console.warn('⚠️ Invalid response structure:', response)
        throw new Error('Invalid response from API')
      }

      cancellationReasons.value = reasons
      console.debug('✅ Fetched cancellation reasons:', reasons.length)
    } catch (err) {
      console.error('❌ Error fetching cancellation reasons:', err)
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

      const response = await $fetch('/api/cancellation-reasons/list-all', {
        method: 'GET'
      }) as any

      // Handle response format: { success: true, data: [...] }
      const reasons = response?.data
      if (!reasons || !Array.isArray(reasons)) {
        console.warn('⚠️ Invalid response structure:', response)
        throw new Error('Invalid response from API')
      }

      allCancellationReasons.value = reasons
      cancellationReasons.value = reasons.filter(reason => reason.is_active)
      console.debug('✅ Fetched all cancellation reasons:', reasons.length)
    } catch (err) {
      console.error('❌ Error fetching all cancellation reasons:', err)
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

      const response = await $fetch('/api/cancellation-reasons/create', {
        method: 'POST',
        body: reasonData
      }) as any

      if (!response?.data) {
        throw new Error('Failed to create cancellation reason')
      }

      // Refresh the lists
      await fetchAllCancellationReasons()
      return response.data
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

      const response = await $fetch('/api/cancellation-reasons/update', {
        method: 'POST',
        body: { id, ...updates }
      }) as any

      if (!response?.data) {
        throw new Error('Failed to update cancellation reason')
      }

      // Refresh the lists
      await fetchAllCancellationReasons()
      return response.data
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

      await $fetch('/api/cancellation-reasons/delete', {
        method: 'POST',
        body: { id }
      })

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
