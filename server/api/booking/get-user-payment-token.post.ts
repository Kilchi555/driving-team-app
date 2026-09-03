/**
 * API Endpoint: Get User's Default Payment Token
 * F-03: Requires authenticated session. Uses db user + tenant from session only
 * (body userId/tenantId are ignored).
 */

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { authorizeGetUserPaymentToken } from '~/server/utils/payment-token-auth'

export default defineEventHandler(async (event) => {
  try {
    const { userId, tenantId } = await authorizeGetUserPaymentToken(event)

    logger.debug('🔍 Looking for user payment token:', { userId, tenantId })

    const supabase = getSupabaseAdmin()

    const { data: defaultToken, error: defaultError } = await supabase
      .from('customer_payment_methods')
      .select('id, is_default, is_active, user_id, tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_default', true)
      .maybeSingle()

    if (defaultToken?.id) {
      logger.debug('✅ Found default token:', defaultToken.id)
      return { id: defaultToken.id }
    }

    if (defaultError) {
      console.warn('⚠️ Error querying default token:', defaultError)
    }

    const { data: anyToken, error: anyError } = await supabase
      .from('customer_payment_methods')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

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
    if (error?.statusCode) throw error
    console.error('❌ Error in get-user-payment-token:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error',
    })
  }
})
