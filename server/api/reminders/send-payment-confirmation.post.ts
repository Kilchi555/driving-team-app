// ============================================
// Send Payment Confirmation Reminder
// ============================================
// Sendet die erste Erinnerungs-E-Mail nach Payment-Erstellung

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail, generatePaymentReminderEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  try {
    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.log('ℹ️ Skipping reminder email: RESEND_API_KEY not configured')
      return {
        success: true,
        message: 'Reminder skipped (email not configured)',
        emailSent: false
      }
    }

    const body = await readBody(event)
    const { paymentId, userId, tenantId } = body

    if (!paymentId || !userId || !tenantId) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: paymentId, userId, tenantId'
      })
    }

    console.log('📧 Sending first payment confirmation reminder...')
    console.log('  Payment ID:', paymentId)
    console.log('  User ID:', userId)
    console.log('  Tenant ID:', tenantId)

    const supabase = getSupabaseAdmin()

    // 1. Lade Payment mit Appointment-Details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          id,
          start_time,
          end_time,
          staff_id,
          users!appointments_staff_id_fkey (
            first_name,
            last_name
          )
        )
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      console.error('❌ Payment not found:', paymentError)
      throw createError({
        statusCode: 404,
        message: 'Payment not found'
      })
    }

    // 2. Lade User-Daten
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('❌ User not found:', userError)
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    // 3. Lade Tenant-Daten
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, slug, contact_email, contact_phone')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      console.error('❌ Tenant not found:', tenantError)
      throw createError({
        statusCode: 404,
        message: 'Tenant not found'
      })
    }

    // 4. Formatiere Daten
    const appointment = (payment.appointments as any)?.[0] || payment.appointments
    const startTime = new Date(appointment.start_time)
    const appointmentDate = startTime.toLocaleDateString('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    const appointmentTime = startTime.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit'
    })
    const staffMember = (appointment.users as any)?.[0] || appointment.users
    const staffName = staffMember 
      ? `${staffMember.first_name} ${staffMember.last_name}`
      : 'Ihr Fahrlehrer'

    const amount = (payment.total_amount_rappen / 100).toFixed(2)
    const customerName = `${user.first_name} ${user.last_name}`
    
    // Dashboard-Link
    const dashboardLink = `https://${tenant.slug}.drivingteam.ch/customer-dashboard`

    // 5. Generiere E-Mail
    const emailHtml = generatePaymentReminderEmail({
      customerName,
      appointmentDate,
      appointmentTime,
      staffName,
      amount,
      dashboardLink,
      tenantName: tenant.name,
      reminderNumber: 1
    })

    // 6. Sende E-Mail
    const emailResult = await sendEmail({
      to: user.email,
      subject: `Terminbestätigung erforderlich - ${tenant.name}`,
      html: emailHtml
    })

    // 7. Speichere Reminder in DB
    const { error: reminderError } = await supabase
      .from('payment_reminders')
      .insert({
        payment_id: paymentId,
        reminder_type: 'email',
        reminder_number: 1,
        status: 'sent',
        metadata: {
          message_id: emailResult.messageId,
          sent_to: user.email
        }
      })

    if (reminderError) {
      console.error('⚠️ Error saving reminder to DB:', reminderError)
      // Nicht kritisch, E-Mail wurde trotzdem gesendet
    }

    // 8. Update Payment
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        first_reminder_sent_at: new Date().toISOString(),
        last_reminder_sent_at: new Date().toISOString(),
        reminder_count: 1
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('⚠️ Error updating payment:', updateError)
    }

    console.log('✅ First payment confirmation reminder sent successfully')

    return {
      success: true,
      message: 'First reminder sent',
      emailSent: true
    }
  } catch (error: any) {
    console.error('❌ Error sending first reminder:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to send reminder'
    })
  }
})

