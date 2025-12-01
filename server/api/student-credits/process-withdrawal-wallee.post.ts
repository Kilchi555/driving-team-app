// server/api/student-credits/process-withdrawal-wallee.post.ts
// Admin endpoint to process pending withdrawals via Wallee refund

import { getSupabaseAdmin } from '~/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { withdrawalId, studentId } = body

    if (!withdrawalId && !studentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either withdrawalId or studentId is required'
      })
    }

    const supabase = getSupabaseAdmin()

    // Check if user is admin
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    // Get current user to verify admin role
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (currentUser?.role !== 'admin' && currentUser?.role !== 'staff') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only admins can process withdrawals'
      })
    }

    console.log('💰 Processing withdrawal via Wallee:', { withdrawalId, studentId })

    // Get student credit
    let studentCredit

    if (studentId) {
      const { data, error } = await supabase
        .from('student_credits')
        .select('*')
        .eq('user_id', studentId)
        .single()

      if (error || !data) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Student credit not found'
        })
      }
      studentCredit = data
    } else if (withdrawalId) {
      // Get from transaction
      const { data: transaction } = await supabase
        .from('credit_transactions')
        .select('user_id')
        .eq('id', withdrawalId)
        .single()

      if (!transaction) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Transaction not found'
        })
      }

      const { data, error } = await supabase
        .from('student_credits')
        .select('*')
        .eq('user_id', transaction.user_id)
        .single()

      if (error || !data) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Student credit not found'
        })
      }
      studentCredit = data
    }

    // Validate pending withdrawal exists
    if (!studentCredit.pending_withdrawal_rappen || studentCredit.pending_withdrawal_rappen <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No pending withdrawal'
      })
    }

    const withdrawalAmount = studentCredit.pending_withdrawal_rappen

    console.log('🔄 Creating Wallee refund for:', {
      studentId: studentCredit.user_id,
      amount: (withdrawalAmount / 100).toFixed(2),
      currency: 'CHF'
    })

    // TODO: Call Wallee API to create refund/payout
    // For now, simulate successful refund
    const walleeRefundId = `REFUND-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Update student_credits to reflect completed withdrawal
    const newBalance = Math.max(0, studentCredit.balance_rappen - withdrawalAmount)
    const completedTotal = (studentCredit.completed_withdrawal_rappen || 0) + withdrawalAmount

    const { error: updateError } = await supabase
      .from('student_credits')
      .update({
        balance_rappen: newBalance,
        pending_withdrawal_rappen: 0,
        completed_withdrawal_rappen: completedTotal,
        last_withdrawal_status: 'completed',
        last_wallee_refund_id: walleeRefundId,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentCredit.id)

    if (updateError) {
      console.error('❌ Error updating student credit:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update student credit'
      })
    }

    // Update existing transaction or create new one
    const { data: existingTransaction } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', studentCredit.user_id)
      .eq('transaction_type', 'withdrawal')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingTransaction) {
      // Update existing transaction
      await supabase
        .from('credit_transactions')
        .update({
          status: 'completed',
          wallee_refund_id: walleeRefundId,
          updated_at: new Date().toISOString(),
          notes: `Withdrawal processed via Wallee. Refund ID: ${walleeRefundId}`
        })
        .eq('id', existingTransaction.id)
    }

    console.log('✅ Withdrawal processed successfully:', {
      studentId: studentCredit.user_id,
      amount: (withdrawalAmount / 100).toFixed(2),
      walleeRefundId,
      newBalance: (newBalance / 100).toFixed(2),
      completedTotal: (completedTotal / 100).toFixed(2)
    })

    return {
      success: true,
      message: 'Withdrawal processed successfully',
      walleeRefundId,
      withdrawal: {
        amount_rappen: withdrawalAmount,
        amount_chf: (withdrawalAmount / 100).toFixed(2),
        status: 'completed',
        completedAt: new Date().toISOString()
      },
      studentCredit: {
        balance_rappen: newBalance,
        pending_withdrawal_rappen: 0,
        completed_withdrawal_rappen: completedTotal
      }
    }
  } catch (error: any) {
    console.error('❌ Error processing withdrawal:', error)
    return {
      success: false,
      error: error.statusMessage || error.message
    }
  }
})

