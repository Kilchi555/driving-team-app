// composables/useStaffWorkingHours.ts
import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

// ===== TIMEZONE CONVERSION HELPERS =====
// Arbeitszeiten werden in UTC gespeichert, aber in Lokalzeit (Europe/Zurich) angezeigt

/**
 * Konvertiert eine lokale Zeit (z.B. "07:00") zu UTC
 * Europe/Zurich ist UTC+1 (Winter) oder UTC+2 (Sommer)
 */
function localTimeToUtc(localTime: string): string {
  if (!localTime) return localTime
  
  // Parse die Zeit
  const [hours, minutes] = localTime.split(':').map(Number)
  
  // Erstelle ein Datum für heute mit dieser Zeit in der lokalen Timezone
  const now = new Date()
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0)
  
  // Hole die UTC-Stunden und -Minuten
  const utcHours = localDate.getUTCHours()
  const utcMinutes = localDate.getUTCMinutes()
  
  const result = `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`
  logger.debug(`🕐 Local→UTC: ${localTime} → ${result}`)
  return result
}

/**
 * Konvertiert eine UTC-Zeit (z.B. "06:00") zu lokaler Zeit (Europe/Zurich)
 */
function utcTimeToLocal(utcTime: string): string {
  if (!utcTime) return utcTime
  
  // Parse die Zeit (entferne Sekunden falls vorhanden)
  const timePart = utcTime.split(':').slice(0, 2).join(':')
  const [hours, minutes] = timePart.split(':').map(Number)
  
  // Erstelle ein UTC-Datum für heute mit dieser Zeit
  const now = new Date()
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0))
  
  // Konvertiere zu lokaler Zeit
  const localHours = utcDate.getHours()
  const localMinutes = utcDate.getMinutes()
  
  const result = `${localHours.toString().padStart(2, '0')}:${localMinutes.toString().padStart(2, '0')}`
  logger.debug(`🕐 UTC→Local: ${utcTime} → ${result}`)
  return result
}

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
  // Arbeitszeiten laden
  const loadWorkingHours = async (staffId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      // Fetch from API instead of direct Supabase
      const data = await $fetch('/api/staff/working-hours', {
        method: 'POST',
        body: {
          action: 'list',
          staffId
        }
      }) as any

      if (!data?.success) throw new Error('Failed to load working hours')
      
      // Konvertiere UTC-Zeiten zu Lokalzeit für die Anzeige
      workingHours.value = (data.data || []).map((wh: any) => ({
        ...wh,
        start_time: utcTimeToLocal(wh.start_time),
        end_time: utcTimeToLocal(wh.end_time)
      }))
      logger.debug('✅ Working hours loaded:', workingHours.value.length)
      
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
      logger.debug('💾 Saving working hour:', { staffId, workingHour })
      
      // Convert to UTC for storage
      const utcStartTime = localTimeToUtc(workingHour.start_time)
      const utcEndTime = localTimeToUtc(workingHour.end_time)
      
      // Save via API
      const response = await $fetch('/api/staff/working-hours', {
        method: 'POST',
        body: {
          action: 'save',
          staffId,
          dayOfWeek: workingHour.day_of_week,
          startTime: workingHour.is_active ? utcStartTime : null,
          endTime: workingHour.is_active ? utcEndTime : null,
          isActive: workingHour.is_active
        }
      }) as any

      if (!response?.success) throw new Error('Failed to save working hours')
      
      logger.debug('✅ Working hour saved')
      
    } catch (err: any) {
      console.error('❌ Error saving working hour:', err)
      throw err
    }
  }
      
  // Mehrere Arbeitszeit-Blöcke speichern (für erweiterte UI)
  const saveWorkingDay = async (staffId: string, workingDay: WorkingDayForm) => {
    try {
      logger.debug('💾 Saving working day with multiple blocks:', { staffId, workingDay })
      
      // Convert to UTC for storage
      const utcBlocks = (workingDay.blocks || []).map(block => ({
        ...block,
        start_time: localTimeToUtc(block.start_time),
        end_time: localTimeToUtc(block.end_time)
      }))
      
      // Save via API
      const response = await $fetch('/api/staff/working-hours', {
        method: 'POST',
        body: {
          action: 'save_day',
          staffId,
          dayOfWeek: workingDay.day_of_week,
          blocks: utcBlocks
        }
      }) as any

      if (!response?.success) throw new Error('Failed to save working day')
      
      logger.debug('✅ Working day saved')
      return response.data
      
    } catch (err: any) {
      console.error('❌ Error saving working day:', err)
      throw err
    }
  }

  // Arbeitszeit löschen
  const deleteWorkingHour = async (staffId: string, dayOfWeek: number) => {
    try {
      const response = await $fetch('/api/staff/working-hours-manage', {
        method: 'POST',
        body: {
          action: 'delete',
          staffId,
          dayOfWeek
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to delete working hour')
      }
      
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
      const response = await $fetch('/api/staff/working-hours-manage', {
        method: 'POST',
        body: {
          action: 'toggle',
          staffId,
          dayOfWeek,
          isActive
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to toggle working hour')
      }
      
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
