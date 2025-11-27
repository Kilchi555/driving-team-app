// utils/dateUtils.ts
// ✅ Korrigierte Datums- und Zeitformatierung für lokale Zeiten

/**
 * ✅ Konvertiert ein Date-Objekt zu lokalem Zeit-String (OHNE UTC-Konversion!)
 * 
 * WICHTIG: Diese Funktion wird vom Kalender verwendet, wenn auf einen Slot geklickt wird.
 * Der Kalender gibt ein Date-Objekt, das bereits die korrekte lokale Zeit enthält.
 * 
 * INPUT: Date-Objekt vom Kalender (z.B. 09:00 Zurich local time)
 * OUTPUT: ISO-String OHNE Timezone (z.B. "2025-11-27T09:00:00")
 * 
 * KEINE UTC-Konversion hier! Das passiert später in useEventModalForm.ts!
 */
export const toLocalTimeString = (date: Date): string => {
  // ✅ DIREKT die lokalen Komponenten extrahieren (KEINE UTC-Konversion!)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
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
 * MATHEMATIK:
 * - UTC midnight = 00:00
 * - Zurich timezone offset = +1 (winter) oder +2 (summer)
 * - Wenn UTC ist 00:00, dann ist es 01:00 in Zurich (offset)
 * - User gibt 11:00 ein (gemeint als Zurich-Zeit)
 * - UTC equivalent = 11:00 - 1 Stunde = 10:00 UTC
 * 
 * Browser behavior:
 * - new Date("2025-11-24T11:00") = 11:00 in BROWSER's local timezone
 * - Wenn Browser auch in Zurich-TZ: Das ist schon richtig
 * - Wenn Browser woanders: Falsch! Aber wir berechnen offset dynamisch
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
  // z.B. "01:00" (UTC+1 im Winter) oder "02:00" (UTC+2 im Sommer)
  const zurichMidnightStr = formatter.format(midnightUtc)
  const match = zurichMidnightStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
  if (!match) return date.toISOString().substring(0, 19)
  
  const [, , , , zurichHour, zurichMin] = match
  const zurichOffsetHours = parseInt(zurichHour)
  const zurichOffsetMinutes = (zurichOffsetHours * 60) + parseInt(zurichMin)
  const zurichOffsetMs = zurichOffsetMinutes * 60 * 1000
  
  // Die Input date wurde vom Browser als lokale Zeit interpretiert
  // z.B. new Date("2025-11-24T11:00") = 11:00 in Browser-TZ
  // 
  // Aber wir wollen es als 11:00 ZURICH Zeit speichern
  // Problem: Browser kennt Zurich nicht, nur seine eigene TZ
  // 
  // Lösung: 
  // 1. Input ist das was der Browser sieht (z.B. 11:00)
  // 2. Das soll 11:00 Zurich sein
  // 3. UTC = Zurich-Time - Zurich-Offset
  // 4. Also: UTC = input - offset
  
  const inputTimeMs = date.getTime()
  // WICHTIG: Das ist die Zeit wie der Browser sie sieht
  // Wenn Input "2025-11-24T11:00" war und Browser in Zurich: 
  //   inputTimeMs = die absolute Zeit für 11:00 Zurich
  // Wenn Browser in UTC:
  //   inputTimeMs = die absolute Zeit für 11:00 UTC
  // 
  // Wir wollen IMMER die UTC Zeit!
  // Also: inputTimeMs repräsentiert "11:00 in Browser-TZ"
  // Wir wollen "11:00 in Zurich-TZ"
  // Wenn Browser ≠ Zurich: wir müssen die Differenz rausrechnen
  //
  // Browser-Offset = getTimezoneOffset() (immer negative Werte)
  // z.B. UTC-Bereich: -0, UTC+1-Bereich: -60, etc
  // 
  // Browser-Offset zur Zurich-Offset Umrechnung:
  const browserOffsetMinutes = date.getTimezoneOffset() // NEGATIVE werte!
  const browserOffsetMs = browserOffsetMinutes * 60 * 1000
  
  // Input ist "11:00 in Browser-TZ"
  // Umwandeln zu UTC: addiere Browser-Offset (macht Negativ!)
  // Dann von UTC zu Zurich: subtrahiere Zurich-Offset
  // Dann von Zurich zu UTC (für DB): subtrahiere Zurich-Offset nochmal
  
  // Einfacher: 
  // UTC = Input + BrowserOffset - ZurichOffset
  // Warum: 
  //   Input + BrowserOffset = Die absolute UTC-Zeit
  //   Aber die ist "11:00 UTC" wenn Browser in UTC
  //   Wir wollen "11:00 Zurich" also UTC-equivalent
  //   11:00 Zurich - 1h = 10:00 UTC
  //   Also - ZurichOffset nochmal
  
  const utcTimeMs = inputTimeMs + browserOffsetMs - zurichOffsetMs
  
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