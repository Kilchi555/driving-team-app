/**
 * Input Validation Tests
 * Tests for login and password reset validation
 */

import { describe, it, expect } from 'vitest'
import { 
  validateEmail, 
  validateRequiredString, 
  validatePassword 
} from '~/server/utils/validators'

describe('Input Validation', () => {
  describe('validateEmail', () => {
    it('should accept valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@company.co.uk')).toBe(true)
    })

    it('should reject invalid email', () => {
      expect(validateEmail('notanemail')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('')).toBe(false)
      expect(validateEmail(null)).toBe(false)
      expect(validateEmail(undefined)).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(validateEmail('TEST@EXAMPLE.COM')).toBe(true)
      expect(validateEmail('Test@Example.Com')).toBe(true)
    })
  })

  describe('validateRequiredString', () => {
    it('should accept valid strings', () => {
      const result = validateRequiredString('Hello', 'Field', 100)
      expect(result.valid).toBe(true)
    })

    it('should reject empty strings', () => {
      const result = validateRequiredString('', 'Field', 100)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('erforderlich')
    })

    it('should reject strings that exceed max length', () => {
      const result = validateRequiredString('A'.repeat(101), 'Field', 100)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('maximal')
    })

    it('should reject null/undefined', () => {
      const result1 = validateRequiredString(null, 'Field', 100)
      expect(result1.valid).toBe(false)

      const result2 = validateRequiredString(undefined, 'Field', 100)
      expect(result2.valid).toBe(false)
    })

    it('should trim whitespace', () => {
      const result = validateRequiredString('  only whitespace  ', 'Field', 100)
      expect(result.valid).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('should accept strong password', () => {
      const result = validatePassword('StrongPass123')
      expect(result.valid).toBe(true)
    })

    it('should reject password less than 8 characters', () => {
      const result = validatePassword('Short1A')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('8 Zeichen')
    })

    it('should require uppercase letter', () => {
      const result = validatePassword('lowercase123')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('Großbuchstaben')
    })

    it('should require lowercase letter', () => {
      const result = validatePassword('UPPERCASE123')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('Kleinbuchstaben')
    })

    it('should require number', () => {
      const result = validatePassword('NoNumbers')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('Zahlen')
    })

    it('should reject empty password', () => {
      const result = validatePassword('')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('erforderlich')
    })
  })
})

