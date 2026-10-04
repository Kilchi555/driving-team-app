import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  authorizeInternalEmail,
  escapeHtml,
  INTERNAL_EMAIL_SECRET_HEADER,
  invalidRequestResponse,
  json,
  parseStaffInvite,
  PLATFORM_FROM_EMAIL,
  unableToSendResponse,
  unauthorizedResponse,
} from '../_shared/internal-email-auth.ts'

/**
 * Internal staff-invitation mailer. There is no browser caller.
 * Requires x-simy-internal-email-secret = SIMY_INTERNAL_EMAIL_SECRET.
 * Invitation links must be https on a simy.ch host. The From address is fixed.
 * Gateway JWT verification is not this control.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': `authorization, x-client-info, apikey, content-type, ${INTERNAL_EMAIL_SECRET_HEADER}`,
}

export async function handleStaffInvitationEmail(req: Request): Promise<Response> {
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
    console.error('send-staff-invitation-email rejected: unauthorized')
    return unauthorizedResponse(corsHeaders)
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return invalidRequestResponse(corsHeaders)
  }

  const parsed = parseStaffInvite(payload)
  if (!parsed.ok) return invalidRequestResponse(corsHeaders)

  const resendApiKey = Deno.env.get('RESEND_API_KEY')?.trim()
  if (!resendApiKey) {
    console.error('send-staff-invitation-email rejected: email provider is not configured')
    return unableToSendResponse(corsHeaders)
  }

  const invite = parsed.invite
  const safeFirst = escapeHtml(invite.firstName)
  const safeLast = escapeHtml(invite.lastName)
  const safeTenant = escapeHtml(invite.tenantName)
  const safeLink = escapeHtml(invite.inviteLink)

  const emailHtml = `<!DOCTYPE html>
<html>
<body>
  <p>Hallo ${safeFirst} ${safeLast},</p>
  <p>Sie wurden eingeladen, dem Team von <strong>${safeTenant}</strong> als Fahrlehrer beizutreten.</p>
  <p><a href="${safeLink}">Registrierung abschließen</a></p>
  <p>${safeLink}</p>
  <p>Diese Einladung ist 30 Tage gültig.</p>
  <p>${safeTenant}</p>
</body>
</html>`

  let response: Response
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: PLATFORM_FROM_EMAIL,
        to: invite.email,
        subject: `Einladung als Fahrlehrer - ${invite.tenantName}`,
        html: emailHtml,
      }),
    })
  } catch {
    console.error('send-staff-invitation-email provider request failed')
    return unableToSendResponse(corsHeaders)
  }

  if (!response.ok) {
    console.error('send-staff-invitation-email provider rejected the message', { status: response.status })
    return unableToSendResponse(corsHeaders)
  }

  console.log('send-staff-invitation-email accepted', { status: response.status })
  return json({ success: true }, 200, corsHeaders)
}

serve(handleStaffInvitationEmail)
