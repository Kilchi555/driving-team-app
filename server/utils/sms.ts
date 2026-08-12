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
    .select('subscription_plan, booking_policy, stripe_subscription_id, stripe_sms_subscription_item_id, stripe_customer_id, twilio_from_sender, name, contact_email')
    .eq('id', tenantId)
    .single()

  const policy = (tenant?.booking_policy as Record<string, any>) || {}
  // Soft-cap by default. Hard-stop only when tenant explicitly enables it.
  // Trial / no payment method: keep sending + counting; overage billed only once Stripe exists.
  const overageWaived = policy.sms_overage_waived === true
  const canBillOverage = !overageWaived && !!(tenant?.stripe_subscription_id && tenant?.stripe_customer_id)
  const hardStop = opts.hardStop !== undefined
    ? opts.hardStop
    : policy.sms_hard_stop_on_quota === true
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

    if (overageDelta > 0 && canBillOverage) {
      try {
        // Keep metered price on the subscription (invoice line item)
        await ensureSmsOverageSubscriptionItem({
          subscriptionId: tenant.stripe_subscription_id,
          supabase,
          tenantId,
          cachedItemId: tenant.stripe_sms_subscription_item_id,
        })
        await reportSmsOverageUsage({
          customerId: tenant.stripe_customer_id,
          overageSegments: overageDelta,
          idempotencyKey: messageSid,
        })
      } catch (err: any) {
        logger.warn('⚠️ SMS overage Stripe report failed (non-critical):', err?.message)
      }
    } else if (overageDelta > 0 && overageWaived) {
      logger.info('ℹ️ SMS overage waived for tenant (sms_overage_waived)', {
        tenantId,
        overageDelta,
      })
    } else if (overageDelta > 0 && !canBillOverage) {
      logger.warn('⚠️ SMS overage not billed — tenant has no Stripe subscription/customer', {
        tenantId,
        overageDelta,
      })
    }

    // Soft alerts at 80% / 100% of included quota (once per calendar month)
    // → tenant contact + Simy super-admins. Soft-cap continues sending.
    try {
      await maybeSendSmsQuotaAlert({
        supabase,
        tenantId,
        contactEmail: tenant?.contact_email,
        tenantName: tenant?.name || 'Simy',
        usedAfter,
        included,
        overageSegments: Math.max(0, usedAfter - included),
        overageChf: Math.max(0, usedAfter - included) * SMS_OVERAGE_CHF_PER_SEGMENT,
        canBillOverage,
        plan: tenant?.subscription_plan || 'trial',
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
  overageSegments: number
  overageChf: number
  canBillOverage: boolean
  plan: string
}) {
  if (opts.included <= 0) return
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
  let tenantBody: string | null = null
  let adminBody: string | null = null

  if (ratio >= 1 && !state.warned100) {
    state.warned100 = true
    state.warned80 = true
    subject = `SMS-Kontingent aufgebraucht – ${opts.tenantName}`
    if (opts.canBillOverage) {
      tenantBody = `Euer Inklusiv-Kontingent (${opts.included} Segmente) ist aufgebraucht (${opts.usedAfter} verwendet). Weitere SMS werden mit <strong>CHF 0.15/Segment</strong> verrechnet. Aktueller Überzug ca. <strong>CHF ${opts.overageChf.toFixed(2)}</strong>.`
      adminBody = `Das SMS-Kontingent ist aufgebraucht. Metered Billing ist aktiv — Überzüge werden verrechnet.`
    } else {
      tenantBody = `Euer Inklusiv-Kontingent (${opts.included} Segmente) ist aufgebraucht (${opts.usedAfter} verwendet). SMS werden weiter zugestellt (Soft-Cap). Sobald eine Zahlungsmethode hinterlegt ist, werden Überzüge mit CHF 0.15/Segment verrechnet.`
      adminBody = `Das SMS-Kontingent ist aufgebraucht — aktuell <em>ohne</em> verrechenbare Zahlungsmethode (Soft-Cap).`
    }
  } else if (ratio >= 0.8 && !state.warned80) {
    state.warned80 = true
    subject = `SMS-Kontingent bei 80% – ${opts.tenantName}`
    tenantBody = `Ihr habt <strong>${opts.usedAfter} von ${opts.included}</strong> SMS-Segmenten in diesem Monat verbraucht.${opts.canBillOverage ? ' Überzug: CHF 0.15/Segment.' : ' Soft-Cap: SMS laufen weiter; Verrechnung erst nach Hinterlegen einer Zahlungsmethode.'}`
    adminBody = `Dieses Unternehmen hat 80&nbsp;% des monatlichen SMS-Kontingents erreicht.`
  }

  if (!subject || !tenantBody || !adminBody) return

  const { sendEmail } = await import('~/server/utils/email')
  const appBase = (process.env.NUXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://app.simy.ch').replace(/\/$/, '')
  // Always go through login with returnTo so deep links work when the session expired
  const billingUrl = `${appBase}/login?returnTo=${encodeURIComponent('/admin/billing')}`
  const pct = Math.min(100, Math.round((opts.usedAfter / opts.included) * 100))
  const isExhausted = pct >= 100

  const softCapNote = opts.canBillOverage
    ? 'Soft-Cap: SMS werden weiter gesendet, sofern Hard-Stop nicht aktiviert ist. Überzug wird metered verrechnet.'
    : 'Soft-Cap (Trial/ohne Zahlungsmethode): SMS werden weiter gesendet und gezählt. Verrechnung startet automatisch, sobald ein Stripe-Abo mit Zahlungsmethode existiert.'

  const recipients = new Set<string>()
  if (opts.contactEmail?.trim()) recipients.add(opts.contactEmail.trim().toLowerCase())

  // Super-admins + guaranteed platform inbox
  try {
    const { data: supers } = await opts.supabase
      .from('users')
      .select('email')
      .eq('role', 'super_admin')
      .not('email', 'is', null)
      .limit(20)
    for (const u of supers || []) {
      if (u.email) recipients.add(String(u.email).trim().toLowerCase())
    }
  } catch {
    // non-critical
  }
  recipients.add('info@simy.ch')

  await Promise.allSettled(
    [...recipients].map((to) => {
      const isTenant = opts.contactEmail && to === opts.contactEmail.trim().toLowerCase()
      const html = buildSmsQuotaAlertHtml({
        isTenant: !!isTenant,
        tenantName: opts.tenantName,
        tenantId: opts.tenantId,
        plan: opts.plan,
        usedAfter: opts.usedAfter,
        included: opts.included,
        pct,
        isExhausted,
        canBillOverage: opts.canBillOverage,
        overageSegments: opts.overageSegments,
        overageChf: opts.overageChf,
        bodyText: isTenant ? tenantBody! : adminBody!,
        softCapNote,
        billingUrl,
      })
      return sendEmail({ to, subject, html })
    }),
  )

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

function buildSmsQuotaAlertHtml(opts: {
  isTenant: boolean
  tenantName: string
  tenantId: string
  plan: string
  usedAfter: number
  included: number
  pct: number
  isExhausted: boolean
  canBillOverage: boolean
  overageSegments: number
  overageChf: number
  bodyText: string
  softCapNote: string
  billingUrl: string
}): string {
  const accent = opts.isExhausted ? '#dc2626' : '#d97706'
  const accentBg = opts.isExhausted ? '#fef2f2' : '#fffbeb'
  const accentBorder = opts.isExhausted ? '#fecaca' : '#fde68a'
  const barColor = opts.isExhausted ? '#ef4444' : '#f59e0b'
  const title = opts.isExhausted ? 'SMS-Kontingent aufgebraucht' : 'SMS-Kontingent bei 80 %'
  const badge = opts.isExhausted ? 'Aufgebraucht' : `${opts.pct} % verbraucht`
  const greeting = opts.isTenant
    ? `Hallo ${opts.tenantName},`
    : 'Hallo Simy-Team,'

  const ctaBlock = opts.isTenant
    ? `<div style="text-align:center;margin:28px 0 8px">
        <a href="${opts.billingUrl}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700">
          Abrechnung ansehen
        </a>
      </div>
      <p style="text-align:center;font-size:12px;color:#9ca3af;margin:0">
        oder unter Einstellungen → Abrechnung
      </p>`
    : `<div style="background:#f9fafb;border-radius:12px;padding:14px 16px;margin-top:20px;font-size:13px;color:#4b5563">
        <div><strong>Tenant:</strong> ${opts.tenantName}</div>
        <div><strong>ID:</strong> <span style="font-family:ui-monospace,monospace;font-size:12px">${opts.tenantId}</span></div>
        <div><strong>Plan:</strong> ${opts.plan}</div>
        <div><strong>Verrechenbar:</strong> ${opts.canBillOverage ? 'ja' : 'nein (Trial/ohne Zahlungsmethode)'}</div>
        ${opts.overageSegments > 0 ? `<div><strong>Überzug:</strong> ${opts.overageSegments} Segmente (ca. CHF ${opts.overageChf.toFixed(2)})</div>` : ''}
      </div>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">
    <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 32px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8">Simy · SMS</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;line-height:1.25">${title}</h1>
    </div>

    <div style="padding:28px 32px 32px">
      <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#374151">${greeting}</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#374151">${opts.bodyText}</p>

      <div style="background:${accentBg};border:1px solid ${accentBorder};border-radius:14px;padding:18px 20px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
          <span style="font-size:13px;font-weight:600;color:#92400e">${badge}</span>
          <span style="font-size:18px;font-weight:800;color:${accent}">${opts.usedAfter}<span style="font-size:13px;font-weight:600;color:#78716c"> / ${opts.included}</span></span>
        </div>
        <div style="height:10px;background:#fff;border-radius:999px;overflow:hidden;border:1px solid ${accentBorder}">
          <div style="height:100%;width:${Math.min(100, opts.pct)}%;background:${barColor};border-radius:999px"></div>
        </div>
        <p style="margin:10px 0 0;font-size:12px;color:#78716c">SMS-Segmente in diesem Abrechnungsmonat</p>
      </div>

      ${ctaBlock}

      <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #f3f4f6;font-size:12px;line-height:1.5;color:#9ca3af">
        ${opts.softCapNote}
      </p>
    </div>

    <div style="border-top:1px solid #f3f4f6;padding:18px 32px;font-size:12px;color:#9ca3af;text-align:center">
      ${opts.isTenant ? opts.tenantName : 'Simy'} · Powered by <a href="https://simy.ch" style="color:#9ca3af">Simy.ch</a>
    </div>
  </div>
</body>
</html>`
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

