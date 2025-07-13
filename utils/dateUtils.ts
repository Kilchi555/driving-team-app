// utils/dateUtils.ts

// Beispiel für eine Funktion, die du bereits hast und korrekt exportieren könntest
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 09.07.2025
  return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

// Beispiel für formatTime
export const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 06:33
  return new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
};

// Hier müssen formatDateTime, formatDateShort und formatTimeShort hinzugefügt werden,
// falls sie noch nicht vorhanden sind, und mit 'export' versehen werden.

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 09.07.2025 06:33
  return new Intl.DateTimeFormat('de-CH', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  }).format(date);
};

// Diese beiden sind entscheidend für deinen Fehler:
export const formatDateShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 09.07.2025
  return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const formatTimeShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 06:33
  return new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
};