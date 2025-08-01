// utils/dateUtils.ts - Ersetzen Sie die toLocalTimeString Funktion:

// ✅ KORRIGIERTE FUNKTION: Lokale Zeit ohne UTC-Konvertierung
export const toLocalTimeString = (date: Date): string => {
  // ❌ NICHT verwenden: date.toISOString() - das konvertiert nach UTC!
  // ✅ STATTDESSEN: Manuell die lokalen Werte verwenden
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  const result = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  
  // Debug: Zeige was passiert
  console.log('🔍 toLocalTimeString:', {
    input: date,
    inputTime: `${date.getHours()}:${date.getMinutes()}`,
    output: result,
    outputTime: `${hours}:${minutes}`
  })
  
  return result
}

// Zusätzliche Helper-Funktion für bessere Debugging:
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatTimeForInput = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// Die anderen Funktionen bleiben unverändert:
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
};

export const formatDateShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const formatTimeShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
};