// server/api/wallee/save-payment-token.post.ts
// Speichert Wallee Payment Method Token nach erfolgreicher Zahlung
// F-03: internal secret (webhook) OR authenticated payment owner — never bare body IDs alone.

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { Wallee } from 'wallee'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'
import { authorizeSavePaymentToken } from '~/server/utils/payment-token-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('💳 Wallee: Saving payment method token... [v2.3-f03-auth]')

    const body = await readBody(event)
    const actor = await authorizeSavePaymentToken(event, body || {})
    const { transactionId, userId, tenantId } = actor

    const supabase = getSupabaseAdmin()

    const walleeConfig = await getWalleeConfigForTenant(tenantId)
    const spaceId = walleeConfig.spaceId
    const config = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)

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
      authMode: actor.mode,
    })

    const state = transaction.state as string
    if (state !== 'FULFILL' && state !== 'COMPLETED' && state !== 'SUCCESSFUL') {
      logger.info('⏭️ Transaction not in completed state:', state)
      return { success: true, message: `Transaction state ${state} - no token to save`, tokenId: null }
    }

    let paymentMethodToken: string | null = null
    let displayName: string = 'Gespeicherte Zahlungsmethode'
    let paymentMethodType: string | null = null

    if (transaction.token) {
      paymentMethodToken = transaction.token.id?.toString() || null
      if (paymentMethodToken) {
        logger.info('✅ Found token directly on transaction:', paymentMethodToken)
      }
    }

    if (!paymentMethodToken && transaction.tokenId) {
      paymentMethodToken = transaction.tokenId.toString()
      logger.info('✅ Found tokenId on transaction:', paymentMethodToken)
    }

    if (!paymentMethodToken && transaction.tokens && Array.isArray(transaction.tokens) && transaction.tokens.length > 0) {
      paymentMethodToken = transaction.tokens[0].id?.toString() || null
      if (paymentMethodToken) {
        logger.info('✅ Found token in transaction.tokens array:', paymentMethodToken)
      }
    }

    if (!paymentMethodToken && transaction.customerId) {
      logger.info('🔍 Searching for tokens via Wallee TokenService for customer:', transaction.customerId)

      try {
        const tokenService: Wallee.api.TokenService = new Wallee.api.TokenService(config)
        const tokenSearchResult = await tokenService.search(spaceId, {
          filter: {
            fieldName: 'customerId',
            value: transaction.customerId.toString(),
            operator: Wallee.model.CriteriaOperator.EQUALS,
            type: Wallee.model.EntityQueryFilterType.LEAF,
          },
        })

        let allTokens: any[] = []
        if (tokenSearchResult?.body && Array.isArray(tokenSearchResult.body)) {
          allTokens = tokenSearchResult.body
        } else if (Array.isArray(tokenSearchResult)) {
          allTokens = tokenSearchResult
        }

        if (allTokens.length > 0) {
          const activeToken = allTokens.find((t: any) => t?.state === 'ACTIVE') || allTokens[0]
          if (activeToken?.id) {
            paymentMethodToken = activeToken.id.toString()
            displayName =
              activeToken.paymentConnectorConfiguration?.paymentMethodConfiguration?.name ||
              'Gespeicherte Zahlungsmethode'
            paymentMethodType =
              activeToken.paymentConnectorConfiguration?.paymentMethodConfiguration?.description ||
              'card'
            logger.info('✅ Found token via TokenService:', { tokenId: paymentMethodToken })
          }
        }
      } catch (searchError: any) {
        logger.warn('⚠️ TokenService search failed:', searchError.message)
      }
    }

    if (!paymentMethodToken && (transaction as any).chargeAttemptId) {
      try {
        const chargeAttemptService: Wallee.api.ChargeAttemptService = new Wallee.api.ChargeAttemptService(config)
        const chargeAttemptResponse = await chargeAttemptService.read(
          spaceId,
          (transaction as any).chargeAttemptId
        )
        const chargeAttempt: any = chargeAttemptResponse?.body

        if (chargeAttempt?.labels && Array.isArray(chargeAttempt.labels)) {
          const tokenLabel = chargeAttempt.labels.find(
            (label: any) =>
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

    if (!paymentMethodToken) {
      return {
        success: true,
        message: 'No payment method token available - payment method may not support tokenization',
        tokenId: null,
      }
    }

    if (!paymentMethodType) {
      paymentMethodType = 'wallee_token'
    }

    const walleeCustomerId = `dt-${tenantId}-${userId}`

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

    logger.info('💾 Saving new payment method token:', {
      paymentMethodToken,
      walleeCustomerId,
      displayName,
      paymentMethodType,
    })

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
          saved_at: new Date().toISOString(),
          auth_mode: actor.mode,
        },
        is_active: true,
      })
      .select()
      .single()

    if (saveError) {
      logger.error('❌ Failed to save token:', saveError.message, saveError.code)
      return { success: false, message: saveError.message, tokenId: null }
    }

    logger.info('✅ Payment method token saved:', savedToken.id)

    try {
      await supabase
        .from('payments')
        .update({ payment_method_id: savedToken.id })
        .eq('wallee_transaction_id', transactionId.toString())
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .is('payment_method_id', null)
    } catch (e: any) {
      logger.warn('⚠️ Could not link token to payment:', e?.message)
    }

    return {
      success: true,
      tokenId: savedToken.id,
      message: 'Payment method token saved successfully',
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    logger.error('❌ Error saving payment method token:', error.message)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to save payment method token',
    })
  }
})
