// server/api/debug/check-credit-transaction.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { paymentId, userId, transactionId } = body
    
    const supabase = getSupabaseAdmin()
    
    logger.debug('🔍 Checking credit processing for:', {
      paymentId,
      userId,
      transactionId
    })
    
    // Check if payment exists
    let payment = null
    if (paymentId) {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single()
      payment = data
    }
    
    // Check credit transactions
    let creditTransactions = []
    if (userId) {
      const { data } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)
      creditTransactions = data || []
    }
    
    // Check student credits
    let studentCredit = null
    if (userId) {
      const { data } = await supabase
        .from('student_credits')
        .select('*')
        .eq('user_id', userId)
        .single()
      studentCredit = data
    }
    
    return {
      success: true,
      payment: {
        found: !!payment,
        id: payment?.id,
        status: payment?.payment_status,
        total_rappen: payment?.total_amount_rappen,
        metadata: payment?.metadata,
        wallee_transaction_id: payment?.wallee_transaction_id
      },
      creditTransactions: {
        count: creditTransactions.length,
        recent: creditTransactions.slice(0, 3)
      },
      studentCredit: {
        balance_rappen: studentCredit?.balance_rappen,
        updated_at: studentCredit?.updated_at
      }
    }
  } catch (error: any) {
    console.error('Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }
})

