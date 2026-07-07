import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) throw createError({ statusCode: 403, statusMessage: 'User profile not found' })

  if (userProfile.role !== 'admin' && userProfile.role !== 'staff') {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
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
