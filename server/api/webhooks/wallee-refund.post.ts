// server/api/webhooks/wallee-refund.post.ts
// Webhook handler for Wallee refund/payout confirmations

import { getSupabaseAdmin } from '~/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    console.log('🔔 Wallee refund webhook received:', {
      entityId: body.entityId,
      entityState: body.entityState,
      spaceId: body.spaceId,
      transactionId: body.transactionId
    })

    // Validate webhook signature (TODO: implement proper validation)
    // For now, just log the refund

    const supabase = getSupabaseAdmin()
    
    // Map entity states to our status
    const refundStatus = body.entityState === 'SUCCESSFUL' ? 'completed' : 'failed'

    console.log('💳 Refund status:', refundStatus)

    if (refundStatus === 'completed') {
      // Find transaction by wallee_refund_id
      const { data: creditTransaction } = await supabase
        .from('credit_transactions')
        .select('user_id, amount_rappen')
        .eq('wallee_refund_id', body.transactionId)
        .eq('transaction_type', 'withdrawal')
        .single()

      if (creditTransaction) {
        console.log('✅ Found credit transaction, marking as completed')

        // Update transaction status
        await supabase
          .from('credit_transactions')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
            notes: `Wallee refund confirmed. Entity State: ${body.entityState}`
          })
          .eq('wallee_refund_id', body.transactionId)

        // Update student_credits last_withdrawal_status
        await supabase
          .from('student_credits')
          .update({
            last_withdrawal_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', creditTransaction.user_id)

        console.log('✅ Wallee refund processed successfully')
      }
    } else {
      console.log('❌ Refund failed, marking transaction as failed')

      // Find and update transaction
      await supabase
        .from('credit_transactions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
          notes: `Wallee refund failed. Entity State: ${body.entityState}`
        })
        .eq('wallee_refund_id', body.transactionId)

      // Update student_credits last_withdrawal_status
      const { data: transaction } = await supabase
        .from('credit_transactions')
        .select('user_id')
        .eq('wallee_refund_id', body.transactionId)
        .single()

      if (transaction) {
        // Restore pending_withdrawal_rappen since it failed
        const { data: creditTx } = await supabase
          .from('credit_transactions')
          .select('amount_rappen')
          .eq('wallee_refund_id', body.transactionId)
          .single()

        if (creditTx) {
          const { data: studentCredit } = await supabase
            .from('student_credits')
            .select('balance_rappen, pending_withdrawal_rappen')
            .eq('user_id', transaction.user_id)
            .single()

          if (studentCredit) {
            // Restore the balance since refund failed
            await supabase
              .from('student_credits')
              .update({
                balance_rappen: studentCredit.balance_rappen + Math.abs(creditTx.amount_rappen),
                pending_withdrawal_rappen: 0,
                last_withdrawal_status: 'failed',
                updated_at: new Date().toISOString()
              })
              .eq('user_id', transaction.user_id)
          }
        }
      }
    }

    return {
      success: true,
      message: 'Refund webhook processed'
    }
  } catch (error: any) {
    console.error('❌ Error processing refund webhook:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

