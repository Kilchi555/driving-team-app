// ============================================
// Send Payment Confirmation Reminder
// ============================================
// Sendet die erste Erinnerungs-E-Mail nach Payment-Erstellung
// WICHTIG: Prüft ob User eine E-Mail hat (für Neukunden die per SMS registriert werden)

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'

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
    const appointmentDateTime = startTime.toLocaleString('de-CH', {
      timeZone: 'Europe/Zurich',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    const amount = `CHF ${(payment.total_amount_rappen / 100).toFixed(2)}`
    const customerName = `${user.first_name} ${user.last_name}`

    // 8. Send email using centralized endpoint
    await sendEmail({
      to: user.email,
      subject: `Terminbestätigung erforderlich - ${tenant.name}`,
      html: `
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td>
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 auto;">
          <tr>
            <td style="background-color: ${tenant.primary_color || '#2563eb'}; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Terminbestätigung erforderlich</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hallo ${user.first_name},</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">ein neuer Termin wurde für dich erstellt. Bitte überprüfe die Details und bestätige deinen Termin:</p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid ${tenant.primary_color || '#2563eb'}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 5px 0; color: #374151;"><strong>Zeit:</strong> ${appointmentDateTime}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Fahrlehrer:</strong> ${staffName}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Betrag:</strong> ${amount}</p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">Bitte bestätige deinen Termin und bezahle die offene Rechnung in deinem Kundenkonto.</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">Freundliche Grüsse,<br><strong>${tenant.name}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">Dies ist eine automatisch generierte E-Mail. Bitte antworte nicht auf diese E-Mail.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
      `
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
