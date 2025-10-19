// server/api/students/send-onboarding-sms.post.ts
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
    
    // Build onboarding link
    const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://www.simy.ch'
    const onboardingLink = `${baseUrl}/onboarding/${token}`
    
    // Shorten URL (optional - if using URL shortener)
    // const shortLink = await shortenUrl(onboardingLink)
    
    // SMS Message
    const message = `Hallo ${firstName}! Willkommen bei deiner Fahrschule. Vervollständige deine Registrierung: ${onboardingLink} (Link 7 Tage gültig)`

    // Send SMS via your SMS provider
    // Option 1: Twilio
    // await sendViaTwilio(formattedPhone, message)
    
    // Option 2: SwissSign (Swiss provider)
    // await sendViaSwissSign(formattedPhone, message)
    
    // Option 3: Nexmo/Vonage
    // await sendViaNexmo(formattedPhone, message)
    
    // For now: Log to console (you'll implement your SMS provider)
    console.log('📱 SMS to send:', {
      to: formattedPhone,
      message: message,
      link: onboardingLink
    })

    // TODO: Implement actual SMS sending
    // Uncomment when SMS provider is configured:
    /*
    const smsResult = await sendSMS({
      to: formattedPhone,
      message: message
    })
    
    if (!smsResult.success) {
      throw createError({
        statusCode: 500,
        statusMessage: 'SMS sending failed'
      })
    }
    */

    return {
      success: true,
      phone: formattedPhone,
      message: 'SMS sent successfully',
      onboardingLink: onboardingLink
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

