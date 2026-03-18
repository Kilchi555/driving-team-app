import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  // Get auth token from headers
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseAdmin = getSupabaseAdmin()

  // Verify token
  const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Get user profile
  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  // Only staff/admin can deposit
  const allowedRoles = ['staff', 'admin', 'super_admin', 'tenant_admin', 'instructor']
  if (!allowedRoles.includes(userProfile.role)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  // Read and validate body
  const body = await readBody(event)
  const { user_id, amount_rappen, payment_method, notes } = body

  if (!user_id || !amount_rappen || amount_rappen <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Missing or invalid required fields: user_id, amount_rappen (must be > 0)'
    })
  }

  // Get current credit
  const { data: currentCredit } = await supabaseAdmin
    .from('student_credits')
    .select('balance_rappen')
    .eq('user_id', user_id)
    .eq('tenant_id', userProfile.tenant_id)
    .maybeSingle()

  const currentBalance = currentCredit?.balance_rappen || 0
  const newBalance = currentBalance + amount_rappen

  try {
    // Upsert student credit
    const { error: creditError } = await supabaseAdmin
      .from('student_credits')
      .upsert({
        user_id,
        tenant_id: userProfile.tenant_id,
        balance_rappen: newBalance,
        notes: notes || 'Guthaben-Einzahlung',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,tenant_id' })

    if (creditError) throw creditError

    // Log credit transaction
    const { error: txError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id,
        tenant_id: userProfile.tenant_id,
        transaction_type: 'deposit',
        amount_rappen,
        balance_before_rappen: currentBalance,
        balance_after_rappen: newBalance,
        payment_method: payment_method || 'cash',
        reference_type: 'manual',
        created_by: userProfile.id,
        notes: notes || 'Guthaben-Einzahlung',
        created_at: new Date().toISOString()
      })

    if (txError) throw txError

    // Record in cash_transactions so it appears in the staff cash register
    const { error: cashTxError } = await supabaseAdmin
      .from('cash_transactions')
      .insert({
        instructor_id: userProfile.id,
        student_id: user_id,
        amount_rappen,
        tenant_id: userProfile.tenant_id,
        status: 'confirmed',
        confirmed_by: userProfile.id,
        confirmed_at: new Date().toISOString(),
        collected_at: new Date().toISOString(),
        notes: notes || 'Guthaben-Einzahlung',
        transaction_source: 'credit_deposit',
        created_at: new Date().toISOString()
      })

    if (cashTxError) {
      logger.error('⚠️ Could not record in cash_transactions:', cashTxError)
      // Non-fatal — credit deposit itself succeeded
    }

    logger.info('✅ Credit deposit successful:', {
      userId: user_id,
      amount: amount_rappen,
      newBalance,
      depositedBy: userProfile.id
    })

    return {
      success: true,
      data: {
        userId: user_id,
        amountDeposited: amount_rappen,
        previousBalance: currentBalance,
        newBalance
      }
    }
  } catch (err: any) {
    logger.error('Error during credit deposit:', err)
    throw createError({
      statusCode: 500,
      message: 'Failed to process credit deposit'
    })
  }
})
