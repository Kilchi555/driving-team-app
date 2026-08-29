/**
 * Shared appointment notification email sender (no HTTP hop).
 */
import { sendEmail, sendTenantEmail } from '~/server/utils/email'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { sendPushToUser } from '~/server/utils/push'
import { getTerminologyDefaults, type Terminology } from '~/composables/useTerminology'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import {
  buildSimyPlatformEmail,
  displayName,
  emailAppointmentAppStoreBlock,
  simyCtaButton,
} from '~/server/utils/branded-email'
import { allowsCustomerAccountActivation } from '~/server/utils/customer-account-activation'
import { meetingLinkAnchor } from '~/server/utils/meeting-link'
import {
  appointmentEmailCtaHtml,
  resolveAppointmentEmailCta,
} from '~/server/utils/appointment-notification-cta'

export interface AppointmentNotificationBody {
  email: string
  studentName: string
  appointmentTime?: string
  type: 'pending_payment' | 'cancelled' | 'rescheduled' | 'appointment_confirmation' | 'staff_new_booking'
  cancellationReason?: string
  newTime?: string
  oldTime?: string
  staffName?: string
  location?: string
  locationAddress?: string
  tenantName?: string
  tenantId?: string
  tenantSlug?: string
  amount?: string
  confirmationLink?: string
  customerDashboard?: string
  wasPaid?: boolean
  chargePercentage?: number
  refundAmount?: string
  chargeAmount?: string
  eventTypeName?: string
  durationMinutes?: number
  showPrice?: boolean
  userId?: string
  staffPhone?: string
  isLessonType?: boolean
  meeting_type?: 'in_person' | 'phone' | 'online'
  meeting_link?: string
  /** When set, missing vehicle/room labels are loaded from the appointment */
  appointmentId?: string | null
  /** Shown only when the booking used a vehicle option */
  vehicleLabel?: string | null
  /** Shown only when a room was auto-assigned */
  roomName?: string | null
  terms?: Terminology
  /** Which fields triggered a reschedule mail (datetime, duration, staff, …) */
  changedFields?: string[]
  /** Hide login / "Zum Kundenkonto" buttons when the tenant disabled customer accounts */
  omitAccountCta?: boolean
  /** Hide App Store download when the tenant does not want customer accounts / onboarding */
  includeAppStore?: boolean
}

// ========== TEMPLATES - Dynamic with tenant colors ==========

/** Renders the appointment detail box used in all student-facing templates. */
function buildDetailBox(data: AppointmentNotificationBody, primaryColor: string, terms: Terminology): string {
  const showPrice = data.showPrice !== false  // default true for backward compat
  const durationStr = data.durationMinutes ? ` (${data.durationMinutes} Min.)` : ''
  const isPhoneOrOnline = data.meeting_type === 'phone' || data.meeting_type === 'online'

  const meetingTypeLabel = data.meeting_type === 'phone'
    ? '📞 Telefonat'
    : data.meeting_type === 'online'
      ? '💻 Online'
      : data.meeting_type === 'in_person'
        ? '📍 Vor Ort'
        : null

  const rows = [
    data.appointmentTime
      ? `<p style="margin:5px 0;color:#374151"><strong>Termin:</strong> ${data.appointmentTime}${durationStr}</p>`
      : '',
    data.eventTypeName
      ? `<p style="margin:5px 0;color:#374151"><strong>Art:</strong> ${data.eventTypeName}</p>`
      : '',
    meetingTypeLabel
      ? `<p style="margin:5px 0;color:#374151"><strong>Durchführung:</strong> ${meetingTypeLabel}</p>`
      : '',
    data.meeting_type === 'online' && data.meeting_link
      ? `<p style="margin:5px 0;color:#374151"><strong>Meeting-Link:</strong> ${meetingLinkAnchor(data.meeting_link, primaryColor)}</p>`
      : '',
    data.staffName
      ? `<p style="margin:5px 0;color:#374151"><strong>${terms.staff}:</strong> ${data.staffName}${data.staffPhone ? ` · <a href="tel:${data.staffPhone}" style="color:#374151;text-decoration:none">${data.staffPhone}</a>` : ''}</p>`
      : '',
    (!isPhoneOrOnline && data.location)
      ? `<p style="margin:5px 0;color:#374151"><strong>Ort:</strong> ${data.location}${data.locationAddress ? `<br><span style="font-size:13px;color:#6b7280">${data.locationAddress}</span>` : ''}</p>`
      : '',
    data.vehicleLabel
      ? `<p style="margin:5px 0;color:#374151"><strong>Fahrzeug:</strong> ${data.vehicleLabel}</p>`
      : '',
    data.roomName
      ? `<p style="margin:5px 0;color:#374151"><strong>Raum:</strong> ${data.roomName}</p>`
      : '',
    (showPrice && data.amount)
      ? `<p style="margin:5px 0;color:#374151"><strong>Betrag:</strong> ${data.amount}</p>`
      : '',
  ].filter(Boolean).join('\n')

  return `<div style="background-color:#f8f9fa;border-left:4px solid ${primaryColor};padding:15px;margin:20px 0;border-radius:4px">
    ${rows}
  </div>`
}

function logoRow(logoUrl: string | null, tenantName: string): string {
  if (!logoUrl) return ''
  return `<tr><td style="background:#fff;text-align:center;padding:20px 30px 16px"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></td></tr>`
}

const TEMPLATES = {
  appointment_confirmation: {
    subject: 'Terminbestätigung',
    getHtml: (data: AppointmentNotificationBody, primaryColor: string, logoUrl: string | null = null, terms: Terminology = getTerminologyDefaults('driving_school')) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      const cta = resolveAppointmentEmailCta({
        type: 'appointment_confirmation',
        omitAccountCta: data.omitAccountCta,
        tenantSlug: data.tenantSlug,
        customerDashboard: data.customerDashboard || data.confirmationLink,
        showPrice: data.showPrice,
        isLessonType: data.isLessonType,
        appointmentNoun: terms.appointment,
      })

      return `
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td>
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 auto;">
          ${logoRow(logoUrl, data.tenantName || 'Simy')}
          <tr>
            <td style="background-color: ${primaryColor}; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Terminbestätigung</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hallo ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">ein neuer Termin wurde für dich erstellt. Bitte überprüfe die Details:</p>

              ${buildDetailBox(data, primaryColor, terms)}

              ${appointmentEmailCtaHtml(cta, primaryColor)}

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">Freundliche Grüsse,<br><strong>${displayName(data.tenantName || terms.businessNoun)}</strong></p>
              ${emailAppointmentAppStoreBlock(data.includeAppStore !== false)}
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
</body>`
    }
  },
  
  pending_payment: {
    subject: 'Terminbestätigung',
    getHtml: (data: AppointmentNotificationBody, primaryColor: string, logoUrl: string | null = null, terms: Terminology = getTerminologyDefaults('driving_school')) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      const cta = resolveAppointmentEmailCta({
        type: 'pending_payment',
        omitAccountCta: data.omitAccountCta,
        tenantSlug: data.tenantSlug,
        customerDashboard: data.customerDashboard,
        appointmentNoun: terms.appointment,
      })

      return `
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td>
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 auto;">
          ${logoRow(logoUrl, data.tenantName || 'Simy')}
          <tr>
            <td style="background-color: ${primaryColor}; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Terminbestätigung</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hallo ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">ein neuer Termin wurde für dich erstellt. Bitte überprüfe die Details:</p>

              ${buildDetailBox(data, primaryColor, terms)}

              ${appointmentEmailCtaHtml(cta, primaryColor)}
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">Freundliche Grüsse,<br><strong>${displayName(data.tenantName || terms.businessNoun)}</strong></p>
              ${emailAppointmentAppStoreBlock(data.includeAppStore !== false)}
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
</body>`
    }
  },
  
  cancelled: {
    subject: 'Termin storniert',
    getHtml: (data: AppointmentNotificationBody, _primaryColor: string, _logoUrl: string | null = null, terms: Terminology = getTerminologyDefaults('driving_school')) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      const tenantName = data.tenantName || terms.businessNoun
      const cta = resolveAppointmentEmailCta({
        type: 'cancelled',
        omitAccountCta: data.omitAccountCta,
        tenantSlug: data.tenantSlug,
        customerDashboard: data.customerDashboard,
        appointmentNoun: terms.appointment,
      })
      const ctaHtml = cta
        ? `${cta.leadIn ? `<p style="margin:24px 0 0;font-size:15px;line-height:1.55;color:#374151">${cta.leadIn}</p>` : ''}${simyCtaButton(cta.href, cta.label)}`
        : ''

      const wasPaid = data.wasPaid || false
      const chargePercentage = data.chargePercentage || 0
      const refundAmount = data.refundAmount
      const chargeAmount = data.chargeAmount

      const paymentCard = wasPaid || chargePercentage > 0
        ? `<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:14px;padding:16px 18px;margin:12px 0 0">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6000BD">Zahlung</p>
        ${wasPaid ? `<p style="margin:0 0 4px;font-size:14px;color:#374151">Termin war bereits bezahlt</p>` : `<p style="margin:0 0 4px;font-size:14px;color:#374151">Termin war noch nicht bezahlt</p>`}
        ${chargePercentage === 0
          ? `<p style="margin:0;font-size:14px;font-weight:700;color:#047857">Kostenlose Stornierung${wasPaid && refundAmount ? ` · Guthaben ${refundAmount}` : ''}</p>`
          : `<p style="margin:0;font-size:14px;font-weight:700;color:#b91c1c">Stornierungsgebühr ${chargePercentage}%${chargeAmount ? ` · ${chargeAmount}` : ''}</p>`}
      </div>`
        : ''

      return buildSimyPlatformEmail({
        eyebrow: 'Simy · Termin',
        title: 'Termin storniert',
        subtitle: displayName(tenantName),
        documentTitle: 'Termin storniert',
        bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151">Hallo ${firstName},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#374151">leider wurde dein Termin storniert.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:16px 18px">
        ${data.appointmentTime ? `<p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#991b1b">${data.appointmentTime}</p>` : ''}
        ${data.cancellationReason ? `<p style="margin:0;font-size:13px;color:#7f1d1d">Grund: ${data.cancellationReason}</p>` : ''}
      </div>
      ${paymentCard}
      ${ctaHtml}
      <p style="margin:28px 0 0;font-size:15px;line-height:1.55;color:#374151">Beste Grüsse,<br><strong>${displayName(tenantName)}</strong></p>
      ${emailAppointmentAppStoreBlock(data.includeAppStore !== false)}`,
        footerHtml: `${displayName(tenantName)} · <a href="https://simy.ch" style="color:#9ca3af;text-decoration:none">Simy.ch</a>`,
      })
    }
  },
  
  rescheduled: {
    subject: 'Termin geändert',
    getHtml: (data: AppointmentNotificationBody, _primaryColor: string, _logoUrl: string | null = null, terms: Terminology = getTerminologyDefaults('driving_school')) => {
      const firstName = data.studentName?.split(' ')[0] || data.studentName
      const tenantName = data.tenantName || terms.businessNoun
      const changed = Array.isArray(data.changedFields) ? data.changedFields : []
      const isDatetimeChange = changed.length === 0 || changed.includes('datetime')
      const heading = isDatetimeChange ? 'Termin verschoben' : 'Termin geändert'
      const intro = isDatetimeChange
        ? 'dein Termin wurde auf einen neuen Zeitpunkt verschoben.'
        : 'dein Termin wurde angepasst. Bitte prüfe die neuen Angaben.'
      const cta = resolveAppointmentEmailCta({
        type: 'rescheduled',
        omitAccountCta: data.omitAccountCta,
        tenantSlug: data.tenantSlug,
        customerDashboard: data.customerDashboard,
        appointmentNoun: terms.appointment,
      })
      const ctaHtml = cta
        ? `${cta.leadIn ? `<p style="margin:24px 0 0;font-size:15px;line-height:1.55;color:#374151">${cta.leadIn}</p>` : ''}${simyCtaButton(cta.href, cta.label)}`
        : ''

      const oldCard = data.oldTime
        ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:16px 18px;margin:0 0 10px">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#b91c1c">Bisher</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#991b1b;text-decoration:line-through">${data.oldTime}</p>
        ${data.staffName ? `<p style="margin:8px 0 0;font-size:13px;color:#991b1b;text-decoration:line-through">${terms.staff}: ${data.staffName}</p>` : ''}
        ${data.location ? `<p style="margin:4px 0 0;font-size:13px;color:#991b1b;text-decoration:line-through">Ort: ${data.location}${data.locationAddress ? `<br><span style="font-size:12px">${data.locationAddress}</span>` : ''}</p>` : ''}
      </div>`
        : ''

      const newCard = data.newTime
        ? `<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:14px;padding:16px 18px;margin:0 0 8px">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6000BD">Neu</p>
        <p style="margin:0;font-size:18px;font-weight:800;color:#4c1d95">${data.newTime}</p>
        ${data.staffName ? `<p style="margin:8px 0 0;font-size:13px;color:#5b21b6">${terms.staff}: ${data.staffName}</p>` : ''}
        ${data.location ? `<p style="margin:4px 0 0;font-size:13px;color:#5b21b6">Ort: ${data.location}${data.locationAddress ? `<br><span style="font-size:12px;color:#6d28d9">${data.locationAddress}</span>` : ''}</p>` : ''}
        ${data.vehicleLabel ? `<p style="margin:4px 0 0;font-size:13px;color:#5b21b6">Fahrzeug: ${data.vehicleLabel}</p>` : ''}
        ${data.roomName ? `<p style="margin:4px 0 0;font-size:13px;color:#5b21b6">Raum: ${data.roomName}</p>` : ''}
      </div>`
        : ''

      return buildSimyPlatformEmail({
        eyebrow: 'Simy · Termin',
        title: heading,
        subtitle: displayName(tenantName),
        documentTitle: heading,
        bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151">Hallo ${firstName},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#374151">${intro}</p>
      ${oldCard}
      ${newCard}
      ${ctaHtml}
      <p style="margin:28px 0 0;font-size:15px;line-height:1.55;color:#374151">Freundliche Grüsse,<br><strong>${displayName(tenantName)}</strong></p>
      ${emailAppointmentAppStoreBlock(data.includeAppStore !== false)}`,
        footerHtml: `${displayName(tenantName)} · <a href="https://simy.ch" style="color:#9ca3af;text-decoration:none">Simy.ch</a>`,
      })
    }
  }
  ,

  staff_new_booking: {
    subject: 'Neue Online-Buchung',
    getHtml: (data: AppointmentNotificationBody, primaryColor: string, logoUrl: string | null = null, terms: Terminology = getTerminologyDefaults('driving_school')) => {
      const durationStr = data.durationMinutes ? ` (${data.durationMinutes} Min.)` : ''
      return `
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td>
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin:0 auto;">
        ${logoRow(logoUrl, data.tenantName || 'Simy')}
        <tr>
          <td style="background-color:${primaryColor};padding:30px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:bold;">📅 Neue Online-Buchung</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:30px;">
            <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo ${data.staffName?.split(' ')[0] || terms.staff},</p>
            <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
              <strong>${data.studentName}</strong> hat soeben online einen Termin bei dir gebucht.
            </p>
            <div style="background-color:#f8f9fa;border-left:4px solid ${primaryColor};padding:15px;margin:20px 0;border-radius:4px;">
              ${data.appointmentTime ? `<p style="margin:5px 0;color:#374151;"><strong>Termin:</strong> ${data.appointmentTime}${durationStr}</p>` : ''}
              ${data.eventTypeName ? `<p style="margin:5px 0;color:#374151;"><strong>Art:</strong> ${data.eventTypeName}</p>` : ''}
              <p style="margin:5px 0;color:#374151;"><strong>${terms.client}:</strong> ${data.studentName}</p>
              ${data.location ? `<p style="margin:5px 0;color:#374151;"><strong>Ort:</strong> ${data.location}${data.locationAddress ? `<br><span style="font-size:13px;color:#6b7280">${data.locationAddress}</span>` : ''}</p>` : ''}
              ${data.vehicleLabel ? `<p style="margin:5px 0;color:#374151;"><strong>Fahrzeug:</strong> ${data.vehicleLabel}</p>` : ''}
              ${data.roomName ? `<p style="margin:5px 0;color:#374151;"><strong>Raum:</strong> ${data.roomName}</p>` : ''}
              ${data.amount ? `<p style="margin:5px 0;color:#374151;"><strong>Betrag:</strong> ${data.amount}</p>` : ''}
            </div>
            <p style="color:#6b7280;font-size:14px;margin:20px 0 0 0;">Der Termin ist in deinem Kalender sichtbar.</p>
            ${emailAppointmentAppStoreBlock()}
          </td>
        </tr>
        <tr>
          <td style="background-color:#f9fafb;padding:20px 30px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">${displayName(data.tenantName || 'Simy')} – automatische Benachrichtigung</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>`
    }
  }
}

// ========== END TEMPLATES

export type AppointmentNotificationResult = {
  success: true
  type: string
  email: string
  subject: string
  html: string
  messageId?: string
}

async function enrichResourceLabels(
  body: AppointmentNotificationBody
): Promise<AppointmentNotificationBody> {
  if (!body.tenantId || !body.appointmentId) return body
  if (body.vehicleLabel !== undefined || body.roomName !== undefined) return body
  try {
    const supabase = getSupabaseAdmin()
    const { data: appointment } = await supabase
      .from('appointments')
      .select('type, location_id, vehicle_mode, room_id')
      .eq('id', body.appointmentId)
      .eq('tenant_id', body.tenantId)
      .maybeSingle()
    if (!appointment) return body
    const { loadAppointmentResourceLabels } = await import('~/server/utils/appointment-resource-labels')
    const labels = await loadAppointmentResourceLabels(supabase, {
      tenantId: body.tenantId,
      categoryCode: appointment.type,
      locationId: appointment.location_id,
      vehicleMode: appointment.vehicle_mode,
      roomId: appointment.room_id,
    })
    return { ...body, vehicleLabel: labels.vehicleLabel, roomName: labels.roomName }
  } catch (err: any) {
    logger.warn('⚠️ Could not load appointment resource labels for email:', err?.message)
    return body
  }
}

export async function sendAppointmentNotificationEmail(
  input: AppointmentNotificationBody
): Promise<AppointmentNotificationResult> {
  let body = await enrichResourceLabels({ ...input })
  const { email, studentName, type, tenantId } = body

  if (!email || !studentName || !type) {
    throw new Error('Missing required fields: email, studentName, type')
  }

  const template = TEMPLATES[type as keyof typeof TEMPLATES]
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`)
  }

  let primaryColor = '#2563eb'
  let tenantSlug: string | null = null
  let logoUrl: string | null = null
  let terms: Terminology = body.terms || getTerminologyDefaults('driving_school')

  if (tenantId) {
    try {
      const supabase = getSupabaseAdmin()
      const { data: tenant } = await supabase
        .from('tenants')
        .select('primary_color, slug, logo_wide_url, logo_url, logo_square_url, name, business_type, booking_policy')
        .eq('id', tenantId)
        .single()

      if (tenant) {
        if (tenant.primary_color) primaryColor = tenant.primary_color
        if (tenant.slug) tenantSlug = tenant.slug
        logoUrl = tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
        if (tenant.name) {
          body = { ...body, tenantName: tenant.name }
        }
        if (body.includeAppStore === undefined) {
          body = { ...body, includeAppStore: allowsCustomerAccountActivation(tenant.booking_policy) }
        }
        if (!body.terms) {
          terms = await getTenantTerminology(supabase, tenantId)
        }
      }
    } catch (err: any) {
      logger.warn('⚠️ Error loading tenant data for appointment email:', err?.message)
    }
  }

  const isDatetimeReschedule =
    type !== 'rescheduled' ||
    !Array.isArray(body.changedFields) ||
    body.changedFields.length === 0 ||
    body.changedFields.includes('datetime')
  const subject =
    type === 'rescheduled'
      ? isDatetimeReschedule
        ? 'Termin verschoben - Neue Zeit'
        : 'Termin geändert'
      : template.subject
  const html = template.getHtml(
    { ...body, tenantSlug: tenantSlug ?? body.tenantSlug ?? undefined },
    primaryColor,
    logoUrl,
    terms,
  )

  const { messageId } = tenantId
    ? await sendTenantEmail(tenantId, { to: email, subject, html })
    : await sendEmail({
        to: email,
        subject,
        html,
        senderName: body.tenantName || undefined,
      })

  logger.debug(`✅ ${type} email sent successfully to ${email}`)

  if (body.userId) {
    const pushMessages: Record<string, { title: string; body: string }> = {
      appointment_confirmation: {
        title: '✅ Buchung bestätigt',
        body: body.appointmentTime
          ? `Deine ${terms.appointment} am ${body.appointmentTime} wurde bestätigt.`
          : `Deine ${terms.appointment} wurde bestätigt.`,
      },
      cancelled: {
        title: '❌ Termin storniert',
        body: body.appointmentTime
          ? `Dein Termin am ${body.appointmentTime} wurde storniert.`
          : 'Ein Termin wurde storniert.',
      },
      rescheduled: {
        title: isDatetimeReschedule ? '🔄 Termin verschoben' : '🔄 Termin geändert',
        body: body.newTime
          ? isDatetimeReschedule
            ? `Neuer Termin: ${body.newTime}`
            : `Aktueller Termin: ${body.newTime}`
          : isDatetimeReschedule
            ? 'Dein Termin wurde auf einen neuen Zeitpunkt verschoben.'
            : 'Dein Termin wurde angepasst.',
      },
      pending_payment: {
        title: '💳 Zahlung ausstehend',
        body: body.appointmentTime
          ? `Für deine ${terms.appointment} am ${body.appointmentTime} ist eine Zahlung fällig.`
          : 'Eine Zahlung für deinen Termin ist ausstehend.',
      },
    }
    const pushMsg = pushMessages[type]
    if (pushMsg) {
      sendPushToUser(body.userId, {
        ...pushMsg,
        data: { path: '/customer-dashboard' },
      }).catch((err: any) => {
        logger.warn('⚠️ Push notification failed (non-critical):', err?.message)
      })
    }
  }

  return { success: true, type, email, subject, html, messageId }
}

export function renderAppointmentDetailHtml(
  data: AppointmentNotificationBody,
  terms: Terminology = getTerminologyDefaults('driving_school')
): string {
  return buildDetailBox(data, '#2563eb', terms)
}

/** Render only (for outbound queue fallback). */
export async function renderAppointmentNotificationEmail(
  input: AppointmentNotificationBody
): Promise<{ subject: string; html: string; tenantName?: string }> {
  let body = await enrichResourceLabels({ ...input })
  const template = TEMPLATES[body.type as keyof typeof TEMPLATES]
  if (!template) throw new Error(`Unknown notification type: ${body.type}`)

  let primaryColor = '#2563eb'
  let tenantSlug: string | null = body.tenantSlug || null
  let logoUrl: string | null = null
  let terms: Terminology = body.terms || getTerminologyDefaults('driving_school')

  if (body.tenantId) {
    const supabase = getSupabaseAdmin()
    const { data: tenant } = await supabase
      .from('tenants')
      .select('primary_color, slug, logo_wide_url, logo_url, logo_square_url, name, booking_policy')
      .eq('id', body.tenantId)
      .single()
    if (tenant) {
      if (tenant.primary_color) primaryColor = tenant.primary_color
      if (tenant.slug) tenantSlug = tenant.slug
      logoUrl = tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
      if (tenant.name) body = { ...body, tenantName: tenant.name }
      if (body.includeAppStore === undefined) {
        body = { ...body, includeAppStore: allowsCustomerAccountActivation(tenant.booking_policy) }
      }
      if (!body.terms) terms = await getTenantTerminology(supabase, body.tenantId)
    }
  }

  return {
    subject: template.subject,
    html: template.getHtml(
      { ...body, tenantSlug: tenantSlug ?? undefined },
      primaryColor,
      logoUrl,
      terms,
    ),
    tenantName: body.tenantName,
  }
}
