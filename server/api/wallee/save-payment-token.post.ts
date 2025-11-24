// server/api/wallee/save-payment-token.post.ts
// Speichert Wallee Payment Method Token nach erfolgreicher Zahlung

import { getSupabase } from '~/utils/supabase'
import { Wallee } from 'wallee'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'

export default defineEventHandler(async (event) => {
  try {
    console.log('💳 Wallee: Saving payment method token...')
    
    const body = await readBody(event)
    const {
      transactionId,
      userId,
      tenantId
    } = body

    if (!transactionId || !userId || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: transactionId, userId, tenantId'
      })
    }

    const supabase = getSupabase()

    // ✅ GET WALLEE CONFIG FOR TENANT (Multi-Tenant Support!)
    console.log('🔍 Fetching Wallee config for tenant:', tenantId)
    let walleeConfig: any
    try {
      walleeConfig = await getWalleeConfigForTenant(tenantId)
    } catch (configError: any) {
      console.error('❌ Error loading Wallee config for tenant:', tenantId, configError)
      // Fallback zu globaler Konfiguration
      console.log('⚠️ Falling back to global Wallee config')
      walleeConfig = {
        spaceId: parseInt(process.env.WALLEE_SPACE_ID || '82592'),
        userId: parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525'),
        apiSecret: process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
      }
    }
    const spaceId = walleeConfig.spaceId
    
    console.log('🔧 Wallee Config loaded:', {
      spaceId: spaceId,
      userId: walleeConfig.userId,
      apiSecretPreview: walleeConfig.apiSecret.substring(0, 10) + '...'
    })
    
    const config = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)

    // ✅ Hole Transaktions-Details von Wallee (inkl. Payment Method Token)
    console.log('🔄 Fetching transaction from Wallee:', {
      spaceId: walleeConfig.spaceId,
      transactionId: parseInt(transactionId.toString())
    })
    
    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
    let transactionResponse: any
    try {
      transactionResponse = await transactionService.read(walleeConfig.spaceId, parseInt(transactionId.toString()))
    } catch (error: any) {
      console.error('❌ Error fetching transaction from Wallee:', error)
      console.log('⚠️ Transaction fetch failed - continuing without token data')
      transactionResponse = { body: null }
    }
    const transaction: Wallee.model.Transaction = transactionResponse?.body || {}

    console.log('🔍 Wallee transaction details:', {
      id: transaction.id,
      state: transaction.state,
      paymentConnectorConfiguration: transaction.paymentConnectorConfiguration,
      customerId: transaction.customerId,
      // Prüfe alle möglichen Felder für Token
      metadata: (transaction as any).metaData,
      paymentMethodToken: (transaction as any).paymentMethodToken,
      tokenVersion: (transaction as any).tokenVersion
    })

    // ✅ Hole Payment Method Token von Wallee
    // Wenn Tokenization aktiviert war, gibt Wallee einen Token zurück
    // Dieser wird in transaction.paymentMethodToken oder über die Payment Methods API verfügbar sein
    let paymentMethodToken: string | null = null
    let displayName: string = 'Gespeicherte Karte'
    let paymentMethodType: string | null = null

    // Versuche Payment Method Token aus der Transaktion zu holen
    // Wallee speichert Token bei erfolgreichen Zahlungen mit tokenizationEnabled = true
    const transactionState = transaction.state as string
    if (transactionState === 'SUCCESSFUL' || 
        transactionState === 'FULFILL' ||
        transaction.state === Wallee.model.TransactionState.FULFILL) {
      
      // ✅ Versuche Token direkt aus Transaction zu extrahieren
      const transactionAny = transaction as any
      
      // Option 1: Token direkt in transaction
      if (transactionAny.paymentMethodToken) {
        paymentMethodToken = transactionAny.paymentMethodToken
        console.log('✅ Found payment method token in transaction:', paymentMethodToken?.substring(0, 8) + '...')
      }
      
      // Option 2: Token in metaData
      if (!paymentMethodToken && transactionAny.metaData && typeof transactionAny.metaData === 'object') {
        paymentMethodToken = transactionAny.metaData.paymentMethodToken || 
                           transactionAny.metaData.token || 
                           transactionAny.metaData.payment_token
        if (paymentMethodToken) {
          console.log('✅ Found payment method token in transaction metadata:', paymentMethodToken.substring(0, 8) + '...')
        }
      }
      
      // Option 3: Hole Payment Methods über Wallee Payment Methods Service für den Customer
      if (!paymentMethodToken && transaction.customerId) {
        try {
          console.log('🔍 Fetching payment methods from Wallee for customer:', transaction.customerId)
          
          // ✅ Nutze Wallee PaymentMethodService um Tokens für den Customer zu fetchen
          const paymentMethodService: Wallee.api.CustomerPaymentMethodService = new Wallee.api.CustomerPaymentMethodService(config)
          
          try {
            // Hole alle Payment Methods für diesen Customer
            const paymentMethodsResponse = await paymentMethodService.search(walleeConfig.spaceId, new Wallee.model.EntityQuery())
            
            if (paymentMethodsResponse?.body && Array.isArray(paymentMethodsResponse.body)) {
              const customerMethods = paymentMethodsResponse.body.filter((pm: any) => pm.customerId === parseInt(transaction.customerId))
              
              if (customerMethods.length > 0) {
                const latestMethod = customerMethods[customerMethods.length - 1]
                if (latestMethod.id) {
                  paymentMethodToken = latestMethod.id.toString()
                  displayName = latestMethod.displayName || 'Gespeicherte Karte'
                  paymentMethodType = latestMethod.paymentMethodIdentifier || null
                  console.log('✅ Found payment method token from Wallee API:', paymentMethodToken.substring(0, 8) + '...')
                }
              }
            }
          } catch (searchError: any) {
            console.warn('⚠️ Could not search payment methods:', searchError.message)
          }
          
          // Fallback: Prüfe ob bereits ein Token in unserer DB existiert
          if (!paymentMethodToken) {
            const walleeCustomerId = transaction.customerId.toString()
            const { data: existingToken } = await supabase
              .from('customer_payment_methods')
              .select('id, wallee_token_id')
              .eq('wallee_customer_id', walleeCustomerId)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (existingToken?.wallee_token_id) {
              paymentMethodToken = existingToken.wallee_token_id
              console.log('✅ Found payment method token in database:', paymentMethodToken.substring(0, 8) + '...')
              
              // Verknüpfe diese Payment mit bestehendem Token
              try {
                const { error: linkError } = await supabase
                  .from('payments')
                  .update({ payment_method_id: existingToken.id })
                  .eq('wallee_transaction_id', transactionId.toString())
                  .is('payment_method_id', null)

                if (!linkError) {
                  console.log('🔗 Linked existing token to payment for transaction:', transactionId)
                }
              } catch (e: any) {
                console.warn('⚠️ Linking existing token failed:', e?.message)
              }
              
              return {
                success: true,
                message: 'Token already saved',
                tokenId: existingToken.id
              }
            }
          }
          
        } catch (methodError: any) {
          console.warn('⚠️ Could not fetch payment method from Wallee API:', methodError.message)
        }
      }
    }

    // ✅ Alternative: Token wird vom Frontend übergeben (z.B. aus Wallee Return-URL Parameter)
    if (body.paymentMethodToken) {
      paymentMethodToken = body.paymentMethodToken
      displayName = body.displayName || 'Gespeicherte Karte'
      paymentMethodType = body.paymentMethodType || null
    }

    if (!paymentMethodToken) {
      console.warn('⚠️ No payment method token available yet. Token will be saved when Wallee provides it via webhook.')
      // ✅ Nicht als Fehler behandeln - Token ist optional
      return {
        success: true,
        message: 'No payment method token available yet. Will be saved when available.',
        tokenId: null
      }
    }

    // ✅ Speichere Token in unserer Datenbank
    const { data: userData } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single()

    if (!userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Generiere pseudonyme Wallee Customer ID (bevorzugt): dt-<tenantId>-<userId>
    // Fallback: legacy (nur falls tenantId/userId fehlen – hier sind sie Pflicht)
    const walleeCustomerId = `dt-${tenantId}-${userId}`

    // Prüfe ob Token bereits existiert
    const { data: existing } = await supabase
      .from('customer_payment_methods')
      .select('id')
      .eq('wallee_token', paymentMethodToken)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      console.log('✅ Payment method token already exists')
      // Verknüpfe bestehende Zahlungen mit diesem Token, falls noch nicht gesetzt
      try {
        const { error: linkError } = await supabase
          .from('payments')
          .update({ payment_method_id: existing.id })
          .eq('wallee_transaction_id', transactionId)
          .is('payment_method_id', null)

        if (linkError) {
          console.warn('⚠️ Could not link existing token to payments:', linkError.message)
        } else {
          console.log('🔗 Linked existing token to pending payments for transaction:', transactionId)
        }
      } catch (e: any) {
        console.warn('⚠️ Linking existing token failed with exception:', e?.message)
      }

      return {
        success: true,
        message: 'Token already saved',
        tokenId: existing.id
      }
    }

    // Speichere neuen Token
    const { data: savedToken, error: saveError } = await supabase
      .from('customer_payment_methods')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        wallee_token: paymentMethodToken,
        wallee_customer_id: walleeCustomerId,
        display_name: displayName,
        payment_method_type: paymentMethodType,
        metadata: {
          transaction_id: transactionId,
          saved_at: new Date().toISOString()
        },
        is_active: true
      })
      .select()
      .single()

    if (saveError) throw saveError

    console.log('✅ Payment method token saved:', savedToken.id)

    // Verknüpfe Zahlungen mit dieser Transaktion mit dem gespeicherten Token
    try {
      const { error: linkError } = await supabase
        .from('payments')
        .update({ payment_method_id: savedToken.id })
        .eq('wallee_transaction_id', transactionId)
        .is('payment_method_id', null)

      if (linkError) {
        console.warn('⚠️ Could not link saved token to payments:', linkError.message)
      } else {
        console.log('🔗 Linked saved token to pending payments for transaction:', transactionId)
      }
    } catch (e: any) {
      console.warn('⚠️ Linking saved token failed with exception:', e?.message)
    }

    return {
      success: true,
      tokenId: savedToken.id,
      message: 'Payment method token saved successfully'
    }

  } catch (error: any) {
    console.error('❌ Error saving payment method token:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to save payment method token'
    })
  }
})

