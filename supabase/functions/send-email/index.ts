import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  authorizeInternalEmail,
  INTERNAL_EMAIL_SECRET_HEADER,
  invalidRequestResponse,
  json,
  parseOutboundEmail,
  PLATFORM_FROM_EMAIL,
  unableToSendResponse,
  unauthorizedResponse,
} from '../_shared/internal-email-auth.ts'

/**
 * Internal email relay. Callers must send x-simy-internal-email-secret.
 * A Supabase user JWT, the anon key, or CORS is not authorization.
 * Set SIMY_INTERNAL_EMAIL_SECRET on this function. Do not deploy it as a
 * public mail API. Gateway verify_jwt does not replace this check.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': `authorization, x-client-info, apikey, content-type, ${INTERNAL_EMAIL_SECRET_HEADER}`,
}

export async function handleSendEmail(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Invalid request' }, 405, corsHeaders)
  }

  const allowed = await authorizeInternalEmail(
    req.headers.get(INTERNAL_EMAIL_SECRET_HEADER),
    Deno.env.get('SIMY_INTERNAL_EMAIL_SECRET'),
  )
  if (!allowed) {
    console.error('send-email rejected: unauthorized')
    return unauthorizedResponse(corsHeaders)
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return invalidRequestResponse(corsHeaders)
  }

  const parsed = parseOutboundEmail(payload)
  if (!parsed.ok) return invalidRequestResponse(corsHeaders)

  const resendApiKey = Deno.env.get('RESEND_API_KEY')?.trim()
  if (!resendApiKey) {
    console.error('send-email rejected: email provider is not configured')
    return unableToSendResponse(corsHeaders)
  }

  let resendResponse: Response
  try {
    resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: PLATFORM_FROM_EMAIL,
        to: [parsed.email.to],
        subject: parsed.email.subject,
        html: parsed.email.html,
      }),
    })
  } catch {
    console.error('send-email provider request failed')
    return unableToSendResponse(corsHeaders)
  }

  if (!resendResponse.ok) {
    console.error('send-email provider rejected the message', { status: resendResponse.status })
    return unableToSendResponse(corsHeaders)
  }

  console.log('send-email accepted', { status: resendResponse.status })
  return json({ success: true, status: 'sent' }, 200, corsHeaders)
}

serve(handleSendEmail)
