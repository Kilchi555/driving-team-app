// utils/studentCache.ts
export interface CachedStudent {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
  cached_at: number
}

const CACHE_KEY = 'driving_team_students_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 Stunden

/**
 * Speichert Schüler im localStorage Cache
 */
export const cacheStudents = (students: any[], staffId: string): void => {
  try {
    const cacheData = {
      staff_id: staffId,
      cached_at: Date.now(),
      students: students.map(student => ({
        id: student.id,
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        email: student.email || '',
        phone: student.phone || '',
        category: student.category || '',
        assigned_staff_id: student.assigned_staff_id || staffId,
        cached_at: Date.now()
      }))
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    console.log(`✅ Cached ${students.length} students for staff ${staffId}`)
    
  } catch (error) {
    console.error('❌ Error caching students:', error)
  }
}

/**
 * Lädt Schüler aus dem Cache
 */
export const getCachedStudents = (staffId: string): CachedStudent[] => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) {
      console.log('📦 No students in cache')
      return []
    }
    
    const cacheData = JSON.parse(cached)
    
    // Prüfe ob Cache für richtigen Staff
    if (cacheData.staff_id !== staffId) {
      console.log('⚠️ Cache is for different staff, clearing')
      localStorage.removeItem(CACHE_KEY)
      return []
    }
    
    // Prüfe Cache-Alter
    const cacheAge = Date.now() - cacheData.cached_at
    if (cacheAge > CACHE_DURATION) {
      console.log('⚠️ Cache expired, clearing')
      localStorage.removeItem(CACHE_KEY)
      return []
    }
    
    console.log(`📦 Loaded ${cacheData.students.length} students from cache`)
    return cacheData.students || []
    
  } catch (error) {
    console.error('❌ Error loading cached students:', error)
    return []
  }
}

/**
 * Prüft ob Cache aktuell ist
 */
export const isCacheValid = (staffId: string): boolean => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return false
    
    const cacheData = JSON.parse(cached)
    
    if (cacheData.staff_id !== staffId) return false
    
    const cacheAge = Date.now() - cacheData.cached_at
    return cacheAge <= CACHE_DURATION
    
  } catch (error) {
    return false
  }
}

/**
 * Leert den Cache
 */
export const clearStudentCache = (): void => {
  localStorage.removeItem(CACHE_KEY)
  console.log('🗑️ Student cache cleared')
}

/**
 * Cache-Status für UI
 */
export const getCacheStatus = (staffId: string) => {
  const cached = localStorage.getItem(CACHE_KEY)
  if (!cached) {
    return { 
      hasCache: false, 
      count: 0, 
      age: 0, 
      isValid: false 
    }
  }
  
  try {
    const cacheData = JSON.parse(cached)
    const cacheAge = Date.now() - cacheData.cached_at
    const isValid = cacheData.staff_id === staffId && cacheAge <= CACHE_DURATION
    
    return {
      hasCache: true,
      count: cacheData.students?.length || 0,
      age: cacheAge,
      isValid,
      staff_id: cacheData.staff_id
    }
  } catch {
    return { 
      hasCache: false, 
      count: 0, 
      age: 0, 
      isValid: false 
    }
  }
}