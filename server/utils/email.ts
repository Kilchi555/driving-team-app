// ============================================
// E-Mail Utility mit Resend
// ============================================
import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

interface Attachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
  attachments?: Attachment[]
}

export async function sendEmail({ to, subject, html, from, attachments }: SendEmailOptions) {
  try {
    const resend = getResendClient()
    
    const emailParams: any = {
      from: from || process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch',
      to,
      subject,
      html
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      emailParams.attachments = attachments.map(att => ({
        filename: att.filename,
        content: typeof att.content === 'string' ? Buffer.from(att.content, 'utf-8') : att.content,
        contentType: att.contentType || 'application/octet-stream'
      }))
    }
    
    const { data, error } = await resend.emails.send(emailParams)

    if (error) {
      console.error('❌ Resend error:', error)
      throw error
    }

    console.log('✅ Email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('❌ Error sending email:', error)
    throw error
  }
}

// ============================================
// E-Mail Templates
// ============================================

interface PaymentReminderEmailData {
  customerName: string
  appointmentDate: string
  appointmentTime: string
  staffName: string
  amount: string
  dashboardLink: string
  tenantName: string
  reminderNumber: number
  primaryColor?: string
}

export function generatePaymentReminderEmail(data: PaymentReminderEmailData): string {
  const urgencyText = data.reminderNumber === 1 
    ? 'Bitte bestätige deinen Termin'
    : data.reminderNumber === 2
    ? 'Erinnerung: Bitte bestätige deinen Termin'
    : 'Letzte Erinnerung: Bitte bestätige deinen Termin'

  const primaryColor = data.primaryColor || '#2563eb'

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terminbestätigung erforderlich</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: ${primaryColor}; margin-top: 0;">${urgencyText}</h1>
    
    <p>Hallo ${data.customerName},</p>
    
    <p>Sie haben einen Termin bei <strong>${data.tenantName}</strong> gebucht, der noch nicht bestätigt wurde.</p>
    
    <div style="background-color: white; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <h3 style="margin-top: 0; color: ${primaryColor};">Termin-Details</h3>
      <p style="margin: 5px 0;"><strong>Datum:</strong> ${data.appointmentDate}</p>
      <p style="margin: 5px 0;"><strong>Zeit:</strong> ${data.appointmentTime}</p>
      <p style="margin: 5px 0;"><strong>Fahrlehrer:</strong> ${data.staffName}</p>
      <p style="margin: 5px 0;"><strong>Betrag:</strong> CHF ${data.amount}</p>
    </div>
    
    ${data.reminderNumber >= 3 ? `
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <p style="color: #dc2626; margin: 0;"><strong>⚠️ Wichtig:</strong> Bitte bestätigen Sie Ihren Termin so bald wie möglich. Unbestätigte Termine können automatisch storniert werden.</p>
    </div>
    ` : ''}
    
    <p>Bitte bestätigen Sie Ihren Termin, indem Sie auf den folgenden Button klicken:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardLink}" 
         style="background-color: ${primaryColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Termin jetzt bestätigen
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Oder kopieren Sie diesen Link in Ihren Browser:<br>
      <a href="${data.dashboardLink}" style="color: ${primaryColor}; word-break: break-all;">${data.dashboardLink}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999;">
      Diese E-Mail wurde automatisch generiert. Bei Fragen wenden Sie sich bitte direkt an ${data.tenantName}.
    </p>
  </div>
</body>
</html>
  `.trim()
}

interface AppointmentDeletedEmailData {
  customerName: string
  appointmentDate: string
  appointmentTime: string
  staffName: string
  reason: string
  tenantName: string
  tenantEmail?: string
  tenantPhone?: string
}

export function generateAppointmentDeletedEmail(data: AppointmentDeletedEmailData): string {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Termin storniert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #dc2626; margin-top: 0;">Termin wurde storniert</h1>
    
    <p>Hallo ${data.customerName},</p>
    
    <p>Leider mussten wir Ihren Termin bei <strong>${data.tenantName}</strong> stornieren.</p>
    
    <div style="background-color: white; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <h3 style="margin-top: 0; color: #dc2626;">Stornierter Termin</h3>
      <p style="margin: 5px 0;"><strong>Datum:</strong> ${data.appointmentDate}</p>
      <p style="margin: 5px 0;"><strong>Zeit:</strong> ${data.appointmentTime}</p>
      <p style="margin: 5px 0;"><strong>Fahrlehrer:</strong> ${data.staffName}</p>
      <p style="margin: 5px 0;"><strong>Grund:</strong> ${data.reason}</p>
    </div>
    
    <p>Wenn Sie einen neuen Termin vereinbaren möchten, kontaktieren Sie uns bitte:</p>
    
    ${data.tenantEmail ? `<p><strong>E-Mail:</strong> <a href="mailto:${data.tenantEmail}" style="color: #2563eb;">${data.tenantEmail}</a></p>` : ''}
    ${data.tenantPhone ? `<p><strong>Telefon:</strong> <a href="tel:${data.tenantPhone}" style="color: #2563eb;">${data.tenantPhone}</a></p>` : ''}
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999;">
      Diese E-Mail wurde automatisch generiert. Bei Fragen wenden Sie sich bitte direkt an ${data.tenantName}.
    </p>
  </div>
</body>
</html>
  `.trim()
}

interface StaffNotificationEmailData {
  staffName: string
  customerName: string
  appointmentDate: string
  appointmentTime: string
  reason: string
  tenantName: string
}

export function generateStaffNotificationEmail(data: StaffNotificationEmailData): string {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Termin automatisch storniert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #dc2626; margin-top: 0;">Termin automatisch storniert</h1>
    
    <p>Hallo ${data.staffName},</p>
    
    <p>Ein Termin mit <strong>${data.customerName}</strong> wurde automatisch storniert, da keine Bestätigung erfolgte.</p>
    
    <div style="background-color: white; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <h3 style="margin-top: 0; color: #dc2626;">Stornierter Termin</h3>
      <p style="margin: 5px 0;"><strong>Kunde:</strong> ${data.customerName}</p>
      <p style="margin: 5px 0;"><strong>Datum:</strong> ${data.appointmentDate}</p>
      <p style="margin: 5px 0;"><strong>Zeit:</strong> ${data.appointmentTime}</p>
      <p style="margin: 5px 0;"><strong>Grund:</strong> ${data.reason}</p>
    </div>
    
    <p>Dieser Zeitslot ist nun wieder verfügbar für andere Buchungen.</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999;">
      Diese E-Mail wurde automatisch vom ${data.tenantName} System generiert.
    </p>
  </div>
</body>
</html>
  `.trim()
}

