// server/api/wallee/webhook-debug.ts
// Debug endpoint für Wallee Webhook Testing

import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    console.log('🔔 DEBUG: Webhook received')
    console.log('📨 Full body:', JSON.stringify(body, null, 2))
    console.log('📋 Event type:', body.eventType)
    console.log('💳 Transaction ID:', body.transaction?.id)
    console.log('📊 Transaction state:', body.transaction?.state)
    
    return {
      success: true,
      message: 'Debug webhook received',
      receivedAt: new Date().toISOString(),
      eventType: body.eventType,
      transactionId: body.transaction?.id,
      transactionState: body.transaction?.state
    }
  } catch (error: any) {
    console.error('❌ Debug webhook error:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

