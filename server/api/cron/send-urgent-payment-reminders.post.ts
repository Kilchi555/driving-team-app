import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { renderTemplate, renderSubject } from '~/server/utils/templateRenderer'

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

    // Fetch pending wallee payments for all users where appointment exists
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        duration_minutes,
        user_id,
        status,
        cancellation_charge_percentage,
        payments (
          id,
          user_id,
          payment_method,
          payment_status,
          total_amount_rappen,
          tenant_id
        )
      `)
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
      .select('id, email, phone, first_name, last_name, tenant_id')
      .in('id', Array.from(userIds))

    if (usersError) {
      console.error('[UrgentPaymentReminder] ❌ Error fetching users:', usersError)
      throw usersError
    }

    // Create a map for quick user lookup
    const userMap = new Map(users?.map((u: any) => [u.id, u]))

    // Fetch tenant data
    const tenantIds = new Set<string>();
    users?.forEach((user: any) => {
      if (user.tenant_id) tenantIds.add(user.tenant_id);
    });
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .in('id', Array.from(tenantIds));

    if (tenantsError) {
      console.error('[UrgentPaymentReminder] ❌ Error fetching tenants:', tenantsError);
      throw tenantsError;
    }

    const tenantMap = new Map(tenants?.map((t: any) => [t.id, t]));

    // Fetch email templates
    const { data: reminderTemplates, error: templatesError } = await supabase
      .from('reminder_templates')
      .select('id, tenant_id, channel, stage, language, subject, body');

    if (templatesError) {
      console.error('[UrgentPaymentReminder] ❌ Error fetching reminder templates:', templatesError);
      throw templatesError;
    }

    const getTemplate = (tenantId: string | null, channel: string, stage: string, language: string) => {
      return reminderTemplates?.find(
        (template: any) =>
          (template.tenant_id === tenantId || template.tenant_id === null) && // Match specific tenant or global
          template.channel === channel &&
          template.stage === stage &&
          template.language === language
      );
    };


    // Flatten appointments and payments
    const payments = (appointments || []).flatMap((apt: any) => 
      (apt.payments || []).map((p: any) => {
        const appointmentUser = userMap.get(apt.user_id)
        return {
          ...p,
          appointments: [{ 
            id: apt.id,
            start_time: apt.start_time,
            end_time: apt.end_time,
            duration_minutes: apt.duration_minutes,
            status: apt.status, // Include appointment status
            cancellation_charge_percentage: apt.cancellation_charge_percentage // Include cancellation charge
          }],
          users: [{
            id: appointmentUser?.id,
            email: appointmentUser?.email,
            phone: appointmentUser?.phone, // Hinzufügen des phone-Feldes
            first_name: appointmentUser?.first_name,
            last_name: appointmentUser?.last_name,
            tenant_id: appointmentUser?.tenant_id
          }]
        }
      })
    )
    
    console.log('[UrgentPaymentReminder] 🔍 Processing', payments.length, 'payments')

    // Filter payments: appointment is in the past or within 24 hours
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const paymentsToRemind = (payments || []).filter((payment: any) => {
      if (!payment.appointments || !payment.appointments[0]) {
        console.log('[UrgentPaymentReminder] ⚠️ Payment', payment.id, 'has no appointment, skipping')
        return false
      }

      const appointment = payment.appointments[0];
      const appointmentTime = new Date(appointment.start_time)
      
      // Include: past appointments OR appointments within 24 hours
      const isPast = appointmentTime < now
      const isWithin24h = appointmentTime <= in24Hours && appointmentTime >= now
      const hasNoCancellationCharge = appointment.cancellation_charge_percentage === 0 || appointment.cancellation_charge_percentage === null
      const isNotCancelled = appointment.status !== 'cancelled' // Add this filter
      
      const shouldRemind = (isPast || isWithin24h) && hasNoCancellationCharge && isNotCancelled

      console.log('[UrgentPaymentReminder] 🕐 Payment', payment.id, '- Appointment:', appointmentTime.toISOString(), '- Past:', isPast, 'Within24h:', isWithin24h, 'NoCharge:', hasNoCancellationCharge, 'NotCancelled:', isNotCancelled, 'Include:', shouldRemind)

      return shouldRemind
    })

    console.log('[UrgentPaymentReminder] 📌 Filtered to', paymentsToRemind.length, 'payments due for reminder')

    if (paymentsToRemind.length === 0) {
      console.log('[UrgentPaymentReminder] ℹ️ No payments found that need urgent reminders')
      return {
        success: true,
        message: 'No urgent payments found',
        remindersCount: 0,
        isManualTrigger
      }
    }

    // Enqueue reminders
    let enqueuedCount = 0
    let skippedCount = 0

    for (const payment of paymentsToRemind) {
      try {
        const user = Array.isArray(payment.users) ? payment.users[0] : payment.users;
        const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments;

        if (!user || !appointment) {
          console.warn('[UrgentPaymentReminder] ⚠️ Missing user or appointment data for payment:', payment.id);
          skippedCount++;
          continue;
        }

        const userEmail = user.email;
        const userPhone = user.phone || ''; // Get phone number, default to empty string
        const userName = user.first_name ? `${user.first_name}` : 'Kunde';
        const tenantName = tenantMap.get(payment.tenant_id)?.name || 'Driving Team';

        const appointmentTime = new Date(appointment.start_time);
        const appointmentDate = appointmentTime.toLocaleDateString('de-CH');
        const appointmentTimeStr = appointmentTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
        const amountCHF = (payment.total_amount_rappen / 100).toFixed(2);

        const templateData = {
          student_name: userName,
          student_first_name: user.first_name,
          appointment_date: appointmentDate,
          appointment_time: appointmentTimeStr,
          tenant_name: tenantName,
          amountCHF: amountCHF, // Add amountCHF to template data
          // confirmation_link: 'TODO: Add confirmation link if applicable'
          // location: 'TODO: Add location'
        };

        let messageChannel = '';
        let recipient = '';
        let messageSubject = '';
        let messageBody = '';
        let enqueueError = null;

        // --- Prioritize email, fallback to SMS ---
        if (userEmail && userEmail.trim() !== '') {
          const emailTemplate = getTemplate(payment.tenant_id, 'email', 'payment_reminder', 'de');
          if (emailTemplate) {
            messageChannel = 'email';
            recipient = userEmail;
            messageSubject = renderSubject(emailTemplate.subject || 'Wichtige Zahlungserinnerung', templateData);
            messageBody = renderTemplate(emailTemplate.body, templateData);
          } else {
            console.warn('[UrgentPaymentReminder] ⚠️ No email template found for tenant', payment.tenant_id, 'stage payment_reminder, language de. Trying SMS...');
          }
        }

        if (!recipient && userPhone.trim() !== '') { // If no email template or no email address, try SMS
          const smsTemplate = getTemplate(payment.tenant_id, 'sms', 'payment_reminder', 'de');
          if (smsTemplate) {
            messageChannel = 'sms';
            recipient = userPhone;
            messageBody = renderTemplate(smsTemplate.body, templateData); // SMS typically has no subject
          } else {
            console.warn('[UrgentPaymentReminder] ⚠️ No SMS template found for tenant', payment.tenant_id, 'stage payment_reminder, language de. Skipping payment:', payment.id);
          }
        }

        if (!recipient) {
          console.warn('[UrgentPaymentReminder] ⚠️ No valid recipient (email or phone) or template found for payment:', payment.id);
          skippedCount++;
          continue;
        }
        
        // Insert into outbound_messages_queue
        // Insert into outbound_messages_queue
        // --- Deduplication Check ---
        const { count: existingMessageCount, error: existingMessageError } = await supabase
          .from('outbound_messages_queue')
          .select('id', { count: 'exact' })
          .eq('context_data->>payment_id', payment.id)
          .eq('context_data->>stage', 'payment_reminder') // Füge Stage zur Deduplizierungsprüfung hinzu
          .eq('channel', messageChannel)
          .in('status', ['pending', 'sending']);

        if (existingMessageError) {
          console.error('[UrgentPaymentReminder] ❌ Error checking for existing messages:', existingMessageError);
          // Continue to enqueue, better to have duplicates than miss a reminder
        } else if (existingMessageCount && existingMessageCount > 0) {
          console.warn(`[UrgentPaymentReminder] ⚠️ Message for payment ${payment.id} (channel: ${messageChannel}) already in queue. Skipping.`);
          skippedCount++;
          continue;
        }
        const { error: currentEnqueueError } = await supabase
          .from('outbound_messages_queue')
          .insert({
            tenant_id: payment.tenant_id,
            channel: messageChannel,
            recipient_email: messageChannel === 'email' ? recipient : null,
            recipient_phone: messageChannel === 'sms' ? recipient : null,
            subject: messageSubject || null, // SMS might not have a subject
            body: messageBody,
            status: 'pending',
            send_at: now, // Immediately ready for processing
            context_data: {
              payment_id: payment.id,
              stage: 'payment_reminder',
              appointment_id: appointment.id,
              user_id: user.id,
              amountCHF: amountCHF,
              tenant_name: tenantName,
              isManualTrigger: isManualTrigger,
              // originalEmailHtml: emailBody, // Only for email, store if needed for debugging specific channels
            }
          });

        if (currentEnqueueError) {
          console.error('[UrgentPaymentReminder] ❌ Failed to enqueue message for payment', payment.id, ':', currentEnqueueError);
          skippedCount++;
          continue;
        }

        console.log(`[UrgentPaymentReminder] ✅ Enqueued ${messageChannel} for payment`, payment.id, 'to', recipient);
        enqueuedCount++;

      } catch (error: any) {
        console.error('[UrgentPaymentReminder] ❌ Error processing payment reminder for payment', payment.id, ':', error);
        skippedCount++;
      }
    }

    console.log('[UrgentPaymentReminder] ✅ Cron job completed. Enqueued:', enqueuedCount, 'Skipped:', skippedCount);

    return {
      success: true,
      message: `Payment reminders processed: ${enqueuedCount} enqueued, ${skippedCount} skipped`,
      enqueuedCount: enqueuedCount,
      skippedCount: skippedCount,
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
