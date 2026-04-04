/**
 * Composable für die Generierung von Simy Booking URLs mit vorgewählten Parametern
 * Unterstützt: Standort, Kategorie, Fahrlehrer, etc.
 */

interface BookingParams {
  location?: string // z.B. 'zuerich', 'lachen'
  instructor?: string // z.B. 'pascal', 'marc'
  category?: string // z.B. 'auto', 'motorrad'
  service?: string // z.B. 'driving-lessons', 'courses'
  sessionId?: string // Session ID für Tracking
}

/**
 * Mapping von lokalen Namen zu Simy IDs/Namen
 * (Diese müssen mit den tatsächlichen Simy-IDs abgestimmt werden)
 */
const locationMap: Record<string, string> = {
  zuerich: 'zürich-altstetten',
  lachen: 'lachen',
  uster: 'uster',
  stgallen: 'st-gallen',
  dietikon: 'dietikon',
  aargau: 'aargau',
  reichenburg: 'reichenburg'
}

const instructorMap: Record<string, string> = {
  pascal: 'pascal-kilchenmann',
  marc: 'marc',
  skender: 'skender-nushi',
  peter: 'peter',
  rahel: 'rahel',
  samir: 'samir'
}

const categoryMap: Record<string, string> = {
  auto: 'auto-b',
  motorrad: 'motorrad-a',
  lastwagen: 'lastwagen-c',
  bus: 'bus-d',
  taxi: 'taxi-bpt',
  anhaenger: 'anhaenger-be',
  motorboot: 'motorboot'
}

export const useBookingUrl = () => {
  /**
   * Generiert eine Simy Booking URL mit optionalen vorgewählten Parametern
   * @param params - Optionale Parameter (location, instructor, category, service)
   * @returns Vollständige URL zum Simy Booking System
   */
  const generateBookingUrl = (params?: BookingParams): string => {
    let url = 'https://www.simy.ch/booking/availability/driving-team'
    
    if (!params) {
      return url
    }

    const queryParams = new URLSearchParams()

    // Location Parameter
    if (params.location) {
      const mappedLocation = locationMap[params.location.toLowerCase()]
      if (mappedLocation) {
        queryParams.append('location', mappedLocation)
      }
    }

    // Instructor Parameter
    if (params.instructor) {
      const mappedInstructor = instructorMap[params.instructor.toLowerCase()]
      if (mappedInstructor) {
        queryParams.append('instructor', mappedInstructor)
      }
    }

    // Category Parameter
    if (params.category) {
      const mappedCategory = categoryMap[params.category.toLowerCase()]
      if (mappedCategory) {
        queryParams.append('service', mappedCategory)
      }
    }

    // Service Parameter (falls nicht über category gesetzt)
    if (params.service && !params.category) {
      queryParams.append('service', params.service)
    }

    // Session ID for tracking (always add if available in browser)
    if (typeof window !== 'undefined' && (window as any).__analyticsSessionId) {
      queryParams.append('session_id', (window as any).__analyticsSessionId)
    } else if (params.sessionId) {
      queryParams.append('session_id', params.sessionId)
    }

    const queryString = queryParams.toString()
    return queryString ? `${url}?${queryString}` : url
  }

  /**
   * Generiert einen Booking-Link für einen spezifischen Fahrlehrer auf einer Location
   * @param locationKey - Lokations-Schlüssel
   * @param instructorName - Name des Fahrlehrers
   * @returns Booking URL
   */
  const getInstructorBookingUrl = (locationKey: string, instructorName: string): string => {
    return generateBookingUrl({
      location: locationKey,
      instructor: instructorName.toLowerCase().split(' ')[0] // Nimmt den Vornamen
    })
  }

  /**
   * Generiert einen Booking-Link für eine spezifische Location
   * @param locationKey - Lokations-Schlüssel
   * @returns Booking URL
   */
  const getLocationBookingUrl = (locationKey: string): string => {
    return generateBookingUrl({
      location: locationKey
    })
  }

  /**
   * Generiert einen Booking-Link für eine spezifische Kategorie
   * @param categoryKey - Kategorien-Schlüssel
   * @returns Booking URL
   */
  const getCategoryBookingUrl = (categoryKey: string): string => {
    return generateBookingUrl({
      category: categoryKey
    })
  }

  return {
    generateBookingUrl,
    getInstructorBookingUrl,
    getLocationBookingUrl,
    getCategoryBookingUrl
  }
}
