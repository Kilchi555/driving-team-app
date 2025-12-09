// server/api/payment-gateway/webhook.post.ts
// ✅ UNIVERSELLER WEBHOOK ENDPOINT - unterstützt Wallee & Stripe

import { getPaymentProviderForTenant } from '~/server/payment-providers/factory'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  logger.debug('🔔 Universal Payment Gateway - Webhook Received')

  try {
    // Hole den Request Body (als String für Stripe Signatur-Validierung)
    const rawBody = await readRawBody(event)
    if (!rawBody) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing webhook payload'
      })
    }

    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch (e) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid JSON payload'
      })
    }

    // Hole Provider-Type aus Query Parameter oder Header
    const providerType = getQuery(event).provider as string || 
                        getHeader(event, 'x-payment-provider')

    if (!providerType || !['wallee', 'stripe'].includes(providerType)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing or invalid provider parameter. Use ?provider=wallee or ?provider=stripe'
      })
    }

    logger.debug(`📋 Webhook from provider: ${providerType}`)

    // Hole Signatur für Stripe
    const signature = getHeader(event, 'stripe-signature') || ''

    // Extrahiere Tenant ID aus dem Webhook Payload
    let tenantId: string | undefined

    if (providerType === 'wallee') {
      // Wallee: Tenant ID aus Transaction Metadata
      tenantId = payload.metaData?.tenant_id
    } else if (providerType === 'stripe') {
      // Stripe: Tenant ID aus Checkout Session Metadata
      tenantId = payload.data?.object?.metadata?.tenant_id
    }

    if (!tenantId) {
      console.warn('⚠️ Tenant ID not found in webhook payload, trying to extract from transaction...')
      
      // Fallback: Lade Payment aus DB anhand Transaction ID
      const supabase = getSupabaseAdmin()
      
      let transactionId: string | undefined
      if (providerType === 'wallee') {
        transactionId = String(payload.entityId)
      } else if (providerType === 'stripe') {
        transactionId = payload.data?.object?.id
      }

      if (transactionId) {
        const { data: payment } = await supabase
          .from('payments')
          .select('tenant_id')
          .or(`wallee_transaction_id.eq.${transactionId},stripe_session_id.eq.${transactionId}`)
          .single()

        if (payment) {
          tenantId = payment.tenant_id
          logger.debug(`✅ Found tenant ID from payment: ${tenantId}`)
        }
      }
    }

    if (!tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Could not determine tenant ID from webhook payload'
      })
    }

    // Hole den richtigen Provider für den Tenant
    const provider = await getPaymentProviderForTenant(tenantId)

    // Validiere, dass der Provider-Type übereinstimmt
    if (provider.name !== providerType) {
      throw createError({
        statusCode: 400,
        statusMessage: `Provider mismatch: Tenant uses ${provider.name} but webhook is from ${providerType}`
      })
    }

    // Verarbeite Webhook
    const webhookPayload = await provider.processWebhook(payload, signature)

    logger.debug(`✅ Webhook processed:`, {
      provider: webhookPayload.provider,
      transactionId: webhookPayload.transactionId,
      status: webhookPayload.status
    })

    // Update Payment in Datenbank
    const supabase = getSupabaseAdmin()

    const updateData: any = {
      payment_status: webhookPayload.status === 'completed' ? 'completed' :
                     webhookPayload.status === 'authorized' ? 'authorized' :
                     webhookPayload.status === 'failed' ? 'failed' :
                     webhookPayload.status === 'cancelled' ? 'cancelled' : 'pending',
      updated_at: new Date().toISOString()
    }

    // Bei Completion: paid_at setzen
    if (webhookPayload.status === 'completed') {
      updateData.paid_at = new Date().toISOString()
    }

    // Update Payment anhand des Transaction IDs
    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .or(
        providerType === 'wallee'
          ? `wallee_transaction_id.eq.${webhookPayload.transactionId}`
          : `stripe_session_id.eq.${webhookPayload.transactionId}`
      )
      .eq('tenant_id', tenantId)

    if (updateError) {
      console.error('❌ Failed to update payment:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update payment: ${updateError.message}`
      })
    }

    logger.debug('✅ Payment updated successfully')

    // TODO: Weitere Payment-spezifische Logik (z.B. Credit Product Processing, Voucher Creation)
    // Diese Logik sollte in eine separate Funktion ausgelagert werden

    return {
      success: true,
      message: 'Webhook processed successfully',
      provider: webhookPayload.provider,
      status: webhookPayload.status
    }
  } catch (error: any) {
    console.error('❌ Universal Webhook Error:', error)

    // Gebe 200 zurück für bekannte Fehler, damit Provider nicht wiederholt sendet
    if (error.statusCode === 400) {
      return {
        success: false,
        message: error.message
      }
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Webhook processing error'
    })
  }
})

