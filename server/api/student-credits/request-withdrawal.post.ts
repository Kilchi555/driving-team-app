// server/api/student-credits/request-withdrawal.post.ts
// Allows students to request withdrawal of their credit balance

import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { amount_rappen } = body

    if (!amount_rappen || amount_rappen <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid withdrawal amount'
      })
    }

    const supabase = getSupabase()

    // Get current user
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    console.log('💳 Processing withdrawal request:', {
      userId: authUser.id,
      amount: (amount_rappen / 100).toFixed(2)
    })

    // 1. Get user and student credit
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    const { data: studentCredit, error: creditError } = await supabase
      .from('student_credits')
      .select('*')
      .eq('user_id', userData.id)
      .single()

    if (creditError || !studentCredit) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Student credit not found'
      })
    }

    // 2. Validate sufficient balance
    const availableBalance = (studentCredit.balance_rappen || 0) - (studentCredit.pending_withdrawal_rappen || 0)
    
    console.log('💰 Balance check:', {
      totalBalance: (studentCredit.balance_rappen / 100).toFixed(2),
      pendingWithdrawal: ((studentCredit.pending_withdrawal_rappen || 0) / 100).toFixed(2),
      availableBalance: (availableBalance / 100).toFixed(2),
      requestedAmount: (amount_rappen / 100).toFixed(2)
    })

    if (availableBalance < amount_rappen) {
      throw createError({
        statusCode: 400,
        statusMessage: `Insufficient balance. Available: CHF ${(availableBalance / 100).toFixed(2)}`
      })
    }

    // 3. Update student_credits with pending withdrawal
    const newPendingWithdrawal = (studentCredit.pending_withdrawal_rappen || 0) + amount_rappen
    
    const { error: updateError } = await supabase
      .from('student_credits')
      .update({
        pending_withdrawal_rappen: newPendingWithdrawal,
        last_withdrawal_at: new Date().toISOString(),
        last_withdrawal_amount_rappen: amount_rappen,
        last_withdrawal_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', studentCredit.id)

    if (updateError) {
      console.error('❌ Error updating student credit:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to process withdrawal request'
      })
    }

    // 4. Create credit transaction record
    const { data: transaction, error: transError } = await supabase
      .from('credit_transactions')
      .insert([{
        user_id: userData.id,
        transaction_type: 'withdrawal',
        amount_rappen: -amount_rappen, // Negative because money leaves
        balance_before_rappen: studentCredit.balance_rappen,
        balance_after_rappen: studentCredit.balance_rappen, // Balance doesn't change until withdrawal completes
        payment_method: 'refund',
        reference_id: null,
        reference_type: 'manual',
        created_by: userData.id,
        status: 'pending',
        notes: `Withdrawal request initiated by student`
      }])
      .select()
      .single()

    if (transError) {
      console.error('❌ Error creating transaction:', transError)
      // Non-critical - don't fail the withdrawal request
    }

    console.log('✅ Withdrawal request created:', {
      amount: (amount_rappen / 100).toFixed(2),
      pendingWithdrawal: (newPendingWithdrawal / 100).toFixed(2),
      transactionId: transaction?.id
    })

    return {
      success: true,
      message: 'Withdrawal request created successfully',
      withdrawal: {
        amount_rappen,
        amount_chf: (amount_rappen / 100).toFixed(2),
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      studentCredit: {
        balance_rappen: studentCredit.balance_rappen,
        pending_withdrawal_rappen: newPendingWithdrawal,
        availableBalance: availableBalance - amount_rappen
      }
    }
  } catch (error: any) {
    console.error('❌ Error processing withdrawal request:', error)
    return {
      success: false,
      error: error.statusMessage || error.message
    }
  }
})

