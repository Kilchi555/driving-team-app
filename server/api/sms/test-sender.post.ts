// server/api/sms/test-sender.post.ts
// TEST: Direkt über Twilio SDK - testet alphanumerische Sender ID
import twilio from 'twilio'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const { phone, senderName, useMessagingService } = await readBody(event)

    if (!phone) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing phone number'
      })
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID // Optional

    if (!accountSid || !authToken) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Twilio credentials not configured'
      })
    }

    const client = twilio(accountSid, authToken)
    
    // Test message
    const testMessage = `Test: Absender "${senderName || 'Standard'}". Wenn du diesen Namen siehst, funktioniert es!`

    logger.debug('📱 Testing SMS sender:', {
      to: phone,
      senderName,
      useMessagingService,
      messagingServiceSid: messagingServiceSid ? 'configured' : 'not configured'
    })

    let result
    
    if (useMessagingService && messagingServiceSid) {
      // Option 1: Use Messaging Service (recommended)
      logger.debug('📱 Using Messaging Service SID:', messagingServiceSid)
      result = await client.messages.create({
        body: testMessage,
        messagingServiceSid: messagingServiceSid,
        to: phone
      })
    } else if (senderName) {
      // Option 2: Try alphanumeric sender ID
      // Switzerland does NOT require registration (per Twilio docs)
      const cleanSenderName = senderName
        .replace(/ä/gi, 'a')
        .replace(/ö/gi, 'o')
        .replace(/ü/gi, 'u')
        .replace(/ß/g, 'ss')
        .replace(/[^a-zA-Z0-9 ]/g, '')  // Keep spaces (allowed by Twilio)
        .trim()
        .substring(0, 11)
        .trim()
      
      logger.debug('📱 Using alphanumeric sender ID:', cleanSenderName, '(original:', senderName, ')')
      
      try {
        result = await client.messages.create({
          body: testMessage,
          from: cleanSenderName,
          to: phone
        })
      } catch (alphaError: any) {
        logger.warn('⚠️ Alphanumeric sender failed, falling back to phone number:', alphaError.message)
        // Fallback to phone number
        result = await client.messages.create({
          body: testMessage + ' (Alphanumeric failed - used phone number)',
          from: phoneNumber,
          to: phone
        })
        return {
          success: true,
          warning: 'Alphanumeric sender ID failed in Switzerland. Used phone number as fallback.',
          alphaError: alphaError.message,
          result: {
            sid: result.sid,
            status: result.status,
            from: result.from
          }
        }
      }
    } else {
      // Option 3: Standard phone number
      logger.debug('📱 Using standard phone number:', phoneNumber)
      result = await client.messages.create({
        body: testMessage,
        from: phoneNumber,
        to: phone
      })
    }

    logger.debug('✅ SMS sent:', result.sid)

    return {
      success: true,
      message: 'Test SMS sent!',
      result: {
        sid: result.sid,
        status: result.status,
        from: result.from,
        to: result.to
      },
      hint: !messagingServiceSid 
        ? 'Tipp: Für branded sender, erstelle einen Messaging Service in Twilio und füge TWILIO_MESSAGING_SERVICE_SID zur .env hinzu'
        : undefined
    }

  } catch (error: any) {
    console.error('❌ SMS test error:', error)
    return {
      success: false,
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      hint: error.code === 21212 
        ? 'Dieser Sender ist für die Schweiz nicht erlaubt. Du brauchst einen Messaging Service.'
        : undefined
    }
  }
})
