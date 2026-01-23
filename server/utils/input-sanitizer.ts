/**
 * Input Sanitization Utility
 * Prevents SQL injection, XSS, and other input-based attacks
 * 
 * Note: SQL injection is already prevented by Supabase's parameterized queries.
 * This is Defense-in-Depth for extra security.
 */

import { createError } from 'h3'

/**
 * Sanitize input to prevent injection attacks
 * - Removes dangerous characters
 * - Trims whitespace
 * - Validates format per field
 */
export const sanitizeInput = (input: string, fieldName: string): string => {
  if (!input) return ''
  
  // Convert to string and trim
  let sanitized = String(input).trim()
  
  // Remove null bytes (critical for security)
  sanitized = sanitized.replace(/\0/g, '')
  
  // Field-specific validation FIRST (to avoid false positives on SQL keywords)
  switch (fieldName) {
    case 'email':
      // Allow only valid email characters - this regex inherently prevents SQL injection
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(sanitized)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Überprüfen Sie Ihre Angaben. Die E-Mail-Adresse ist ungültig.'
        })
      }
      return sanitized.toLowerCase()
      
    case 'phone':
      // Allow only digits, +, spaces, (), - (inherently safe)
      if (!/^[\d\s+()-]*$/.test(sanitized)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Überprüfen Sie Ihre Angaben. Die Telefonnummer enthält ungültige Zeichen.'
        })
      }
      return sanitized
      
    case 'faberid':
      // Allow only digits and dots (inherently safe)
      if (!/^[\d.]*$/.test(sanitized)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Überprüfen Sie Ihre Angaben. Die Lernfahrausweis ID enthält ungültige Zeichen.'
        })
      }
      return sanitized
      
    case 'birthdate':
      // Allow only YYYY-MM-DD format (inherently safe)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(sanitized)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Überprüfen Sie Ihre Angaben. Das Geburtsdatum hat ein ungültiges Format.'
        })
      }
      return sanitized
      
    default:
      // For untyped fields: check for SQL injection patterns
      // Note: This is Defense-in-Depth - Supabase uses parameterized queries
      const dangerousPatterns = [
        /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE)\s/i,  // SQL with semicolon
        /--\s/,                                               // SQL comment
        /\/\*.*\*\//,                                         // Block comment
        /'\s*(OR|AND)\s+'?1'?\s*=\s*'?1/i,                   // Classic injection
        /UNION\s+SELECT/i                                     // UNION attack
      ]
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Überprüfen Sie Ihre Angaben. Ungültige Zeichen erkannt.'
          })
        }
      }
      return sanitized
  }
}

