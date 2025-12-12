// ============================================
// Cron Job: Send Payment Confirmation Reminders
// ============================================
// Sendet wiederholte E-Mails und SMS für unbestätigte Zahlungen

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail, generatePaymentReminderEmail } from '~/server/utils/email'
import { sendSMS, generatePaymentReminderSMS } from '~/server/utils/sms'
import { logger } from '~/utils/logger'

const CUSTOMER_PORTAL_BASE_URL = (process.env.CUSTOMER_PORTAL_BASE_URL || 'https://simy.ch').replace(/\/$/, '')

export default defineEventHandler(async (event) => {
  try {
    // Verify Vercel Cron or Admin Auth
    const authHeader = event.node.req.headers['authorization']
    const cronSecret = event.node.req.headers['x-vercel-cron']
    
    if (!cronSecret && !authHeader) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized: Missing cron secret or auth token'
      })
    }

    logger.debug('🔔 Starting payment confirmation reminders cron job...')
    
    const supabase = getSupabaseAdmin()
    const now = new Date()

    // 1. Get all tenants with reminder settings
    const { data: tenantSettings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('tenant_id, setting_value')
      .eq('category', 'payment')
      .eq('setting_key', 'reminder_settings')

    if (settingsError) {
      console.error('❌ Error loading tenant settings:', settingsError)
      throw settingsError
    }

    if (!tenantSettings || tenantSettings.length === 0) {
      logger.debug('ℹ️ No tenants with reminder settings found')
      return { success: true, message: 'No tenants to process' }
    }

    logger.debug(`📋 Processing ${tenantSettings.length} tenants...`)

    let totalEmailsSent = 0
    let totalSMSSent = 0
    const results: any[] = []

    // 2. Process each tenant
    for (const tenantSetting of tenantSettings) {
      try {
        const settings = typeof tenantSetting.setting_value === 'string'
          ? JSON.parse(tenantSetting.setting_value)
          : tenantSetting.setting_value

        const tenantId = tenantSetting.tenant_id

        // Skip if no emails configured
        if (!settings.reminder_email_count || settings.reminder_email_count === 0) {
          logger.debug(`ℹ️ Tenant ${tenantId}: No email reminders configured`)
          continue
        }

        logger.debug(`📧 Tenant ${tenantId}: Processing reminders...`, settings)

        // 3. Get all pending payments with appointments
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            id,
            user_id,
            total_amount_rappen,
            first_reminder_sent_at,
            last_reminder_sent_at,
            reminder_count,
            appointments (
              id,
              start_time,
              end_time,
              staff_id,
              status
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('payment_status', 'pending')
          .not('appointments', 'is', null)

        if (paymentsError) {
          console.error(`❌ Error loading payments for tenant ${tenantId}:`, paymentsError)
          continue
        }

        if (!payments || payments.length === 0) {
          logger.debug(`ℹ️ No pending payments for tenant ${tenantId}`)
          continue
        }

        logger.debug(`💰 Found ${payments.length} pending payments for tenant ${tenantId}`)

        // 4. Process each payment
        for (const payment of payments) {
          try {
            const appointment = Array.isArray(payment.appointments) 
              ? payment.appointments[0] 
              : payment.appointments

            // Skip if appointment is not pending_confirmation
            if (!appointment || appointment.status !== 'pending_confirmation') {
              continue
            }

            const firstReminderSentAt = payment.first_reminder_sent_at 
              ? new Date(payment.first_reminder_sent_at)
              : null
            const lastReminderSentAt = payment.last_reminder_sent_at
              ? new Date(payment.last_reminder_sent_at)
              : null
            const reminderCount = payment.reminder_count || 0

            // Calculate if we should send a reminder
            let shouldSendEmail = false
            let shouldSendSMS = false
            let nextReminderNumber = reminderCount + 1

            if (!firstReminderSentAt) {
              // First reminder should have been sent at payment creation
              // Skip this payment
              logger.debug(`⏭️ Payment ${payment.id}: No first reminder sent yet (should be sent at creation)`)
              continue
            }

            // Check if it's time for the next email reminder
            if (lastReminderSentAt && nextReminderNumber <= settings.reminder_email_count) {
              const daysSinceLastReminder = (now.getTime() - lastReminderSentAt.getTime()) / (1000 * 60 * 60 * 24)
              
              if (daysSinceLastReminder >= settings.reminder_email_interval_days) {
                shouldSendEmail = true
                logger.debug(`📧 Payment ${payment.id}: Time for email reminder #${nextReminderNumber}`)
              }
            }

            // Check if it's time for SMS (after all emails)
            if (settings.reminder_sms_enabled && 
                settings.reminder_sms_after_emails && 
                reminderCount >= settings.reminder_email_count) {
              
              // Check if SMS was already sent
              const { data: smsReminder, error: smsError } = await supabase
                .from('payment_reminders')
                .select('id')
                .eq('payment_id', payment.id)
                .eq('reminder_type', 'sms')
                .maybeSingle()

              if (!smsReminder && lastReminderSentAt) {
                const daysSinceLastReminder = (now.getTime() - lastReminderSentAt.getTime()) / (1000 * 60 * 60 * 24)
                
                if (daysSinceLastReminder >= settings.reminder_email_interval_days) {
                  shouldSendSMS = true
                  logger.debug(`📱 Payment ${payment.id}: Time for SMS reminder`)
                }
              }
            }

            // Send email reminder
            if (shouldSendEmail) {
              try {
                // Get user data
                const { data: user, error: userError } = await supabase
                  .from('users')
                  .select('first_name, last_name, email, phone')
                  .eq('id', payment.user_id)
                  .single()

                if (userError || !user) {
                  console.error(`❌ User not found for payment ${payment.id}`)
                  continue
                }

                // Get staff data
                const { data: staff, error: staffError } = await supabase
                  .from('users')
                  .select('first_name, last_name')
                  .eq('id', appointment.staff_id)
                  .single()

                const staffName = staff 
                  ? `${staff.first_name} ${staff.last_name}`
                  : 'Ihr Fahrlehrer'

                // Get tenant data
                const { data: tenant, error: tenantError } = await supabase
                  .from('tenants')
                  .select('name, slug, primary_color')
                  .eq('id', tenantId)
                  .single()

                if (tenantError || !tenant) {
                  console.error(`❌ Tenant not found: ${tenantId}`)
                  continue
                }

                // Format data
                const startTime = new Date(appointment.start_time)
                const appointmentDate = startTime.toLocaleDateString('de-CH', {
                  timeZone: 'Europe/Zurich',
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
                const appointmentTime = startTime.toLocaleTimeString('de-CH', {
                  timeZone: 'Europe/Zurich',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                const amount = (payment.total_amount_rappen / 100).toFixed(2)
                const customerName = `${user.first_name} ${user.last_name}`
                const dashboardLink = `${CUSTOMER_PORTAL_BASE_URL}/${tenant.slug}`

                // Generate and send email
                const emailHtml = generatePaymentReminderEmail({
                  customerName,
                  appointmentDate,
                  appointmentTime,
                  staffName,
                  amount,
                  dashboardLink,
                  tenantName: tenant.name,
                  reminderNumber: nextReminderNumber,
                  primaryColor: tenant.primary_color || '#2563eb'
                })

                const emailResult = await sendEmail({
                  to: user.email,
                  subject: nextReminderNumber === 1 
                    ? `Terminbestätigung erforderlich - ${tenant.name}`
                    : nextReminderNumber >= 3
                    ? `Letzte Erinnerung: Terminbestätigung erforderlich - ${tenant.name}`
                    : `Erinnerung: Terminbestätigung erforderlich - ${tenant.name}`,
                  html: emailHtml
                })

                // Save reminder to DB
                await supabase
                  .from('payment_reminders')
                  .insert({
                    payment_id: payment.id,
                    reminder_type: 'email',
                    reminder_number: nextReminderNumber,
                    status: 'sent',
                    metadata: {
                      message_id: emailResult.messageId,
                      sent_to: user.email
                    }
                  })

                // Update payment
                await supabase
                  .from('payments')
                  .update({
                    last_reminder_sent_at: now.toISOString(),
                    reminder_count: nextReminderNumber
                  })
                  .eq('id', payment.id)

                totalEmailsSent++
                results.push({
                  payment_id: payment.id,
                  type: 'email',
                  reminder_number: nextReminderNumber,
                  success: true
                })

                logger.debug(`✅ Email reminder #${nextReminderNumber} sent for payment ${payment.id}`)
              } catch (emailError: any) {
                console.error(`❌ Error sending email for payment ${payment.id}:`, emailError)
                results.push({
                  payment_id: payment.id,
                  type: 'email',
                  success: false,
                  error: emailError.message
                })
              }
            }

            // Send SMS reminder
            if (shouldSendSMS) {
              try {
                // Get user data
                const { data: user, error: userError } = await supabase
                  .from('users')
                  .select('first_name, last_name, phone')
                  .eq('id', payment.user_id)
                  .single()

                if (userError || !user || !user.phone) {
                  console.error(`❌ User or phone not found for payment ${payment.id}`)
                  continue
                }

                // Get tenant data
                const { data: tenant, error: tenantError } = await supabase
                  .from('tenants')
                  .select('name, slug')
                  .eq('id', tenantId)
                  .single()

                if (tenantError || !tenant) {
                  console.error(`❌ Tenant not found: ${tenantId}`)
                  continue
                }

                // Format data
                const startTime = new Date(appointment.start_time)
                const appointmentDate = startTime.toLocaleDateString('de-CH', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
                const appointmentTime = startTime.toLocaleTimeString('de-CH', {
                  timeZone: 'Europe/Zurich',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                const amount = (payment.total_amount_rappen / 100).toFixed(2)
                const customerName = `${user.first_name} ${user.last_name}`
                const dashboardLink = `${CUSTOMER_PORTAL_BASE_URL}/${tenant.slug}`

                // Generate and send SMS
                const smsText = generatePaymentReminderSMS({
                  customerName,
                  appointmentDate,
                  appointmentTime,
                  amount,
                  dashboardLink,
                  tenantName: tenant.name
                })

                const smsResult = await sendSMS({
                  to: user.phone,
                  message: smsText,
                  senderName: tenant.name
                })

                // Save reminder to DB
                await supabase
                  .from('payment_reminders')
                  .insert({
                    payment_id: payment.id,
                    reminder_type: 'sms',
                    reminder_number: 1, // SMS is always #1 (after all emails)
                    status: 'sent',
                    metadata: {
                      message_sid: smsResult.messageSid,
                      sent_to: user.phone
                    }
                  })

                // Update payment
                await supabase
                  .from('payments')
                  .update({
                    last_reminder_sent_at: now.toISOString()
                  })
                  .eq('id', payment.id)

                totalSMSSent++
                results.push({
                  payment_id: payment.id,
                  type: 'sms',
                  success: true
                })

                logger.debug(`✅ SMS reminder sent for payment ${payment.id}`)
              } catch (smsError: any) {
                console.error(`❌ Error sending SMS for payment ${payment.id}:`, smsError)
                results.push({
                  payment_id: payment.id,
                  type: 'sms',
                  success: false,
                  error: smsError.message
                })
              }
            }
          } catch (paymentError: any) {
            console.error(`❌ Error processing payment ${payment.id}:`, paymentError)
          }
        }
      } catch (tenantError: any) {
        console.error(`❌ Error processing tenant ${tenantSetting.tenant_id}:`, tenantError)
      }
    }

    logger.debug(`✅ Cron job completed. Sent ${totalEmailsSent} emails and ${totalSMSSent} SMS.`)

    return {
      success: true,
      message: `Sent ${totalEmailsSent} emails and ${totalSMSSent} SMS`,
      total_emails: totalEmailsSent,
      total_sms: totalSMSSent,
      results
    }
  } catch (error: any) {
    console.error('❌ Cron job failed:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to send reminders: ${error.message}`
    })
  }
})
