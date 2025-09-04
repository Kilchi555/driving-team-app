// composables/useEventTypes.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useEventTypes = () => {
  const eventTypesCache = ref<string[]>([])
  const eventTypesFullCache = ref<any[]>([]) // ✅ NEU: Für komplette Objekte
  const isEventTypesLoaded = ref(false)
  
  // useEventModalForm.ts - erweitern Sie die loadEventTypes Funktion
  const loadEventTypes = async (excludeTypes: string[] = [], loadFullObjects: boolean = false) => {
    if (isEventTypesLoaded.value && !loadFullObjects) return eventTypesCache.value
    
    try {
      const supabase = getSupabase()
      console.log('🔄 Loading event types from database...')
      
      const { data, error } = await supabase
        .from('event_types')
        .select(loadFullObjects ? '*' : 'code')
        .eq('is_active', true)
        .order('display_order')
      
      if (error) throw error
      
      if (loadFullObjects) {
        // ✅ DEBUG: Alle Event Type Codes anzeigen
        console.log('🔍 All event type codes in DB:', (data || []).map(et => et.code))
        
        // Filter anwenden für komplette Objekte
        const filteredData = (data || []).filter(eventType => 
          !excludeTypes.includes(eventType.code)
        )
        
        console.log('✅ Full event types loaded (filtered):', filteredData.length, 'of', data?.length, 'total')
        return filteredData
        
      } else {
        // Original Code logic für nur Codes
        const allCodes = data?.map((et: any) => et.code) || []
        console.log('🔍 All event type codes in DB:', allCodes)
        
        eventTypesCache.value = allCodes.filter(code => !excludeTypes.includes(code))
        isEventTypesLoaded.value = true
        
        console.log('✅ Event types loaded:', eventTypesCache.value, excludeTypes.length > 0 ? `(excluded: ${excludeTypes.join(', ')})` : '')
        return eventTypesCache.value
      }
      
    } catch (err) {
      console.error('❌ Error loading event types from DB:', err)
      
      if (loadFullObjects) {
        return []
      } else {
        // Fallback ohne excluded types
        eventTypesCache.value = ['meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other']
        isEventTypesLoaded.value = true
        return eventTypesCache.value
      }
    }
  }
  
  return {
    eventTypesCache: computed(() => eventTypesCache.value),
    isEventTypesLoaded: computed(() => isEventTypesLoaded.value),
    loadEventTypes
  }
}


