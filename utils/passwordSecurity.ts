// Password Security Utilities
// Checks passwords against HaveIBeenPwned and personal information

import { logger } from './logger'

/**
 * Check if password has been compromised in a data breach
 * Uses HaveIBeenPwned API with k-Anonymity (only first 5 chars of hash sent)
 */
export async function checkPasswordCompromised(password: string): Promise<{
  isCompromised: boolean
  count: number
  error?: string
}> {
  try {
    // Hash password with SHA-1
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()

    // Send only first 5 characters (k-Anonymity)
    const prefix = hashHex.substring(0, 5)
    const suffix = hashHex.substring(5)

    logger.debug('🔐 Checking password compromise (k-Anonymity):', { prefix })

    // Call HaveIBeenPwned API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true' // Extra privacy protection
      }
    })

    if (!response.ok) {
      logger.warn('⚠️ HaveIBeenPwned API error:', response.status)
      return { isCompromised: false, count: 0, error: 'API unavailable' }
    }

    const text = await response.text()
    const lines = text.split('\n')

    // Check if our suffix is in the response
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':')
      if (hashSuffix.trim() === suffix) {
        const breachCount = parseInt(count.trim(), 10)
        logger.debug('❌ Password found in breaches:', breachCount, 'times')
        return { isCompromised: true, count: breachCount }
      }
    }

    logger.debug('✅ Password not found in breaches')
    return { isCompromised: false, count: 0 }

  } catch (error: any) {
    logger.error('❌ Error checking password compromise:', error)
    return { isCompromised: false, count: 0, error: error.message }
  }
}

/**
 * Check if password contains personal information
 */
export function checkPasswordPersonalInfo(password: string, userData: {
  email?: string
  firstName?: string
  lastName?: string
}): {
  isValid: boolean
  reason?: string
} {
  const lowerPassword = password.toLowerCase()

  // Check email parts
  if (userData.email) {
    const emailParts = userData.email.toLowerCase().split('@')
    const username = emailParts[0]
    const domain = emailParts[1]?.split('.')[0]

    if (username.length >= 3 && lowerPassword.includes(username)) {
      return { isValid: false, reason: 'Passwort enthält Teil Ihrer E-Mail-Adresse' }
    }

    if (domain && domain.length >= 3 && lowerPassword.includes(domain)) {
      return { isValid: false, reason: 'Passwort enthält Teil Ihrer E-Mail-Domain' }
    }
  }

  // Check first name
  if (userData.firstName && userData.firstName.length >= 3) {
    if (lowerPassword.includes(userData.firstName.toLowerCase())) {
      return { isValid: false, reason: 'Passwort enthält Ihren Vornamen' }
    }
  }

  // Check last name
  if (userData.lastName && userData.lastName.length >= 3) {
    if (lowerPassword.includes(userData.lastName.toLowerCase())) {
      return { isValid: false, reason: 'Passwort enthält Ihren Nachnamen' }
    }
  }

  // Check common company/service names
  const forbiddenTerms = ['simy', 'driving', 'fahrschule', 'password', 'passwort']
  for (const term of forbiddenTerms) {
    if (lowerPassword.includes(term)) {
      return { isValid: false, reason: `Passwort enthält den Begriff "${term}"` }
    }
  }

  // Check for simple sequences
  const sequences = [
    '123456', '654321', 'abcdef', 'fedcba',
    'qwerty', 'asdfgh', 'zxcvbn', '111111', '000000'
  ]
  for (const seq of sequences) {
    if (lowerPassword.includes(seq)) {
      return { isValid: false, reason: 'Passwort enthält einfache Zeichenfolge' }
    }
  }

  return { isValid: true }
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

