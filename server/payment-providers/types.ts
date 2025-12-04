// server/payment-providers/types.ts
// Abstraktes Interface für alle Payment Provider

export interface PaymentProviderConfig {
  provider: 'wallee' | 'stripe'
  apiKey: string
  apiSecret?: string
  spaceId?: number  // Wallee-specific
  userId?: number   // Wallee-specific
  webhookSecret?: string
  isActive: boolean
}

export interface CreateTransactionRequest {
  // Common fields
  orderId: string
  amount: number
  currency: string
  customerEmail: string
  customerName?: string
  description?: string
  
  // URLs
  successUrl: string
  failedUrl: string
  
  // Identifiers
  userId: string
  tenantId: string
  appointmentId?: string
  
  // Metadata
  metadata?: Record<string, any>
  lineItems?: Array<{
    uniqueId: string
    name: string
    quantity: number
    amountIncludingTax: number
    type: string
  }>
}

export interface TransactionResponse {
  success: boolean
  transactionId: string
  paymentUrl: string
  provider: 'wallee' | 'stripe'
  error?: string
  metadata?: Record<string, any>
}

export interface WebhookPayload {
  provider: 'wallee' | 'stripe'
  eventType: string
  transactionId: string
  status: 'pending' | 'authorized' | 'completed' | 'failed' | 'cancelled'
  amount?: number
  currency?: string
  metadata?: Record<string, any>
  raw: any
}

export interface RefundRequest {
  transactionId: string
  amount: number
  currency: string
  reason?: string
  metadata?: Record<string, any>
}

export interface RefundResponse {
  success: boolean
  refundId: string
  status: string
  error?: string
}

/**
 * Abstract Payment Provider Interface
 * Alle Provider müssen diese Methoden implementieren
 */
export interface IPaymentProvider {
  readonly name: 'wallee' | 'stripe'
  
  /**
   * Erstellt eine neue Transaktion und gibt die Payment-URL zurück
   */
  createTransaction(request: CreateTransactionRequest): Promise<TransactionResponse>
  
  /**
   * Verarbeitet Webhook-Events vom Provider
   */
  processWebhook(payload: any, signature?: string): Promise<WebhookPayload>
  
  /**
   * Erstellt eine Rückerstattung
   */
  createRefund(request: RefundRequest): Promise<RefundResponse>
  
  /**
   * Holt den Status einer Transaktion
   */
  getTransactionStatus(transactionId: string): Promise<{
    status: string
    amount: number
    currency: string
  }>
  
  /**
   * Validiert die Provider-Konfiguration
   */
  validateConfig(): Promise<boolean>
}

