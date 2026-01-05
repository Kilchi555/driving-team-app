import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

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
      .select('id, preferred_payment_method')
      .eq('auth_user_id', authenticatedUser.id)
      .single()

    if (userError || !requestingUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Return payment method (default to 'wallee' if not set)
    return {
      success: true,
      preferredPaymentMethod: requestingUser.preferred_payment_method || 'wallee'
    }
  } catch (err: any) {
    console.error('❌ Error getting payment method:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to get payment method'
    })
  }
})

