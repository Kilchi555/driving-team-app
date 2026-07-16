// composables/useReminderService.ts
import { logger } from '~/utils/logger'
import { useFallbackLogger } from '~/composables/useFallbackLogger'

export const useReminderService = () => {
  const { logFallbackUsed } = useFallbackLogger()

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
      logger.debug('📧 Sending email reminder:', { email, subject })

      // ✅ Use centralized /api/email/send-appointment-notification endpoint
      const result = await $fetch('/api/email/send-appointment-notification', {
        method: 'POST',
        body: {
          email,
          studentName: 'Student',
          type: 'reminder',
          tenantName: 'Driving Team'
        }
      }) as any

      logger.debug('✅ Email sent successfully via API')
      
      await $fetch('/api/reminders/manage', {
        method: 'POST',
        body: {
          action: 'log-sent',
          channel: 'email',
          recipient: email,
          subject,
          body
        }
      }).catch((err: any) => {
        logger.error('Error logging email reminder:', err)
      })

      return { success: true }
    } catch (error: any) {
      console.error('❌ Error sending email reminder:', error)
      
      await $fetch('/api/reminders/manage', {
        method: 'POST',
        body: {
          action: 'log-failed',
          channel: 'email',
          recipient: email,
          subject,
          body,
          error_message: error.message
        }
      }).catch((err: any) => {
        logger.error('Error logging failed reminder:', err)
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
      logger.debug('📱 Sending SMS reminder via Twilio:', { phoneNumber })

      // ✅ Use centralized /api/sms/send endpoint
      const result = await $fetch('/api/sms/send', {
        method: 'POST',
        body: {
          phone: phoneNumber,
          message
        }
      }) as any

      logger.debug('✅ SMS sent successfully via API')
      
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

      return { success: true }
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
      logger.debug('🔔 Push Reminder (SIMULATED):', { userId, message })

      // TODO: Implement actual push notification via service (e.g., Firebase, OneSignal)
      // For now, we'll log it
      logger.debug('🔔 Push content:', { message })

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
      logger.debug('🔔 Sending payment reminder:', { paymentId, stage, channels })

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
      let tenantSlug: string | null = null
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
          if (userInfo.tenants && Array.isArray(userInfo.tenants)) {
            // @ts-ignore
            tenantSlug = userInfo.tenants[0]?.slug || null
          } else if (userInfo.tenants) {
            // @ts-ignore
            tenantSlug = userInfo.tenants.slug || null
          }
        }
      }

      // Check if payment is still pending
      if (payment.payment_status !== 'pending') {
        logger.debug('ℹ️ Payment is not pending, skipping reminder')
        return { success: true }
      }

      if (!appointmentData || !userData) {
        console.error('❌ Missing data:', { hasAppointment: !!appointmentData, hasUser: !!userData })
        throw new Error('Missing appointment or user data')
      }

      if (!tenantSlug) {
        // ✅ Kein Tenant-Rätselraten mehr: statt einer SMS/E-Mail mit falschem
        // (driving-team-)Tenant-Link wird der Versand sicher abgebrochen.
        console.error('❌ Kein Tenant-Slug für Payment-Reminder gefunden, Versand wird abgebrochen', { paymentId, userId: payment.user_id })
        await logFallbackUsed(
          'tenant-slug',
          `Payment-Reminder abgebrochen: kein Tenant-Slug für User ${payment.user_id} gefunden.`,
          { context: 'useReminderService.sendPaymentReminder', paymentId, userId: payment.user_id },
          'error'
        )
        return { success: false, error: 'Tenant slug missing, reminder aborted' }
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
      const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
      const dashboardUrl = encodeURIComponent(`${baseUrl}/customer-dashboard`)
      const paymentLink = `${baseUrl}/${tenantSlug}?redirect=${dashboardUrl}`
      
      logger.debug('🔗 Payment link constructed:', {
        tenantSlug,
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

      logger.debug('✅ Reminder sent successfully:', results)
      return { success: true }
    } catch (error: any) {
      console.error('❌ Error sending payment reminder:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send reminder for an appointment confirmation
   */
  const sendConfirmationReminder = async (
    appointmentId: string,
    stage: 'first' | 'second' | 'final',
    channels: {
      email?: boolean
      sms?: boolean
      push?: boolean
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      logger.debug('🔔 Sending confirmation reminder:', { appointmentId, stage, channels })

      // Get appointment details
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          title,
          start_time,
          end_time,
          duration_minutes,
          type,
          location_id,
          confirmation_token,
          status,
          metadata,
          user_id,
          users!inner (
            id,
            first_name,
            last_name,
            email,
            phone,
            tenant_id,
            tenants!inner(slug)
          )
        `)
        .eq('id', appointmentId)
        .single()

      if (appointmentError || !appointment) {
        console.error('❌ Appointment query error:', appointmentError)
        throw new Error('Appointment not found')
      }

      const userData = appointment.users as any

      // Check if appointment still needs confirmation
      if (appointment.status !== 'pending_confirmation') {
        logger.debug('ℹ️ Appointment is not pending confirmation, skipping reminder')
        return { success: true }
      }

      if (!appointment.confirmation_token) {
        console.error('❌ No confirmation token found for appointment')
        throw new Error('Confirmation token missing')
      }

      // Get location details if available
      let locationName = 'Nicht angegeben'
      if (appointment.location_id) {
        const { data: locData } = await supabase
          .from('locations')
          .select('name, address')
          .eq('id', appointment.location_id)
          .single()

        if (locData) {
          locationName = locData.name || 'Nicht angegeben'
        }
      }

      // Format appointment data
      const appointmentDate = new Date(appointment.start_time).toLocaleDateString('de-CH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/Zurich'
      })

      const appointmentTime = new Date(appointment.start_time).toLocaleTimeString('de-CH', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Zurich'
      })

      // Create confirmation link with token (token-based, tenant-agnostic URL)
      const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
      const tenantSlug = (Array.isArray(userData.tenants) ? userData.tenants[0]?.slug : userData.tenants?.slug) || null
      if (!tenantSlug) {
        // Only used for debug logging below - not part of the confirmation link itself,
        // so we log the missing slug but don't need to abort the reminder.
        logFallbackUsed(
          'tenant-slug',
          `Kein Tenant-Slug für Termin ${appointmentId} gefunden (nur für Logging relevant).`,
          { context: 'useReminderService.sendConfirmationReminder', appointmentId }
        )
      }
      const confirmationLink = `${baseUrl}/confirm/${appointment.confirmation_token}`

      logger.debug('🔗 Confirmation link constructed:', {
        tenantSlug,
        confirmationLink
      })

      // Get payment amount if payment exists
      let price = '0.00'
      const { data: payment } = await supabase
        .from('payments')
        .select('total_amount_rappen')
        .eq('appointment_id', appointment.id)
        .maybeSingle()

      if (payment && payment.total_amount_rappen) {
        price = ((payment.total_amount_rappen || 0) / 100).toFixed(2)
      }

      // Template data
      const templateData = {
        student_name: `${userData.first_name} ${userData.last_name}`,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        location: locationName,
        price,
        confirmation_link: confirmationLink,
        payment_link: confirmationLink // Same as confirmation link for now
      }

      const results: any[] = []

      // Send via enabled channels
      if (channels.email && userData.email) {
        const template = await getReminderTemplate(userData.tenant_id, stage, 'email', 'de')
        if (template) {
          const subject = processTemplate(template.subject || '', templateData)
          const body = processTemplate(template.body || '', templateData)
          const result = await sendEmailReminder(userData.email, subject, body)
          results.push({ channel: 'email', ...result })
        }
      }

      if (channels.sms && userData.phone) {
        const template = await getReminderTemplate(userData.tenant_id, stage, 'sms', 'de')
        if (template) {
          const message = processTemplate(template.body || '', templateData)
          const result = await sendSmsReminder(userData.phone, message)
          results.push({ channel: 'sms', ...result })
        }
      }

      if (channels.push) {
        const template = await getReminderTemplate(userData.tenant_id, stage, 'push', 'de')
        if (template) {
          const message = processTemplate(template.body || '', templateData)
          const result = await sendPushReminder(userData.id, message)
          results.push({ channel: 'push', ...result })
        }
      }

      // Update appointment metadata with last reminder info
      await supabase
        .from('appointments')
        .update({
          metadata: {
            ...appointment.metadata,
            last_confirmation_reminder_sent_at: new Date().toISOString(),
            last_confirmation_reminder_stage: stage,
            confirmation_reminder_history: [
              ...(appointment.metadata?.confirmation_reminder_history || []),
              {
                stage,
                sent_at: new Date().toISOString(),
                channels: Object.keys(channels).filter(k => channels[k as keyof typeof channels])
              }
            ]
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)

      logger.debug('✅ Confirmation reminder sent successfully:', results)
      return { success: true }
    } catch (error: any) {
      console.error('❌ Error sending confirmation reminder:', error)
      return { success: false, error: error.message }
    }
  }

  return {
    processTemplate,
    sendEmailReminder,
    sendSmsReminder,
    sendPushReminder,
    getReminderTemplate,
    sendPaymentReminder,
    sendConfirmationReminder
  }
}
