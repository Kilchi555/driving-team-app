// ============================================
// SMS Utility mit Twilio
// ============================================
import twilio from 'twilio'

let twilioClient: ReturnType<typeof twilio> | null = null

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured')
    }
    twilioClient = twilio(accountSid, authToken)
  }
  return twilioClient
}

interface SendSMSOptions {
  to: string
  message: string
}

export async function sendSMS({ to, message }: SendSMSOptions) {
  try {
    const fromNumber = process.env.TWILIO_PHONE_NUMBER
    
    if (!fromNumber) {
      throw new Error('Twilio phone number not configured')
    }

    const client = getTwilioClient()
    
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to
    })

    console.log('✅ SMS sent successfully:', result.sid)
    return { success: true, messageSid: result.sid }
  } catch (error) {
    console.error('❌ Error sending SMS:', error)
    throw error
  }
}

// ============================================
// SMS Templates
// ============================================

interface PaymentReminderSMSData {
  customerName: string
  appointmentDate: string
  appointmentTime: string
  amount: string
  dashboardLink: string
  tenantName: string
}

export function generatePaymentReminderSMS(data: PaymentReminderSMSData): string {
  return `
${data.tenantName}: Letzte Erinnerung!

Hallo ${data.customerName}, bitte bestätigen Sie Ihren Termin am ${data.appointmentDate} um ${data.appointmentTime} (CHF ${data.amount}).

Jetzt bestätigen: ${data.dashboardLink}

Unbestätigte Termine werden automatisch storniert.
  `.trim()
}

interface AppointmentDeletedSMSData {
  customerName: string
  appointmentDate: string
  tenantName: string
  tenantPhone?: string
}

export function generateAppointmentDeletedSMS(data: AppointmentDeletedSMSData): string {
  const contactInfo = data.tenantPhone ? ` Kontakt: ${data.tenantPhone}` : ''
  
  return `
${data.tenantName}: Ihr Termin am ${data.appointmentDate} wurde storniert (keine Bestätigung).${contactInfo}
  `.trim()
}

