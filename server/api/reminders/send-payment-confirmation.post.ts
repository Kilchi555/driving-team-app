// ============================================
// Send Payment Confirmation Reminder
// ============================================
// Sendet die erste Erinnerungs-E-Mail nach Payment-Erstellung
// WICHTIG: Prüft ob User eine E-Mail hat (für Neukunden die per SMS registriert werden)

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail, generatePaymentReminderEmail } from '~/server/utils/email'

const CUSTOMER_PORTAL_BASE_URL = (process.env.CUSTOMER_PORTAL_BASE_URL || 'https://simy.ch').replace(/\/$/, '')

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { paymentId, userId, tenantId } = body

    if (!paymentId || !userId || !tenantId) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: paymentId, userId, tenantId'
      })
    }

    console.log('📧 Sending first payment reminder:', { paymentId, userId, tenantId })

    const supabase = getSupabaseAdmin()
    const now = new Date()

    // 1. Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone, onboarding_status')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('❌ User not found:', userId)
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    // 2. Check if user has email (Neukunden ohne Registrierung haben keine E-Mail)
    if (!user.email || user.email.trim() === '') {
      console.log('⏭️ User has no email yet (pending onboarding), skipping first reminder')
      
      // Update payment to indicate reminder was skipped (will be sent after onboarding)
      await supabase
        .from('payments')
        .update({
          first_reminder_sent_at: null, // NULL = noch nicht gesendet
          reminder_count: 0
        })
        .eq('id', paymentId)

      return {
        success: true,
        skipped: true,
        reason: 'user_email_pending_onboarding',
        message: 'First reminder will be sent after user completes onboarding'
      }
    }

    // 3. Check if user is still in onboarding
    if (user.onboarding_status === 'pending') {
      console.log('⏭️ User is still in onboarding, skipping first reminder')
      
      await supabase
        .from('payments')
        .update({
          first_reminder_sent_at: null,
          reminder_count: 0
        })
        .eq('id', paymentId)

      return {
        success: true,
        skipped: true,
        reason: 'user_onboarding_pending',
        message: 'First reminder will be sent after user completes onboarding'
      }
    }

    // 4. Get payment and appointment data
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        total_amount_rappen,
        appointments (
          id,
          start_time,
          end_time,
          staff_id
        )
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      console.error('❌ Payment not found:', paymentId)
      throw createError({
        statusCode: 404,
        message: 'Payment not found'
      })
    }

    const appointment = Array.isArray(payment.appointments)
      ? payment.appointments[0]
      : payment.appointments

    if (!appointment) {
      console.error('❌ Appointment not found for payment:', paymentId)
      throw createError({
        statusCode: 404,
        message: 'Appointment not found'
      })
    }

    // 5. Get staff data
    const { data: staff, error: staffError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', appointment.staff_id)
      .single()

    const staffName = staff
      ? `${staff.first_name} ${staff.last_name}`
      : 'Ihr Fahrlehrer'

    // 6. Get tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, slug, primary_color')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      console.error('❌ Tenant not found:', tenantId)
      throw createError({
        statusCode: 404,
        message: 'Tenant not found'
      })
    }

    // 7. Format data for email
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

    // 8. Generate and send email
    const emailHtml = generatePaymentReminderEmail({
      customerName,
      appointmentDate,
      appointmentTime,
      staffName,
      amount,
      dashboardLink,
      tenantName: tenant.name,
      reminderNumber: 1,
      primaryColor: tenant.primary_color || '#2563eb'
    })

    await sendEmail({
      to: user.email,
      subject: `Terminbestätigung erforderlich - ${tenant.name}`,
      html: emailHtml
    })

    // 9. Update payment with reminder info
    await supabase
      .from('payments')
      .update({
        first_reminder_sent_at: now.toISOString(),
        last_reminder_sent_at: now.toISOString(),
        reminder_count: 1
      })
      .eq('id', paymentId)

    console.log('✅ First payment reminder sent successfully')

    return {
      success: true,
      skipped: false,
      message: 'First reminder sent successfully'
    }
  } catch (error: any) {
    console.error('❌ Error sending first reminder:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to send first reminder: ${error.message}`
    })
  }
})
