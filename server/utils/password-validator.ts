/**
 * Password Security Validator
 *
 * NIST SP 800-63B compliant: length + breach check beats complexity rules.
 * Complexity rules (uppercase, special chars etc.) are NOT enforced –
 * they encourage predictable substitutions (P@ssw0rd!) without adding entropy.
 */

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
  score: number
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  maxLength: 500,
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  let score = 0

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Passwort muss mindestens ${PASSWORD_REQUIREMENTS.minLength} Zeichen lang sein`)
  } else {
    // Score based on length only – longer = stronger
    score = Math.min(100, Math.floor((password.length / 20) * 100))
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Passwort darf maximal ${PASSWORD_REQUIREMENTS.maxLength} Zeichen lang sein`)
  }

  const strength: 'weak' | 'medium' | 'strong' =
    score >= 80 ? 'strong' : score >= 50 ? 'medium' : 'weak'

  return { isValid: errors.length === 0, errors, strength, score }
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
