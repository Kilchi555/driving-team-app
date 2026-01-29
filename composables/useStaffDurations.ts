// composables/useStaffDurations.ts - Migriert zu API-basierten Abfragen
import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

export const useStaffDurations = () => {
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

  // Verfügbare Dauern für Staff + Kategorie via API laden
  const loadAvailableDurations = async (categoryCode: string, staffId: string) => {
    logger.debug('🔥 Loading durations from API for:', categoryCode, 'staff:', staffId)
    isLoading.value = true
    error.value = null

    try {
      const { durations } = await $fetch('/api/staff/durations', {
        method: 'GET',
        query: {
          categoryCode,
          staffId
        }
      })

      availableDurations.value = durations
      logger.debug('✅ Durations loaded via API:', durations)
      return durations

    } catch (err: any) {
      console.error('❌ Error loading durations from API:', err)
      error.value = err.message
      // Absoluter Fallback
      availableDurations.value = [45]
      return [45]
    } finally {
      isLoading.value = false
    }
  }

  // Staff preferred durations via API updaten
  const updateStaffDurations = async (staffId: string, newDurations: number[]) => {
    logger.debug('🔄 Updating staff durations via API:', newDurations)
    
    try {
      const result = await $fetch('/api/staff/durations', {
        method: 'POST',
        body: {
          staffId,
          newDurations
        }
      })

      logger.debug('✅ Staff durations updated via API:', result)
      
      // State aktualisieren
      availableDurations.value = newDurations.sort((a: number, b: number) => a - b)
      
      return result
      
    } catch (err: any) {
      console.error('❌ Error updating staff durations:', err)
      error.value = err.message
      throw err
    }
  }

  // Standard-Dauern für alle Kategorien (Fallback hardcoded)
  const loadAllPossibleDurations = async () => {
    logger.debug('🔥 Loading all possible durations')
    
    try {
      // Alle möglichen Dauern sammeln (15min steps von 45-240)
      const allDurations = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240]
      
      return allDurations.map(duration => ({
        value: duration,
        label: duration >= 120 
          ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
          : `${duration}min`,
        supportedCategories: []
      }))

    } catch (err: any) {
      console.error('❌ Error loading possible durations:', err)
      return []
    }
  }

  // Staff-Settings für User laden via API
  const loadStaffSettings = async (staffId: string) => {
    logger.debug('🔥 Loading staff settings from API')
    
    try {
      const { data } = await $fetch(`/api/staff/settings/${staffId}`, {
        method: 'GET'
      })
      
      return data
    } catch (err: any) {
      console.error('❌ Error loading staff settings:', err)
      return null
    }
  }

  // Erstes verfügbares Dauer zurückgeben
  const getDefaultDuration = () => {
    return availableDurations.value.length > 0 ? availableDurations.value[0] : 45
  }

  // Check ob Dauer verfügbar ist
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
    loadAvailableDurations,
    calculateAvailableDurations: loadAvailableDurations, // Alias für Kompatibilität
    updateStaffDurations,
    loadAllPossibleDurations,
    loadStaffSettings,
    
    // Utils
    getDefaultDuration,
    isDurationAvailable,
    reset
  }
}
