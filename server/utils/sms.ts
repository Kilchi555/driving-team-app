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
    return { success: true, messageSid: `dev-mock-sid-${Date.now()}` }
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

export interface SendTenantSMSOptions {
  tenantId: string
  to: string
  message: string
  purpose: string
  senderName?: string
  /** Counts toward quota + Stripe overage (default true) */
  billable?: boolean
  /** Override hard-stop from booking_policy (rare) */
  hardStop?: boolean
}

export interface SendTenantSMSResult {
  success: true
  messageSid: string
  segmentCount: number
  billable: boolean
  skippedBilling?: boolean
}

/**
 * Tenant-scoped SMS: quota check → Twilio → sms_logs → Stripe overage (only above included).
 */
export async function sendTenantSMS(opts: SendTenantSMSOptions): Promise<SendTenantSMSResult> {
  const {
    tenantId,
    to,
    message,
    purpose,
    senderName,
    billable = true,
  } = opts

  const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
  const {
    countSmsSegments,
    getTenantSmsUsage,
    getBillingPeriodStart,
    SmsQuotaExceededError,
  } = await import('~/server/utils/sms-quota')
  const { getIncludedSmsSegments, SMS_OVERAGE_CHF_PER_SEGMENT } = await import('~/utils/planFeatures')
  const { ensureSmsOverageSubscriptionItem, reportSmsOverageUsage } = await import('~/server/utils/sms-stripe')

  const supabase = getSupabaseAdmin()
  const segmentCount = Math.max(1, countSmsSegments(message))

  const { data: tenant } = await supabase
    .from('tenants')
    .select('subscription_plan, booking_policy, stripe_subscription_id, stripe_sms_subscription_item_id, twilio_from_sender, name, contact_email')
    .eq('id', tenantId)
    .single()

  const policy = (tenant?.booking_policy as Record<string, any>) || {}
  const hardStop = opts.hardStop ?? policy.sms_hard_stop_on_quota === true
  const resolvedSender = senderName || tenant?.twilio_from_sender || tenant?.name || undefined

  let usedBefore = 0
  let included = getIncludedSmsSegments(tenant?.subscription_plan)
  if (billable) {
    usedBefore = await getTenantSmsUsage(supabase, tenantId, getBillingPeriodStart())
    if (hardStop && usedBefore + segmentCount > included) {
      throw new SmsQuotaExceededError()
    }
  }

  const smsResult = await sendSMS({ to, message, senderName: resolvedSender })
  const messageSid = smsResult.messageSid || `sms_${Date.now()}`

  const { error: logError } = await supabase.from('sms_logs').insert({
    tenant_id: tenantId,
    to_phone: normalizePhoneNumber(to) || to,
    message,
    twilio_sid: messageSid,
    status: 'sent',
    purpose,
    segment_count: segmentCount,
    billable,
    sent_at: new Date().toISOString(),
  })
  if (logError) {
    logger.warn('⚠️ sms_logs insert failed (non-critical):', logError.message)
  }

  if (billable) {
    const usedAfter = usedBefore + segmentCount
    const overageBefore = Math.max(0, usedBefore - included)
    const overageAfter = Math.max(0, usedAfter - included)
    const overageDelta = overageAfter - overageBefore

    if (overageDelta > 0 && tenant?.stripe_subscription_id) {
      try {
        const itemId = await ensureSmsOverageSubscriptionItem({
          subscriptionId: tenant.stripe_subscription_id,
          supabase,
          tenantId,
          cachedItemId: tenant.stripe_sms_subscription_item_id,
        })
        if (itemId) {
          await reportSmsOverageUsage({
            subscriptionItemId: itemId,
            overageSegments: overageDelta,
            idempotencyKey: messageSid,
          })
        }
      } catch (err: any) {
        logger.warn('⚠️ SMS overage Stripe report failed (non-critical):', err?.message)
      }
    }

    // Soft alerts at 80% / 100% of included quota (once per calendar month)
    try {
      await maybeSendSmsQuotaAlert({
        supabase,
        tenantId,
        contactEmail: tenant?.contact_email,
        tenantName: tenant?.name || 'Simy',
        usedAfter,
        included,
        overageChf: Math.max(0, usedAfter - included) * SMS_OVERAGE_CHF_PER_SEGMENT,
      })
    } catch (alertErr: any) {
      logger.warn('⚠️ SMS quota alert failed (non-critical):', alertErr?.message)
    }
  }

  return {
    success: true,
    messageSid,
    segmentCount,
    billable,
  }
}

async function maybeSendSmsQuotaAlert(opts: {
  supabase: any
  tenantId: string
  contactEmail?: string | null
  tenantName: string
  usedAfter: number
  included: number
  overageChf: number
}) {
  if (!opts.contactEmail || opts.included <= 0) return
  const ratio = opts.usedAfter / opts.included
  if (ratio < 0.8) return

  const periodKey = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`
  const { data: existing } = await opts.supabase
    .from('tenant_settings')
    .select('id, setting_value')
    .eq('tenant_id', opts.tenantId)
    .eq('setting_key', 'sms_quota_alerts')
    .maybeSingle()

  let state: any = {}
  try {
    state = typeof existing?.setting_value === 'string'
      ? JSON.parse(existing.setting_value)
      : (existing?.setting_value || {})
  } catch {
    state = {}
  }
  if (state.period !== periodKey) {
    state.period = periodKey
    state.warned80 = false
    state.warned100 = false
  }

  let subject: string | null = null
  let body: string | null = null
  if (ratio >= 1 && !state.warned100) {
    state.warned100 = true
    state.warned80 = true
    subject = `SMS-Kontingent aufgebraucht – ${opts.tenantName}`
    body = `Euer Inklusiv-Kontingent (${opts.included} Segmente) ist aufgebraucht (${opts.usedAfter} verwendet). Weitere SMS werden mit CHF 0.15/Segment verrechnet. Aktueller Überzug ca. CHF ${opts.overageChf.toFixed(2)}.`
  } else if (ratio >= 0.8 && !state.warned80) {
    state.warned80 = true
    subject = `SMS-Kontingent bei 80% – ${opts.tenantName}`
    body = `Ihr habt ${opts.usedAfter} von ${opts.included} SMS-Segmenten in diesem Monat verbraucht. Überzug: CHF 0.15/Segment.`
  }

  if (!subject || !body) return

  const { sendEmail } = await import('~/server/utils/email')
  await sendEmail({
    to: opts.contactEmail,
    subject,
    html: `<p>${body}</p><p style="color:#6b7280;font-size:13px">Soft-Cap: SMS werden weiter gesendet, sofern Hard-Stop nicht aktiviert ist.</p>`,
  })

  const value = JSON.stringify(state)
  if (existing?.id) {
    await opts.supabase
      .from('tenant_settings')
      .update({ setting_value: value })
      .eq('id', existing.id)
  } else {
    await opts.supabase.from('tenant_settings').insert({
      tenant_id: opts.tenantId,
      category: 'sms',
      setting_key: 'sms_quota_alerts',
      setting_value: value,
      setting_type: 'json',
    })
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

