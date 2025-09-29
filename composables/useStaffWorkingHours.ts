// composables/useStaffWorkingHours.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export interface WorkingHour {
  id: string
  staff_id: string
  day_of_week: number // 1=Montag, 7=Sonntag
  start_time: string // Format: "07:00"
  end_time: string // Format: "18:00"
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkingHourForm {
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

const workingHours = ref<WorkingHour[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

// Wochentage für UI
export const WEEKDAYS = [
  { value: 1, label: 'Montag', short: 'Mo' },
  { value: 2, label: 'Dienstag', short: 'Di' },
  { value: 3, label: 'Mittwoch', short: 'Mi' },
  { value: 4, label: 'Donnerstag', short: 'Do' },
  { value: 5, label: 'Freitag', short: 'Fr' },
  { value: 6, label: 'Samstag', short: 'Sa' },
  { value: 7, label: 'Sonntag', short: 'So' }
]

// Computed: Arbeitszeiten gruppiert nach Wochentag
const workingHoursByDay = computed(() => {
  const grouped: Record<number, WorkingHour> = {}
  workingHours.value.forEach(hour => {
    grouped[hour.day_of_week] = hour
  })
  return grouped
})

// Computed: Aktive Arbeitszeiten
const activeWorkingHours = computed(() => {
  return workingHours.value.filter(hour => hour.is_active)
})

// Computed: Verfügbare Zeiten für Terminbuchung
const availableTimeSlots = computed(() => {
  const slots: Array<{ day: number; start: string; end: string }> = []
  
  activeWorkingHours.value.forEach(hour => {
    slots.push({
      day: hour.day_of_week,
      start: hour.start_time,
      end: hour.end_time
    })
  })
  
  return slots
})

// Methods
export const useStaffWorkingHours = () => {
  const supabase = getSupabase()

  // Arbeitszeiten laden
  const loadWorkingHours = async (staffId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      // RLS Policy sollte automatisch filtern, aber wir können trotzdem explizit filtern
      const { data, error: fetchError } = await supabase
        .from('staff_working_hours')
        .select(`
          *,
          users!inner(auth_user_id, first_name, last_name)
        `)
        .eq('staff_id', staffId)
        .order('day_of_week')

      if (fetchError) throw fetchError
      
      workingHours.value = data || []
      console.log('✅ Working hours loaded:', workingHours.value.length)
      
    } catch (err: any) {
      console.error('❌ Error loading working hours:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // Arbeitszeit speichern/aktualisieren
  const saveWorkingHour = async (staffId: string, workingHour: WorkingHourForm) => {
    try {
      console.log('💾 Saving working hour:', { staffId, workingHour })
      
      const { data, error: saveError } = await supabase
        .from('staff_working_hours')
        .upsert({
          staff_id: staffId,
          day_of_week: workingHour.day_of_week,
          start_time: workingHour.start_time,
          end_time: workingHour.end_time,
          is_active: workingHour.is_active
        })
        .select()
        .single()

      if (saveError) {
        console.error('❌ Save error details:', saveError)
        throw saveError
      }
      
      // Lokale Liste aktualisieren
      const existingIndex = workingHours.value.findIndex(
        h => h.day_of_week === workingHour.day_of_week
      )
      
      if (existingIndex >= 0) {
        workingHours.value[existingIndex] = data
      } else {
        workingHours.value.push(data)
      }
      
      console.log('✅ Working hour saved:', data)
      return data
      
    } catch (err: any) {
      console.error('❌ Error saving working hour:', err)
      throw err
    }
  }

  // Arbeitszeit löschen
  const deleteWorkingHour = async (staffId: string, dayOfWeek: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('staff_working_hours')
        .delete()
        .eq('staff_id', staffId)
        .eq('day_of_week', dayOfWeek)

      if (deleteError) throw deleteError
      
      // Lokale Liste aktualisieren
      workingHours.value = workingHours.value.filter(
        h => h.day_of_week !== dayOfWeek
      )
      
      console.log('✅ Working hour deleted for day:', dayOfWeek)
      
    } catch (err: any) {
      console.error('❌ Error deleting working hour:', err)
      throw err
    }
  }

  // Arbeitszeit aktivieren/deaktivieren
  const toggleWorkingHour = async (staffId: string, dayOfWeek: number, isActive: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('staff_working_hours')
        .update({ is_active: isActive })
        .eq('staff_id', staffId)
        .eq('day_of_week', dayOfWeek)

      if (updateError) throw updateError
      
      // Lokale Liste aktualisieren
      const hour = workingHours.value.find(h => h.day_of_week === dayOfWeek)
      if (hour) {
        hour.is_active = isActive
      }
      
      console.log('✅ Working hour toggled:', dayOfWeek, isActive)
      
    } catch (err: any) {
      console.error('❌ Error toggling working hour:', err)
      throw err
    }
  }

  // Prüfen ob Zeit verfügbar ist
  const isTimeAvailable = (dayOfWeek: number, startTime: string, endTime: string) => {
    const workingHour = workingHoursByDay.value[dayOfWeek]
    if (!workingHour || !workingHour.is_active) return false
    
    return startTime >= workingHour.start_time && endTime <= workingHour.end_time
  }

  // Arbeitszeiten für einen bestimmten Tag abrufen
  const getWorkingHoursForDay = (dayOfWeek: number) => {
    return workingHoursByDay.value[dayOfWeek] || null
  }

  // Alle aktiven Arbeitszeiten als Array für Kalender
  const getActiveWorkingHours = () => {
    return workingHours.value.filter(hour => hour.is_active)
  }

  // Prüfen ob ein Zeitpunkt außerhalb der Arbeitszeiten liegt
  const isOutsideWorkingHours = (dayOfWeek: number, time: string) => {
    const workingHour = workingHoursByDay.value[dayOfWeek]
    if (!workingHour || !workingHour.is_active) return true // Außerhalb wenn keine Arbeitszeiten definiert
    
    return time < workingHour.start_time || time > workingHour.end_time
  }

  // Standard-Arbeitszeiten setzen (Mo-Fr 07:00-18:00)
  const setDefaultWorkingHours = async (staffId: string) => {
    const defaultHours: WorkingHourForm[] = [
      { day_of_week: 1, start_time: '07:00', end_time: '18:00', is_active: true },
      { day_of_week: 2, start_time: '07:00', end_time: '18:00', is_active: true },
      { day_of_week: 3, start_time: '07:00', end_time: '18:00', is_active: true },
      { day_of_week: 4, start_time: '07:00', end_time: '18:00', is_active: true },
      { day_of_week: 5, start_time: '07:00', end_time: '18:00', is_active: true }
    ]

    try {
      for (const hour of defaultHours) {
        await saveWorkingHour(staffId, hour)
      }
      console.log('✅ Default working hours set')
    } catch (err: any) {
      console.error('❌ Error setting default working hours:', err)
      throw err
    }
  }

  return {
    // State
    workingHours: readonly(workingHours),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    workingHoursByDay,
    activeWorkingHours,
    availableTimeSlots,
    
    // Methods
    loadWorkingHours,
    saveWorkingHour,
    deleteWorkingHour,
    toggleWorkingHour,
    isTimeAvailable,
    getWorkingHoursForDay,
    getActiveWorkingHours,
    isOutsideWorkingHours,
    setDefaultWorkingHours
  }
}
