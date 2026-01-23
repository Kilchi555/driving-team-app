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
          price_per_participant_rappen,
          course_sessions(start_time)
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
    const courseDate = course?.course_sessions?.[0]?.start_time
      ? new Date(course.course_sessions[0].start_time).toLocaleDateString('de-CH')
      : 'TBD'

    const price = course?.price_per_participant_rappen 
      ? (course.price_per_participant_rappen / 100).toFixed(2)
      : '0.00'

    // 3. Build email content based on payment method
    let paymentMethodNotice = ''
    let emailSubject = `Anmeldebestätigung: ${course?.name}`

    if (paymentMethod === 'cash') {
      paymentMethodNotice = `
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #92400e;">Zahlungsweisen: Barzahlung vor Ort</h3>
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

    // 4. Build HTML email
    const enrollmentEmail = {
      to: enrollment.email,
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${tenant?.primary_color || '#10B981'} 0%, rgba(16, 185, 129, 0.8) 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Anmeldebestätigung</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${tenant?.name}</p>
          </div>
          
          <!-- Content -->
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p>Hallo ${enrollment.first_name},</p>
            
            <p>vielen Dank für deine Anmeldung!</p>
            
            <!-- Course Details -->
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: ${tenant?.primary_color || '#10B981'};">Kursdetails</h3>
              <p style="margin: 10px 0;"><strong>Kurs:</strong> ${course?.name}</p>
              <p style="margin: 10px 0;"><strong>Standort:</strong> ${course?.description}</p>
              <p style="margin: 10px 0;"><strong>Startdatum:</strong> ${courseDate}</p>
              <p style="margin: 10px 0;"><strong>Kursbeitrag:</strong> CHF ${price}</p>
            </div>
            
            <!-- Payment Method Notice -->
            ${paymentMethodNotice}
            
            <!-- Next Steps -->
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${tenant?.primary_color || '#10B981'};">
              <h3 style="margin-top: 0;">Nächste Schritte</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Dein Platz im Kurs ist reserviert</li>
                <li>Du erhältst weitere Infos per E-Mail</li>
                <li>Bei Fragen: ${tenant?.contact_email}</li>
              </ul>
            </div>
            
            <p style="margin-bottom: 0;">Viel Erfolg und Freude beim Kurs!</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              ${tenant?.name}<br>
              ${tenant?.contact_email}
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
            <p style="margin: 0;">Diese E-Mail wurde automatisch generiert. Bitte antworte nicht auf diese E-Mail.</p>
          </div>
        </div>
      `
    }

    // 5. Send email using Resend
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      await resend.emails.send(enrollmentEmail)
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

