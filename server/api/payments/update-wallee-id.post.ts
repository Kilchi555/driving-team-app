import { defineEventHandler, readBody, createError } from 'h3'
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

  // Read and validate body
  const body = await readBody(event)
  const { payment_id, wallee_transaction_id } = body

  if (!payment_id || !wallee_transaction_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: payment_id, wallee_transaction_id'
    })
  }

  // Verify payment belongs to user's tenant
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, tenant_id, metadata')
    .eq('id', payment_id)
    .eq('tenant_id', userProfile.tenant_id)
    .single()

  if (paymentError || !payment) {
    throw createError({
      statusCode: 404,
      message: 'Payment not found'
    })
  }

  // Update payment with Wallee transaction ID
  const { data: updatedPayment, error: updateError } = await supabase
    .from('payments')
    .update({
      wallee_transaction_id,
      metadata: {
        ...payment.metadata,
        wallee_transaction_id
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', payment_id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating payment with Wallee transaction ID:', updateError)
    throw createError({
      statusCode: 500,
      message: 'Failed to update payment'
    })
  }

  return {
    success: true,
    data: updatedPayment
  }
})
