import { defineEventHandler, readBody, createError, getHeader } from 'h3'
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
