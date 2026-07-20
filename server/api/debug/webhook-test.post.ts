/**
 * Temporary Debug API: Simulate Wallee webhook for testing
 * 
 * ⚠️  ONLY accessible by super_admin – never expose to public.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  // ✅ SECURITY: Only super_admin may trigger test webhooks. Bearer header
  // with HTTP-only-cookie fallback + token refresh, instead of a raw
  // Bearer-only check that would 401 whenever the client's access token
  // had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only super_admin can trigger test webhooks' })
  }

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
