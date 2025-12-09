// server/payment-providers/wallee-provider.ts
// Wallee Implementation des Payment Provider Interface

import { Wallee } from 'wallee'
import type {
  IPaymentProvider,
  CreateTransactionRequest,
  TransactionResponse,
  WebhookPayload,
  RefundRequest,
  RefundResponse,
  PaymentProviderConfig
} from './types'
import { buildMerchantReference } from '~/utils/merchantReference'
import { getWalleeSDKConfig } from '~/server/utils/wallee-config'

export class WalleeProvider implements IPaymentProvider {
  readonly name = 'wallee' as const
  private config: PaymentProviderConfig
  private spaceId: number
  private userId: number
  private apiSecret: string

  constructor(config: PaymentProviderConfig) {
    if (config.provider !== 'wallee') {
      throw new Error('Invalid provider config for WalleeProvider')
    }
    if (!config.spaceId || !config.userId || !config.apiSecret) {
      throw new Error('Missing Wallee configuration: spaceId, userId, apiSecret required')
    }

    this.config = config
    this.spaceId = config.spaceId
    this.userId = config.userId
    this.apiSecret = config.apiSecret
  }

  async createTransaction(request: CreateTransactionRequest): Promise<TransactionResponse> {
    try {
      logger.debug('🔄 [Wallee] Creating transaction...', { orderId: request.orderId })

      // SDK Konfiguration
      const sdkConfig = getWalleeSDKConfig(this.spaceId, this.userId, this.apiSecret)
      const transactionService = new Wallee.api.TransactionService(sdkConfig)

      // Merchant Reference erstellen
      const merchantReference = buildMerchantReference({
        appointmentId: request.appointmentId,
        orderId: request.orderId,
        type: request.appointmentId ? 'LESSON' : 'PRODUCT',
        category: 'B', // Default, kann erweitert werden
        customerName: request.customerName,
        date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        timeSlot: new Date().toTimeString().substring(0, 5).replace(':', ''),
        duration: '45MIN' // Default
      })

      // Transaction erstellen
      const transaction: Wallee.model.TransactionCreate = {
        currency: request.currency,
        lineItems: request.lineItems || [
          {
            uniqueId: request.appointmentId ? `appointment-${request.appointmentId}` : `order-${request.orderId}`,
            name: request.description || 'Zahlung',
            quantity: 1,
            amountIncludingTax: request.amount,
            type: Wallee.model.LineItemType.PRODUCT
          }
        ],
        autoConfirmationEnabled: true,
        chargeRetryEnabled: false,
        customerId: request.userId,
        merchantReference: merchantReference,
        metaData: {
          ...request.metadata,
          tenant_id: request.tenantId,
          user_id: request.userId,
          order_id: request.orderId,
          appointment_id: request.appointmentId
        },
        successUrl: request.successUrl,
        failedUrl: request.failedUrl
      }

      // Transaktion erstellen
      const response = await transactionService.create(this.spaceId, transaction)
      const transactionCreate = response.body

      // Payment Page URL generieren
      const paymentPageService = new Wallee.api.TransactionPaymentPageService(sdkConfig)
      const paymentPageResponse = await paymentPageService.paymentPageUrl(
        this.spaceId,
        transactionCreate.id as number
      )
      const paymentPageUrl = paymentPageResponse.body

      logger.debug('✅ [Wallee] Transaction created:', {
        id: transactionCreate.id,
        state: transactionCreate.state
      })

      return {
        success: true,
        transactionId: String(transactionCreate.id),
        paymentUrl: paymentPageUrl,
        provider: 'wallee',
        metadata: {
          state: transactionCreate.state,
          merchantReference: merchantReference
        }
      }
    } catch (error: any) {
      console.error('❌ [Wallee] Transaction creation failed:', error)
      return {
        success: false,
        transactionId: '',
        paymentUrl: '',
        provider: 'wallee',
        error: error.message || 'Unknown Wallee error'
      }
    }
  }

  async processWebhook(payload: any): Promise<WebhookPayload> {
    try {
      logger.debug('🔄 [Wallee] Processing webhook...', { entityId: payload.entityId })

      // Wallee Webhook Structure
      const entityId = payload.entityId
      const state = payload.state

      // SDK konfigurieren
      const sdkConfig = getWalleeSDKConfig(this.spaceId, this.userId, this.apiSecret)
      const transactionService = new Wallee.api.TransactionService(sdkConfig)

      // Transaktion abrufen
      const response = await transactionService.read(this.spaceId, entityId)
      const transaction = response.body

      // Status mapping
      const statusMap: Record<string, WebhookPayload['status']> = {
        'PENDING': 'pending',
        'CONFIRMED': 'authorized',
        'PROCESSING': 'authorized',
        'AUTHORIZED': 'authorized',
        'FULFILL': 'completed',
        'COMPLETED': 'completed',
        'FAILED': 'failed',
        'VOIDED': 'cancelled',
        'DECLINE': 'failed'
      }

      return {
        provider: 'wallee',
        eventType: state,
        transactionId: String(entityId),
        status: statusMap[state] || 'pending',
        amount: transaction.authorizationAmount,
        currency: transaction.currency,
        metadata: {
          merchantReference: transaction.merchantReference,
          customerId: transaction.customerId,
          metaData: transaction.metaData
        },
        raw: transaction
      }
    } catch (error: any) {
      console.error('❌ [Wallee] Webhook processing failed:', error)
      throw error
    }
  }

  async createRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      logger.debug('🔄 [Wallee] Creating refund...', { transactionId: request.transactionId })

      const sdkConfig = getWalleeSDKConfig(this.spaceId, this.userId, this.apiSecret)
      const refundService = new Wallee.api.RefundService(sdkConfig)

      const refund: Wallee.model.RefundCreate = {
        type: Wallee.model.RefundType.MERCHANT_INITIATED_ONLINE,
        amount: request.amount,
        transaction: Number(request.transactionId),
        merchantReference: `refund-${Date.now()}`,
        externalId: `refund-${Date.now()}`
      }

      const response = await refundService.refund(this.spaceId, refund)
      const refundResult = response.body

      logger.debug('✅ [Wallee] Refund created:', refundResult.id)

      return {
        success: true,
        refundId: String(refundResult.id),
        status: refundResult.state as string
      }
    } catch (error: any) {
      console.error('❌ [Wallee] Refund failed:', error)
      return {
        success: false,
        refundId: '',
        status: 'failed',
        error: error.message || 'Unknown Wallee refund error'
      }
    }
  }

  async getTransactionStatus(transactionId: string): Promise<{
    status: string
    amount: number
    currency: string
  }> {
    try {
      const sdkConfig = getWalleeSDKConfig(this.spaceId, this.userId, this.apiSecret)
      const transactionService = new Wallee.api.TransactionService(sdkConfig)

      const response = await transactionService.read(this.spaceId, Number(transactionId))
      const transaction = response.body

      return {
        status: transaction.state as string,
        amount: transaction.authorizationAmount || 0,
        currency: transaction.currency || 'CHF'
      }
    } catch (error: any) {
      console.error('❌ [Wallee] Status check failed:', error)
      throw error
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test API call to validate credentials
      const sdkConfig = getWalleeSDKConfig(this.spaceId, this.userId, this.apiSecret)
      const transactionService = new Wallee.api.TransactionService(sdkConfig)
      
      // Try to fetch a transaction (will fail with auth error if credentials are wrong)
      await transactionService.count(this.spaceId, {})
      
      return true
    } catch (error: any) {
      console.error('❌ [Wallee] Config validation failed:', error)
      return false
    }
  }
}

