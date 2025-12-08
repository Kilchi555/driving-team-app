// server/api/email/send-appointment-notification.post.ts
// Sends appointment notifications (confirmation, cancellation, move)

import { sendEmail } from '~/server/utils/email'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

interface AppointmentNotificationBody {
  email: string
  studentName: string
  appointmentTime?: string
  type: 'pending_confirmation' | 'pending_payment' | 'cancelled' | 'rescheduled'
  cancellationReason?: string
  newTime?: string
  oldTime?: string
  staffName?: string
  location?: string
  tenantName?: string
  tenantId?: string
  amount?: string
}

// ========== TEMPLATES - Dynamic with tenant colors ==========

const TEMPLATES = {
  pending_confirmation: {
    subject: 'Terminbestätigung erforderlich',
    getHtml: (data: AppointmentNotificationBody, primaryColor: string) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      return `
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td>
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 auto;">
          <tr>
            <td style="background-color: ${primaryColor}; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Terminbestätigung erforderlich</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hallo ${firstName},</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">ein neuer Termin wurde für dich erstellt. Bitte überprüfe die Details:</p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                ${data.appointmentTime ? `<p style="margin: 5px 0; color: #374151;"><strong>Zeit:</strong> ${data.appointmentTime}</p>` : ''}
                ${data.staffName ? `<p style="margin: 5px 0; color: #374151;"><strong>Fahrlehrer:</strong> ${data.staffName}</p>` : ''}
                ${data.location ? `<p style="margin: 5px 0; color: #374151;"><strong>Ort:</strong> ${data.location}</p>` : ''}
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">Bitte melde dich in dein Kundenkonto an um den Termin zu bestätigen.</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">Freundliche Grüsse,<br><strong>${data.tenantName || 'Driving Team'}</strong></p>
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
    }
  },

  pending_payment: {
    subject: 'Terminbestätigung erforderlich',
    getHtml: (data: AppointmentNotificationBody, primaryColor: string) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      return `
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td>
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 auto;">
          <tr>
            <td style="background-color: ${primaryColor}; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Terminbestätigung erforderlich</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hallo ${firstName},</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">ein neuer Termin wurde für dich erstellt. Bitte überprüfe die Details und bestätige deinen Termin:</p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                ${data.appointmentTime ? `<p style="margin: 5px 0; color: #374151;"><strong>Zeit:</strong> ${data.appointmentTime}</p>` : ''}
                ${data.staffName ? `<p style="margin: 5px 0; color: #374151;"><strong>Fahrlehrer:</strong> ${data.staffName}</p>` : ''}
                ${data.location ? `<p style="margin: 5px 0; color: #374151;"><strong>Ort:</strong> ${data.location}</p>` : ''}
                ${data.amount ? `<p style="margin: 5px 0; color: #374151;"><strong>Betrag:</strong> ${data.amount}</p>` : ''}
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">Bitte bestätige deinen Termin und bezahle die offene Rechnung in deinem Kundenkonto.</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">Freundliche Grüsse,<br><strong>${data.tenantName || 'Driving Team'}</strong></p>
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
    }
  },
  
  cancelled: {
    subject: 'Termin storniert',
    getHtml: (data: AppointmentNotificationBody, primaryColor: string) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      return `
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td>
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 auto;">
          <tr>
            <td style="background-color: #dc2626; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Termin storniert</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hallo ${firstName},</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">leider wurde dein Termin storniert.</p>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
                ${data.appointmentTime ? `<p style="margin: 5px 0; color: #374151;"><strong>Stornierter Termin:</strong> ${data.appointmentTime}</p>` : ''}
                ${data.cancellationReason ? `<p style="margin: 5px 0; color: #374151;"><strong>Grund:</strong> ${data.cancellationReason}</p>` : ''}
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">Falls du Fragen hast, kontaktiere uns bitte per E-Mail oder Telefon.</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">Beste Grüsse,<br><strong>${data.tenantName || 'Driving Team'}</strong></p>
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
    }
  },
  
  rescheduled: {
    subject: 'Termin verschoben - Neue Zeit',
    getHtml: (data: AppointmentNotificationBody, primaryColor: string) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      return `
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td>
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 auto;">
          <tr>
            <td style="background-color: #16a34a; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Termin verschoben</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hallo ${firstName},</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">dein Termin wurde auf einen neuen Zeitpunkt verschoben:</p>
              
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
                ${data.oldTime ? `<p style="margin: 5px 0; color: #374151;"><strong>📅 ALT:</strong> ${data.oldTime}</p>` : ''}
                ${data.newTime ? `<p style="margin: 5px 0; color: #374151;"><strong>📌 NEU:</strong> ${data.newTime}</p>` : ''}
                ${data.staffName ? `<p style="margin: 5px 0; color: #374151;"><strong>Fahrlehrer:</strong> ${data.staffName}</p>` : ''}
                ${data.location ? `<p style="margin: 5px 0; color: #374151;"><strong>Ort:</strong> ${data.location}</p>` : ''}
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">Du findest den neuen Termin in deinem Kundenkonto. Falls du Fragen hast, kontaktiere uns bitte.</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">Freundliche Grüsse,<br><strong>${data.tenantName || 'Driving Team'}</strong></p>
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
    }
  }
}

// ========== END TEMPLATES ==========

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as AppointmentNotificationBody
    
    const { email, studentName, type, tenantId } = body
    
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
    
    // Load tenant primary color if tenantId is provided
    let primaryColor = '#2563eb' // Default blue
    if (tenantId) {
      try {
        const supabase = getSupabaseAdmin()
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('primary_color')
          .eq('id', tenantId)
          .single()
        
        if (tenant?.primary_color) {
          primaryColor = tenant.primary_color
          console.log(`✅ Loaded tenant color: ${primaryColor}`)
        } else if (tenantError) {
          console.warn(`⚠️ Could not load tenant color:`, tenantError.message)
        }
      } catch (err: any) {
        console.warn(`⚠️ Error loading tenant color:`, err.message)
        // Continue with default color
      }
    }
    
    console.log(`📧 Sending ${type} appointment notification to ${email}`)
    
    const subject = template.subject
    const html = template.getHtml(body, primaryColor)
    
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

