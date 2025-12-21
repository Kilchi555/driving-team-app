// server/api/sms/send.post.ts
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { sendSMS } from '~/server/utils/sms'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default defineEventHandler(async (event) => {
  try {
    const { phone, message, senderName, tenantId } = await readBody(event)

    if (!phone || !message) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: phone, message'
      })
    }

    // Format phone number (ensure +41 format for Swiss numbers)
    const formattedPhone = formatSwissPhoneNumber(phone)
    
    // Determine sender name: tenantId lookup > explicit senderName > fallback
    let resolvedSenderName = senderName
    
    if (tenantId && !senderName) {
      // Load sender name from tenant if tenantId provided
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name, twilio_from_sender')
          .eq('id', tenantId)
          .single()
        
        if (tenant?.twilio_from_sender) {
          resolvedSenderName = tenant.twilio_from_sender
          logger.debug('📱 Loaded twilio_from_sender from DB:', resolvedSenderName)
        } else if (tenant?.name) {
          resolvedSenderName = tenant.name
          logger.debug('📱 Fallback to tenant name:', resolvedSenderName)
        }
      } catch (tenantError) {
        logger.warn('⚠️ Could not load tenant for SMS sender:', tenantError)
      }
    }
    
    logger.debug('📱 Sending SMS via Twilio:', {
      to: formattedPhone,
      from: resolvedSenderName || 'phone_number',
      messageLength: message.length
    })

    // Use local sendSMS function with Alphanumeric Sender ID support
    const smsResult = await sendSMS({
      to: formattedPhone,
      message: message,
      senderName: resolvedSenderName
    })

    logger.debug('✅ SMS sent successfully:', smsResult)

    // Try to log SMS in database (non-critical)
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)
      await supabase
        .from('sms_logs')
        .insert({
          to_phone: formattedPhone,
          message: message,
          twilio_sid: smsResult?.messageSid || `sms_${Date.now()}`,
          status: 'sent',
          sent_at: new Date().toISOString(),
          purpose: 'appointment_notification',
          tenant_id: tenantId || null
        })
    } catch (logError) {
      console.warn('⚠️ Failed to log SMS:', logError)
      // Continue even if logging fails
    }

    return {
      success: true,
      phone: formattedPhone,
      message: 'SMS sent successfully',
      smsData: smsResult
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

