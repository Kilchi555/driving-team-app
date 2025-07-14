// types/student.ts - Geteilte Student-Types für die gesamte Anwendung

export interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
  preferred_location_id?: string
  preferred_duration?: number 
}

export interface StudentFromDB {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  assigned_staff_id: string | null
  preferred_location_id: string | null
  role: 'client' | 'staff' | 'admin'
  is_active: boolean
  created_at?: string
}

/**
 * Hilfsfunktion zur Konvertierung von DB-User zu Student
 */
export function convertDBUserToStudent(user: StudentFromDB): Student {
  return {
    id: user.id,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    phone: user.phone || '',
    category: user.category || '',
    assigned_staff_id: user.assigned_staff_id || '',
    preferred_location_id: user.preferred_location_id || undefined
  }
}

/**
 * Type-Guard zur Überprüfung ob ein Objekt ein Student ist
 */
export function isStudent(obj: any): obj is Student {
  return obj && 
         typeof obj.id === 'string' &&
         typeof obj.first_name === 'string' &&
         typeof obj.last_name === 'string' &&
         typeof obj.email === 'string' &&
         typeof obj.phone === 'string' &&
         typeof obj.category === 'string' &&
         typeof obj.assigned_staff_id === 'string'
}