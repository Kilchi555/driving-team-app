/**
 * Password Security Validator
 * Enforces strong password requirements
 */

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
  score: number
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbiddenPatterns: [
    /^[0-9]+$/, // Only numbers
    /^[a-z]+$/i, // Only letters
    /(.)\\1{2,}/, // Same character repeated 3+ times
    /password|123456|qwerty|admin|letmein/i // Common passwords
  ]
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  let score = 0

  // Check minimum length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Passwort muss mindestens ${PASSWORD_REQUIREMENTS.minLength} Zeichen lang sein`)
  } else {
    score += 20
  }

  // Check uppercase
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Großbuchstaben enthalten')
  } else if (/[A-Z]/.test(password)) {
    score += 20
  }

  // Check lowercase
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Kleinbuchstaben enthalten')
  } else if (/[a-z]/.test(password)) {
    score += 20
  }

  // Check numbers
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Passwort muss mindestens eine Ziffer enthalten')
  } else if (/[0-9]/.test(password)) {
    score += 20
  }

  // Check special characters
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(password)) {
    errors.push('Passwort muss mindestens ein Sonderzeichen enthalten (!@#$%^&* etc.)')
  } else if (/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(password)) {
    score += 20
  }

  // Check forbidden patterns
  for (const pattern of PASSWORD_REQUIREMENTS.forbiddenPatterns) {
    if (pattern.test(password)) {
      errors.push('Passwort enthält ein nicht erlaubtes Muster oder ist zu häufig verwendet')
      score = Math.max(0, score - 20)
      break
    }
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (score >= 80) {
    strength = 'strong'
  } else if (score >= 50) {
    strength = 'medium'
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score
  }
}

/**
 * Log password validation attempt (without storing the actual password)
 */
export function logPasswordValidationAttempt(
  userId: string | null,
  email: string,
  isValid: boolean,
  reason?: string
) {
  const timestamp = new Date().toISOString()
  const maskedEmail = email.substring(0, 3) + '***'
  
  console.log(`[PASSWORD-VALIDATION] ${timestamp} | ${maskedEmail} | Valid: ${isValid} ${reason ? `| ${reason}` : ''}`)
}
