import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Get authenticated user — Bearer header with HTTP-only-cookie fallback +
  // token refresh, instead of a raw Bearer-only check that would 401 whenever
  // the client's access token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // User profile already resolved by getAuthenticatedUser
  const userProfile = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id }
    : null

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  // Get query parameters
  const query = getQuery(event)
  const { payment_id } = query

  if (!payment_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameter: payment_id'
    })
  }

  // Fetch payment with related data
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select(`
      *,
      appointments (
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        type
      ),
      users!payments_user_id_fkey (
        first_name,
        last_name,
        email
      )
    `)
    .eq('id', payment_id)
    .eq('tenant_id', userProfile.tenant_id)
    .single()

  if (paymentError || !payment) {
    throw createError({
      statusCode: 404,
      message: 'Payment not found'
    })
  }

  // For backward compatibility, fetch payment_items if they exist
  const { data: items } = await supabase
    .from('payment_items')
    .select('*')
    .eq('payment_id', payment_id)

  return {
    success: true,
    data: {
      ...payment,
      items: items || []
    }
  }
})
