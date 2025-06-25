// types/index.ts (oder eine ähnliche Datei)
// Füge dies zu deinen bestehenden Typen hinzu

export interface Location {
  id: string; // UUID
  created_at: string; // ISO-Datum String
  staff_id: string; // UUID des zugehörigen Fahrlehrers
  name: string; // Name des Ortes, z.B. "Bahnhof Uster", "Meine Garage"
  address: string; // Vollständige Adresse des Ortes
}

// ... deine anderen Interfaces wie Category, TeacherCategory, User