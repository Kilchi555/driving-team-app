// composables/useEventTypes.ts
import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

// ✅ Globaler Cache ausserhalb der Factory — wird über alle Instanzen geteilt
const _eventTypesCache = ref<string[]>([])
const _eventTypesFullCache = ref<any[]>([])
const _isEventTypesLoaded = ref(false)
const _isFullLoaded = ref(false)

export const useEventTypes = () => {
  const eventTypesCache = _eventTypesCache
  const eventTypesFullCache = _eventTypesFullCache
  const isEventTypesLoaded = _isEventTypesLoaded
  
  const loadEventTypes = async (excludeTypes: string[] = [], loadFullObjects: boolean = false) => {
    // ✅ Cache für Full-Objects (EventTypeSelector)
    if (loadFullObjects && _isFullLoaded.value && excludeTypes.length === 0) {
      logger.debug('✅ Using cached full event types')
      return eventTypesFullCache.value
    }
    
    // ✅ Cache für nur Codes (andere Aufrufer)
    if (!loadFullObjects && isEventTypesLoaded.value) return eventTypesCache.value
    
    try {
      logger.debug('🔄 Loading event types via API...')
      
      const response = await $fetch('/api/event-types/list', {
        method: 'GET'
      }) as any

      if (!response?.data) {
        throw new Error('No event types returned from API')
      }

      const data = response.data

      logger.debug('🔍 All event type codes from API:', (data || []).map((et: any) => et.code))
      
      // ✅ Immer beide Caches befüllen
      const allCodes = data?.map((et: any) => et.code) || []
      eventTypesCache.value = allCodes
      isEventTypesLoaded.value = true

      const fullData = data || []
      eventTypesFullCache.value = fullData
      _isFullLoaded.value = true
      
      if (loadFullObjects) {
        const filteredData = excludeTypes.length > 0
          ? fullData.filter((eventType: any) => !excludeTypes.includes(eventType.code))
          : fullData
        
        logger.debug('✅ Full event types loaded (filtered):', filteredData.length, 'of', data?.length, 'total')
        return filteredData
        
      } else {
        const filtered = allCodes.filter((code: string) => !excludeTypes.includes(code))
        logger.debug('✅ Event types loaded:', filtered, excludeTypes.length > 0 ? `(excluded: ${excludeTypes.join(', ')})` : '')
        return filtered
      }
      
    } catch (err: any) {
      console.error('❌ Error loading event types from API:', err)
      
      if (loadFullObjects) {
        logger.debug('⚠️ Using empty fallback for event types (loadFullObjects mode)')
        return []
      } else {
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
