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
import { getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'

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

      const paymentId = request.orderId
      const tenantId = request.tenantId
      if (!paymentId || !tenantId) {
        throw new Error('WalleeProvider.createTransaction requires orderId and tenantId as payment/tenant ids')
      }

      const sdkConfig = getWalleeSDKConfig(this.spaceId, this.userId, this.apiSecret)
      const transactionService = new Wallee.api.TransactionService(sdkConfig)
      const { livePaymentCheckoutDeps, runPaymentCheckoutCreate } = await import('~/server/utils/wallee-checkout-claim')
      const checkout = await runPaymentCheckoutCreate(
        { paymentId, tenantId },
        livePaymentCheckoutDeps(async ({ merchantReference }) => {
          const response = await transactionService.create(this.spaceId, {
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
            merchantReference,
            metaData: {
              ...request.metadata,
              tenant_id: request.tenantId,
              user_id: request.userId,
              order_id: request.orderId,
              appointment_id: request.appointmentId
            },
            successUrl: request.successUrl,
            failedUrl: request.failedUrl
          })
          const created = response.body
          if (!created?.id) throw new Error('Wallee transaction create returned no id')
          return { id: String(created.id), spaceId: this.spaceId }
        })
      )
      return {
        success: true,
        transactionId: checkout.transactionId,
        paymentUrl: checkout.paymentUrl,
        provider: 'wallee',
      }
    } catch (error: any) {
      logger.error('❌ [Wallee] createTransaction failed:', error?.message)
      throw error
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

      // externalId is Wallee's deduplication key: two requests with the same
      // externalId in the same space are treated as the same refund (idempotent).
      // We derive it from the caller's idempotency_key so retries are safe.
      const idempotencyKey = (request.metadata?.idempotency_key as string) || null
      const externalId = idempotencyKey
        ? `refund-${idempotencyKey}`
        : `refund-${request.transactionId}-${Date.now()}`

      const refund: Wallee.model.RefundCreate = {
        type: Wallee.model.RefundType.MERCHANT_INITIATED_ONLINE,
        amount: request.amount,
        transaction: Number(request.transactionId),
        merchantReference: externalId,
        externalId,
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

