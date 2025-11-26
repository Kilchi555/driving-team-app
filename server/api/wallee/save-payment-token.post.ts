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
      chargeAttemptId: (transaction as any).chargeAttemptId,
      // Prüfe alle möglichen Felder für Token
      metadata: (transaction as any).metaData,
      paymentMethodToken: (transaction as any).paymentMethodToken,
      tokenVersion: (transaction as any).tokenVersion
    })
    
    // ✅ WICHTIG: Token wird über Charge Attempt abgerufen, nicht direkt aus Transaction!
    // Aber: Charge Attempt ist optional - nicht alle Zahlungsmethoden haben Tokens
    if ((transaction as any).chargeAttemptId) {
      console.log('🔄 Attempting to fetch Charge Attempt details for token...')
      try {
        const chargeAttemptService: Wallee.api.ChargeAttemptService = new Wallee.api.ChargeAttemptService(config)
        const chargeAttemptResponse = await chargeAttemptService.read(walleeConfig.spaceId, (transaction as any).chargeAttemptId)
        const chargeAttempt: any = chargeAttemptResponse?.body
        
        if (chargeAttempt) {
          console.log('✅ Charge Attempt fetched:', {
            id: chargeAttempt.id,
            state: chargeAttempt.state,
            labels: chargeAttempt.labels?.length || 0
          })
          
          // ✅ Token ist in den Labels versteckt
          if (chargeAttempt.labels && Array.isArray(chargeAttempt.labels)) {
            const tokenLabel = chargeAttempt.labels.find((label: any) => 
              label.descriptor?.toLowerCase().includes('token') || 
              label.descriptor?.toLowerCase().includes('card') ||
              label.content?.toLowerCase().includes('token')
            )
            
            if (tokenLabel) {
              console.log('✅ Found token in charge attempt labels:', tokenLabel)
              // Der Token könnte in verschiedenen Formaten vorliegen
              if (tokenLabel.content) {
                paymentMethodToken = tokenLabel.content
              }
            }
          }
        }
      } catch (chargeError: any) {
        console.warn('⚠️ Could not fetch charge attempt:', chargeError.message)
      }
    } else {
      console.log('ℹ️ No chargeAttemptId in transaction - this is normal for some payment methods like TWINT')
      console.log('ℹ️ Wallee handles tokenization automatically for supported methods')
    }

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
      
      console.log('🔍 Transaction details for token extraction:', {
        id: transaction.id,
        state: transaction.state,
        customerId: transaction.customerId,
        hasTokens: !!transaction.tokens,
        tokensCount: transaction.tokens?.length || 0,
        hasPaymentMethodToken: !!transactionAny.paymentMethodToken,
        allFields: Object.keys(transaction).filter(k => k.toLowerCase().includes('token'))
      })
      
      // Option 1: Token direkt in transaction
      if (transactionAny.paymentMethodToken) {
        paymentMethodToken = transactionAny.paymentMethodToken
        console.log('✅ Found payment method token in transaction:', paymentMethodToken?.substring(0, 8) + '...')
      }
      
      // Option 1b: tokens Array in transaction
      if (!paymentMethodToken && transaction.tokens && Array.isArray(transaction.tokens) && transaction.tokens.length > 0) {
        // Verwende den ersten/neuesten Token
        const tokenObj = transaction.tokens[0]
        paymentMethodToken = tokenObj.id?.toString() || tokenObj
        console.log('✅ Found token in transaction.tokens array:', typeof paymentMethodToken, paymentMethodToken?.substring ? paymentMethodToken.substring(0, 8) + '...' : paymentMethodToken)
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
      
      // Option 3: Prüfe DB ob Token bereits für diesen Customer existiert
      if (!paymentMethodToken && transaction.customerId) {
        try {
          console.log('🔍 Checking for existing payment method tokens for customer:', transaction.customerId)
          
          const walleeCustomerId = transaction.customerId.toString()
          const { data: existingTokens } = await supabase
            .from('customer_payment_methods')
            .select('id, wallee_token_id, wallee_token')
            .eq('wallee_customer_id', walleeCustomerId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)

          if (existingTokens && existingTokens.length > 0) {
            const existingToken = existingTokens[0]
            paymentMethodToken = existingToken.wallee_token_id || existingToken.wallee_token
            console.log('✅ Found existing payment method token in database:', paymentMethodToken?.substring(0, 8) + '...')
            
            // Verknüpfe diese Payment mit bestehendem Token
            if (existingToken.id) {
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
            }
            
            return {
              success: true,
              message: 'Token already exists',
              tokenId: existingToken.id
            }
          } else {
            console.log('ℹ️ No existing token in database yet - will be created when Wallee provides it')
          }
          
        } catch (dbError: any) {
          console.warn('⚠️ Could not check for existing token in database:', dbError.message)
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
      // ✅ Für Force Storage Payment Methods: Hole ECHTEN Token von Wallee
      if (transaction.customerId) {
        console.log('🔍 Fetching real token IDs from Wallee for customer:', transaction.customerId)
        
        try {
          // ✅ Hole die ECHTE Token ID von Wallee via TokenService
          const tokenService: Wallee.api.TokenService = new Wallee.api.TokenService(config)
          
          // Suche nach aktiven Tokens für diesen Customer (ohne orderBy, da das nicht funktioniert)
          const tokenSearchResult = await tokenService.search(walleeConfig.spaceId, {
            filter: {
              customerId: {
                value: transaction.customerId,
                operator: Wallee.model.CriteriaOperator.EQUALS
              }
            }
          })
          
          const allTokens = tokenSearchResult.body || []
          console.log('💳 Found all tokens from TokenService:', allTokens.length)
          
          // Filtere aktive Tokens (state === 'ACTIVE') und sortiere nach createdOn DESC
          const activeTokens = allTokens
            .filter((t: any) => t.state === 'ACTIVE' || t.state === 1)
            .sort((a: any, b: any) => {
              const aTime = a.createdOn?.getTime() || 0
              const bTime = b.createdOn?.getTime() || 0
              return bTime - aTime // DESC order
            })
          console.log('💳 Filtered active tokens:', activeTokens.length)
          
          if (activeTokens.length > 0) {
            // Nutze den neuesten Token
            const latestToken = activeTokens[0]
            paymentMethodToken = latestToken.id?.toString() || null
            displayName = latestToken.paymentConnectorConfiguration?.paymentMethodConfiguration?.name || 
                          (latestToken.cardData?.lastFourDigits ? `Karte **** ${latestToken.cardData.lastFourDigits}` : 'Gespeicherte Karte')
            paymentMethodType = latestToken.paymentConnectorConfiguration?.paymentMethodConfiguration?.description || 
                                latestToken.cardData?.brand || 'wallee_token'
            console.log('✅ Found real token from Wallee TokenService:', {
              tokenId: paymentMethodToken,
              displayName,
              type: paymentMethodType
            })
          } else {
            console.log('⚠️ No active tokens found for customer in Wallee')
          }
        } catch (searchError: any) {
          console.warn('⚠️ Could not fetch tokens from Wallee TokenService:', searchError.message)
        }
      }
      
    if (!paymentMethodToken) {
      // ✅ FALLBACK für TWINT mit Force Storage: Nutze die LANGE Customer ID aus der Transaction
      if (transaction.customerId) {
        console.log('🔄 No explicit token found, using transaction customerId as fallback (typical for TWINT Force Storage)')
        // ✅ WICHTIG: Verwende die Customer ID DIREKT aus der Transaction - nicht neu generieren!
        // Diese ID muss EXAKT übereinstimmen mit der ID, die beim Erstellen der Transaction verwendet wurde!
        paymentMethodToken = transaction.customerId.toString()
        console.log('🔑 Using Customer ID from transaction:', paymentMethodToken)
        displayName = 'TWINT (Gespeichert)'
        paymentMethodType = 'twint'
      } else {
        console.warn('⚠️ No payment method token available yet. Token will be saved when Wallee provides it via webhook.')
        return {
          success: true,
          message: 'No payment method token available yet. Will be saved when available.',
          tokenId: null
        }
      }
    }
    }

    // ✅ Speichere Token in unserer Datenbank
    console.log('🔍 Looking up user:', userId)
    
    // ✅ Setze Default für payment_method_type wenn nicht vorhanden
    if (!paymentMethodType) {
      paymentMethodType = 'wallee_token' // Default für alle Wallee Zahlungsmethoden
      console.log('ℹ️ Using default payment_method_type:', paymentMethodType)
    }
    
    if (!userId) {
      console.warn('⚠️ No userId provided - cannot save token without user')
      return {
        success: true,
        message: 'No userId provided - token saved in Wallee only',
        tokenId: null
      }
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .maybeSingle()

    if (userError) {
      console.warn('⚠️ Error looking up user:', userError)
      // Continue anyway - user lookup is not critical
    }
    
    if (!userData) {
      console.warn('⚠️ User not found for userId:', userId)
      // Continue anyway - we can still save the token without user details
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
    console.log('💾 Saving new payment method token...')
    const { data: savedToken, error: saveError } = await supabase
      .from('customer_payment_methods')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        payment_provider: 'wallee',
        payment_method_type: paymentMethodType,
        provider_payment_method_id: paymentMethodToken, // ✅ Use token as provider ID
        wallee_token: paymentMethodToken,
        wallee_customer_id: walleeCustomerId,
        display_name: displayName,
        metadata: {
          transaction_id: transactionId,
          saved_at: new Date().toISOString()
        },
        is_active: true
      })
      .select()
      .single()

    if (saveError) {
      // RLS errors are expected when called from webhook (not authenticated user)
      // Token is still saved in Wallee, just not in our DB yet
      if (saveError.message.includes('row-level security')) {
        console.warn('⚠️ RLS policy prevented token save - but token is saved in Wallee')
        console.log('ℹ️ Token will be available for future one-click payments via Wallee')
        return {
          success: true,
          message: 'Token saved in Wallee (RLS prevented DB storage)',
          tokenId: null
        }
      }
      throw saveError
    }

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

