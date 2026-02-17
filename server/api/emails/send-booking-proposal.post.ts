// server/api/emails/send-booking-proposal.post.ts
// Send booking proposal confirmation email to customer and staff

import { defineEventHandler, readBody, createError, getRequestHeaders } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

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
        tenant:tenants(id, name, slug, primary_color, contact_email)
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

    // Format preferred time slots
    const formattedTimeSlots = formatTimeSlots(proposal.preferred_time_slots)
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

    // 1. Send confirmation email to CUSTOMER
    const customerEmail = buildCustomerEmail(
      proposal,
      location,
      staff,
      tenant,
      formattedTimeSlots,
      dayNames
    )

    // 2. Send notification email to STAFF
    const staffEmail = buildStaffEmail(
      proposal,
      location,
      staff,
      tenant,
      formattedTimeSlots,
      dayNames
    )

    // 3. Send notification email to TENANT
    const tenantEmail = buildTenantEmail(
      proposal,
      location,
      staff,
      tenant,
      formattedTimeSlots,
      dayNames
    )

    // Send all three emails
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'

      // Send to customer
      await resend.emails.send({
        from: fromEmail,
        ...customerEmail
      })
      logger.info('✅ Booking proposal confirmation email sent to customer:', proposal.email)

      // Send to staff
      await resend.emails.send({
        from: fromEmail,
        ...staffEmail
      })
      logger.info('✅ Booking proposal notification email sent to staff:', staff.email)

      // Send to tenant
      await resend.emails.send({
        from: fromEmail,
        ...tenantEmail
      })
      logger.info('✅ Booking proposal notification email sent to tenant:', tenant.contact_email)

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

  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

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

function buildCustomerEmail(proposal: any, location: any, staff: any, tenant: any, formattedTimeSlots: string, dayNames: string[]) {
  const createdDate = new Date(proposal.created_at).toLocaleDateString('de-CH')

  return {
    to: proposal.email,
    subject: `Deine Buchungsanfrage für ${proposal.category_code} - Kategorie`,
    html: `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Buchungsanfrage Bestätigung</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 20px 10px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, ${tenant?.primary_color || '#10B981'} 0%, rgba(16, 185, 129, 0.8) 100%); color: white; padding: 25px 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600;">Buchungsanfrage eingereicht</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">${tenant?.name}</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 25px 20px;">
                    <p style="margin: 0 0 15px 0; font-size: 16px;">Hallo ${proposal.first_name},</p>
                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151;">vielen Dank für deine Buchungsanfrage! Wir haben deine bevorzugten Zeitfenster erhalten und werden uns in Kürze bei dir melden.</p>
                    
                    <!-- Booking Details -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 15px 0; color: ${tenant?.primary_color || '#10B981'}; font-size: 15px; font-weight: 600;">Buchungsdetails</h3>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Kategorie:</strong> ${proposal.category_code}</p>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Dauer:</strong> ${proposal.duration_minutes} Minuten</p>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Standort:</strong> ${location?.name} (${location?.address})</p>
                          <p style="margin: 0 0 12px 0; font-size: 13px;"><strong>Fahrlehrer:</strong> ${staff?.first_name} ${staff?.last_name}</p>
                          
                          <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Deine bevorzugten Zeitfenster:</strong></p>
                          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #374151;">
                            ${formattedTimeSlots}
                          </ul>
                          
                          ${proposal.notes ? `
                          <p style="margin: 12px 0 0 0; font-size: 13px;"><strong>Deine Bemerkungen:</strong></p>
                          <p style="margin: 0; padding: 10px; background: #fff; border-radius: 4px; font-size: 13px; color: #374151;">${proposal.notes}</p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Confirmation -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #dcfce7; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
                      <tr>
                        <td style="padding: 12px;">
                          <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 600;">✅ Anfrage erhalten</h3>
                          <p style="margin: 0; color: #166534; font-size: 13px;">
                            Deine Anfrage wurde am ${createdDate} erhalten. ${staff?.first_name} wird sich in Kürze bei dir unter der Nummer <strong>${proposal.phone}</strong> oder per E-Mail unter <strong>${proposal.email}</strong> melden.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 15px 0 5px 0; font-size: 15px;">Viel Erfolg beim Fahren!</p>
                    <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280;">
                      ${tenant?.name}<br>
                      ${tenant?.contact_email}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #f3f4f6; padding: 15px 20px; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">Diese E-Mail wurde automatisch generiert. Bitte antworte nicht auf diese E-Mail.</p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }
}

function buildStaffEmail(proposal: any, location: any, staff: any, tenant: any, formattedTimeSlots: string, dayNames: string[]) {
  return {
    to: staff?.email,
    subject: `🎯 Neue Buchungsanfrage: ${proposal.category_code} - ${proposal.first_name} ${proposal.last_name}`,
    html: `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Neue Buchungsanfrage</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 20px 10px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, rgba(59, 130, 246, 0.8) 100%); color: white; padding: 25px 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600;">🎯 Neue Buchungsanfrage</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">${tenant?.name}</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 25px 20px;">
                    <p style="margin: 0 0 15px 0; font-size: 16px;">Hallo ${staff?.first_name},</p>
                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151;">ein Kunde hat eine Buchungsanfrage für dich eingereicht. Hier sind die Details:</p>
                    
                    <!-- Customer Details -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 15px 0; color: #3b82f6; font-size: 15px; font-weight: 600;">Kundendetails</h3>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Name:</strong> ${proposal.first_name} ${proposal.last_name}</p>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>E-Mail:</strong> <a href="mailto:${proposal.email}" style="color: #3b82f6;">${proposal.email}</a></p>
                          <p style="margin: 0 0 12px 0; font-size: 13px;"><strong>Telefon:</strong> <a href="tel:${proposal.phone}" style="color: #3b82f6;">${proposal.phone}</a></p>
                          
                          <h3 style="margin: 15px 0 15px 0; color: #3b82f6; font-size: 15px; font-weight: 600;">Buchungsanfrage</h3>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Kategorie:</strong> ${proposal.category_code}</p>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Dauer:</strong> ${proposal.duration_minutes} Minuten</p>
                          <p style="margin: 0 0 12px 0; font-size: 13px;"><strong>Standort:</strong> ${location?.name}</p>
                          
                          <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Bevorzugte Zeitfenster:</strong></p>
                          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #374151;">
                            ${formattedTimeSlots}
                          </ul>
                          
                          ${proposal.notes ? `
                          <p style="margin: 12px 0 0 0; font-size: 13px;"><strong>Kundennotizen:</strong></p>
                          <p style="margin: 0; padding: 10px; background: #fff; border-radius: 4px; font-size: 13px; color: #374151;">${proposal.notes}</p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280;">
                      ${tenant?.name}<br>
                      ${tenant?.contact_email}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #f3f4f6; padding: 15px 20px; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">Diese E-Mail wurde automatisch generiert. Bitte antworte nicht auf diese E-Mail.</p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }
}

function buildTenantEmail(proposal: any, location: any, staff: any, tenant: any, formattedTimeSlots: string, dayNames: string[]) {
  return {
    to: tenant?.contact_email,
    subject: `📋 Neue Buchungsanfrage eingegangen: ${proposal.category_code} - ${proposal.first_name} ${proposal.last_name}`,
    html: `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Neue Buchungsanfrage</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 20px 10px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, ${tenant?.primary_color || '#10B981'} 0%, rgba(16, 185, 129, 0.8) 100%); color: white; padding: 25px 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600;">📋 Neue Buchungsanfrage</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Geschäftsmitteilung</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 25px 20px;">
                    <p style="margin: 0 0 15px 0; font-size: 16px;">Hallo,</p>
                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151;">es ist eine neue Buchungsanfrage eingegangen. Hier ist eine Zusammenfassung:</p>
                    
                    <!-- Proposal Summary -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 15px 0; color: ${tenant?.primary_color || '#10B981'}; font-size: 15px; font-weight: 600;">Kundenangaben</h3>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Name:</strong> ${proposal.first_name} ${proposal.last_name}</p>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>E-Mail:</strong> <a href="mailto:${proposal.email}" style="color: ${tenant?.primary_color || '#10B981'};">${proposal.email}</a></p>
                          <p style="margin: 0 0 12px 0; font-size: 13px;"><strong>Telefon:</strong> <a href="tel:${proposal.phone}" style="color: ${tenant?.primary_color || '#10B981'};">${proposal.phone}</a></p>
                          
                          <h3 style="margin: 15px 0 15px 0; color: ${tenant?.primary_color || '#10B981'}; font-size: 15px; font-weight: 600;">Anfrageinformationen</h3>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Kategorie:</strong> ${proposal.category_code}</p>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Dauer:</strong> ${proposal.duration_minutes} Minuten</p>
                          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Standort:</strong> ${location?.name}</p>
                          <p style="margin: 0 0 12px 0; font-size: 13px;"><strong>Fahrlehrer:</strong> ${staff?.first_name} ${staff?.last_name}</p>
                          
                          <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Bevorzugte Zeitfenster:</strong></p>
                          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #374151;">
                            ${formattedTimeSlots}
                          </ul>
                          
                          ${proposal.notes ? `
                          <p style="margin: 12px 0 0 0; font-size: 13px;"><strong>Kundennotizen:</strong></p>
                          <p style="margin: 0; padding: 10px; background: #fff; border-radius: 4px; font-size: 13px; color: #374151;">${proposal.notes}</p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280;">
                      ${tenant?.name}<br>
                      ${tenant?.contact_email}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #f3f4f6; padding: 15px 20px; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">Diese E-Mail wurde automatisch generiert. Bitte antworte nicht auf diese E-Mail.</p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }
}
