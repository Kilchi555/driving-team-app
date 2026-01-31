import { defineEventHandler, getQuery, createError, getHeader } from 'h3'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()

  // Get auth token from headers
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')

  // Get current user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

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
