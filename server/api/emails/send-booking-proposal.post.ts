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
  /** When true, only notify staff/tenant (customer already got registration confirmation). */
  skipCustomerEmail?: boolean
}

type IntakeMode = 'locations' | 'pickup_address' | 'callback' | 'general'

export default defineEventHandler(async (event) => {
  try {
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
    const { proposalId, tenant_id, skipCustomerEmail } = body

    logger.debug('📧 Sending booking proposal emails:', { proposalId, skipCustomerEmail: !!skipCustomerEmail })

    if (!proposalId || !tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: proposalId, tenant_id'
      })
    }

    const supabase = getSupabaseAdmin()

    const { data: proposal, error: proposalError } = await supabase
      .from('booking_proposals')
      .select(`
        id,
        category_code,
        duration_minutes,
        preferred_time_slots,
        location_id,
        staff_id,
        first_name,
        last_name,
        email,
        phone,
        street,
        house_number,
        postal_code,
        city,
        notes,
        created_at,
        location:locations(id, name, address, city),
        staff:users!staff_id(id, first_name, last_name, email),
        tenant:tenants(id, name, slug, primary_color, contact_email, business_type, logo_wide_url, logo_url, logo_square_url)
      `)
      .eq('id', proposalId)
      .eq('tenant_id', tenant_id)
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
    const intakeMode = inferIntakeMode(proposal)
    const formattedTimeSlots = formatTimeSlots(proposal.preferred_time_slots)
    const isGeneralInquiry = intakeMode === 'general'

    let customerEmail: any
    let staffEmail: any = null
    let tenantEmail: any

    if (isGeneralInquiry) {
      customerEmail = buildGeneralInquiryCustomerEmail(proposal, tenant)
      tenantEmail = buildDynamicTenantEmail(proposal, location, staff, tenant, formattedTimeSlots, terms, intakeMode)
    } else {
      customerEmail = buildCustomerEmail(proposal, location, staff, tenant, formattedTimeSlots, terms, intakeMode)
      if (staff?.email) {
        staffEmail = buildStaffEmail(proposal, location, staff, tenant, formattedTimeSlots, terms, intakeMode)
      }
      tenantEmail = buildDynamicTenantEmail(proposal, location, staff, tenant, formattedTimeSlots, terms, intakeMode)
    }

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'
      const fromWithName = tenant?.name ? `${tenant.name} <${fromEmail}>` : fromEmail
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      try {
        if (proposal.email && !skipCustomerEmail) {
          await resend.emails.send({ from: fromWithName, ...customerEmail })
          logger.info('✅ Email sent to customer:', proposal.email)
        } else if (skipCustomerEmail) {
          logger.info('⏭️ Skipping customer proposal email (already confirmed at registration)')
        }
      } catch (err: any) {
        logger.error('❌ Failed to send customer email:', err.message)
      }

      await delay(600)

      if (staffEmail) {
        try {
          await resend.emails.send({ from: fromWithName, ...staffEmail })
          logger.info('✅ Email sent to staff:', staff?.email)
        } catch (err: any) {
          logger.error('❌ Failed to send staff email:', err.message)
        }
        await delay(600)
      }

      if (tenant?.contact_email) {
        try {
          await resend.emails.send({ from: fromWithName, ...tenantEmail })
          logger.info('✅ Booking proposal notification email sent to tenant:', tenant.contact_email)
        } catch (err: any) {
          logger.error('❌ Failed to send tenant email:', err.message, 'Tenant email:', tenant.contact_email)
        }
      } else {
        logger.warn('⚠️ Tenant contact_email is missing, skipping tenant email')
      }

      return { success: true, message: 'Emails sent successfully' }
    } catch (resendErr: any) {
      logger.warn('⚠️ Resend email service failed:', resendErr.message)
      return { success: false, message: 'Email service unavailable' }
    }
  } catch (error: any) {
    logger.error('❌ Booking proposal email error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Email sending failed'
    })
  }
})

function inferIntakeMode(proposal: any): IntakeMode {
  const notes = String(proposal?.notes || '')
  if (!proposal?.category_code) return 'general'
  if (/Rückruf erwünscht/i.test(notes)) return 'callback'
  if (/Abholort:/i.test(notes) || (hasAddress(proposal) && !proposal.location_id)) return 'pickup_address'
  if (proposal.location_id) return 'locations'
  if (hasAddress(proposal)) return 'pickup_address'
  // Category present, no location → treat as callback-style inquiry
  return 'callback'
}

function hasAddress(proposal: any): boolean {
  return !!(proposal?.street || proposal?.postal_code || proposal?.city)
}

function intakeModeLabel(mode: IntakeMode): string {
  switch (mode) {
    case 'locations': return 'Treffpunkt / Filiale'
    case 'pickup_address': return 'Wunsch-Abholort'
    case 'callback': return 'Telefonischer Rückruf'
    default: return 'Allgemeine Anfrage'
  }
}

function formatAddress(proposal: any): string {
  const streetLine = [proposal?.street, proposal?.house_number].filter(Boolean).join(' ').trim()
  const cityLine = [proposal?.postal_code, proposal?.city].filter(Boolean).join(' ').trim()
  return [streetLine, cityLine].filter(Boolean).join(', ')
}

function cleanNotes(notes: string | null | undefined): string {
  if (!notes) return ''
  return notes
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false
      if (/^Rückruf erwünscht$/i.test(line)) return false
      if (/^Abholort:/i.test(line)) return false
      if (/^Geburtsdatum:/i.test(line)) return false
      if (/^Beruf:/i.test(line)) return false
      return true
    })
    .join('\n')
    .trim()
}

function extractTaggedValue(notes: string | null | undefined, tag: string): string {
  if (!notes) return ''
  const re = new RegExp(`^${tag}:\\s*(.+)$`, 'im')
  const match = notes.match(re)
  return match?.[1]?.trim() || ''
}

function formatTimeSlots(slots: any[]): string {
  if (!slots || slots.length === 0) return ''

  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
  const slotsByDay: Record<number, string[]> = {}

  slots.forEach((slot: any) => {
    const day = slot.day_of_week
    if (!slotsByDay[day]) slotsByDay[day] = []
    slotsByDay[day].push(`${slot.start_time} - ${slot.end_time}`)
  })

  return Object.entries(slotsByDay)
    .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
    .map(([day, times]) => {
      const dayName = dayNames[Number(day)] || `Tag ${day}`
      return `<li><strong>${dayName}:</strong> ${times.join(', ')}</li>`
    })
    .join('\n                              ')
}

function tenantLogo(tenant: any): string | null {
  const url = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
  return url?.startsWith?.('data:') ? null : url
}

/** Build only rows that have content — fully dynamic for admin/staff emails. */
function buildProposalDetailRowsHtml(
  proposal: any,
  location: any,
  staff: any,
  primary: string,
  formattedTimeSlots: string,
  terms: { staff: string; categoryLabel: string },
  intakeMode: IntakeMode,
): string {
  const rows: string[] = []
  const fullName = `${proposal.first_name || ''} ${proposal.last_name || ''}`.trim()
  const address = formatAddress(proposal)
  const notesClean = cleanNotes(proposal.notes)
  const birthdate = extractTaggedValue(proposal.notes, 'Geburtsdatum')
  const profession = extractTaggedValue(proposal.notes, 'Beruf')

  if (fullName) rows.push(emailDetailRow('Name', escapeHtml(fullName)))
  if (proposal.email) {
    rows.push(emailDetailRow('E-Mail', `<a href="mailto:${escapeHtml(proposal.email)}" style="color:${primary}">${escapeHtml(proposal.email)}</a>`))
  }
  if (proposal.phone) {
    rows.push(emailDetailRow('Telefon', `<a href="tel:${escapeHtml(proposal.phone)}" style="color:${primary}">${escapeHtml(proposal.phone)}</a>`))
  }
  if (birthdate) rows.push(emailDetailRow('Geburtsdatum', escapeHtml(birthdate)))
  if (profession) rows.push(emailDetailRow('Beruf', escapeHtml(profession)))

  rows.push(emailDetailRow('Anfrage-Art', escapeHtml(intakeModeLabel(intakeMode))))

  if (proposal.category_code) {
    rows.push(emailDetailRow(terms.categoryLabel, escapeHtml(proposal.category_code)))
  }
  if (proposal.duration_minutes) {
    rows.push(emailDetailRow('Dauer', `${escapeHtml(String(proposal.duration_minutes))} Minuten`))
  }

  if (intakeMode === 'locations' && (location?.name || proposal.location_id)) {
    const locLabel = location?.name
      ? `${escapeHtml(location.name)}${location.address ? ` (${escapeHtml(location.address)})` : ''}`
      : '—'
    rows.push(emailDetailRow('Standort', locLabel))
  }

  if (intakeMode === 'pickup_address' || address) {
    if (address) rows.push(emailDetailRow('Abholadresse', escapeHtml(address)))
  }

  if (staff?.first_name || staff?.last_name) {
    rows.push(emailDetailRow(terms.staff, escapeHtml(`${staff.first_name || ''} ${staff.last_name || ''}`.trim())))
  }

  if (formattedTimeSlots) {
    rows.push(
      `<p style="margin:12px 0 6px;color:#374151;font-size:14px"><strong>Bevorzugte Zeitfenster:</strong></p>` +
      `<ul style="margin:0;padding-left:20px;font-size:13px;color:#374151">${formattedTimeSlots}</ul>`
    )
  }

  if (notesClean) {
    rows.push(
      `<p style="margin:12px 0 6px;color:#374151;font-size:14px"><strong>Bemerkungen:</strong></p>` +
      `<p style="margin:0;font-size:13px;color:#374151;white-space:pre-wrap">${escapeHtml(notesClean)}</p>`
    )
  }

  if (proposal.created_at) {
    rows.push(emailDetailRow('Eingegangen', escapeHtml(new Date(proposal.created_at).toLocaleString('de-CH'))))
  }

  return rows.join('')
}

function buildCustomerEmail(
  proposal: any,
  location: any,
  staff: any,
  tenant: any,
  formattedTimeSlots: string,
  terms: { staff: string; categoryLabel: string },
  intakeMode: IntakeMode,
) {
  const createdDate = new Date(proposal.created_at).toLocaleDateString('de-CH')
  const primary = tenant?.primary_color || '#2563eb'
  const tenantName = tenant?.name || 'Simy'
  const address = formatAddress(proposal)

  const customerRows: string[] = []
  if (proposal.category_code) customerRows.push(emailDetailRow(terms.categoryLabel, escapeHtml(proposal.category_code)))
  if (proposal.duration_minutes) customerRows.push(emailDetailRow('Dauer', `${escapeHtml(String(proposal.duration_minutes))} Minuten`))
  customerRows.push(emailDetailRow('Anfrage-Art', escapeHtml(intakeModeLabel(intakeMode))))
  if (intakeMode === 'locations' && location?.name) {
    customerRows.push(emailDetailRow('Standort', `${escapeHtml(location.name)}${location.address ? ` (${escapeHtml(location.address)})` : ''}`))
  }
  if (intakeMode === 'pickup_address' && address) {
    customerRows.push(emailDetailRow('Abholadresse', escapeHtml(address)))
  }
  if (staff?.first_name) {
    customerRows.push(emailDetailRow(terms.staff, escapeHtml(`${staff.first_name || ''} ${staff.last_name || ''}`.trim())))
  }
  if (formattedTimeSlots) {
    customerRows.push(
      `<p style="margin:12px 0 6px;color:#374151;font-size:14px"><strong>Bevorzugte Zeitfenster:</strong></p>` +
      `<ul style="margin:0;padding-left:20px;font-size:13px;color:#374151">${formattedTimeSlots}</ul>`
    )
  }
  const notesClean = cleanNotes(proposal.notes)
  if (notesClean) {
    customerRows.push(
      `<p style="margin:12px 0 6px;color:#374151;font-size:14px"><strong>Bemerkungen:</strong></p>` +
      `<p style="margin:0;font-size:13px;color:#374151;white-space:pre-wrap">${escapeHtml(notesClean)}</p>`
    )
  }

  const details = emailDetailBox(primary, customerRows.join(''))
  const contactHint = [proposal.phone, proposal.email].filter(Boolean).map((v: string) => `<strong>${escapeHtml(v)}</strong>`).join(' oder ')

  const status = emailStatusBox({
    bg: '#dcfce7',
    border: '#22c55e',
    titleColor: '#166534',
    bodyColor: '#166534',
    title: 'Anfrage erhalten',
    bodyHtml: `Deine Anfrage wurde am ${escapeHtml(createdDate)} erhalten. Wir melden uns in Kürze${contactHint ? ` unter ${contactHint}` : ''}.`,
  })

  const intro =
    intakeMode === 'callback'
      ? 'vielen Dank für deine Anfrage! Wir rufen dich in Kürze zurück.'
      : 'vielen Dank für deine Buchungsanfrage! Wir haben deine Angaben erhalten und melden uns in Kürze bei dir.'

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo ${escapeHtml(proposal.first_name || '')},</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">${intro}</p>
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

function buildStaffEmail(
  proposal: any,
  location: any,
  staff: any,
  tenant: any,
  formattedTimeSlots: string,
  terms: { staff: string; categoryLabel: string },
  intakeMode: IntakeMode,
) {
  const primary = tenant?.primary_color || '#2563eb'
  const tenantName = tenant?.name || 'Simy'
  const details = emailDetailBox(
    primary,
    buildProposalDetailRowsHtml(proposal, location, staff, primary, formattedTimeSlots, terms, intakeMode),
  )

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo ${escapeHtml(staff?.first_name || '')},</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">eine neue Buchungsanfrage ist für dich eingegangen:</p>
    ${details}
    ${emailSignature(tenantName, tenant?.contact_email, primary)}
  `

  const subjectBits = [
    proposal.category_code,
    intakeModeLabel(intakeMode),
    `${proposal.first_name || ''} ${proposal.last_name || ''}`.trim(),
  ].filter(Boolean)

  return {
    to: staff?.email,
    subject: `Neue Buchungsanfrage: ${subjectBits.join(' – ')}`,
    html: buildBrandedEmailShell({
      title: 'Neue Buchungsanfrage',
      tenantName,
      primaryColor: primary,
      logoUrl: tenantLogo(tenant),
      bodyHtml,
    }),
  }
}

function buildDynamicTenantEmail(
  proposal: any,
  location: any,
  staff: any,
  tenant: any,
  formattedTimeSlots: string,
  terms: { staff: string; categoryLabel: string },
  intakeMode: IntakeMode,
) {
  const primary = tenant?.primary_color || '#2563eb'
  const tenantName = tenant?.name || 'Simy'
  const details = emailDetailBox(
    primary,
    buildProposalDetailRowsHtml(proposal, location, staff, primary, formattedTimeSlots, terms, intakeMode),
  )

  const replyMailto = proposal.email
    ? `<div style="margin:24px 0;text-align:center">
        <a href="mailto:${escapeHtml(proposal.email)}?subject=${encodeURIComponent(`Re: Ihre Anfrage bei ${tenantName}`)}" style="background-color:${primary};color:white;padding:15px 40px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;font-size:16px">Per E-Mail antworten</a>
      </div>`
    : ''

  const callButton = proposal.phone
    ? `<div style="margin:12px 0 24px;text-align:center">
        <a href="tel:${escapeHtml(proposal.phone)}" style="border:2px solid ${primary};color:${primary};padding:12px 32px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;font-size:15px">Anrufen</a>
      </div>`
    : ''

  const intro =
    intakeMode === 'general'
      ? 'eine neue allgemeine Anfrage ist eingegangen:'
      : intakeMode === 'callback'
        ? 'eine neue Rückruf-Anfrage ist eingegangen:'
        : 'eine neue Buchungsanfrage ist eingegangen:'

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo,</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">${intro}</p>
    ${details}
    ${replyMailto}
    ${callButton}
    ${emailSignature(tenantName, tenant?.contact_email, primary)}
  `

  const subjectName = `${proposal.first_name || ''} ${proposal.last_name || ''}`.trim() || 'Unbekannt'
  const subject =
    intakeMode === 'general'
      ? `Neue Anfrage von ${subjectName}`
      : `Neue Buchungsanfrage: ${[proposal.category_code, intakeModeLabel(intakeMode), subjectName].filter(Boolean).join(' – ')}`

  return {
    to: tenant?.contact_email,
    subject,
    html: buildBrandedEmailShell({
      title: intakeMode === 'general' ? 'Neue Anfrage' : 'Neue Buchungsanfrage',
      subtitle: 'Geschäftsmitteilung',
      tenantName,
      primaryColor: primary,
      logoUrl: tenantLogo(tenant),
      bodyHtml,
    }),
  }
}

function buildGeneralInquiryCustomerEmail(proposal: any, tenant: any) {
  const createdDate = new Date(proposal.created_at).toLocaleDateString('de-CH')
  const primary = tenant?.primary_color || '#2563eb'
  const tenantName = tenant?.name || 'Simy'
  const notesClean = cleanNotes(proposal.notes)

  const details = emailDetailBox(primary, [
    emailDetailRow('Eingegangen', escapeHtml(createdDate)),
    notesClean ? emailDetailRow('Deine Nachricht', escapeHtml(notesClean)) : '',
  ].join(''))

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo ${escapeHtml(proposal.first_name || '')},</p>
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
