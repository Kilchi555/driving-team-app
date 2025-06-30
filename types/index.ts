// types/index.ts (oder eine ähnliche Datei)
// Füge dies zu deinen bestehenden Typen hinzu

export interface Location {
  id: string; // UUID
  created_at: string; // ISO-Datum String
  staff_id: string; // UUID des zugehörigen Fahrlehrers
  name: string; // Name des Ortes, z.B. "Bahnhof Uster", "Meine Garage"
  address: string; // Vollständige Adresse des Ortes
}

// types/index.ts - Neue Datei erstellen
export interface User {
  id: string
  email: string | null  // ✅ Email kann null sein
  role: 'client' | 'staff' | 'admin'
  first_name: string | null
  last_name: string | null
  phone?: string | null
  is_active: boolean
  assigned_staff_id?: string | null
  category?: string | null
  created_at?: string
}

export interface CalendarApi {
  today(): void
  next(): void
  prev(): void
  getDate(): Date
  view: {
    currentStart: Date
  }
}

export interface DashboardState {
  showStaffSettings: boolean
  showCustomers: boolean
  showPendenzen: boolean
  showEinstellungen: boolean
  currentMonth: string
  isTodayActive: boolean
  pendingCount: number
}