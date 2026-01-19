/**
 * Utility functions for course location handling and payment method determination
 */

/**
 * Extract city name from course description or location string
 */
export function extractCityFromCourseDescription(description: string): string | null {
  if (!description) return null
  
  const lowerDesc = description.toLowerCase()
  
  // Check for known cities
  if (lowerDesc.includes('zürich') || lowerDesc.includes('zurich') || lowerDesc.includes('zuerich')) {
    return 'Zürich'
  }
  if (lowerDesc.includes('lachen')) {
    return 'Lachen'
  }
  if (lowerDesc.includes('einsiedeln')) {
    return 'Einsiedeln'
  }
  if (lowerDesc.includes('schwyz')) {
    return 'Schwyz'
  }
  
  return null
}

/**
 * Determine payment method based on location
 * - Zürich, Lachen: Online payment (Wallee)
 * - Einsiedeln, others: Cash on site
 */
export function determinePaymentMethod(city: string | null): 'WALLEE' | 'CASH_ON_SITE' {
  if (!city) return 'WALLEE' // Default to online
  
  const onlinePaymentCities = ['zürich', 'zurich', 'zuerich', 'lachen']
  
  if (onlinePaymentCities.includes(city.toLowerCase())) {
    return 'WALLEE'
  }
  
  return 'CASH_ON_SITE'
}

/**
 * Get human-readable label for payment method
 */
export function getPaymentMethodLabel(method: 'WALLEE' | 'CASH_ON_SITE'): string {
  switch (method) {
    case 'WALLEE':
      return 'Online-Zahlung (Kreditkarte, TWINT)'
    case 'CASH_ON_SITE':
      return 'Barzahlung vor Ort'
    default:
      return 'Zahlung'
  }
}

/**
 * Get description for payment method
 */
export function getPaymentMethodDescription(method: 'WALLEE' | 'CASH_ON_SITE'): string {
  switch (method) {
    case 'WALLEE':
      return 'Du wirst nach der Anmeldung zur sicheren Zahlungsseite weitergeleitet.'
    case 'CASH_ON_SITE':
      return 'Bitte bringe den Betrag passend in bar zum ersten Kurstag mit.'
    default:
      return ''
  }
}

