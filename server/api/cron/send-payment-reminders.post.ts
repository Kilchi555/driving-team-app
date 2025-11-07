// server/api/cron/send-payment-reminders.post.ts
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔔 Starting appointment confirmation reminders cron job...')
    
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

    // ✅ NUR Confirmation Reminders (Payment Reminders nicht mehr nötig - automatische Zahlung nach Bestätigung)
    let totalConfirmationReminders = 0
    const confirmationResults: any[] = []

    console.log('📅 Processing appointment confirmation reminders...')

    for (const tenant of tenants) {
      try {
        const settings = typeof tenant.setting_value === 'string' 
          ? JSON.parse(tenant.setting_value) 
          : tenant.setting_value

        // Skip if reminders are not enabled
        if (!settings?.is_enabled) {
          continue
        }

        // Get all pending confirmation appointments for this tenant
        // ✅ WICHTIG: Auch Termine die bereits vorbei sind (überfällig) werden weiterhin erinnert
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            created_at,
            start_time,
            end_time,
            confirmation_token,
            status,
            metadata,
            users!inner (
              tenant_id
            )
          `)
          .eq('status', 'pending_confirmation')
          .eq('users.tenant_id', tenant.tenant_id)
          .not('confirmation_token', 'is', null)
          // ✅ KEIN Filter nach start_time - auch vergangene Termine werden weiterhin erinnert

        if (appointmentsError) {
          console.error(`❌ Error loading appointments for tenant ${tenant.tenant_id}:`, appointmentsError)
          continue
        }

        if (!appointments || appointments.length === 0) {
          console.log(`ℹ️ No pending confirmation appointments for tenant ${tenant.tenant_id}`)
          continue
        }

        console.log(`📅 Found ${appointments.length} pending confirmation appointments for tenant ${tenant.tenant_id}`)

        // Process each appointment
        for (const appointment of appointments) {
          try {
            const appointmentCreatedAt = new Date(appointment.created_at)
            const hoursSinceCreation = (now.getTime() - appointmentCreatedAt.getTime()) / (1000 * 60 * 60)

            // Get last reminder info from metadata
            const lastConfirmationReminder = appointment.metadata?.last_confirmation_reminder_sent_at
            const lastConfirmationStage = appointment.metadata?.last_confirmation_reminder_stage

            let shouldSendReminder = false
            let reminderStage: 'first' | 'second' | 'final' | null = null
            let channels = {
              email: false,
              sms: false,
              push: false
            }

            // Determine which reminder to send (same logic as payments)
            if (!lastConfirmationReminder) {
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
              const lastReminderSentAt = new Date(lastConfirmationReminder)
              const hoursSinceLastReminder = (now.getTime() - lastReminderSentAt.getTime()) / (1000 * 60 * 60)

              // Check for second reminder
              if (lastConfirmationStage === 'first' && 
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
              else if (lastConfirmationStage === 'second' && 
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
              console.log(`📤 Sending ${reminderStage} confirmation reminder for appointment ${appointment.id}`)

              // Import the reminder service dynamically
              const { useReminderService } = await import('~/composables/useReminderService')
              const { sendConfirmationReminder } = useReminderService()

              const result = await sendConfirmationReminder(appointment.id, reminderStage, channels)

              if (result.success) {
                totalConfirmationReminders++
                confirmationResults.push({
                  appointment_id: appointment.id,
                  stage: reminderStage,
                  success: true
                })
                console.log(`✅ Confirmation reminder sent successfully for appointment ${appointment.id}`)
              } else {
                confirmationResults.push({
                  appointment_id: appointment.id,
                  stage: reminderStage,
                  success: false,
                  error: result.error
                })
                console.error(`❌ Failed to send confirmation reminder for appointment ${appointment.id}:`, result.error)
              }
            }
          } catch (appointmentError: any) {
            console.error(`❌ Error processing appointment ${appointment.id}:`, appointmentError)
            confirmationResults.push({
              appointment_id: appointment.id,
              success: false,
              error: appointmentError.message
            })
          }
        }
      } catch (tenantError: any) {
        console.error(`❌ Error processing tenant ${tenant.tenant_id}:`, tenantError)
      }
    }

    console.log(`✅ Cron job completed. Sent ${totalConfirmationReminders} confirmation reminders.`)

    return {
      success: true,
      message: `Sent ${totalConfirmationReminders} confirmation reminders`,
      total_confirmation_reminders: totalConfirmationReminders,
      confirmation_results: confirmationResults
    }
  } catch (error: any) {
    console.error('❌ Cron job failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to send reminders: ${error.message}`
    })
  }
})

