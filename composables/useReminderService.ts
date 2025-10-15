// composables/useReminderService.ts
import { getSupabase } from '~/utils/supabase'

export const useReminderService = () => {
  const supabase = getSupabase()

  /**
   * Process template variables with actual data
   */
  const processTemplate = (template: string, data: {
    student_name?: string
    appointment_date?: string
    appointment_time?: string
    location?: string
    price?: string
    confirmation_link?: string
    payment_link?: string
  }): string => {
    let processed = template

    // Replace all template variables (both single and double braces)
    Object.entries(data).forEach(([key, value]) => {
      // Handle both {variable} and {{variable}} formats
      const singlePlaceholder = `{${key}}`
      const doublePlaceholder = `{{${key}}}`
      processed = processed.replace(new RegExp(singlePlaceholder.replace(/[{}]/g, '\\$&'), 'g'), value || '')
      processed = processed.replace(new RegExp(doublePlaceholder.replace(/[{}]/g, '\\$&'), 'g'), value || '')
    })

    return processed
  }

  /**
   * Send reminder via email (REAL - sends via Email Service)
   */
  const sendEmailReminder = async (
    email: string,
    subject: string,
    body: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('📧 Sending email reminder:', { email, subject })

      // ✅ Use the real email service
      const { sendEmail } = useEmailService()
      const result = await sendEmail(email, subject, body)

      // Determine status based on result
      const status = result.data?.status === 'simulated' ? 'simulated' : (result.success ? 'sent' : 'failed')

      // Log the reminder in database
      const { error: logError } = await supabase
        .from('reminder_logs')
        .insert({
          channel: 'email',
          recipient: email,
          subject,
          body,
          status,
          error_message: result.error || null,
          sent_at: new Date().toISOString()
        })

      if (logError) {
        console.error('❌ Error logging email reminder:', logError)
      }

      if (result.success) {
        if (status === 'simulated') {
          console.log('✅ Email simulated (Edge Function not available)')
        } else {
          console.log('✅ Email sent successfully')
        }
      } else {
        console.error('❌ Email sending failed:', result.error)
      }

      return result
    } catch (error: any) {
      console.error('❌ Error sending email reminder:', error)
      
      // Log failed attempt
      await supabase
        .from('reminder_logs')
        .insert({
          channel: 'email',
          recipient: email,
          subject,
          body,
          status: 'failed',
          error_message: error.message,
          sent_at: new Date().toISOString()
        })
      
      return { success: false, error: error.message }
    }
  }

  /**
   * Send reminder via SMS (REAL - sends via Twilio)
   */
  const sendSmsReminder = async (
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('📱 Sending SMS reminder via Twilio:', { phoneNumber })

      // ✅ Use the real SMS service (Twilio)
      const { sendSms } = useSmsService()
      const result = await sendSms(phoneNumber, message)

      // Log the reminder in database
      const { error: logError } = await supabase
        .from('reminder_logs')
        .insert({
          channel: 'sms',
          recipient: phoneNumber,
          body: message,
          status: result.success ? 'sent' : 'failed',
          error_message: result.error || null,
          sent_at: new Date().toISOString()
        })

      if (logError) {
        console.error('❌ Error logging SMS reminder:', logError)
      }

      if (result.success) {
        console.log('✅ SMS sent successfully via Twilio')
      } else {
        console.error('❌ SMS sending failed:', result.error)
      }

      return result
    } catch (error: any) {
      console.error('❌ Error sending SMS reminder:', error)
      
      // Log failed attempt
      await supabase
        .from('reminder_logs')
        .insert({
          channel: 'sms',
          recipient: phoneNumber,
          body: message,
          status: 'failed',
          error_message: error.message,
          sent_at: new Date().toISOString()
        })
      
      return { success: false, error: error.message }
    }
  }

  /**
   * Send reminder via Push notification (SIMULATED)
   */
  const sendPushReminder = async (
    userId: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔔 Push Reminder (SIMULATED):', { userId, message })

      // TODO: Implement actual push notification via service (e.g., Firebase, OneSignal)
      // For now, we'll log it
      console.log('🔔 Push content:', { message })

      // Log the reminder in database
      const { error: logError } = await supabase
        .from('reminder_logs')
        .insert({
          channel: 'push',
          recipient: userId,
          body: message,
          status: 'simulated',
          sent_at: new Date().toISOString()
        })

      if (logError) {
        console.error('❌ Error logging push reminder:', logError)
      }

      return { success: true }
    } catch (error: any) {
      console.error('❌ Error sending push reminder:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get reminder template for a specific stage and channel
   */
  const getReminderTemplate = async (
    tenantId: string,
    stage: 'first' | 'second' | 'final',
    channel: 'email' | 'sms' | 'push',
    language: string = 'de'
  ) => {
    try {
      const { data, error } = await supabase
        .from('reminder_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('stage', stage)
        .eq('channel', channel)
        .eq('language', language)
        .maybeSingle()

      if (error) throw error

      // If no tenant-specific template, try to get default template
      if (!data) {
        const { data: defaultTemplate, error: defaultError } = await supabase
          .from('reminder_templates')
          .select('*')
          .is('tenant_id', null)
          .eq('stage', stage)
          .eq('channel', channel)
          .eq('language', language)
          .maybeSingle()

        if (defaultError) throw defaultError
        return defaultTemplate
      }

      return data
    } catch (error: any) {
      console.error('❌ Error getting reminder template:', error)
      return null
    }
  }

  /**
   * Send reminder for a payment
   */
  const sendPaymentReminder = async (
    paymentId: string,
    stage: 'first' | 'second' | 'final',
    channels: {
      email?: boolean
      sms?: boolean
      push?: boolean
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔔 Sending payment reminder:', { paymentId, stage, channels })

      // Get payment details first
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single()

      if (paymentError || !payment) {
        console.error('❌ Payment query error:', paymentError)
        throw new Error('Payment not found')
      }

      // Get appointment details separately
      let appointmentData: any = null
      if (payment.appointment_id) {
        const { data: aptData, error: aptError } = await supabase
          .from('appointments')
          .select(`
            id,
            title,
            start_time,
            duration_minutes,
            type,
            location_id
          `)
          .eq('id', payment.appointment_id)
          .single()

        if (!aptError && aptData) {
          appointmentData = aptData

          // Get location details if available
          if (aptData.location_id) {
            const { data: locData } = await supabase
              .from('locations')
              .select('name, address')
              .eq('id', aptData.location_id)
              .single()

            if (locData) {
              appointmentData.locations = locData
            }
          }
        }
      }

      // Get user details separately
      let userData: any = null
      let tenantSlug: string = 'driving-team' // fallback
      if (payment.user_id) {
        const { data: userInfo, error: userError } = await supabase
          .from('users')
          .select(`
            id, 
            first_name, 
            last_name, 
            email, 
            phone, 
            tenant_id,
            tenants!inner(slug)
          `)
          .eq('id', payment.user_id)
          .single()

        if (!userError && userInfo) {
          userData = userInfo
          // Extract tenant slug from the joined data
          if (userInfo.tenants && userInfo.tenants.slug) {
            tenantSlug = userInfo.tenants.slug
          }
        }
      }

      // Check if payment is still pending
      if (payment.payment_status !== 'pending') {
        console.log('ℹ️ Payment is not pending, skipping reminder')
        return { success: true }
      }

      if (!appointmentData || !userData) {
        console.error('❌ Missing data:', { hasAppointment: !!appointmentData, hasUser: !!userData })
        throw new Error('Missing appointment or user data')
      }

      // Format appointment data
      const appointmentDate = new Date(appointmentData.start_time).toLocaleDateString('de-CH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      const appointmentTime = new Date(appointmentData.start_time).toLocaleTimeString('de-CH', {
        hour: '2-digit',
        minute: '2-digit'
      })

      const location = appointmentData.locations?.name || 'Nicht angegeben'
      const price = ((payment.total_amount_rappen || 0) / 100).toFixed(2)
      // Create login URL with redirect to dashboard (shows all open payments)
      const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://www.simy.ch'
      const dashboardUrl = encodeURIComponent(`${baseUrl}/customer-dashboard`)
      // Use dynamically loaded tenant slug (with fallback)
      const finalTenantSlug = tenantSlug || 'driving-team'
      const paymentLink = `${baseUrl}/login/${finalTenantSlug}?redirect=${dashboardUrl}`
      
      console.log('🔗 Payment link constructed:', {
        tenantSlug,
        finalTenantSlug,
        dashboardUrl,
        paymentLink
      })

      // Template data
      const templateData = {
        student_name: `${userData.first_name} ${userData.last_name}`,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        location,
        price,
        payment_link: paymentLink,
        confirmation_link: paymentLink // Same as payment link for now
      }

      const results: any[] = []

      // Send via enabled channels
      if (channels.email && userData.email) {
        const template = await getReminderTemplate(userData.tenant_id, stage, 'email')
        if (template) {
          const subject = processTemplate(template.subject || '', templateData)
          const body = processTemplate(template.body || '', templateData)
          const result = await sendEmailReminder(userData.email, subject, body)
          results.push({ channel: 'email', ...result })
        }
      }

      if (channels.sms && userData.phone) {
        const template = await getReminderTemplate(userData.tenant_id, stage, 'sms')
        if (template) {
          const message = processTemplate(template.body || '', templateData)
          const result = await sendSmsReminder(userData.phone, message)
          results.push({ channel: 'sms', ...result })
        }
      }

      if (channels.push) {
        const template = await getReminderTemplate(userData.tenant_id, stage, 'push')
        if (template) {
          const message = processTemplate(template.body || '', templateData)
          const result = await sendPushReminder(userData.id, message)
          results.push({ channel: 'push', ...result })
        }
      }

      // Update payment with last reminder info
      await supabase
        .from('payments')
        .update({
          last_reminder_sent_at: new Date().toISOString(),
          last_reminder_stage: stage,
          metadata: {
            ...payment.metadata,
            reminder_history: [
              ...(payment.metadata?.reminder_history || []),
              {
                stage,
                sent_at: new Date().toISOString(),
                channels: Object.keys(channels).filter(k => channels[k as keyof typeof channels])
              }
            ]
          }
        })
        .eq('id', paymentId)

      console.log('✅ Reminder sent successfully:', results)
      return { success: true }
    } catch (error: any) {
      console.error('❌ Error sending payment reminder:', error)
      return { success: false, error: error.message }
    }
  }

  return {
    processTemplate,
    sendEmailReminder,
    sendSmsReminder,
    sendPushReminder,
    getReminderTemplate,
    sendPaymentReminder
  }
}
