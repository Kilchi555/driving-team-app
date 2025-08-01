// supabase/functions/send-twilio-sms/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("🚀 Twilio SMS Function loaded")

interface SMSRequest {
  to: string
  message: string
}

interface SMSResponse {
  success: boolean
  sid?: string
  error?: string
  details?: any
}

Deno.serve(async (req): Promise<Response> => {
  // CORS Headers für alle Requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("📨 SMS Request received")

    // Request Body parsen
    const { to, message }: SMSRequest = await req.json()
    
    // Validation
    if (!to || !message) {
      console.error("❌ Missing required fields:", { to: !!to, message: !!message })
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'to' or 'message' field" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    // Twilio Credentials aus Environment Variables
    // Fallback: Wenn lokale ENV vars nicht geladen werden, hardcode für Test
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') 
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') 
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    // Debug: Alle Environment Variables anzeigen
    console.log("🔍 ALL ENV VARS:", Object.keys(Deno.env.toObject()))
    console.log("🔧 Twilio Config Check:", {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasFromNumber: !!fromNumber,
      accountSidPreview: accountSid ? `${accountSid.substring(0, 6)}...` : 'MISSING',
      envVarCount: Object.keys(Deno.env.toObject()).length
    })

    if (!accountSid || !authToken || !fromNumber) {
      console.error("❌ Missing Twilio credentials")
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing Twilio configuration. Check environment variables." 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    // Twilio API Call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    // Basic Auth für Twilio API
    const credentials = btoa(`${accountSid}:${authToken}`)
    
    console.log("📞 Sending SMS via Twilio:", {
      to: to,
      from: fromNumber,
      messageLength: message.length,
      twilioUrl,
      // ✅ NEUE DEBUG-INFO
      messageSample: message.length > 50 ? message.substring(0, 50) + '...' : message
    })

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message,
      }),
    })

    const twilioData = await twilioResponse.json()

    if (!twilioResponse.ok) {
      console.error("❌ Twilio API Error:", {
        status: twilioResponse.status,
        statusText: twilioResponse.statusText,
        data: twilioData,
        // ✅ MEHR DETAILS FÜR DEBUGGING
        errorCode: twilioData.code,
        errorMessage: twilioData.message,
        moreInfo: twilioData.more_info
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Twilio API error: ${twilioData.message || 'Unknown error'}`,
          errorCode: twilioData.code,
          details: twilioData
        }),
        { 
          status: twilioResponse.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    console.log("✅ SMS sent successfully:", {
      sid: twilioData.sid,
      status: twilioData.status,
      to: twilioData.to,
      from: twilioData.from,
      // ✅ ZUSÄTZLICHE TWILIO-RESPONSE DETAILS
      dateCreated: twilioData.date_created,
      price: twilioData.price,
      priceUnit: twilioData.price_unit,
      direction: twilioData.direction,
      errorCode: twilioData.error_code,
      errorMessage: twilioData.error_message,
      messagingServiceSid: twilioData.messaging_service_sid,
      numSegments: twilioData.num_segments
    })

    const response: SMSResponse = {
      success: true,
      sid: twilioData.sid,
      details: {
        status: twilioData.status,
        to: twilioData.to,
        from: twilioData.from,
        price: twilioData.price,
        priceUnit: twilioData.price_unit,
        numSegments: twilioData.num_segments,
        errorCode: twilioData.error_code,
        errorMessage: twilioData.error_message
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )

  } catch (error: any) {
    console.error("❌ Unexpected error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unexpected error: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }
})