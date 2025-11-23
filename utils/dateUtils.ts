// utils/dateUtils.ts
// ✅ Korrigierte Datums- und Zeitformatierung für lokale Zeiten

/**
 * ⚠️ DEPRECATED: Verwendet alte Logik, verwende stattdessen localTimeToUTC
 * 
 * Diese Funktion speichert Zeiten falsch! Sie nimmt Browser-Timezone statt Zurich.
 * Verwende localTimeToUTC() stattdessen!
 */
export const toLocalTimeString = (date: Date): string => {
  // FALLBACK - NICHT VERWENDEN FÜR NEUE TERMINE!
  const isoString = date.toISOString()
  return isoString.substring(0, 19) // YYYY-MM-DDTHH:MM:SS
}

/**
 * Konvertiert eine eingegeben Zeit (gedacht als Zurich local) zu UTC ISO-String
 * 
 * ✅ KORREKT: Speichert als UTC
 * 
 * INPUT: Date-Objekt der in Browser-TZ ist mit der GEWOLLTEN Zurich-Zeit
 *        z.B. new Date("2025-11-24T11:00:00") = User meinte 11:00 Zurich
 * 
 * OUTPUT: ISO-String in UTC (z.B. "2025-11-24T10:00:00" für 11:00 Zurich wenn UTC+1)
 * 
 * Die Logik:
 * 1. Berechne Zurich offset für dieses Datum
 * 2. Zurich-Zeit minus Offset = UTC-Zeit
 * 3. Speichere UTC-Zeit in DB
 */
export const localTimeToUTC = (date: Date): string => {
  // Berechne Zurich offset mittels Intl
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  // Midnight UTC für diese Datum
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const midnightUtc = new Date(Date.UTC(year, month, day, 0, 0, 0))
  
  // Was ist die Zurich-Zeit wenn UTC midnight ist?
  const zurichMidnightStr = formatter.format(midnightUtc)
  const match = zurichMidnightStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
  if (!match) return date.toISOString().substring(0, 19)
  
  const [, , , , zurichHour, zurichMin, zurichSec] = match
  const zurichOffsetMinutes = (parseInt(zurichHour) * 60) + parseInt(zurichMin)
  const zurichOffsetMs = zurichOffsetMinutes * 60 * 1000
  
  // Die Input date ist "11:00" im Browser
  // Das ist "11:00" in lokaler Browser-Zeit
  // Aber wir wollen es als "11:00" Zurich interpretieren
  // Also: Berechne UTC Zeit = 11:00 Zurich - Offset
  
  // Input date Zeit in MS seit epoch
  const inputTimeMs = date.getTime()
  // Das ist die Zurich-Zeit! Jetzt minus Offset = UTC
  const utcTimeMs = inputTimeMs - zurichOffsetMs
  
  const utcDate = new Date(utcTimeMs)
  return utcDate.toISOString().substring(0, 19)
}

/**
 * Formatiert ein Datum als lokale Zeit (de-CH)
 * Konvertiert UTC-Zeiten zu lokaler Zeit für die Anzeige
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Kein Datum'
  
  try {
    // PostgreSQL speichert Zeiten als UTC, konvertiere zu lokaler Zeit
    const date = new Date(dateString)
    
    // Prüfe ob das Datum gültig ist
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Zurich'
    })
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Datum Fehler'
  }
}

/**
 * Formatiert eine Zeit als lokale Zeit (de-CH)
 * Konvertiert UTC-Zeiten aus der DB zu lokaler Zeit (Europe/Zurich) für die Anzeige
 */
export const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Keine Zeit'
  
  try {
    // PostgreSQL speichert Zeiten als UTC, konvertiere zu lokaler Zeit
    const date = new Date(dateString)
    
    // Prüfe ob das Datum gültig ist
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString)
      return 'Ungültige Zeit'
    }
    
    // Format als de-CH: HH:MM mit expliziter Zeitzone Europe/Zurich
    return date.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Zurich'
    })
  } catch (error) {
    console.warn('Error formatting time:', dateString, error)
    return 'Zeit Fehler'
  }
}

/**
 * Formatiert Datum und Zeit zusammen
 * Konvertiert UTC-Zeiten aus der DB zu lokaler Zeit (Europe/Zurich) für die Anzeige
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Kein Datum/Zeit'
  
  try {
    // PostgreSQL speichert Zeiten als UTC, konvertiere zu lokaler Zeit
    const date = new Date(dateString)
    
    // Prüfe ob das Datum gültig ist
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString)
      return 'Ungültiges Datum/Zeit'
    }
    
    // Format als de-CH: DD.MM.YYYY, HH:MM mit expliziter Zeitzone Europe/Zurich
    return date.toLocaleString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zurich'
    })
  } catch (error) {
    console.warn('Error formatting dateTime:', dateString, error)
    return 'Datum/Zeit Fehler'
  }
}

/**
 * Erstellt ein Date-Objekt aus einem Zeitstring
 * Konvertiert UTC-Zeiten zu lokaler Zeit
 */
export const createLocalDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null
  
  try {
    // PostgreSQL speichert Zeiten als UTC, konvertiere zu lokaler Zeit
    const date = new Date(dateString)
    
    // Prüfe ob das Datum gültig ist
    if (isNaN(date.getTime())) {
      return null
    }
    
    return date
  } catch (error) {
    console.warn('Error creating local date:', dateString, error)
    return null
  }
}

/**
 * Formatiert ein Datum mit Monat und Jahr (de-CH)
 * Konvertiert UTC-Zeiten zu lokaler Zeit für die Anzeige
 */
export const formatMonthYear = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Kein Datum'
  
  try {
    // PostgreSQL speichert Zeiten als UTC, konvertiere zu lokaler Zeit
    const date = new Date(dateString)
    
    // Prüfe ob das Datum gültig ist
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    
    return date.toLocaleDateString('de-CH', { 
      month: 'long', 
      year: 'numeric' 
    })
  } catch (error) {
    console.warn('Error formatting monthYear:', dateString, error)
    return 'Datum Fehler'
  }
}

/**
 * Formatiert ein Datum mit Monat, Tag und Jahr (de-CH)
 * Konvertiert UTC-Zeiten zu lokaler Zeit für die Anzeige
 */
export const formatMonthDayYear = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Kein Datum'
  
  try {
    // PostgreSQL speichert Zeiten als UTC, konvertiere zu lokaler Zeit
    const date = new Date(dateString)
    
    // Prüfe ob das Datum gültig ist
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    return date.toLocaleDateString('de-CH', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric' 
    })
  } catch (error) {
    console.warn('Error formatting monthDayYear:', dateString, error)
    return 'Datum Fehler'
  }
}

/**
 * Formatiert ein Datum kurz (de-CH)
 * Konvertiert UTC-Zeiten zu lokaler Zeit für die Anzeige
 */
export const formatDateShort = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Kein Datum'
  
  try {
    // PostgreSQL speichert Zeiten als UTC, konvertiere zu lokaler Zeit
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    })
  } catch (error) {
    console.warn('Error formatting dateShort:', dateString, error)
    return 'Datum Fehler'
  }
}

/**
 * Formatiert eine Zeit kurz (de-CH)
 * Konvertiert UTC-Zeiten zu lokaler Zeit für die Anzeige
 */
export const formatTimeShort = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Keine Zeit'
  
  try {
    // PostgreSQL speichert Zeiten als UTC, konvertiere zu lokaler Zeit
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      return 'Ungültige Zeit'
    }
    
    return date.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch (error) {
    console.warn('Error formatting timeShort:', dateString, error)
    return 'Zeit Fehler'
  }
}