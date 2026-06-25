/**
 * Send Course Enrollment Confirmation Email
 * 
 * Triggered by webhook after successful payment OR immediately for cash enrollments
 * Supports two payment methods:
 * - Wallee: "Payment completed, your spot is confirmed"
 * - Cash: "Please bring CHF XX in cash on first day"
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { generateAdminEnrollmentNotificationEmail } from '~/server/utils/email-templates'

interface ConfirmationEmailRequest {
  courseRegistrationId: string
  paymentMethod: 'wallee' | 'cash' | 'admin'
  totalAmount?: number // In CHF (optional, for cash display)
  testEmail?: string  // Override recipient for testing
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as ConfirmationEmailRequest
    const { courseRegistrationId, paymentMethod, totalAmount, testEmail } = body

    logger.debug('📧 Sending course enrollment confirmation:', {
      courseRegistrationId,
      paymentMethod
    })

    // 1. Validate inputs
    if (!courseRegistrationId || !paymentMethod) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: courseRegistrationId, paymentMethod'
      })
    }

    if (!['wallee', 'cash', 'admin'].includes(paymentMethod)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid payment method'
      })
    }

    const supabase = getSupabaseAdmin()

    // 2. Fetch enrollment details
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_registrations')
      .select(`
        id,
        email,
        first_name,
        last_name,
        user_id,
        course_id,
        custom_sessions,
        courses!inner(
          id,
          name,
          description,
          category,
          price_per_participant_rappen,
          course_sessions(id, sari_session_id, start_time, end_time)
        ),
        tenants!inner(
          id,
          name,
          slug,
          contact_email,
          primary_color,
          secondary_color
        )
      `)
      .eq('id', courseRegistrationId)
      .single()

    if (enrollmentError || !enrollment) {
      logger.warn('❌ Course enrollment not found:', courseRegistrationId)
      throw createError({
        statusCode: 404,
        statusMessage: 'Course enrollment not found'
      })
    }

    // Fallback: fetch email/name from users table if not stored on registration
    if (!enrollment.email && enrollment.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', enrollment.user_id)
        .single()
      if (user?.email) {
        enrollment.email      = user.email
        enrollment.first_name = enrollment.first_name || user.first_name
        enrollment.last_name  = enrollment.last_name  || user.last_name
      }
    }

    if (!enrollment.email) {
      logger.warn('❌ No email found for enrollment:', courseRegistrationId)
      throw createError({
        statusCode: 404,
        statusMessage: 'Course enrollment not found'
      })
    }

    const course = enrollment.courses as any
    const tenant = enrollment.tenants as any
    
    // Fetch course category to get email_important_notice
    let courseCategory: any = null
    if (course?.category && tenant?.id) {
      const { data: cat } = await supabase
        .from('course_categories')
        .select('email_important_notice, name')
        .eq('code', course.category)
        .eq('tenant_id', tenant.id)
        .single()
      courseCategory = cat
    }
    
    // Format sessions - apply custom sessions if available
    let sessions = course?.course_sessions || []
    
    // If custom sessions selected, replace the relevant sessions
    if (enrollment.custom_sessions && typeof enrollment.custom_sessions === 'object') {
      logger.debug('📧 Applying custom sessions to email:', enrollment.custom_sessions)
      
      // Convert to object if needed
      const customMap = typeof enrollment.custom_sessions === 'string' 
        ? JSON.parse(enrollment.custom_sessions) 
        : enrollment.custom_sessions
      
      // Sort sessions by start_time first
      const sortedSessions = [...sessions].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
      
      // Group sessions by position (assuming 2 sessions per position)
      // This matches how custom_sessions are keyed (position 1, 2, 3, etc.)
      const groupSize = 2
      const finalSessions: any[] = []
      
      for (let i = 0; i < sortedSessions.length; i += groupSize) {
        const position = Math.floor(i / groupSize) + 1
        const groupSessions = sortedSessions.slice(i, i + groupSize)
        const customSession = customMap[position.toString()]
        
        if (customSession) {
          // Use custom session instead - create synthetic session object
          finalSessions.push({
            start_time: customSession.startTime,
            end_time: customSession.endTime,
            isCustom: true,
            customCourseName: customSession.courseName?.split(' - ')[0]
          })
        } else {
          // Use original sessions
          finalSessions.push(...groupSessions)
        }
      }
      
      sessions = finalSessions
    }
    
    const formattedSessions = formatSessionsForEmail(sessions)

    const price = course?.price_per_participant_rappen 
      ? (course.price_per_participant_rappen / 100).toFixed(2)
      : '0.00'

    // 3. Build email content based on payment method
    let paymentMethodNotice = ''
    let emailSubject = `Anmeldebestätigung: ${course?.name}`

    if (paymentMethod === 'cash') {
      paymentMethodNotice = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #fef3c7; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
          <tr>
            <td style="padding: 12px;">
              <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">Zahlungsmethode: Barzahlung vor Ort</h3>
              <p style="margin: 0; color: #92400e; font-size: 13px;">
                <strong>Bitte bringen Sie CHF ${price} in bar zum ersten Kurstag mit.</strong>
              </p>
            </td>
          </tr>
        </table>
      `
      emailSubject = `Anmeldebestätigung: ${course?.name} (Barzahlung)`
    } else if (paymentMethod === 'admin') {
      paymentMethodNotice = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #eff6ff; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6;">
          <tr>
            <td style="padding: 12px;">
              <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">Anmeldung durch Fahrschule</h3>
              <p style="margin: 0; color: #1e40af; font-size: 13px;">
                Sie wurden durch die Fahrschule für diesen Kurs angemeldet. Bei Fragen wenden Sie sich direkt an uns.
              </p>
            </td>
          </tr>
        </table>
      `
      emailSubject = `Anmeldebestätigung: ${course?.name}`
    } else {
      paymentMethodNotice = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #dcfce7; border-radius: 8px; margin: 15px 0; border-left: 4px solid #22c55e;">
          <tr>
            <td style="padding: 12px;">
              <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 600;">Zahlungsmethode: Online bezahlt</h3>
              <p style="margin: 0; color: #166534; font-size: 13px;">
                Deine Zahlung wurde erfolgreich verarbeitet. Dein Platz ist gesichert!
              </p>
            </td>
          </tr>
        </table>
      `
    }

    // 4. Build "Wichtig!" section – use admin-configured notice if available, otherwise fall back
    const courseCategoryCode = course?.category?.toUpperCase() || ''
    const isVKU = courseCategoryCode === 'VKU'
    const isPGS = courseCategoryCode === 'PGS'
    const isEinsiedeln = course?.description?.toLowerCase().includes('einsiedeln')
    const isCashPayment = paymentMethod === 'cash'
    const tenantSlug = tenant?.slug || ''
    const agbUrl = `https://app.simy.ch/reglemente/agb?tenant=${tenantSlug}`

    // Build the list items for importantNotice
    let importantListItems = ''

    if (courseCategory?.email_important_notice?.trim()) {
      // Admin-configured notice: support both plain-text lines and legacy <li> HTML
      const raw = courseCategory.email_important_notice.trim()
      if (raw.includes('<li>')) {
        importantListItems = raw
      } else {
        importantListItems = raw.split('\n')
          .map((s: string) => s.trim())
          .filter((s: string) => s)
          .map((s: string) => `\n                <li>${s}</li>`)
          .join('')
      }
    } else if (isVKU) {
      importantListItems = `
                <li>Gültiger Lern- und/oder Fahrausweis mitnehmen</li>
                <li><a href="${agbUrl}" style="color: #92400e;">AGB's</a> beachten</li>`
    } else if (isPGS) {
      importantListItems = `
                <li>Eigenes betriebssicheres Fahrzeug ist Pflicht</li>
                <li>Selbständiges Fahren ist Voraussetzung für die Teilnahme</li>
                <li>Gültiger Lern- und/oder Fahrausweis mitnehmen</li>`
      if (isEinsiedeln && isCashPayment) {
        importantListItems += `
                <li><strong>Kursgeld in bar mitnehmen (CHF ${price})</strong></li>`
      }
      importantListItems += `
                <li><a href="${agbUrl}" style="color: #92400e;">AGB's</a> beachten</li>`
    } else {
      importantListItems = `
                <li>Gültiger Lern- und/oder Fahrausweis mitnehmen</li>
                <li><a href="${agbUrl}" style="color: #92400e;">AGB's</a> beachten</li>`
    }

    const importantNotice = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #fef3c7; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
          <tr>
            <td style="padding: 12px;">
              <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">Wichtig!</h3>
              <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 13px;">${importantListItems}
              </ul>
            </td>
          </tr>
        </table>
      `

    // 5. Build HTML email with responsive design
    const enrollmentEmail = {
      to: testEmail || enrollment.email,
      subject: emailSubject,
      html: `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${emailSubject}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
            <tr>
              <td align="center" style="padding: 20px 10px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, ${tenant?.primary_color || '#10B981'} 0%, ${tenant?.secondary_color || tenant?.primary_color || '#059669'} 100%); color: white; padding: 25px 20px; text-align: center;">
                      <h1 style="margin: 0; font-size: 22px; font-weight: 600;">Anmeldebestätigung</h1>
                      <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">${tenant?.name}</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 25px 20px;">
                      <p style="margin: 0 0 15px 0; font-size: 16px;">Hallo ${enrollment.first_name},</p>
                      <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151;">vielen Dank für deine Anmeldung!</p>
                      
                      <!-- Course Details -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
                        <tr>
                          <td style="padding: 20px;">
                            <h3 style="margin: 0 0 15px 0; color: ${tenant?.primary_color || '#10B981'}; font-size: 15px; font-weight: 600;">Kursdetails</h3>
                            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Kurs:</strong> ${course?.name?.split(' - ')[0]}${courseCategory?.name ? ` – ${courseCategory.name}` : ''}</p>
                            ${courseCategory?.description ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">${courseCategory.description}</p>` : ''}
                            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Standort:</strong> ${course?.description}</p>
                            <p style="margin: 0 0 12px 0; font-size: 13px;"><strong>Kurskosten:</strong> CHF ${price}</p>
                            
                            <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Termine:</strong></p>
                            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #374151;">
                              ${formattedSessions}
                            </ul>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Payment Method Notice -->
                      ${paymentMethodNotice}
                      
                      <!-- Important Notice -->
                      ${importantNotice}
                      
                      <p style="margin: 20px 0 5px 0; font-size: 15px;">Viel Erfolg und Freude beim Kurs!</p>
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

    // 5. Send email using Resend
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'
      const fromWithName = tenant?.name ? `${tenant.name} <${fromEmail}>` : fromEmail

      await resend.emails.send({
        from: fromWithName,
        ...enrollmentEmail
      })
      logger.info('✅ Course enrollment confirmation email sent to:', enrollment.email)

      // Send admin notification (non-blocking)
      if (tenant?.contact_email) {
        const firstSession = (course?.course_sessions || []).sort((a: any, b: any) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )[0]
        const courseDate = firstSession?.start_time
          ? new Date(firstSession.start_time).toLocaleDateString('de-CH', {
              weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Zurich'
            })
          : undefined
        const price = course?.price_per_participant_rappen
          ? (course.price_per_participant_rappen / 100).toFixed(2)
          : undefined
        const { subject: adminSubject, html: adminHtml } = generateAdminEnrollmentNotificationEmail({
          participantFirstName: enrollment.first_name || '',
          participantLastName: enrollment.last_name || '',
          participantEmail: enrollment.email,
          courseName: course?.name || '',
          courseDate,
          courseLocation: course?.description || undefined,
          paymentMethod: paymentMethod === 'cash' ? 'Barzahlung' : 'Online (Wallee)',
          paymentAmount: price,
          tenantName: tenant.name
        })
        resend.emails.send({
          from: fromWithName,
          to: tenant.contact_email,
          subject: adminSubject,
          html: adminHtml
        }).catch((err: any) => logger.warn('⚠️ Admin notification email failed:', err.message))
      }

      return {
        success: true,
        message: 'Confirmation email sent',
        email: enrollment.email
      }
    } catch (resendErr: any) {
      logger.warn('⚠️ Resend email service failed:', resendErr.message)
      
      // Log for manual sending but don't fail
      logger.debug('📧 Email details for manual sending:', {
        to: enrollmentEmail.to,
        subject: enrollmentEmail.subject
      })

      // Return 200 to prevent retries
      return {
        success: false,
        message: 'Email service unavailable - logged for manual sending',
        email: enrollment.email
      }
    }
  } catch (error: any) {
    logger.error('❌ Course enrollment email error:', error)

    if (error.statusCode || error.statusMessage) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Email sending failed'
    })
  }
})

// Helper function to format sessions for email
function formatSessionsForEmail(sessions: any[]): string {
  if (!sessions || sessions.length === 0) {
    return '<li>Termine werden noch bekannt gegeben</li>'
  }
  
  // Sort sessions by start_time
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )
  
  // Group sessions by date in Europe/Zurich timezone
  const sessionsByDate: Record<string, any[]> = {}

  for (const session of sortedSessions) {
    const date = new Date(session.start_time)
    // Use Zurich date as key so midnight-crossing sessions land on the correct calendar day
    const dateKey = date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' }) // YYYY-MM-DD

    if (!sessionsByDate[dateKey]) {
      sessionsByDate[dateKey] = []
    }
    sessionsByDate[dateKey].push(session)
  }

  // Helper: convert UTC ISO string to HH:MM in Europe/Zurich
  const extractTime = (isoString: string) => {
    if (!isoString) return ''
    return new Date(isoString).toLocaleTimeString('de-CH', {
      timeZone: 'Europe/Zurich',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format each day
  const formattedDays: string[] = []

  for (const [dateKey, daySessions] of Object.entries(sessionsByDate)) {
    // Parse YYYY-MM-DD at noon Zurich to avoid any day shift
    const date = new Date(`${dateKey}T12:00:00`)

    // Format date: "Fr. 24.01.2026" using Zurich locale
    const formattedDate = date.toLocaleDateString('de-CH', {
      timeZone: 'Europe/Zurich',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(',', '.')

    // Get time range for this day
    const times = daySessions.map(s => {
      const startTime = extractTime(s.start_time)
      const endTime = s.end_time ? extractTime(s.end_time) : null
      return endTime ? `${startTime} - ${endTime}` : startTime
    })

    // If multiple sessions on same day, show range from first start to last end
    if (daySessions.length > 1) {
      const startTime = extractTime(daySessions[0].start_time)
      const lastSession = daySessions[daySessions.length - 1]
      const endTime = lastSession.end_time ? extractTime(lastSession.end_time) : null

      if (endTime) {
        formattedDays.push(`<li>${formattedDate}, ${startTime} - ${endTime}</li>`)
      } else {
        formattedDays.push(`<li>${formattedDate}, ${startTime}</li>`)
      }
    } else {
      formattedDays.push(`<li>${formattedDate}, ${times[0]}</li>`)
    }
  }
  
  return formattedDays.join('\n                  ')
}

