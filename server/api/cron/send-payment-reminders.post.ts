// ============================================
// Cron Job: Send Payment Confirmation Reminders
// ============================================
// Sendet wiederholte E-Mails für unbestätigte Zahlungen (Wallee only)
// Requirements: 1 Woche vor Termin + 1 Tag vor Termin

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail, generatePaymentReminderEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'

const CUSTOMER_PORTAL_BASE_URL = (process.env.CUSTOMER_PORTAL_BASE_URL || 'https://simy.ch').replace(/\/$/, '')

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let auditDetails: any = {}

  try {
    // ============ LAYER 1: CRON SECRET VALIDATION ============
    const cronSecret = event.node.req.headers['x-vercel-cron']
    const expectedCronSecret = process.env.CRON_SECRET

    if (!cronSecret || cronSecret !== expectedCronSecret) {
      await logAudit({
        action: 'cron_send_payment_reminders',
        status: 'failed',
        error_message: 'Invalid or missing cron secret',
        ip_address: ipAddress,
        details: { provided_secret: cronSecret ? 'present' : 'missing' }
      })
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid cron secret'
      })
    }

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitKey = `cron_payment_reminders:${ipAddress}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 10, 60000) // 10 calls per minute per IP
    
    if (!rateLimitResult.allowed) {
      await logAudit({
        action: 'cron_send_payment_reminders',
        status: 'failed',
        error_message: 'Rate limit exceeded',
        ip_address: ipAddress,
        details: { reason: 'too many requests' }
      })
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many cron job calls. Please try again later.'
      })
    }

    // ============ LAYER 3: AUDIT LOGGING (START) ============
    auditDetails.cron_job = 'send_payment_reminders'
    auditDetails.start_time = new Date().toISOString()

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

        // 3. Get all pending payments with appointments (Wallee only, payment_status = pending)
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            id,
            user_id,
            total_amount_rappen,
            payment_method,
            payment_status,
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
          .eq('payment_method', 'wallee')
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

            // Calculate if we should send a reminder based on appointment time
            let shouldSendEmail = false
            let nextReminderNumber = reminderCount + 1
            let reminderReason = ''

            // Get appointment start time
            const appointmentStartTime = new Date(appointment.start_time)
            const dayUntilAppointment = (appointmentStartTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

            // ✅ NEW LOGIC: Send reminders based on time until appointment
            // First reminder: 7 days before appointment
            if (!firstReminderSentAt && dayUntilAppointment <= 7 && dayUntilAppointment > 0) {
              shouldSendEmail = true
              nextReminderNumber = 1
              reminderReason = '7 days before appointment'
              logger.debug(`📧 Payment ${payment.id}: Time for first reminder (${dayUntilAppointment.toFixed(1)} days until appointment)`)
            }
            // Second reminder: 1 day before appointment (only if first was already sent)
            else if (firstReminderSentAt && reminderCount === 1 && dayUntilAppointment <= 1 && dayUntilAppointment > 0) {
              shouldSendEmail = true
              nextReminderNumber = 2
              reminderReason = '1 day before appointment'
              logger.debug(`📧 Payment ${payment.id}: Time for second reminder (${dayUntilAppointment.toFixed(1)} days until appointment)`)
            }

            // ✅ REMOVED: No SMS reminders needed per requirements

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
                  .select('name, slug, primary_color, twilio_from_sender')
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

                // ✅ NEW: Log to reminder_logs table
                await supabase
                  .from('reminder_logs')
                  .insert({
                    tenant_id: tenantId,
                    payment_id: payment.id,
                    appointment_id: appointment.id,
                    user_id: payment.user_id,
                    channel: 'email',
                    recipient: user.email,
                    subject: nextReminderNumber === 1 
                      ? `Terminbestätigung erforderlich - ${tenant.name}`
                      : nextReminderNumber >= 2
                      ? `Letzte Erinnerung: Terminbestätigung erforderlich - ${tenant.name}`
                      : `Erinnerung: Terminbestätigung erforderlich - ${tenant.name}`,
                    body: emailHtml,
                    status: 'sent',
                    error_message: null,
                    sent_at: new Date().toISOString()
                  })
                  .catch((err) => {
                    logger.warn('⚠️ Failed to log email to reminder_logs:', err)
                    // Don't throw - email was already sent
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

            // SMS reminder section - REMOVED (only email reminders needed per requirements)

          } catch (paymentError: any) {
            console.error(`❌ Error processing payment ${payment.id}:`, paymentError)
          }
        }
      } catch (tenantError: any) {
        console.error(`❌ Error processing tenant ${tenantSetting.tenant_id}:`, tenantError)
      }
    }

    logger.debug(`✅ Cron job completed. Sent ${totalEmailsSent} payment reminder emails.`)

    // ============ LAYER 4: AUDIT LOGGING (SUCCESS) ============
    auditDetails.emails_sent = totalEmailsSent
    auditDetails.duration_ms = Date.now() - startTime
    auditDetails.end_time = new Date().toISOString()

    await logAudit({
      action: 'cron_send_payment_reminders',
      status: 'success',
      ip_address: ipAddress,
      details: auditDetails
    })

    return {
      success: true,
      message: `Sent ${totalEmailsSent} payment reminder emails`,
      total_emails: totalEmailsSent,
      results
    }
  } catch (error: any) {
    logger.error('❌ Cron job failed:', error)

    // ============ LAYER 5: AUDIT LOGGING (ERROR) ============
    auditDetails.duration_ms = Date.now() - startTime
    auditDetails.error_message = error.message || 'Unknown error'

    await logAudit({
      action: 'cron_send_payment_reminders',
      status: 'error',
      error_message: error.statusMessage || error.message,
      ip_address: ipAddress,
      details: auditDetails
    }).catch((auditErr) => {
      logger.warn('⚠️ Failed to log error to audit:', auditErr)
    })

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed to send reminders: ${error.message}`
    })
  }
})
