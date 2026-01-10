// ============================================
// Cron Job: Send Payment Reminders
// ============================================
// Sendet Zahlungs-Erinnerungen 24h vor dem Termin
// Verschiedene Emails je nach Zahlungsmethode & Status

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'

const CUSTOMER_PORTAL_BASE_URL = (process.env.CUSTOMER_PORTAL_BASE_URL || 'https://simy.ch').replace(/\/$/, '')

export default defineEventHandler(async (event) => {
  // ============ DISABLED - WAITING FOR RPC FUNCTION ============
  // This cron job is temporarily disabled because it has a critical bug:
  // It sends reminders for ALL pending payments, not just those 24h before appointment
  // 
  // TODO: 
  // 1. Run migration: create_payment_reminders_function.sql (creates RPC function)
  // 2. Re-enable this cron job to use the RPC function
  // 3. RPC will filter payments correctly to only those 23-25h before appointment
  
  return {
    success: false,
    message: 'Payment reminders cron job is disabled - waiting for RPC function setup',
    status: 'DISABLED_PENDING_RPC_SETUP'
  }
})

/*
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

    logger.debug('💰 Starting payment reminders cron job...')
    
    const supabase = getSupabaseAdmin()
    const now = new Date()

    // ✅ FIX: Use RPC function to get payments due for reminders (23-25 hours before appointment)
    // This ensures we ONLY get payments where appointment is tomorrow, not all pending payments
    logger.debug('📡 Calling get_payments_due_for_reminders() RPC function...')
    
    const { data: payments, error: paymentsError } = await supabase
      .rpc('get_payments_due_for_reminders')

    if (paymentsError) {
      console.error('❌ Error calling RPC:', paymentsError)
      throw paymentsError
    }

    if (!payments || payments.length === 0) {
      logger.debug('ℹ️ No payments due for reminders in the next 24 hours')
      return {
        success: true,
        message: 'No payments to remind',
        total_sent: 0,
        results: []
      }
    }

    logger.debug(`💰 Found ${payments.length} payments due for reminders (23-25h before appointment)`)

    let totalEmailsSent = 0
    const results: any[] = []

    // Process each payment
    for (const paymentRow of payments) {
      try {
        const paymentId = paymentRow.payment_id
        const userId = paymentRow.user_id
        const tenantId = paymentRow.tenant_id
        const appointmentId = paymentRow.appointment_id
        const appointmentStartTime = paymentRow.appointment_start_time
        const paymentMethod = paymentRow.payment_method
        const totalAmountRappen = paymentRow.total_amount_rappen
        const reminderSentAt = paymentRow.reminder_sent_at

        // Get full appointment data for email
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            end_time,
            staff_id,
            status,
            title,
            location_id
          `)
          .eq('id', appointmentId)
          .single()

        if (appointmentError || !appointment) {
          logger.warn(`⚠️ Appointment not found for payment ${paymentId}`)
          continue
        }

        try {
          // Get user data
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('first_name, last_name, email, tenant_id')
            .eq('id', userId)
            .single()

          if (userError || !user) {
            logger.warn(`⚠️ User not found for payment ${paymentId}`)
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
            logger.warn(`⚠️ Tenant not found for payment ${paymentId}`)
            continue
          }

          // Get location data
          const { data: location } = await supabase
            .from('locations')
            .select('name')
            .eq('id', appointment.location_id)
            .single()

          // Format appointment data
          const startTime = new Date(appointment.start_time)
          const appointmentDate = startTime.toLocaleDateString('de-CH', {
            timeZone: 'Europe/Zurich',
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
          const appointmentTime = startTime.toLocaleTimeString('de-CH', {
            timeZone: 'Europe/Zurich',
            hour: '2-digit',
            minute: '2-digit'
          })
          const amount = (totalAmountRappen / 100).toFixed(2)
          const customerName = `${user.first_name} ${user.last_name}`
          const dashboardLink = `${CUSTOMER_PORTAL_BASE_URL}/${tenant.slug}`
          const locationName = location?.name || 'Treffpunkt'

          // Generate appropriate email based on payment method and status
          const emailData = {
            customerName,
            appointmentDate,
            appointmentTime,
            staffName,
            amount,
            dashboardLink,
            tenantName: tenant.name,
            primaryColor: tenant.primary_color || '#2563eb',
            locationName,
            appointmentTitle: appointment.title
          }

          let subject = ''
          let emailHtml = ''

          if (paymentMethod === 'wallee') {
            subject = `Zahlung erforderlich - Termin morgen um ${appointmentTime} - ${tenant.name}`
            emailHtml = generateWalleePaymentReminderEmail(emailData)
          } else if (paymentMethod === 'cash') {
            subject = `Barzahlung für Termin morgen - ${tenant.name}`
            emailHtml = generateCashPaymentReminderEmail(emailData)
          } else if (paymentMethod === 'invoice') {
            subject = `Rechnung für Termin - Zahlung erforderlich - ${tenant.name}`
            emailHtml = generateInvoicePaymentReminderEmail(emailData)
          }

          // Send email
          const emailResult = await sendEmail({
            to: user.email,
            subject,
            html: emailHtml
          })

          // Save reminder record
          await supabase
            .from('payment_reminders')
            .insert({
              payment_id: paymentId,
              reminder_type: 'email',
              reminder_number: 1,
              status: 'sent',
              metadata: {
                message_id: emailResult.messageId,
                sent_to: user.email,
                payment_method: paymentMethod
              }
            })

          // Log to reminder_logs table
          await supabase
            .from('reminder_logs')
            .insert({
              tenant_id: tenantId,
              payment_id: paymentId,
              appointment_id: appointmentId,
              user_id: userId,
              channel: 'email',
              recipient: user.email,
              subject,
              body: emailHtml,
              status: 'sent',
              error_message: null,
              sent_at: new Date().toISOString()
            })
            .catch((err) => {
              logger.warn('⚠️ Failed to log email to reminder_logs:', err)
            })

          // Update payment with reminder sent timestamp
          await supabase
            .from('payments')
            .update({
              reminder_sent_at: now.toISOString()
            })
            .eq('id', paymentId)

          totalEmailsSent++
          results.push({
            payment_id: paymentId,
            payment_method: paymentMethod,
            type: 'email',
            success: true,
            recipient: user.email
          })

          logger.debug(`✅ Payment reminder sent for ${paymentMethod} payment ${paymentId}`)
        } catch (emailError: any) {
          console.error(`❌ Error sending email for payment ${paymentId}:`, emailError)
          results.push({
            payment_id: paymentId,
            type: 'email',
            success: false,
            error: emailError.message
          })
        }
      } catch (paymentError: any) {
        console.error(`❌ Error processing payment ${paymentId}:`, paymentError)
      }
    }

    logger.debug(`✅ Payment reminders cron job completed. Sent ${totalEmailsSent} emails.`)

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
      total_sent: totalEmailsSent,
      results
    }
  } catch (error: any) {
    logger.error('❌ Payment reminders cron job failed:', error)

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

// ============ EMAIL TEMPLATES ============

function generateWalleePaymentReminderEmail(data: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${data.primaryColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .button { background-color: ${data.primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
    .amount { font-size: 24px; font-weight: bold; color: ${data.primaryColor}; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Zahlungserinnerung - ${data.tenantName}</h2>
    </div>
    <div class="content">
      <p>Liebe/r ${data.customerName},</p>
      <p>morgen ist dein Fahrttermin und die <strong>Zahlung ist noch ausstehend</strong>.</p>
      
      <div style="background-color: white; padding: 15px; border-left: 4px solid ${data.primaryColor}; margin: 20px 0;">
        <p><strong>📅 Termin:</strong> ${data.appointmentDate} um ${data.appointmentTime} Uhr</p>
        <p><strong>📍 Ort:</strong> ${data.locationName}</p>
        <p><strong>👨‍🏫 Fahrlehrer:</strong> ${data.staffName}</p>
        <div class="amount">CHF ${data.amount}</div>
      </div>

      <p>Bitte begleiche die Zahlung bis dahin online in deinem Dashboard.</p>
      
      <a href="${data.dashboardLink}" class="button">Zur Zahlung</a>
      
      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        Falls du noch Fragen hast, kontaktiere uns unter ${data.tenantName}.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

function generateCashPaymentReminderEmail(data: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #F59E0B; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .amount { font-size: 24px; font-weight: bold; color: #F59E0B; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Barzahlung erforderlich - ${data.tenantName}</h2>
    </div>
    <div class="content">
      <p>Liebe/r ${data.customerName},</p>
      <p>dein Fahrttermin ist morgen. Bitte beachte, dass die <strong>Zahlung in bar vor Ort</strong> fällig ist.</p>
      
      <div style="background-color: white; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0;">
        <p><strong>📅 Termin:</strong> ${data.appointmentDate} um ${data.appointmentTime} Uhr</p>
        <p><strong>📍 Ort:</strong> ${data.locationName}</p>
        <p><strong>👨‍🏫 Fahrlehrer:</strong> ${data.staffName}</p>
        <div class="amount">CHF ${data.amount}</div>
      </div>

      <p><strong>Bitte mitbringen:</strong> Bargeld in CHF für die Bezahlung vor Ort.</p>
      
      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        Falls du noch Fragen hast, kontaktiere uns unter ${data.tenantName}.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

function generateInvoicePaymentReminderEmail(data: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3B82F6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .amount { font-size: 24px; font-weight: bold; color: #3B82F6; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Rechnungsbenachrichtigung - ${data.tenantName}</h2>
    </div>
    <div class="content">
      <p>Liebe/r ${data.customerName},</p>
      <p>dein Fahrttermin ist morgen und die <strong>Rechnung ist noch nicht bezahlt</strong>.</p>
      
      <div style="background-color: white; padding: 15px; border-left: 4px solid #3B82F6; margin: 20px 0;">
        <p><strong>📅 Termin:</strong> ${data.appointmentDate} um ${data.appointmentTime} Uhr</p>
        <p><strong>📍 Ort:</strong> ${data.locationName}</p>
        <p><strong>👨‍🏫 Fahrlehrer:</strong> ${data.staffName}</p>
        <div class="amount">CHF ${data.amount}</div>
      </div>

      <p>Bitte veranlasse die Zahlung der Rechnung bis spätestens zum Termin. Die Zahlungsdaten findest du auf der Rechnung.</p>
      
      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        Falls du noch Fragen hast, kontaktiere uns unter ${data.tenantName}.
      </p>
    </div>
  </div>
</body>
</html>
  `
}
