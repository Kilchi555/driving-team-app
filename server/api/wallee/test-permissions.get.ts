// server/api/wallee/test-permissions.get.ts - NEUE DATEI ERSTELLEN

export default defineEventHandler(async (event) => {
  try {
    console.log('🧪 Testing Wallee API Permissions...')

    // Credentials holen
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Wallee credentials missing'
      })
    }

    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    const results: any = {}

    // ✅ TEST 1: Space Read (wissen wir funktioniert)
    console.log('🧪 Test 1: Space Read API')
    try {
      const spaceResponse = await $fetch(
        `https://app-wallee.com/api/space/read?spaceId=${walleeSpaceId}&id=${walleeSpaceId}`,
        { headers }
      )
      results.spaceRead = { success: true, data: spaceResponse }
      console.log('✅ Space Read: SUCCESS')
    } catch (error: any) {
      results.spaceRead = { success: false, error: error.message, statusCode: error.statusCode }
      console.log('❌ Space Read: FAILED', error.statusCode)
    }

    // ✅ TEST 2: Transaction Count/Search (weniger Permissions nötig)
    console.log('🧪 Test 2: Transaction Search API')
    try {
      const transactionSearch = await $fetch(
        `https://app-wallee.com/api/transaction/count?spaceId=${walleeSpaceId}`,
        { 
          method: 'POST',
          headers,
          body: {
            filter: {
              fieldName: 'state',
              operator: 'EQUALS',
              type: 'LEAF',
              value: 'PENDING'
            }
          }
        }
      )
      results.transactionCount = { success: true, data: transactionSearch }
      console.log('✅ Transaction Count: SUCCESS')
    } catch (error: any) {
      results.transactionCount = { success: false, error: error.message, statusCode: error.statusCode }
      console.log('❌ Transaction Count: FAILED', error.statusCode)
    }

    // ✅ TEST 3: Payment Method Configuration (Read-only)
    console.log('🧪 Test 3: Payment Method Configuration API')
    try {
      const paymentMethods = await $fetch(
        `https://app-wallee.com/api/payment-method-configuration/search?spaceId=${walleeSpaceId}`,
        { 
          method: 'POST',
          headers,
          body: {
            filter: {
              fieldName: 'state',
              operator: 'EQUALS', 
              type: 'LEAF',
              value: 'ACTIVE'
            }
          }
        }
      )
      results.paymentMethods = { success: true, data: paymentMethods }
      console.log('✅ Payment Methods: SUCCESS')
    } catch (error: any) {
      results.paymentMethods = { success: false, error: error.message, statusCode: error.statusCode }
      console.log('❌ Payment Methods: FAILED', error.statusCode)
    }

    // ✅ TEST 4: Application User Info (zeigt was der User kann)
    console.log('🧪 Test 4: Application User Info API')
    try {
      const userInfo = await $fetch(
        `https://app-wallee.com/api/application-user/read?spaceId=${walleeSpaceId}&id=${walleeApplicationUserId}`,
        { headers }
      )
      results.userInfo = { success: true, data: userInfo }
      console.log('✅ User Info: SUCCESS')
    } catch (error: any) {
      results.userInfo = { success: false, error: error.message, statusCode: error.statusCode }
      console.log('❌ User Info: FAILED', error.statusCode)
    }

    // ✅ TEST 5: Transaction Create (wissen wir schlägt fehl, aber warum?)
    console.log('🧪 Test 5: Transaction Create API (minimal)')
    try {
      const minimalTransaction = await $fetch(
        `https://app-wallee.com/api/transaction/create?spaceId=${walleeSpaceId}`,
        {
          method: 'POST',
          headers,
          body: {
            lineItems: [{
              uniqueId: 'test-minimal',
              name: 'Test',
              quantity: 1,
              amountIncludingTax: 1.00,
              type: 'PRODUCT'
            }],
            currency: 'CHF',
            customerId: 'test'
          }
        }
      )
      results.transactionCreate = { success: true, data: minimalTransaction }
      console.log('✅ Transaction Create: SUCCESS')
    } catch (error: any) {
      results.transactionCreate = { success: false, error: error.message, statusCode: error.statusCode }
      console.log('❌ Transaction Create: FAILED', error.statusCode)
    }

    // ✅ ZUSAMMENFASSUNG
    console.log('📊 PERMISSION TEST SUMMARY:')
    Object.entries(results).forEach(([test, result]: [string, any]) => {
      const status = result.success ? '✅' : '❌'
      const code = result.statusCode ? ` (${result.statusCode})` : ''
      console.log(`${status} ${test}${code}`)
    })

    return {
      success: true,
      message: 'Permission tests completed',
      results,
      summary: {
        total: Object.keys(results).length,
        passed: Object.values(results).filter((r: any) => r.success).length,
        failed: Object.values(results).filter((r: any) => !r.success).length
      }
    }

  } catch (error: any) {
    console.error('❌ Permission test error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Permission test failed'
    })
  }
})