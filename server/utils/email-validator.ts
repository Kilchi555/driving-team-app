/**
 * Email validation utilities
 */

// Disposable email domains (common temp email services)
const disposableDomains = new Set([
  '10minutemail.com',
  'tempmail.com',
  'throwaway.email',
  'sharklasers.com',
  'mailinator.com',
  'temp-mail.org',
  'yopmail.com',
  'maildrop.cc',
  'trash-mail.com',
  'temp-mail.io',
  'spam4.me',
  'trashmail.ws'
])

export function isValidEmail(email: string): boolean {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return false
  }

  // Check length (max 254 chars per RFC 5321)
  if (email.length > 254) {
    return false
  }

  // Check local part length (max 64 chars before @)
  const [localPart] = email.split('@')
  if (localPart.length > 64) {
    return false
  }

  return true
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  
  return disposableDomains.has(domain)
}

export function isSpamEmail(email: string): boolean {
  const lowercaseEmail = email.toLowerCase()
  
  // Check for obvious spam patterns
  const spamPatterns = [
    /^(test|admin|spam|fake|xxx|zzz|aaa|bbb)/,
    /\d{6,}/, // Too many consecutive digits
    /(.)\1{5,}/, // Same character repeated 6+ times
  ]
  
  return spamPatterns.some(pattern => pattern.test(lowercaseEmail))
}

export function validateRegistrationEmail(email: string): { valid: boolean; reason?: string } {
  // Basic validation
  if (!isValidEmail(email)) {
    return { valid: false, reason: 'Ungültige E-Mail-Adresse' }
  }

  // Check for disposable emails
  if (isDisposableEmail(email)) {
    return { valid: false, reason: 'Bitte verwenden Sie eine echte E-Mail-Adresse' }
  }

  // Check for spam patterns
  if (isSpamEmail(email)) {
    return { valid: false, reason: 'E-Mail-Adresse scheint ungültig zu sein' }
  }

  return { valid: true }
}

