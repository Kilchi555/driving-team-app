// supabase/functions/send-twilio-sms/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📱 SMS Function called')
    
    const { to, message } = await req.json()
    console.log('📞 Sending SMS to:', to)
    console.log('📄 Message:', message)

    // Twilio Credentials aus Environment Variables
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    console.log('🔐 Twilio Config:', {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasFromNumber: !!fromNumber,
      fromNumber: fromNumber
    })

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing Twilio credentials. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.')
    }

    // Twilio API Call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const formData = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: message,
    })

    console.log('🚀 Calling Twilio API:', twilioUrl)

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    const data = await response.json()
    
    console.log('📊 Twilio Response Status:', response.status)
    console.log('📊 Twilio Response Data:', data)

    if (!response.ok) {
      console.error('❌ Twilio API Error:', data)
      throw new Error(`Twilio API Error: ${data.message || 'Unknown error'}`)
    }

    console.log('✅ SMS sent successfully:', data.sid)

    return new Response(
      JSON.stringify({
        success: true,
        sid: data.sid,
        status: data.status,
        to: data.to,
        from: data.from,
        body: data.body,
        date_created: data.date_created
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ SMS Function Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500,
      }
    )
  }
})
