// server/api/email/send-appointment-notification.post.ts
// Sends appointment notifications (confirmation, cancellation, move)

import { sendEmail } from '~/server/utils/email'

interface AppointmentNotificationBody {
  email: string
  studentName: string
  appointmentTime?: string
  type: 'pending_confirmation' | 'cancelled' | 'rescheduled'
  cancellationReason?: string
  newTime?: string
  staffName?: string
  location?: string
}

// ========== TEMPLATES - Hier kannst du die Texte anpassen ==========

const TEMPLATES = {
  pending_confirmation: {
    subject: 'Terminbestätigung erforderlich',
    getHtml: (data: AppointmentNotificationBody) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
            .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
            .content { background-color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .appointment-box { background-color: #f0f9ff; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; border-radius: 3px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Termin Bestätigung erforderlich</h1>
            </div>
            
            <div class="content">
              <p>Hallo ${data.studentName},</p>
              
              <p>ein neuer Termin wurde für Sie erstellt. Bitte überprüfen Sie die Details und bestätigen Sie den Termin.</p>
              
              <div class="appointment-box">
                <strong>Termin-Details:</strong><br>
                ${data.appointmentTime ? `<strong>Zeit:</strong> ${data.appointmentTime}<br>` : ''}
                ${data.staffName ? `<strong>Fahrlehrer:</strong> ${data.staffName}<br>` : ''}
                ${data.location ? `<strong>Ort:</strong> ${data.location}<br>` : ''}
              </div>
              
              <p>Bitte loggen Sie sich in Ihr Kundenkonto ein um den Termin zu bestätigen.</p>
              
              <p>Freundliche Grüße,<br>Ihr Driving Team</p>
            </div>
            
            <div class="footer">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
    `
  },
  
  cancelled: {
    subject: 'Termin storniert',
    getHtml: (data: AppointmentNotificationBody) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
            .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
            .content { background-color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .reason-box { background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0; border-radius: 3px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Termin Storniert</h1>
            </div>
            
            <div class="content">
              <p>Hallo ${data.studentName},</p>
              
              <p>leider wurde Ihr Termin storniert.</p>
              
              ${data.appointmentTime ? `
              <div class="reason-box">
                <strong>Stornierter Termin:</strong> ${data.appointmentTime}<br>
                ${data.cancellationReason ? `<strong>Grund:</strong> ${data.cancellationReason}<br>` : ''}
              </div>
              ` : ''}
              
              <p>Falls Sie Fragen haben, kontaktieren Sie uns bitte per E-Mail oder Telefon.</p>
              
              <p>Freundliche Grüße,<br>Ihr Driving Team</p>
            </div>
            
            <div class="footer">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
    `
  },
  
  rescheduled: {
    subject: 'Termin verschoben - Neue Zeit',
    getHtml: (data: AppointmentNotificationBody) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
            .header { background-color: #16a34a; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
            .content { background-color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .time-box { background-color: #f0fdf4; padding: 15px; border-left: 4px solid #16a34a; margin: 15px 0; border-radius: 3px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Termin Verschoben</h1>
            </div>
            
            <div class="content">
              <p>Hallo ${data.studentName},</p>
              
              <p>Ihr Termin wurde auf einen neuen Zeitpunkt verschoben.</p>
              
              <div class="time-box">
                <strong>Neue Termin-Zeit:</strong><br>
                ${data.newTime || 'Zeit wird mitgeteilt'}<br>
                ${data.staffName ? `<strong>Fahrlehrer:</strong> ${data.staffName}<br>` : ''}
                ${data.location ? `<strong>Ort:</strong> ${data.location}<br>` : ''}
              </div>
              
              <p>Bitte notieren Sie sich den neuen Termin. Falls Sie Fragen haben, kontaktieren Sie uns bitte.</p>
              
              <p>Freundliche Grüße,<br>Ihr Driving Team</p>
            </div>
            
            <div class="footer">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}

// ========== END TEMPLATES ==========

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<AppointmentNotificationBody>(event)
    
    const { email, studentName, type } = body
    
    if (!email || !studentName || !type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: email, studentName, type'
      })
    }
    
    const template = TEMPLATES[type as keyof typeof TEMPLATES]
    
    if (!template) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown notification type: ${type}`
      })
    }
    
    console.log(`📧 Sending ${type} appointment notification to ${email}`)
    
    const subject = template.subject
    const html = template.getHtml(body)
    
    await sendEmail({
      to: email,
      subject,
      html
    })
    
    console.log(`✅ ${type} email sent successfully to ${email}`)
    
    return {
      success: true,
      type,
      email,
      message: `${type} notification sent`
    }
    
  } catch (error: any) {
    console.error('❌ Error sending appointment notification:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to send appointment notification'
    })
  }
})

