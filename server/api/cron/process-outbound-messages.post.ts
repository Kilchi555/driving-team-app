// server/api/cron/process-outbound-messages.post.ts
import { defineEventHandler, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { sendSMS } from '~/server/utils/sms'

// Simple delay utility
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default defineEventHandler(async (event) => {
  try {
    console.log('[OutboundMessageProcessor] 🔄 Starting outbound message processor cron job...')

    // Create service role client
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('[OutboundMessageProcessor] ❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Fetch messages from queue that are pending and ready to send
    const { data: messages, error: fetchError } = await supabase
      .from('outbound_messages_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString()) // Ready to send now or in the past
      .order('send_at', { ascending: true }) // Process oldest first
      .limit(50) // Pro plan: 60s timeout → 50 messages at 1/s fits comfortably

    if (fetchError) {
      console.error('[OutboundMessageProcessor] ❌ Error fetching outbound messages:', fetchError)
      throw fetchError
    }

    if (!messages || messages.length === 0) {
      console.log('[OutboundMessageProcessor] ℹ️ No pending messages to process')
      return { success: true, message: 'No pending messages', processedCount: 0 }
    }

    console.log(`[OutboundMessageProcessor] 📝 Found ${messages.length} pending messages to process`)

    const resendApiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'

    if (!resendApiKey) {
      console.error('[OutboundMessageProcessor] ❌ RESEND_API_KEY not configured. Cannot send emails.')
      return createError({
        statusCode: 500,
        statusMessage: 'RESEND_API_KEY not configured'
      })
    }
    const resend = new Resend(resendApiKey)

    let sentCount = 0
    let failedCount = 0

    for (const message of messages) {
      try {
        // Update status to 'sending' to avoid duplicates if cron runs in parallel
        await supabase
          .from('outbound_messages_queue')
          .update({ status: 'sending', last_attempt_at: new Date().toISOString(), attempt_count: (message.attempt_count || 0) + 1 })
          .eq('id', message.id)

        if (message.channel === 'email') {
          if (!message.recipient_email || !message.subject || !message.body) {
            console.warn(`[OutboundMessageProcessor] ⚠️ Skipping email message ${message.id} due to missing data:`, { recipient_email: message.recipient_email, subject: message.subject, body: message.body })
            await supabase
              .from('outbound_messages_queue')
              .update({ status: 'failed', error_message: 'Missing recipient, subject, or body', failed_at: new Date().toISOString() })
              .eq('id', message.id)
            failedCount++
            continue
          }

          const { data: emailResult, error: emailError } = await resend.emails.send({
            from: fromEmail,
            to: message.recipient_email,
            subject: message.subject,
            html: message.body,
          })

          if (emailError) {
            console.error(`[OutboundMessageProcessor] ❌ Failed to send email for message ${message.id}:`, emailError)
            await supabase
              .from('outbound_messages_queue')
              .update({ status: 'failed', error_message: emailError.message, failed_at: new Date().toISOString() })
              .eq('id', message.id)
            failedCount++
          } else {
            console.log(`[OutboundMessageProcessor] ✅ Email sent for message ${message.id}. Resend ID:`, emailResult?.id)
            await supabase
              .from('outbound_messages_queue')
              .update({ status: 'sent', sent_at: new Date().toISOString(), resend_message_id: emailResult?.id })
              .eq('id', message.id)
            sentCount++
          }
        } else         if (message.channel === 'sms') {
          if (!message.recipient_phone || !message.body) {
            console.warn(`[OutboundMessageProcessor] ⚠️ Skipping SMS message ${message.id} due to missing data:`, { recipient_phone: message.recipient_phone, body: message.body })
            await supabase
              .from('outbound_messages_queue')
              .update({ status: 'failed', error_message: 'Missing recipient phone or body', failed_at: new Date().toISOString() })
              .eq('id', message.id)
            failedCount++
            continue
          }

          try {
            const tenantName = message.context_data?.tenant_name || undefined
            await sendSMS({
              to: message.recipient_phone,
              message: message.body,
              senderName: tenantName,
            })
            console.log(`[OutboundMessageProcessor] ✅ SMS sent for message ${message.id} to ${message.recipient_phone}`)
            await supabase
              .from('outbound_messages_queue')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', message.id)
            sentCount++
          } catch (twilioError: any) {
            console.error(`[OutboundMessageProcessor] ❌ Failed to send SMS for message ${message.id}:`, twilioError)
            await supabase
              .from('outbound_messages_queue')
              .update({ status: 'failed', error_message: twilioError.message, failed_at: new Date().toISOString() })
              .eq('id', message.id)
            failedCount++
          }
        } else if (message.channel === 'push') {
          // TODO: Implement Push notification sending logic here
          console.warn(`[OutboundMessageProcessor] ⚠️ Push notification sending not yet implemented for message ${message.id}`)
          await supabase
            .from('outbound_messages_queue')
            .update({ status: 'failed', error_message: 'Push channel not implemented', failed_at: new Date().toISOString() })
            .eq('id', message.id)
          failedCount++
        } else {
          console.warn(`[OutboundMessageProcessor] ⚠️ Unknown channel ${message.channel} for message ${message.id}`)
          await supabase
            .from('outbound_messages_queue')
            .update({ status: 'failed', error_message: `Unknown channel: ${message.channel}`, failed_at: new Date().toISOString() })
            .eq('id', message.id)
          failedCount++
        }

        // 1 message per second to respect Resend/Twilio rate limits
        await delay(1000)

      } catch (error: any) {
        console.error(`[OutboundMessageProcessor] ❌ Unhandled error processing message ${message.id}:`, error)
        await supabase
          .from('outbound_messages_queue')
          .update({ status: 'failed', error_message: error.message || 'Unhandled error', failed_at: new Date().toISOString() })
          .eq('id', message.id)
        failedCount++
      }
    }

    console.log(`[OutboundMessageProcessor] ✅ Cron job completed. Sent: ${sentCount}, Failed: ${failedCount}`)

    return {
      success: true,
      message: `Outbound messages processed: ${sentCount} sent, ${failedCount} failed`,
      processedCount: sentCount,
      failedCount: failedCount
    }

  } catch (error: any) {
    console.error('[OutboundMessageProcessor] ❌ Unhandled error in main handler:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n')
    })

    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'Error processing outbound messages'
    })
  }
})
