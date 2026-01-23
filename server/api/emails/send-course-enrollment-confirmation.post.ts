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

interface ConfirmationEmailRequest {
  courseRegistrationId: string
  paymentMethod: 'wallee' | 'cash'
  totalAmount?: number // In CHF (optional, for cash display)
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as ConfirmationEmailRequest
    const { courseRegistrationId, paymentMethod, totalAmount } = body

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

    if (!['wallee', 'cash'].includes(paymentMethod)) {
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
        course_id,
        courses!inner(
          id,
          name,
          description,
          category,
          price_per_participant_rappen,
          course_sessions(start_time, end_time)
        ),
        tenants!inner(
          id,
          name,
          slug,
          contact_email,
          primary_color
        )
      `)
      .eq('id', courseRegistrationId)
      .single()

    if (enrollmentError || !enrollment?.email) {
      logger.warn('❌ Course enrollment not found:', courseRegistrationId)
      throw createError({
        statusCode: 404,
        statusMessage: 'Course enrollment not found'
      })
    }

    const course = enrollment.courses
    const tenant = enrollment.tenants
    
    // Format sessions - group by day, show times
    const sessions = course?.course_sessions || []
    const formattedSessions = formatSessionsForEmail(sessions)

    const price = course?.price_per_participant_rappen 
      ? (course.price_per_participant_rappen / 100).toFixed(2)
      : '0.00'

    // 3. Build email content based on payment method
    let paymentMethodNotice = ''
    let emailSubject = `Anmeldebestätigung: ${course?.name}`

    if (paymentMethod === 'cash') {
      paymentMethodNotice = `
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #92400e;">Zahlungsmethode: Barzahlung vor Ort</h3>
          <p style="margin: 10px 0 0 0; color: #92400e;">
            <strong>Bitte bringen Sie CHF ${price} in bar zum ersten Kurstag mit.</strong>
          </p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
            Die Zahlung ist erforderlich, damit Sie den Kurs besuchen können.
          </p>
        </div>
      `
      emailSubject = `Anmeldebestätigung: ${course?.name} (Barzahlung)`
    } else {
      paymentMethodNotice = `
        <div style="background: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #166534;">Zahlungsweisen: Online bezahlt</h3>
          <p style="margin: 10px 0 0 0; color: #166534;">
            Deine Zahlung wurde erfolgreich verarbeitet. Dein Platz ist gesichert!
          </p>
        </div>
      `
    }

    // 4. Build "Wichtig!" section based on course category
    const courseCategory = course?.category?.toUpperCase() || ''
    const isVKU = courseCategory === 'VKU'
    const isPGS = courseCategory === 'PGS'
    const isEinsiedeln = course?.description?.toLowerCase().includes('einsiedeln')
    const isCashPayment = paymentMethod === 'cash'
    const tenantSlug = tenant?.slug || ''
    const agbUrl = `https://www.simy.ch/reglemente/agb?tenant=${tenantSlug}`
    
    let importantNotice = ''
    if (isVKU) {
      importantNotice = `
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">Wichtig!</h3>
          <ul style="margin: 0; padding-left: 20px; color: #92400e;">
            <li>Gültiger Lernfahrausweis mitnehmen</li>
            <li><a href="${agbUrl}" style="color: #92400e;">AGB's</a> beachten</li>
          </ul>
        </div>
      `
    } else if (isPGS) {
      let pgsNotices = `
            <li>Eigenes betriebssicheres Fahrzeug ist Pflicht</li>
            <li>Selbständiges Fahren ist Voraussetzung für die Teilnahme</li>
            <li>Gültiger Lernfahrausweis mitnehmen</li>`
      
      // Add cash notice for Einsiedeln PGS
      if (isEinsiedeln && isCashPayment) {
        pgsNotices += `
            <li><strong>Kursgeld in bar mitnehmen (CHF ${price})</strong></li>`
      }
      
      pgsNotices += `
            <li><a href="${agbUrl}" style="color: #92400e;">AGB's</a> beachten</li>`
      
      importantNotice = `
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">Wichtig!</h3>
          <ul style="margin: 0; padding-left: 20px; color: #92400e;">${pgsNotices}
          </ul>
        </div>
      `
    } else {
      // Default for other course types
      importantNotice = `
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">Wichtig!</h3>
          <ul style="margin: 0; padding-left: 20px; color: #92400e;">
            <li>Gültiger Lernfahrausweis mitnehmen</li>
            <li><a href="${agbUrl}" style="color: #92400e;">AGB's</a> beachten</li>
          </ul>
        </div>
      `
    }

    // 5. Build HTML email with responsive design
    const enrollmentEmail = {
      to: enrollment.email,
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
                    <td style="background: linear-gradient(135deg, ${tenant?.primary_color || '#10B981'} 0%, rgba(16, 185, 129, 0.8) 100%); color: white; padding: 25px 20px; text-align: center;">
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
                            <h3 style="margin: 0 0 15px 0; color: ${tenant?.primary_color || '#10B981'}; font-size: 16px;">Kursdetails</h3>
                            <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Kurs:</strong> ${course?.name?.split(' - ')[0]}</p>
                            <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Standort:</strong> ${course?.description}</p>
                            <p style="margin: 0 0 15px 0; font-size: 14px;"><strong>Kurskosten:</strong> CHF ${price}</p>
                            
                            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Termine:</strong></p>
                            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151;">
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

      // IMPORTANT: from field is required by Resend
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'
      
      await resend.emails.send({
        from: fromEmail,
        ...enrollmentEmail
      })
      logger.info('✅ Course enrollment confirmation email sent to:', enrollment.email)

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
  
  // Group sessions by date
  const sessionsByDate: Record<string, any[]> = {}
  
  for (const session of sortedSessions) {
    const date = new Date(session.start_time)
    const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
    
    if (!sessionsByDate[dateKey]) {
      sessionsByDate[dateKey] = []
    }
    sessionsByDate[dateKey].push(session)
  }
  
  // Format each day
  const formattedDays: string[] = []
  
  for (const [dateKey, daySessions] of Object.entries(sessionsByDate)) {
    const date = new Date(dateKey + 'T12:00:00') // Noon to avoid timezone issues
    
    // Format date: "Fr. 24.01.2026"
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    const weekday = weekdays[date.getDay()]
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const formattedDate = `${weekday}. ${day}.${month}.${year}`
    
    // Get time range for this day
    const times = daySessions.map(s => {
      const start = new Date(s.start_time)
      const end = s.end_time ? new Date(s.end_time) : null
      
      const startTime = start.toLocaleTimeString('de-CH', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Zurich'
      })
      
      if (end) {
        const endTime = end.toLocaleTimeString('de-CH', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/Zurich'
        })
        return `${startTime} - ${endTime}`
      }
      return startTime
    })
    
    // If multiple sessions on same day, show range from first start to last end
    if (daySessions.length > 1) {
      const firstStart = new Date(daySessions[0].start_time)
      const lastSession = daySessions[daySessions.length - 1]
      const lastEnd = lastSession.end_time ? new Date(lastSession.end_time) : null
      
      const startTime = firstStart.toLocaleTimeString('de-CH', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Zurich'
      })
      
      if (lastEnd) {
        const endTime = lastEnd.toLocaleTimeString('de-CH', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/Zurich'
        })
        formattedDays.push(`<li>${formattedDate}, ${startTime} - ${endTime}</li>`)
      } else {
        formattedDays.push(`<li>${formattedDate}, ${startTime}</li>`)
      }
    } else {
      // Single session
      formattedDays.push(`<li>${formattedDate}, ${times[0]}</li>`)
    }
  }
  
  return formattedDays.join('\n                  ')
}

