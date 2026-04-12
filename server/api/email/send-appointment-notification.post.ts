// server/api/email/send-appointment-notification.post.ts
// Sends appointment notifications (confirmation, cancellation, move)

import { sendEmail } from '~/server/utils/email'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

interface AppointmentNotificationBody {
  email: string
  studentName: string
  appointmentTime?: string
  type: 'pending_payment' | 'cancelled' | 'rescheduled' | 'appointment_confirmation'
  cancellationReason?: string
  newTime?: string
  oldTime?: string
  staffName?: string
  location?: string
  tenantName?: string
  tenantId?: string
  tenantSlug?: string
  amount?: string
  confirmationLink?: string
  customerDashboard?: string
  // ✅ NEW: Payment & refund details for cancellation emails
  wasPaid?: boolean
  chargePercentage?: number
  refundAmount?: string
  chargeAmount?: string
}

// ========== TEMPLATES - Dynamic with tenant colors ==========

const TEMPLATES = {
  appointment_confirmation: {
    subject: 'Terminbestätigung',
    getHtml: (data: AppointmentNotificationBody, primaryColor: string) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      // ✅ SECURITY FIX: Immer zum Login/Dashboard leiten, NIE zu /confirm/[token]
      const confirmUrl = data.customerDashboard || (data.tenantSlug 
        ? `https://www.simy.ch/${data.tenantSlug}` 
        : 'https://www.simy.ch/login')
      const dashboardUrl = data.customerDashboard || (data.tenantSlug 
        ? `https://www.simy.ch/${data.tenantSlug}` 
        : 'https://www.simy.ch/login')
      
      return `
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td>
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 auto;">
          <tr>
            <td style="background-color: ${primaryColor}; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Terminbestätigung</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hallo ${firstName},</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">ein neuer Termin wurde für dich erstellt. Bitte überprüfe die Details:</p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                ${data.appointmentTime ? `<p style="margin: 5px 0; color: #374151;"><strong>Termin:</strong> ${data.appointmentTime}</p>` : ''}
                ${data.staffName ? `<p style="margin: 5px 0; color: #374151;"><strong>Fahrlehrer:</strong> ${data.staffName}</p>` : ''}
                ${data.location ? `<p style="margin: 5px 0; color: #374151;"><strong>Ort:</strong> ${data.location}</p>` : ''}
                ${data.amount ? `<p style="margin: 5px 0; color: #374151;"><strong>Betrag:</strong> ${data.amount}</p>` : ''}
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">Bitte bestätige deinen Termin und überprüfe die Zahlungsdetails in deinem Kundenkonto.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmUrl}" style="background-color: ${primaryColor}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Termin bestätigen
                </a>
              </div>
              
              <div style="text-align: center; margin: 10px 0;">
                <a href="${dashboardUrl}" style="color: ${primaryColor}; text-decoration: none; font-size: 14px;">
                  Oder zum Kundenkonto
                </a>
              </div>
              
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
    subject: 'Terminbestätigung',
    getHtml: (data: AppointmentNotificationBody, primaryColor: string) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      const dashboardUrl = data.tenantSlug 
        ? `https://www.simy.ch/${data.tenantSlug}` 
        : 'https://www.simy.ch/login'
      
      return `
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td>
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 auto;">
          <tr>
            <td style="background-color: ${primaryColor}; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Terminbestätigung</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hallo ${firstName},</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">ein neuer Termin wurde für dich erstellt. Bitte überprüfe die Details:</p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                ${data.appointmentTime ? `<p style="margin: 5px 0; color: #374151;"><strong>Termin:</strong> ${data.appointmentTime}</p>` : ''}
                ${data.staffName ? `<p style="margin: 5px 0; color: #374151;"><strong>Fahrlehrer:</strong> ${data.staffName}</p>` : ''}
                ${data.location ? `<p style="margin: 5px 0; color: #374151;"><strong>Ort:</strong> ${data.location}</p>` : ''}
                ${data.amount ? `<p style="margin: 5px 0; color: #374151;"><strong>Betrag:</strong> ${data.amount}</p>` : ''}
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">Bitte bezahle die offene Zahlung in deinem Kundenkonto.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="background-color: ${primaryColor}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Zum Kundenkonto
                </a>
              </div>
              
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
      const dashboardUrl = data.tenantSlug 
        ? `https://www.simy.ch/${data.tenantSlug}` 
        : 'https://www.simy.ch/login'
      
      // ✅ Payment & Refund details
      const wasPaid = data.wasPaid || false
      const chargePercentage = data.chargePercentage || 0
      const refundAmount = data.refundAmount
      const chargeAmount = data.chargeAmount
      
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
              
              ${wasPaid || chargePercentage > 0 ? `
              <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #374151; font-weight: bold;">Zahlungsinformationen:</p>
                ${wasPaid ? `<p style="margin: 5px 0; color: #374151;">✅ Termin war bereits bezahlt</p>` : `<p style="margin: 5px 0; color: #374151;">ℹ️ Termin war noch nicht bezahlt</p>`}
                ${chargePercentage === 0 ? `
                  <p style="margin: 5px 0; color: #10b981; font-weight: bold;">✅ Kostenlose Stornierung (keine Verrechnung)</p>
                  ${wasPaid && refundAmount ? `<p style="margin: 5px 0; color: #10b981;">💰 Rückerstattung auf Guthaben: ${refundAmount}</p>` : ''}
                ` : `
                  <p style="margin: 5px 0; color: #dc2626; font-weight: bold;">⚠️ Stornierungsgebühr: ${chargePercentage}%</p>
                  ${chargeAmount ? `<p style="margin: 5px 0; color: #dc2626;">Zu zahlender Betrag: ${chargeAmount}</p>` : ''}
                `}
              </div>
              ` : ''}
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">Falls du Fragen hast oder einen neuen Termin buchen möchtest, besuche einfach dein Kundenkonto.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="background-color: ${primaryColor}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Zum Kundenkonto
                </a>
              </div>
              
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
      const dashboardUrl = data.tenantSlug 
        ? `https://www.simy.ch/${data.tenantSlug}` 
        : 'https://www.simy.ch/login'
      
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
              
              <!-- Alter Termin - durchgestrichen -->
              ${data.oldTime ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0 10px 0; border-radius: 4px;">
                <p style="margin: 5px 0; color: #991b1b; text-decoration: line-through;"><strong>❌ Alter Termin:</strong> ${data.oldTime}</p>
                ${data.staffName ? `<p style="margin: 5px 0; color: #991b1b; text-decoration: line-through;"><strong>Fahrlehrer:</strong> ${data.staffName}</p>` : ''}
                ${data.location ? `<p style="margin: 5px 0; color: #991b1b; text-decoration: line-through;"><strong>Ort:</strong> ${data.location}</p>` : ''}
              </div>
              ` : ''}
              
              <!-- Pfeil nach unten -->
              <div style="text-align: center; margin: 10px 0;">
                <p style="font-size: 32px; margin: 0; color: #16a34a;">⬇️</p>
              </div>
              
              <!-- Neuer Termin - hervorgehoben -->
              ${data.newTime ? `
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 10px 0 20px 0; border-radius: 4px;">
                <p style="margin: 5px 0; color: #065f46; font-size: 18px;"><strong>✅ Neuer Termin:</strong> ${data.newTime}</p>
                ${data.staffName ? `<p style="margin: 5px 0; color: #065f46;"><strong>Fahrlehrer:</strong> ${data.staffName}</p>` : ''}
                ${data.location ? `<p style="margin: 5px 0; color: #065f46;"><strong>Ort:</strong> ${data.location}</p>` : ''}
              </div>
              ` : ''}
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">Bitte merke dir den neuen Termin. Du findest ihn auch in deinem Kundenkonto. Falls du Fragen hast, kontaktiere uns bitte.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="background-color: ${primaryColor}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Zum Kundenkonto
                </a>
              </div>
              
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
    
    // Load tenant primary color and slug if tenantId is provided
    let primaryColor = '#2563eb' // Default blue
    let tenantSlug: string | null = null
    
    if (tenantId) {
      try {
        const supabase = getSupabaseAdmin()
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('primary_color, slug')
          .eq('id', tenantId)
          .single()
        
        if (tenant) {
          if (tenant.primary_color) {
            primaryColor = tenant.primary_color
            logger.debug(`✅ Loaded tenant color: ${primaryColor}`)
          }
          if (tenant.slug) {
            tenantSlug = tenant.slug
            logger.debug(`✅ Loaded tenant slug: ${tenantSlug}`)
          }
        } else if (tenantError) {
          console.warn(`⚠️ Could not load tenant data:`, tenantError.message)
        }
      } catch (err: any) {
        console.warn(`⚠️ Error loading tenant data:`, err.message)
        // Continue with default color
      }
    }
    
    logger.debug(`📧 Sending ${type} appointment notification to ${email}`)
    
    const subject = template.subject
    const html = template.getHtml(
      { ...body, tenantSlug: tenantSlug ?? body.tenantSlug ?? undefined },
      primaryColor,
    )
    
    await sendEmail({
      to: email,
      subject,
      html,
      senderName: body.tenantName || undefined
    })
    
    logger.debug(`✅ ${type} email sent successfully to ${email}`)
    
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

