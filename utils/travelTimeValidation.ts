/**
 * Travel Time Validation Utilities
 * Prüft ob ein Fahrlehrer zwischen Terminen genug Zeit hat
 */

interface Appointment {
  id: string
  start_time: string
  end_time: string
  location_id?: string
  custom_location_address?: string
  locations?: {
    address: string
  }
}

interface Location {
  id: string
  address: string
  plz?: string
}

interface ValidationResult {
  isValid: boolean
  reason?: string
  travelTimeMinutes?: number
  availableTimeMinutes?: number
}

/**
 * Extrahiert PLZ aus einer Adresse
 */
export function extractPLZFromAddress(address: string): string | null {
  if (!address) return null
  
  // Suche nach 4-stelliger Zahl (Schweizer PLZ)
  const match = address.match(/\b(\d{4})\b/)
  return match ? match[1] : null
}

/**
 * Prüft ob genug Zeit zwischen zwei Terminen ist
 */
export async function validateTravelTimeBetweenAppointments(
  previousAppointment: Appointment | null,
  nextAppointment: Appointment | null,
  newSlotStart: Date,
  newSlotEnd: Date,
  newLocationPLZ: string,
  maxTravelTimeMinutes: number,
  googleApiKey: string,
  peakSettings?: any
): Promise<ValidationResult> {
  
  // Kein vorheriger oder nächster Termin = OK
  if (!previousAppointment && !nextAppointment) {
    return { isValid: true }
  }

  // Prüfe vorherigen Termin
  if (previousAppointment) {
    const prevEndTime = new Date(previousAppointment.end_time)
    const timeDiffMinutes = (newSlotStart.getTime() - prevEndTime.getTime()) / 1000 / 60

    // Hole PLZ vom vorherigen Termin
    let prevPLZ: string | null = null
    if (previousAppointment.custom_location_address) {
      prevPLZ = extractPLZFromAddress(previousAppointment.custom_location_address)
    } else if (previousAppointment.locations?.address) {
      prevPLZ = extractPLZFromAddress(previousAppointment.locations.address)
    }

    if (prevPLZ && prevPLZ !== newLocationPLZ) {
      // Berechne Fahrzeit via Server-Side API
      try {
        const response = await $fetch<{ travelTime: number }>('/api/pickup/check-distance', {
          method: 'POST',
          body: {
            fromPLZ: prevPLZ,
            toPLZ: newLocationPLZ,
            appointmentTime: newSlotStart.toISOString()
          },
          timeout: 10000
        })
        
        const travelTime = response.travelTime

        if (travelTime === null || travelTime === undefined) {
          console.warn('Could not calculate travel time from previous appointment')
          return {
            isValid: false,
            reason: 'Fahrzeit konnte nicht berechnet werden'
          }
        }

      // Prüfe ob genug Zeit vorhanden ist (Fahrzeit + 5 Min Puffer)
      const requiredTime = travelTime + 5
      
      if (timeDiffMinutes < requiredTime) {
        return {
          isValid: false,
          reason: `Nicht genug Zeit vom vorherigen Termin (${Math.round(timeDiffMinutes)} Min verfügbar, ${requiredTime} Min benötigt)`,
          travelTimeMinutes: travelTime,
          availableTimeMinutes: Math.round(timeDiffMinutes)
        }
      }

        // Prüfe ob Fahrzeit innerhalb des Max-Radius liegt
        if (travelTime > maxTravelTimeMinutes) {
          return {
            isValid: false,
            reason: `Zu weit vom vorherigen Termin entfernt (${travelTime} Min, max ${maxTravelTimeMinutes} Min)`,
            travelTimeMinutes: travelTime
          }
        }
      } catch (error) {
        console.error('Error fetching travel time:', error)
        return {
          isValid: false,
          reason: 'Fahrzeit konnte nicht berechnet werden'
        }
      }
    }
  }

  // Prüfe nächsten Termin
  if (nextAppointment) {
    const nextStartTime = new Date(nextAppointment.start_time)
    const timeDiffMinutes = (nextStartTime.getTime() - newSlotEnd.getTime()) / 1000 / 60

    // Hole PLZ vom nächsten Termin
    let nextPLZ: string | null = null
    if (nextAppointment.custom_location_address) {
      nextPLZ = extractPLZFromAddress(nextAppointment.custom_location_address)
    } else if (nextAppointment.locations?.address) {
      nextPLZ = extractPLZFromAddress(nextAppointment.locations.address)
    }

    if (nextPLZ && nextPLZ !== newLocationPLZ) {
      // Berechne Fahrzeit via Server-Side API
      try {
        const response = await $fetch<{ travelTime: number }>('/api/pickup/check-distance', {
          method: 'POST',
          body: {
            fromPLZ: newLocationPLZ,
            toPLZ: nextPLZ,
            appointmentTime: nextStartTime.toISOString()
          },
          timeout: 10000
        })
        
        const travelTime = response.travelTime

        if (travelTime === null || travelTime === undefined) {
          console.warn('Could not calculate travel time to next appointment')
          return {
            isValid: false,
            reason: 'Fahrzeit konnte nicht berechnet werden'
          }
        }

      // Prüfe ob genug Zeit vorhanden ist (Fahrzeit + 5 Min Puffer)
      const requiredTime = travelTime + 5
      
      if (timeDiffMinutes < requiredTime) {
        return {
          isValid: false,
          reason: `Nicht genug Zeit zum nächsten Termin (${Math.round(timeDiffMinutes)} Min verfügbar, ${requiredTime} Min benötigt)`,
          travelTimeMinutes: travelTime,
          availableTimeMinutes: Math.round(timeDiffMinutes)
        }
      }

        // Prüfe ob Fahrzeit innerhalb des Max-Radius liegt
        if (travelTime > maxTravelTimeMinutes) {
          return {
            isValid: false,
            reason: `Zu weit vom nächsten Termin entfernt (${travelTime} Min, max ${maxTravelTimeMinutes} Min)`,
            travelTimeMinutes: travelTime
          }
        }
      } catch (error) {
        console.error('Error fetching travel time:', error)
        return {
          isValid: false,
          reason: 'Fahrzeit konnte nicht berechnet werden'
        }
      }
    }
  }

  return { isValid: true }
}

/**
 * Prüft ob ein Slot innerhalb der definierten Zeitfenster liegt
 */
export function isWithinTimeWindows(
  slotStart: Date,
  timeWindows: Array<{ start: string; end: string; days: number[] }>
): boolean {
  // Keine Zeitfenster definiert = immer verfügbar
  if (!timeWindows || timeWindows.length === 0) {
    return true
  }

  const dayOfWeek = slotStart.getDay() // 0 = Sunday, 6 = Saturday
  const hour = slotStart.getHours()
  const minute = slotStart.getMinutes()
  const timeInMinutes = hour * 60 + minute

  // Prüfe jedes Zeitfenster
  for (const window of timeWindows) {
    // Prüfe ob Wochentag passt
    if (!window.days.includes(dayOfWeek)) {
      continue
    }

    // Parse Start und End Zeit
    const [startHour, startMinute] = window.start.split(':').map(Number)
    const [endHour, endMinute] = window.end.split(':').map(Number)
    
    const startInMinutes = startHour * 60 + startMinute
    const endInMinutes = endHour * 60 + endMinute

    // Prüfe ob Zeit innerhalb des Fensters liegt
    if (timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes) {
      return true
    }
  }

  return false
}

