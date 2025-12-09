// composables/useWalleeTokenization.ts
// ✅ WALLEE TOKENIZATION - Gespeicherte Zahlungsmethoden nutzen

export interface WalleePaymentMethod {
  id: string
  name: string
  description: string
  lastUsed: string
  transactionCount: number
}

export interface WalleeCustomerPaymentMethods {
  success: boolean
  customerId: string
  customerEmail: string
  paymentMethods: WalleePaymentMethod[]
  totalTransactions: number
  message: string
}

export interface WalleeRecurringTransactionRequest {
  orderId: string
  amount: number
  currency?: string
  customerEmail: string
  customerName?: string
  description?: string
  successUrl?: string
  failedUrl?: string
}

export interface WalleeRecurringTransactionResult {
  success: boolean
  transactionId: string
  paymentUrl: string
  customerId: string
  message: string
}

export const useWalleeTokenization = () => {
  
  // ✅ Gespeicherte Zahlungsmethoden eines Kunden abrufen
  const getCustomerPaymentMethods = async (customerEmailOrIds: string | { userId: string; tenantId: string }): Promise<WalleeCustomerPaymentMethods> => {
    try {
      logger.debug('🔍 Getting payment methods for customer:', typeof customerEmailOrIds === 'string' ? customerEmailOrIds : { hasTenantId: !!customerEmailOrIds.tenantId, hasUserId: !!customerEmailOrIds.userId })
      
      const response = await $fetch('/api/wallee/get-customer-payment-methods', {
        method: 'POST',
        body: typeof customerEmailOrIds === 'string' 
          ? { customerEmail: customerEmailOrIds }
          : { userId: customerEmailOrIds.userId, tenantId: customerEmailOrIds.tenantId }
      }) as WalleeCustomerPaymentMethods
      
      logger.debug('✅ Customer payment methods retrieved:', {
        customerId: response.customerId,
        methodCount: response.paymentMethods.length,
        totalTransactions: response.totalTransactions
      })
      
      return response
      
    } catch (error: any) {
      console.error('❌ Error getting customer payment methods:', error)
      throw new Error(error.message || 'Failed to get customer payment methods')
    }
  }
  
  // ✅ Wiederkehrende Zahlung mit gespeicherten Zahlungsmethoden
  const createRecurringTransaction = async (request: WalleeRecurringTransactionRequest): Promise<WalleeRecurringTransactionResult> => {
    try {
      logger.debug('🔄 Creating recurring transaction:', request)
      
      const response = await $fetch('/api/wallee/create-recurring-transaction', {
        method: 'POST',
        body: request
      }) as WalleeRecurringTransactionResult
      
      logger.debug('✅ Recurring transaction created:', {
        transactionId: response.transactionId,
        customerId: response.customerId
      })
      
      return response
      
    } catch (error: any) {
      console.error('❌ Error creating recurring transaction:', error)
      throw new Error(error.message || 'Failed to create recurring transaction')
    }
  }
  
  // ✅ Prüfen ob Kunde gespeicherte Zahlungsmethoden hat
  const hasSavedPaymentMethods = async (customerEmailOrIds: string | { userId: string; tenantId: string }): Promise<boolean> => {
    try {
      const result = await getCustomerPaymentMethods(customerEmailOrIds)
      return result.paymentMethods.length > 0
    } catch (error) {
      console.error('❌ Error checking saved payment methods:', error)
      return false
    }
  }
  
  // ✅ Konsistente Customer ID generieren (pseudonym bevorzugt)
  const generateCustomerId = (input: { userId: string; tenantId: string } | { customerEmail: string }): string => {
    if ('userId' in input && 'tenantId' in input) {
      return `dt-${input.tenantId}-${input.userId}`
    }
    const base = input.customerEmail.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    return `dt-${base}-${base.length > 20 ? base.substring(0, 20) : base}`
  }
  
  return {
    getCustomerPaymentMethods,
    createRecurringTransaction,
    hasSavedPaymentMethods,
    generateCustomerId
  }
}


