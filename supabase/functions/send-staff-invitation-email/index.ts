// Supabase Edge Function: send-staff-invitation-email
// Deploy with: supabase functions deploy send-staff-invitation-email --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Parse request body
    const { 
      email, 
      firstName, 
      lastName, 
      tenantName, 
      inviteLink,
      fromEmail 
    } = await req.json()

    // Validate required fields
    if (!email || !firstName || !lastName || !inviteLink) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['email', 'firstName', 'lastName', 'inviteLink']
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #7C3AED; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Einladung als Fahrlehrer</h1>
          </div>
          <div class="content">
            <p>Hallo ${firstName} ${lastName},</p>
            <p>Sie wurden eingeladen, dem Team von <strong>${tenantName || 'Driving Team'}</strong> als Fahrlehrer beizutreten!</p>
            <p>Klicken Sie auf den folgenden Button, um Ihre Registrierung abzuschließen:</p>
            <p style="text-align: center;">
              <a href="${inviteLink}" class="button">Registrierung abschließen</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Oder kopieren Sie diesen Link in Ihren Browser:<br>
              <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${inviteLink}</code>
            </p>
            <p style="color: #ef4444; font-size: 14px;">
              Diese Einladung ist 7 Tage gültig.
            </p>
          </div>
          <div class="footer">
            <p>${tenantName || 'Driving Team'} - Fahrlehrer Einladung</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail || 'info@drivingteam.ch',
        to: email,
        subject: `Einladung als Fahrlehrer - ${tenantName || 'Driving Team'}`,
        html: emailHtml
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', result)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: result 
        }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Email sent successfully:', result.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        emailId: result.id,
        message: 'Email sent successfully'
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
