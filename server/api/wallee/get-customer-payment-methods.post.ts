// server/api/wallee/get-customer-payment-methods.post.ts
// ✅ WALLEE - Gespeicherte Zahlungsmethoden eines Kunden abrufen

import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  console.log('🔍 Getting customer payment methods from Wallee...')
  
  try {
    const body = await readBody(event)
    console.log('📨 Received request:', body)
    
    const { customerEmail } = body

    if (!customerEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: customerEmail'
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
    
    // ✅ Konsistente Customer ID (gleiche wie bei Zahlungen)
    const customerIdBase = customerEmail.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const consistentCustomerId = `dt-${customerIdBase}-${customerIdBase.length > 20 ? customerIdBase.substring(0, 20) : customerIdBase}`
    
    console.log('🔍 Looking for payment methods for customer:', {
      customerId: consistentCustomerId,
      customerEmail: customerEmail
    })
    
    // ✅ CUSTOMER SERVICE für Customer-Details
    const customerService: Wallee.api.CustomerService = new Wallee.api.CustomerService(config)
    
    try {
      // Versuche Customer zu finden
      const customers = await customerService.search(spaceId, {
        filter: {
          customerId: {
            value: consistentCustomerId,
            operator: Wallee.model.CriteriaOperator.EQUALS
          }
        }
      })
      
      if (customers.length === 0) {
        console.log('ℹ️ No customer found with ID:', consistentCustomerId)
        return {
          success: true,
          customerId: consistentCustomerId,
          paymentMethods: [],
          message: 'No saved payment methods found for this customer'
        }
      }
      
      const customer = customers[0]
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
      
      // ✅ TRANSACTION SERVICE für vergangene Transaktionen
      const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
      
      // Vergangene Transaktionen des Kunden abrufen
      const transactions = await transactionService.search(spaceId, {
        filter: {
          customerId: {
            value: consistentCustomerId,
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
      
      console.log('📊 Found transactions for customer:', transactions.length)
      
      // Zahlungsmethoden aus vergangenen Transaktionen extrahieren
      const usedPaymentMethods = new Map()
      
      for (const transaction of transactions) {
        if (transaction.paymentConnectorConfiguration && transaction.paymentConnectorConfiguration.paymentMethodConfiguration) {
          const paymentMethod = transaction.paymentConnectorConfiguration.paymentMethodConfiguration
          const methodId = paymentMethod.id
          
          if (!usedPaymentMethods.has(methodId)) {
            usedPaymentMethods.set(methodId, {
              id: methodId,
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
      
      const paymentMethods = Array.from(usedPaymentMethods.values())
      
      console.log('💳 Found payment methods for customer:', paymentMethods.length)
      
      return {
        success: true,
        customerId: consistentCustomerId,
        customerEmail: customerEmail,
        paymentMethods: paymentMethods,
        totalTransactions: transactions.length,
        message: `Found ${paymentMethods.length} saved payment methods`
      }
      
    } catch (customerError: any) {
      console.log('ℹ️ Customer not found or no payment methods:', customerError.message)
      return {
        success: true,
        customerId: consistentCustomerId,
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

