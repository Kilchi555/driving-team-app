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

export interface WorkingHourBlock {
  id?: string
  start_time: string
  end_time: string
  is_active: boolean
}

export interface WorkingDayForm {
  day_of_week: number
  is_active: boolean
  blocks: WorkingHourBlock[]
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
    // Nur aktive Arbeitszeiten für die Hauptanzeige verwenden
    if (hour.is_active) {
      grouped[hour.day_of_week] = hour
    }
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
      logger.debug('✅ Working hours loaded:', workingHours.value.length)
      
    } catch (err: any) {
      console.error('❌ Error loading working hours:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // Arbeitszeit speichern/aktualisieren - erstellt automatisch Nicht-Arbeitszeiten
  const saveWorkingHour = async (staffId: string, workingHour: WorkingHourForm) => {
    try {
      logger.debug('💾 Saving working hour:', { staffId, workingHour })
      
      // Get tenant_id for this staff
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', staffId)
        .single()
      
      if (userError || !userData?.tenant_id) {
        console.error('❌ Could not get tenant_id:', userError)
        throw new Error('Tenant-ID nicht gefunden')
      }
      
      // Erst alle bestehenden Einträge für diesen Tag löschen
      // WICHTIG: .select() hinzufügen um zu prüfen ob wirklich gelöscht wurde!
      const { data: deletedRows, error: deleteError } = await supabase
        .from('staff_working_hours')
        .delete()
        .eq('staff_id', staffId)
        .eq('day_of_week', workingHour.day_of_week)
        .select()
      
      if (deleteError) {
        console.error('❌ Error deleting existing hours:', deleteError)
        throw deleteError
      }
      
      logger.debug(`🗑️ Deleted ${deletedRows?.length || 0} existing entries for day ${workingHour.day_of_week}`)
      
      const entries = []
      
      if (workingHour.is_active) {
        // 1. Arbeitszeit-Eintrag (für Verfügbarkeitsprüfung)
        entries.push({
          staff_id: staffId,
          tenant_id: userData.tenant_id,
          day_of_week: workingHour.day_of_week,
          start_time: workingHour.start_time,
          end_time: workingHour.end_time,
          is_active: true
        })
        
        // 2. Nicht-Arbeitszeit: 00:00 bis Arbeitsbeginn
        if (workingHour.start_time !== '00:00') {
          entries.push({
            staff_id: staffId,
            tenant_id: userData.tenant_id,
            day_of_week: workingHour.day_of_week,
            start_time: '00:00',
            end_time: workingHour.start_time,
            is_active: false
          })
        }
        
        // 3. Nicht-Arbeitszeit: Arbeitsende bis 23:59
        if (workingHour.end_time !== '23:59') {
          entries.push({
            staff_id: staffId,
            tenant_id: userData.tenant_id,
            day_of_week: workingHour.day_of_week,
            start_time: workingHour.end_time,
            end_time: '23:59',
            is_active: false
          })
        }
      } else {
        // Ganzer Tag als Nicht-Arbeitszeit
        entries.push({
          staff_id: staffId,
          tenant_id: userData.tenant_id,
          day_of_week: workingHour.day_of_week,
          start_time: '00:00',
          end_time: '23:59',
          is_active: false
        })
      }
      
      // Alle Einträge einfügen
      const { data: insertData, error: insertError } = await supabase
        .from('staff_working_hours')
        .insert(entries)
        .select()
      
      if (insertError) throw insertError
      
      // Lokale Liste aktualisieren
      workingHours.value = workingHours.value.filter(
        h => h.day_of_week !== workingHour.day_of_week
      )
      workingHours.value.push(...insertData)
      
      logger.debug('✅ Working hours saved:', insertData.length, 'entries')
      return insertData
      
    } catch (err: any) {
      console.error('❌ Error saving working hour:', err)
      throw err
    }
  }

  // Mehrere Arbeitszeit-Blöcke speichern (für erweiterte UI)
  const saveWorkingDay = async (staffId: string, workingDay: WorkingDayForm) => {
    try {
      logger.debug('💾 Saving working day with multiple blocks:', { staffId, workingDay })
      
      // Get tenant_id for this staff
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', staffId)
        .single()
      
      if (userError || !userData?.tenant_id) {
        console.error('❌ Could not get tenant_id:', userError)
        throw new Error('Tenant-ID nicht gefunden')
      }
      
      // Erst alle bestehenden Einträge für diesen Tag löschen
      // WICHTIG: .select() hinzufügen um zu prüfen ob wirklich gelöscht wurde!
      const { data: deletedRows, error: deleteError } = await supabase
        .from('staff_working_hours')
        .delete()
        .eq('staff_id', staffId)
        .eq('day_of_week', workingDay.day_of_week)
        .select()
      
      if (deleteError) {
        console.error('❌ Error deleting existing hours:', deleteError)
        throw deleteError
      }
      
      logger.debug(`🗑️ Deleted ${deletedRows?.length || 0} existing entries for day ${workingDay.day_of_week}`)
      
      // Wenn RLS das Löschen blockiert hat, warnen
      if (deletedRows && deletedRows.length === 0) {
        logger.debug('⚠️ No rows deleted - RLS might be blocking DELETE operation')
      }
      
      const entries = []
      
      if (workingDay.is_active && workingDay.blocks.length > 0) {
        // Sortiere Blöcke nach Startzeit
        const sortedBlocks = workingDay.blocks.sort((a, b) => a.start_time.localeCompare(b.start_time))
        
        // Arbeitszeit-Blöcke hinzufügen
        sortedBlocks.forEach(block => {
          entries.push({
            staff_id: staffId,
            tenant_id: userData.tenant_id,
            day_of_week: workingDay.day_of_week,
            start_time: block.start_time,
            end_time: block.end_time,
            is_active: true
          })
        })
        
        // Nicht-Arbeitszeiten zwischen den Blöcken und am Anfang/Ende hinzufügen
        let currentTime = '00:00'
        
        sortedBlocks.forEach(block => {
          if (currentTime < block.start_time) {
            entries.push({
              staff_id: staffId,
              tenant_id: userData.tenant_id,
              day_of_week: workingDay.day_of_week,
              start_time: currentTime,
              end_time: block.start_time,
              is_active: false
            })
          }
          currentTime = block.end_time
        })
        
        // Nach dem letzten Block bis 23:59
        if (currentTime < '23:59') {
          entries.push({
            staff_id: staffId,
            tenant_id: userData.tenant_id,
            day_of_week: workingDay.day_of_week,
            start_time: currentTime,
            end_time: '23:59',
            is_active: false
          })
        }
      } else {
        // Ganzer Tag als Nicht-Arbeitszeit
        entries.push({
          staff_id: staffId,
          tenant_id: userData.tenant_id,
          day_of_week: workingDay.day_of_week,
          start_time: '00:00',
          end_time: '23:59',
          is_active: false
        })
      }
      
      // Alle Einträge einfügen
      const { data: insertData, error: insertError } = await supabase
        .from('staff_working_hours')
        .insert(entries)
        .select()
      
      if (insertError) throw insertError
      
      // Lokale Liste aktualisieren
      workingHours.value = workingHours.value.filter(
        h => h.day_of_week !== workingDay.day_of_week
      )
      workingHours.value.push(...insertData)
      
      logger.debug('✅ Working day saved:', insertData.length, 'entries')
      return insertData
      
    } catch (err: any) {
      console.error('❌ Error saving working day:', err)
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
      
      logger.debug('✅ Working hour deleted for day:', dayOfWeek)
      
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
      
      logger.debug('✅ Working hour toggled:', dayOfWeek, isActive)
      
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
    // Suche nach aktiven Arbeitszeiten für diesen Tag
    const activeHour = workingHours.value.find(hour => 
      hour.day_of_week === dayOfWeek && hour.is_active
    )
    return activeHour || null
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
      logger.debug('✅ Default working hours set')
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
    saveWorkingDay, // Neue Funktion für mehrere Blöcke
    deleteWorkingHour,
    toggleWorkingHour,
    isTimeAvailable,
    getWorkingHoursForDay,
    getActiveWorkingHours,
    isOutsideWorkingHours,
    setDefaultWorkingHours
  }
}
