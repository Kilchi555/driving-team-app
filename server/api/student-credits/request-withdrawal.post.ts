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

    logger.debug('💳 Processing withdrawal request:', {
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
    
    // ✅ NEW: Check for pending/unpaid payments and deduct from withdrawal amount
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('total_amount_rappen, payment_status')
      .eq('user_id', userData.id)
      .in('payment_status', ['pending', 'processing', 'confirmed'])
      .eq('payment_method', 'wallee')  // Only Wallee payments (online invoices)
    
    const pendingPaymentAmount = (pendingPayments || []).reduce(
      (sum, p) => sum + (p.total_amount_rappen || 0),
      0
    )
    
    // ✅ Calculate actual withdrawal amount after paying off pending invoices
    const amountTowardsPending = Math.min(amount_rappen, pendingPaymentAmount)
    const actualWithdrawalAmount = amount_rappen - amountTowardsPending
    
    logger.debug('💰 Balance & Pending Payments check:', {
      totalBalance: (studentCredit.balance_rappen / 100).toFixed(2),
      pendingWithdrawal: ((studentCredit.pending_withdrawal_rappen || 0) / 100).toFixed(2),
      availableBalance: (availableBalance / 100).toFixed(2),
      requestedAmount: (amount_rappen / 100).toFixed(2),
      pendingPaymentAmount: (pendingPaymentAmount / 100).toFixed(2),
      amountTowardsPending: (amountTowardsPending / 100).toFixed(2),
      actualWithdrawalAmount: (actualWithdrawalAmount / 100).toFixed(2)
    })

    if (availableBalance < amount_rappen) {
      throw createError({
        statusCode: 400,
        statusMessage: `Insufficient balance. Available: CHF ${(availableBalance / 100).toFixed(2)}`
      })
    }

    // ✅ NEW: Apply pending payments automatically using student credit
    if (amountTowardsPending > 0) {
      logger.debug('📋 Applying credit to pending payments:', {
        amount: (amountTowardsPending / 100).toFixed(2),
        pendingPayments: pendingPayments?.length || 0
      })
      
      // Update pending payments to use credit (reduce by credit amount)
      for (const payment of pendingPayments || []) {
        if (amountTowardsPending <= 0) break
        
        const paymentAmount = payment.total_amount_rappen || 0
        const appliedCredit = Math.min(amountTowardsPending, paymentAmount)
        const newTotalAmount = Math.max(0, paymentAmount - appliedCredit)
        
        await supabase
          .from('payments')
          .update({
            total_amount_rappen: newTotalAmount,
            credit_used_rappen: (payment.credit_used_rappen || 0) + appliedCredit,
            notes: `Credit applied: CHF ${(appliedCredit / 100).toFixed(2)} (updated_at: ${new Date().toISOString()})`
          })
          .eq('id', payment.id)
        
        logger.debug('✅ Payment updated with credit:', {
          paymentId: payment.id,
          creditApplied: (appliedCredit / 100).toFixed(2),
          newTotal: (newTotalAmount / 100).toFixed(2)
        })
      }
    }
    
    // 3. Update student_credits with actual withdrawal amount (after pending deduction)
    const newPendingWithdrawal = (studentCredit.pending_withdrawal_rappen || 0) + actualWithdrawalAmount
    
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

    logger.debug('✅ Withdrawal request created:', {
      amount: (amount_rappen / 100).toFixed(2),
      pendingWithdrawal: (newPendingWithdrawal / 100).toFixed(2),
      transactionId: transaction?.id
    })

    return {
      success: true,
      message: amountTowardsPending > 0 
        ? `Auszahlung verarbeitet. CHF ${(amountTowardsPending / 100).toFixed(2)} wurden auf offene Rechnungen angerechnet.`
        : 'Withdrawal request created successfully',
      withdrawal: {
        requested_amount_rappen: amount_rappen,
        requested_amount_chf: (amount_rappen / 100).toFixed(2),
        applied_to_pending_rappen: amountTowardsPending,
        applied_to_pending_chf: (amountTowardsPending / 100).toFixed(2),
        actual_withdrawal_rappen: actualWithdrawalAmount,
        actual_withdrawal_chf: (actualWithdrawalAmount / 100).toFixed(2),
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

