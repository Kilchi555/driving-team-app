// composables/useStaffDurations.ts - Komplett Datenbank-getrieben
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

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

  // Verfügbare Dauern für Staff + Kategorie aus Datenbank laden
  const loadAvailableDurations = async (categoryCode: string, staffId: string) => {
    console.log('🔥 Loading durations from DB for:', categoryCode, 'staff:', staffId)
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()

      // 1. Staff Settings laden (preferred_durations)
      const { data: staffSettings, error: staffError } = await supabase
        .from('staff_settings')
        .select('preferred_durations')
        .eq('staff_id', staffId)
        .maybeSingle()

      if (staffError) {
        console.log('⚠️ No staff settings found, will use category defaults')
      }

      // 2. Kategorie aus DB laden (für Fallback-Dauer)
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('lesson_duration, code')
        .eq('code', categoryCode)
        .eq('is_active', true)
        .maybeSingle()

      if (categoryError) throw categoryError

      if (!category) {
        throw new Error(`Kategorie ${categoryCode} nicht gefunden`)
      }

      // 3. Staff preferred_durations parsen
      let finalDurations: number[] = []
      
      if (staffSettings?.preferred_durations) {
        // Staff hat eigene Dauern konfiguriert
        finalDurations = staffSettings.preferred_durations
          .split(',')
          .map((d: string) => parseInt(d.trim()))
          .filter((d: number) => !isNaN(d) && d > 0)
          .sort((a: number, b: number) => a - b)
        
        console.log('✅ Using staff configured durations:', finalDurations)
      } else {
        // Fallback: Standard-Dauer der Kategorie
        finalDurations = [category.lesson_duration || 45]
        console.log('⚠️ No staff durations found, using category default:', finalDurations)
      }

      availableDurations.value = finalDurations
      return finalDurations

    } catch (err: any) {
      console.error('❌ Error loading durations from DB:', err)
      error.value = err.message
      // Absoluter Fallback
      availableDurations.value = [45]
      return [45]
    } finally {
      isLoading.value = false
    }
  }

  // Staff preferred durations in DB updaten
  const updateStaffDurations = async (staffId: string, newDurations: number[]) => {
    console.log('🔄 Updating staff durations in DB:', newDurations)
    
    try {
      const supabase = getSupabase()
      // Als JSON Array speichern um konsistent mit bestehenden Daten zu sein
      const durationsString = JSON.stringify(newDurations.sort((a: number, b: number) => a - b))
      
      const { error: upsertError } = await supabase
        .from('staff_settings')
        .upsert({
          staff_id: staffId,
          preferred_durations: durationsString,
          updated_at: new Date().toISOString()
        })

      if (upsertError) throw upsertError

      console.log('✅ Staff durations updated in DB as JSON:', durationsString)
      
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
    console.log('🔥 Loading all possible durations from DB')
    
    try {
      const supabase = getSupabase()
      
      // Alle aktiven Kategorien laden
      const { data: categories, error } = await supabase
        .from('categories')
        .select('code, lesson_duration')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error

      // Alle möglichen Dauern sammeln (15min steps von 45-240)
      const allDurations = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240]
      
      return allDurations.map(duration => ({
        value: duration,
        label: duration >= 120 
          ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
          : `${duration}min`,
        // Zeige welche Kategorien diese Dauer unterstützen (Info für Settings)
        supportedCategories: categories?.filter(cat => {
          // Logik welche Kategorien welche Dauern unterstützen kann in DB erweitert werden
          return duration >= (cat.lesson_duration || 45)
        }).map(cat => cat.code) || []
      }))

    } catch (err: any) {
      console.error('❌ Error loading possible durations:', err)
      return []
    }
  }

  // Staff-Settings für User laden
  const loadStaffSettings = async (staffId: string) => {
    console.log('🔥 Loading complete staff settings from DB')
    
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('staff_settings')
        .select('*')
        .eq('staff_id', staffId)
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