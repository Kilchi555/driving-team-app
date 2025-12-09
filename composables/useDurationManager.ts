// composables/useDurationManager.ts - Komplett neue Datei ohne Cache-Probleme
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

export const useDurationManager = () => {
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

  // Staff-Dauern direkt laden - KEINE Kategorie-Abfrage!
  const loadStaffDurations = async (staffId: string) => {
    logger.debug('🚀 useDurationManager - Loading staff durations for:', staffId)
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()

      // ✅ TENANT-FILTER: Erst Benutzer-Tenant ermitteln
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
      if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')

      // ✅ TENANT-GEFILTERTE Staff Settings laden
      logger.debug('📋 Querying staff_settings with tenant filter...')
      const { data: staffSettings, error: staffError } = await supabase
        .from('staff_settings')
        .select('preferred_durations')
        .eq('staff_id', staffId)
        .eq('tenant_id', userProfile.tenant_id)  // ✅ TENANT FILTER
        .maybeSingle()

      logger.debug('📋 Staff settings result:', { data: staffSettings, error: staffError })

      let finalDurations: number[] = []
      
      if (staffSettings?.preferred_durations) {
        logger.debug('👤 Raw staff durations:', staffSettings.preferred_durations)
        
        try {
          // Parse different formats
          if (staffSettings.preferred_durations.startsWith('[') && staffSettings.preferred_durations.endsWith(']')) {
            const jsonArray = JSON.parse(staffSettings.preferred_durations)
            
            finalDurations = jsonArray.map((item: any) => {
              const num = typeof item === 'string' ? parseInt(item) : item
              return isNaN(num) ? 0 : num
            }).filter((d: number) => d > 0).sort((a: number, b: number) => a - b)
            
            logger.debug('✅ Parsed durations:', finalDurations)
          } else if (staffSettings.preferred_durations.includes(',')) {
            // CSV format: "45,60,75,90"
            finalDurations = staffSettings.preferred_durations
              .split(',')
              .map((d: string) => parseInt(d.trim()))
              .filter((d: number) => !isNaN(d) && d > 0)
              .sort((a: number, b: number) => a - b)
            
            logger.debug('✅ Parsed CSV durations:', finalDurations)
          } else {
            // Single number
            const singleDuration = parseInt(staffSettings.preferred_durations)
            if (!isNaN(singleDuration) && singleDuration > 0) {
              finalDurations = [singleDuration]
              logger.debug('✅ Parsed single duration:', finalDurations)
            } else {
              logger.debug('⚠️ Invalid format, using fallback')
              finalDurations = [45]
            }
          }
        } catch (parseError) {
          console.error('❌ Parse error:', parseError)
          finalDurations = [45]
        }
      } else {
        logger.debug('⚠️ No staff settings found, using default [45]')
        finalDurations = [45]
      }

      availableDurations.value = finalDurations
      logger.debug('🎯 Final available durations:', finalDurations)
      return finalDurations

    } catch (err: any) {
      console.error('❌ Error loading staff durations:', err)
      error.value = err.message
      availableDurations.value = [45]
      return [45]
    } finally {
      isLoading.value = false
    }
  }

  // Staff preferred durations in DB updaten
  const updateStaffDurations = async (staffId: string, newDurations: number[]) => {
    logger.debug('🔄 Updating staff durations in DB:', newDurations)
    
    try {
      const supabase = getSupabase()
      
      // ✅ TENANT-FILTER: Erst Benutzer-Tenant ermitteln
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
      if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')
      
      // Als JSON Array speichern um konsistent mit bestehenden Daten zu sein
      const durationsString = JSON.stringify(newDurations.sort((a: number, b: number) => a - b))
      
      const { error: upsertError } = await supabase
        .from('staff_settings')
        .upsert({
          staff_id: staffId,
          tenant_id: userProfile.tenant_id,  // ✅ TENANT ID
          preferred_durations: durationsString,
          updated_at: toLocalTimeString(new Date)
        })

      if (upsertError) throw upsertError

      logger.debug('✅ Staff durations updated in DB as JSON:', durationsString)
      
      // State aktualisieren
      availableDurations.value = newDurations.sort((a: number, b: number) => a - b)
      
    } catch (err: any) {
      console.error('❌ Error updating staff durations:', err)
      error.value = err.message
      throw err
    }
  }

  // Standard-Dauern für alle Kategorien aus DB laden (für Settings UI)
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
        // Info für Settings UI
        category: 'all'
      }))

    } catch (err: any) {
      console.error('❌ Error loading possible durations:', err)
      return []
    }
  }

  // Staff-Settings für User laden
  const loadStaffSettings = async (staffId: string) => {
    logger.debug('🔥 Loading complete staff settings')
    
    try {
      const supabase = getSupabase()
      
      // ✅ TENANT-FILTER: Erst Benutzer-Tenant ermitteln
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
      if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')
      
      const { data, error } = await supabase
        .from('staff_settings')
        .select('*')
        .eq('staff_id', staffId)
        .eq('tenant_id', userProfile.tenant_id)  // ✅ TENANT FILTER
        .maybeSingle()

      if (error) throw error
      
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
    loadStaffDurations,
    updateStaffDurations,
    loadAllPossibleDurations,
    loadStaffSettings,
    
    // Utils
    getDefaultDuration,
    isDurationAvailable,
    reset
  }
}