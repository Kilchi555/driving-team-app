// server/api/students/send-onboarding-sms.post.ts
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { sendSMS } from '~/server/utils/sms'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default defineEventHandler(async (event) => {
  try {
    const { phone, firstName, token } = await readBody(event)

    if (!phone || !firstName || !token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: phone, firstName, token'
      })
    }

    // Format phone number (ensure +41 format)
    const formattedPhone = formatSwissPhoneNumber(phone)
    
    // Build onboarding link (force public domain)
    const onboardingLink = `https://simy.ch/onboarding/${token}`
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Load tenant name from token
    let tenantName = 'Driving Team' // Default fallback
    try {
      const { data: user } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('onboarding_token', token)
        .single()
      
      if (user?.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name, twilio_from_sender')
          .eq('id', user.tenant_id)
          .single()
        
        if (tenant?.twilio_from_sender) {
          tenantName = tenant.twilio_from_sender
          logger.debug('📱 Using twilio_from_sender:', tenantName)
        } else if (tenant?.name) {
          tenantName = tenant.name
          logger.debug('📱 Fallback to tenant name:', tenantName)
        }
      }
    } catch (tenantError) {
      logger.warn('⚠️ Could not load tenant name from token, using default:', tenantError)
    }
    
    // SMS Message
    const message = `Hallo ${firstName}! Willkommen bei ${tenantName}. Vervollständige deine Registrierung: ${onboardingLink} (Link 7 Tage gültig)`

    logger.debug('📱 Sending onboarding SMS:', {
      to: formattedPhone,
      firstName,
      link: onboardingLink,
      senderName: tenantName
    })
    
    // Use local sendSMS function with Alphanumeric Sender ID support
    let smsResult
    try {
      smsResult = await sendSMS({
        to: formattedPhone,
        message: message,
        senderName: tenantName
      })
    } catch (smsError: any) {
      logger.error('OnboardingSMS', '❌ SMS sending failed:', {
        error: smsError.message,
        errorCode: smsError.code,
        phone: formattedPhone,
        senderName: tenantName
      })
      // Don't throw - student was created, SMS can be resent manually
      return {
        success: false,
        phone: formattedPhone,
        message: 'SMS sending failed, but student was created',
        error: smsError.message,
        onboardingLink: onboardingLink
      }
    }

    logger.debug('✅ Onboarding SMS sent successfully:', smsResult)

    // Log SMS in database
    try {
      await supabase
        .from('sms_logs')
        .insert({
          to_phone: formattedPhone,
          message: message,
          twilio_sid: smsResult?.messageSid || `onboarding_${Date.now()}`,
          status: 'sent',
          sent_at: new Date().toISOString(),
          purpose: 'student_onboarding'
        })
    } catch (logError) {
      console.warn('⚠️ Failed to log SMS:', logError)
      // Continue even if logging fails
    }

    return {
      success: true,
      phone: formattedPhone,
      message: 'SMS sent successfully',
      onboardingLink: onboardingLink,
      smsData: smsResult
    }

  } catch (error: any) {
    console.error('SMS sending error:', error)
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
  
  // If starts with 0, replace with +41
  if (cleaned.startsWith('0')) {
    cleaned = '+41' + cleaned.substring(1)
  }
  
  // If starts with 41, add +
  if (cleaned.startsWith('41') && !cleaned.startsWith('+41')) {
    cleaned = '+' + cleaned
  }
  
  // If no prefix, add +41
  if (!cleaned.startsWith('+')) {
    cleaned = '+41' + cleaned
  }
  
  return cleaned
}

// TODO: Implement SMS providers

/*
// Example: Twilio
async function sendViaTwilio(to: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message
      })
    }
  )
  
  return await response.json()
}

// Example: Nexmo/Vonage
async function sendViaNexmo(to: string, message: string) {
  const apiKey = process.env.NEXMO_API_KEY
  const apiSecret = process.env.NEXMO_API_SECRET
  const fromName = process.env.NEXMO_FROM_NAME || 'Fahrschule'
  
  const response = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: apiKey,
      api_secret: apiSecret,
      to: to.replace('+', ''),
      from: fromName,
      text: message
    })
  })
  
  return await response.json()
}
*/

