/**
 * Cron Job: Send Delayed Confirmation Emails
 * Runs every minute to send confirmation emails 5 minutes after appointment creation
 * But only if the appointment hasn't been confirmed yet
 */

import { getSupabaseAdmin } from '~/utils/supabase'
import { sendEmail } from '~/server/utils/email'
import { generatePaymentReminderEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()
    const now = new Date()

    console.log('📧 Checking for pending confirmation emails...')

    // Find appointments where:
    // 1. Email should be sent (confirmation_email_scheduled_for <= NOW)
    // 2. Email hasn't been sent yet (confirmation_email_sent = false)
    // 3. Appointment hasn't been confirmed (status != 'confirmed' and status != 'scheduled')
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        status,
        start_time,
        duration_minutes,
        type,
        event_type_code,
        confirmation_email_scheduled_for,
        tenant_id,
        user_id,
        staff_id,
        users:user_id (
          email,
          first_name,
          last_name
        ),
        staff:staff_id (
          first_name,
          last_name
        ),
        tenants:tenant_id (
          id,
          name,
          slug,
          primary_color
        )
      `)
      .lte('confirmation_email_scheduled_for', now.toISOString())
      .eq('confirmation_email_sent', false)
      .in('status', ['pending_confirmation'])

    if (appointmentsError) {
      console.error('❌ Error fetching pending appointments:', appointmentsError)
      throw appointmentsError
    }

    if (!appointments || appointments.length === 0) {
      console.log('ℹ️ No pending confirmation emails to send')
      return {
        success: true,
        processed: 0,
        message: 'No pending confirmation emails'
      }
    }

    console.log(`📋 Found ${appointments.length} appointment(s) needing confirmation emails`)

    let sentCount = 0
    let failedCount = 0

    for (const appointment of appointments) {
      try {
        const user = Array.isArray(appointment.users)
          ? appointment.users[0]
          : appointment.users
        const staff = Array.isArray(appointment.staff)
          ? appointment.staff[0]
          : appointment.staff
        const tenant = Array.isArray(appointment.tenants)
          ? appointment.tenants[0]
          : appointment.tenants

        if (!user?.email) {
          console.warn(`⚠️ No email for user ${appointment.user_id}`)
          failedCount++
          continue
        }

        console.log(`📧 Sending confirmation email for appointment ${appointment.id}...`)

        // Format appointment details
        const startTime = new Date(appointment.start_time)
        const appointmentDate = startTime.toLocaleDateString('de-CH', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'Europe/Zurich'
        })
        const appointmentTime = startTime.toLocaleTimeString('de-CH', {
          timeZone: 'Europe/Zurich',
          hour: '2-digit',
          minute: '2-digit'
        })

        const staffName = staff
          ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
          : 'Fahrlehrer'

        // Generate and send email
        const emailHtml = generatePaymentReminderEmail({
          customerName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          appointmentDate,
          appointmentTime,
          staffName,
          amount: '0.00', // Placeholder - will be shown as confirmation email
          dashboardLink: `${process.env.NUXT_PUBLIC_BASE_URL || 'https://www.simy.ch'}/customer-dashboard`,
          tenantName: tenant?.name || 'Fahrschule',
          reminderNumber: 1,
          primaryColor: tenant?.primary_color || '#2563eb'
        })

        await sendEmail({
          to: user.email,
          subject: `Terminbestätigung erforderlich - ${tenant?.name || 'Fahrschule'}`,
          html: emailHtml
        })

        // Mark email as sent
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            confirmation_email_sent: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id)

        if (updateError) {
          console.error(`⚠️ Could not mark email as sent for ${appointment.id}:`, updateError)
          failedCount++
        } else {
          console.log(`✅ Confirmation email sent and marked for appointment ${appointment.id}`)
          sentCount++
        }

      } catch (error: any) {
        console.error(`❌ Error sending email for appointment ${appointment.id}:`, error.message)
        failedCount++
      }
    }

    console.log(`📊 Email sending complete: ${sentCount} sent, ${failedCount} failed`)

    return {
      success: true,
      processed: appointments.length,
      sent: sentCount,
      failed: failedCount
    }

  } catch (error: any) {
    console.error('❌ Error in send-confirmation-emails cron:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})

