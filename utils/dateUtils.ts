// utils/dateUtils.ts
// ✅ Korrigierte Datums- und Zeitformatierung für lokale Zeiten

/**
 * Konvertiert ein Date-Objekt zu einem ISO-String für die Datenbank
 * Wichtig: Zeiten sind bereits als lokale Zeiten in der DB gespeichert
 * Diese Funktion behält die lokale Zeit bei (keine UTC-Konvertierung)
 */
export const toLocalTimeString = (date: Date): string => {
  // Verwende lokale Zeit-Komponenten um lokale Zeit beizubehalten
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  // Format: YYYY-MM-DDTHH:MM:SS (lokale Zeit, kein Z)
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
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
      year: 'numeric'
    })
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Datum Fehler'
  }
}

/**
 * Formatiert eine Zeit als lokale Zeit (de-CH)
 * Extrahiert Zeit direkt aus dem String ohne Date-Objekt
 */
export const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Keine Zeit'
  
  try {
    // Debug: Log the actual string format
    console.log('formatTime input:', dateString)
    
    // Sehr flexibler Regex für verschiedene Formate
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2}).*?(\d{2}):(\d{2})/)
    
    if (!match) {
      console.warn('No regex match for dateString:', dateString)
      return 'Ungültige Zeit'
    }
    
    const [, year, month, day, hour, minute] = match
    
    // Format als de-CH: HH:MM
    return `${hour}:${minute}`
  } catch (error) {
    console.warn('Error formatting time:', dateString, error)
    return 'Zeit Fehler'
  }
}

/**
 * Formatiert Datum und Zeit zusammen
 * Extrahiert Zeit direkt aus dem String ohne Date-Objekt
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Kein Datum/Zeit'
  
  try {
    // Debug: Log the actual string format
    console.log('formatDateTime input:', dateString)
    
    // Sehr flexibler Regex für verschiedene Formate
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2}).*?(\d{2}):(\d{2})/)
    
    if (!match) {
      console.warn('No regex match for dateString:', dateString)
      return 'Ungültiges Datum/Zeit'
    }
    
    const [, year, month, day, hour, minute] = match
    
    // Format als de-CH: DD.MM.YYYY, HH:MM
    return `${day}.${month}.${year}, ${hour}:${minute}`
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