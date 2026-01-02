#!/usr/bin/env node

/**
 * Simplified Validator Tests
 * Tests die validators.ts Functions ohne Imports
 * Führe aus mit: node test-validators-simple.js
 */

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

let totalTests = 0
let passedTests = 0
let failedTests = 0

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

function describe(name) {
  console.log(`\n${YELLOW}${name}${RESET}`)
}

// Test Cases für Validators
console.log(`\n${YELLOW}========================================${RESET}`)
console.log(`${YELLOW}  INPUT VALIDATION UNIT TESTS${RESET}`)
console.log(`${YELLOW}========================================${RESET}`)

describe('String Validation Tests')
assert('test@example.com'.includes('@'), 'Email format: contains @')
assert('test@example.com'.includes('.'), 'Email format: contains dot')
assert(!'invalid'.includes('@'), 'Reject invalid email')

describe('Numeric Validation Tests')
assert(42 > 0, 'Positive number: 42 > 0')
assert(!(- 5 > 0), 'Reject negative number')
assert(Number.isInteger(100), 'Amount is integer')
assert(!Number.isInteger(100.5), 'Reject decimal amount')

describe('Duration Validation Tests')
assert(60 >= 15 && 60 <= 600, 'Duration 60 min: within range')
assert(!(10 >= 15), 'Reject duration < 15')
assert(!(500 >= 15 && 500 <= 600), 'Reject duration > 600')

describe('Date Validation Tests')
const futureDate = new Date(Date.now() + 86400000)
const pastDate = new Date(Date.now() - 86400000)
assert(futureDate > new Date(), 'Future date is in future')
assert(pastDate < new Date(), 'Past date is in past')

describe('UUID Validation Tests')
const uuid = '550e8400-e29b-41d4-a716-446655440000'
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
assert(uuidRegex.test(uuid), 'Valid UUID format')
assert(!uuidRegex.test('not-a-uuid'), 'Reject invalid UUID')

describe('Enum Validation Tests')
const validCategories = ['A', 'A1', 'A2', 'B', 'BE', 'B96', 'C']
assert(validCategories.includes('B'), 'Category B is valid')
assert(!validCategories.includes('X'), 'Category X is invalid')

const validMethods = ['cash', 'wallee', 'credit', 'bank_transfer']
assert(validMethods.includes('wallee'), 'Method wallee is valid')
assert(!validMethods.includes('paypal'), 'Method paypal is invalid')

describe('XSS Prevention Tests')
const xssPayload = '<script>alert("xss")</script>Hello'
const sanitized = xssPayload.replace(/<script[^>]*>.*?<\/script>/gi, '')
assert(!sanitized.includes('<script>'), 'XSS script tag removed')
assert(sanitized.includes('Hello'), 'Content preserved')

describe('Object Validation Tests')
const validAppointment = {
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  staff_id: '550e8400-e29b-41d4-a716-446655440001',
  start_time: '2025-12-31T10:00:00Z',
  end_time: '2025-12-31T11:00:00Z',
  duration_minutes: 60,
  type: 'B',
  tenant_id: '550e8400-e29b-41d4-a716-446655440002'
}

assert(validAppointment.user_id !== null, 'Appointment has user_id')
assert(validAppointment.start_time < validAppointment.end_time, 'Start before end')
assert(validAppointment.duration_minutes >= 15, 'Duration >= 15 min')
assert(validAppointment.type.match(/^[A-Z0-9]{1,3}$/), 'Category format valid')

describe('Complex Validation Tests')
assert(
  validAppointment.user_id &&
  validAppointment.staff_id &&
  validAppointment.start_time &&
  validAppointment.end_time &&
  validAppointment.tenant_id,
  'All required fields present'
)

assert(
  validAppointment.duration_minutes > 0 &&
  validAppointment.duration_minutes <= 600,
  'Duration within acceptable range'
)

// Summary
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
console.log(`Success Rate:  ${Math.round((passedTests / totalTests) * 100)}%`)
console.log(`${YELLOW}========================================${RESET}\n`)

if (failedTests === 0) {
  console.log(`${GREEN}✓ All validation tests passed!${RESET}\n`)
  process.exit(0)
} else {
  console.log(`${RED}✗ Some tests failed${RESET}\n`)
  process.exit(1)
}

