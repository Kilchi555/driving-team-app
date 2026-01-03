// server/api/admin/check-transaction-token.get.ts
// Prüft ob eine Wallee Transaction Tokenization aktiviert hat und ob ein Token verfügbar ist

import { Wallee } from 'wallee'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

export default defineEventHandler(async (event) => {
  let user: any = null
  let ip: string = ''
  
  try {
    // 1. AUTHENTICATION
    user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    // 2. AUTHORIZATION
    if (!['admin', 'super_admin', 'tenant_admin'].includes(user.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Admin role required'
      })
    }

    // 3. RATE LIMITING
    ip = getClientIP(event)
    const { allowed, retryAfter } = await checkRateLimit(
      ip,
      'check_transaction',
      30, // 30 requests
      60000 // per 1 minute
    )

    if (!allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Rate limit exceeded. Retry after ${retryAfter}ms`
      })
    }

    // 4. INPUT VALIDATION
    const query = getQuery(event)
    const transactionId = query.transactionId as string

    if (!transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'transactionId query parameter is required'
      })
    }

    // Validate format: should be numeric transaction ID
    if (!/^\d+$/.test(transactionId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'transactionId must be a numeric ID'
      })
    }

    // ✅ WALLEE SDK KONFIGURATION
    const spaceId: number = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userIdWallee: number = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret: string = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='

    const config = {
      space_id: spaceId,
      user_id: userIdWallee,
      api_secret: apiSecret
    }

    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)

    // ✅ Hole Transaction von Wallee
    const transactionResponse = await transactionService.read(spaceId, parseInt(transactionId))
    const transaction: Wallee.model.Transaction = transactionResponse.body

    const transactionAny = transaction as any

    // ✅ Prüfe alle relevanten Felder
    const result = {
      transactionId: transaction.id,
      state: transaction.state,
      merchantReference: transaction.merchantReference,
      
      // Tokenization-Checks
      hasCustomerId: !!transaction.customerId,
      customerId: transaction.customerId,
      tokenizationEnabled: transactionAny.tokenizationEnabled !== undefined ? transactionAny.tokenizationEnabled : null,
      
      // Token-Checks
      hasPaymentMethodToken: !!transactionAny.paymentMethodToken,
      paymentMethodToken: transactionAny.paymentMethodToken || null,
      paymentMethodTokenPreview: transactionAny.paymentMethodToken 
        ? transactionAny.paymentMethodToken.substring(0, 20) + '...' 
        : null,
      
      // Metadata-Checks
      hasMetadata: !!transactionAny.metaData,
      metadataKeys: transactionAny.metaData ? Object.keys(transactionAny.metaData) : [],
      tokenInMetadata: transactionAny.metaData 
        ? !!(transactionAny.metaData.paymentMethodToken || transactionAny.metaData.token || transactionAny.metaData.payment_token)
        : false,
      
      // Payment Connector Info
      paymentConnectorConfiguration: transaction.paymentConnectorConfiguration 
        ? {
            id: transaction.paymentConnectorConfiguration.id,
            name: transaction.paymentConnectorConfiguration.name,
            paymentMethod: transaction.paymentConnectorConfiguration.paymentMethod
          }
        : null,
      
      // Full Transaction Object (für Debug)
      fullTransaction: {
        id: transaction.id,
        state: transaction.state,
        customerId: transaction.customerId,
        merchantReference: transaction.merchantReference,
        // Nur relevante Felder, nicht alles (zu groß)
        paymentMethodToken: transactionAny.paymentMethodToken,
        tokenizationEnabled: transactionAny.tokenizationEnabled,
        metaData: transactionAny.metaData
      },
      
      // Diagnose
      diagnosis: {
        tokenizationWasEnabled: !!transaction.customerId,
        tokenShouldBeAvailable: transaction.state === 'SUCCESSFUL' || transaction.state === 'FULFILL',
        tokenIsAvailable: !!transactionAny.paymentMethodToken || 
                         (transactionAny.metaData && (
                           transactionAny.metaData.paymentMethodToken || 
                           transactionAny.metaData.token || 
                           transactionAny.metaData.payment_token
                         )),
        canBeSaved: false as boolean
      }
    }

    // ✅ Berechne ob Token gespeichert werden kann
    result.diagnosis.canBeSaved = 
      result.diagnosis.tokenizationWasEnabled && 
      result.diagnosis.tokenShouldBeAvailable && 
      result.diagnosis.tokenIsAvailable

    // 6. AUDIT LOGGING (SUCCESS)
    await logAudit({
      user_id: user.id,
      action: 'admin_check_transaction_token',
      resource_type: 'wallee_transaction',
      resource_id: transactionId,
      status: 'success',
      details: {
        transaction_state: result.state,
        has_token: result.diagnosis.tokenIsAvailable
      },
      ip_address: ip
    })

    return {
      success: true,
      data: result
    }

  } catch (error: any) {
    console.error('❌ Error checking transaction token:', error)
    
    // 6. AUDIT LOGGING (ERROR)
    if (user) {
      await logAudit({
        user_id: user.id,
        action: 'admin_check_transaction_token_error',
        status: 'error',
        error_message: error.message || 'Failed to check transaction token',
        ip_address: ip
      }).catch(() => {}) // Ignore audit logging errors
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to check transaction token'
    })
  }
})

