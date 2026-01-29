// composables/useStaffCategoryDurations.ts - Migriert zu API-basierten Abfragen
import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

interface StaffCategoryDuration {
  id: string
  created_at: string
  staff_id: string
  category_code: string
  duration_minutes: number
  is_active: boolean
  display_order: number
}

export const useStaffCategoryDurations = () => {
  // State
  const availableDurations = ref<number[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed - formatierte Dauern für UI
  const formattedDurations = computed(() => {
    return availableDurations.value.map(duration => ({
      value: duration,
      label: duration >= 120 
        ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
        : `${duration}min`
    }))
  })

  // Load durations for staff + category via API
  const loadStaffCategoryDurations = async (staffId: string, categoryCode: string) => {
    logger.debug('🚀 Loading staff category durations via API:', { staffId, categoryCode })
    isLoading.value = true
    error.value = null

    try {
      const { durations } = await $fetch('/api/staff/category-durations', {
        method: 'GET',
        query: {
          staffId,
          categoryCode
        }
      })

      availableDurations.value = durations
      logger.debug('✅ Loaded durations:', availableDurations.value)
      return availableDurations.value

    } catch (err: any) {
      console.error('❌ Error loading staff category durations:', err)
      error.value = err.message
      availableDurations.value = [45]
      return [45]
    } finally {
      isLoading.value = false
    }
  }

  // Save durations for staff + category via API
  const saveStaffCategoryDurations = async (
    staffId: string, 
    categoryCode: string, 
    durations: number[]
  ) => {
    logger.debug('💾 Saving staff category durations via API:', { staffId, categoryCode, durations })
    
    try {
      const result = await $fetch('/api/staff/category-durations', {
        method: 'POST',
        body: {
          staffId,
          categoryCode,
          durations
        }
      })

      availableDurations.value = durations.sort((a: number, b: number) => a - b)
      logger.debug('✅ Staff category durations saved successfully')
      return result

    } catch (err: any) {
      console.error('❌ Error saving staff category durations:', err)
      error.value = err.message
      throw err
    }
  }

  // Load all durations for staff (for settings) via API
  const loadAllStaffDurations = async (staffId: string) => {
    logger.debug('📋 Loading all staff durations via API')
    
    try {
      const { durations } = await $fetch('/api/staff/all-durations', {
        method: 'GET',
        query: { staffId }
      })

      return durations

    } catch (err: any) {
      console.error('❌ Error loading all staff durations:', err)
      return []
    }
  }

  // Create default durations - TODO: This requires server-side endpoint
  const createDefaultDurations = async (staffId: string) => {
    logger.debug('🏗️ Creating default durations for new staff via API')
    
    try {
      // Note: This would need a dedicated endpoint to be implemented
      // For now, we'll throw an error indicating it needs manual setup
      throw new Error('Default duration creation should be handled by backend during staff creation')

    } catch (err: any) {
      console.error('❌ Error creating default durations:', err)
      throw err
    }
  }

  // Get first available duration
  const getDefaultDuration = () => {
    return availableDurations.value.length > 0 ? availableDurations.value[0] : 45
  }

  // Check if duration is available
  const isDurationAvailable = (duration: number) => {
    return availableDurations.value.includes(duration)
  }

  // Reset state
  const reset = () => {
    availableDurations.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    availableDurations: computed(() => availableDurations.value),
    formattedDurations,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Actions
    loadStaffCategoryDurations,
    saveStaffCategoryDurations,
    loadAllStaffDurations,
    createDefaultDurations,
    
    // Utils
    getDefaultDuration,
    isDurationAvailable,
    reset
  }
}
