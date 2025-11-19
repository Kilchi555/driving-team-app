/**
 * API Endpoint: Get User's Default Payment Token
 * Bypasses RLS to find user's saved payment method
 */

import { getSupabaseAdmin } from '~/utils/supabase'

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

    console.log('🔍 Looking for user payment token:', { userId, tenantId })

    const supabase = getSupabaseAdmin()

    // First try to find default token
    const { data: defaultToken, error: defaultError } = await supabase
      .from('customer_payment_methods')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_default', true)
      .maybeSingle()

    if (defaultToken?.id) {
      console.log('✅ Found default token:', defaultToken.id)
      return { id: defaultToken.id }
    }

    if (defaultError) {
      console.warn('⚠️ Error querying default token:', defaultError)
    }

    // Fallback: Find ANY active token
    console.log('ℹ️ No default token, looking for any active token...')
    const { data: anyToken, error: anyError } = await supabase
      .from('customer_payment_methods')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (anyToken?.id) {
      console.log('✅ Found active token:', anyToken.id)
      return { id: anyToken.id }
    }

    if (anyError) {
      console.warn('⚠️ Error querying any token:', anyError)
    }

    console.log('⚠️ No payment token found for user')
    return { id: null }
  } catch (error: any) {
    console.error('❌ Error in get-user-payment-token:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error'
    })
  }
})

