// ============================================
// SMS Utility mit Twilio
// ============================================
import twilio from 'twilio'
import { logger } from '~/utils/logger'

let twilioClient: ReturnType<typeof twilio> | null = null

export function getTwilioClient() {
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
  senderName?: string  // Optional: Alphanumeric sender ID (Tenant name)
}

/**
 * Normalizes a phone number to E.164 format (+41xxxxxxxxx).
 * Handles Swiss local format (07x...), 0041..., and already-normalized +41... numbers.
 * Returns null if the number cannot be normalized.
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null
  // Strip all whitespace, dashes, parentheses
  const stripped = phone.replace(/[\s\-().]/g, '')
  // Already in E.164
  if (/^\+\d{7,15}$/.test(stripped)) return stripped
  // Swiss 0041... → +41...
  if (stripped.startsWith('0041')) return '+' + stripped.slice(2)
  // Swiss local 07x... (10 digits) → +417x...
  if (/^0[0-9]{9}$/.test(stripped)) return '+41' + stripped.slice(1)
  // Bare number without leading 0 but 9 digits (e.g. 797157027) → +41...
  if (/^[1-9]\d{8}$/.test(stripped)) return '+41' + stripped
  return null
}

export async function sendSMS({ to, message, senderName }: SendSMSOptions) {
  // Normalize phone number to E.164 format required by Twilio
  const normalizedTo = normalizePhoneNumber(to)
  if (!normalizedTo) {
    throw new Error(`Invalid phone number: ${to}`)
  }

  // In development: log instead of sending real SMS
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[DEV] SMS would be sent to ${normalizedTo}: ${message}`)
    return { success: true, messageSid: 'dev-mock-sid' }
  }

  try {
    const fromNumber = process.env.TWILIO_PHONE_NUMBER
    
    if (!fromNumber) {
      throw new Error('Twilio phone number not configured')
    }

    const client = getTwilioClient()
    
    // Use senderName as alphanumeric sender ID if provided, otherwise use phone number
    // Alphanumeric sender IDs: max 11 chars, at least 1 letter, letters/numbers/spaces allowed
    // No special characters or punctuation allowed
    let from: string
    if (senderName) {
      // Convert to alphanumeric sender ID
      // 1. Replace umlauts/special chars with ASCII equivalents
      // 2. Remove any remaining non-alphanumeric/space characters
      // 3. Trim and limit to 11 characters
      const cleanSenderName = senderName
        .replace(/ä/gi, 'a')
        .replace(/ö/gi, 'o')
        .replace(/ü/gi, 'u')
        .replace(/ß/g, 'ss')
        .replace(/[^a-zA-Z0-9 ]/g, '')  // Remove special characters (keep spaces)
        .trim()
        .substring(0, 11)  // Max 11 characters
        .trim()  // Trim again after substring
      
      // Check if at least one letter exists (Twilio requirement)
      const hasLetter = /[a-zA-Z]/.test(cleanSenderName)
      
      if (cleanSenderName && hasLetter) {
        from = cleanSenderName
        logger.debug(`SMS using Alphanumeric Sender ID: "${from}" (original: "${senderName}")`)
      } else {
        from = fromNumber
        logger.debug(`SMS fallback to phone number (cleaned name "${cleanSenderName}" invalid)`)
      }
    } else {
      from = fromNumber
      logger.debug(`SMS using phone number: "${from}"`)
    }
    
    const result = await client.messages.create({
      body: message,
      from: from,
      to: normalizedTo
    })

    logger.debug('✅ SMS sent successfully:', result.sid)
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
${data.tenantName}: Dein Termin am ${data.appointmentDate} wurde storniert (keine Bestätigung).${contactInfo}
  `.trim()
}

