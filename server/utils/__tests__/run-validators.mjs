#!/usr/bin/env node

/**
 * Simple Test Runner für Validators (ohne Vitest/Vite)
 * Führe aus mit: node server/utils/__tests__/run-validators.mjs
 */

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
} from '../validators.ts'

// Test Counter
let totalTests = 0
let passedTests = 0
let failedTests = 0

// Colors
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

// Test Helper
function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ${GREEN}✓${RESET} ${message}`)
  } else {
    failedTests++
    console.log(`  ${RED}✗${RESET} ${message}`)
  }
}

function describe(name, fn) {
  console.log(`\n${YELLOW}${name}${RESET}`)
  fn()
}

function it(name, fn) {
  try {
    fn()
  } catch (err) {
    console.log(`  ${RED}✗${RESET} ${name}`)
    console.log(`    Error: ${err.message}`)
    failedTests++
  }
}

// ============================================================================
// STRING VALIDATORS
// ============================================================================

describe('String Validators', () => {
  describe('sanitizeString', () => {
    it('should remove XSS vectors', () => {
      const xssPayload = '<script>alert("xss")</script>Hello'
      assert(sanitizeString(xssPayload) === 'Hello', 'Remove <script>')
    })

    it('should remove HTML tags', () => {
      const htmlPayload = '<b>Bold</b> <i>Italic</i>'
      const result = sanitizeString(htmlPayload)
      assert(!result.includes('<b>') && !result.includes('<i>'), 'Remove HTML tags')
    })

    it('should respect maxLength', () => {
      const longString = 'a'.repeat(100)
      const result = sanitizeString(longString, 50)
      assert(result.length === 50, 'Enforce maxLength')
    })

    it('should trim whitespace', () => {
      assert(sanitizeString('  hello  ') === 'hello', 'Trim whitespace')
    })

    it('should return empty string for null', () => {
      assert(sanitizeString(null) === '', 'Handle null')
    })
  })

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      assert(validateEmail('test@example.com') === true, 'Valid email')
    })

    it('should reject invalid emails', () => {
      assert(validateEmail('invalid') === false, 'Reject invalid email')
      assert(validateEmail('test@') === false, 'Reject incomplete email')
    })

    it('should reject null', () => {
      assert(validateEmail(null) === false, 'Reject null')
    })
  })

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      const result = validatePassword('SecurePass123')
      assert(result.valid === true, 'Accept strong password')
    })

    it('should reject weak passwords', () => {
      const result = validatePassword('weakpass')
      assert(result.valid === false, 'Reject weak password')
    })
  })

  describe('validateUUID', () => {
    it('should accept valid UUIDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      assert(validateUUID(uuid) === true, 'Valid UUID')
    })

    it('should reject invalid UUIDs', () => {
      assert(validateUUID('not-a-uuid') === false, 'Reject invalid UUID')
    })
  })

  describe('validateRequiredString', () => {
    it('should accept valid strings', () => {
      const result = validateRequiredString('Valid String', 'Field')
      assert(result.valid === true, 'Accept valid string')
    })

    it('should reject empty strings', () => {
      const result = validateRequiredString('', 'Field')
      assert(result.valid === false, 'Reject empty string')
    })

    it('should enforce maxLength', () => {
      const result = validateRequiredString('a'.repeat(100), 'Field', 50)
      assert(result.valid === false, 'Enforce maxLength')
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
      assert(result.valid === true, 'Accept positive number')
    })

    it('should reject negative numbers', () => {
      const result = validatePositiveNumber(-5, 'Count')
      assert(result.valid === false, 'Reject negative number')
    })

    it('should reject zero when allowZero=false', () => {
      const result = validatePositiveNumber(0, 'Count', false)
      assert(result.valid === false, 'Reject zero')
    })

    it('should accept zero when allowZero=true', () => {
      const result = validatePositiveNumber(0, 'Count', true)
      assert(result.valid === true, 'Accept zero')
    })
  })

  describe('validateAmount', () => {
    it('should accept valid amounts', () => {
      const result = validateAmount(10000, 'Amount')
      assert(result.valid === true, 'Accept valid amount')
    })

    it('should reject negative amounts', () => {
      const result = validateAmount(-100, 'Amount')
      assert(result.valid === false, 'Reject negative amount')
    })

    it('should reject non-integer amounts', () => {
      const result = validateAmount(100.5, 'Amount')
      assert(result.valid === false, 'Reject non-integer')
    })
  })

  describe('validateDuration', () => {
    it('should accept valid durations', () => {
      const result = validateDuration(60, 'Duration')
      assert(result.valid === true, 'Accept 60 min')
    })

    it('should reject too short durations', () => {
      const result = validateDuration(10, 'Duration')
      assert(result.valid === false, 'Reject < 15 min')
    })

    it('should reject too long durations', () => {
      const result = validateDuration(500, 'Duration')
      assert(result.valid === false, 'Reject > 600 min')
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
      assert(result.valid === true && result.date instanceof Date, 'Accept ISO date')
    })

    it('should reject invalid dates', () => {
      const result = validateISODate('not-a-date')
      assert(result.valid === false, 'Reject invalid date')
    })
  })

  describe('validateAppointmentTimes', () => {
    it('should accept valid times', () => {
      const result = validateAppointmentTimes(
        '2025-12-31T10:00:00Z',
        '2025-12-31T11:00:00Z'
      )
      assert(result.valid === true, 'Accept valid times')
    })

    it('should reject when start >= end', () => {
      const result = validateAppointmentTimes(
        '2025-12-31T11:00:00Z',
        '2025-12-31T10:00:00Z'
      )
      assert(result.valid === false, 'Reject start >= end')
    })
  })
})

// ============================================================================
// ENUM VALIDATORS
// ============================================================================

describe('Enum Validators', () => {
  describe('validateDrivingCategory', () => {
    it('should accept valid categories', () => {
      assert(validateDrivingCategory('B').valid === true, 'Accept B')
      assert(validateDrivingCategory('A1').valid === true, 'Accept A1')
    })

    it('should reject invalid categories', () => {
      assert(validateDrivingCategory('X').valid === false, 'Reject X')
    })
  })

  describe('validateEventType', () => {
    it('should accept valid event types', () => {
      assert(validateEventType('lesson').valid === true, 'Accept lesson')
    })

    it('should reject invalid event types', () => {
      assert(validateEventType('invalid').valid === false, 'Reject invalid')
    })
  })

  describe('validatePaymentStatus', () => {
    it('should accept valid statuses', () => {
      assert(validatePaymentStatus('pending').valid === true, 'Accept pending')
    })

    it('should reject invalid statuses', () => {
      assert(validatePaymentStatus('processing').valid === false, 'Reject processing')
    })
  })

  describe('validatePaymentMethod', () => {
    it('should accept valid methods', () => {
      assert(validatePaymentMethod('cash').valid === true, 'Accept cash')
    })

    it('should reject invalid methods', () => {
      assert(validatePaymentMethod('paypal').valid === false, 'Reject paypal')
    })
  })
})

// ============================================================================
// COMPLEX VALIDATORS
// ============================================================================

describe('Complex Validators', () => {
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

  describe('validateAppointmentData', () => {
    it('should accept valid appointment', () => {
      const result = validateAppointmentData(validAppointment)
      assert(result.valid === true, 'Accept valid appointment')
    })

    it('should reject invalid user_id', () => {
      const invalid = { ...validAppointment, user_id: 'invalid' }
      const result = validateAppointmentData(invalid)
      assert(result.valid === false, 'Reject invalid user_id')
    })

    it('should reject invalid duration', () => {
      const invalid = { ...validAppointment, duration_minutes: 5 }
      const result = validateAppointmentData(invalid)
      assert(result.valid === false, 'Reject invalid duration')
    })
  })
})

// ============================================================================
// SUMMARY
// ============================================================================

console.log(`\n${YELLOW}========================================${RESET}`)
console.log(`${YELLOW}  TEST SUMMARY${RESET}`)
console.log(`${YELLOW}========================================${RESET}`)
console.log(`Total Tests:   ${totalTests}`)
console.log(`${GREEN}Passed:${RESET}        ${passedTests}`)
if (failedTests > 0) {
  console.log(`${RED}Failed:${RESET}        ${failedTests}`)
} else {
  console.log(`Failed:        ${failedTests}`)
}
console.log(`${YELLOW}========================================${RESET}\n`)

if (failedTests === 0) {
  console.log(`${GREEN}✓ All tests passed!${RESET}\n`)
  process.exit(0)
} else {
  console.log(`${RED}✗ Some tests failed${RESET}\n`)
  process.exit(1)
}

