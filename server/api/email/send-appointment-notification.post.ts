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
  tenantName?: string
}

// ========== TEMPLATES - Hier kannst du die Texte anpassen ==========

const TEMPLATES = {
  pending_confirmation: {
    subject: 'Terminbestätigung erforderlich',
    getHtml: (data: AppointmentNotificationBody) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      return `
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
              <p>Hallo ${firstName},</p>
              
              <p>ein neuer Termin wurde für dich erstellt. Bitte überprüfe die Details und bestätige den Termin.</p>
              
              <div class="appointment-box">
                <strong>Termin-Details:</strong><br>
                ${data.appointmentTime ? `<strong>Zeit:</strong> ${data.appointmentTime}<br>` : ''}
                ${data.staffName ? `<strong>Fahrlehrer:</strong> ${data.staffName}<br>` : ''}
                ${data.location ? `<strong>Ort:</strong> ${data.location}<br>` : ''}
              </div>
              
              <p>Bitte melde dich in dein Kundenkonto an um den Termin zu bestätigen.</p>
              
              <p>Viele Grüße,<br>dein ${data.tenantName || 'Driving'} Team</p>
            </div>
            
            <div class="footer">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworte nicht auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
      `
    }
  },
  
  cancelled: {
    subject: 'Termin storniert',
    getHtml: (data: AppointmentNotificationBody) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      return `
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
              <p>Hallo ${firstName},</p>
              
              <p>leider wurde dein Termin storniert.</p>
              
              ${data.appointmentTime ? `
              <div class="reason-box">
                <strong>Stornierter Termin:</strong> ${data.appointmentTime}<br>
                ${data.cancellationReason ? `<strong>Grund:</strong> ${data.cancellationReason}<br>` : ''}
              </div>
              ` : ''}
              
              <p>Falls du Fragen hast, kontaktiere uns bitte per E-Mail oder Telefon.</p>
              
              <p>Viele Grüße,<br>dein ${data.tenantName || 'Driving'} Team</p>
            </div>
            
            <div class="footer">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworte nicht auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
      `
    }
  },
  
  rescheduled: {
    subject: 'Termin verschoben - Neue Zeit',
    getHtml: (data: AppointmentNotificationBody) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      return `
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
              <p>Hallo ${firstName},</p>
              
              <p>dein Termin wurde auf einen neuen Zeitpunkt verschoben.</p>
              
              <div class="time-box">
                <strong>Neue Termin-Zeit:</strong><br>
                ${data.newTime || 'Zeit wird mitgeteilt'}<br>
                ${data.staffName ? `<strong>Fahrlehrer:</strong> ${data.staffName}<br>` : ''}
                ${data.location ? `<strong>Ort:</strong> ${data.location}<br>` : ''}
              </div>
              
              <p>Bitte notiere dir den neuen Termin. Falls du Fragen hast, kontaktiere uns bitte.</p>
              
              <p>Viele Grüße,<br>dein ${data.tenantName || 'Driving'} Team</p>
            </div>
            
            <div class="footer">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworte nicht auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
      `
    }
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

