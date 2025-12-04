// server/payment-providers/stripe-provider.ts
// Stripe Implementation des Payment Provider Interface

import Stripe from 'stripe'
import type {
  IPaymentProvider,
  CreateTransactionRequest,
  TransactionResponse,
  WebhookPayload,
  RefundRequest,
  RefundResponse,
  PaymentProviderConfig
} from './types'

export class StripeProvider implements IPaymentProvider {
  readonly name = 'stripe' as const
  private stripe: Stripe
  private webhookSecret?: string

  constructor(config: PaymentProviderConfig) {
    if (config.provider !== 'stripe') {
      throw new Error('Invalid provider config for StripeProvider')
    }
    if (!config.apiKey) {
      throw new Error('Missing Stripe configuration: apiKey required')
    }

    this.stripe = new Stripe(config.apiKey, {
      apiVersion: '2024-11-20.acacia' // Latest version
    })
    this.webhookSecret = config.webhookSecret
  }

  async createTransaction(request: CreateTransactionRequest): Promise<TransactionResponse> {
    try {
      console.log('🔄 [Stripe] Creating transaction...', { orderId: request.orderId })

      // Erstelle Line Items für Stripe
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
        request.lineItems?.map(item => ({
          price_data: {
            currency: request.currency.toLowerCase(),
            product_data: {
              name: item.name,
              description: request.description
            },
            unit_amount: Math.round(item.amountIncludingTax * 100) // Stripe verwendet Cents
          },
          quantity: item.quantity
        })) || [
          {
            price_data: {
              currency: request.currency.toLowerCase(),
              product_data: {
                name: request.description || 'Zahlung',
                description: `Bestellung #${request.orderId}`
              },
              unit_amount: Math.round(request.amount * 100) // Stripe verwendet Cents
            },
            quantity: 1
          }
        ]

      // Erstelle Checkout Session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card', 'twint', 'paypal'],
        line_items: lineItems,
        mode: 'payment',
        success_url: request.successUrl,
        cancel_url: request.failedUrl,
        customer_email: request.customerEmail,
        client_reference_id: request.orderId,
        metadata: {
          ...request.metadata,
          tenant_id: request.tenantId,
          user_id: request.userId,
          order_id: request.orderId,
          appointment_id: request.appointmentId || '',
          customer_name: request.customerName || ''
        }
      })

      console.log('✅ [Stripe] Session created:', {
        id: session.id,
        status: session.payment_status
      })

      return {
        success: true,
        transactionId: session.id,
        paymentUrl: session.url || '',
        provider: 'stripe',
        metadata: {
          payment_intent: session.payment_intent,
          payment_status: session.payment_status
        }
      }
    } catch (error: any) {
      console.error('❌ [Stripe] Transaction creation failed:', error)
      return {
        success: false,
        transactionId: '',
        paymentUrl: '',
        provider: 'stripe',
        error: error.message || 'Unknown Stripe error'
      }
    }
  }

  async processWebhook(payload: any, signature?: string): Promise<WebhookPayload> {
    try {
      console.log('🔄 [Stripe] Processing webhook...')

      let event: Stripe.Event

      // Webhook-Signatur validieren (wenn Secret vorhanden)
      if (this.webhookSecret && signature) {
        try {
          event = this.stripe.webhooks.constructEvent(
            payload,
            signature,
            this.webhookSecret
          )
        } catch (err: any) {
          console.error('❌ [Stripe] Webhook signature verification failed:', err.message)
          throw new Error(`Webhook signature verification failed: ${err.message}`)
        }
      } else {
        // Fallback ohne Signatur-Validierung (nicht empfohlen für Produktion)
        event = payload as Stripe.Event
      }

      // Event-Type verarbeiten
      const statusMap: Record<string, WebhookPayload['status']> = {
        'checkout.session.completed': 'completed',
        'payment_intent.succeeded': 'completed',
        'payment_intent.payment_failed': 'failed',
        'payment_intent.canceled': 'cancelled',
        'payment_intent.processing': 'pending',
        'charge.succeeded': 'completed',
        'charge.failed': 'failed',
        'charge.refunded': 'cancelled'
      }

      let transactionId = ''
      let amount = 0
      let currency = 'CHF'
      let metadata: any = {}

      // Session Completed Event
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        transactionId = session.id
        amount = (session.amount_total || 0) / 100 // Stripe gibt Cents zurück
        currency = session.currency?.toUpperCase() || 'CHF'
        metadata = session.metadata
      }
      // Payment Intent Events
      else if (event.type.startsWith('payment_intent')) {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        transactionId = paymentIntent.id
        amount = paymentIntent.amount / 100
        currency = paymentIntent.currency.toUpperCase()
        metadata = paymentIntent.metadata
      }
      // Charge Events
      else if (event.type.startsWith('charge')) {
        const charge = event.data.object as Stripe.Charge
        transactionId = charge.id
        amount = charge.amount / 100
        currency = charge.currency.toUpperCase()
        metadata = charge.metadata
      }

      return {
        provider: 'stripe',
        eventType: event.type,
        transactionId,
        status: statusMap[event.type] || 'pending',
        amount,
        currency,
        metadata,
        raw: event.data.object
      }
    } catch (error: any) {
      console.error('❌ [Stripe] Webhook processing failed:', error)
      throw error
    }
  }

  async createRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      console.log('🔄 [Stripe] Creating refund...', { transactionId: request.transactionId })

      // Bei Stripe müssen wir die Session abrufen um die Payment Intent zu finden
      let paymentIntentId: string

      // Prüfe ob es eine Session ID (cs_) oder Payment Intent ID (pi_) ist
      if (request.transactionId.startsWith('cs_')) {
        const session = await this.stripe.checkout.sessions.retrieve(request.transactionId)
        paymentIntentId = session.payment_intent as string
      } else {
        paymentIntentId = request.transactionId
      }

      // Erstelle Refund
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(request.amount * 100), // Stripe verwendet Cents
        reason: 'requested_by_customer',
        metadata: request.metadata
      })

      console.log('✅ [Stripe] Refund created:', refund.id)

      return {
        success: true,
        refundId: refund.id,
        status: refund.status
      }
    } catch (error: any) {
      console.error('❌ [Stripe] Refund failed:', error)
      return {
        success: false,
        refundId: '',
        status: 'failed',
        error: error.message || 'Unknown Stripe refund error'
      }
    }
  }

  async getTransactionStatus(transactionId: string): Promise<{
    status: string
    amount: number
    currency: string
  }> {
    try {
      // Prüfe ob es eine Session ID (cs_) oder Payment Intent ID (pi_) ist
      if (transactionId.startsWith('cs_')) {
        const session = await this.stripe.checkout.sessions.retrieve(transactionId)
        return {
          status: session.payment_status,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency?.toUpperCase() || 'CHF'
        }
      } else {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId)
        return {
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency.toUpperCase()
        }
      }
    } catch (error: any) {
      console.error('❌ [Stripe] Status check failed:', error)
      throw error
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test API call to validate credentials
      await this.stripe.balance.retrieve()
      return true
    } catch (error: any) {
      console.error('❌ [Stripe] Config validation failed:', error)
      return false
    }
  }
}

