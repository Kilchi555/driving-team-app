// server/api/emails/send-booking-proposal.post.ts
// Send booking proposal confirmation email to customer and staff

import { defineEventHandler, readBody, createError, getRequestHeaders } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import {
  buildBrandedEmailShell,
  displayName,
  emailDetailBox,
  emailDetailRow,
  emailSignature,
  emailStatusBox,
  escapeHtml,
} from '~/server/utils/branded-email'

interface BookingProposalEmailRequest {
  proposalId: string
  tenant_id: string
}

export default defineEventHandler(async (event) => {
  try {
    // 🔒 Security: Only allow internal calls with a shared secret
    const internalApiSecret = process.env.NUXT_INTERNAL_API_SECRET
    const providedSecret = getRequestHeaders(event)['x-internal-api-secret']

    if (!internalApiSecret || providedSecret !== internalApiSecret) {
      console.warn('❌ Unauthorized access to send-booking-proposal endpoint')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized internal API access'
      })
    }

    const body = await readBody(event) as BookingProposalEmailRequest
    const { proposalId, tenant_id } = body

    logger.debug('📧 Sending booking proposal emails:', { proposalId })

    if (!proposalId || !tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: proposalId, tenant_id'
      })
    }

    const supabase = getSupabaseAdmin()

    // Fetch proposal details with related data
    const { data: proposal, error: proposalError } = await supabase
      .from('booking_proposals')
      .select(`
        id,
        category_code,
        duration_minutes,
        preferred_time_slots,
        first_name,
        last_name,
        email,
        phone,
        notes,
        created_at,
        location:locations(id, name, address, city),
        staff:users!staff_id(id, first_name, last_name, email),
        tenant:tenants(id, name, slug, primary_color, contact_email, business_type, logo_wide_url, logo_url, logo_square_url)
      `)
      .eq('id', proposalId)
      .eq('tenant_id', tenant_id) // 🔒 Security: Ensure proposal belongs to the tenant
      .single()

    if (proposalError || !proposal) {
      logger.warn('❌ Booking proposal not found or does not belong to tenant:', proposalId, tenant_id)
      throw createError({
        statusCode: 404,
        statusMessage: 'Booking proposal not found or unauthorized'
      })
    }

    const location = proposal.location as any
    const staff = proposal.staff as any
    const tenant = proposal.tenant as any

    const terms = await getTenantTerminology(supabase, tenant_id)

    // Detect if this is a general inquiry (no category/location/staff)
    const isGeneralInquiry = !proposal.category_code && !proposal.location_id

    let customerEmail, staffEmail, tenantEmail

    if (isGeneralInquiry) {
      // General inquiry templates (no booking details)
      customerEmail = buildGeneralInquiryCustomerEmail(proposal, tenant)
      staffEmail = null // No specific staff for general inquiries
      tenantEmail = buildGeneralInquiryTenantEmail(proposal, tenant)
    } else {
      // Booking proposal templates (with category/location/staff)
      const formattedTimeSlots = formatTimeSlots(proposal.preferred_time_slots)
      const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
      customerEmail = buildCustomerEmail(proposal, location, staff, tenant, formattedTimeSlots, dayNames, terms)
      staffEmail = buildStaffEmail(proposal, location, staff, tenant, formattedTimeSlots, dayNames, terms)
      tenantEmail = buildTenantEmail(proposal, location, staff, tenant, formattedTimeSlots, dayNames, terms)
    }

    // Send emails with delays to respect Resend's rate limit (2 requests/second)
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'
      const fromWithName = tenant?.name ? `${tenant.name} <${fromEmail}>` : fromEmail

      // Helper function to delay execution
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      // Send to customer
      try {
        await resend.emails.send({
          from: fromWithName,
          ...customerEmail
        })
        logger.info('✅ Email sent to customer:', proposal.email)
      } catch (err: any) {
        logger.error('❌ Failed to send customer email:', err.message)
      }

      // Wait 600ms to respect rate limit
      await delay(600)

      // Send to staff (only for booking proposals, not general inquiries)
      if (staffEmail) {
        try {
          await resend.emails.send({
            from: fromWithName,
            ...staffEmail
          })
          logger.info('✅ Email sent to staff:', staff?.email)
        } catch (err: any) {
          logger.error('❌ Failed to send staff email:', err.message)
        }
        await delay(600)
      }

      // Send to tenant (only if contact_email exists)
      if (tenant?.contact_email) {
        try {
          await resend.emails.send({
            from: fromWithName,
            ...tenantEmail
          })
          logger.info('✅ Booking proposal notification email sent to tenant:', tenant.contact_email)
        } catch (err: any) {
          logger.error('❌ Failed to send tenant email:', err.message, 'Tenant email:', tenant.contact_email)
        }
      } else {
        logger.warn('⚠️ Tenant contact_email is missing, skipping tenant email')
      }

      return {
        success: true,
        message: 'Emails sent successfully'
      }
    } catch (resendErr: any) {
      logger.warn('⚠️ Resend email service failed:', resendErr.message)
      return {
        success: false,
        message: 'Email service unavailable'
      }
    }
  } catch (error: any) {
    logger.error('❌ Booking proposal email error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Email sending failed'
    })
  }
})

function formatTimeSlots(slots: any[]): string {
  if (!slots || slots.length === 0) return '<li>Keine Zeitfenster angegeben</li>'

  // Matches BookingProposalForm.vue: index 0 = Montag, ..., 5 = Samstag (no Sunday)
  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

  // Group by day of week
  const slotsByDay: Record<number, string[]> = {}

  slots.forEach((slot: any) => {
    const day = slot.day_of_week
    if (!slotsByDay[day]) {
      slotsByDay[day] = []
    }
    slotsByDay[day].push(`${slot.start_time} - ${slot.end_time}`)
  })

  // Format HTML
  const formatted = Object.entries(slotsByDay)
    .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
    .map(([day, times]) => {
      const dayName = dayNames[Number(day)]
      const timesList = times.join(', ')
      return `<li><strong>${dayName}:</strong> ${timesList}</li>`
    })
    .join('\n                              ')

  return formatted
}

function tenantLogo(tenant: any): string | null {
  const url = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
  return url?.startsWith?.('data:') ? null : url
}

function buildCustomerEmail(proposal: any, location: any, staff: any, tenant: any, formattedTimeSlots: string, _dayNames: string[], terms: { staff: string; categoryLabel: string }) {
  const createdDate = new Date(proposal.created_at).toLocaleDateString('de-CH')
  const primary = tenant?.primary_color || '#2563eb'
  const tenantName = tenant?.name || 'Simy'

  const details = emailDetailBox(primary, [
    emailDetailRow(terms.categoryLabel, escapeHtml(proposal.category_code || '')),
    emailDetailRow('Dauer', `${escapeHtml(String(proposal.duration_minutes || ''))} Minuten`),
    emailDetailRow('Standort', `${escapeHtml(location?.name || '')}${location?.address ? ` (${escapeHtml(location.address)})` : ''}`),
    emailDetailRow(terms.staff, `${escapeHtml(staff?.first_name || '')} ${escapeHtml(staff?.last_name || '')}`.trim()),
    `<p style="margin:12px 0 6px;color:#374151;font-size:14px"><strong>Bevorzugte Zeitfenster:</strong></p><ul style="margin:0;padding-left:20px;font-size:13px;color:#374151">${formattedTimeSlots}</ul>`,
    proposal.notes
      ? `<p style="margin:12px 0 6px;color:#374151;font-size:14px"><strong>Bemerkungen:</strong></p><p style="margin:0;font-size:13px;color:#374151">${escapeHtml(proposal.notes)}</p>`
      : '',
  ].join(''))

  const status = emailStatusBox({
    bg: '#dcfce7',
    border: '#22c55e',
    titleColor: '#166534',
    bodyColor: '#166534',
    title: 'Anfrage erhalten',
    bodyHtml: `Deine Anfrage wurde am ${escapeHtml(createdDate)} erhalten. ${escapeHtml(staff?.first_name || '')} meldet sich in Kürze unter <strong>${escapeHtml(proposal.phone || '')}</strong> oder <strong>${escapeHtml(proposal.email || '')}</strong>.`,
  })

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo ${escapeHtml(proposal.first_name)},</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">vielen Dank für deine Buchungsanfrage! Wir haben deine bevorzugten Zeitfenster erhalten und melden uns in Kürze bei dir.</p>
    ${details}
    ${status}
    ${emailSignature(tenantName, tenant?.contact_email, primary)}
  `

  return {
    to: proposal.email,
    subject: `Buchungsanfrage eingereicht – ${tenantName}`,
    html: buildBrandedEmailShell({
      title: 'Buchungsanfrage eingereicht',
      tenantName,
      primaryColor: primary,
      logoUrl: tenantLogo(tenant),
      bodyHtml,
    }),
  }
}

function buildStaffEmail(proposal: any, location: any, staff: any, tenant: any, formattedTimeSlots: string, _dayNames: string[], terms: { staff: string; categoryLabel: string }) {
  const primary = tenant?.primary_color || '#2563eb'
  const tenantName = tenant?.name || 'Simy'

  const details = emailDetailBox(primary, [
    emailDetailRow('Name', `${escapeHtml(proposal.first_name || '')} ${escapeHtml(proposal.last_name || '')}`.trim()),
    emailDetailRow('E-Mail', `<a href="mailto:${escapeHtml(proposal.email)}" style="color:${primary}">${escapeHtml(proposal.email)}</a>`),
    emailDetailRow('Telefon', `<a href="tel:${escapeHtml(proposal.phone)}" style="color:${primary}">${escapeHtml(proposal.phone)}</a>`),
    emailDetailRow(terms.categoryLabel, escapeHtml(proposal.category_code || '')),
    emailDetailRow('Dauer', `${escapeHtml(String(proposal.duration_minutes || ''))} Minuten`),
    emailDetailRow('Standort', escapeHtml(location?.name || '')),
    `<p style="margin:12px 0 6px;color:#374151;font-size:14px"><strong>Bevorzugte Zeitfenster:</strong></p><ul style="margin:0;padding-left:20px;font-size:13px;color:#374151">${formattedTimeSlots}</ul>`,
    proposal.notes
      ? `<p style="margin:12px 0 6px;color:#374151;font-size:14px"><strong>Kundennotizen:</strong></p><p style="margin:0;font-size:13px;color:#374151">${escapeHtml(proposal.notes)}</p>`
      : '',
  ].join(''))

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo ${escapeHtml(staff?.first_name)},</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">eine neue Buchungsanfrage ist für dich eingegangen:</p>
    ${details}
    ${emailSignature(tenantName, tenant?.contact_email, primary)}
  `

  return {
    to: staff?.email,
    subject: `Neue Buchungsanfrage: ${proposal.category_code} – ${proposal.first_name} ${proposal.last_name}`,
    html: buildBrandedEmailShell({
      title: 'Neue Buchungsanfrage',
      tenantName,
      primaryColor: primary,
      logoUrl: tenantLogo(tenant),
      bodyHtml,
    }),
  }
}

function buildTenantEmail(proposal: any, location: any, staff: any, tenant: any, formattedTimeSlots: string, _dayNames: string[], terms: { staff: string; categoryLabel: string }) {
  const primary = tenant?.primary_color || '#2563eb'
  const tenantName = tenant?.name || 'Simy'

  const details = emailDetailBox(primary, [
    emailDetailRow('Name', `${escapeHtml(proposal.first_name || '')} ${escapeHtml(proposal.last_name || '')}`.trim()),
    emailDetailRow('E-Mail', `<a href="mailto:${escapeHtml(proposal.email)}" style="color:${primary}">${escapeHtml(proposal.email)}</a>`),
    emailDetailRow('Telefon', `<a href="tel:${escapeHtml(proposal.phone)}" style="color:${primary}">${escapeHtml(proposal.phone)}</a>`),
    emailDetailRow(terms.categoryLabel, escapeHtml(proposal.category_code || '')),
    emailDetailRow('Dauer', `${escapeHtml(String(proposal.duration_minutes || ''))} Minuten`),
    emailDetailRow('Standort', escapeHtml(location?.name || '')),
    emailDetailRow(terms.staff, `${escapeHtml(staff?.first_name || '')} ${escapeHtml(staff?.last_name || '')}`.trim()),
    `<p style="margin:12px 0 6px;color:#374151;font-size:14px"><strong>Bevorzugte Zeitfenster:</strong></p><ul style="margin:0;padding-left:20px;font-size:13px;color:#374151">${formattedTimeSlots}</ul>`,
    proposal.notes
      ? `<p style="margin:12px 0 6px;color:#374151;font-size:14px"><strong>Kundennotizen:</strong></p><p style="margin:0;font-size:13px;color:#374151">${escapeHtml(proposal.notes)}</p>`
      : '',
  ].join(''))

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo,</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">es ist eine neue Buchungsanfrage eingegangen:</p>
    ${details}
    ${emailSignature(tenantName, tenant?.contact_email, primary)}
  `

  return {
    to: tenant?.contact_email,
    subject: `Neue Buchungsanfrage: ${proposal.category_code} – ${proposal.first_name} ${proposal.last_name}`,
    html: buildBrandedEmailShell({
      title: 'Neue Buchungsanfrage',
      subtitle: 'Geschäftsmitteilung',
      tenantName,
      primaryColor: primary,
      logoUrl: tenantLogo(tenant),
      bodyHtml,
    }),
  }
}

// ============================================================
// General Inquiry Templates (no booking details)
// ============================================================

function buildGeneralInquiryCustomerEmail(proposal: any, tenant: any) {
  const createdDate = new Date(proposal.created_at).toLocaleDateString('de-CH')
  const primary = tenant?.primary_color || '#2563eb'
  const tenantName = tenant?.name || 'Simy'

  const details = emailDetailBox(primary, [
    emailDetailRow('Eingegangen', escapeHtml(createdDate)),
    proposal.notes
      ? emailDetailRow('Deine Nachricht', escapeHtml(proposal.notes))
      : '',
  ].join(''))

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo ${escapeHtml(proposal.first_name)},</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">vielen Dank für deine Anfrage bei <strong>${displayName(tenantName)}</strong>. Wir melden uns bald bei dir.</p>
    ${details}
    ${emailSignature(tenantName, tenant?.contact_email, primary)}
  `

  return {
    to: proposal.email,
    subject: `Deine Anfrage bei ${tenantName} – Wir melden uns bald!`,
    html: buildBrandedEmailShell({
      title: 'Anfrage erhalten',
      tenantName,
      primaryColor: primary,
      logoUrl: tenantLogo(tenant),
      bodyHtml,
    }),
  }
}

function buildGeneralInquiryTenantEmail(proposal: any, tenant: any) {
  const createdDate = new Date(proposal.created_at).toLocaleDateString('de-CH')
  const primary = tenant?.primary_color || '#2563eb'
  const tenantName = tenant?.name || 'Simy'

  const details = emailDetailBox(primary, [
    emailDetailRow('Name', `${escapeHtml(proposal.first_name || '')} ${escapeHtml(proposal.last_name || '')}`.trim()),
    emailDetailRow('E-Mail', `<a href="mailto:${escapeHtml(proposal.email)}" style="color:${primary}">${escapeHtml(proposal.email)}</a>`),
    emailDetailRow('Telefon', `<a href="tel:${escapeHtml(proposal.phone)}" style="color:${primary}">${escapeHtml(proposal.phone)}</a>`),
    emailDetailRow('Eingegangen', escapeHtml(createdDate)),
    proposal.notes
      ? emailDetailRow('Nachricht', escapeHtml(proposal.notes))
      : '',
  ].join(''))

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo,</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">eine neue allgemeine Anfrage ist eingegangen:</p>
    ${details}
    <div style="margin:24px 0;text-align:center">
      <a href="mailto:${escapeHtml(proposal.email)}?subject=${encodeURIComponent(`Re: Ihre Anfrage bei ${tenantName}`)}" style="background-color:${primary};color:white;padding:15px 40px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;font-size:16px">Per E-Mail antworten</a>
    </div>
    ${emailSignature(tenantName, tenant?.contact_email, primary)}
  `

  return {
    to: tenant?.contact_email,
    subject: `Neue Anfrage von ${proposal.first_name} ${proposal.last_name}`,
    html: buildBrandedEmailShell({
      title: 'Neue Anfrage',
      tenantName,
      primaryColor: primary,
      logoUrl: tenantLogo(tenant),
      bodyHtml,
    }),
  }
}
