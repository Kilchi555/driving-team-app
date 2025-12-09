/**
 * API Endpoint: Get User's Default Payment Token
 * Bypasses RLS to find user's saved payment method
 */

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { userId, tenantId } = body

    if (!userId || !tenantId) {
      throw createError({
        statusCode: 400,
        message: 'Missing userId or tenantId'
      })
    }

    logger.debug('🔍 Looking for user payment token:', { userId, tenantId })

    const supabase = getSupabaseAdmin()

    // First try to find default token
    logger.debug('🔎 Querying for default token with criteria:', {
      user_id: userId,
      tenant_id: tenantId,
      is_active: true,
      is_default: true
    })

    const { data: defaultToken, error: defaultError } = await supabase
      .from('customer_payment_methods')
      .select('id, is_default, is_active, user_id, tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_default', true)
      .maybeSingle()

    logger.debug('📋 Default token query result:', { defaultToken, defaultError })

    if (defaultToken?.id) {
      logger.debug('✅ Found default token:', defaultToken.id)
      return { id: defaultToken.id }
    }

    if (defaultError) {
      console.warn('⚠️ Error querying default token:', defaultError)
    }

    // Fallback: Find ANY active token
    logger.debug('ℹ️ No default token, looking for any active token...')
    const { data: allTokens, error: allError } = await supabase
      .from('customer_payment_methods')
      .select('id, is_default, is_active, user_id, tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    logger.debug('📋 All tokens for user:', { allTokens, allError })

    const { data: anyToken, error: anyError } = await supabase
      .from('customer_payment_methods')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    logger.debug('📋 Active token query result:', { anyToken, anyError })

    if (anyToken?.id) {
      logger.debug('✅ Found active token:', anyToken.id)
      return { id: anyToken.id }
    }

    if (anyError) {
      console.warn('⚠️ Error querying any token:', anyError)
    }

    logger.debug('⚠️ No payment token found for user:', { userId, tenantId })
    return { id: null }
  } catch (error: any) {
    console.error('❌ Error in get-user-payment-token:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error'
    })
  }
})

