// server/api/admin/sync-all-wallee-payments.post.ts
// Bulk sync all pending payments with Wallee transaction IDs

import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    
    // Find all pending payments with Wallee transaction IDs
    const { data: payments, error: findError } = await supabase
      .from('payments')
      .select('id, wallee_transaction_id, payment_status, appointment_id')
      .not('wallee_transaction_id', 'is', null)
      .eq('payment_status', 'pending')
      .limit(100) // Limit to avoid timeout
    
    if (findError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch payments: ' + findError.message
      })
    }

    if (!payments || payments.length === 0) {
      return {
        success: true,
        message: 'No pending payments with Wallee transaction IDs found',
        synced: 0,
        updated: 0
      }
    }

    console.log(`🔄 Found ${payments.length} pending payments to sync`)

    // Wallee SDK Configuration
    const spaceId = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userId = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret = process.env.WALLEE_SECRET_KEY || (() => { throw new Error('WALLEE_SECRET_KEY is required') })()
    
    const config = {
      space_id: spaceId,
      user_id: userId,
      api_secret: apiSecret
    }

    const WalleeModule = await import('wallee')
    const Wallee = WalleeModule.default || WalleeModule.Wallee || WalleeModule
    const transactionService = new (Wallee as any).api.TransactionService(config)

    // Status mapping
    const statusMapping: Record<string, string> = {
      'PENDING': 'pending',
      'CONFIRMED': 'processing',
      'PROCESSING': 'processing',
      'SUCCESSFUL': 'completed',
      'FAILED': 'failed',
      'CANCELED': 'cancelled',
      'DECLINE': 'failed',
      'FULFILL': 'completed'
    }

    let synced = 0
    let updated = 0
    const errors: string[] = []

    // Sync each payment
    for (const payment of payments) {
      try {
        const transactionId = parseInt(payment.wallee_transaction_id)
        
        if (isNaN(transactionId)) {
          console.warn(`⚠️ Invalid transaction ID for payment ${payment.id}: ${payment.wallee_transaction_id}`)
          errors.push(`Payment ${payment.id}: Invalid transaction ID`)
          continue
        }

        // Fetch transaction status from Wallee
        const transactionResponse = await transactionService.read(spaceId, transactionId)
        const walleeTransaction = transactionResponse.body

        const walleeState = walleeTransaction.state as string
        const paymentStatus = statusMapping[walleeState] || 'pending'

        // Only update if status changed
        if (paymentStatus !== payment.payment_status) {
          const updateData: any = {
            payment_status: paymentStatus,
            wallee_transaction_state: walleeState,
            updated_at: new Date().toISOString()
          }

          if (paymentStatus === 'completed') {
            updateData.paid_at = new Date().toISOString()
          }

          const { error: updateError } = await supabase
            .from('payments')
            .update(updateData)
            .eq('id', payment.id)

          if (updateError) {
            console.error(`❌ Error updating payment ${payment.id}:`, updateError)
            errors.push(`Payment ${payment.id}: ${updateError.message}`)
          } else {
            console.log(`✅ Updated payment ${payment.id}: ${payment.payment_status} → ${paymentStatus}`)
            updated++

            // Update appointment if payment completed
            if (paymentStatus === 'completed' && payment.appointment_id) {
              await supabase
                .from('appointments')
                .update({
                  payment_status: 'paid',
                  is_paid: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', payment.appointment_id)
            }
          }
        } else {
          console.log(`ℹ️ Payment ${payment.id} status unchanged: ${paymentStatus}`)
        }

        synced++

      } catch (err: any) {
        console.error(`❌ Error syncing payment ${payment.id}:`, err.message)
        errors.push(`Payment ${payment.id}: ${err.message}`)
      }
    }

    return {
      success: true,
      message: `Synced ${synced} payments, updated ${updated}`,
      synced,
      updated,
      errors: errors.length > 0 ? errors : undefined
    }

  } catch (error: any) {
    console.error('❌ Error syncing Wallee payments:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to sync payments'
    })
  }
})

