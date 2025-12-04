// server/api/reminders/send-appointment-confirmation.post.ts
// Sendet die Terminbestätigungsemail mit Bestätigungslink

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'

const CUSTOMER_PORTAL_BASE_URL = process.env.NUXT_PUBLIC_SITE_URL || 'https://www.simy.ch'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId } = body

    if (!appointmentId) {
      throw createError({
        statusCode: 400,
        message: 'Missing required field: appointmentId'
      })
    }

    console.log('📧 Sending appointment confirmation reminder:', { appointmentId })

    const supabase = getSupabaseAdmin()

    // 1. Get appointment data
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select(`
        *,
        users:user_id (
          first_name,
          last_name,
          email
        ),
        staff:staff_id (
          first_name,
          last_name
        ),
        locations:location_id (
          name,
          address
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (aptError || !appointment) {
      console.error('❌ Appointment not found:', aptError)
      throw createError({
        statusCode: 404,
        message: 'Appointment not found'
      })
    }

    const user = (appointment as any).users
    const staff = (appointment as any).staff
    const location = (appointment as any).locations

    // Check if user has email
    if (!user?.email) {
      console.log('ℹ️ User has no email, skipping confirmation email')
      return {
        success: true,
        message: 'User has no email'
      }
    }

    // 2. Format appointment details
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

    const customerName = `${user.first_name} ${user.last_name}`
    const staffName = staff ? `${staff.first_name} ${staff.last_name}` : 'Ihr Fahrlehrer'
    const locationName = location?.name || appointment.title || 'Standort'
    const confirmationLink = `${CUSTOMER_PORTAL_BASE_URL}/confirm/${appointment.confirmation_token}`

    // 3. Generate email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .appointment-details { background-color: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Terminbestätigung erforderlich</h1>
            </div>
            
            <div class="content">
              <p>Hallo ${customerName},</p>
              
              <p>Danke, dass Sie einen Termin mit ${staffName} gebucht haben. Um Ihren Termin zu bestätigen, klicken Sie bitte auf den untenstehenden Button.</p>
              
              <div class="appointment-details">
                <strong>Termindetails:</strong><br>
                <strong>Datum:</strong> ${appointmentDate}<br>
                <strong>Zeit:</strong> ${appointmentTime}<br>
                <strong>Ort:</strong> ${locationName}<br>
                <strong>Fahrlehrer:</strong> ${staffName}<br>
                <strong>Dauer:</strong> ${appointment.duration_minutes} Minuten
              </div>
              
              <p style="text-align: center;">
                <a href="${confirmationLink}" class="button">Termin bestätigen</a>
              </p>
              
              <p>Falls Sie Fragen haben oder den Termin nicht bestätigen können, kontaktieren Sie uns bitte unter der Telefonnummer oder per E-Mail.</p>
              
              <p>Viele Grüße<br>Ihr Fahrschule Team</p>
            </div>
            
            <div class="footer">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht auf diese Nachricht.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // 4. Send email
    await sendEmail({
      to: user.email,
      subject: `Terminbestätigung erforderlich - ${appointmentDate} ${appointmentTime}`,
      html: emailHtml
    })

    console.log('✅ Appointment confirmation email sent to:', user.email)

    return {
      success: true,
      message: 'Confirmation email sent',
      email: user.email
    }
  } catch (error: any) {
    console.error('❌ Error sending appointment confirmation email:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

