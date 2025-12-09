// server/api/sms/send.post.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default defineEventHandler(async (event) => {
  try {
    const { phone, message } = await readBody(event)

    if (!phone || !message) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: phone, message'
      })
    }

    // Format phone number (ensure +41 format for Swiss numbers)
    const formattedPhone = formatSwissPhoneNumber(phone)
    
    logger.debug('📱 Sending SMS via Twilio:', {
      to: formattedPhone,
      messageLength: message.length
    })

    // Use Supabase Edge Function to send SMS via Twilio
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data: smsData, error: smsError } = await supabase.functions.invoke('send-twilio-sms', {
      body: {
        to: formattedPhone,
        message: message
      }
    })

    if (smsError) {
      console.error('❌ SMS sending failed:', smsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to send SMS: ' + (smsError?.message || 'Unknown error')
      })
    }

    logger.debug('✅ SMS sent successfully:', smsData)

    // Try to log SMS in database (non-critical)
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)
      await supabase
        .from('sms_logs')
        .insert({
          to_phone: formattedPhone,
          message: message,
          twilio_sid: smsData?.sid || `sms_${Date.now()}`,
          status: smsData?.status || 'sent',
          sent_at: new Date().toISOString(),
          purpose: 'appointment_notification'
        })
    } catch (logError) {
      console.warn('⚠️ Failed to log SMS:', logError)
      // Continue even if logging fails
    }

    return {
      success: true,
      phone: formattedPhone,
      message: 'SMS sent successfully',
      smsData
    }

  } catch (error: any) {
    console.error('❌ SMS sending error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to send SMS'
    })
  }
})

// Helper: Format Swiss phone number
function formatSwissPhoneNumber(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // If it starts with 0, replace with +41
  if (cleaned.startsWith('0')) {
    cleaned = '+41' + cleaned.slice(1)
  }
  
  // If it doesn't start with +, add +41
  if (!cleaned.startsWith('+')) {
    cleaned = '+41' + cleaned
  }
  
  return cleaned
}

