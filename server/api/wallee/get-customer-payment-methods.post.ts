// server/api/wallee/get-customer-payment-methods.post.ts
// ✅ WALLEE - Gespeicherte Zahlungsmethoden eines Kunden abrufen

import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  console.log('🔍 Getting customer payment methods from Wallee...')
  
  try {
    const body = await readBody(event)
    console.log('📨 Received request:', body)
    
    // Support both legacy email-based and new pseudonymous ID scheme
    const { customerEmail, userId: requestUserId, tenantId: requestTenantId } = body as {
      customerEmail?: string
      userId?: string
      tenantId?: string
    }
    
    if (!customerEmail && !(requestUserId && requestTenantId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required identifier: provide customerEmail or (userId and tenantId)'
      })
    }

    // ✅ WALLEE SDK KONFIGURATION
    const spaceId: number = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userId: number = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret: string = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    
    const config = {
      space_id: spaceId,
      user_id: userId,
      api_secret: apiSecret
    }
    
    // ✅ Konsistente Customer IDs (neue pseudonyme ID bevorzugen, E-Mail-basiert als Fallback)
    const buildEmailCustomerId = (email: string) => {
      const base = email.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      return `dt-${base}-${base.length > 20 ? base.substring(0, 20) : base}`
    }
    const pseudonymousId = requestTenantId && requestUserId ? `dt-${requestTenantId}-${requestUserId}` : undefined
    const legacyId = customerEmail ? buildEmailCustomerId(customerEmail) : undefined
    
    // Try order: pseudonymous first, then legacy
    const candidateCustomerIds = [pseudonymousId, legacyId].filter(Boolean) as string[]
    
    console.log('🔍 Looking for payment methods for customers (by priority):', candidateCustomerIds)
    
    // ✅ CUSTOMER SERVICE für Customer-Details
    const customerService: Wallee.api.CustomerService = new Wallee.api.CustomerService(config)
    
    try {
      let foundCustomer: any = null
      let usedCustomerId: string | undefined
      
      // Versuche nacheinander alle Kandidaten-IDs
      for (const candidateId of candidateCustomerIds) {
        const customers = await customerService.search(spaceId, {
          filter: {
            customerId: {
              value: candidateId,
              operator: Wallee.model.CriteriaOperator.EQUALS
            }
          }
        })
        if (customers && customers.length > 0) {
          foundCustomer = customers[0]
          usedCustomerId = candidateId
          break
        }
      }
      
      if (!foundCustomer) {
        console.log('ℹ️ No customer found with provided identifiers:', candidateCustomerIds)
        return {
          success: true,
          customerId: candidateCustomerIds[0] || null,
          paymentMethods: [],
          message: 'No saved payment methods found for this customer'
        }
      }
      
      const customer = foundCustomer
      console.log('✅ Customer found:', {
        id: customer.id,
        customerId: customer.customerId,
        email: customer.emailAddress
      })
      
      // ✅ PAYMENT METHOD CONFIGURATION SERVICE
      const paymentMethodConfigService: Wallee.api.PaymentMethodConfigurationService = new Wallee.api.PaymentMethodConfigurationService(config)
      
      // Alle verfügbaren Zahlungsmethoden-Konfigurationen abrufen
      const paymentMethodConfigs = await paymentMethodConfigService.search(spaceId, {
        filter: {
          state: {
            value: Wallee.model.CreationEntityState.ACTIVE,
            operator: Wallee.model.CriteriaOperator.EQUALS
          }
        }
      })
      
      console.log('💳 Available payment method configurations:', paymentMethodConfigs.length)
      
      // ✅ TOKEN SERVICE - Hole aktive Payment Tokens direkt von Wallee
      const tokenService: Wallee.api.TokenService = new Wallee.api.TokenService(config)
      
      let tokens: any[] = []
      try {
        const tokenSearchResult = await tokenService.search(spaceId, {
          filter: {
            customerId: {
              value: usedCustomerId!,
              operator: Wallee.model.CriteriaOperator.EQUALS
            },
            state: {
              value: Wallee.model.TokenState.ACTIVE,
              operator: Wallee.model.CriteriaOperator.EQUALS
            }
          },
          orderBy: {
            field: 'createdOn',
            direction: Wallee.model.SortOrder.DESC
          }
        })
        
        tokens = tokenSearchResult.body || []
        console.log('💳 Found active tokens from TokenService:', tokens.length)
      } catch (tokenError: any) {
        console.warn('⚠️ Could not fetch tokens from TokenService, falling back to transactions:', tokenError.message)
        tokens = []
      }
      
      // ✅ Fallback: Falls keine Tokens gefunden, extrahiere aus Transaktionen
      let paymentMethods: any[] = []
      
      if (tokens.length > 0) {
        // Verwende Tokens von TokenService
        paymentMethods = tokens.map(token => ({
          id: token.id,
          wallee_token_id: token.id,
          display_name: token.paymentConnectorConfiguration?.paymentMethodConfiguration?.name || 
                        (token.cardData?.lastFourDigits ? `Karte **** ${token.cardData.lastFourDigits}` : 'Gespeicherte Karte'),
          payment_method_type: token.paymentConnectorConfiguration?.paymentMethodConfiguration?.description || 
                              token.cardData?.brand || 'CARD',
          last4: token.cardData?.lastFourDigits || null,
          brand: token.cardData?.brand || null,
          expires_at: token.cardData?.expiryDate || null,
          is_default: token.defaultToken || false,
          created_on: token.createdOn,
          last_used: token.createdOn // TokenService gibt nicht direkt lastUsed zurück
        }))
      } else {
        // Fallback: Extrahiere aus Transaktionen
        const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
        
        const transactions = await transactionService.search(spaceId, {
          filter: {
            customerId: {
              value: usedCustomerId!,
              operator: Wallee.model.CriteriaOperator.EQUALS
            },
            state: {
              value: Wallee.model.TransactionState.FULFILL,
              operator: Wallee.model.CriteriaOperator.EQUALS
            }
          },
          orderBy: {
            field: 'createdOn',
            direction: Wallee.model.SortOrder.DESC
          }
        })
        
        console.log('📊 Found transactions for customer (fallback):', transactions.length)
        
        const usedPaymentMethods = new Map()
        
        for (const transaction of transactions) {
          if (transaction.paymentConnectorConfiguration && transaction.paymentConnectorConfiguration.paymentMethodConfiguration) {
            const paymentMethod = transaction.paymentConnectorConfiguration.paymentMethodConfiguration
            const methodId = paymentMethod.id
            
            if (!usedPaymentMethods.has(methodId)) {
              usedPaymentMethods.set(methodId, {
                id: methodId,
                wallee_token_id: methodId,
                name: paymentMethod.name,
                description: paymentMethod.description,
                lastUsed: transaction.createdOn,
                transactionCount: 1
              })
            } else {
              usedPaymentMethods.get(methodId).transactionCount++
              if (new Date(transaction.createdOn!) > new Date(usedPaymentMethods.get(methodId).lastUsed)) {
                usedPaymentMethods.get(methodId).lastUsed = transaction.createdOn
              }
            }
          }
        }
        
        paymentMethods = Array.from(usedPaymentMethods.values()).map((pm: any) => ({
          id: pm.id,
          wallee_token_id: pm.id,
          display_name: pm.name || 'Gespeicherte Karte',
          payment_method_type: pm.description || 'CARD',
          last_used: pm.lastUsed,
          transaction_count: pm.transactionCount
        }))
      }
      
      console.log('💳 Found payment methods for customer:', paymentMethods.length)
      
      return {
        success: true,
        customerId: usedCustomerId,
        customerEmail: customerEmail,
        paymentMethods: paymentMethods,
        totalTransactions: transactions.length,
        message: `Found ${paymentMethods.length} saved payment methods`
      }
      
    } catch (customerError: any) {
      console.log('ℹ️ Customer not found or no payment methods:', customerError.message)
      return {
        success: true,
        customerId: candidateCustomerIds[0] || null,
        paymentMethods: [],
        message: 'No saved payment methods found for this customer'
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error getting customer payment methods:', {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data
    })
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to get customer payment methods'
    })
  }
})


