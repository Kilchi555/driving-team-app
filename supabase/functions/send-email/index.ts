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
    const requestBody = await req.json()
    console.log('📧 Edge Function received full request:', JSON.stringify(requestBody, null, 2))

    const { to, subject, body } = requestBody

    console.log('📧 Edge Function parsed:', { 
      to, 
      subject, 
      body: body?.substring(0, 100) + '...',
      hasTo: !!to,
      hasSubject: !!subject,
      hasBody: !!body
    })

    if (!to || !subject || !body) {
      console.error('❌ Missing required fields:', { to: !!to, subject: !!subject, body: !!body })
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: to, subject, body',
          received: { to: !!to, subject: !!subject, body: !!body },
          requestBody: requestBody
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔑 Using Resend API key:', resendApiKey.substring(0, 10) + '...')

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@simy.ch',
        to: [to],
        subject: subject,
        html: body.replace(/\n/g, '<br>'),
      }),
    })

    console.log('📤 Resend API response status:', resendResponse.status)

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text()
      console.error('❌ Resend API error:', resendResponse.status, errorData)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: errorData 
        }),
        { 
          status: resendResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = await resendResponse.json()
    console.log('✅ Email sent successfully:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        status: 'sent'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
        }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
    )
  }
})
