// server/api/wallee/sync-payment-methods.post.ts
// Synchronisiert Payment Methods aus Wallee und speichert sie in unserer DB
// Wird nach erfolgreichen Zahlungen aufgerufen, um Tokens zu speichern

import { getSupabaseAdmin } from '~/utils/supabase'
import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔄 Syncing payment methods from Wallee...')
    
    const body = await readBody(event)
    const { userId, tenantId, transactionId } = body

    if (!userId || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: userId, tenantId'
      })
    }

    const supabase = getSupabaseAdmin()

    // ✅ WALLEE SDK KONFIGURATION
    const spaceId: number = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userIdWallee: number = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret: string = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    
    const config = {
      space_id: spaceId,
      user_id: userIdWallee,
      api_secret: apiSecret
    }

    // Generiere Customer ID (pseudonym)
    const walleeCustomerId = `dt-${tenantId}-${userId}`

    // ✅ Hole Customer von Wallee
    const customerService: Wallee.api.CustomerService = new Wallee.api.CustomerService(config)
    
    let customers: any
    try {
      customers = await customerService.search(spaceId, {
        filter: {
          fieldName: 'customerId',
          value: walleeCustomerId,
          type: Wallee.model.EntityQueryFilterType.LEAF,
          operator: Wallee.model.CriteriaOperator.EQUALS
        }
      })
      console.log('🔍 Customer search result:', { 
        hasBody: !!customers?.body, 
        bodyLength: customers?.body?.length,
        raw: customers 
      })
    } catch (searchError: any) {
      console.error('❌ Customer search failed:', searchError.message)
      // Kein Customer gefunden - das ist OK, Token kann trotzdem existieren
      console.log('ℹ️ Skipping customer check, proceeding with token search')
      customers = null
    }

    const customerList = customers?.body || customers || []
    
    if (customerList.length === 0) {
      console.log('ℹ️ No customer found with ID:', walleeCustomerId, '- proceeding with token search anyway')
    } else {
      const customer = customerList[0]
      console.log('✅ Customer found:', customer.id)
    }

    // ✅ Hole aktive Payment Tokens direkt von Wallee über TokenService
    const tokenService: Wallee.api.TokenService = new Wallee.api.TokenService(config)
    
    let tokens: any[] = []
    try {
      const tokenSearchResult = await tokenService.search(spaceId, {
        filter: {
          fieldName: 'customerId',
          value: walleeCustomerId,
          type: Wallee.model.EntityQueryFilterType.LEAF,
          operator: Wallee.model.CriteriaOperator.EQUALS
        }
      })
      
      tokens = tokenSearchResult.body || []
      console.log('💳 Found active tokens from TokenService:', tokens.length)
    } catch (tokenError: any) {
      console.warn('⚠️ Could not fetch tokens from TokenService:', tokenError.message)
      // Fallback auf Transaktionen
      tokens = []
    }

    let paymentMethods: any[] = []

    if (tokens.length > 0) {
      // Verwende Tokens von TokenService (beste Methode)
      paymentMethods = tokens.map(token => ({
        wallee_token: token.id.toString(),
        display_name: token.paymentConnectorConfiguration?.paymentMethodConfiguration?.name || 
                      (token.cardData?.lastFourDigits ? `Karte **** ${token.cardData.lastFourDigits}` : 'Gespeicherte Karte'),
        payment_method_type: token.paymentConnectorConfiguration?.paymentMethodConfiguration?.description || 
                            token.cardData?.brand || 'CARD',
        last4: token.cardData?.lastFourDigits || null,
        brand: token.cardData?.brand || null,
        expires_at: token.cardData?.expiryDate || null,
        is_default: token.defaultToken || false,
        created_on: token.createdOn,
        last_used: token.createdOn
      }))
    } else {
      // Fallback: Extrahiere aus Transaktionen
      const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
      
      const transactions = await transactionService.search(spaceId, {
        filter: {
          fieldName: 'customerId',
          value: walleeCustomerId,
          type: Wallee.model.EntityQueryFilterType.LEAF,
          operator: Wallee.model.CriteriaOperator.EQUALS
        }
      })

      console.log('📊 Found transactions (fallback):', transactions.length)

      if (transactions.length === 0) {
        return {
          success: false,
          message: 'No payment methods or transactions found for this customer'
        }
      }

      // Extrahiere Payment Methods aus den Transaktionen
      const paymentMethodsMap = new Map()

      for (const transaction of transactions) {
        const transactionAny = transaction as any
        
        if (transactionAny.paymentConnectorConfiguration?.paymentMethodConfiguration) {
          const pmConfig = transactionAny.paymentConnectorConfiguration.paymentMethodConfiguration
          const pmId = pmConfig.id
          
          if (!paymentMethodsMap.has(pmId)) {
            const cardData = transactionAny.paymentConnectorConfiguration?.cardData || {}
            
            paymentMethodsMap.set(pmId, {
              wallee_token: pmId.toString(),
              display_name: cardData.brand 
                ? `${cardData.brand} **** ${cardData.last4 || '****'}`
                : pmConfig.name || 'Gespeicherte Karte',
              payment_method_type: pmConfig.paymentMethod || 'CARD',
              last4: cardData.last4 || null,
              brand: cardData.brand || null,
              expires_at: cardData.expiryDate || null,
              last_used: transaction.createdOn,
              transaction_id: transaction.id
            })
          }
        }
      }

      paymentMethods = Array.from(paymentMethodsMap.values())
    }

    console.log('💳 Found payment methods:', paymentMethods.length)

    if (paymentMethods.length === 0) {
      return {
        success: false,
        message: 'No payment methods found'
      }
    }

    // ✅ Speichere/Update Payment Methods in unserer DB
    const savedTokens = []
    
    for (const pm of paymentMethods) {
      // Prüfe ob bereits existiert
      const { data: existing } = await supabase
        .from('customer_payment_methods')
        .select('id')
        .eq('wallee_customer_id', walleeCustomerId)
        .eq('wallee_token', pm.wallee_token)
        .maybeSingle()

      if (existing) {
        // Update existing
        const { data: updated, error: updateError } = await supabase
          .from('customer_payment_methods')
          .update({
            display_name: pm.display_name,
            payment_method_type: pm.payment_method_type,
            metadata: {
              last4: pm.last4,
              brand: pm.brand,
              expires_at: pm.expires_at,
              last_used: pm.last_used,
              transaction_id: pm.transaction_id,
              synced_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) {
          console.error('❌ Error updating payment method:', updateError)
        } else if (updated) {
          savedTokens.push(updated)
        }
      } else {
        // Insert new
        const { data: inserted, error: insertError } = await supabase
          .from('customer_payment_methods')
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            wallee_customer_id: walleeCustomerId,
            wallee_token: pm.wallee_token,
            display_name: pm.display_name,
            payment_method_type: pm.payment_method_type,
            is_active: true,
            is_default: savedTokens.length === 0, // Erste wird default
            metadata: {
              last4: pm.last4,
              brand: pm.brand,
              expires_at: pm.expires_at,
              last_used: pm.last_used,
              transaction_id: pm.transaction_id,
              synced_at: new Date().toISOString()
            }
          })
          .select()
          .single()

        if (insertError) {
          console.error('❌ Error inserting payment method:', insertError)
        } else if (inserted) {
          savedTokens.push(inserted)
        }
      }
    }

    // ✅ Verknüpfe Payments mit den gespeicherten Tokens
    if (transactionId && savedTokens.length > 0) {
      const defaultToken = savedTokens.find(t => t.is_default) || savedTokens[0]
      
      await supabase
        .from('payments')
        .update({ payment_method_id: defaultToken.id })
        .eq('wallee_transaction_id', transactionId)
        .is('payment_method_id', null)
    }

    console.log('✅ Synced payment methods:', savedTokens.length)

    return {
      success: true,
      message: `Synced ${savedTokens.length} payment method(s)`,
      tokens: savedTokens
    }

  } catch (error: any) {
    console.error('❌ Error syncing payment methods:', error)
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    })
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to sync payment methods',
      data: { originalError: error.message }
    })
  }
})

