// composables/useStaffCategoryDurations.ts - Neue saubere DB-Struktur
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

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

  // Dauern für Staff + Kategorie laden
  const loadStaffCategoryDurations = async (staffId: string, categoryCode: string) => {
    console.log('🚀 Loading staff category durations:', { staffId, categoryCode })
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()

      const { data, error: fetchError } = await supabase
        .from('staff_category_durations')
        .select('duration_minutes')
        .eq('staff_id', staffId)
        .eq('category_code', categoryCode)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (fetchError) throw fetchError

      const durations = data?.map(item => item.duration_minutes) || []
      
      // Fallback wenn keine spezifischen Dauern gefunden
      if (durations.length === 0) {
        console.log('⚠️ No specific durations found, using category default')
        
        // Hole Standard-Dauer aus categories Tabelle
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('lesson_duration_minutes')
          .eq('code', categoryCode)
          .eq('is_active', true)
          .maybeSingle()

        if (categoryError) throw categoryError
        
        const defaultDuration = categoryData?.lesson_duration_minutes || 45
        availableDurations.value = [defaultDuration]
      } else {
        availableDurations.value = durations.sort((a: number, b: number) => a - b)
      }

      console.log('✅ Loaded durations:', availableDurations.value)
      return availableDurations.value

    } catch (err: any) {
      console.error('❌ Error loading staff category durations:', err)
      error.value = err.message
      // Absoluter Fallback
      availableDurations.value = [45]
      return [45]
    } finally {
      isLoading.value = false
    }
  }

  // Dauern für Staff + Kategorie speichern
  const saveStaffCategoryDurations = async (
    staffId: string, 
    categoryCode: string, 
    durations: number[]
  ) => {
    console.log('💾 Saving staff category durations:', { staffId, categoryCode, durations })
    
    try {
      const supabase = getSupabase()

      // Erst alle bestehenden Einträge für diesen Staff + Kategorie löschen
      const { error: deleteError } = await supabase
        .from('staff_category_durations')
        .delete()
        .eq('staff_id', staffId)
        .eq('category_code', categoryCode)

      if (deleteError) throw deleteError

      // Neue Einträge einfügen
      const insertData = durations.map((duration, index) => ({
        staff_id: staffId,
        category_code: categoryCode,
        duration_minutes: duration,
        display_order: index + 1,
        is_active: true
      }))

      const { error: insertError } = await supabase
        .from('staff_category_durations')
        .insert(insertData)

      if (insertError) throw insertError

      // State aktualisieren
      availableDurations.value = durations.sort((a: number, b: number) => a - b)
      
      console.log('✅ Staff category durations saved successfully')

    } catch (err: any) {
      console.error('❌ Error saving staff category durations:', err)
      error.value = err.message
      throw err
    }
  }

  // Alle Dauern eines Staff laden (für Settings)
  const loadAllStaffDurations = async (staffId: string) => {
    console.log('📋 Loading all staff durations for settings')
    
    try {
      const supabase = getSupabase()

      const { data, error: fetchError } = await supabase
        .from('staff_category_durations')
        .select(`
          category_code,
          duration_minutes,
          display_order,
          categories (name)
        `)
        .eq('staff_id', staffId)
        .eq('is_active', true)
        .order('category_code')
        .order('display_order')

      if (fetchError) throw fetchError

      // Gruppiere nach Kategorie
      const groupedDurations = data?.reduce((acc: any, item: any) => {
        if (!acc[item.category_code]) {
          acc[item.category_code] = {
            categoryCode: item.category_code,
            categoryName: item.categories?.name || item.category_code,
            durations: []
          }
        }
        acc[item.category_code].durations.push(item.duration_minutes)
        return acc
      }, {}) || {}

      return Object.values(groupedDurations)

    } catch (err: any) {
      console.error('❌ Error loading all staff durations:', err)
      return []
    }
  }

  // Standard-Dauern für neue Staff erstellen
  const createDefaultDurations = async (staffId: string) => {
    console.log('🏗️ Creating default durations for new staff')
    
    try {
      const supabase = getSupabase()

      // Lade alle aktiven Kategorien
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('code, lesson_duration_minutes')
        .eq('is_active', true)

      if (categoriesError) throw categoriesError

      // Erstelle Standard-Dauern für jede Kategorie
      const defaultDurations = categories?.flatMap(category => {
        const baseDuration = category.lesson_duration_minutes || 45
        
        // Erstelle 2-3 Standard-Optionen basierend auf der Kategorie
        const durations = [baseDuration]
        if (baseDuration >= 45) durations.push(baseDuration + 45) // +45min
        if (baseDuration <= 135) durations.push(baseDuration + 90) // +90min
        
        return durations.map((duration, index) => ({
          staff_id: staffId,
          category_code: category.code,
          duration_minutes: duration,
          display_order: index + 1,
          is_active: true
        }))
      }) || []

      const { error: insertError } = await supabase
        .from('staff_category_durations')
        .insert(defaultDurations)

      if (insertError) throw insertError

      console.log('✅ Default durations created for all categories')

    } catch (err: any) {
      console.error('❌ Error creating default durations:', err)
      throw err
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