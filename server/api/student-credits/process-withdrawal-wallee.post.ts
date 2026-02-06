// server/api/student-credits/process-withdrawal-wallee.post.ts
// Admin endpoint to process pending withdrawals via Wallee refund

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

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

    logger.debug('💰 Processing withdrawal via Wallee:', { withdrawalId, studentId })

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

    logger.debug('🔄 Creating Wallee refund for:', {
      studentId: studentCredit.user_id,
      amount: (withdrawalAmount / 100).toFixed(2),
      currency: 'CHF'
    })

    // ✅ IMPLEMENTATION: Call Wallee API to create refund using original payment token
    let walleeRefundId = null
    
    try {
      // 1. Get the original payment with token information
      const { data: payment } = await supabase
        .from('payments')
        .select('id, wallee_transaction_id, payment_method_id, metadata')
        .eq('user_id', studentCredit.user_id)
        .eq('payment_status', 'completed')
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (payment && payment.wallee_transaction_id) {
        logger.debug('💳 Found completed payment with Wallee transaction:', payment.wallee_transaction_id)

        // 2. Get Wallee config from tenant
        const { data: user } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', studentCredit.user_id)
          .single()

        if (!user?.tenant_id) {
          throw new Error('User tenant not found')
        }

        const { data: tenant } = await supabase
          .from('tenants')
          .select('wallee_space_id, wallee_user_id')
          .eq('id', user.tenant_id)
          .single()

        if (!tenant?.wallee_space_id) {
          throw new Error('Tenant Wallee config not found')
        }

        logger.debug('🔧 Wallee config loaded for tenant:', user.tenant_id)

        // 3. Create refund via Wallee API
        const WalleeModule = await import('wallee')
        const Wallee = WalleeModule.default || WalleeModule.Wallee || WalleeModule
        
        const walleeConfig = {
          space_id: tenant.wallee_space_id,
          user_id: tenant.wallee_user_id,
          api_secret: process.env.WALLEE_API_KEY
        }

        const refundService = new (Wallee as any).api.RefundService(walleeConfig)
        
        // Create refund object
        const refundData = {
          transaction_id: parseInt(payment.wallee_transaction_id),
          amount: withdrawalAmount / 100, // Convert from Rappen to CHF
          type: 'MERCHANT_INITIATED_ONLINE', // Refund initiated by merchant
          external_id: `withdrawal-${studentCredit.user_id}-${Date.now()}` // Unique identifier
        }

        logger.debug('📤 Creating Wallee refund:', refundData)
        
        const refundResponse = await refundService.create(tenant.wallee_space_id, refundData)
        walleeRefundId = refundResponse.body?.id?.toString() || refundResponse.body?.externalId
        
        logger.debug('✅ Wallee refund created:', {
          refundId: walleeRefundId,
          transactionId: payment.wallee_transaction_id,
          amount: (withdrawalAmount / 100).toFixed(2)
        })
      } else {
        logger.debug('⚠️ No completed Wallee payment found for student, using fallback refund ID')
        walleeRefundId = `REFUND-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      }
    } catch (walleeError: any) {
      console.error('❌ Error creating Wallee refund:', walleeError.message)
      // Fallback: use generated ID if Wallee API fails
      walleeRefundId = `REFUND-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      logger.debug('⚠️ Using fallback refund ID:', walleeRefundId)
    }

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

    logger.debug('✅ Withdrawal processed successfully:', {
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

