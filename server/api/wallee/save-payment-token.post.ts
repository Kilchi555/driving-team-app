// server/api/wallee/save-payment-token.post.ts
// Speichert Wallee Payment Method Token nach erfolgreicher Zahlung

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { Wallee } from 'wallee'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    logger.info('💳 Wallee: Saving payment method token... [v2.2-token-fix]')
    
    const body = await readBody(event)
    const { transactionId, userId, tenantId } = body

    if (!transactionId || !userId || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: transactionId, userId, tenantId'
      })
    }

    const supabase = getSupabaseAdmin()

    // Load Wallee config
    const walleeConfig = await getWalleeConfigForTenant(tenantId)
    const spaceId = walleeConfig.spaceId
    const config = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)

    // Fetch transaction from Wallee
    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
    let transaction: any = {}
    
    try {
      const transactionResponse = await transactionService.read(spaceId, parseInt(transactionId.toString()))
      transaction = transactionResponse?.body || {}
    } catch (error: any) {
      logger.error('❌ Error fetching transaction from Wallee:', error.message)
      return { success: false, message: 'Could not fetch transaction from Wallee', tokenId: null }
    }

    logger.info('🔍 Transaction details for token extraction:', {
      id: transaction.id,
      state: transaction.state,
      customerId: transaction.customerId,
      tokenizationMode: transaction.tokenizationMode,
      token: transaction.token ? { id: transaction.token.id, state: transaction.token.state } : null,
      allTokenFields: Object.keys(transaction).filter((k: string) => k.toLowerCase().includes('token'))
    })

    // Only process FULFILL/COMPLETED transactions
    const state = transaction.state as string
    if (state !== 'FULFILL' && state !== 'COMPLETED' && state !== 'SUCCESSFUL') {
      logger.info('⏭️ Transaction not in completed state:', state)
      return { success: true, message: `Transaction state ${state} - no token to save`, tokenId: null }
    }

    let paymentMethodToken: string | null = null
    let displayName: string = 'Gespeicherte Zahlungsmethode'
    let paymentMethodType: string | null = null

    // ============ STRATEGY 1: Extract token directly from transaction ============
    if (transaction.token) {
      const tokenObj = transaction.token
      paymentMethodToken = tokenObj.id?.toString() || null
      if (paymentMethodToken) {
        logger.info('✅ Found token directly on transaction:', paymentMethodToken)
      }
    }

    if (!paymentMethodToken && transaction.tokenId) {
      paymentMethodToken = transaction.tokenId.toString()
      logger.info('✅ Found tokenId on transaction:', paymentMethodToken)
    }

    // ============ STRATEGY 2: Check tokens array ============
    if (!paymentMethodToken && transaction.tokens && Array.isArray(transaction.tokens) && transaction.tokens.length > 0) {
      const tokenObj = transaction.tokens[0]
      paymentMethodToken = tokenObj.id?.toString() || null
      if (paymentMethodToken) {
        logger.info('✅ Found token in transaction.tokens array:', paymentMethodToken)
      }
    }

    // ============ STRATEGY 3: Search via Wallee TokenService ============
    if (!paymentMethodToken && transaction.customerId) {
      logger.info('🔍 Searching for tokens via Wallee TokenService for customer:', transaction.customerId)
      
      try {
        const tokenService: Wallee.api.TokenService = new Wallee.api.TokenService(config)
        logger.debug('🔧 TokenService created successfully')
        
        // Search for tokens linked to this customer
        let tokenSearchResult: any = null
        try {
          tokenSearchResult = await tokenService.search(spaceId, {
            filter: {
              fieldName: 'customerId',
              value: transaction.customerId.toString(),
              operator: Wallee.model.CriteriaOperator.EQUALS,
              type: Wallee.model.EntityQueryFilterType.LEAF
            }
          })
          logger.debug('🔧 TokenService search completed, result type:', typeof tokenSearchResult)
        } catch (innerError: any) {
          logger.warn('⚠️ TokenService.search() threw error:', innerError.message)
          throw innerError
        }
        
        // Extract tokens array - handle both wrapped and unwrapped responses
        let allTokens: any[] = []
        if (tokenSearchResult !== null && tokenSearchResult !== undefined) {
          if (tokenSearchResult?.body && Array.isArray(tokenSearchResult.body)) {
            allTokens = tokenSearchResult.body
          } else if (Array.isArray(tokenSearchResult)) {
            allTokens = tokenSearchResult
          } else {
            logger.warn('⚠️ TokenService result is neither wrapped nor array, type:', typeof tokenSearchResult)
          }
        }
        
        logger.info('💳 TokenService search result:', {
          count: allTokens.length,
          tokens: allTokens.map((t: any) => ({
            id: t?.id,
            state: t?.state,
            customerId: t?.customerId,
            enabledForOneClick: t?.enabledForOneClickPayment,
            paymentMethodBrand: t?.paymentConnectorConfiguration?.paymentMethodConfiguration?.name
          }))
        })
        
        // Find the most recent active token
        if (allTokens && allTokens.length > 0) {
          const activeToken = allTokens.find((t: any) => t?.state === 'ACTIVE') || allTokens[0]
          
          if (activeToken && activeToken.id) {
            paymentMethodToken = activeToken.id.toString()
            displayName = activeToken.paymentConnectorConfiguration?.paymentMethodConfiguration?.name || 'Gespeicherte Zahlungsmethode'
            paymentMethodType = activeToken.paymentConnectorConfiguration?.paymentMethodConfiguration?.description || 'card'
            logger.info('✅ Found token via TokenService:', {
              tokenId: paymentMethodToken,
              displayName,
              type: paymentMethodType
            })
          }
        }
      } catch (searchError: any) {
        logger.warn('⚠️ TokenService search failed:', searchError.message, searchError.stack)
      }
    }

    // ============ STRATEGY 4: Try ChargeAttempt labels ============
    if (!paymentMethodToken && (transaction as any).chargeAttemptId) {
      try {
        const chargeAttemptService: Wallee.api.ChargeAttemptService = new Wallee.api.ChargeAttemptService(config)
        const chargeAttemptResponse = await chargeAttemptService.read(spaceId, (transaction as any).chargeAttemptId)
        const chargeAttempt: any = chargeAttemptResponse?.body
        
        if (chargeAttempt?.labels && Array.isArray(chargeAttempt.labels)) {
          const tokenLabel = chargeAttempt.labels.find((label: any) => 
            label.descriptor?.toLowerCase().includes('token') || 
            label.descriptor?.toLowerCase().includes('card')
          )
          
          if (tokenLabel?.content) {
            paymentMethodToken = tokenLabel.content
            logger.info('✅ Found token in ChargeAttempt labels:', paymentMethodToken)
          }
        }
      } catch (chargeError: any) {
        logger.warn('⚠️ ChargeAttempt fetch failed:', chargeError.message)
      }
    }

    // ============ NO TOKEN FOUND ============
    if (!paymentMethodToken) {
      logger.info('ℹ️ No payment method token found for transaction:', transactionId, {
        hasCustomerId: !!transaction.customerId,
        state: transaction.state,
        tokenizationMode: transaction.tokenizationMode
      })
      return {
        success: true,
        message: 'No payment method token available - payment method may not support tokenization',
        tokenId: null
      }
    }

    // ============ SAVE TOKEN TO DATABASE ============
    if (!userId) {
      logger.warn('⚠️ No userId provided - cannot save token')
      return { success: true, message: 'No userId - token not saved locally', tokenId: null }
    }

    if (!paymentMethodType) {
      paymentMethodType = 'wallee_token'
    }

    const walleeCustomerId = `dt-${tenantId}-${userId}`

    // Check if token already exists
    const { data: existing } = await supabase
      .from('customer_payment_methods')
      .select('id')
      .eq('wallee_token', paymentMethodToken)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      logger.info('✅ Payment method token already exists:', existing.id)
      return { success: true, message: 'Token already saved', tokenId: existing.id }
    }

    // Get user display name
    const { data: userData } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .maybeSingle()

    // Save new token
    logger.info('💾 Saving new payment method token:', { paymentMethodToken, walleeCustomerId, displayName, paymentMethodType })
    
    const { data: savedToken, error: saveError } = await supabase
      .from('customer_payment_methods')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        payment_provider: 'wallee',
        payment_method_type: paymentMethodType,
        provider_payment_method_id: paymentMethodToken,
        wallee_token: paymentMethodToken,
        wallee_customer_id: walleeCustomerId,
        display_name: displayName,
        metadata: {
          transaction_id: transactionId,
          wallee_state: transaction.state,
          saved_at: new Date().toISOString()
        },
        is_active: true
      })
      .select()
      .single()

    if (saveError) {
      logger.error('❌ Failed to save token:', saveError.message, saveError.code)
      return { success: false, message: saveError.message, tokenId: null }
    }

    logger.info('✅ Payment method token saved:', savedToken.id)

    // Link token to payment
    try {
      await supabase
        .from('payments')
        .update({ payment_method_id: savedToken.id })
        .eq('wallee_transaction_id', transactionId.toString())
        .is('payment_method_id', null)
    } catch (e: any) {
      logger.warn('⚠️ Could not link token to payment:', e?.message)
    }

    return {
      success: true,
      tokenId: savedToken.id,
      message: 'Payment method token saved successfully'
    }

  } catch (error: any) {
    logger.error('❌ Error saving payment method token:', error.message)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to save payment method token'
    })
  }
})
