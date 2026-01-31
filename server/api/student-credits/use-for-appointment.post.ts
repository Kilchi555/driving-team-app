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

  // Get current user (note: this may be the student themselves)
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
  const { user_id, appointment_id, amount_rappen, notes } = body

  if (!user_id || !appointment_id || !amount_rappen || amount_rappen <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Missing or invalid required fields: user_id, appointment_id, amount_rappen (must be > 0)'
    })
  }

  // Get current credit
  const { data: currentCredit } = await supabase
    .from('student_credits')
    .select('*')
    .eq('user_id', user_id)
    .eq('tenant_id', userProfile.tenant_id)
    .maybeSingle()

  if (!currentCredit || currentCredit.balance_rappen <= 0) {
    return {
      success: false,
      data: {
        success: false,
        amountUsed: 0,
        remainingBalance: 0,
        remainingCost: amount_rappen,
        creditTransactionId: undefined
      }
    }
  }

  // Calculate available credit
  const availableCredit = Math.min(currentCredit.balance_rappen, amount_rappen)
  const newBalance = currentCredit.balance_rappen - availableCredit
  const remainingCost = amount_rappen - availableCredit

  try {
    // Update credit
    const { error: creditError } = await supabase
      .from('student_credits')
      .update({
        balance_rappen: newBalance,
        notes: `Verwendet für Termin ${appointment_id}`,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('tenant_id', userProfile.tenant_id)

    if (creditError) throw creditError

    // Log transaction
    const { data: creditTransaction, error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id,
        tenant_id: userProfile.tenant_id,
        transaction_type: 'appointment_payment',
        amount_rappen: -availableCredit,
        balance_before_rappen: currentCredit.balance_rappen,
        balance_after_rappen: newBalance,
        payment_method: 'credit',
        reference_id: appointment_id,
        reference_type: 'appointment',
        created_by: null,
        notes: notes || 'Guthaben für Termin verwendet',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (txError) throw txError

    console.log('✅ Credit used for appointment:', {
      userId: user_id,
      appointmentId: appointment_id,
      amountUsed: availableCredit,
      remainingBalance: newBalance,
      remainingCost
    })

    return {
      success: true,
      data: {
        success: true,
        amountUsed: availableCredit,
        remainingBalance: newBalance,
        remainingCost,
        creditTransactionId: creditTransaction?.id
      }
    }
  } catch (err: any) {
    console.error('Error using credit for appointment:', err)
    throw createError({
      statusCode: 500,
      message: 'Failed to process credit for appointment'
    })
  }
})
