import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    console.log('[UrgentPaymentReminder] 🔄 Starting urgent payment reminder cron job...')

    // Get request body to check if this is a manual trigger
    let isManualTrigger = false
    try {
      const body = await readBody(event)
      isManualTrigger = body?.manual === true
    } catch {
      // No body provided, likely a cron trigger
    }

    // Create service role client
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('[UrgentPaymentReminder] ❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // TEST MODE: Only fetch payments for this specific test user
    const TEST_EMAIL = 'pascal_kilchenmann@icloud.com'
    console.log('[UrgentPaymentReminder] 📧 TEST MODE: Fetching pending payments only for:', TEST_EMAIL)

    // Get user ID for test email
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', TEST_EMAIL)
      .single()

    if (userError || !testUser) {
      console.error('[UrgentPaymentReminder] ❌ Test user not found:', TEST_EMAIL)
      return {
        success: false,
        message: 'Test user not found',
        testedEmail: TEST_EMAIL
      }
    }

    console.log('[UrgentPaymentReminder] ✅ Test user found:', testUser.id)

    // Fetch pending wallee payments for this user where appointment exists
    // Use a different approach - query appointments with payments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        duration_minutes,
        user_id,
        payments (
          id,
          user_id,
          payment_method,
          payment_status,
          total_amount_rappen,
          tenant_id
        )
      `)
      .eq('user_id', testUser.id)
      .eq('payments.payment_status', 'pending')
      .eq('payments.payment_method', 'wallee')

    if (appointmentsError) {
      console.error('[UrgentPaymentReminder] ❌ Error fetching appointments:', appointmentsError)
      throw appointmentsError
    }

    console.log('[UrgentPaymentReminder] 📋 Found', appointments?.length || 0, 'appointments with pending wallee payments')

    // Collect unique user IDs from appointments
    const userIds = new Set<string>()
    appointments?.forEach((apt: any) => {
      if (apt.user_id) userIds.add(apt.user_id)
    })

    // Fetch all user data for these users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, tenant_id')
      .in('id', Array.from(userIds))

    if (usersError) {
      console.error('[UrgentPaymentReminder] ❌ Error fetching users:', usersError)
      throw usersError
    }

    // Create a map for quick user lookup
    const userMap = new Map(users?.map((u: any) => [u.id, u]))

    // Flatten appointments and payments
    let payments = (appointments || []).flatMap((apt: any) => 
      (apt.payments || []).map((p: any) => {
        const appointmentUser = userMap.get(apt.user_id)
        return {
          ...p,
          appointments: [{ 
            id: apt.id,
            start_time: apt.start_time,
            end_time: apt.end_time,
            duration_minutes: apt.duration_minutes
          }],
          users: [{
            id: appointmentUser?.id,
            email: appointmentUser?.email,
            first_name: appointmentUser?.first_name,
            last_name: appointmentUser?.last_name
          }]
        }
      })
    )
    
    // TEST MODE: Filter to only test email
    payments = payments.filter((p: any) => p.users?.[0]?.email === TEST_EMAIL)
    console.log('[UrgentPaymentReminder] 📧 After TEST MODE filter:', payments.length, 'payments remaining')
    
    console.log('[UrgentPaymentReminder] 🔍 Debug - First payment users:', payments[0]?.users)

    // Filter payments: appointment is in the past or within 24 hours
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const paymentsToRemind = (payments || []).filter((payment: any) => {
      if (!payment.appointments || !payment.appointments[0]) {
        console.log('[UrgentPaymentReminder] ⚠️ Payment', payment.id, 'has no appointment, skipping')
        return false
      }

      const appointmentTime = new Date(payment.appointments[0].start_time)
      
      // Include: past appointments OR appointments within 24 hours
      const isPast = appointmentTime < now
      const isWithin24h = appointmentTime <= in24Hours && appointmentTime >= now
      const shouldRemind = isPast || isWithin24h

      console.log('[UrgentPaymentReminder] 🕐 Payment', payment.id, '- Appointment:', appointmentTime.toISOString(), '- Past:', isPast, 'Within24h:', isWithin24h, 'Include:', shouldRemind)

      return shouldRemind
    })

    console.log('[UrgentPaymentReminder] 📌 Filtered to', paymentsToRemind.length, 'payments due for reminder')

    if (paymentsToRemind.length === 0) {
      console.log('[UrgentPaymentReminder] ℹ️ No payments found that need urgent reminders')
      return {
        success: true,
        message: 'No urgent payments found',
        remindersCount: 0,
        testedEmail: TEST_EMAIL
      }
    }

    // Send reminders
    let sentCount = 0
    let failedCount = 0

    for (const payment of paymentsToRemind) {
      try {
        // Handle array responses from Supabase relations
        const user = Array.isArray(payment.users) ? payment.users[0] : payment.users
        const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments

        if (!user || !appointment) {
          console.warn('[UrgentPaymentReminder] ⚠️ Missing user or appointment data for payment:', payment.id)
          failedCount++
          continue
        }

        const userEmail = user.email
        const userName = user.first_name ? `${user.first_name}` : 'Kunde'
        const appointmentTime = new Date(appointment.start_time)
        const appointmentDate = appointmentTime.toLocaleDateString('de-CH')
        const appointmentTimeStr = appointmentTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
        const amountCHF = (payment.total_amount_rappen / 100).toFixed(2)

        // Determine if appointment is past or upcoming
        const isPast = appointmentTime < now
        const hoursUntilAppointment = Math.round((appointmentTime.getTime() - now.getTime()) / (60 * 60 * 1000))
        const timeDescription = isPast ? `war am ${appointmentDate} um ${appointmentTimeStr}` : `ist am ${appointmentDate} um ${appointmentTimeStr}`

        console.log(`[UrgentPaymentReminder] 📧 Sending reminder to ${userEmail} for payment CHF ${amountCHF}`)

        // Send email via Resend
        const resendApiKey = process.env.RESEND_API_KEY
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'

        if (!resendApiKey) {
          console.error('[UrgentPaymentReminder] ❌ RESEND_API_KEY not configured')
          failedCount++
          continue
        }

        const { Resend } = await import('resend')
        const resend = new Resend(resendApiKey)

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">⚠️ Zahlungserinnerung erforderlich</h2>
            <p>Hallo ${userName},</p>
            <p>Ihr Fahrtermin <strong>${timeDescription}</strong> hat eine ausstehende Zahlung von <strong>CHF ${amountCHF}</strong>.</p>
            
            ${isPast ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0;">
                <p style="margin: 0; color: #92400e;"><strong>Termin bereits vorbei:</strong> Bitte begleichen Sie diese Zahlung schnellstmöglich.</p>
              </div>
            ` : `
              <div style="background-color: #dbeafe; border-left: 4px solid #0284c7; padding: 12px; margin: 16px 0;">
                <p style="margin: 0; color: #0c2d6b;"><strong>Termin in ${hoursUntilAppointment} Stunden:</strong> Bitte begleichen Sie die Zahlung vor dem Termin.</p>
              </div>
            `}
            
            <p style="margin-top: 20px;">
              <a href="https://www.simy.ch/customer-dashboard" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Zur Zahlung
              </a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #6b7280; font-size: 12px;">Falls Sie diese Zahlung bereits begleitet haben, können Sie diese E-Mail ignorieren.</p>
          </div>
        `

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: `Driving Team <${fromEmail}>`,
          to: userEmail,
          subject: '⚠️ Zahlungserinnerung - Ausstehende Rechnung',
          html: emailHtml
        })

        if (emailError) {
          console.error('[UrgentPaymentReminder] ❌ Failed to send email:', emailError)
          
          // Log failed reminder attempt
          const { error: failLogError } = await supabase
            .from('payment_reminders')
            .insert({
              payment_id: payment.id,
              user_id: payment.user_id || user.id,
              appointment_id: appointment.id,
              tenant_id: payment.tenant_id,
              reminder_type: 'urgent',
              channel: 'email',
              status: 'failed',
              recipient_email: userEmail,
              payment_amount_rappen: payment.total_amount_rappen,
              failed_at: new Date().toISOString(),
              error_message: emailError.message,
              error_code: emailError.name,
              attempt_number: 1,
              metadata: {
                isPast: isPast,
                hoursUntilAppointment: hoursUntilAppointment,
                appointmentTime: appointment.start_time
              }
            })
          
          if (failLogError) {
            console.error('[UrgentPaymentReminder] ⚠️ Failed to log failed reminder:', failLogError)
          }
          
          failedCount++
          continue
        }

        console.log('[UrgentPaymentReminder] ✅ Email sent successfully. Resend ID:', emailResult?.id)

        // Log reminder in payment_reminders table
        const { error: logError } = await supabase
          .from('payment_reminders')
          .insert({
            payment_id: payment.id,
            user_id: payment.user_id || user.id,
            appointment_id: appointment.id,
            tenant_id: payment.tenant_id,
            reminder_type: 'urgent',
            channel: 'email',
            status: 'sent',
            recipient_email: userEmail,
            resend_email_id: emailResult?.id,
            payment_amount_rappen: payment.total_amount_rappen,
            sent_at: new Date().toISOString(),
            attempt_number: 1,
            metadata: {
              isPast: isPast,
              hoursUntilAppointment: hoursUntilAppointment,
              appointmentTime: appointment.start_time
            }
          })

        if (logError) {
          console.error('[UrgentPaymentReminder] ⚠️ Failed to log reminder:', logError)
          // Continue anyway - email was sent
        } else {
          console.log('[UrgentPaymentReminder] 💾 Logged reminder in payment_reminders table')
        }

        sentCount++
      } catch (error: any) {
        console.error('[UrgentPaymentReminder] ❌ Error processing payment reminder:', error)
        failedCount++
      }
    }

    console.log('[UrgentPaymentReminder] ✅ Cron job completed. Sent:', sentCount, 'Failed:', failedCount)

    return {
      success: true,
      message: `Payment reminders processed: ${sentCount} sent, ${failedCount} failed`,
      remindersCount: sentCount,
      failedCount: failedCount,
      testedEmail: TEST_EMAIL,
      isManualTrigger
    }

  } catch (error: any) {
    console.error('[UrgentPaymentReminder] ❌ Unhandled error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n')
    })

    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'Error processing payment reminders'
    })
  }
})
