/**
 * Temporary Debug API: Simulate Wallee webhook for testing
 * 
 * Usage:
 * POST http://localhost:3000/api/debug/webhook-test
 * Body: {
 *   "entityId": 481840844,
 *   "state": "FULFILL",
 *   "spaceId": 88489,
 *   "timestamp": "2026-02-13T05:55:28+0000"
 * }
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    logger.info('🔔 TEST WEBHOOK RECEIVED:', JSON.stringify(body, null, 2))
    logger.info('🔔 TEST WEBHOOK BODY KEYS:', Object.keys(body))
    
    // Now call the actual webhook handler
    const response = await $fetch('/api/wallee/webhook', {
      method: 'POST',
      body: {
        entityId: body.entityId,
        state: body.state,
        spaceId: body.spaceId,
        timestamp: body.timestamp,
        listenerEntityId: body.listenerEntityId || 1472041829003,
        listenerEntityTechnicalName: body.listenerEntityTechnicalName || 'Transaction',
        eventId: body.eventId || 845771550,
        webhookListenerId: body.webhookListenerId || 621329
      }
    })
    
    logger.info('✅ TEST WEBHOOK RESPONSE:', response)
    
    return {
      success: true,
      message: 'Test webhook processed',
      response
    }
  } catch (error: any) {
    logger.error('❌ TEST WEBHOOK ERROR:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
})
