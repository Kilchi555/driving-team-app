/**
 * Cron API Security Testing - TypeScript Version
 * 
 * Run with: npx tsx server/tests/cron-api-testing.ts
 */

import { $fetch } from 'ofetch'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret-token'

interface TestResult {
  name: string
  passed: boolean
  expected: string
  actual: string
  error?: string
}

const results: TestResult[] = []

async function test(
  name: string,
  url: string,
  headers: Record<string, string>,
  expectedStatus: number
) {
  try {
    const response = await $fetch(url, {
      method: 'POST',
      headers,
      retry: 0
    })
    
    const passed = true
    results.push({
      name,
      passed,
      expected: `Status ${expectedStatus}`,
      actual: `Status 200 (${JSON.stringify(response).substring(0, 50)})`
    })
    console.log(`✅ ${name}: PASSED`)
  } catch (error: any) {
    const status = error.status || error.response?.status || 'Unknown'
    const passed = status === expectedStatus
    
    results.push({
      name,
      passed,
      expected: `Status ${expectedStatus}`,
      actual: `Status ${status}`,
      error: error.message
    })
    
    console.log(`${passed ? '✅' : '❌'} ${name}: Status ${status}`)
  }
}

async function runTests() {
  console.log('🧪 Cron API Security Testing')
  console.log('============================')
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Cron Secret: ${CRON_SECRET}`)
  console.log('')

  // Test 1: WITHOUT authentication (should fail)
  await test(
    'cleanup-booking-reservations WITHOUT auth',
    `${BASE_URL}/api/cron/cleanup-booking-reservations`,
    { 'Content-Type': 'application/json' },
    401
  )

  // Test 2: WITH correct token
  await test(
    'cleanup-booking-reservations WITH correct token',
    `${BASE_URL}/api/cron/cleanup-booking-reservations`,
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CRON_SECRET}`
    },
    200
  )

  // Test 3: WITH wrong token (should fail)
  await test(
    'cleanup-booking-reservations WITH wrong token',
    `${BASE_URL}/api/cron/cleanup-booking-reservations`,
    {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer wrong-token-xyz'
    },
    401
  )

  // Test 4: Other APIs with correct token
  await test(
    'cleanup-expired-reservations WITH token',
    `${BASE_URL}/api/cron/cleanup-expired-reservations`,
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CRON_SECRET}`
    },
    200
  )

  await test(
    'process-automatic-payments WITH token',
    `${BASE_URL}/api/cron/process-automatic-payments`,
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CRON_SECRET}`
    },
    200
  )

  await test(
    'sync-sari-courses WITH token',
    `${BASE_URL}/api/cron/sync-sari-courses`,
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CRON_SECRET}`
    },
    200
  )

  // Summary
  console.log('')
  console.log('📊 Test Summary')
  console.log('===============')
  
  const passed = results.filter(r => r.passed).length
  const total = results.length
  const passRate = Math.round((passed / total) * 100)
  
  console.log(`Passed: ${passed}/${total} (${passRate}%)`)
  console.log('')
  
  if (passed === total) {
    console.log('✅ All tests passed!')
  } else {
    console.log('❌ Some tests failed:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`)
      console.log(`    Expected: ${r.expected}`)
      console.log(`    Actual: ${r.actual}`)
      if (r.error) console.log(`    Error: ${r.error}`)
    })
  }

  process.exit(passed === total ? 0 : 1)
}

runTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

