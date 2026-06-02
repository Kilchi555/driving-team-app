import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { SARISyncEngine } from '~/server/utils/sari-sync-engine'
import { getPaymentProviderForTenant } from '~/server/payment-providers/factory'
import { generateSARIEnrollmentConfirmationEmail, generateNonSARIEnrollmentConfirmationEmail, generateAdminEnrollmentNotificationEmail } from '~/server/utils/email-templates'
import { SARIClient } from '~/utils/sariClient'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { courseId, transactionId, isSARI } = body

    if (!courseId || !transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: courseId, transactionId'
      })
    }

    const supabase = getSupabaseAdmin()

    // 1. Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      throw new Error('Course not found')
    }

    // 2. Verify payment transaction
    const paymentProvider = await getPaymentProviderForTenant(course.tenant_id)
    const transactionStatus = await paymentProvider.getTransactionStatus(transactionId)

    if (transactionStatus.status !== 'COMPLETED' && transactionStatus.status !== 'CONFIRMED') {
      throw new Error('Payment not confirmed')
    }

    let enrollmentDetails: any = {
      courseName: course.name,
      paymentAmount: transactionStatus.amount
    }

    if (isSARI) {
      // 3. For SARI courses: Create enrollment via SARI API
      // Get tenant SARI config - environment flag from tenants, credentials from tenant_secrets
      const { data: tenantSettings, error: settingsError } = await supabase
        .from('tenants')
        .select('sari_environment')
        .eq('id', course.tenant_id)
        .single()

      if (settingsError || !tenantSettings) {
        throw new Error('SARI configuration not found for tenant')
      }

      // Load encrypted credentials from tenant_secrets
      const sariSecrets = await getTenantSecretsSecure(
        course.tenant_id,
        ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
        'enroll-complete'
      )

      // Initialize SARI client
      const sariClient = new SARIClient({
        environment: tenantSettings.sari_environment || 'test',
        clientId: sariSecrets.SARI_CLIENT_ID,
        clientSecret: sariSecrets.SARI_CLIENT_SECRET,
        username: sariSecrets.SARI_USERNAME,
        password: sariSecrets.SARI_PASSWORD
      })

      const syncEngine = new SARISyncEngine(supabase, sariClient, course.tenant_id)

      // Get payment record for participant data
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', transactionId)
        .single()

      if (paymentError || !paymentRecord) {
        throw new Error('Payment record not found')
      }

      const participantData = paymentRecord.metadata?.participant_data || {}
      const faberid = paymentRecord.metadata?.faberid
      const birthdate = paymentRecord.metadata?.birthdate

      // Enroll in SARI
      const sariEnrollmentResult = await syncEngine.enrollStudentInSARI(
        course.sari_course_id,
        faberid,
        birthdate,
        course.tenant_id
      )

      if (!sariEnrollmentResult.success) {
        throw new Error(`SARI enrollment failed: ${sariEnrollmentResult.error}`)
      }

      // 4. Create course_participant record in Simy
      const { data: participant, error: participantError } = await supabase
        .from('course_participants')
        .insert({
          tenant_id: course.tenant_id,
          faberid,
          first_name: participantData.first_name,
          last_name: participantData.last_name,
          email: participantData.email,
          phone: participantData.phone,
          birthdate: participantData.birthdate,
          street: participantData.street,
          zip: participantData.zip,
          city: participantData.city,
          sari_synced: true,
          sari_synced_at: new Date().toISOString()
        })
        .select()
        .single()

      if (participantError) {
        console.error('Error creating participant:', participantError)
        // Continue - participant might already exist
      }

      // 5. Create course_registration
      const participantId = participant?.id

      if (participantId) {
        const { error: registrationError } = await supabase
          .from('course_registrations')
          .insert({
            course_id: courseId,
            participant_id: participantId,
            status: 'confirmed',
            sari_synced: true,
            sari_synced_at: new Date().toISOString()
          })

        if (registrationError) {
          console.error('Error creating registration:', registrationError)
        }
      }

      enrollmentDetails.participantName = `${participantData.first_name} ${participantData.last_name}`
      enrollmentDetails.paymentMethod = 'Wallee'

      // 6. Send confirmation email
      await sendConfirmationEmail(
        course,
        participantData,
        enrollmentDetails,
        course.tenant_id
      )
    } else {
      // Non-SARI: Standard enrollment already created
      enrollmentDetails.paymentMethod = 'Wallee'

      // Send confirmation email
      await sendConfirmationEmail(
        course,
        {},
        enrollmentDetails,
        course.tenant_id
      )
    }

    return {
      success: true,
      message: 'Enrollment completed successfully',
      enrollmentDetails
    }
  } catch (err: any) {
    console.error('Error in enrollment completion:', err)

    return {
      success: false,
      message: err.message || 'Enrollment completion failed',
      error: err.message
    }
  }
})

/**
 * Queue confirmation + admin notification via outbound_messages_queue.
 * Non-blocking — enrollment success is independent of email delivery.
 */
async function sendConfirmationEmail(
  course: any,
  participantData: any,
  enrollmentDetails: any,
  tenantId: string
) {
  try {
    const supabase = getSupabaseAdmin()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug, contact_email')
      .eq('id', tenantId)
      .single()

    const emailTo = participantData.email || enrollmentDetails.email
    if (!emailTo) {
      console.warn('No email address for enrollment confirmation')
      return
    }

    const tenantName = tenant?.name || 'Simy'
    const participantName = `${participantData.first_name || 'Teilnehmer'} ${participantData.last_name || ''}`.trim()

    const { data: sessions } = await supabase
      .from('course_sessions')
      .select('start_time')
      .eq('course_id', course.id)
      .order('start_time', { ascending: true })
      .limit(1)

    const courseDate = sessions?.[0]?.start_time
      ? new Date(sessions[0].start_time).toLocaleDateString('de-CH', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          timeZone: 'Europe/Zurich',
        })
      : undefined

    const emailData = enrollmentDetails.isSARI
      ? generateSARIEnrollmentConfirmationEmail({
          participantName,
          courseName: course.name,
          courseDate,
          location: course.external_instructor_name,
          paymentAmount: enrollmentDetails.paymentAmount,
          tenantName,
        })
      : generateNonSARIEnrollmentConfirmationEmail({
          participantName,
          courseName: course.name,
          courseDate,
          location: course.external_instructor_name,
          instructorName: course.external_instructor_name,
          tenantName,
        })

    const now = new Date().toISOString()
    const toQueue: any[] = [
      {
        tenant_id: tenantId,
        channel: 'email',
        recipient_email: emailTo,
        subject: emailData.subject,
        body: emailData.html,
        status: 'pending',
        send_at: now,
        context_data: {
          stage: 'enrollment_confirmation',
          course_id: course.id,
          course_name: course.name,
          tenant_name: tenantName,
        },
      },
    ]

    if (tenant?.contact_email) {
      const { subject: adminSubject, html: adminHtml } = generateAdminEnrollmentNotificationEmail({
        participantFirstName: participantData.first_name || participantName.split(' ')[0] || '',
        participantLastName: participantData.last_name || participantName.split(' ').slice(1).join(' ') || '',
        participantEmail: emailTo,
        participantPhone: participantData.phone,
        courseName: course.name,
        courseDate,
        courseLocation: course.description || undefined,
        paymentMethod: 'Online (Wallee)',
        paymentAmount: enrollmentDetails.paymentAmount
          ? String((enrollmentDetails.paymentAmount / 100).toFixed(2))
          : undefined,
        tenantName,
      })

      toQueue.push({
        tenant_id: tenantId,
        channel: 'email',
        recipient_email: tenant.contact_email,
        subject: adminSubject,
        body: adminHtml,
        status: 'pending',
        send_at: now,
        context_data: {
          stage: 'enrollment_confirmation_admin',
          course_id: course.id,
          course_name: course.name,
          tenant_name: tenantName,
        },
      })
    }

    const { error: queueError } = await supabase.from('outbound_messages_queue').insert(toQueue)
    if (queueError) {
      console.warn('⚠️ Failed to queue enrollment emails:', queueError.message)
    } else {
      console.log(`✅ Queued ${toQueue.length} enrollment email(s) for`, emailTo)
    }
  } catch (err: any) {
    console.error('Error queuing confirmation email:', err)
    // Don't throw — enrollment was successful, email failure shouldn't block it
  }
}

