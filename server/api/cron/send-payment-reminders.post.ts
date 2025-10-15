// server/api/cron/send-payment-reminders.post.ts
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔔 Starting payment reminders cron job...')
    
    const supabase = getSupabase()
    const now = new Date()

    // Get all tenants with reminders enabled
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenant_settings')
      .select('tenant_id, setting_value')
      .eq('setting_key', 'reminder_settings')
      .eq('is_active', true)

    if (tenantsError) {
      console.error('❌ Error loading tenants:', tenantsError)
      throw tenantsError
    }

    if (!tenants || tenants.length === 0) {
      console.log('ℹ️ No tenants with reminder settings found')
      return { success: true, message: 'No tenants to process' }
    }

    console.log(`📋 Processing ${tenants.length} tenants...`)

    let totalReminders = 0
    const results: any[] = []

    for (const tenant of tenants) {
      try {
        const settings = typeof tenant.setting_value === 'string' 
          ? JSON.parse(tenant.setting_value) 
          : tenant.setting_value

        // Skip if reminders are not enabled
        if (!settings?.is_enabled) {
          console.log(`⏭️ Skipping tenant ${tenant.tenant_id} - reminders disabled`)
          continue
        }

        console.log(`🏢 Processing tenant ${tenant.tenant_id}...`)

        // Get all pending payments for this tenant
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            id,
            created_at,
            last_reminder_sent_at,
            last_reminder_stage,
            payment_status,
            users!inner (
              tenant_id
            )
          `)
          .eq('payment_status', 'pending')
          .eq('users.tenant_id', tenant.tenant_id)

        if (paymentsError) {
          console.error(`❌ Error loading payments for tenant ${tenant.tenant_id}:`, paymentsError)
          continue
        }

        if (!payments || payments.length === 0) {
          console.log(`ℹ️ No pending payments for tenant ${tenant.tenant_id}`)
          continue
        }

        console.log(`💰 Found ${payments.length} pending payments for tenant ${tenant.tenant_id}`)

        // Process each payment
        for (const payment of payments) {
          try {
            const paymentCreatedAt = new Date(payment.created_at)
            const hoursSinceCreation = (now.getTime() - paymentCreatedAt.getTime()) / (1000 * 60 * 60)

            let shouldSendReminder = false
            let reminderStage: 'first' | 'second' | 'final' | null = null
            let channels = {
              email: false,
              sms: false,
              push: false
            }

            // Determine which reminder to send
            if (!payment.last_reminder_sent_at) {
              // No reminder sent yet - check if it's time for first reminder
              if (hoursSinceCreation >= settings.first_after_hours) {
                shouldSendReminder = true
                reminderStage = 'first'
                channels = {
                  email: settings.first_email || false,
                  sms: settings.first_sms || false,
                  push: settings.first_push || false
                }
              }
            } else {
              const lastReminderSentAt = new Date(payment.last_reminder_sent_at)
              const hoursSinceLastReminder = (now.getTime() - lastReminderSentAt.getTime()) / (1000 * 60 * 60)

              // Check for second reminder
              if (payment.last_reminder_stage === 'first' && 
                  hoursSinceCreation >= settings.second_after_hours) {
                shouldSendReminder = true
                reminderStage = 'second'
                channels = {
                  email: settings.second_email || false,
                  sms: settings.second_sms || false,
                  push: settings.second_push || false
                }
              }
              // Check for final reminder
              else if (payment.last_reminder_stage === 'second' && 
                       hoursSinceCreation >= settings.final_after_hours) {
                shouldSendReminder = true
                reminderStage = 'final'
                channels = {
                  email: settings.final_email || false,
                  sms: settings.final_sms || false,
                  push: settings.final_push || false
                }
              }
            }

            // Send reminder if needed
            if (shouldSendReminder && reminderStage) {
              console.log(`📤 Sending ${reminderStage} reminder for payment ${payment.id}`)

              // Import the reminder service dynamically
              const { useReminderService } = await import('~/composables/useReminderService')
              const { sendPaymentReminder } = useReminderService()

              const result = await sendPaymentReminder(payment.id, reminderStage, channels)

              if (result.success) {
                totalReminders++
                results.push({
                  payment_id: payment.id,
                  stage: reminderStage,
                  success: true
                })
                console.log(`✅ Reminder sent successfully for payment ${payment.id}`)
              } else {
                results.push({
                  payment_id: payment.id,
                  stage: reminderStage,
                  success: false,
                  error: result.error
                })
                console.error(`❌ Failed to send reminder for payment ${payment.id}:`, result.error)
              }
            }
          } catch (paymentError: any) {
            console.error(`❌ Error processing payment ${payment.id}:`, paymentError)
            results.push({
              payment_id: payment.id,
              success: false,
              error: paymentError.message
            })
          }
        }
      } catch (tenantError: any) {
        console.error(`❌ Error processing tenant ${tenant.tenant_id}:`, tenantError)
      }
    }

    console.log(`✅ Cron job completed. Sent ${totalReminders} reminders.`)

    return {
      success: true,
      message: `Sent ${totalReminders} reminders`,
      total_reminders: totalReminders,
      results
    }
  } catch (error: any) {
    console.error('❌ Cron job failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to send reminders: ${error.message}`
    })
  }
})

