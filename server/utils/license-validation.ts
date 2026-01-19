import { createError } from 'h3'
import { logger } from '~/utils/logger'

interface SARICustomer {
  licenses?: Array<{
    category: string
    expirationdate: string
  }>
}

interface CourseSession {
  start_time: string
  end_time: string
}

interface Course {
  category: string
  course_sessions?: CourseSession[]
}

/**
 * Validates if a customer's SARI license meets the course requirements and is valid for all sessions.
 * Throws an H3Error if validation fails.
 */
export function validateLicense(course: Course, customerData: SARICustomer): void {
  if (!course.category) {
    logger.debug('ℹ️ Course has no category, skipping license validation.')
    return // No category specified, no validation needed
  }

  const requiredCategory = course.category.toUpperCase()
  const customerLicenses = customerData.licenses || []

  // Determine allowed categories based on course type
  let allowedCategories: string[] = []
  if (['PGS'].includes(requiredCategory)) {
    allowedCategories = ['A1', 'A35KW', 'A']
  } else if (['VKU'].includes(requiredCategory)) {
    allowedCategories = ['A1', 'A35KW', 'A', 'B']
  } else {
    // For specific driving categories (A, B, C, etc.), the required category is the only allowed one
    allowedCategories = [requiredCategory]
  }

  // 1. Check if customer has any of the allowed licenses
  const hasAllowedLicense = customerLicenses.some(
    lic => allowedCategories.includes(lic.category.toUpperCase())
  )

  if (!hasAllowedLicense) {
    throw createError({
      statusCode: 403,
      statusMessage: `Für diesen Kurs benötigen Sie eine Lizenz der Kategorie ${allowedCategories.join(' oder ')}. Ihre Lizenzen: ${customerLicenses.map(l => l.category).join(', ') || 'Keine'}.`
    })
  }

  // 2. Check if the most relevant license is valid for all course sessions
  // Find the best matching license
  const bestMatchingLicense = customerLicenses
    .filter(lic => allowedCategories.includes(lic.category.toUpperCase()))
    .sort((a, b) => {
      const aIndex = allowedCategories.indexOf(a.category.toUpperCase())
      const bIndex = allowedCategories.indexOf(b.category.toUpperCase())
      return bIndex - aIndex // Higher index (more specific) first
    })[0]

  if (!bestMatchingLicense) {
    throw createError({
      statusCode: 403,
      statusMessage: `Es wurde keine passende Lizenz für die Kategorie ${requiredCategory} gefunden.`
    })
  }

  const licenseExpiry = new Date(bestMatchingLicense.expirationdate)
  
  // Find the last session end time
  const courseSessions = course.course_sessions || []
  if (courseSessions.length > 0) {
    const lastSessionEndTime = courseSessions
      .map(s => new Date(s.end_time))
      .sort((a, b) => b.getTime() - a.getTime())[0] // Latest end time

    if (lastSessionEndTime > licenseExpiry) {
      const formattedLicenseExpiry = new Intl.DateTimeFormat('de-CH', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).format(licenseExpiry)
      const formattedLastSession = new Intl.DateTimeFormat('de-CH', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).format(lastSessionEndTime)
      
      throw createError({
        statusCode: 403,
        statusMessage: `Ihre Lizenz (Kategorie ${bestMatchingLicense.category}) läuft am ${formattedLicenseExpiry} ab, aber der letzte Kursteil findet am ${formattedLastSession} statt. Bitte verlängern Sie zuerst Ihre Lizenz.`
      })
    }
  } else {
    // If no sessions, just check if the license is already expired
    const now = new Date()
    if (licenseExpiry < now) {
      const formattedLicenseExpiry = new Intl.DateTimeFormat('de-CH', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).format(licenseExpiry)
      throw createError({
        statusCode: 403,
        statusMessage: `Ihre Lizenz (Kategorie ${bestMatchingLicense.category}) ist bereits am ${formattedLicenseExpiry} abgelaufen.`
      })
    }
  }
}

