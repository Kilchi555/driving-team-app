/**
 * Tests für die Input Validation Library
 * Führe aus mit: npm run test:validators
 */

import { describe, it, expect } from 'vitest'
import {
  sanitizeString,
  validateEmail,
  validatePassword,
  validateUUID,
  validateRequiredString,
  validatePositiveNumber,
  validateAmount,
  validateDuration,
  validateISODate,
  validateAppointmentTimes,
  validateDrivingCategory,
  validateEventType,
  validateAppointmentStatus,
  validatePaymentStatus,
  validatePaymentMethod,
  validateAppointmentData,
  validatePaymentData
} from '../utils/validators'

// ============================================================================
// STRING VALIDATORS
// ============================================================================

describe('String Validators', () => {
  describe('sanitizeString', () => {
    it('should remove XSS vectors', () => {
      const xssPayload = '<script>alert("xss")</script>Hello'
      expect(sanitizeString(xssPayload)).toBe('Hello')
    })

    it('should remove HTML tags', () => {
      const htmlPayload = '<b>Bold</b> <i>Italic</i>'
      expect(sanitizeString(htmlPayload)).toBe('Bold Italic')
    })

    it('should remove event handlers', () => {
      const eventPayload = '<img onclick="alert(1)">'
      expect(sanitizeString(eventPayload)).not.toContain('onclick')
    })

    it('should respect maxLength', () => {
      const longString = 'a'.repeat(100)
      expect(sanitizeString(longString, 50)).toHaveLength(50)
    })

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello')
    })

    it('should return empty string for null/undefined', () => {
      expect(sanitizeString(null)).toBe('')
      expect(sanitizeString(undefined)).toBe('')
    })
  })

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user+tag@domain.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('test @example.com')).toBe(false)
    })

    it('should reject null/undefined', () => {
      expect(validateEmail(null)).toBe(false)
      expect(validateEmail(undefined)).toBe(false)
      expect(validateEmail('')).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('should accept strong passwords with special characters', () => {
      const result = validatePassword('SecurePass123!')
      expect(result.valid).toBe(true)
    })

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('securepass123!')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('Großbuchstaben')
    })

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('SECUREPASS123!')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('Kleinbuchstaben')
    })

    it('should reject passwords without numbers', () => {
      const result = validatePassword('SecurePassword!')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('Zahlen')
    })

    it('should reject passwords without special characters', () => {
      const result = validatePassword('SecurePassword123')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('Sonderzeichen')
    })

    it('should reject passwords shorter than 12 chars', () => {
      const result = validatePassword('Pass12!')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('mindestens 12')
    })

    it('should reject null/undefined', () => {
      expect(validatePassword(null).valid).toBe(false)
      expect(validatePassword(undefined).valid).toBe(false)
    })
  })

  describe('validateUUID', () => {
    it('should accept valid UUIDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(validateUUID(uuid)).toBe(true)
    })

    it('should accept uppercase UUIDs', () => {
      const uuid = '550E8400-E29B-41D4-A716-446655440000'
      expect(validateUUID(uuid)).toBe(true)
    })

    it('should reject invalid UUIDs', () => {
      expect(validateUUID('not-a-uuid')).toBe(false)
      expect(validateUUID('550e8400-e29b-41d4-a716')).toBe(false)
      expect(validateUUID('')).toBe(false)
    })

    it('should reject null/undefined', () => {
      expect(validateUUID(null)).toBe(false)
      expect(validateUUID(undefined)).toBe(false)
    })
  })

  describe('validateRequiredString', () => {
    it('should accept valid strings', () => {
      const result = validateRequiredString('Valid String', 'Test Field')
      expect(result.valid).toBe(true)
    })

    it('should reject empty strings', () => {
      const result = validateRequiredString('', 'Test Field')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('erforderlich')
    })

    it('should reject whitespace-only strings', () => {
      const result = validateRequiredString('   ', 'Test Field')
      expect(result.valid).toBe(false)
    })

    it('should enforce maxLength', () => {
      const result = validateRequiredString('a'.repeat(100), 'Field', 50)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('maximal 50')
    })

    it('should reject null/undefined', () => {
      expect(validateRequiredString(null, 'Field').valid).toBe(false)
      expect(validateRequiredString(undefined, 'Field').valid).toBe(false)
    })
  })
})

// ============================================================================
// NUMERIC VALIDATORS
// ============================================================================

describe('Numeric Validators', () => {
  describe('validatePositiveNumber', () => {
    it('should accept positive numbers', () => {
      const result = validatePositiveNumber(42, 'Count')
      expect(result.valid).toBe(true)
    })

    it('should reject zero when allowZero=false', () => {
      const result = validatePositiveNumber(0, 'Count', false)
      expect(result.valid).toBe(false)
    })

    it('should accept zero when allowZero=true', () => {
      const result = validatePositiveNumber(0, 'Count', true)
      expect(result.valid).toBe(true)
    })

    it('should reject negative numbers', () => {
      const result = validatePositiveNumber(-5, 'Count')
      expect(result.valid).toBe(false)
    })

    it('should reject non-numbers', () => {
      const result = validatePositiveNumber('abc', 'Count')
      expect(result.valid).toBe(false)
    })
  })

  describe('validateAmount', () => {
    it('should accept valid amounts', () => {
      const result = validateAmount(10000, 'CHF 100.00')
      expect(result.valid).toBe(true)
    })

    it('should reject negative amounts', () => {
      const result = validateAmount(-100, 'Amount')
      expect(result.valid).toBe(false)
    })

    it('should reject non-integer amounts', () => {
      const result = validateAmount(100.5, 'Amount')
      expect(result.valid).toBe(false)
    })

    it('should enforce min/max range', () => {
      const minResult = validateAmount(50, 'Amount', 100)
      expect(minResult.valid).toBe(false)

      const maxResult = validateAmount(1000000000, 'Amount', 0, 999999999)
      expect(maxResult.valid).toBe(false)
    })

    it('should accept amounts within range', () => {
      const result = validateAmount(50000, 'Amount', 0, 100000)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateDuration', () => {
    it('should accept valid durations', () => {
      const result = validateDuration(60, 'Duration')
      expect(result.valid).toBe(true)
    })

    it('should reject durations below minimum', () => {
      const result = validateDuration(10, 'Duration')
      expect(result.valid).toBe(false)
    })

    it('should reject durations above maximum', () => {
      const result = validateDuration(500, 'Duration')
      expect(result.valid).toBe(false)
    })

    it('should reject non-integer durations', () => {
      const result = validateDuration(60.5, 'Duration')
      expect(result.valid).toBe(false)
    })

    it('should accept custom min/max', () => {
      const result = validateDuration(30, 'Duration', 30, 120)
      expect(result.valid).toBe(true)
    })
  })
})

// ============================================================================
// DATE/TIME VALIDATORS
// ============================================================================

describe('Date/Time Validators', () => {
  describe('validateISODate', () => {
    it('should accept valid ISO dates', () => {
      const result = validateISODate('2025-12-31T23:59:59Z')
      expect(result.valid).toBe(true)
      expect(result.date).toBeInstanceOf(Date)
    })

    it('should reject invalid dates', () => {
      const result = validateISODate('not-a-date')
      expect(result.valid).toBe(false)
    })

    it('should reject null/undefined', () => {
      expect(validateISODate(null).valid).toBe(false)
      expect(validateISODate(undefined).valid).toBe(false)
    })
  })

  describe('validateAppointmentTimes', () => {
    it('should accept valid times', () => {
      const result = validateAppointmentTimes(
        '2025-12-31T10:00:00Z',
        '2025-12-31T11:00:00Z'
      )
      expect(result.valid).toBe(true)
    })

    it('should reject when start >= end', () => {
      const result = validateAppointmentTimes(
        '2025-12-31T11:00:00Z',
        '2025-12-31T10:00:00Z'
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Startzeit muss vor Endzeit')
    })

    it('should reject past appointments', () => {
      const pastDate = new Date(Date.now() - 86400000) // 24h ago
      const futureDate = new Date(Date.now() + 3600000) // 1h from now

      const result = validateAppointmentTimes(
        pastDate.toISOString(),
        futureDate.toISOString(),
        false // allowPastAppointments = false
      )
      expect(result.valid).toBe(false)
    })

    it('should allow past appointments when flag is true', () => {
      const pastDate = new Date(Date.now() - 86400000)
      const futureDate = new Date(Date.now() - 82800000) // Earlier but still past

      const result = validateAppointmentTimes(
        pastDate.toISOString(),
        futureDate.toISOString(),
        true // allowPastAppointments = true
      )
      expect(result.valid).toBe(true)
    })
  })
})

// ============================================================================
// ENUM VALIDATORS
// ============================================================================

describe('Enum Validators', () => {
  describe('validateDrivingCategory', () => {
    it('should accept valid categories', () => {
      expect(validateDrivingCategory('B').valid).toBe(true)
      expect(validateDrivingCategory('A1').valid).toBe(true)
      expect(validateDrivingCategory('BE').valid).toBe(true)
    })

    it('should reject invalid categories', () => {
      expect(validateDrivingCategory('X').valid).toBe(false)
      expect(validateDrivingCategory('Z99').valid).toBe(false)
    })

    it('should be case-insensitive', () => {
      expect(validateDrivingCategory('b').valid).toBe(true)
      expect(validateDrivingCategory('a1').valid).toBe(true)
    })
  })

  describe('validateEventType', () => {
    it('should accept valid event types', () => {
      expect(validateEventType('lesson').valid).toBe(true)
      expect(validateEventType('exam').valid).toBe(true)
      expect(validateEventType('practice').valid).toBe(true)
    })

    it('should reject invalid event types', () => {
      expect(validateEventType('invalid').valid).toBe(false)
      expect(validateEventType('workshop').valid).toBe(false)
    })
  })

  describe('validatePaymentStatus', () => {
    it('should accept valid statuses', () => {
      expect(validatePaymentStatus('pending').valid).toBe(true)
      expect(validatePaymentStatus('completed').valid).toBe(true)
      expect(validatePaymentStatus('refunded').valid).toBe(true)
    })

    it('should reject invalid statuses', () => {
      expect(validatePaymentStatus('processing').valid).toBe(false)
      expect(validatePaymentStatus('paid').valid).toBe(false)
    })
  })

  describe('validatePaymentMethod', () => {
    it('should accept valid methods', () => {
      expect(validatePaymentMethod('cash').valid).toBe(true)
      expect(validatePaymentMethod('wallee').valid).toBe(true)
      expect(validatePaymentMethod('credit').valid).toBe(true)
    })

    it('should reject invalid methods', () => {
      expect(validatePaymentMethod('paypal').valid).toBe(false)
      expect(validatePaymentMethod('bitcoin').valid).toBe(false)
    })
  })
})

// ============================================================================
// COMPLEX VALIDATORS
// ============================================================================

describe('Complex Validators', () => {
  describe('validateAppointmentData', () => {
    const validAppointment = {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      staff_id: '550e8400-e29b-41d4-a716-446655440001',
      start_time: '2025-12-31T10:00:00Z',
      end_time: '2025-12-31T11:00:00Z',
      duration_minutes: 60,
      type: 'B',
      event_type_code: 'lesson',
      status: 'confirmed',
      tenant_id: '550e8400-e29b-41d4-a716-446655440002'
    }

    it('should accept valid appointment data', () => {
      const result = validateAppointmentData(validAppointment)
      expect(result.valid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    it('should reject invalid user_id', () => {
      const invalid = { ...validAppointment, user_id: 'invalid-uuid' }
      const result = validateAppointmentData(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.user_id).toBeDefined()
    })

    it('should reject invalid duration', () => {
      const invalid = { ...validAppointment, duration_minutes: 5 }
      const result = validateAppointmentData(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.duration_minutes).toBeDefined()
    })

    it('should reject invalid times', () => {
      const invalid = {
        ...validAppointment,
        start_time: '2025-12-31T11:00:00Z',
        end_time: '2025-12-31T10:00:00Z'
      }
      const result = validateAppointmentData(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.times).toBeDefined()
    })

    it('should report multiple errors', () => {
      const invalid = {
        ...validAppointment,
        user_id: 'invalid',
        staff_id: 'invalid',
        type: 'Z'
      }
      const result = validateAppointmentData(invalid)
      expect(result.valid).toBe(false)
      expect(Object.keys(result.errors).length).toBeGreaterThan(1)
    })
  })

  describe('validatePaymentData', () => {
    const validPayment = {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      appointment_id: '550e8400-e29b-41d4-a716-446655440001',
      total_amount_rappen: 10000,
      payment_status: 'completed',
      payment_method: 'wallee',
      currency: 'CHF'
    }

    it('should accept valid payment data', () => {
      const result = validatePaymentData(validPayment)
      expect(result.valid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    it('should reject invalid amount', () => {
      const invalid = { ...validPayment, total_amount_rappen: -100 }
      const result = validatePaymentData(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.total_amount_rappen).toBeDefined()
    })

    it('should reject invalid payment status', () => {
      const invalid = { ...validPayment, payment_status: 'processing' }
      const result = validatePaymentData(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.payment_status).toBeDefined()
    })

    it('should reject invalid currency', () => {
      const invalid = { ...validPayment, currency: 'EUR' }
      const result = validatePaymentData(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.currency).toBeDefined()
    })

    it('should accept without optional fields', () => {
      const minimal = {
        user_id: '550e8400-e29b-41d4-a716-446655440000'
      }
      const result = validatePaymentData(minimal)
      expect(result.valid).toBe(true)
    })
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  it('should work with real appointment booking flow', () => {
    const bookingData = {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      staff_id: '550e8400-e29b-41d4-a716-446655440001',
      start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      end_time: new Date(Date.now() + 86400000 + 3600000).toISOString(), // Tomorrow + 1h
      duration_minutes: 60,
      type: 'B',
      event_type_code: 'lesson',
      status: 'pending_confirmation',
      tenant_id: '550e8400-e29b-41d4-a716-446655440002',
      title: sanitizeString('<script>alert(1)</script>Fahrstunde'),
      description: sanitizeString('Test <img src=x>')
    }

    const result = validateAppointmentData(bookingData)
    expect(result.valid).toBe(true)
    expect(bookingData.title).not.toContain('<script>')
    expect(bookingData.description).not.toContain('<img')
  })

  it('should work with real payment flow', () => {
    const paymentData = {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      appointment_id: '550e8400-e29b-41d4-a716-446655440001',
      total_amount_rappen: 12500, // CHF 125.00
      payment_status: 'completed',
      payment_method: 'wallee',
      currency: 'CHF'
    }

    const result = validatePaymentData(paymentData)
    expect(result.valid).toBe(true)
  })

  it('should catch XSS in title during appointment', () => {
    const maliciousData = {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      staff_id: '550e8400-e29b-41d4-a716-446655440001',
      start_time: '2025-12-31T10:00:00Z',
      end_time: '2025-12-31T11:00:00Z',
      duration_minutes: 60,
      type: 'B',
      event_type_code: 'lesson',
      status: 'confirmed',
      tenant_id: '550e8400-e29b-41d4-a716-446655440002',
      title: '<img src=x onerror="alert(1)">'
    }

    const sanitized = sanitizeString(maliciousData.title)
    expect(sanitized).not.toContain('<img')
    expect(sanitized).not.toContain('onerror')
  })
})



