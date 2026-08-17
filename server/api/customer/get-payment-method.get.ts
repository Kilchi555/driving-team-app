import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getTenantDefaultPaymentMethod, normalizeTenantPaymentMethod } from '~/server/utils/tenant-default-payment-method'

export default defineEventHandler(async (event) => {
  try {
    // LAYER 1: AUTHENTICATE
    const authenticatedUser = await getAuthenticatedUser(event)
    if (!authenticatedUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // LAYER 2: GET USER FROM USERS TABLE
    const { data: requestingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, preferred_payment_method')
      .eq('auth_user_id', authenticatedUser.id)
      .single()

    if (userError || !requestingUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    const tenantDefault = requestingUser.tenant_id
      ? await getTenantDefaultPaymentMethod(supabaseAdmin, requestingUser.tenant_id)
      : 'wallee'

    return {
      success: true,
      preferredPaymentMethod: normalizeTenantPaymentMethod(
        requestingUser.preferred_payment_method || tenantDefault
      )
    }
  } catch (err: any) {
    console.error('❌ Error getting payment method:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to get payment method'
    })
  }
})

