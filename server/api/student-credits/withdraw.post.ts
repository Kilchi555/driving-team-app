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
  const { user_id, amount_rappen, reason } = body

  if (!user_id || !amount_rappen || amount_rappen <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Missing or invalid required fields: user_id, amount_rappen (must be > 0)'
    })
  }

  // Get current credit
  const { data: currentCredit } = await supabase
    .from('student_credits')
    .select('*')
    .eq('user_id', user_id)
    .eq('tenant_id', userProfile.tenant_id)
    .maybeSingle()

  if (!currentCredit || currentCredit.balance_rappen < amount_rappen) {
    throw createError({
      statusCode: 400,
      message: 'Insufficient balance for withdrawal'
    })
  }

  const currentBalance = currentCredit.balance_rappen
  const newBalance = currentBalance - amount_rappen

  try {
    // Update credit
    const { error: creditError } = await supabase
      .from('student_credits')
      .update({
        balance_rappen: newBalance,
        notes: `Auszahlung: ${reason}`,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('tenant_id', userProfile.tenant_id)

    if (creditError) throw creditError

    // Log transaction
    const { error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id,
        tenant_id: userProfile.tenant_id,
        transaction_type: 'withdrawal',
        amount_rappen: -amount_rappen,
        balance_before_rappen: currentBalance,
        balance_after_rappen: newBalance,
        payment_method: 'credit',
        reference_type: 'manual',
        created_by: userProfile.id,
        notes: `Auszahlung: ${reason}`,
        created_at: new Date().toISOString()
      })

    if (txError) throw txError

    console.log('✅ Credit withdrawal successful:', {
      userId: user_id,
      amount: amount_rappen,
      newBalance
    })

    return {
      success: true,
      data: {
        userId: user_id,
        amountWithdrawn: amount_rappen,
        previousBalance: currentBalance,
        newBalance
      }
    }
  } catch (err: any) {
    console.error('Error during credit withdrawal:', err)
    throw createError({
      statusCode: 500,
      message: 'Failed to process credit withdrawal'
    })
  }
})
