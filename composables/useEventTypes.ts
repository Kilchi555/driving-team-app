// composables/useEventTypes.ts
import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

export const useEventTypes = () => {
  const eventTypesCache = ref<string[]>([])
  const eventTypesFullCache = ref<any[]>([]) // ✅ NEU: Für komplette Objekte
  const isEventTypesLoaded = ref(false)
  
  // useEventModalForm.ts - erweitern Sie die loadEventTypes Funktion
  const loadEventTypes = async (excludeTypes: string[] = [], loadFullObjects: boolean = false) => {
    if (isEventTypesLoaded.value && !loadFullObjects) return eventTypesCache.value
    
    try {
      logger.debug('🔄 Loading event types via API...')
      
      // ✅ Use secure API endpoint instead of direct DB access
      const response = await $fetch('/api/event-types/list', {
        method: 'GET'
      }) as any

      if (!response?.data) {
        throw new Error('No event types returned from API')
      }

      const data = response.data

      logger.debug('🔍 All event type codes from API:', (data || []).map((et: any) => et.code))
      
      if (loadFullObjects) {
        // Filter anwenden für komplette Objekte
        const filteredData = (data || []).filter((eventType: any) => 
          !excludeTypes.includes(eventType.code)
        )
        
        logger.debug('✅ Full event types loaded (filtered):', filteredData.length, 'of', data?.length, 'total')
        eventTypesFullCache.value = filteredData
        return filteredData
        
      } else {
        // Original Code logic für nur Codes
        const allCodes = data?.map((et: any) => et.code) || []
        logger.debug('🔍 All event type codes from API:', allCodes)
        
        eventTypesCache.value = allCodes.filter((code: string) => !excludeTypes.includes(code))
        isEventTypesLoaded.value = true
        
        logger.debug('✅ Event types loaded:', eventTypesCache.value, excludeTypes.length > 0 ? `(excluded: ${excludeTypes.join(', ')})` : '')
        return eventTypesCache.value
      }
      
    } catch (err: any) {
      console.error('❌ Error loading event types from API:', err)
      
      if (loadFullObjects) {
        // Fallback: Return empty array - will use online fallback
        logger.debug('⚠️ Using empty fallback for event types (loadFullObjects mode)')
        return []
      } else {
        // Fallback ohne excluded types
        logger.debug('⚠️ Using fallback event types')
        eventTypesCache.value = ['meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other']
        isEventTypesLoaded.value = true
        return eventTypesCache.value
      }
    }
  }
  
  return {
    eventTypesCache: computed(() => eventTypesCache.value),
    eventTypesFullCache: computed(() => eventTypesFullCache.value),
    isEventTypesLoaded: computed(() => isEventTypesLoaded.value),
    loadEventTypes
  }
}


