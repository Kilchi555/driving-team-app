/**
 * Cron Job: Process Automatic Payments
 * Runs every 5 minutes to authorize payments where scheduled_authorization_date <= NOW
 * 
 * Flow:
 * - Termin < 24h away: scheduled_authorization_date = NOW → authorize immediately
 * - Termin >= 24h away: scheduled_authorization_date = start_time - 24h → authorize 24h before
 */

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()
    const now = new Date()

    console.log('💳 [CRON] Processing automatic payments - checking scheduled_authorization_date...')

    // Find payments that should be authorized NOW:
    // - payment_status is 'pending' (not yet authorized)
    // - scheduled_authorization_date <= NOW
    // - appointment is not cancelled
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        user_id,
        tenant_id,
        appointment_id,
        total_amount_rappen,
        scheduled_authorization_date,
        payment_status,
        appointments!inner (
          id,
          start_time,
          status
        )
      `)
      .eq('payment_status', 'pending')
      .lte('scheduled_authorization_date', now.toISOString())
      .not('appointments', 'is', null)

    if (paymentsError) {
      console.error('❌ Error fetching pending payments:', paymentsError)
      throw paymentsError
    }

    if (!payments || payments.length === 0) {
      console.log('ℹ️ No pending payments to authorize')
      return {
        success: true,
        processed: 0,
        message: 'No pending payments to authorize'
      }
    }

    console.log(`📋 Found ${payments.length} payment(s) to authorize`)

    let successCount = 0
    let skipCount = 0
    let failureCount = 0

    // Process each payment
    for (const payment of payments) {
      try {
        const appointment = Array.isArray(payment.appointments)
          ? payment.appointments[0]
          : payment.appointments

        // Skip if appointment is cancelled
        if (appointment.status === 'cancelled') {
          console.log(`⏭️  Skipping cancelled appointment payment: ${payment.id}`)
          skipCount++
          continue
        }

        const hoursUntilAppointment = (new Date(appointment.start_time).getTime() - now.getTime()) / (1000 * 60 * 60)
        console.log(`🔐 [${payment.id}] Authorizing payment (${hoursUntilAppointment.toFixed(1)}h until appointment)...`)

        // Call authorize-payment endpoint
        const authResponse = await $fetch('/api/wallee/authorize-payment', {
          method: 'POST',
          body: {
            paymentId: payment.id,
            userId: payment.user_id,
            tenantId: payment.tenant_id,
            appointmentStartTime: appointment.start_time,
            automaticPaymentHoursBefore: 24
          }
        })

        if (authResponse?.success) {
          console.log(`✅ [${payment.id}] Payment authorized - State: ${authResponse.state}`)
          successCount++
        } else {
          console.warn(`⚠️ [${payment.id}] Authorization returned non-success:`, authResponse)
          failureCount++
        }

      } catch (error: any) {
        console.error(`❌ [${payment.id}] Error authorizing:`, error.message)
        failureCount++
        // Continue with next payment
      }
    }

    const result = {
      success: true,
      total: payments.length,
      authorized: successCount,
      skipped: skipCount,
      failed: failureCount,
      message: `Processed ${payments.length} payments: ${successCount} authorized, ${skipCount} skipped, ${failureCount} failed`
    }

    console.log(`📊 [CRON] Processing complete:`, result)
    return result

  } catch (error: any) {
    console.error('❌ [CRON] Error in process-automatic-payments:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
